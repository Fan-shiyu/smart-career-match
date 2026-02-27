
-- Add full JD tracking columns to cached_jobs
ALTER TABLE public.cached_jobs
  ADD COLUMN IF NOT EXISTS job_description_raw_snippet text,
  ADD COLUMN IF NOT EXISTS job_description_source text DEFAULT 'api_full',
  ADD COLUMN IF NOT EXISTS job_description_char_count integer DEFAULT 0;

-- Create index on char_count for finding truncated jobs
CREATE INDEX IF NOT EXISTS idx_cached_jobs_jd_char_count ON public.cached_jobs (job_description_char_count);
