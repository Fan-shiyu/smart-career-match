import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExportPreset, Job } from "@/types/job";
import { useState } from "react";

interface ExportPanelProps {
  jobs: Job[];
}

export function ExportPanel({ jobs }: ExportPanelProps) {
  const [preset, setPreset] = useState<ExportPreset>("quick");

  const handleExport = () => {
    // Build CSV based on preset
    let headers: string[];
    let getData: (j: Job) => string[];

    switch (preset) {
      case "quick":
        headers = ["Title", "Company", "City", "Salary", "Match Score", "Visa Likelihood", "Commute (min)", "Apply URL"];
        getData = (j) => [
          j.job_title, j.company_name, j.city || "", 
          j.salary_min && j.salary_max ? `${j.salary_min}-${j.salary_max} ${j.salary_currency}` : "",
          String(j.match_score_overall), j.visa_likelihood || "", 
          j.commute_time_min != null ? String(j.commute_time_min) : "", j.apply_url
        ];
        break;
      case "detailed":
        headers = [
          "Title", "Company", "City", "Country", "Work Mode", "Employment Type", "Seniority",
          "Salary Min", "Salary Max", "Currency",
          "Hard Skills", "Software Tools", "Soft Skills",
          "Years Exp Min", "Education Level", "Required Languages",
          "Visa Mentioned", "IND Sponsor", "Visa Likelihood",
          "Matched Skills", "Missing Skills",
          "Match Score", "Skills Score", "Tools Score", "Seniority Score", "Experience Score", "Language Score",
          "Commute (km)", "Commute (min)",
          "Source", "Posted", "Job URL", "Apply URL"
        ];
        getData = (j) => [
          j.job_title, j.company_name, j.city || "", j.country, j.work_mode || "", j.employment_type || "", j.seniority_level || "",
          j.salary_min != null ? String(j.salary_min) : "", j.salary_max != null ? String(j.salary_max) : "", j.salary_currency || "",
          j.hard_skills.join("; "), j.software_tools.join("; "), j.soft_skills.join("; "),
          j.years_experience_min != null ? String(j.years_experience_min) : "", j.education_level || "", j.required_languages.join("; "),
          j.visa_sponsorship_mentioned, j.ind_registered_sponsor ? "Yes" : "No", j.visa_likelihood || "",
          j.matched_skills.join("; "), j.missing_skills.join("; "),
          String(j.match_score_overall),
          String(j.match_score_breakdown.hard_skills), String(j.match_score_breakdown.tools),
          String(j.match_score_breakdown.seniority), String(j.match_score_breakdown.experience), String(j.match_score_breakdown.language),
          j.commute_distance_km != null ? String(j.commute_distance_km) : "", j.commute_time_min != null ? String(j.commute_time_min) : "",
          j.source, j.date_posted, j.job_url, j.apply_url
        ];
        break;
      case "skill-gap":
        headers = ["Title", "Company", "Hard Skills", "Software Tools", "Matched Skills", "Missing Skills", "Match Score", "Skills Score", "Tools Score", "Seniority Score", "Experience Score", "Language Score"];
        getData = (j) => [
          j.job_title, j.company_name, j.hard_skills.join("; "), j.software_tools.join("; "),
          j.matched_skills.join("; "), j.missing_skills.join("; "),
          String(j.match_score_overall),
          String(j.match_score_breakdown.hard_skills), String(j.match_score_breakdown.tools),
          String(j.match_score_breakdown.seniority), String(j.match_score_breakdown.experience), String(j.match_score_breakdown.language)
        ];
        break;
      default:
        headers = ["Title", "Company", "Match Score", "Apply URL"];
        getData = (j) => [j.job_title, j.company_name, String(j.match_score_overall), j.apply_url];
    }

    const csvContent = [
      headers.join(","),
      ...jobs.map(j => getData(j).map(v => `"${v.replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `job-intelligence-${preset}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={preset} onValueChange={(v) => setPreset(v as ExportPreset)}>
        <SelectTrigger className="h-8 text-xs w-[160px] bg-card border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="quick">Quick Overview</SelectItem>
          <SelectItem value="detailed">Detailed Analysis</SelectItem>
          <SelectItem value="skill-gap">Skill Gap Focus</SelectItem>
          <SelectItem value="custom">Custom</SelectItem>
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" onClick={handleExport} className="h-8 text-xs gap-1.5">
        <Download className="h-3.5 w-3.5" />
        Export CSV
      </Button>
    </div>
  );
}
