-- Fix CRITICAL security issue: Block client-side subscription inserts
-- Only service role (webhooks/sync functions) should be able to insert subscriptions

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can insert user subscriptions" ON user_subscriptions;

-- Create a policy that explicitly blocks all client-side inserts
CREATE POLICY "Block all direct subscription inserts"
ON user_subscriptions
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

-- Add validation for Stripe IDs to prevent fake subscriptions
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_stripe_subscription_id'
  ) THEN
    ALTER TABLE user_subscriptions ADD CONSTRAINT valid_stripe_subscription_id 
    CHECK (
      stripe_subscription_id IS NULL 
      OR stripe_subscription_id ~ '^sub_[a-zA-Z0-9]{14,}$'
    );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_stripe_customer_id'
  ) THEN
    ALTER TABLE user_subscriptions ADD CONSTRAINT valid_stripe_customer_id
    CHECK (
      stripe_customer_id IS NULL 
      OR stripe_customer_id ~ '^cus_[a-zA-Z0-9]{14,}$'
    );
  END IF;
END $$;

-- Prevent duplicate active subscriptions per user
DROP INDEX IF EXISTS unique_active_subscription_per_user;
CREATE UNIQUE INDEX unique_active_subscription_per_user
ON user_subscriptions (user_id)
WHERE status = 'active';