
-- ATS type enum
CREATE TYPE public.ats_type AS ENUM ('greenhouse', 'lever', 'workday', 'smartrecruiters', 'custom', 'unknown');
CREATE TYPE public.ingestion_status AS ENUM ('active', 'paused', 'error');
CREATE TYPE public.ingestion_run_status AS ENUM ('success', 'partial', 'failed');

-- Companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  company_name_normalized TEXT NOT NULL,
  country TEXT DEFAULT 'Netherlands',
  industry TEXT,
  company_size TEXT,
  careers_url TEXT,
  ats_type ats_type NOT NULL DEFAULT 'unknown',
  ats_identifier TEXT,
  ingestion_status ingestion_status NOT NULL DEFAULT 'active',
  last_ingested_at TIMESTAMP WITH TIME ZONE,
  ingestion_frequency_minutes INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read companies"
  ON public.companies FOR SELECT USING (true);

CREATE INDEX idx_companies_ats_type ON public.companies (ats_type);
CREATE INDEX idx_companies_ingestion_status ON public.companies (ingestion_status);
CREATE INDEX idx_companies_name_normalized ON public.companies (company_name_normalized);

-- Company jobs table
CREATE TABLE public.company_jobs (
  job_id TEXT PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL DEFAULT 'company_direct',
  source_job_id TEXT,
  job_url TEXT,
  apply_url TEXT,
  job_title TEXT NOT NULL,
  location_raw TEXT,
  country TEXT,
  city TEXT,
  date_posted TEXT,
  job_description_raw TEXT,
  raw_json JSONB,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  company_name TEXT,
  company_name_normalized TEXT
);

ALTER TABLE public.company_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read company jobs"
  ON public.company_jobs FOR SELECT USING (true);

CREATE POLICY "System can insert company jobs"
  ON public.company_jobs FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update company jobs"
  ON public.company_jobs FOR UPDATE USING (true);

CREATE INDEX idx_company_jobs_company ON public.company_jobs (company_id);
CREATE INDEX idx_company_jobs_active ON public.company_jobs (is_active);
CREATE INDEX idx_company_jobs_title ON public.company_jobs (job_title);
CREATE INDEX idx_company_jobs_city ON public.company_jobs (city);
CREATE INDEX idx_company_jobs_fetched ON public.company_jobs (fetched_at DESC);

-- Ingestion logs
CREATE TABLE public.ingestion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  run_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status ingestion_run_status NOT NULL,
  jobs_found INTEGER DEFAULT 0,
  jobs_inserted INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT
);

ALTER TABLE public.ingestion_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ingestion logs"
  ON public.ingestion_logs FOR SELECT USING (true);

CREATE POLICY "System can insert ingestion logs"
  ON public.ingestion_logs FOR INSERT WITH CHECK (true);

CREATE INDEX idx_ingestion_logs_company ON public.ingestion_logs (company_id);
CREATE INDEX idx_ingestion_logs_timestamp ON public.ingestion_logs (run_timestamp DESC);

-- Add data_source_type to cached_jobs for filtering
ALTER TABLE public.cached_jobs ADD COLUMN IF NOT EXISTS data_source_type TEXT DEFAULT 'aggregator';
