
CREATE TABLE public.private_knowledge (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  content TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'md',
  filename TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.private_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own knowledge"
ON public.private_knowledge FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Owner can insert own knowledge"
ON public.private_knowledge FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own knowledge"
ON public.private_knowledge FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Owner can delete own knowledge"
ON public.private_knowledge FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_private_knowledge_updated_at
BEFORE UPDATE ON public.private_knowledge
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
