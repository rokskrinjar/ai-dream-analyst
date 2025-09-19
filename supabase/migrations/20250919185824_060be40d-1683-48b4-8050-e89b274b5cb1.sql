-- Add new emotion fields to dreams table and migrate existing data
ALTER TABLE public.dreams 
ADD COLUMN primary_emotion TEXT,
ADD COLUMN secondary_emotion TEXT;

-- Update existing dreams with basic emotion mapping
UPDATE public.dreams 
SET primary_emotion = CASE 
  WHEN mood = 'Mirno' OR mood = 'Miren' THEN 'Mir'
  WHEN mood = 'Sanjavo' THEN 'Zadovoljstvo'
  WHEN mood = 'Vznemirjeno' OR mood = 'Energično' THEN 'Veselje'
  WHEN mood = 'Strah' THEN 'Strah'
  WHEN mood = 'Veselje' THEN 'Veselje'
  WHEN mood = 'Žalost' THEN 'Žalost'
  WHEN mood = 'Zmedenost' THEN 'Presenečenje'
  WHEN mood = 'Nostalgija' THEN 'Žalost'
  ELSE 'Zadovoljstvo'
END,
secondary_emotion = CASE 
  WHEN mood = 'Mirno' OR mood = 'Miren' THEN 'Sproščen'
  WHEN mood = 'Sanjavo' THEN 'Sanjaš'
  WHEN mood = 'Vznemirjeno' THEN 'Vznemirjen'
  WHEN mood = 'Energično' THEN 'Energičen'
  WHEN mood = 'Strah' THEN 'Prestrašen'
  WHEN mood = 'Veselje' THEN 'Radosten'
  WHEN mood = 'Žalost' THEN 'Žalosten'
  WHEN mood = 'Zmedenost' THEN 'Zmeden'
  WHEN mood = 'Nostalgija' THEN 'Nostalgičen'
  ELSE 'Zadovoljen'
END
WHERE mood IS NOT NULL;