import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Company name normalization (shared between IND + jobs) ──
const LEGAL_SUFFIXES = /\b(b\.?v\.?|n\.?v\.?|ltd\.?|inc\.?|gmbh|ag|s\.?a\.?|plc|llc|co\.?|corp\.?|holding|group|international|netherlands|nederland)\b/gi;

function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(LEGAL_SUFFIXES, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Fuzzy token similarity ──
function tokenSimilarity(a: string, b: string): number {
  const tokensA = new Set(a.split(" ").filter(t => t.length > 1));
  const tokensB = new Set(b.split(" ").filter(t => t.length > 1));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let intersection = 0;
  for (const t of tokensA) if (tokensB.has(t)) intersection++;
  return (2 * intersection) / (tokensA.size + tokensB.size);
}

// ── IND sponsor matching with exact + fuzzy ──
function matchIndSponsor(
  companyNormalized: string,
  sponsorNormalizedSet: Set<string>,
  sponsorNormalizedList: string[],
  sponsorRawMap: Map<string, string>,
): { isMatch: boolean; method: string; matchedName: string | null } {
  // 1. Exact match
  if (sponsorNormalizedSet.has(companyNormalized)) {
    return { isMatch: true, method: "exact", matchedName: sponsorRawMap.get(companyNormalized) || companyNormalized };
  }
  
  // 2. Prefix/contains match (e.g. "adyen" matches "adyen netherlands")
  for (const sponsor of sponsorNormalizedList) {
    if (sponsor.startsWith(companyNormalized) || companyNormalized.startsWith(sponsor)) {
      return { isMatch: true, method: "prefix", matchedName: sponsorRawMap.get(sponsor) || sponsor };
    }
  }
  
  // 3. Fuzzy token match (threshold >= 0.80)
  let bestScore = 0;
  let bestSponsor = "";
  for (const sponsor of sponsorNormalizedList) {
    const score = tokenSimilarity(companyNormalized, sponsor);
    if (score > bestScore) {
      bestScore = score;
      bestSponsor = sponsor;
    }
  }
  if (bestScore >= 0.80) {
    return { isMatch: true, method: "fuzzy", matchedName: sponsorRawMap.get(bestSponsor) || bestSponsor };
  }
  
  return { isMatch: false, method: "none", matchedName: null };
}

interface SearchParams {
  keywords: string;
  country: string;
  city: string;
  workModes: string[];
  employmentTypes: string[];
  minSalary: number;
  postedWithin: string;
  candidateProfile?: {
    hard_skills: string[];
    software_tools: string[];
    years_experience: number;
    education_level: string;
    languages: string[];
    seniority: string;
  };
  matchThreshold: number;
  strictMode: boolean;
  indSponsorOnly: boolean;
  topN: number;
  dataSourceFilter?: "all" | "aggregator" | "company_direct";
  commuteOrigin?: string;
  commuteMode?: string;
  maxCommuteTime?: number;
}

// ── Adzuna fetcher ──
async function fetchAdzuna(params: SearchParams): Promise<any[]> {
  const ADZUNA_APP_ID = Deno.env.get("ADZUNA_APP_ID");
  const ADZUNA_APP_KEY = Deno.env.get("ADZUNA_APP_KEY");
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) return [];
  const url = new URL("https://api.adzuna.com/v1/api/jobs/nl/search/1");
  url.searchParams.set("app_id", ADZUNA_APP_ID);
  url.searchParams.set("app_key", ADZUNA_APP_KEY);
  url.searchParams.set("results_per_page", "50");
  url.searchParams.set("content-type", "application/json");
  if (params.keywords) url.searchParams.set("what", params.keywords);
  if (params.city) url.searchParams.set("where", params.city);
  if (params.minSalary > 0) url.searchParams.set("salary_min", String(params.minSalary));
  if (params.postedWithin === "24h") url.searchParams.set("max_days_old", "1");
  else if (params.postedWithin === "7d") url.searchParams.set("max_days_old", "7");
  else if (params.postedWithin === "30d") url.searchParams.set("max_days_old", "30");
  console.log("Fetching Adzuna...");
  try {
    const resp = await fetch(url.toString());
    if (!resp.ok) { console.error("Adzuna error:", resp.status); return []; }
    const data = await resp.json();
    return (data.results || []).map((j: any) => ({
      job_id: `adz-${j.id}`,
      source: "adzuna",
      source_job_id: String(j.id),
      job_url: j.redirect_url || "",
      apply_url: j.redirect_url || "",
      date_posted: j.created?.split("T")[0] || "",
      job_title: j.title?.replace(/<[^>]*>/g, "") || "Unknown",
      country: "Netherlands",
      city: j.location?.display_name?.split(",")[0]?.trim() || null,
      company_name: j.company?.display_name || "Unknown",
      industry: j.category?.label || null,
      salary_min: j.salary_min ? Math.round(j.salary_min) : null,
      salary_max: j.salary_max ? Math.round(j.salary_max) : null,
      salary_currency: "EUR",
      job_description_raw: j.description?.replace(/<[^>]*>/g, "") || "",
      salary_text_raw: j.salary_min ? `${j.salary_min}-${j.salary_max}` : null,
      work_lat: j.latitude || null,
      work_lng: j.longitude || null,
    }));
  } catch (e) { console.error("Adzuna fetch error:", e); return []; }
}

// ── Arbeitnow fetcher ──
async function fetchArbeitnow(params: SearchParams): Promise<any[]> {
  const url = new URL("https://www.arbeitnow.com/api/job-board-api");
  console.log("Fetching Arbeitnow...");
  try {
    const resp = await fetch(url.toString());
    if (!resp.ok) { console.error("Arbeitnow error:", resp.status); return []; }
    const data = await resp.json();
    const kw = (params.keywords || "").toLowerCase();
    let jobs = data.data || [];
    jobs = jobs.filter((j: any) => {
      const loc = (j.location || "").toLowerCase();
      return loc.includes("netherlands") || loc.includes("nederland") ||
        loc.includes("amsterdam") || loc.includes("rotterdam") ||
        loc.includes("den haag") || loc.includes("the hague") ||
        loc.includes("utrecht") || loc.includes("eindhoven") ||
        loc.includes("tilburg") || loc.includes("groningen") ||
        loc.includes("leiden") || loc.includes("delft") ||
        loc.includes("breda") || loc.includes("arnhem") ||
        loc.includes("maastricht") || loc.includes("haarlem") ||
        loc.includes("almere") || loc.includes("nijmegen");
    });
    if (kw) {
      jobs = jobs.filter((j: any) =>
        (j.title || "").toLowerCase().includes(kw) ||
        (j.description || "").toLowerCase().includes(kw) ||
        (j.company_name || "").toLowerCase().includes(kw) ||
        (j.tags || []).some((t: string) => t.toLowerCase().includes(kw))
      );
    }
    return jobs.slice(0, 30).map((j: any) => ({
      job_id: `arb-${j.slug || j.url?.split("/").pop() || Math.random().toString(36).slice(2)}`,
      source: "arbeitnow",
      source_job_id: j.slug || null,
      job_url: j.url || "",
      apply_url: j.url || "",
      date_posted: j.created_at ? new Date(j.created_at * 1000).toISOString().split("T")[0] : "",
      job_title: j.title || "Unknown",
      employment_type: j.job_types?.includes("full_time") ? "Full-time" : j.job_types?.includes("part_time") ? "Part-time" : null,
      work_mode: j.remote ? "Remote" : null,
      country: "Netherlands",
      city: (j.location || "").split(",")[0]?.trim() || null,
      company_name: j.company_name || "Unknown",
      salary_currency: "EUR",
      job_description_raw: (j.description || "").replace(/<[^>]*>/g, "").substring(0, 2000),
    }));
  } catch (e) { console.error("Arbeitnow fetch error:", e); return []; }
}

// ── Greenhouse fetcher ──
const GREENHOUSE_BOARDS = [
  "booking", "adyen", "elastic", "messagebird", "mollie",
  "takeaway", "picnic", "bunq", "coolblue", "rituals",
  "tomtom", "leaseweb", "backbase", "lightspeedhq", "wetransfer",
  "mymedia", "catawiki", "sendcloud", "sytac", "yoursurprise",
  "viber", "happeo", "polarsteps", "meatable", "abn",
  "studocu", "fabric", "optiver", "flowtraders", "imctrading",
];

async function fetchGreenhouse(params: SearchParams): Promise<any[]> {
  const kw = (params.keywords || "").toLowerCase();
  const allJobs: any[] = [];
  const fetchBoard = async (board: string) => {
    try {
      const resp = await fetch(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`);
      if (!resp.ok) return [];
      const data = await resp.json();
      return (data.jobs || [])
        .filter((j: any) => {
          const loc = (j.location?.name || "").toLowerCase();
          const isNL = loc.includes("netherlands") || loc.includes("amsterdam") ||
            loc.includes("rotterdam") || loc.includes("utrecht") ||
            loc.includes("den haag") || loc.includes("the hague") ||
            loc.includes("eindhoven") || loc.includes("tilburg");
          if (!isNL) return false;
          if (kw) return (j.title || "").toLowerCase().includes(kw) || (j.content || "").toLowerCase().includes(kw);
          return true;
        })
        .slice(0, 10)
        .map((j: any) => ({
          job_id: `gh-${j.id}`,
          source: "greenhouse",
          source_job_id: String(j.id),
          job_url: j.absolute_url || "",
          apply_url: j.absolute_url || "",
          date_posted: j.updated_at?.split("T")[0] || "",
          job_title: j.title || "Unknown",
          country: "Netherlands",
          city: (j.location?.name || "").split(",")[0]?.trim() || null,
          company_name: board.charAt(0).toUpperCase() + board.slice(1),
          job_description_raw: (j.content || "").replace(/<[^>]*>/g, "").substring(0, 2000),
          department: j.departments?.[0]?.name || null,
        }));
    } catch { return []; }
  };
  console.log("Fetching Greenhouse boards...");
  const results = await Promise.allSettled(GREENHOUSE_BOARDS.map(fetchBoard));
  for (const r of results) if (r.status === "fulfilled") allJobs.push(...r.value);
  return allJobs;
}

// ── Lever fetcher ──
const LEVER_BOARDS = [
  "trivago", "gorillas", "hellofresh", "miro",
  "personio", "contentful", "spendesk", "bynder",
  "talentio", "framer",
];

async function fetchLever(params: SearchParams): Promise<any[]> {
  const kw = (params.keywords || "").toLowerCase();
  const allJobs: any[] = [];
  const fetchBoard = async (board: string) => {
    try {
      const resp = await fetch(`https://api.lever.co/v0/postings/${board}?mode=json`);
      if (!resp.ok) return [];
      const jobs = await resp.json();
      return (jobs || [])
        .filter((j: any) => {
          const loc = (j.categories?.location || "").toLowerCase();
          const isNL = loc.includes("netherlands") || loc.includes("amsterdam") ||
            loc.includes("rotterdam") || loc.includes("utrecht") ||
            loc.includes("den haag") || loc.includes("the hague") ||
            loc.includes("eindhoven");
          if (!isNL) return false;
          if (kw) return (j.text || "").toLowerCase().includes(kw) || (j.descriptionPlain || "").toLowerCase().includes(kw);
          return true;
        })
        .slice(0, 10)
        .map((j: any) => ({
          job_id: `lv-${j.id}`,
          source: "lever",
          source_job_id: j.id,
          job_url: j.hostedUrl || "",
          apply_url: j.applyUrl || j.hostedUrl || "",
          date_posted: j.createdAt ? new Date(j.createdAt).toISOString().split("T")[0] : "",
          job_title: j.text || "Unknown",
          employment_type: j.categories?.commitment || null,
          work_mode: j.workplaceType === "remote" ? "Remote" : j.workplaceType === "onSite" ? "On-site" : j.workplaceType === "hybrid" ? "Hybrid" : null,
          country: "Netherlands",
          city: (j.categories?.location || "").split(",")[0]?.split("-")[0]?.trim() || null,
          company_name: board.charAt(0).toUpperCase() + board.slice(1),
          department: j.categories?.department || null,
          job_description_raw: (j.descriptionPlain || "").substring(0, 2000),
        }));
    } catch { return []; }
  };
  console.log("Fetching Lever boards...");
  const results = await Promise.allSettled(LEVER_BOARDS.map(fetchBoard));
  for (const r of results) if (r.status === "fulfilled") allJobs.push(...r.value);
  return allJobs;
}

// ── SmartRecruiters fetcher ──
const SMARTRECRUITERS_COMPANIES = [
  "Shell", "Unilever", "Philips", "ING", "KPMG",
  "Deloitte", "Heineken", "AkzoNobel", "ASML", "NXPSemiconductors",
  "Wolters-Kluwer", "Randstad", "Aegon", "NN-Group",
];

async function fetchSmartRecruiters(params: SearchParams): Promise<any[]> {
  const kw = (params.keywords || "").toLowerCase();
  const allJobs: any[] = [];
  const fetchCompany = async (company: string) => {
    try {
      const url = `https://api.smartrecruiters.com/v1/companies/${company}/postings?limit=100`;
      const resp = await fetch(url);
      if (!resp.ok) return [];
      const data = await resp.json();
      return (data.content || [])
        .filter((j: any) => {
          const loc = (j.location?.city || "").toLowerCase() + " " + (j.location?.country || "").toLowerCase();
          const isNL = loc.includes("netherlands") || loc.includes("nederland") ||
            loc.includes("amsterdam") || loc.includes("rotterdam") ||
            loc.includes("utrecht") || loc.includes("den haag") || loc.includes("the hague") ||
            loc.includes("eindhoven") || loc.includes("tilburg") || loc.includes("delft") ||
            loc.includes("leiden") || loc.includes("arnhem") || loc.includes("veldhoven");
          if (!isNL) return false;
          if (kw) return (j.name || "").toLowerCase().includes(kw) || (j.jobAd?.sections?.jobDescription?.text || "").toLowerCase().includes(kw);
          return true;
        })
        .slice(0, 15)
        .map((j: any) => ({
          job_id: `sr-${j.id || j.uuid}`,
          source: "smartrecruiters",
          source_job_id: j.id || j.uuid,
          job_url: j.ref || j.company?.websiteUrl || "",
          apply_url: j.ref || "",
          date_posted: j.releasedDate?.split("T")[0] || "",
          job_title: j.name || "Unknown",
          seniority_level: j.experienceLevel?.name || null,
          employment_type: j.typeOfEmployment?.name || null,
          country: "Netherlands",
          city: j.location?.city || null,
          region_province: j.location?.region || null,
          company_name: j.company?.name || company,
          industry: j.industry?.name || null,
          department: j.department?.label || null,
          job_description_raw: (j.jobAd?.sections?.jobDescription?.text || "").replace(/<[^>]*>/g, "").substring(0, 2000),
        }));
    } catch { return []; }
  };
  console.log("Fetching SmartRecruiters companies...");
  const results = await Promise.allSettled(SMARTRECRUITERS_COMPANIES.map(fetchCompany));
  for (const r of results) if (r.status === "fulfilled") allJobs.push(...r.value);
  return allJobs;
}

// ── Commute calculation via Google Distance Matrix ──
async function computeCommute(
  jobs: any[],
  origin: string,
  mode: string,
): Promise<void> {
  const GOOGLE_MAPS_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!GOOGLE_MAPS_KEY || !origin) return;
  
  // Filter jobs with city info for commute
  const jobsWithLocation = jobs.filter(j => j.city);
  if (jobsWithLocation.length === 0) return;
  
  // Google Distance Matrix supports max 25 destinations per call
  const batchSize = 25;
  for (let i = 0; i < jobsWithLocation.length; i += batchSize) {
    const batch = jobsWithLocation.slice(i, i + batchSize);
    const destinations = batch.map(j => {
      if (j.work_lat && j.work_lng) return `${j.work_lat},${j.work_lng}`;
      return `${j.city}, Netherlands`;
    }).join("|");
    
    try {
      const travelMode = mode === "bicycling" ? "bicycling" : mode === "transit" ? "transit" : "driving";
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin + ", Netherlands")}&destinations=${encodeURIComponent(destinations)}&mode=${travelMode}&key=${GOOGLE_MAPS_KEY}`;
      
      const resp = await fetch(url);
      if (!resp.ok) { console.error("Google Maps error:", resp.status); continue; }
      const data = await resp.json();
      
      if (data.rows?.[0]?.elements) {
        data.rows[0].elements.forEach((el: any, idx: number) => {
          if (el.status === "OK") {
            batch[idx].commute_distance_km = Math.round((el.distance?.value || 0) / 1000 * 10) / 10;
            batch[idx].commute_time_min = Math.round((el.duration?.value || 0) / 60);
            batch[idx].commute_time_text = el.duration?.text || null;
            batch[idx].commute_mode = travelMode;
          }
        });
      }
    } catch (e) {
      console.error("Commute calculation error:", e);
    }
  }
}

// ── Enrichment + Matching ──
function enrichAndMatch(
  normalizedJobs: any[],
  enrichedMap: Record<string, any>,
  sponsorNormalizedSet: Set<string>,
  sponsorNormalizedList: string[],
  sponsorRawMap: Map<string, string>,
  profile: SearchParams["candidateProfile"],
  strictMode: boolean,
) {
  return normalizedJobs.map((job: any) => {
    const enriched = enrichedMap[job.job_id] || {};
    const companyNormalized = normalizeCompanyName(job.company_name);
    
    // IND sponsor matching with debug fields
    const indMatch = matchIndSponsor(companyNormalized, sponsorNormalizedSet, sponsorNormalizedList, sponsorRawMap);
    const isIndSponsor = indMatch.isMatch;
    
    const visaMentioned = enriched.visa_sponsorship_mentioned || "unclear";
    const requiredLangs = enriched.required_languages || [];
    const hasEnglish = requiredLangs.some((l: string) => l.toLowerCase() === "english");

    let visaLikelihood: string | null = null;
    if (isIndSponsor && (visaMentioned === "yes" || hasEnglish)) visaLikelihood = "High";
    else if (isIndSponsor) visaLikelihood = "Medium";
    else if (visaMentioned === "yes") visaLikelihood = "Medium";
    else visaLikelihood = "Low";

    let matchScore = 0;
    let matchBreakdown = { hard_skills: 0, tools: 0, seniority: 0, experience: 0, language: 0 };
    let matchedSkills: string[] = [];
    let missingSkills: string[] = [];

    const jobSkills = (enriched.hard_skills || []).map((s: string) => s.toLowerCase());
    const jobTools = (enriched.software_tools || []).map((s: string) => s.toLowerCase());

    if (profile) {
      const candidateSkills = profile.hard_skills.map((s) => s.toLowerCase());
      const candidateTools = profile.software_tools.map((s) => s.toLowerCase());
      matchedSkills = jobSkills.filter((s: string) => candidateSkills.includes(s));
      missingSkills = jobSkills.filter((s: string) => !candidateSkills.includes(s));
      const skillScore = jobSkills.length > 0 ? (matchedSkills.length / jobSkills.length) * 100 : 50;
      const matchedTools = jobTools.filter((t: string) => candidateTools.includes(t));
      const toolScore = jobTools.length > 0 ? (matchedTools.length / jobTools.length) * 100 : 50;
      const seniorityLevels = ["junior", "mid", "senior", "lead", "manager"];
      const jobSenIdx = seniorityLevels.indexOf((enriched.seniority_level || "").toLowerCase());
      const candSenIdx = seniorityLevels.indexOf(profile.seniority.toLowerCase());
      const seniorityScore = jobSenIdx >= 0 && candSenIdx >= 0
        ? Math.max(0, 100 - Math.abs(jobSenIdx - candSenIdx) * 25) : 50;
      const jobExpMin = enriched.years_experience_min || 0;
      const expDiff = profile.years_experience - jobExpMin;
      const expScore = expDiff >= 0 ? 100 : Math.max(0, 100 + expDiff * 20);
      const candidateLangs = profile.languages.map((l) => l.toLowerCase());
      const langMatch = requiredLangs.filter((l: string) => candidateLangs.includes(l.toLowerCase()));
      const langScore = requiredLangs.length > 0 ? (langMatch.length / requiredLangs.length) * 100 : 100;
      matchBreakdown = {
        hard_skills: Math.round(skillScore),
        tools: Math.round(toolScore),
        seniority: Math.round(seniorityScore),
        experience: Math.round(expScore),
        language: Math.round(langScore),
      };
      matchScore = Math.round(skillScore * 0.4 + toolScore * 0.2 + seniorityScore * 0.15 + expScore * 0.15 + langScore * 0.1);
      if (strictMode && missingSkills.length > 0) {
        matchScore = Math.max(0, matchScore - missingSkills.length * 10);
      }
      matchedSkills = (enriched.hard_skills || []).filter((s: string) => candidateSkills.includes(s.toLowerCase()));
      missingSkills = (enriched.hard_skills || []).filter((s: string) => !candidateSkills.includes(s.toLowerCase()));
    }

    // Determine enrichment status
    const hasEnrichment = Object.keys(enriched).length > 1;

    return {
      // A) Identifiers
      job_id: job.job_id,
      source: job.source,
      source_job_id: job.source_job_id || null,
      job_url: job.job_url,
      apply_url: job.apply_url,
      date_posted: job.date_posted,
      date_scraped: new Date().toISOString(),
      job_status: "active",
      data_source_type: job.data_source_type || "aggregator",
      // B) Job Basics
      job_title: job.job_title,
      job_title_normalized: job.job_title.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim(),
      seniority_level: enriched.seniority_level || job.seniority_level || null,
      employment_type: enriched.employment_type || job.employment_type || null,
      contract_type: enriched.contract_type || null,
      work_mode: enriched.work_mode || job.work_mode || null,
      remote_region: enriched.remote_region || null,
      hours_per_week_min: enriched.hours_per_week_min || null,
      hours_per_week_max: enriched.hours_per_week_max || null,
      department: job.department || enriched.department || null,
      // C) Location
      country: job.country || "Netherlands",
      city: job.city || null,
      region_province: job.region_province || null,
      postal_code: null,
      work_address_raw: null,
      work_lat: job.work_lat || null,
      work_lng: job.work_lng || null,
      commute_mode: job.commute_mode || null,
      commute_distance_km: job.commute_distance_km || null,
      commute_time_min: job.commute_time_min || null,
      commute_time_text: job.commute_time_text || null,
      // D) Company
      company_name: job.company_name,
      company_name_normalized: companyNormalized,
      company_website: null,
      company_linkedin_url: null,
      industry: job.industry || null,
      company_size: null,
      company_type: null,
      // E) Compensation
      salary_min: job.salary_min || enriched.salary_min || null,
      salary_max: job.salary_max || enriched.salary_max || null,
      salary_currency: job.salary_currency || "EUR",
      salary_period: enriched.salary_period || null,
      salary_text_raw: job.salary_text_raw || null,
      bonus_mentioned: enriched.bonus_mentioned || "no",
      equity_mentioned: enriched.equity_mentioned || "no",
      // F) Language & Visa
      job_description_language: enriched.job_description_language || null,
      required_languages: requiredLangs,
      language_level: enriched.language_level || null,
      visa_sponsorship_mentioned: visaMentioned,
      ind_registered_sponsor: isIndSponsor,
      ind_match_method: indMatch.method,
      ind_matched_name: indMatch.matchedName,
      visa_likelihood: visaLikelihood,
      relocation_support_mentioned: enriched.relocation_support_mentioned || "no",
      // G) Requirements
      years_experience_min: enriched.years_experience_min || null,
      education_level: enriched.education_level || null,
      degree_fields: enriched.degree_fields || [],
      certifications: enriched.certifications || [],
      // H) Skills
      hard_skills: enriched.hard_skills || [],
      software_tools: enriched.software_tools || [],
      cloud_platforms: enriched.cloud_platforms || [],
      ml_ds_methods: enriched.ml_ds_methods || [],
      data_stack: enriched.data_stack || [],
      soft_skills: enriched.soft_skills || [],
      nice_to_have_skills: enriched.nice_to_have_skills || [],
      // I) Benefits
      pension: enriched.pension || "no",
      health_insurance: enriched.health_insurance || "no",
      learning_budget: enriched.learning_budget || "no",
      learning_budget_amount: enriched.learning_budget_amount || null,
      transport_allowance: enriched.transport_allowance || "no",
      car_lease: enriched.car_lease || "no",
      home_office_budget: enriched.home_office_budget || "no",
      gym_wellbeing: enriched.gym_wellbeing || "no",
      extra_holidays: enriched.extra_holidays || "no",
      parental_leave: enriched.parental_leave || "no",
      benefits_text_raw: enriched.benefits_text_raw || null,
      // J) Matching
      match_score_overall: matchScore,
      match_score_breakdown: matchBreakdown,
      matched_skills: matchedSkills,
      missing_skills: missingSkills,
      must_have_missing_count: missingSkills.length,
      match_explanation: profile ? `Score based on ${matchedSkills.length} matched / ${missingSkills.length} missing skills` : null,
      enrichment_status: hasEnrichment ? "done" : "pending",
      match_status: profile ? "done" : "not_requested",
      // K) AI Writing Helpers (skipped)
      cv_improvement_suggestions: null,
      suggested_cv_keywords: [],
      cover_letter_angle: null,
      interview_topics_to_prepare: [],
      // L) Raw Text
      job_description_raw: job.job_description_raw || "",
      requirements_raw: enriched.requirements_raw || null,
      company_description_raw: null,
    };
  });
}

// ── Fetch pre-ingested company_direct jobs from DB ──
async function fetchCompanyDirectJobs(supabase: any, params: SearchParams): Promise<any[]> {
  try {
    let query = supabase
      .from("company_jobs")
      .select("*")
      .eq("is_active", true)
      .limit(200);

    if (params.keywords) {
      query = query.ilike("job_title", `%${params.keywords}%`);
    }
    if (params.city) {
      query = query.ilike("city", `%${params.city}%`);
    }

    const { data, error } = await query;
    if (error) { console.error("company_jobs fetch error:", error); return []; }

    return (data || []).map((j: any) => ({
      job_id: j.job_id,
      source: "company_direct",
      source_job_id: j.source_job_id,
      job_url: j.job_url,
      apply_url: j.apply_url,
      date_posted: j.date_posted,
      job_title: j.job_title,
      country: j.country || "Netherlands",
      city: j.city,
      company_name: j.company_name || "Unknown",
      company_name_normalized: j.company_name_normalized,
      job_description_raw: j.job_description_raw || "",
      data_source_type: "company_direct",
    }));
  } catch (e) { console.error("company_direct fetch error:", e); return []; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const params: SearchParams = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GOOGLE_GEMINI_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Fetch from ALL sources in parallel
    console.log("Fetching from all sources in parallel...");
    const [adzunaJobs, arbeitnowJobs, greenhouseJobs, leverJobs, smartrecruitersJobs, companyDirectJobs] =
      await Promise.all([
        fetchAdzuna(params),
        fetchArbeitnow(params),
        fetchGreenhouse(params),
        fetchLever(params),
        fetchSmartRecruiters(params),
        fetchCompanyDirectJobs(supabase, params),
      ]);

    console.log(`Results: Adzuna=${adzunaJobs.length}, Arbeitnow=${arbeitnowJobs.length}, Greenhouse=${greenhouseJobs.length}, Lever=${leverJobs.length}, SmartRecruiters=${smartrecruitersJobs.length}, CompanyDirect=${companyDirectJobs.length}`);

    // Apply data source filter
    const sourceFilter = params.dataSourceFilter || "all";
    let aggregatorJobs: any[] = [];
    let directJobs: any[] = [];
    
    if (sourceFilter !== "company_direct") {
      aggregatorJobs = [...adzunaJobs, ...arbeitnowJobs, ...greenhouseJobs, ...leverJobs, ...smartrecruitersJobs];
    }
    if (sourceFilter !== "aggregator") {
      directJobs = companyDirectJobs;
    }

    // Merge and deduplicate
    const seen = new Set<string>();
    const allJobs: any[] = [];
    for (const job of [...aggregatorJobs, ...directJobs]) {
      const key = `${(job.company_name || "").toLowerCase()}_${(job.job_title || "").toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        allJobs.push(job);
      }
    }

    if (allJobs.length === 0) {
      return new Response(JSON.stringify({ jobs: [], sources: { adzuna: 0, arbeitnow: 0, greenhouse: 0, lever: 0, smartrecruiters: 0, company_direct: 0 } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. AI enrichment (limit to topN*2 for performance)
    const enrichLimit = Math.min(allJobs.length, (params.topN || 20) * 2);
    const jobsToEnrich = allJobs.slice(0, enrichLimit);
    const jobSummaries = jobsToEnrich.map(
      (j: any) => `JOB_ID: ${j.job_id}\nTITLE: ${j.job_title}\nCOMPANY: ${j.company_name}\nDESCRIPTION: ${(j.job_description_raw || "").substring(0, 600)}`
    );

    let enrichedMap: Record<string, any> = {};

    // Run IND sponsor lookup and AI enrichment concurrently
    const [indResult, aiResult] = await Promise.allSettled([
      supabase.from("ind_sponsors").select("company_name, company_name_normalized"),
      fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `You are a job listing analyzer. Extract structured data ONLY from what is explicitly stated. Do NOT infer, guess, or fabricate. If a field is not mentioned, use null or empty arrays.\n\nAnalyze these ${jobsToEnrich.length} jobs:\n\n${jobSummaries.join("\n---\n")}`,
                  },
                ],
              },
            ],
            tools: [
              {
                functionDeclarations: [
                  {
                    name: "enrich_jobs",
                    description: "Return enriched data extracted only from job descriptions",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        jobs: {
                          type: "ARRAY",
                          items: {
                            type: "OBJECT",
                            properties: {
                              job_id: { type: "STRING" },
                              hard_skills: { type: "ARRAY", items: { type: "STRING" } },
                              software_tools: { type: "ARRAY", items: { type: "STRING" } },
                              cloud_platforms: { type: "ARRAY", items: { type: "STRING" } },
                              ml_ds_methods: { type: "ARRAY", items: { type: "STRING" } },
                              data_stack: { type: "ARRAY", items: { type: "STRING" } },
                              soft_skills: { type: "ARRAY", items: { type: "STRING" } },
                              nice_to_have_skills: { type: "ARRAY", items: { type: "STRING" } },
                              years_experience_min: { type: "INTEGER" },
                              education_level: { type: "STRING" },
                              degree_fields: { type: "ARRAY", items: { type: "STRING" } },
                              certifications: { type: "ARRAY", items: { type: "STRING" } },
                              required_languages: { type: "ARRAY", items: { type: "STRING" } },
                              language_level: { type: "STRING" },
                              seniority_level: { type: "STRING" },
                              employment_type: { type: "STRING" },
                              contract_type: { type: "STRING" },
                              work_mode: { type: "STRING" },
                              remote_region: { type: "STRING" },
                              hours_per_week_min: { type: "INTEGER" },
                              hours_per_week_max: { type: "INTEGER" },
                              department: { type: "STRING" },
                              visa_sponsorship_mentioned: { type: "STRING" },
                              relocation_support_mentioned: { type: "STRING" },
                              job_description_language: { type: "STRING" },
                              salary_period: { type: "STRING" },
                              bonus_mentioned: { type: "STRING" },
                              equity_mentioned: { type: "STRING" },
                              pension: { type: "STRING" },
                              health_insurance: { type: "STRING" },
                              learning_budget: { type: "STRING" },
                              learning_budget_amount: { type: "STRING" },
                              transport_allowance: { type: "STRING" },
                              car_lease: { type: "STRING" },
                              home_office_budget: { type: "STRING" },
                              gym_wellbeing: { type: "STRING" },
                              extra_holidays: { type: "STRING" },
                              parental_leave: { type: "STRING" },
                              benefits_text_raw: { type: "STRING" },
                              requirements_raw: { type: "STRING" },
                            },
                            required: ["job_id"],
                          },
                        },
                      },
                      required: ["jobs"],
                    },
                  },
                ],
              },
            ],
            toolConfig: {
              functionCallingConfig: {
                mode: "ANY",
                allowedFunctionNames: ["enrich_jobs"],
              },
            },
            generationConfig: { temperature: 0 },
          }),
        }
      ),
    ]);

    // Process IND sponsors — normalize them the SAME way as job companies
    let sponsorNormalizedSet = new Set<string>();
    let sponsorNormalizedList: string[] = [];
    let sponsorRawMap = new Map<string, string>();
    
    if (indResult.status === "fulfilled") {
      const { data: indSponsors } = indResult.value;
      for (const s of (indSponsors || [])) {
        const normalized = normalizeCompanyName(s.company_name_normalized || s.company_name);
        sponsorNormalizedSet.add(normalized);
        sponsorNormalizedList.push(normalized);
        sponsorRawMap.set(normalized, s.company_name);
      }
      console.log(`Loaded ${sponsorNormalizedSet.size} unique normalized IND sponsors`);
      
      // QA: Log sample matches for debugging
      const sampleCompanies = ["adyen", "elastic", "catawiki", "shell", "ing", "philips"];
      for (const c of sampleCompanies) {
        const match = matchIndSponsor(c, sponsorNormalizedSet, sponsorNormalizedList, sponsorRawMap);
        console.log(`IND QA: "${c}" → ${match.isMatch ? "✓" : "✗"} (${match.method}) → ${match.matchedName || "none"}`);
      }
    } else {
      console.error("IND sponsors load failed:", indResult.reason);
    }

    // Process AI enrichment
    if (aiResult.status === "fulfilled") {
      const aiResponse = aiResult.value;
      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const functionCall = aiData.candidates?.[0]?.content?.parts?.find(
          (p: any) => p.functionCall
        )?.functionCall;
        if (functionCall) {
          for (const ej of functionCall.args?.jobs || []) {
            enrichedMap[ej.job_id] = ej;
          }
          console.log(`AI enriched ${Object.keys(enrichedMap).length}/${jobsToEnrich.length} jobs`);
        }
      } else {
        const errText = await aiResponse.text();
        console.error("Gemini enrichment failed:", aiResponse.status, errText);
      }
    } else {
      console.error("AI enrichment error:", aiResult.reason);
    }

    // 4. Enrich, match, filter
    const finalJobs = enrichAndMatch(allJobs, enrichedMap, sponsorNormalizedSet, sponsorNormalizedList, sponsorRawMap, params.candidateProfile, params.strictMode);

    let results = finalJobs;
    if (params.workModes?.length > 0) {
      results = results.filter((j: any) => j.work_mode && params.workModes.includes(j.work_mode));
    }
    if (params.indSponsorOnly) {
      results = results.filter((j: any) => j.ind_registered_sponsor);
    }
    if (params.matchThreshold > 0 && params.candidateProfile) {
      results = results.filter((j: any) => j.match_score_overall >= params.matchThreshold);
    }

    // Multi-key ranking
    results.sort((a: any, b: any) => {
      if (b.match_score_overall !== a.match_score_overall) return b.match_score_overall - a.match_score_overall;
      const dateA = a.date_posted || "";
      const dateB = b.date_posted || "";
      if (dateB !== dateA) return dateB.localeCompare(dateA);
      const salA = a.salary_max ?? 0;
      const salB = b.salary_max ?? 0;
      if (salB !== salA) return salB - salA;
      const comA = a.commute_time_min ?? 999;
      const comB = b.commute_time_min ?? 999;
      return comA - comB;
    });

    // Apply Top N limit
    const topN = params.topN || 20;
    results = results.slice(0, topN);

    // 5. Commute calculation for shortlisted results
    if (params.commuteOrigin && params.commuteMode) {
      await computeCommute(results, params.commuteOrigin, params.commuteMode);
      console.log(`Commute computed for ${results.filter((j: any) => j.commute_time_min).length}/${results.length} jobs`);
    }

    // Log IND match rate for QA
    const indMatched = results.filter((j: any) => j.ind_registered_sponsor).length;
    console.log(`IND sponsor match rate: ${indMatched}/${results.length} (${Math.round(indMatched / results.length * 100)}%)`);

    return new Response(JSON.stringify({
      jobs: results,
      sources: {
        adzuna: adzunaJobs.length,
        arbeitnow: arbeitnowJobs.length,
        greenhouse: greenhouseJobs.length,
        lever: leverJobs.length,
        smartrecruiters: smartrecruitersJobs.length,
        company_direct: companyDirectJobs.length,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("search-jobs error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
