-- Add reflection questions field to dream_analyses table
ALTER TABLE public.dream_analyses 
ADD COLUMN reflection_questions TEXT[];

-- Update the trigger to handle the new column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;