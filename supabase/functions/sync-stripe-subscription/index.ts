import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import Stripe from 'https://esm.sh/stripe@13.11.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize clients
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔄 Syncing subscription for user:', user.id);

    // Rate limiting: Check recent syncs (cooldown of 5 minutes)
    const { data: recentSync } = await supabaseAdmin
      .from('usage_logs')
      .select('created_at')
      .eq('user_id', user.id)
      .eq('action_type', 'subscription_manual_sync')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentSync) {
      const lastSync = new Date(recentSync.created_at);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      if (lastSync > fiveMinutesAgo) {
        console.warn('⚠️ Sync cooldown active:', user.id);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Prosimo, počakajte 5 minut med poskusi sinhronizacije.'
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get user's Stripe customer ID
    const { data: existingSubscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('user_id', user.id)
      .single();

    if (!existingSubscription?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'No Stripe customer found for your account. Please contact support.' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Found Stripe customer:', existingSubscription.stripe_customer_id);

    // Get all subscriptions for this customer from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: existingSubscription.stripe_customer_id,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'No active subscription found in Stripe. Please check your Stripe dashboard.' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const subscription = subscriptions.data[0];
    console.log('✅ Found active subscription:', subscription.id);

    // Get the plan details from Stripe subscription metadata or look it up
    let planId = subscription.metadata?.plan_id;
    
    if (!planId) {
      // Try to determine plan from price ID
      const priceId = subscription.items.data[0]?.price.id;
      console.log('🔍 Looking up plan by price ID:', priceId);

      const { data: plan } = await supabaseAdmin
        .from('subscription_plans')
        .select('id')
        .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
        .single();

      if (plan) {
        planId = plan.id;
        console.log('✅ Found plan ID from price lookup:', planId);
      } else {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Could not match Stripe subscription to a plan. Please contact support.' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get full plan details
    const { data: planData, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !planData) {
      console.error('❌ Failed to fetch plan details:', planError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid plan configuration. Please contact support.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📊 Plan details:', planData.name, 'Credits:', planData.ai_credits_monthly);

    // Update user subscription
    const { error: subscriptionError } = await supabaseAdmin
      .from('user_subscriptions')
      .upsert({
        user_id: user.id,
        plan_id: planId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer as string,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      }, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      });

    if (subscriptionError) {
      console.error('❌ Failed to update subscription:', subscriptionError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to update subscription in database',
          details: subscriptionError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update user credits
    const creditsToSet = planData.ai_credits_monthly === -1 ? 999999 : planData.ai_credits_monthly;
    
    const { error: creditsError } = await supabaseAdmin
      .from('user_credits')
      .upsert({
        user_id: user.id,
        credits_remaining: creditsToSet,
        credits_used_this_month: 0,
        last_reset_date: new Date().toISOString().split('T')[0]
      }, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      });

    if (creditsError) {
      console.error('❌ Failed to update credits:', creditsError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to update credits in database',
          details: creditsError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the sync
    await supabaseAdmin
      .from('usage_logs')
      .insert({
        user_id: user.id,
        action_type: 'subscription_manual_sync',
        credits_used: 0
      });

    console.log('✅ Subscription synced successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        subscription: {
          plan: planData.name,
          status: subscription.status,
          credits: creditsToSet,
          periodEnd: new Date(subscription.current_period_end * 1000).toISOString()
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Sync error:', errorMessage);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        details: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
