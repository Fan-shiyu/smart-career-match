import { ColumnDef, Job } from "@/types/job";

const str = (v: any) => (v != null && v !== "" ? String(v) : "");
const arr = (v: any[]) => (v && v.length > 0 ? v.join("; ") : "");
const bool = (v: any) => (v === true ? "Yes" : v === false ? "No" : str(v));
const salary = (j: Job) => {
  if (!j.salary_min && !j.salary_max) return "";
  const c = j.salary_currency === "EUR" ? "€" : (j.salary_currency || "€");
  const fmt = (n: number) => `${(n / 1000).toFixed(0)}k`;
  if (j.salary_min && j.salary_max) return `${c}${fmt(j.salary_min)}–${fmt(j.salary_max)}`;
  return `${c}${fmt(j.salary_min || j.salary_max!)}`;
};

export const ALL_COLUMNS: ColumnDef[] = [
  // A) Identifiers
  { key: "job_id", label: "Job ID", category: "Identifiers", getValue: (j) => j.job_id },
  { key: "source", label: "Source", category: "Identifiers", getValue: (j) => j.source },
  { key: "source_job_id", label: "Source Job ID", category: "Identifiers", getValue: (j) => str(j.source_job_id) },
  { key: "job_url", label: "Job URL", category: "Identifiers", getValue: (j) => j.job_url },
  { key: "apply_url", label: "Apply URL", category: "Identifiers", getValue: (j) => j.apply_url },
  { key: "date_posted", label: "Date Posted", category: "Identifiers", getValue: (j) => j.date_posted },
  { key: "date_scraped", label: "Date Scraped", category: "Identifiers", getValue: (j) => str(j.date_scraped) },
  { key: "job_status", label: "Status", category: "Identifiers", getValue: (j) => str(j.job_status) },
  { key: "data_source_type", label: "Data Source", category: "Identifiers", getValue: (j) => str(j.data_source_type || "aggregator") },

  // B) Job Basics
  { key: "job_title", label: "Title", category: "Job Basics", getValue: (j) => j.job_title },
  { key: "job_title_normalized", label: "Title (Normalized)", category: "Job Basics", getValue: (j) => str(j.job_title_normalized) },
  { key: "seniority_level", label: "Seniority", category: "Job Basics", getValue: (j) => str(j.seniority_level) },
  { key: "employment_type", label: "Employment Type", category: "Job Basics", getValue: (j) => str(j.employment_type) },
  { key: "contract_type", label: "Contract Type", category: "Job Basics", getValue: (j) => str(j.contract_type) },
  { key: "work_mode", label: "Work Mode", category: "Job Basics", getValue: (j) => str(j.work_mode) },
  { key: "remote_region", label: "Remote Region", category: "Job Basics", getValue: (j) => str(j.remote_region) },
  { key: "hours_per_week_min", label: "Hours/Week Min", category: "Job Basics", getValue: (j) => str(j.hours_per_week_min) },
  { key: "hours_per_week_max", label: "Hours/Week Max", category: "Job Basics", getValue: (j) => str(j.hours_per_week_max) },
  { key: "department", label: "Department", category: "Job Basics", getValue: (j) => str(j.department) },

  // C) Location & Commute
  { key: "country", label: "Country", category: "Location", getValue: (j) => j.country },
  { key: "city", label: "City", category: "Location", getValue: (j) => str(j.city) },
  { key: "region_province", label: "Region/Province", category: "Location", getValue: (j) => str(j.region_province) },
  { key: "postal_code", label: "Postal Code", category: "Location", getValue: (j) => str(j.postal_code) },
  { key: "commute_distance_km", label: "Commute (km)", category: "Location", getValue: (j) => str(j.commute_distance_km) },
  { key: "commute_time_min", label: "Commute (min)", category: "Location", getValue: (j) => str(j.commute_time_min) },
  { key: "commute_time_text", label: "Commute Text", category: "Location", getValue: (j) => str(j.commute_time_text) },

  // D) Company
  { key: "company_name", label: "Company", category: "Company", getValue: (j) => j.company_name },
  { key: "company_name_normalized", label: "Company (Normalized)", category: "Company", getValue: (j) => str(j.company_name_normalized) },
  { key: "company_website", label: "Website", category: "Company", getValue: (j) => str(j.company_website) },
  { key: "industry", label: "Industry", category: "Company", getValue: (j) => str(j.industry) },
  { key: "company_size", label: "Company Size", category: "Company", getValue: (j) => str(j.company_size) },
  { key: "company_type", label: "Company Type", category: "Company", getValue: (j) => str(j.company_type) },

  // E) Compensation
  { key: "salary_display", label: "Salary", category: "Compensation", getValue: salary },
  { key: "salary_min", label: "Salary Min", category: "Compensation", getValue: (j) => str(j.salary_min) },
  { key: "salary_max", label: "Salary Max", category: "Compensation", getValue: (j) => str(j.salary_max) },
  { key: "salary_currency", label: "Currency", category: "Compensation", getValue: (j) => str(j.salary_currency) },
  { key: "salary_period", label: "Salary Period", category: "Compensation", getValue: (j) => str(j.salary_period) },
  { key: "salary_text_raw", label: "Salary (Raw)", category: "Compensation", getValue: (j) => str(j.salary_text_raw) },
  { key: "bonus_mentioned", label: "Bonus", category: "Compensation", getValue: (j) => str(j.bonus_mentioned) },
  { key: "equity_mentioned", label: "Equity", category: "Compensation", getValue: (j) => str(j.equity_mentioned) },

  // F) Language & Visa
  { key: "job_description_language", label: "JD Language", category: "Language & Visa", getValue: (j) => str(j.job_description_language) },
  { key: "required_languages", label: "Required Languages", category: "Language & Visa", getValue: (j) => arr(j.required_languages) },
  { key: "language_level", label: "Language Level", category: "Language & Visa", getValue: (j) => str(j.language_level) },
  { key: "visa_sponsorship_mentioned", label: "Visa Mentioned", category: "Language & Visa", getValue: (j) => j.visa_sponsorship_mentioned },
  { key: "ind_registered_sponsor", label: "IND Sponsor", category: "Language & Visa", getValue: (j) => bool(j.ind_registered_sponsor) },
  { key: "ind_match_method", label: "IND Match Method", category: "Language & Visa", getValue: (j) => str(j.ind_match_method) },
  { key: "ind_matched_name", label: "IND Matched Name", category: "Language & Visa", getValue: (j) => str(j.ind_matched_name) },
  { key: "visa_likelihood", label: "Visa Likelihood", category: "Language & Visa", getValue: (j) => str(j.visa_likelihood) },
  { key: "relocation_support_mentioned", label: "Relocation Support", category: "Language & Visa", getValue: (j) => str(j.relocation_support_mentioned) },

  // G) Requirements
  { key: "years_experience_min", label: "Years Exp Min", category: "Requirements", getValue: (j) => str(j.years_experience_min) },
  { key: "education_level", label: "Education", category: "Requirements", getValue: (j) => str(j.education_level) },
  { key: "degree_fields", label: "Degree Fields", category: "Requirements", getValue: (j) => arr(j.degree_fields) },
  { key: "certifications", label: "Certifications", category: "Requirements", getValue: (j) => arr(j.certifications) },

  // H) Skills
  { key: "hard_skills", label: "Hard Skills", category: "Skills", getValue: (j) => arr(j.hard_skills) },
  { key: "software_tools", label: "Software Tools", category: "Skills", getValue: (j) => arr(j.software_tools) },
  { key: "cloud_platforms", label: "Cloud Platforms", category: "Skills", getValue: (j) => arr(j.cloud_platforms) },
  { key: "ml_ds_methods", label: "ML/DS Methods", category: "Skills", getValue: (j) => arr(j.ml_ds_methods) },
  { key: "data_stack", label: "Data Stack", category: "Skills", getValue: (j) => arr(j.data_stack) },
  { key: "soft_skills", label: "Soft Skills", category: "Skills", getValue: (j) => arr(j.soft_skills) },
  { key: "nice_to_have_skills", label: "Nice-to-Have", category: "Skills", getValue: (j) => arr(j.nice_to_have_skills) },

  // I) Benefits
  { key: "pension", label: "Pension", category: "Benefits", getValue: (j) => str(j.pension) },
  { key: "health_insurance", label: "Health Insurance", category: "Benefits", getValue: (j) => str(j.health_insurance) },
  { key: "learning_budget", label: "Learning Budget", category: "Benefits", getValue: (j) => str(j.learning_budget) },
  { key: "learning_budget_amount", label: "Learning Budget €", category: "Benefits", getValue: (j) => str(j.learning_budget_amount) },
  { key: "transport_allowance", label: "Transport", category: "Benefits", getValue: (j) => str(j.transport_allowance) },
  { key: "car_lease", label: "Car Lease", category: "Benefits", getValue: (j) => str(j.car_lease) },
  { key: "home_office_budget", label: "Home Office Budget", category: "Benefits", getValue: (j) => str(j.home_office_budget) },
  { key: "gym_wellbeing", label: "Gym/Wellbeing", category: "Benefits", getValue: (j) => str(j.gym_wellbeing) },
  { key: "extra_holidays", label: "Extra Holidays", category: "Benefits", getValue: (j) => str(j.extra_holidays) },
  { key: "parental_leave", label: "Parental Leave", category: "Benefits", getValue: (j) => str(j.parental_leave) },

  // J) Matching
  { key: "match_score_overall", label: "Match Score", category: "Matching", getValue: (j) => str(j.match_score_overall) },
  { key: "match_score_hard_skills", label: "Skills Score", category: "Matching", getValue: (j) => str(j.match_score_breakdown.hard_skills) },
  { key: "match_score_tools", label: "Tools Score", category: "Matching", getValue: (j) => str(j.match_score_breakdown.tools) },
  { key: "match_score_seniority", label: "Seniority Score", category: "Matching", getValue: (j) => str(j.match_score_breakdown.seniority) },
  { key: "match_score_experience", label: "Experience Score", category: "Matching", getValue: (j) => str(j.match_score_breakdown.experience) },
  { key: "match_score_language", label: "Language Score", category: "Matching", getValue: (j) => str(j.match_score_breakdown.language) },
  { key: "matched_skills", label: "Matched Skills", category: "Matching", getValue: (j) => arr(j.matched_skills) },
  { key: "missing_skills", label: "Missing Skills", category: "Matching", getValue: (j) => arr(j.missing_skills) },
  { key: "must_have_missing_count", label: "Must-Have Missing", category: "Matching", getValue: (j) => str(j.must_have_missing_count) },
  { key: "match_explanation", label: "Match Explanation", category: "Matching", getValue: (j) => str(j.match_explanation) },

  // L) Raw Text
  { key: "job_description_raw", label: "Job Description", category: "Raw Text", getValue: (j) => j.job_description_raw },
  { key: "requirements_raw", label: "Requirements", category: "Raw Text", getValue: (j) => str(j.requirements_raw) },
  { key: "company_description_raw", label: "Company Description", category: "Raw Text", getValue: (j) => str(j.company_description_raw) },
];

// Table view presets
export const TABLE_PRESETS: Record<string, string[]> = {
  quick: [
    "match_score_overall", "job_title", "company_name", "city", "work_mode",
    "salary_display", "visa_likelihood", "data_source_type", "date_posted", "apply_url",
  ],
  detailed: [
    "match_score_overall", "job_title", "company_name", "city", "work_mode",
    "seniority_level", "employment_type", "salary_display",
    "visa_likelihood", "ind_registered_sponsor", "commute_time_min",
    "hard_skills", "missing_skills", "date_posted", "source", "apply_url",
  ],
  visa: [
    "match_score_overall", "job_title", "company_name", "city",
    "visa_likelihood", "ind_registered_sponsor", "visa_sponsorship_mentioned",
    "relocation_support_mentioned", "required_languages",
    "salary_display", "date_posted", "apply_url",
  ],
  "skill-gap": [
    "match_score_overall", "job_title", "company_name",
    "hard_skills", "software_tools", "matched_skills", "missing_skills",
    "match_score_hard_skills", "match_score_tools",
    "nice_to_have_skills", "apply_url",
  ],
};

// Export presets
export const EXPORT_PRESETS: Record<string, string[]> = {
  quick: [
    "job_title", "company_name", "city", "salary_display",
    "match_score_overall", "visa_likelihood", "commute_time_min", "apply_url",
  ],
  detailed: ALL_COLUMNS
    .filter((c) => c.category !== "Raw Text")
    .map((c) => c.key),
  full: ALL_COLUMNS.map((c) => c.key),
  visa: [
    "job_title", "company_name", "city", "country",
    "visa_likelihood", "ind_registered_sponsor", "visa_sponsorship_mentioned",
    "relocation_support_mentioned", "required_languages", "language_level",
    "salary_display", "match_score_overall", "apply_url",
  ],
  "skill-gap": [
    "job_title", "company_name", "hard_skills", "software_tools",
    "cloud_platforms", "ml_ds_methods", "data_stack",
    "matched_skills", "missing_skills", "nice_to_have_skills",
    "match_score_overall", "match_score_hard_skills", "match_score_tools",
    "match_score_seniority", "match_score_experience", "match_score_language",
  ],
};
