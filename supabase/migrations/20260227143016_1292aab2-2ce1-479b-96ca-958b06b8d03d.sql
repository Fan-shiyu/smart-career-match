
-- Add enrichment tracking columns to cached_jobs
ALTER TABLE public.cached_jobs ADD COLUMN IF NOT EXISTS enrichment_status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.cached_jobs ADD COLUMN IF NOT EXISTS enrichment_error text;
ALTER TABLE public.cached_jobs ADD COLUMN IF NOT EXISTS job_description_hash text;
ALTER TABLE public.cached_jobs ADD COLUMN IF NOT EXISTS enriched_at timestamptz;
ALTER TABLE public.cached_jobs ADD COLUMN IF NOT EXISTS enrichment_status_updated_at timestamptz;

-- IND & visa columns
ALTER TABLE public.cached_jobs ADD COLUMN IF NOT EXISTS ind_match_method text DEFAULT 'none';
ALTER TABLE public.cached_jobs ADD COLUMN IF NOT EXISTS ind_matched_name text;
ALTER TABLE public.cached_jobs ADD COLUMN IF NOT EXISTS visa_likelihood text;

-- Match columns
ALTER TABLE public.cached_jobs ADD COLUMN IF NOT EXISTS match_score_overall numeric;
ALTER TABLE public.cached_jobs ADD COLUMN IF NOT EXISTS match_score_breakdown jsonb;
ALTER TABLE public.cached_jobs ADD COLUMN IF NOT EXISTS matched_skills text[] DEFAULT '{}';
ALTER TABLE public.cached_jobs ADD COLUMN IF NOT EXISTS missing_skills text[] DEFAULT '{}';
ALTER TABLE public.cached_jobs ADD COLUMN IF NOT EXISTS must_have_missing_count integer DEFAULT 0;
ALTER TABLE public.cached_jobs ADD COLUMN IF NOT EXISTS match_explanation text;
ALTER TABLE public.cached_jobs ADD COLUMN IF NOT EXISTS match_status text DEFAULT 'not_requested';

-- Commute status
ALTER TABLE public.cached_jobs ADD COLUMN IF NOT EXISTS commute_status text DEFAULT 'not_requested';

-- Company enrichment
ALTER TABLE public.cached_jobs ADD COLUMN IF NOT EXISTS company_enrichment_status text DEFAULT 'pending';

-- Indexes for backfill queries
CREATE INDEX IF NOT EXISTS idx_cached_jobs_enrichment_status ON public.cached_jobs (enrichment_status);
CREATE INDEX IF NOT EXISTS idx_cached_jobs_jd_hash ON public.cached_jobs (job_description_hash);
