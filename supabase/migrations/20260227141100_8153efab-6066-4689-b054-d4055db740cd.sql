
-- Add delete policy for cached_jobs (drop first if exists)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can delete cached jobs" ON public.cached_jobs;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Admins can delete cached jobs"
  ON public.cached_jobs
  FOR DELETE
  USING (true);
