import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🚀 Starting create-checkout-session function');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check environment variables
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    console.log('🔧 Environment check:', {
      hasStripeKey: !!stripeSecretKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseAnonKey: !!supabaseAnonKey,
      stripeKeyLength: stripeSecretKey?.length || 0
    });

    if (!stripeSecretKey) {
      console.error('❌ STRIPE_SECRET_KEY is not set');
      return new Response(
        JSON.stringify({ error: 'Stripe configuration missing' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Stripe
    console.log('💳 Initializing Stripe...');
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Initialize Supabase client
    console.log('🗄️ Initializing Supabase client...');
    const supabaseClient = createClient(
      supabaseUrl ?? '',
      supabaseAnonKey ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user from auth token
    console.log('👤 Getting user from auth token...');
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    console.log('👤 User auth result:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      error: userError?.message
    });

    if (userError || !user) {
      console.error('❌ User authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError?.message }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    console.log('📋 Parsing request body...');
    console.log('📋 Request method:', req.method);
    console.log('📋 Content-Type:', req.headers.get('content-type'));
    
    let requestBody;
    try {
      const bodyText = await req.text();
      console.log('📋 Raw body text:', bodyText);
      
      if (!bodyText || bodyText.trim() === '') {
        console.error('❌ Empty request body received');
        return new Response(
          JSON.stringify({ error: 'Request body is empty' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      requestBody = JSON.parse(bodyText);
      console.log('📋 Request body parsed:', requestBody);
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body', details: parseError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { planId } = requestBody;

    console.log('🔍 Validating planId:', { planId });

    if (!planId) {
      console.error('❌ Plan ID is missing from request');
      return new Response(
        JSON.stringify({ error: 'Plan ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get plan details
    console.log('📊 Fetching plan details from database...');
    const { data: plan, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle();

    console.log('📊 Plan fetch result:', {
      hasPlan: !!plan,
      planId: plan?.id,
      planName: plan?.name,
      stripePrice: plan?.stripe_price_id_monthly,
      error: planError?.message
    });

    if (planError || !plan) {
      console.error('❌ Plan not found:', { planId, error: planError });
      return new Response(
        JSON.stringify({ error: 'Plan not found', planId, details: planError?.message }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create or get Stripe customer
    console.log('👥 Checking for existing Stripe customer...');
    let customerId: string;
    
    // Check if user already has a Stripe customer ID
    const { data: existingSubscription, error: subError } = await supabaseClient
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    console.log('👥 Existing subscription check:', {
      hasExistingSubscription: !!existingSubscription,
      customerId: existingSubscription?.stripe_customer_id,
      error: subError?.message
    });

    if (existingSubscription?.stripe_customer_id) {
      customerId = existingSubscription.stripe_customer_id;
      console.log('✅ Using existing Stripe customer:', customerId);
    } else {
      // Create new Stripe customer
      console.log('👥 Creating new Stripe customer...');
      try {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            supabase_user_id: user.id,
          },
        });
        customerId = customer.id;
        console.log('✅ Created new Stripe customer:', customerId);
      } catch (stripeError) {
        console.error('❌ Failed to create Stripe customer:', stripeError);
        return new Response(
          JSON.stringify({ error: 'Failed to create customer', details: stripeError.message }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Create Stripe checkout session
    console.log('🛒 Creating Stripe checkout session...');
    console.log('🛒 Session parameters:', {
      customerId,
      priceId: plan.stripe_price_id_monthly,
      origin: req.headers.get('origin'),
      userId: user.id,
      planId
    });

    let session;
    try {
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: plan.stripe_price_id_monthly,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${req.headers.get('origin')}/account?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.get('origin')}/pricing`,
        metadata: {
          user_id: user.id,
          plan_id: planId,
        },
      });
      console.log('✅ Checkout session created:', {
        sessionId: session.id,
        sessionUrl: session.url
      });
    } catch (stripeError) {
      console.error('❌ Failed to create checkout session:', stripeError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create checkout session', 
          details: stripeError.message,
          code: stripeError.code
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🎉 Function completed successfully');
    return new Response(
      JSON.stringify({ sessionUrl: session.url }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Unexpected error in create-checkout-session:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        name: error.name
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});