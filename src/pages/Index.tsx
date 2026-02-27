import { useState, useEffect } from "react";
import { Briefcase, Zap, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { FilterSidebar, defaultFilters } from "@/components/FilterSidebar";
import { ResultsTable } from "@/components/ResultsTable";
import { CVUpload } from "@/components/CVUpload";
import { ExportPanel } from "@/components/ExportPanel";
import { AdminBackfillPanel } from "@/components/AdminBackfillPanel";
import { UserMenu } from "@/components/UserMenu";
import { UsageMeter } from "@/components/UsageMeter";
import { PaywallModal } from "@/components/PaywallModal";
import { UsageProvider, useUsage } from "@/hooks/useUsage";
import { SearchFilters, CandidateProfile, Job } from "@/types/job";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STORAGE_KEY_FOCUS = "jobint_focus_mode";
const STORAGE_KEY_CV_COLLAPSED = "jobint_cv_collapsed";

function AppContent() {
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState("");
  const [paywallUsage, setPaywallUsage] = useState("");
  const { canSearch, trackEvent, usage, limits, isAdmin } = useUsage();

  const [focusMode, setFocusMode] = useState(() => localStorage.getItem(STORAGE_KEY_FOCUS) === "true");
  const [cvCollapsed, setCvCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY_CV_COLLAPSED) === "true");

  useEffect(() => { localStorage.setItem(STORAGE_KEY_FOCUS, String(focusMode)); }, [focusMode]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_CV_COLLAPSED, String(cvCollapsed)); }, [cvCollapsed]);

  // Focus mode auto-collapses CV
  useEffect(() => {
    if (focusMode && profile) setCvCollapsed(true);
  }, [focusMode]);

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
          keywords: filters.keywords, country: filters.country, city: filters.city,
          workModes: filters.workModes, employmentTypes: filters.employmentTypes,
          minSalary: filters.minSalary, postedWithin: filters.postedWithin,
          matchThreshold: filters.matchThreshold, strictMode: filters.strictMode,
          indSponsorOnly: filters.indSponsorOnly, topN: Math.min(filters.topN, limits.maxResults),
          candidateProfile: profile || undefined, dataSourceFilter: filters.dataSourceFilter,
          commuteOrigin: filters.commuteOrigin || undefined, commuteMode: filters.commuteMode || undefined,
          maxCommuteTime: filters.maxCommuteTime || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await trackEvent("search");
      const results = (data.jobs || []).slice(0, limits.maxResults);
      setJobs(results);
      toast({ title: "Search Complete", description: `Found ${results.length} jobs${limits.plan === "free" ? " (Free plan: top 10)" : ""}` });
    } catch (e) {
      console.error("Search error:", e);
      toast({ title: "Search Failed", description: e instanceof Error ? e.message : "Could not search jobs", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <FilterSidebar filters={filters} onFiltersChange={setFilters} onSearch={handleSearch} />

      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className={cn(
          "flex items-center justify-between border-b border-border bg-card shrink-0 shadow-sm",
          focusMode ? "px-3 py-2" : "px-5 py-3"
        )}>
          <div className="flex items-center gap-2">
            {!focusMode && (
              <>
                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Briefcase className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h1 className="text-sm font-extrabold text-foreground tracking-tight">Job Intelligence</h1>
                  <p className="text-[10px] text-muted-foreground">AI-Powered Matching</p>
                </div>
                <div className="h-5 w-px bg-border mx-1" />
              </>
            )}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent text-xs text-accent-foreground font-medium">
              {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              <span className="font-mono">{jobs.length}</span> results
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && !focusMode && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-[10px] font-semibold text-primary">
                ⚡ Admin
              </div>
            )}
            {!focusMode && <UsageMeter />}

            {/* Focus mode toggle */}
            <button
              onClick={() => setFocusMode(!focusMode)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors",
                focusMode
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
              title={focusMode ? "Exit focus mode" : "Focus mode: maximize table rows"}
            >
              {focusMode ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
              {focusMode ? "Exit focus" : "Focus"}
            </button>

            <div className="h-5 w-px bg-border" />
            <div className={cn(focusMode ? "w-auto" : "w-56")}>
              <CVUpload
                profile={profile}
                onProfileChange={setProfile}
                collapsed={cvCollapsed}
                onCollapsedChange={setCvCollapsed}
                compact={focusMode}
              />
            </div>
            <div className="h-5 w-px bg-border" />
            <ExportPanel jobs={jobs} />
            <UserMenu />
          </div>
        </header>

        {/* Results - fills remaining height */}
        <ResultsTable jobs={jobs} />

        {/* Admin backfill panel */}
        {isAdmin && (
          <div className="absolute bottom-4 right-4 z-20 w-80">
            <AdminBackfillPanel />
          </div>
        )}
      </div>

      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} feature={paywallFeature} currentUsage={paywallUsage} />
    </div>
  );
}

const Index = () => (
  <UsageProvider>
    <AppContent />
  </UsageProvider>
);

export default Index;
