
-- Notes table
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notes" ON public.notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own notes" ON public.notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notes" ON public.notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notes" ON public.notes FOR DELETE USING (auth.uid() = user_id);

-- Past papers table
CREATE TABLE public.past_papers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.past_papers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own papers" ON public.past_papers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upload their own papers" ON public.past_papers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own papers" ON public.past_papers FOR DELETE USING (auth.uid() = user_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for papers
INSERT INTO storage.buckets (id, name, public) VALUES ('papers', 'papers', true);

CREATE POLICY "Users can view their own paper files" ON storage.objects FOR SELECT USING (bucket_id = 'papers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload their own paper files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'papers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own paper files" ON storage.objects FOR DELETE USING (bucket_id = 'papers' AND auth.uid()::text = (storage.foldername(name))[1]);
