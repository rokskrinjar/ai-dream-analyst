-- Fix credit checking issue by separating read-only operations from write operations
-- This prevents the RPC call error in edge functions

-- First, create a new function to handle credit resets separately
CREATE OR REPLACE FUNCTION public.reset_credits_if_needed(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    user_credits.user_id = reset_credits_if_needed.user_id
    AND DATE_TRUNC('month', last_reset_date) < DATE_TRUNC('month', CURRENT_DATE);
    
  -- Log the reset operation for debugging (only if a reset occurred)
  INSERT INTO public.usage_logs (user_id, action_type, credits_used)
  SELECT 
    reset_credits_if_needed.user_id, 
    'monthly_reset', 
    0
  FROM public.user_credits 
  WHERE user_credits.user_id = reset_credits_if_needed.user_id
    AND DATE_TRUNC('month', last_reset_date) = DATE_TRUNC('month', CURRENT_DATE)
    AND updated_at >= CURRENT_DATE;
END;
$$;

-- Now update can_use_credits to be purely read-only
CREATE OR REPLACE FUNCTION public.can_use_credits(user_id uuid, credits_needed integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_credits_remaining INTEGER;
BEGIN
  -- Get current credits (read-only operation)
  SELECT credits_remaining INTO user_credits_remaining
  FROM public.user_credits
  WHERE user_credits.user_id = can_use_credits.user_id;
  
  -- If no record exists, create one with free plan credits
  IF user_credits_remaining IS NULL THEN
    INSERT INTO public.user_credits (user_id, credits_remaining, credits_used_this_month, last_reset_date)
    VALUES (can_use_credits.user_id, 5, 0, CURRENT_DATE);
    user_credits_remaining := 5;
  END IF;
  
  -- Check if user has unlimited credits (999999) or enough credits
  RETURN user_credits_remaining = 999999 OR user_credits_remaining >= credits_needed;
END;
$$;