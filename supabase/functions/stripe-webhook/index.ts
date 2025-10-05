import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import Stripe from 'https://esm.sh/stripe@13.11.0?target=deno';

// Utility function for webhook logging
async function logWebhookEvent(
  supabase: any, 
  requestId: string, 
  event: any, 
  status: 'received' | 'processed' | 'error',
  errorMessage?: string
) {
  try {
    await supabase
      .from('usage_logs')
      .insert({
        user_id: event?.data?.object?.metadata?.user_id || '00000000-0000-0000-0000-000000000000',
        action_type: `webhook_${status}`,
        credits_used: 0
      });
  } catch (error) {
    console.error(`❌ [${requestId}] Failed to log webhook event:`, error);
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  console.log(`🎯 [${requestId}] Stripe webhook received at ${new Date().toISOString()}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`✅ [${requestId}] Handling CORS preflight request`);
    return new Response(null, { headers: corsHeaders });
  }

  let supabase: any;

  try {
    // Environment check with detailed logging
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    console.log(`🔧 [${requestId}] Environment check:`, {
      hasStripeKey: !!stripeSecretKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasWebhookSecret: !!webhookSecret,
      timestamp: new Date().toISOString()
    });

    if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
      console.error(`❌ [${requestId}] Missing required environment variables`);
      return new Response(
        JSON.stringify({ error: 'Missing environment variables', requestId }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize clients
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get raw body and signature
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    console.log(`📋 [${requestId}] Webhook details:`, {
      bodyLength: body.length,
      hasSignature: !!signature,
      headers: Object.fromEntries(req.headers.entries()),
      timestamp: new Date().toISOString()
    });

    let event: Stripe.Event;

    // Verify webhook signature - REQUIRED for security
    if (!webhookSecret || !signature) {
      console.error('❌ Missing webhook secret or signature - cannot verify webhook');
      return new Response(
        JSON.stringify({ error: 'Webhook verification required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    try {
      // CRITICAL: Must use async version for Deno edge runtime
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      console.log('✅ Webhook signature verified');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('❌ Webhook signature verification failed:', errorMessage);
      return new Response(
        JSON.stringify({ error: 'Invalid signature', details: errorMessage }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎭 [${requestId}] Event details:`, {
      type: event.type,
      id: event.id,
      created: event.created,
      livemode: event.livemode,
      timestamp: new Date().toISOString()
    });

    // Log webhook to database for monitoring
    await logWebhookEvent(supabase, requestId, event, 'received');

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`💳 [${requestId}] Processing subscription:`, subscription.id);
        
        await handleSubscriptionEvent(supabase, subscription, event.type, requestId);
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`💰 [${requestId}] Processing payment:`, invoice.id);
        
        if (invoice.subscription) {
          // Get the subscription details
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          await handleSubscriptionEvent(supabase, subscription, 'payment_succeeded', requestId);
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`🗑️ [${requestId}] Processing subscription cancellation:`, subscription.id);
        
        await handleSubscriptionCancellation(supabase, subscription, requestId);
        break;
      }
      
      default:
        console.log(`ℹ️ [${requestId}] Unhandled event type:`, event.type);
    }

    await logWebhookEvent(supabase, requestId, event, 'processed');
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ [${requestId}] Webhook processed successfully in ${processingTime}ms`);
    
    return new Response(
      JSON.stringify({ received: true, requestId, processingTime }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : 'Unknown';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error(`❌ [${requestId}] Webhook error (after ${processingTime}ms):`, {
      name: errorName,
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString()
    });
    
    // Try to log the error to database
    try {
      if (supabase) {
        await logWebhookEvent(supabase, requestId, null, 'error', errorMessage);
      }
    } catch (logError) {
      console.error(`❌ [${requestId}] Failed to log error:`, logError);
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        requestId, 
        processingTime,
        details: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleSubscriptionEvent(supabase: any, subscription: Stripe.Subscription, eventType: string, requestId: string) {
  console.log(`🔄 [${requestId}] Handling ${eventType} for subscription:`, subscription.id);
  
  try {
    // Extract user ID from subscription metadata
    const userId = subscription.metadata?.user_id;
    const planId = subscription.metadata?.plan_id;
    
    console.log(`🔍 [${requestId}] Subscription metadata:`, {
      userId,
      planId,
      allMetadata: subscription.metadata,
      customerId: subscription.customer,
      subscriptionId: subscription.id,
      status: subscription.status
    });
    
    if (!userId || !planId) {
      console.error(`❌ [${requestId}] Missing user_id or plan_id in subscription metadata - attempting recovery`);
      
      // Try to recover by looking up existing user subscription
      const { data: existingSubscription } = await supabase
        .from('user_subscriptions')
        .select('user_id, plan_id')
        .eq('stripe_subscription_id', subscription.id)
        .single();
        
      if (existingSubscription) {
        console.log(`🔄 [${requestId}] Recovered metadata from database:`, existingSubscription);
        return await handleSubscriptionEvent(
          supabase, 
          { ...subscription, metadata: { 
            user_id: existingSubscription.user_id, 
            plan_id: existingSubscription.plan_id 
          }}, 
          eventType, 
          requestId
        );
      }
      
      throw new Error(`Cannot process subscription ${subscription.id}: missing metadata and no existing record found`);
    }

    console.log(`👤 [${requestId}] Processing for User ID:`, userId);
    console.log(`📦 [${requestId}] Plan ID:`, planId);

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

async function handleSubscriptionCancellation(supabase: any, subscription: Stripe.Subscription, requestId: string) {
  console.log(`🗑️ [${requestId}] Handling subscription cancellation:`, subscription.id);
  
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