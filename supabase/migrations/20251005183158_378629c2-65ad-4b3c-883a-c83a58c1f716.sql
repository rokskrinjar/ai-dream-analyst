-- First, clean up any duplicate or problematic subscription records
-- Delete old records with null stripe_subscription_id
DELETE FROM public.user_subscriptions 
WHERE stripe_subscription_id IS NULL;

-- Add unique constraint on stripe_subscription_id to prevent duplicates
-- This allows the webhook upsert to work correctly
ALTER TABLE public.user_subscriptions 
ADD CONSTRAINT user_subscriptions_stripe_subscription_id_key 
UNIQUE (stripe_subscription_id);