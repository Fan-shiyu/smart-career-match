export interface Job {
  job_id: string;
  source: "adzuna" | "greenhouse" | "lever";
  job_url: string;
  apply_url: string;
  date_posted: string;
  job_title: string;
  seniority_level: string | null;
  employment_type: string | null;
  work_mode: "On-site" | "Hybrid" | "Remote" | null;
  country: string;
  city: string | null;
  company_name: string;
  industry: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  job_description_raw: string;
  // AI enriched
  hard_skills: string[];
  software_tools: string[];
  soft_skills: string[];
  years_experience_min: number | null;
  education_level: string | null;
  required_languages: string[];
  visa_sponsorship_mentioned: "yes" | "no" | "unclear";
  matched_skills: string[];
  missing_skills: string[];
  match_score_overall: number;
  match_score_breakdown: MatchBreakdown;
  visa_likelihood: "High" | "Medium" | "Low" | null;
  commute_distance_km: number | null;
  commute_time_min: number | null;
  ind_registered_sponsor: boolean;
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
  workMode: string;
  employmentType: string;
  postedWithin: string;
  yearsExperience: number;
  seniorityLevel: string;
  languages: string[];
  visaRequired: boolean;
  indSponsorOnly: boolean;
  minSalary: number;
  commuteOrigin: string;
  maxCommuteTime: number;
  commuteMode: string;
  matchThreshold: number;
  strictMode: boolean;
}

export type ExportPreset = "quick" | "detailed" | "skill-gap" | "custom";
