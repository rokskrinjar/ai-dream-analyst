import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify admin access
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: isAdminData } = await supabaseClient.rpc('is_admin');
    if (!isAdminData) {
      throw new Error('Unauthorized: Admin access required');
    }

    const { user_id } = await req.json();

    if (!user_id) {
      throw new Error('user_id is required');
    }

    console.log(`🔧 Admin fixing subscription for user: ${user_id}`);

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Get user's stripe customer ID
    const { data: existingSub } = await supabaseClient
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user_id)
      .single();

    if (!existingSub?.stripe_customer_id) {
      throw new Error('No Stripe customer found for this user');
    }

    console.log(`📋 Found Stripe customer: ${existingSub.stripe_customer_id}`);

    // Fetch all subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: existingSub.stripe_customer_id,
      status: 'active',
      limit: 10,
    });

    console.log(`📦 Found ${subscriptions.data.length} active subscriptions in Stripe`);

    if (subscriptions.data.length === 0) {
      throw new Error('No active subscriptions found in Stripe');
    }

    // Get the first active subscription (should be the Premium one)
    const subscription = subscriptions.data[0];
    console.log(`✅ Using subscription: ${subscription.id}`);

    // Get the price ID to determine the plan
    const priceId = subscription.items.data[0]?.price.id;
    console.log(`💰 Price ID: ${priceId}`);

    // Find the matching plan in our database
    const { data: plan, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('id, name, ai_credits_monthly')
      .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
      .single();

    if (planError || !plan) {
      console.error('❌ Plan lookup error:', planError);
      throw new Error('Could not find matching plan for price ID: ' + priceId);
    }

    console.log(`📋 Found plan: ${plan.name} (${plan.ai_credits_monthly} credits)`);

    // Update user_subscriptions
    const { error: updateSubError } = await supabaseClient
      .from('user_subscriptions')
      .update({
        plan_id: plan.id,
        status: subscription.status,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer as string,
        current_period_start: subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000).toISOString()
          : null,
        current_period_end: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user_id);

    if (updateSubError) {
      console.error('❌ Subscription update error:', updateSubError);
      throw updateSubError;
    }

    console.log('✅ Subscription updated in database');

    // Calculate credits (999999 for unlimited, otherwise the plan amount)
    const creditsToSet = plan.ai_credits_monthly === -1 ? 999999 : plan.ai_credits_monthly;

    // Update user_credits
    const { error: updateCreditsError } = await supabaseClient
      .from('user_credits')
      .upsert({
        user_id: user_id,
        credits_remaining: creditsToSet,
        credits_used_this_month: 0,
        last_reset_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (updateCreditsError) {
      console.error('❌ Credits update error:', updateCreditsError);
      throw updateCreditsError;
    }

    console.log(`✅ Credits set to ${creditsToSet}`);

    // Log admin action
    await supabaseClient
      .from('admin_audit_log')
      .insert({
        admin_user_id: user.id,
        target_user_id: user_id,
        action: 'fix_premium_subscription',
        details: {
          stripe_subscription_id: subscription.id,
          plan_id: plan.id,
          plan_name: plan.name,
          credits_set: creditsToSet,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscription fixed successfully',
        subscription: {
          plan_name: plan.name,
          credits: creditsToSet,
          status: subscription.status,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
