import { useState } from "react";
import { ArrowUpDown, ExternalLink, Clock, Settings2 } from "lucide-react";
import { Job, TablePreset } from "@/types/job";
import { MatchScoreBadge } from "./MatchScoreBadge";
import { VisaBadge } from "./VisaBadge";
import { WorkModeBadge } from "./WorkModeBadge";
import { cn } from "@/lib/utils";
import { ALL_COLUMNS, TABLE_PRESETS } from "@/lib/columns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ResultsTableProps {
  jobs: Job[];
}

type SortKey = string;

// Special renderers for certain column keys
function CellRenderer({ colKey, job }: { colKey: string; job: Job }) {
  switch (colKey) {
    case "match_score_overall":
      return <MatchScoreBadge score={job.match_score_overall} size="sm" />;
    case "work_mode":
      return <WorkModeBadge mode={job.work_mode as any} />;
    case "visa_likelihood":
      return <VisaBadge likelihood={job.visa_likelihood} />;
    case "apply_url":
      return (
        <a href={job.apply_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary hover:text-primary/80 transition-colors">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      );
    case "commute_time_min":
      return job.commute_time_min != null ? (
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{job.commute_time_min}m</span>
      ) : <span className="text-muted-foreground">—</span>;
    case "salary_display":
      return <span className="font-mono">{formatSalary(job)}</span>;
    default: {
      const colDef = ALL_COLUMNS.find((c) => c.key === colKey);
      const val = colDef ? colDef.getValue(job) : "";
      if (!val) return <span className="text-muted-foreground">—</span>;
      return <span className="max-w-[180px] truncate block">{val}</span>;
    }
  }
}

function formatSalary(j: Job) {
  if (!j.salary_min && !j.salary_max) return "—";
  const fmt = (n: number) => `${(n / 1000).toFixed(0)}k`;
  const c = j.salary_currency === "EUR" ? "€" : (j.salary_currency || "€");
  if (j.salary_min && j.salary_max) return `${c}${fmt(j.salary_min)}–${fmt(j.salary_max)}`;
  return `${c}${fmt(j.salary_min || j.salary_max!)}`;
}

const sortableKeys = new Set([
  "match_score_overall", "date_posted", "salary_max", "commute_time_min",
  "job_title", "company_name", "seniority_level", "city",
]);

export function ResultsTable({ jobs }: ResultsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("match_score_overall");
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [tablePreset, setTablePreset] = useState<TablePreset>("quick");

  const visibleKeys = TABLE_PRESETS[tablePreset] || TABLE_PRESETS.quick;
  const visibleCols = visibleKeys.map((k) => ALL_COLUMNS.find((c) => c.key === k)).filter(Boolean);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sorted = [...jobs].sort((a, b) => {
    const colDef = ALL_COLUMNS.find((c) => c.key === sortKey);
    if (!colDef) return 0;
    const av = colDef.getValue(a);
    const bv = colDef.getValue(b);
    if (av === bv) return 0;
    if (!av) return 1;
    if (!bv) return -1;
    const numA = Number(av), numB = Number(bv);
    if (!isNaN(numA) && !isNaN(numB)) {
      return sortAsc ? numA - numB : numB - numA;
    }
    return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
  });

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
    <div className="flex-1 flex flex-col min-h-0">
      {/* Preset selector */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30 shrink-0">
        <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">View:</span>
        <Select value={tablePreset} onValueChange={(v) => setTablePreset(v as TablePreset)}>
          <SelectTrigger className="h-7 text-xs w-[160px] bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="quick">Quick Overview</SelectItem>
            <SelectItem value="detailed">Detailed Analysis</SelectItem>
            <SelectItem value="visa">Visa Focus</SelectItem>
            <SelectItem value="skill-gap">Skill Gap Focus</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{visibleCols.length} columns</span>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-card z-10 border-b border-border shadow-sm">
            <tr className="text-muted-foreground font-medium uppercase tracking-wider">
              <th className="text-left px-3 py-2.5 w-8">#</th>
              {visibleCols.map((col) => (
                <th key={col!.key} className="text-left px-3 py-2.5">
                  {sortableKeys.has(col!.key) ? (
                    <button onClick={() => handleSort(col!.key)} className="flex items-center gap-1 hover:text-foreground transition-colors">
                      {col!.label}
                      <ArrowUpDown className={cn("h-3 w-3", sortKey === col!.key ? "text-primary" : "text-muted-foreground/50")} />
                    </button>
                  ) : (
                    col!.label
                  )}
                </th>
              ))}
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
                {visibleCols.map((col) => (
                  <td key={col!.key} className="px-3 py-2.5">
                    <CellRenderer colKey={col!.key} job={job} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {selectedJob && (
          <JobDetailPanel job={sorted.find((j) => j.job_id === selectedJob)!} />
        )}
      </div>
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
            {job.matched_skills.map((s) => (
              <span key={s} className="text-xs px-1.5 py-0.5 rounded bg-score-high/10 text-score-high border border-score-high/20">{s}</span>
            ))}
          </div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 mt-3">Missing Skills</h4>
          <div className="flex flex-wrap gap-1">
            {job.missing_skills.map((s) => (
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
            <div className="flex justify-between"><span className="text-muted-foreground">Department</span><span className="text-foreground">{job.department || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Contract</span><span className="text-foreground">{job.contract_type || "—"}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
