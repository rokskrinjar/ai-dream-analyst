-- Enable real-time updates for user_credits table
-- This allows the CreditContext to automatically update when credits change

-- Add the user_credits table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_credits;