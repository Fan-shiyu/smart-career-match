
-- Storage bucket for CV uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('cvs', 'cvs', false);

-- Allow anyone to upload CVs (no auth for this personal tool)
CREATE POLICY "Anyone can upload CVs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'cvs');

CREATE POLICY "Anyone can read CVs"
ON storage.objects FOR SELECT
USING (bucket_id = 'cvs');

-- Candidate profiles table
CREATE TABLE public.candidate_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT,
  hard_skills TEXT[] DEFAULT '{}',
  software_tools TEXT[] DEFAULT '{}',
  years_experience INTEGER,
  education_level TEXT,
  languages TEXT[] DEFAULT '{}',
  seniority TEXT,
  raw_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage candidate profiles"
ON public.candidate_profiles FOR ALL
USING (true) WITH CHECK (true);

-- Cached jobs table
CREATE TABLE public.cached_jobs (
  job_id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  job_url TEXT,
  apply_url TEXT,
  date_posted TEXT,
  job_title TEXT NOT NULL,
  seniority_level TEXT,
  employment_type TEXT,
  work_mode TEXT,
  country TEXT,
  city TEXT,
  company_name TEXT NOT NULL,
  industry TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT,
  job_description_raw TEXT,
  hard_skills TEXT[] DEFAULT '{}',
  software_tools TEXT[] DEFAULT '{}',
  soft_skills TEXT[] DEFAULT '{}',
  years_experience_min INTEGER,
  education_level TEXT,
  required_languages TEXT[] DEFAULT '{}',
  visa_sponsorship_mentioned TEXT DEFAULT 'unclear',
  ind_registered_sponsor BOOLEAN DEFAULT false,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cached_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cached jobs"
ON public.cached_jobs FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert cached jobs"
ON public.cached_jobs FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update cached jobs"
ON public.cached_jobs FOR UPDATE
USING (true);

-- IND registered sponsors table
CREATE TABLE public.ind_sponsors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  company_name_normalized TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ind_sponsors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read IND sponsors"
ON public.ind_sponsors FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert IND sponsors"
ON public.ind_sponsors FOR INSERT
WITH CHECK (true);

CREATE INDEX idx_ind_sponsors_normalized ON public.ind_sponsors (company_name_normalized);
