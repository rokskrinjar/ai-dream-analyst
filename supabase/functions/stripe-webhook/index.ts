import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import Stripe from 'https://esm.sh/stripe@13.11.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  console.log('🎯 Stripe webhook received');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Environment check
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Missing environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize clients
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get raw body and signature
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    console.log('📋 Webhook body length:', body.length);
    console.log('🖊️ Stripe signature present:', !!signature);

    let event: Stripe.Event;

    // Verify webhook signature if secret is available
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        console.log('✅ Webhook signature verified');
      } catch (err) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Parse without verification (for development)
      console.log('⚠️ No webhook secret - parsing without verification (development mode)');
      try {
        event = JSON.parse(body);
      } catch (err) {
        console.error('❌ Failed to parse webhook body:', err.message);
        return new Response(
          JSON.stringify({ error: 'Invalid JSON' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('🎭 Event type:', event.type);
    console.log('🆔 Event ID:', event.id);

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('💳 Processing subscription:', subscription.id);
        
        await handleSubscriptionEvent(supabase, subscription, event.type);
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('💰 Processing payment:', invoice.id);
        
        if (invoice.subscription) {
          // Get the subscription details
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          await handleSubscriptionEvent(supabase, subscription, 'payment_succeeded');
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('🗑️ Processing subscription cancellation:', subscription.id);
        
        await handleSubscriptionCancellation(supabase, subscription);
        break;
      }
      
      default:
        console.log('ℹ️ Unhandled event type:', event.type);
    }

    console.log('✅ Webhook processed successfully');
    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleSubscriptionEvent(supabase: any, subscription: Stripe.Subscription, eventType: string) {
  console.log(`🔄 Handling ${eventType} for subscription:`, subscription.id);
  
  try {
    // Extract user ID from subscription metadata
    const userId = subscription.metadata?.user_id;
    const planId = subscription.metadata?.plan_id;
    
    if (!userId || !planId) {
      console.error('❌ Missing user_id or plan_id in subscription metadata');
      return;
    }

    console.log('👤 User ID:', userId);
    console.log('📦 Plan ID:', planId);

    // Get plan details
    const { data: planData, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !planData) {
      console.error('❌ Failed to fetch plan details:', planError);
      return;
    }

    console.log('📊 Plan details:', planData.name, planData.ai_credits_monthly);

    // Upsert user subscription
    const subscriptionData = {
      user_id: userId,
      plan_id: planId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    };

    const { error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .upsert(subscriptionData, { 
        onConflict: 'stripe_subscription_id',
        ignoreDuplicates: false 
      });

    if (subscriptionError) {
      console.error('❌ Failed to upsert subscription:', subscriptionError);
      return;
    }

    console.log('✅ Subscription record created/updated');

    // Update user credits
    const creditsToSet = planData.ai_credits_monthly === -1 ? 999999 : planData.ai_credits_monthly;
    
    const { error: creditsError } = await supabase
      .from('user_credits')
      .upsert({
        user_id: userId,
        credits_remaining: creditsToSet,
        credits_used_this_month: 0,
        last_reset_date: new Date().toISOString().split('T')[0]
      }, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      });

    if (creditsError) {
      console.error('❌ Failed to update user credits:', creditsError);
      return;
    }

    console.log('✅ User credits updated:', creditsToSet);

    // Log the subscription event
    await supabase
      .from('usage_logs')
      .insert({
        user_id: userId,
        action_type: `subscription_${eventType}`,
        credits_used: 0
      });

    console.log('✅ Subscription event logged');

  } catch (error) {
    console.error('❌ Error handling subscription event:', error);
  }
}

async function handleSubscriptionCancellation(supabase: any, subscription: Stripe.Subscription) {
  console.log('🗑️ Handling subscription cancellation:', subscription.id);
  
  try {
    // Update subscription status
    const { error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .update({ status: 'canceled' })
      .eq('stripe_subscription_id', subscription.id);

    if (subscriptionError) {
      console.error('❌ Failed to update subscription status:', subscriptionError);
      return;
    }

    // Reset user to free plan credits
    const userId = subscription.metadata?.user_id;
    if (userId) {
      const { error: creditsError } = await supabase
        .from('user_credits')
        .update({
          credits_remaining: 5,
          credits_used_this_month: 0,
          last_reset_date: new Date().toISOString().split('T')[0]
        })
        .eq('user_id', userId);

      if (creditsError) {
        console.error('❌ Failed to reset user credits:', creditsError);
      } else {
        console.log('✅ User credits reset to free plan');
      }
    }

    console.log('✅ Subscription cancellation processed');

  } catch (error) {
    console.error('❌ Error handling subscription cancellation:', error);
  }
}