
-- Admin credentials table
CREATE TABLE public.admin_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_credentials TO service_role;
ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_select_admin_creds" ON public.admin_credentials FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "deny_all_insert_admin_creds" ON public.admin_credentials FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "deny_all_update_admin_creds" ON public.admin_credentials FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_all_delete_admin_creds" ON public.admin_credentials FOR DELETE TO anon, authenticated USING (false);

-- Seed initial admin user (password: @_xinyang_065) - bcrypt hash with 10 rounds
INSERT INTO public.admin_credentials (username, password_hash) VALUES
('vicent_065', '$2a$10$5xqzPyzKWVdYbOpRPDQpMOoGRgZf5tEpZIWmgC1d7sgIaC.4iC5d.');

-- Images table
CREATE TABLE public.vicen_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  category TEXT DEFAULT 'general',
  sub_category TEXT DEFAULT '',
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  quality_score NUMERIC DEFAULT 0.8,
  popularity_score NUMERIC DEFAULT 0.5,
  relevance_boost NUMERIC DEFAULT 1.0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  language TEXT DEFAULT 'en',
  country TEXT DEFAULT '',
  width INTEGER DEFAULT 0,
  height INTEGER DEFAULT 0,
  file_size INTEGER DEFAULT 0,
  mime_type TEXT DEFAULT 'image/jpeg',
  uploaded_by TEXT DEFAULT 'vicent_065',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.vicen_images TO service_role;
ALTER TABLE public.vicen_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_select_vicen_images" ON public.vicen_images FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "deny_all_modify_vicen_images" ON public.vicen_images FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE INDEX idx_vicen_images_active ON public.vicen_images(is_active);
CREATE INDEX idx_vicen_images_category ON public.vicen_images(category);
CREATE INDEX idx_vicen_images_tags ON public.vicen_images USING GIN(tags);

-- Knowledge table
CREATE TABLE public.vicen_knowledge (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT DEFAULT '',
  raw_content TEXT NOT NULL,
  extracted_facts TEXT[] DEFAULT '{}',
  entities TEXT[] DEFAULT '{}',
  relationships TEXT[] DEFAULT '{}',
  categories TEXT[] DEFAULT '{}',
  useful_for TEXT[] DEFAULT '{}',
  context_summary TEXT DEFAULT '',
  added_by TEXT DEFAULT 'vicent_065',
  is_locked BOOLEAN NOT NULL DEFAULT false,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.vicen_knowledge TO service_role;
ALTER TABLE public.vicen_knowledge ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_select_vicen_knowledge" ON public.vicen_knowledge FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "deny_all_modify_vicen_knowledge" ON public.vicen_knowledge FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE INDEX idx_vicen_knowledge_active ON public.vicen_knowledge(is_active);

-- Logs table
CREATE TABLE public.vicen_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_name TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT DEFAULT '',
  topic TEXT DEFAULT '',
  session_id TEXT DEFAULT '',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.vicen_logs TO service_role;
ALTER TABLE public.vicen_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_select_vicen_logs" ON public.vicen_logs FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "deny_all_modify_vicen_logs" ON public.vicen_logs FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE INDEX idx_vicen_logs_timestamp ON public.vicen_logs(timestamp DESC);

-- updated_at triggers
CREATE TRIGGER trg_vicen_images_updated BEFORE UPDATE ON public.vicen_images
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_vicen_knowledge_updated BEFORE UPDATE ON public.vicen_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_admin_credentials_updated BEFORE UPDATE ON public.admin_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
