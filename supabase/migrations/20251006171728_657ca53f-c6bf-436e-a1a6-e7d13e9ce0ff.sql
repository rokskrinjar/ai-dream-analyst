-- Add index on dream_analyses.dream_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_dream_analyses_dream_id ON dream_analyses(dream_id);