-- Fix the reset_monthly_credits function to reset monthly instead of daily
CREATE OR REPLACE FUNCTION public.reset_monthly_credits()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only reset credits if we're in a new month since the last reset
  -- This prevents daily resets and ensures monthly billing cycles
  UPDATE public.user_credits 
  SET 
    credits_used_this_month = 0,
    last_reset_date = CURRENT_DATE,
    credits_remaining = CASE 
      WHEN (SELECT sp.ai_credits_monthly 
            FROM public.user_subscriptions us 
            JOIN public.subscription_plans sp ON us.plan_id = sp.id 
            WHERE us.user_id = user_credits.user_id 
            AND us.status = 'active') = -1 THEN 999999  -- Unlimited
      ELSE COALESCE((SELECT sp.ai_credits_monthly 
                     FROM public.user_subscriptions us 
                     JOIN public.subscription_plans sp ON us.plan_id = sp.id 
                     WHERE us.user_id = user_credits.user_id 
                     AND us.status = 'active'), 5)  -- Default to free plan
    END
  WHERE 
    -- Only reset if it's been at least a month since last reset
    -- Use DATE_TRUNC to compare months properly
    DATE_TRUNC('month', last_reset_date) < DATE_TRUNC('month', CURRENT_DATE);
    
  -- Log the reset operation for debugging
  INSERT INTO public.usage_logs (user_id, action_type, credits_used)
  SELECT 
    user_id, 
    'monthly_reset', 
    0
  FROM public.user_credits 
  WHERE DATE_TRUNC('month', last_reset_date) = DATE_TRUNC('month', CURRENT_DATE)
  AND updated_at >= CURRENT_DATE;
END;
$function$