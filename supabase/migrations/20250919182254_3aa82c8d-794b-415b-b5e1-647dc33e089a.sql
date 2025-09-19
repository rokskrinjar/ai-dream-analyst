-- Add analysis_version column to pattern_analyses table
ALTER TABLE public.pattern_analyses 
ADD COLUMN analysis_version INTEGER NOT NULL DEFAULT 1;

-- Update existing analyses to version 1 (basic version)
UPDATE public.pattern_analyses 
SET analysis_version = 1 
WHERE analysis_version IS NULL;

-- Add index for better performance when checking versions
CREATE INDEX idx_pattern_analyses_version ON public.pattern_analyses(user_id, analysis_version);