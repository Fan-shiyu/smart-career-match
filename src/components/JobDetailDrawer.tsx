import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MatchScoreBadge } from "./MatchScoreBadge";
import { VisaBadge } from "./VisaBadge";
import { WorkModeBadge } from "./WorkModeBadge";
import { Job } from "@/types/job";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  ExternalLink, Bookmark, BookmarkCheck, Clock, MapPin, Building2,
  GraduationCap, Languages, Shield, Heart, FileText, Briefcase,
  ChevronRight, Pen
} from "lucide-react";
import { cn } from "@/lib/utils";

interface JobDetailDrawerProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const JOB_STATUSES = ["saved", "applied", "interview", "offer", "rejected"] as const;
type JobStatus = (typeof JOB_STATUSES)[number];

const STATUS_COLORS: Record<JobStatus, string> = {
  saved: "bg-muted text-muted-foreground",
  applied: "bg-primary/10 text-primary",
  interview: "bg-score-high/10 text-score-high",
  offer: "bg-score-high/20 text-score-high",
  rejected: "bg-destructive/10 text-destructive",
};

export function JobDetailDrawer({ job, open, onOpenChange }: JobDetailDrawerProps) {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const [savedStatus, setSavedStatus] = useState<JobStatus | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!job || !user || !open) return;
    supabase
      .from("saved_jobs")
      .select("status, notes")
      .eq("user_id", user.id)
      .eq("job_id", job.job_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSavedStatus(data.status as JobStatus);
          setNotes(data.notes || "");
        } else {
          setSavedStatus(null);
          setNotes("");
        }
      });
  }, [job?.job_id, user, open]);

  const handleSave = async (status: JobStatus) => {
    if (!user || !job) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("saved_jobs").upsert(
        { user_id: user.id, job_id: job.job_id, status, notes, job_snapshot: job as any },
        { onConflict: "user_id,job_id" }
      );
      if (error) throw error;
      setSavedStatus(status);
      toast({ title: "Job saved", description: `Status: ${status}` });
    } catch (e) {
      toast({ title: "Error saving", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleSaveNotes = async () => {
    if (!user || !job) return;
    setSaving(true);
    const { error } = await supabase
      .from("saved_jobs")
      .update({ notes })
      .eq("user_id", user.id)
      .eq("job_id", job.job_id);
    if (error) {
      // Not yet saved, upsert
      await supabase.from("saved_jobs").upsert(
        { user_id: user.id, job_id: job.job_id, status: "saved", notes, job_snapshot: job as any },
        { onConflict: "user_id,job_id" }
      );
      setSavedStatus("saved");
    }
    toast({ title: "Notes saved" });
    setSaving(false);
  };

  const handleRemove = async () => {
    if (!user || !job) return;
    await supabase.from("saved_jobs").delete().eq("user_id", user.id).eq("job_id", job.job_id);
    setSavedStatus(null);
    setNotes("");
    toast({ title: "Job removed from saved" });
  };

  if (!job) return null;

  const formatSalary = () => {
    if (!job.salary_min && !job.salary_max) return null;
    const c = job.salary_currency === "EUR" ? "€" : (job.salary_currency || "€");
    const fmt = (n: number) => `${(n / 1000).toFixed(0)}k`;
    if (job.salary_min && job.salary_max) return `${c}${fmt(job.salary_min)} – ${c}${fmt(job.salary_max)}`;
    return `${c}${fmt(job.salary_min || job.salary_max!)}`;
  };

  const sal = formatSalary();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
        {/* Header */}
        <SheetHeader className="p-5 pb-3 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base font-bold leading-tight">{job.job_title}</SheetTitle>
              <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{job.company_name}</span>
                {job.city && (
                  <>
                    <span>·</span>
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span>{job.city}{job.country ? `, ${job.country}` : ""}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <MatchScoreBadge score={job.match_score_overall} size="sm" />
                <WorkModeBadge mode={job.work_mode as any} />
                <VisaBadge likelihood={job.visa_likelihood} />
                {sal && <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted">{sal}</span>}
              </div>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              {job.apply_url && (
                <Button size="sm" asChild>
                  <a href={job.apply_url} target="_blank" rel="noopener noreferrer">
                    Apply <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
              {savedStatus ? (
                <Button size="sm" variant="secondary" onClick={handleRemove}>
                  <BookmarkCheck className="h-3.5 w-3.5" /> Saved
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => handleSave("saved")}>
                  <Bookmark className="h-3.5 w-3.5" /> Save
                </Button>
              )}
            </div>
          </div>
          {/* Status selector */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-muted-foreground">Status:</span>
            <div className="flex gap-1 flex-wrap">
              {JOB_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSave(s)}
                  disabled={saving}
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full capitalize transition-all border",
                    savedStatus === s
                      ? `${STATUS_COLORS[s]} border-current font-semibold`
                      : "border-border text-muted-foreground hover:border-primary/30"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </SheetHeader>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="p-4">
          <TabsList className="w-full justify-start h-auto flex-wrap gap-0.5 bg-muted/50 p-1">
            <TabsTrigger value="overview" className="text-xs"><Briefcase className="h-3 w-3 mr-1" />Overview</TabsTrigger>
            <TabsTrigger value="match" className="text-xs"><ChevronRight className="h-3 w-3 mr-1" />Match</TabsTrigger>
            <TabsTrigger value="visa" className="text-xs"><Shield className="h-3 w-3 mr-1" />Visa</TabsTrigger>
            <TabsTrigger value="benefits" className="text-xs"><Heart className="h-3 w-3 mr-1" />Benefits</TabsTrigger>
            <TabsTrigger value="commute" className="text-xs"><MapPin className="h-3 w-3 mr-1" />Commute</TabsTrigger>
            <TabsTrigger value="description" className="text-xs"><FileText className="h-3 w-3 mr-1" />Description</TabsTrigger>
            <TabsTrigger value="notes" className="text-xs"><Pen className="h-3 w-3 mr-1" />Notes</TabsTrigger>
          </TabsList>

          {/* Tab A: Overview */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <InfoGrid items={[
              ["Title", job.job_title],
              ["Company", job.company_name],
              ["Location", [job.city, job.region_province, job.country].filter(Boolean).join(", ")],
              ["Work Mode", job.work_mode],
              ["Seniority", job.seniority_level],
              ["Employment", job.employment_type],
              ["Contract", job.contract_type],
              ["Department", job.department],
              ["Posted", job.date_posted],
              ["Source", job.source],
              ["Hours", job.hours_per_week_min && job.hours_per_week_max ? `${job.hours_per_week_min}–${job.hours_per_week_max}h/week` : null],
            ]} />
            {sal && (
              <div className="rounded-lg border border-border p-3 bg-accent/30">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Compensation</h4>
                <p className="text-lg font-bold font-mono">{sal}</p>
                {job.salary_period && <p className="text-xs text-muted-foreground">per {job.salary_period}</p>}
                <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                  {job.bonus_mentioned === "yes" && <span>✓ Bonus</span>}
                  {job.equity_mentioned === "yes" && <span>✓ Equity</span>}
                </div>
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              {job.job_url && (
                <Button size="sm" variant="outline" asChild>
                  <a href={job.job_url} target="_blank" rel="noopener noreferrer">Job Page <ExternalLink className="h-3 w-3" /></a>
                </Button>
              )}
              {job.company_website && (
                <Button size="sm" variant="outline" asChild>
                  <a href={job.company_website} target="_blank" rel="noopener noreferrer">Company Website <ExternalLink className="h-3 w-3" /></a>
                </Button>
              )}
            </div>
          </TabsContent>

          {/* Tab B: Match & Skills */}
          <TabsContent value="match" className="mt-4 space-y-4">
            <div className="flex items-center gap-3 mb-3">
              <MatchScoreBadge score={job.match_score_overall} size="lg" />
              <div>
                <p className="text-sm font-semibold">Overall Match</p>
                {job.match_explanation && <p className="text-xs text-muted-foreground">{job.match_explanation}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">Score Breakdown</h4>
              {Object.entries(job.match_score_breakdown).map(([key, val]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-24 capitalize">{key.replace("_", " ")}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", val >= 75 ? "bg-score-high" : val >= 50 ? "bg-score-medium" : "bg-score-low")}
                      style={{ width: `${val}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono w-10 text-right">{val}%</span>
                </div>
              ))}
            </div>
            <ChipSection title="Matched Skills" items={job.matched_skills} variant="high" />
            <ChipSection title="Missing Skills" items={job.missing_skills} variant="low" />
            {job.must_have_missing_count > 0 && (
              <p className="text-xs text-destructive">⚠ {job.must_have_missing_count} must-have skill(s) missing</p>
            )}
          </TabsContent>

          {/* Tab C: Visa & Language */}
          <TabsContent value="visa" className="mt-4 space-y-4">
            <InfoGrid items={[
              ["JD Language", job.job_description_language],
              ["Required Languages", job.required_languages?.join(", ")],
              ["Language Level", job.language_level],
              ["Visa Mentioned", job.visa_sponsorship_mentioned],
              ["IND Sponsor", job.ind_registered_sponsor ? "Yes ✓" : "No"],
              ["Visa Likelihood", null],
              ["Relocation Support", job.relocation_support_mentioned],
            ]} />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Visa Likelihood:</span>
              <VisaBadge likelihood={job.visa_likelihood} />
            </div>
            {isAdmin && (
              <div className="rounded border border-border p-3 bg-muted/30">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Debug (Admin)</h4>
                <InfoGrid items={[
                  ["Match Method", job.ind_match_method],
                  ["Matched Name", job.ind_matched_name],
                ]} />
              </div>
            )}
          </TabsContent>

          {/* Tab D: Benefits */}
          <TabsContent value="benefits" className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <BenefitFlag label="Pension" value={job.pension} />
              <BenefitFlag label="Health Insurance" value={job.health_insurance} />
              <BenefitFlag label="Learning Budget" value={job.learning_budget} extra={job.learning_budget_amount} />
              <BenefitFlag label="Transport Allowance" value={job.transport_allowance} />
              <BenefitFlag label="Car Lease" value={job.car_lease} />
              <BenefitFlag label="Home Office Budget" value={job.home_office_budget} />
              <BenefitFlag label="Gym/Wellbeing" value={job.gym_wellbeing} />
              <BenefitFlag label="Extra Holidays" value={job.extra_holidays} />
              <BenefitFlag label="Parental Leave" value={job.parental_leave} />
            </div>
            {job.benefits_text_raw && (
              <div className="mt-3">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Benefits Details</h4>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-6">{job.benefits_text_raw}</p>
              </div>
            )}
          </TabsContent>

          {/* Tab E: Commute */}
          <TabsContent value="commute" className="mt-4 space-y-3">
            {job.commute_time_min != null ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-border p-4 bg-accent/30 flex items-center gap-4">
                  <Clock className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold font-mono">{job.commute_time_min} min</p>
                    <p className="text-xs text-muted-foreground">{job.commute_time_text || `${job.commute_distance_km?.toFixed(1)} km`}</p>
                  </div>
                </div>
                <InfoGrid items={[
                  ["Distance", job.commute_distance_km ? `${job.commute_distance_km.toFixed(1)} km` : null],
                  ["Mode", job.commute_mode],
                ]} />
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">Commute not calculated</p>
                <p className="text-xs mt-1">Set a commute origin in filters and run a search with commute enabled.</p>
              </div>
            )}
          </TabsContent>

          {/* Tab F: Full Description */}
          <TabsContent value="description" className="mt-4 space-y-4">
            {job.job_description_raw && (
              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Job Description</h4>
                <div className="text-xs whitespace-pre-wrap text-foreground/80 max-h-[500px] overflow-y-auto scrollbar-thin bg-muted/20 rounded-lg p-3 border border-border">
                  {job.job_description_raw}
                </div>
              </div>
            )}
            {job.requirements_raw && (
              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Requirements</h4>
                <div className="text-xs whitespace-pre-wrap text-foreground/80 bg-muted/20 rounded-lg p-3 border border-border">
                  {job.requirements_raw}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tab G: Notes */}
          <TabsContent value="notes" className="mt-4 space-y-3">
            <Textarea
              placeholder="Add your notes about this job..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[120px] text-sm"
            />
            <Button size="sm" onClick={handleSaveNotes} disabled={saving}>
              Save Notes
            </Button>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function InfoGrid({ items }: { items: [string, string | null | undefined][] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
      {items.map(([label, value]) => (
        value ? (
          <div key={label} className="flex justify-between text-xs">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-foreground font-medium text-right">{value}</span>
          </div>
        ) : null
      ))}
    </div>
  );
}

function ChipSection({ title, items, variant }: { title: string; items: string[]; variant: "high" | "low" }) {
  if (!items?.length) return null;
  const colors = variant === "high"
    ? "bg-score-high/10 text-score-high border-score-high/20"
    : "bg-score-low/10 text-score-low border-score-low/20";
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1.5">{title}</h4>
      <div className="flex flex-wrap gap-1">
        {items.map((s) => (
          <span key={s} className={cn("text-xs px-2 py-0.5 rounded border", colors)}>{s}</span>
        ))}
      </div>
    </div>
  );
}

function BenefitFlag({ label, value, extra }: { label: string; value: string | null; extra?: string | null }) {
  const isYes = value === "yes" || value === "Yes";
  return (
    <div className={cn(
      "rounded border px-3 py-2 text-xs",
      isYes ? "bg-score-high/5 border-score-high/20" : "bg-muted/30 border-border"
    )}>
      <span className={isYes ? "text-score-high font-medium" : "text-muted-foreground"}>
        {isYes ? "✓" : "—"} {label}
      </span>
      {extra && isYes && <span className="text-muted-foreground ml-1">({extra})</span>}
    </div>
  );
}
