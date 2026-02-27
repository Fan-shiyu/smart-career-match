import { useState } from "react";
import { ArrowUpDown, ExternalLink, Clock, MapPin } from "lucide-react";
import { Job } from "@/types/job";
import { MatchScoreBadge } from "./MatchScoreBadge";
import { VisaBadge } from "./VisaBadge";
import { WorkModeBadge } from "./WorkModeBadge";
import { cn } from "@/lib/utils";

interface ResultsTableProps {
  jobs: Job[];
}

type SortKey = "match_score_overall" | "date_posted" | "salary_max" | "commute_time_min" | "job_title";

export function ResultsTable({ jobs }: ResultsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("match_score_overall");
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sorted = [...jobs].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortAsc ? cmp : -cmp;
  });

  const SortHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <button onClick={() => handleSort(sortKeyName)} className="flex items-center gap-1 hover:text-foreground transition-colors">
      {label}
      <ArrowUpDown className={cn("h-3 w-3", sortKey === sortKeyName ? "text-primary" : "text-muted-foreground/50")} />
    </button>
  );

  const formatSalary = (min: number | null, max: number | null, currency: string | null) => {
    if (!min && !max) return "—";
    const fmt = (n: number) => `${(n / 1000).toFixed(0)}k`;
    const c = currency || "€";
    if (min && max) return `${c === "EUR" ? "€" : c}${fmt(min)}–${fmt(max)}`;
    return `${c === "EUR" ? "€" : c}${fmt(min || max!)}`;
  };

  const sourceColors: Record<string, string> = {
    adzuna: "text-primary",
    greenhouse: "text-score-high",
    lever: "text-score-medium",
  };

  if (jobs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg font-medium mb-1">No jobs found</p>
          <p className="text-sm">Try adjusting your filters or uploading a CV to start matching.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto scrollbar-thin">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-card z-10 border-b border-border shadow-sm">
          <tr className="text-muted-foreground font-medium uppercase tracking-wider">
            <th className="text-left px-3 py-2.5 w-8">#</th>
            <th className="text-left px-3 py-2.5"><SortHeader label="Score" sortKeyName="match_score_overall" /></th>
            <th className="text-left px-3 py-2.5"><SortHeader label="Title" sortKeyName="job_title" /></th>
            <th className="text-left px-3 py-2.5">Company</th>
            <th className="text-left px-3 py-2.5">Location</th>
            <th className="text-left px-3 py-2.5">Mode</th>
            <th className="text-left px-3 py-2.5"><SortHeader label="Salary" sortKeyName="salary_max" /></th>
            <th className="text-left px-3 py-2.5">Visa</th>
            <th className="text-left px-3 py-2.5"><SortHeader label="Commute" sortKeyName="commute_time_min" /></th>
            <th className="text-left px-3 py-2.5">Source</th>
            <th className="text-left px-3 py-2.5"><SortHeader label="Posted" sortKeyName="date_posted" /></th>
            <th className="text-left px-3 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((job, i) => (
            <tr
              key={job.job_id}
              onClick={() => setSelectedJob(selectedJob === job.job_id ? null : job.job_id)}
              className={cn(
                "border-b border-border/50 cursor-pointer transition-colors",
                selectedJob === job.job_id ? "bg-primary/5" : "hover:bg-muted/30"
              )}
            >
              <td className="px-3 py-2.5 text-muted-foreground font-mono">{i + 1}</td>
              <td className="px-3 py-2.5"><MatchScoreBadge score={job.match_score_overall} size="sm" /></td>
              <td className="px-3 py-2.5 font-medium text-foreground max-w-[200px] truncate">{job.job_title}</td>
              <td className="px-3 py-2.5 text-secondary-foreground">{job.company_name}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{job.city ? `${job.city}, ${job.country}` : job.country}</td>
              <td className="px-3 py-2.5"><WorkModeBadge mode={job.work_mode} /></td>
              <td className="px-3 py-2.5 font-mono text-foreground">{formatSalary(job.salary_min, job.salary_max, job.salary_currency)}</td>
              <td className="px-3 py-2.5"><VisaBadge likelihood={job.visa_likelihood} /></td>
              <td className="px-3 py-2.5 text-muted-foreground">
                {job.commute_time_min != null ? (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {job.commute_time_min}m
                  </span>
                ) : "—"}
              </td>
              <td className={cn("px-3 py-2.5 font-mono uppercase", sourceColors[job.source] || "text-muted-foreground")}>{job.source}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{job.date_posted}</td>
              <td className="px-3 py-2.5">
                <a href={job.apply_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary hover:text-primary/80 transition-colors">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedJob && (
        <JobDetailPanel job={sorted.find(j => j.job_id === selectedJob)!} />
      )}
    </div>
  );
}

function JobDetailPanel({ job }: { job: Job }) {
  return (
    <div className="border-t border-border bg-accent/30 p-4 animate-slide-in">
      <div className="grid grid-cols-3 gap-6 max-w-5xl">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Match Breakdown</h4>
          <div className="space-y-1.5">
            {Object.entries(job.match_score_breakdown).map(([key, val]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-20 capitalize">{key.replace("_", " ")}</span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", val >= 75 ? "bg-score-high" : val >= 50 ? "bg-score-medium" : "bg-score-low")}
                    style={{ width: `${val}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-foreground w-8 text-right">{val}%</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Matched Skills</h4>
          <div className="flex flex-wrap gap-1">
            {job.matched_skills.map(s => (
              <span key={s} className="text-xs px-1.5 py-0.5 rounded bg-score-high/10 text-score-high border border-score-high/20">{s}</span>
            ))}
          </div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 mt-3">Missing Skills</h4>
          <div className="flex flex-wrap gap-1">
            {job.missing_skills.map(s => (
              <span key={s} className="text-xs px-1.5 py-0.5 rounded bg-score-low/10 text-score-low border border-score-low/20">{s}</span>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Details</h4>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Seniority</span><span className="text-foreground">{job.seniority_level || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Experience</span><span className="text-foreground">{job.years_experience_min ? `${job.years_experience_min}+ years` : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Education</span><span className="text-foreground">{job.education_level || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Languages</span><span className="text-foreground">{job.required_languages.join(", ") || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">IND Sponsor</span><span className="text-foreground">{job.ind_registered_sponsor ? "Yes" : "No"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Visa mentioned</span><span className="text-foreground capitalize">{job.visa_sponsorship_mentioned}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
