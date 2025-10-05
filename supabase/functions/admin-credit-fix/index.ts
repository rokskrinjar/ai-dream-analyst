import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function logFailedAdminAttempt(
  supabase: any,
  userId: string | null,
  reason: string,
  req: Request
) {
  try {
    await supabase
      .from('admin_audit_log')
      .insert({
        admin_user_id: userId || '00000000-0000-0000-0000-000000000000',
        action: 'admin_access_denied',
        details: { 
          reason, 
          timestamp: new Date().toISOString(),
          ip_address: req.headers.get('x-forwarded-for') || 'unknown',
          user_agent: req.headers.get('user-agent') || 'unknown'
        }
      });
  } catch (error) {
    console.error('Failed to log admin attempt:', error);
  }
}

serve(async (req) => {
  console.log('🛠️ Admin credit fix utility accessed');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authentication and admin check
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.warn('⚠️ Admin access attempt without auth header');
      await logFailedAdminAttempt(supabase, null, 'no_auth_header', req);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      await logFailedAdminAttempt(supabase, null, 'authentication_failed', req);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: isAdminData, error: adminCheckError } = await supabase.rpc('is_admin');
    
    if (adminCheckError) {
      console.error('❌ Admin check failed:', adminCheckError);
      await logFailedAdminAttempt(supabase, user.id, 'admin_check_error', req);
      return new Response(
        JSON.stringify({ error: 'Authorization check failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isAdminData) {
      console.warn('⚠️ Non-admin access attempt:', user.id);
      await logFailedAdminAttempt(supabase, user.id, 'insufficient_privileges', req);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, userId, credits, planId } = await req.json();

    console.log(`🛠️ Admin action: ${action} for user: ${userId}`);

    let result = {};

    switch (action) {
      case 'fix_user_credits': {
        if (!userId) {
          throw new Error('User ID is required');
        }

        // Get user's current subscription plan
        const { data: subscription } = await supabase
          .from('user_subscriptions')
          .select(`
            plan_id,
            status,
            subscription_plans!inner (
              name,
              ai_credits_monthly
            )
          `)
          .eq('user_id', userId)
          .eq('status', 'active')
          .single();

        let creditsToSet = 5; // Default free plan
        if (subscription?.subscription_plans) {
          const plan = subscription.subscription_plans as any;
          creditsToSet = plan.ai_credits_monthly === -1 
            ? 999999 
            : plan.ai_credits_monthly;
        }

        const { error: updateError } = await supabase
          .from('user_credits')
          .upsert({
            user_id: userId,
            credits_remaining: creditsToSet,
            credits_used_this_month: 0,
            last_reset_date: new Date().toISOString().split('T')[0]
          });

        if (updateError) throw updateError;

        result = { 
          success: true, 
          action: 'credits_fixed',
          userId,
          creditsSet: creditsToSet,
          planName: subscription?.subscription_plans ? (subscription.subscription_plans as any).name : 'Free'
        };
        break;
      }

      case 'set_custom_credits': {
        if (!userId || credits === undefined) {
          throw new Error('User ID and credits amount are required');
        }

        const { error: updateError } = await supabase
          .from('user_credits')
          .upsert({
            user_id: userId,
            credits_remaining: credits,
            credits_used_this_month: 0,
            last_reset_date: new Date().toISOString().split('T')[0]
          });

        if (updateError) throw updateError;

        result = { 
          success: true, 
          action: 'custom_credits_set',
          userId,
          creditsSet: credits
        };
        break;
      }

      case 'reset_monthly_credits': {
        if (!userId) {
          throw new Error('User ID is required');
        }

        const { error: resetError } = await supabase
          .rpc('reset_credits_if_needed', { user_id: userId });

        if (resetError) throw resetError;

        result = { 
          success: true, 
          action: 'monthly_credits_reset',
          userId
        };
        break;
      }

      case 'get_user_info': {
        if (!userId) {
          throw new Error('User ID is required');
        }

        const { data: userInfo } = await supabase
          .from('user_credits')
          .select(`
            *,
            user_subscriptions (
              plan_id,
              status,
              stripe_subscription_id,
              stripe_customer_id,
              current_period_start,
              current_period_end,
              subscription_plans (
                name,
                ai_credits_monthly
              )
            ),
            profiles (
              display_name
            )
          `)
          .eq('user_id', userId)
          .single();

        result = { 
          success: true, 
          action: 'user_info_retrieved',
          userInfo
        };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Log admin action
    await supabase
      .from('admin_audit_log')
      .insert({
        admin_user_id: user.id,
        target_user_id: userId || null,
        action,
        details: result
      });

    console.log('✅ Admin action completed:', result);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Admin action error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ 
        error: 'Admin action failed', 
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