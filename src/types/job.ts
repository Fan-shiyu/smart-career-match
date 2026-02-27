// ── Full Unified Job Schema ──

export interface Job {
  // A) Identifiers & Links
  job_id: string;
  source: string;
  source_job_id: string | null;
  job_url: string;
  apply_url: string;
  data_source_type: "aggregator" | "company_direct" | string;
  date_posted: string;
  date_scraped: string | null;
  job_status: string | null;

  // B) Job Basics
  job_title: string;
  job_title_normalized: string | null;
  seniority_level: string | null;
  employment_type: string | null;
  contract_type: string | null;
  work_mode: "On-site" | "Hybrid" | "Remote" | string | null;
  remote_region: string | null;
  hours_per_week_min: number | null;
  hours_per_week_max: number | null;
  department: string | null;

  // C) Location & Commute
  country: string;
  city: string | null;
  region_province: string | null;
  postal_code: string | null;
  work_address_raw: string | null;
  work_lat: number | null;
  work_lng: number | null;
  commute_mode: string | null;
  commute_distance_km: number | null;
  commute_time_min: number | null;
  commute_time_text: string | null;

  // D) Company
  company_name: string;
  company_name_normalized: string | null;
  company_website: string | null;
  company_linkedin_url: string | null;
  industry: string | null;
  company_size: string | null;
  company_type: string | null;

  // E) Compensation
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  salary_period: string | null;
  salary_text_raw: string | null;
  bonus_mentioned: string | null;
  equity_mentioned: string | null;

  // F) Language & Visa
  job_description_language: string | null;
  required_languages: string[];
  language_level: string | null;
  visa_sponsorship_mentioned: "yes" | "no" | "unclear";
  ind_registered_sponsor: boolean;
  ind_match_method: string | null;
  ind_matched_name: string | null;
  visa_likelihood: "High" | "Medium" | "Low" | null;
  relocation_support_mentioned: string | null;

  // Status fields
  enrichment_status: string | null;
  match_status: string | null;

  // G) Requirements
  years_experience_min: number | null;
  education_level: string | null;
  degree_fields: string[];
  certifications: string[];

  // H) Skills
  hard_skills: string[];
  software_tools: string[];
  cloud_platforms: string[];
  ml_ds_methods: string[];
  data_stack: string[];
  soft_skills: string[];
  nice_to_have_skills: string[];

  // I) Benefits
  pension: string | null;
  health_insurance: string | null;
  learning_budget: string | null;
  learning_budget_amount: string | null;
  transport_allowance: string | null;
  car_lease: string | null;
  home_office_budget: string | null;
  gym_wellbeing: string | null;
  extra_holidays: string | null;
  parental_leave: string | null;
  benefits_text_raw: string | null;

  // J) Matching
  match_score_overall: number;
  match_score_breakdown: MatchBreakdown;
  matched_skills: string[];
  missing_skills: string[];
  must_have_missing_count: number;
  match_explanation: string | null;

  // K) AI Writing Helpers (placeholder)
  cv_improvement_suggestions: string | null;
  suggested_cv_keywords: string[];
  cover_letter_angle: string | null;
  interview_topics_to_prepare: string[];

  // L) Raw Text
  job_description_raw: string;
  requirements_raw: string | null;
  company_description_raw: string | null;
}

export interface MatchBreakdown {
  hard_skills: number;
  tools: number;
  seniority: number;
  experience: number;
  language: number;
}

export interface CandidateProfile {
  hard_skills: string[];
  software_tools: string[];
  years_experience: number;
  education_level: string;
  languages: string[];
  seniority: string;
}

export interface SearchFilters {
  keywords: string;
  country: string;
  city: string;
  radius: number;
  workModes: string[];
  employmentTypes: string[];
  postedWithin: string;
  yearsExperience: number;
  seniorityLevels: string[];
  languages: string[];
  visaRequired: boolean;
  indSponsorOnly: boolean;
  minSalary: number;
  commuteOrigin: string;
  maxCommuteTime: number;
  commuteMode: string;
  matchThreshold: number;
  strictMode: boolean;
  topN: number;
  dataSourceFilter: "all" | "aggregator" | "company_direct";
}

export type ExportPreset = "quick" | "detailed" | "full" | "visa" | "skill-gap" | "custom";

// Column definition for table presets and custom export
export interface ColumnDef {
  key: string;
  label: string;
  category: string;
  getValue: (j: Job) => string;
}

export type TablePreset = "quick" | "detailed" | "visa" | "skill-gap" | "custom";
