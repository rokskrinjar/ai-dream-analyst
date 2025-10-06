-- Add preferred_language to profiles table
ALTER TABLE public.profiles 
ADD COLUMN preferred_language text NOT NULL DEFAULT 'sl';

-- Add language to dream_analyses table
ALTER TABLE public.dream_analyses 
ADD COLUMN language text NOT NULL DEFAULT 'sl';

-- Add language to pattern_analyses table
ALTER TABLE public.pattern_analyses 
ADD COLUMN language text NOT NULL DEFAULT 'sl';

-- Update the handle_new_user() trigger to store language preference
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, preferred_language)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'sl')
  );
  RETURN NEW;
END;
$function$;