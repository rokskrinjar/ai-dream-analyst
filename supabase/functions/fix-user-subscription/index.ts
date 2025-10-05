import Stripe from 'https://esm.sh/stripe@17.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // Get user from auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('🔧 Fixing subscription for user:', user.id);

    // Get user's current subscription record
    const { data: currentSub } = await supabase
      .from('user_subscriptions')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!currentSub?.stripe_subscription_id) {
      throw new Error('No Stripe subscription found in database');
    }

    console.log('📋 Current subscription ID:', currentSub.stripe_subscription_id);

    // Fetch the subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(currentSub.stripe_subscription_id);
    
    console.log('✅ Retrieved from Stripe:', {
      id: subscription.id,
      status: subscription.status,
      plan: subscription.items.data[0]?.price.id
    });

    // Get the plan_id from metadata or lookup by price_id
    let planId = subscription.metadata.plan_id;
    
    if (!planId) {
      const priceId = subscription.items.data[0]?.price.id;
      const { data: plan } = await supabase
        .from('subscription_plans')
        .select('id')
        .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
        .single();
      
      planId = plan?.id;
    }

    if (!planId) {
      throw new Error('Could not determine plan_id');
    }

    // Get plan details
    const { data: planData } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    console.log('📊 Plan details:', planData?.name, planData?.ai_credits_monthly);

    // Update subscription in database
    const { error: subError } = await supabase
      .from('user_subscriptions')
      .update({
        plan_id: planId,
        status: subscription.status,
        current_period_start: subscription.current_period_start 
          ? new Date(subscription.current_period_start * 1000).toISOString()
          : null,
        current_period_end: subscription.current_period_end 
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null,
      })
      .eq('user_id', user.id)
      .eq('stripe_subscription_id', currentSub.stripe_subscription_id);

    if (subError) {
      console.error('❌ Failed to update subscription:', subError);
      throw subError;
    }

    // Update credits
    const credits = planData?.ai_credits_monthly === -1 ? 999999 : (planData?.ai_credits_monthly || 5);
    
    const { error: creditsError } = await supabase
      .from('user_credits')
      .upsert({
        user_id: user.id,
        credits_remaining: credits,
        credits_used_this_month: 0,
        last_reset_date: new Date().toISOString().split('T')[0],
      }, {
        onConflict: 'user_id'
      });

    if (creditsError) {
      console.error('❌ Failed to update credits:', creditsError);
      throw creditsError;
    }

    console.log('✅ Fixed subscription and credits!');

    return new Response(
      JSON.stringify({ 
        success: true,
        subscription: {
          plan: planData?.name,
          status: subscription.status,
          credits: credits === 999999 ? 'unlimited' : credits
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
