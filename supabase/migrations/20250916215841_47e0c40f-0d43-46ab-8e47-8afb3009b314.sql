-- Create table to cache pattern analysis results
CREATE TABLE public.pattern_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  analysis_data JSONB NOT NULL,
  dreams_count INTEGER NOT NULL,
  last_dream_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.pattern_analyses ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own pattern analyses" 
ON public.pattern_analyses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pattern analyses" 
ON public.pattern_analyses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pattern analyses" 
ON public.pattern_analyses 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pattern analyses" 
ON public.pattern_analyses 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_pattern_analyses_updated_at
BEFORE UPDATE ON public.pattern_analyses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();