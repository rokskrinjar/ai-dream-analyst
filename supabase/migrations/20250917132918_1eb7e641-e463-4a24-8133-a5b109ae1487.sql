-- Fix search path for all existing functions to address security warnings
CREATE OR REPLACE FUNCTION public.reset_monthly_credits()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
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
  WHERE last_reset_date < CURRENT_DATE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_use_credits(user_id uuid, credits_needed integer DEFAULT 1)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  user_credits_remaining INTEGER;
BEGIN
  -- Reset credits if needed
  PERFORM public.reset_monthly_credits();
  
  -- Get current credits
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
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$function$;