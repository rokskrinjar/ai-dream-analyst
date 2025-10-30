-- Add summary column for pattern analysis
ALTER TABLE dream_analyses ADD COLUMN IF NOT EXISTS summary TEXT;

-- Add analysis_data column to store structured JSONB analysis
ALTER TABLE dream_analyses ADD COLUMN IF NOT EXISTS analysis_data JSONB;

-- Migrate existing analysis_text data to analysis_data (wrapped in legacy format for backward compatibility)
UPDATE dream_analyses 
SET analysis_data = jsonb_build_object('legacy_text', analysis_text)
WHERE analysis_data IS NULL AND analysis_text IS NOT NULL;

-- Add comment explaining the columns
COMMENT ON COLUMN dream_analyses.summary IS 'Analytical summary (4-6 sentences) for pattern analysis, includes key events, themes, emotions, and psychological insights';
COMMENT ON COLUMN dream_analyses.analysis_data IS 'Structured JSONB containing full psychological analysis with initial_exploration, psychological_perspectives (Freudian, Jungian, Gestalt, Cognitive), and structured_analysis';
COMMENT ON COLUMN dream_analyses.analysis_text IS 'Legacy text field - kept for backward compatibility with old analyses';