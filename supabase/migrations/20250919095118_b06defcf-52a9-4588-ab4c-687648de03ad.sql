-- Fix subscription plans with correct Stripe Price IDs
UPDATE subscription_plans 
SET stripe_price_id_monthly = 'price_1S90oyFI9Hj3v9v4e0WechTs'
WHERE name = 'Basic';

UPDATE subscription_plans 
SET stripe_price_id_monthly = 'price_1S90rSFI9Hj3v9v4QP0camJQ'
WHERE name = 'Premium';