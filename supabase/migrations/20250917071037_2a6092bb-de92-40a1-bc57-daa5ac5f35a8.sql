-- Add recommendations column to dream_analyses table
ALTER TABLE public.dream_analyses 
ADD COLUMN recommendations TEXT;