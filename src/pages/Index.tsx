import { useState } from "react";
import { Briefcase, Zap, Loader2 } from "lucide-react";
import { FilterSidebar, defaultFilters } from "@/components/FilterSidebar";
import { ResultsTable } from "@/components/ResultsTable";
import { CVUpload } from "@/components/CVUpload";
import { ExportPanel } from "@/components/ExportPanel";
import { UserMenu } from "@/components/UserMenu";
import { UsageMeter } from "@/components/UsageMeter";
import { PaywallModal } from "@/components/PaywallModal";
import { UsageProvider, useUsage } from "@/hooks/useUsage";
import { SearchFilters, CandidateProfile, Job } from "@/types/job";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

function AppContent() {
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState("");
  const [paywallUsage, setPaywallUsage] = useState("");
  const { canSearch, trackEvent, usage, limits } = useUsage();

  const handleSearch = async () => {
    if (!canSearch()) {
      setPaywallFeature("Unlimited searches");
      setPaywallUsage(`You've used ${usage.searchesToday}/${limits.searchesPerDay} searches today`);
      setPaywallOpen(true);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-jobs", {
        body: {
          keywords: filters.keywords,
          country: filters.country,
          city: filters.city,
          workModes: filters.workModes,
          employmentTypes: filters.employmentTypes,
          minSalary: filters.minSalary,
          postedWithin: filters.postedWithin,
          matchThreshold: filters.matchThreshold,
          strictMode: filters.strictMode,
          indSponsorOnly: filters.indSponsorOnly,
          topN: Math.min(filters.topN, limits.maxResults),
          candidateProfile: profile || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await trackEvent("search");

      const results = (data.jobs || []).slice(0, limits.maxResults);
      setJobs(results);
      toast({
        title: "Search Complete",
        description: `Found ${results.length} jobs${limits.plan === "free" ? " (Free plan: top 10)" : ""}`,
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
        <header className="flex items-center justify-between px-5 py-4 border-b border-border bg-card shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-extrabold text-foreground tracking-tight">Job Intelligence</h1>
                <p className="text-xs text-muted-foreground">AI-Powered Matching Platform</p>
              </div>
            </div>
            <div className="h-6 w-px bg-border mx-2" />
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-xs text-accent-foreground font-medium">
              {isSearching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              <span className="font-mono">{jobs.length}</span> results
            </div>
          </div>

          <div className="flex items-center gap-3">
            <UsageMeter />
            <div className="h-6 w-px bg-border" />
            <div className="w-56">
              <CVUpload profile={profile} onProfileChange={setProfile} />
            </div>
            <div className="h-6 w-px bg-border" />
            <ExportPanel jobs={jobs} />
            <UserMenu />
          </div>
        </header>

        {/* Results */}
        <ResultsTable jobs={jobs} />
      </div>

      <PaywallModal
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        feature={paywallFeature}
        currentUsage={paywallUsage}
      />
    </div>
  );
}

const Index = () => (
  <UsageProvider>
    <AppContent />
  </UsageProvider>
);

export default Index;
