-- Fix the usage_logs constraint to allow monthly_reset action type
-- This will fix the dream analysis error that occurs when checking credits

-- Drop the existing constraint
ALTER TABLE public.usage_logs DROP CONSTRAINT IF EXISTS usage_logs_action_type_check;

-- Add a new constraint that includes all valid action types
ALTER TABLE public.usage_logs 
ADD CONSTRAINT usage_logs_action_type_check 
CHECK (action_type IN ('dream_analysis', 'pattern_analysis', 'monthly_reset'));