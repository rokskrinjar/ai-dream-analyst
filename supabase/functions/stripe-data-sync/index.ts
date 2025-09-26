import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import Stripe from 'https://esm.sh/stripe@13.11.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🔄 Starting Stripe data sync utility');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check environment variables
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    // Initialize clients
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authentication check (admin only)
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: isAdminData } = await supabase.rpc('is_admin');
    if (!isAdminData) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get sync type from request
    const { syncType = 'full', dryRun = true } = await req.json().catch(() => ({}));

    console.log(`🔄 Starting ${syncType} sync (dryRun: ${dryRun})`);

    const results = {
      subscriptionsFixed: 0,
      creditsFixed: 0,
      missingMetadata: 0,
      errors: [] as string[],
      summary: [] as string[]
    };

    // Find subscriptions missing stripe_subscription_id
    const { data: subscriptionsWithoutStripeId } = await supabase
      .from('user_subscriptions')
      .select('*')
      .is('stripe_subscription_id', null)
      .neq('status', 'canceled');

    console.log(`🔍 Found ${subscriptionsWithoutStripeId?.length || 0} subscriptions without Stripe IDs`);

    if (subscriptionsWithoutStripeId?.length) {
      for (const subscription of subscriptionsWithoutStripeId) {
        try {
          // Try to find matching Stripe subscription by customer ID
          if (subscription.stripe_customer_id) {
            const stripeSubscriptions = await stripe.subscriptions.list({
              customer: subscription.stripe_customer_id,
              status: 'active'
            });

            if (stripeSubscriptions.data.length === 1) {
              const stripeSubscription = stripeSubscriptions.data[0];
              
              if (!dryRun) {
                await supabase
                  .from('user_subscriptions')
                  .update({ 
                    stripe_subscription_id: stripeSubscription.id,
                    status: stripeSubscription.status,
                    current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
                    current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString()
                  })
                  .eq('id', subscription.id);
              }
              
              results.subscriptionsFixed++;
              results.summary.push(`Fixed subscription for user ${subscription.user_id}`);
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          results.errors.push(`Error fixing subscription ${subscription.id}: ${errorMessage}`);
        }
      }
    }

    // Check for users with incorrect credits
    const { data: usersWithWrongCredits } = await supabase
      .from('user_credits')
      .select(`
        *,
        user_subscriptions!inner (
          plan_id,
          status,
          subscription_plans!inner (
            ai_credits_monthly
          )
        )
      `)
      .eq('user_subscriptions.status', 'active');

    if (usersWithWrongCredits?.length) {
      for (const userCredit of usersWithWrongCredits) {
        try {
          const subscription = userCredit.user_subscriptions;
          const expectedCredits = subscription.subscription_plans.ai_credits_monthly === -1 
            ? 999999 
            : subscription.subscription_plans.ai_credits_monthly;

          if (userCredit.credits_remaining !== expectedCredits) {
            if (!dryRun) {
              await supabase
                .from('user_credits')
                .update({ 
                  credits_remaining: expectedCredits,
                  last_reset_date: new Date().toISOString().split('T')[0]
                })
                .eq('user_id', userCredit.user_id);
            }
            
            results.creditsFixed++;
            results.summary.push(`Fixed credits for user ${userCredit.user_id}: ${userCredit.credits_remaining} → ${expectedCredits}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          results.errors.push(`Error fixing credits for user ${userCredit.user_id}: ${errorMessage}`);
        }
      }
    }

    // Check Stripe subscriptions for missing metadata
    if (syncType === 'full') {
      const stripeSubscriptions = await stripe.subscriptions.list({ 
        status: 'active',
        limit: 100
      });

      for (const stripeSubscription of stripeSubscriptions.data) {
        if (!stripeSubscription.metadata?.user_id || !stripeSubscription.metadata?.plan_id) {
          results.missingMetadata++;
          results.summary.push(`Stripe subscription ${stripeSubscription.id} missing metadata`);
        }
      }
    }

    const responseData = {
      success: true,
      dryRun,
      syncType,
      results,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Sync completed:', responseData);

    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Sync error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ 
        error: 'Sync failed', 
        details: errorMessage,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});