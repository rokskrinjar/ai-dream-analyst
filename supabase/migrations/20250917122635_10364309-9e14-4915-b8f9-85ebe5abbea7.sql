-- Clear existing subscription plans and add the simplified 3-tier structure
DELETE FROM public.subscription_plans;

-- Insert the new subscription plans
INSERT INTO public.subscription_plans (name, description, price_monthly, ai_credits_monthly, features, is_active) VALUES
(
  'Free', 
  'Perfect for getting started with dream analysis', 
  0.00, 
  5, 
  '["5 AI dream analyses per month", "Basic dream journal", "Dream date tracking", "Mood logging"]'::jsonb, 
  true
),
(
  'Basic', 
  'Ideal for regular dream journaling', 
  4.99, 
  25, 
  '["25 AI dream analyses per month", "All Free features", "Dream tags and categories", "Monthly pattern insights", "Email support"]'::jsonb, 
  true
),
(
  'Premium', 
  'For serious dream enthusiasts', 
  9.99, 
  -1, 
  '["Unlimited AI dream analyses", "All Basic features", "Advanced pattern recognition", "Detailed analytics dashboard", "Dream symbol dictionary", "Priority support", "Export capabilities"]'::jsonb, 
  true
);