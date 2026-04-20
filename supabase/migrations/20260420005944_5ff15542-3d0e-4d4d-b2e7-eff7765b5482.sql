-- Private system-only table for Vicen AI moderation learning
CREATE TABLE public.learned_words (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_learned_words_word ON public.learned_words(word);

-- Enable RLS and DENY all client access (system-only via service role)
ALTER TABLE public.learned_words ENABLE ROW LEVEL SECURITY;

-- Explicit deny policies for all roles & commands. Service role bypasses RLS.
CREATE POLICY "Deny all select" ON public.learned_words
  FOR SELECT TO anon, authenticated USING (false);

CREATE POLICY "Deny all insert" ON public.learned_words
  FOR INSERT TO anon, authenticated WITH CHECK (false);

CREATE POLICY "Deny all update" ON public.learned_words
  FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny all delete" ON public.learned_words
  FOR DELETE TO anon, authenticated USING (false);

-- Auto-update timestamp
CREATE TRIGGER update_learned_words_updated_at
BEFORE UPDATE ON public.learned_words
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();