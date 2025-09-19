-- Fix security vulnerability: Restrict profile visibility
-- Replace the overly permissive "Profiles are viewable by everyone" policy

-- First, drop the existing public policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create a more secure policy that only allows:
-- 1. Users to view their own profile
-- 2. Admins to view all profiles (for admin functionality)
CREATE POLICY "Users can view own profiles and admins can view all" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id OR public.is_admin()
);