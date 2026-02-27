import { useState } from "react";
import { Briefcase, Zap } from "lucide-react";
import { FilterSidebar, defaultFilters } from "@/components/FilterSidebar";
import { ResultsTable } from "@/components/ResultsTable";
import { CVUpload } from "@/components/CVUpload";
import { ExportPanel } from "@/components/ExportPanel";
import { mockJobs } from "@/data/mockJobs";
import { SearchFilters, CandidateProfile, Job } from "@/types/job";

const Index = () => {
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>(mockJobs);

  const handleSearch = () => {
    // Apply client-side filtering on mock data
    let filtered = [...mockJobs];
    if (filters.workMode !== "all") filtered = filtered.filter(j => j.work_mode === filters.workMode);
    if (filters.employmentType !== "all") filtered = filtered.filter(j => j.employment_type === filters.employmentType);
    if (filters.seniorityLevel !== "all") filtered = filtered.filter(j => j.seniority_level === filters.seniorityLevel);
    if (filters.country) filtered = filtered.filter(j => j.country === filters.country);
    if (filters.minSalary > 0) filtered = filtered.filter(j => j.salary_max != null && j.salary_max >= filters.minSalary);
    if (filters.indSponsorOnly) filtered = filtered.filter(j => j.ind_registered_sponsor);
    if (filters.matchThreshold > 0) filtered = filtered.filter(j => j.match_score_overall >= filters.matchThreshold);
    if (filters.maxCommuteTime < 120) filtered = filtered.filter(j => j.commute_time_min == null || j.commute_time_min <= filters.maxCommuteTime);
    if (filters.keywords) {
      const kw = filters.keywords.toLowerCase();
      filtered = filtered.filter(j => j.job_title.toLowerCase().includes(kw) || j.company_name.toLowerCase().includes(kw));
    }
    setJobs(filtered);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <FilterSidebar filters={filters} onFiltersChange={setFilters} onSearch={handleSearch} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Briefcase className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-foreground tracking-tight">Job Intelligence</h1>
                <p className="text-xs text-muted-foreground">AI-Powered Matching Platform</p>
              </div>
            </div>
            <div className="h-6 w-px bg-border mx-2" />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-primary animate-pulse-glow" />
              <span className="font-mono">{jobs.length}</span> results
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-56">
              <CVUpload profile={profile} onProfileChange={setProfile} />
            </div>
            <div className="h-6 w-px bg-border" />
            <ExportPanel jobs={jobs} />
          </div>
        </header>

        {/* Results */}
        <ResultsTable jobs={jobs} />
      </div>
    </div>
  );
};

export default Index;
