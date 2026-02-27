import { useState } from "react";
import { Briefcase, Zap, Loader2 } from "lucide-react";
import { FilterSidebar, defaultFilters } from "@/components/FilterSidebar";
import { ResultsTable } from "@/components/ResultsTable";
import { CVUpload } from "@/components/CVUpload";
import { ExportPanel } from "@/components/ExportPanel";
import { SearchFilters, CandidateProfile, Job } from "@/types/job";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-jobs", {
        body: {
          keywords: filters.keywords,
          country: filters.country,
          city: filters.city,
          workMode: filters.workMode,
          employmentType: filters.employmentType,
          minSalary: filters.minSalary,
          postedWithin: filters.postedWithin,
          matchThreshold: filters.matchThreshold,
          strictMode: filters.strictMode,
          indSponsorOnly: filters.indSponsorOnly,
          candidateProfile: profile || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setJobs(data.jobs || []);
      toast({
        title: "Search Complete",
        description: `Found ${data.jobs?.length || 0} jobs`,
      });
    } catch (e) {
      console.error("Search error:", e);
      toast({
        title: "Search Failed",
        description: e instanceof Error ? e.message : "Could not search jobs",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
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
              {isSearching ? (
                <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5 text-primary animate-pulse-glow" />
              )}
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
