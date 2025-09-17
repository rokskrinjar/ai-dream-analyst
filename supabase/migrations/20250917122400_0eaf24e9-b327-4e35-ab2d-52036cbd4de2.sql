-- Create subscription plans table
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2),
  ai_credits_monthly INTEGER NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user subscriptions table
CREATE TABLE public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID REFERENCES public.subscription_plans(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'canceled', 'past_due', 'trialing')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create user credits table
CREATE TABLE public.user_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  credits_remaining INTEGER NOT NULL DEFAULT 0,
  credits_used_this_month INTEGER NOT NULL DEFAULT 0,
  last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create usage tracking table
CREATE TABLE public.usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('dream_analysis', 'pattern_analysis')),
  credits_used INTEGER NOT NULL DEFAULT 1,
  dream_id UUID REFERENCES public.dreams(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscription_plans (public read)
CREATE POLICY "Anyone can view active subscription plans"
ON public.subscription_plans
FOR SELECT
USING (is_active = true);

-- RLS policies for user_subscriptions
CREATE POLICY "Users can view their own subscription"
ON public.user_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
ON public.user_subscriptions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert user subscriptions"
ON public.user_subscriptions
FOR INSERT
WITH CHECK (true);

-- RLS policies for user_credits
CREATE POLICY "Users can view their own credits"
ON public.user_credits
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own credits"
ON public.user_credits
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert user credits"
ON public.user_credits
FOR INSERT
WITH CHECK (true);

-- RLS policies for usage_logs
CREATE POLICY "Users can view their own usage logs"
ON public.usage_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert usage logs"
ON public.usage_logs
FOR INSERT
WITH CHECK (true);

-- Create triggers for updated_at
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_credits_updated_at
BEFORE UPDATE ON public.user_credits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, description, price_monthly, price_yearly, ai_credits_monthly, features) VALUES
('Free', 'Perfect for trying out dream analysis', 0.00, 0.00, 5, '["Basic dream analysis", "5 AI analyses per month", "Dream journal"]'),
('Basic', 'Great for regular dream journaling', 4.99, 49.99, 25, '["All Free features", "25 AI analyses per month", "Basic pattern recognition", "Export to PDF"]'),
('Premium', 'Unlimited insights into your dreams', 9.99, 99.99, -1, '["All Basic features", "Unlimited AI analyses", "Advanced pattern recognition", "Mood correlation", "Priority processing"]'),
('Pro', 'Complete dream analysis suite', 19.99, 199.99, -1, '["All Premium features", "Personalized interpretations", "Dream sharing", "Advanced analytics", "Priority support"]');

-- Function to reset monthly credits
CREATE OR REPLACE FUNCTION public.reset_monthly_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Function to check if user can use credits
CREATE OR REPLACE FUNCTION public.can_use_credits(user_id UUID, credits_needed INTEGER DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;