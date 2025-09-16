-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create dreams table
CREATE TABLE public.dreams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  dream_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE
);

-- Enable RLS for dreams
ALTER TABLE public.dreams ENABLE ROW LEVEL SECURITY;

-- Create policies for dreams
CREATE POLICY "Users can view their own dreams" 
ON public.dreams 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own dreams" 
ON public.dreams 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own dreams" 
ON public.dreams 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own dreams" 
ON public.dreams 
FOR DELETE 
USING (user_id = auth.uid());

-- Create AI analysis table
CREATE TABLE public.dream_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dream_id UUID NOT NULL,
  analysis_text TEXT NOT NULL,
  themes TEXT[],
  emotions TEXT[],
  symbols TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (dream_id) REFERENCES public.dreams(id) ON DELETE CASCADE
);

-- Enable RLS for dream analyses
ALTER TABLE public.dream_analyses ENABLE ROW LEVEL SECURITY;

-- Create policies for dream analyses
CREATE POLICY "Users can view analyses of their own dreams" 
ON public.dream_analyses 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.dreams 
  WHERE dreams.id = dream_analyses.dream_id 
  AND dreams.user_id = auth.uid()
));

CREATE POLICY "System can insert dream analyses" 
ON public.dream_analyses 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.dreams 
  WHERE dreams.id = dream_analyses.dream_id 
  AND dreams.user_id = auth.uid()
));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dreams_updated_at
  BEFORE UPDATE ON public.dreams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();