import { useState } from "react";
import { ArrowUpDown, ExternalLink, Clock } from "lucide-react";
import { Job } from "@/types/job";
import { MatchScoreBadge } from "./MatchScoreBadge";
import { VisaBadge } from "./VisaBadge";
import { WorkModeBadge } from "./WorkModeBadge";
import { JobDetailDrawer } from "./JobDetailDrawer";
import { cn } from "@/lib/utils";

interface ResultsTableProps {
  jobs: Job[];
}

type SortKey = string;

const OVERVIEW_COLUMNS: { key: string; label: string; sortable?: boolean }[] = [
  { key: "match_score_overall", label: "Match", sortable: true },
  { key: "job_title", label: "Title", sortable: true },
  { key: "company_name", label: "Company", sortable: true },
  { key: "city", label: "City", sortable: true },
  { key: "work_mode", label: "Mode" },
  { key: "date_posted", label: "Posted", sortable: true },
  { key: "salary_display", label: "Salary", sortable: true },
  { key: "visa_likelihood", label: "Visa" },
  { key: "ind_registered_sponsor", label: "IND" },
  { key: "commute_time_min", label: "Commute", sortable: true },
  { key: "apply_url", label: "Apply" },
];

function formatSalary(j: Job) {
  if (!j.salary_min && !j.salary_max) return "—";
  const fmt = (n: number) => `${(n / 1000).toFixed(0)}k`;
  const c = j.salary_currency === "EUR" ? "€" : (j.salary_currency || "€");
  if (j.salary_min && j.salary_max) return `${c}${fmt(j.salary_min)}–${fmt(j.salary_max)}`;
  return `${c}${fmt(j.salary_min || j.salary_max!)}`;
}

function CellRenderer({ colKey, job }: { colKey: string; job: Job }) {
  switch (colKey) {
    case "match_score_overall":
      return <MatchScoreBadge score={job.match_score_overall} size="sm" />;
    case "work_mode":
      return <WorkModeBadge mode={job.work_mode as any} />;
    case "visa_likelihood":
      return <VisaBadge likelihood={job.visa_likelihood} />;
    case "ind_registered_sponsor":
      return (
        <span className={cn("text-xs font-medium", job.ind_registered_sponsor ? "text-score-high" : "text-muted-foreground")}>
          {job.ind_registered_sponsor ? "Yes" : "No"}
        </span>
      );
    case "apply_url":
      return job.apply_url ? (
        <a href={job.apply_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary hover:text-primary/80 transition-colors">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : <span className="text-muted-foreground">—</span>;
    case "commute_time_min":
      return job.commute_time_min != null ? (
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{job.commute_time_min}m</span>
      ) : <span className="text-muted-foreground">—</span>;
    case "salary_display":
      return <span className="font-mono">{formatSalary(job)}</span>;
    case "job_title":
      return <span className="max-w-[200px] truncate block font-medium">{job.job_title}</span>;
    case "company_name":
      return <span className="max-w-[150px] truncate block">{job.company_name}</span>;
    case "city":
      return <span className="max-w-[100px] truncate block">{job.city || "—"}</span>;
    case "date_posted":
      return <span className="text-muted-foreground">{job.date_posted || "—"}</span>;
    default:
      return <span className="text-muted-foreground">—</span>;
  }
}

function getSortValue(job: Job, key: string): string | number {
  switch (key) {
    case "match_score_overall": return job.match_score_overall;
    case "salary_display": return job.salary_max || job.salary_min || 0;
    case "commute_time_min": return job.commute_time_min ?? 9999;
    case "date_posted": return job.date_posted || "";
    case "job_title": return job.job_title;
    case "company_name": return job.company_name;
    case "city": return job.city || "";
    default: return "";
  }
}

export function ResultsTable({ jobs }: ResultsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("match_score_overall");
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sorted = [...jobs].sort((a, b) => {
    const av = getSortValue(a, sortKey);
    const bv = getSortValue(b, sortKey);
    if (av === bv) return 0;
    if (typeof av === "number" && typeof bv === "number") {
      return sortAsc ? av - bv : bv - av;
    }
    return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  const handleRowClick = (job: Job) => {
    setSelectedJob(job);
    setDrawerOpen(true);
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
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-auto scrollbar-thin">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-card z-10 border-b border-border shadow-sm">
            <tr className="text-muted-foreground font-medium uppercase tracking-wider">
              <th className="text-left px-3 py-2.5 w-8">#</th>
              {OVERVIEW_COLUMNS.map((col) => (
                <th key={col.key} className="text-left px-3 py-2.5">
                  {col.sortable ? (
                    <button onClick={() => handleSort(col.key)} className="flex items-center gap-1 hover:text-foreground transition-colors">
                      {col.label}
                      <ArrowUpDown className={cn("h-3 w-3", sortKey === col.key ? "text-primary" : "text-muted-foreground/50")} />
                    </button>
                  ) : col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((job, i) => (
              <tr
                key={job.job_id}
                onClick={() => handleRowClick(job)}
                className="border-b border-border/50 cursor-pointer transition-colors hover:bg-muted/30"
              >
                <td className="px-3 py-2.5 text-muted-foreground font-mono">{i + 1}</td>
                {OVERVIEW_COLUMNS.map((col) => (
                  <td key={col.key} className="px-3 py-2.5">
                    <CellRenderer colKey={col.key} job={job} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <JobDetailDrawer job={selectedJob} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
