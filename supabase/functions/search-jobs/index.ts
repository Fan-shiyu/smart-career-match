import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Major NL tech companies on Greenhouse/Lever/SmartRecruiters
const GREENHOUSE_BOARDS = [
  "booking", "adyen", "elastic", "messagebird", "mollie",
  "takeaway", "picnic", "bunq", "coolblue", "rituals",
  "tomtom", "leaseweb", "backbase", "lightspeedhq", "wetransfer",
  "mymedia", "catawiki", "sendcloud", "sytac", "yoursurprise",
  "viber", "happeo", "polarsteps", "meatable", "abn",
  "studocu", "fabric", "optiver", "flowtraders", "imctrading",
];
const LEVER_BOARDS = [
  "trivago", "gorillas", "hellofresh", "miro",
  "personio", "contentful", "spendesk", "bynder",
  "talentio", "framer",
];
// SmartRecruiters public Posting API (no auth needed)
const SMARTRECRUITERS_COMPANIES = [
  "Shell", "Unilever", "Philips", "ING", "KPMG",
  "Deloitte", "Heineken", "AkzoNobel", "ASML", "NXPSemiconductors",
  "Wolters-Kluwer", "Randstad", "Aegon", "NN-Group",
];

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
      job_url: j.redirect_url || "",
      apply_url: j.redirect_url || "",
      date_posted: j.created?.split("T")[0] || "",
      job_title: j.title?.replace(/<[^>]*>/g, "") || "Unknown",
      seniority_level: null,
      employment_type: null,
      work_mode: null,
      country: "Netherlands",
      city: j.location?.display_name?.split(",")[0]?.trim() || null,
      company_name: j.company?.display_name || "Unknown",
      industry: j.category?.label || null,
      salary_min: j.salary_min ? Math.round(j.salary_min) : null,
      salary_max: j.salary_max ? Math.round(j.salary_max) : null,
      salary_currency: "EUR",
      job_description_raw: j.description?.replace(/<[^>]*>/g, "") || "",
    }));
  } catch (e) { console.error("Adzuna fetch error:", e); return []; }
}

// ── Arbeitnow fetcher (free, no key) ──
async function fetchArbeitnow(params: SearchParams): Promise<any[]> {
  const url = new URL("https://www.arbeitnow.com/api/job-board-api");
  // Arbeitnow doesn't support keyword search via params well, but we can filter client-side
  console.log("Fetching Arbeitnow...");
  try {
    const resp = await fetch(url.toString());
    if (!resp.ok) { console.error("Arbeitnow error:", resp.status); return []; }
    const data = await resp.json();
    const kw = (params.keywords || "").toLowerCase();
    let jobs = data.data || [];
    // Filter for Netherlands
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
    // Filter by keyword if provided
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
      job_url: j.url || "",
      apply_url: j.url || "",
      date_posted: j.created_at ? new Date(j.created_at * 1000).toISOString().split("T")[0] : "",
      job_title: j.title || "Unknown",
      seniority_level: null,
      employment_type: j.job_types?.includes("full_time") ? "Full-time" : j.job_types?.includes("part_time") ? "Part-time" : null,
      work_mode: j.remote ? "Remote" : null,
      country: "Netherlands",
      city: (j.location || "").split(",")[0]?.trim() || null,
      company_name: j.company_name || "Unknown",
      industry: null,
      salary_min: null,
      salary_max: null,
      salary_currency: "EUR",
      job_description_raw: (j.description || "").replace(/<[^>]*>/g, "").substring(0, 1000),
    }));
  } catch (e) { console.error("Arbeitnow fetch error:", e); return []; }
}

// ── Greenhouse fetcher ──
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
          if (kw) {
            return (j.title || "").toLowerCase().includes(kw) ||
              (j.content || "").toLowerCase().includes(kw);
          }
          return true;
        })
        .slice(0, 10)
        .map((j: any) => ({
          job_id: `gh-${j.id}`,
          source: "greenhouse",
          job_url: j.absolute_url || "",
          apply_url: j.absolute_url || "",
          date_posted: j.updated_at?.split("T")[0] || "",
          job_title: j.title || "Unknown",
          seniority_level: null,
          employment_type: null,
          work_mode: null,
          country: "Netherlands",
          city: (j.location?.name || "").split(",")[0]?.trim() || null,
          company_name: board.charAt(0).toUpperCase() + board.slice(1),
          industry: null,
          salary_min: null,
          salary_max: null,
          salary_currency: "EUR",
          job_description_raw: (j.content || "").replace(/<[^>]*>/g, "").substring(0, 1000),
        }));
    } catch { return []; }
  };

  console.log("Fetching Greenhouse boards...");
  const results = await Promise.allSettled(GREENHOUSE_BOARDS.map(fetchBoard));
  for (const r of results) {
    if (r.status === "fulfilled") allJobs.push(...r.value);
  }
  return allJobs;
}

// ── Lever fetcher ──
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
          if (kw) {
            return (j.text || "").toLowerCase().includes(kw) ||
              (j.descriptionPlain || "").toLowerCase().includes(kw);
          }
          return true;
        })
        .slice(0, 10)
        .map((j: any) => ({
          job_id: `lv-${j.id}`,
          source: "lever",
          job_url: j.hostedUrl || "",
          apply_url: j.applyUrl || j.hostedUrl || "",
          date_posted: j.createdAt ? new Date(j.createdAt).toISOString().split("T")[0] : "",
          job_title: j.text || "Unknown",
          seniority_level: null,
          employment_type: j.categories?.commitment || null,
          work_mode: j.workplaceType === "remote" ? "Remote" : j.workplaceType === "onSite" ? "On-site" : j.workplaceType === "hybrid" ? "Hybrid" : null,
          country: "Netherlands",
          city: (j.categories?.location || "").split(",")[0]?.split("-")[0]?.trim() || null,
          company_name: board.charAt(0).toUpperCase() + board.slice(1),
          industry: null,
          salary_min: null,
          salary_max: null,
          salary_currency: "EUR",
          job_description_raw: (j.descriptionPlain || "").substring(0, 1000),
        }));
    } catch { return []; }
  };

  console.log("Fetching Lever boards...");
  const results = await Promise.allSettled(LEVER_BOARDS.map(fetchBoard));
  for (const r of results) {
    if (r.status === "fulfilled") allJobs.push(...r.value);
  }
  return allJobs;
}

// ── SmartRecruiters fetcher (public Posting API, no auth) ──
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
          if (kw) {
            return (j.name || "").toLowerCase().includes(kw) ||
              (j.jobAd?.sections?.jobDescription?.text || "").toLowerCase().includes(kw);
          }
          return true;
        })
        .slice(0, 15)
        .map((j: any) => ({
          job_id: `sr-${j.id || j.uuid}`,
          source: "smartrecruiters",
          job_url: j.ref || j.company?.websiteUrl || "",
          apply_url: j.ref || "",
          date_posted: j.releasedDate?.split("T")[0] || "",
          job_title: j.name || "Unknown",
          seniority_level: j.experienceLevel?.name || null,
          employment_type: j.typeOfEmployment?.name || null,
          work_mode: null,
          country: "Netherlands",
          city: j.location?.city || null,
          company_name: j.company?.name || company,
          industry: j.industry?.name || null,
          salary_min: null,
          salary_max: null,
          salary_currency: "EUR",
          job_description_raw: (j.jobAd?.sections?.jobDescription?.text || "").replace(/<[^>]*>/g, "").substring(0, 1000),
        }));
    } catch { return []; }
  };

  console.log("Fetching SmartRecruiters companies...");
  const results = await Promise.allSettled(SMARTRECRUITERS_COMPANIES.map(fetchCompany));
  for (const r of results) {
    if (r.status === "fulfilled") allJobs.push(...r.value);
  }
  return allJobs;
}

// ── Enrichment + Matching ──
function enrichAndMatch(
  normalizedJobs: any[],
  enrichedMap: Record<string, any>,
  sponsorSet: Set<string>,
  profile: SearchParams["candidateProfile"],
  strictMode: boolean,
) {
  return normalizedJobs.map((job: any) => {
    const enriched = enrichedMap[job.job_id] || {};
    const companyNormalized = job.company_name.toLowerCase().trim();
    const isIndSponsor = sponsorSet.has(companyNormalized);
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

      matchScore = Math.round(
        skillScore * 0.4 + toolScore * 0.2 + seniorityScore * 0.15 + expScore * 0.15 + langScore * 0.1
      );

      if (strictMode && missingSkills.length > 0) {
        matchScore = Math.max(0, matchScore - missingSkills.length * 10);
      }

      matchedSkills = (enriched.hard_skills || []).filter((s: string) => candidateSkills.includes(s.toLowerCase()));
      missingSkills = (enriched.hard_skills || []).filter((s: string) => !candidateSkills.includes(s.toLowerCase()));
    }

    return {
      ...job,
      hard_skills: enriched.hard_skills || [],
      software_tools: enriched.software_tools || [],
      soft_skills: enriched.soft_skills || [],
      years_experience_min: enriched.years_experience_min || null,
      education_level: enriched.education_level || null,
      required_languages: requiredLangs,
      seniority_level: enriched.seniority_level || job.seniority_level,
      work_mode: enriched.work_mode || job.work_mode,
      visa_sponsorship_mentioned: visaMentioned,
      ind_registered_sponsor: isIndSponsor,
      visa_likelihood: visaLikelihood,
      matched_skills: matchedSkills,
      missing_skills: missingSkills,
      match_score_overall: matchScore,
      match_score_breakdown: matchBreakdown,
      commute_distance_km: null,
      commute_time_min: null,
    };
  });
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
    const [adzunaJobs, arbeitnowJobs, greenhouseJobs, leverJobs, smartrecruitersJobs] =
      await Promise.all([
        fetchAdzuna(params),
        fetchArbeitnow(params),
        fetchGreenhouse(params),
        fetchLever(params),
        fetchSmartRecruiters(params),
      ]);

    console.log(`Results: Adzuna=${adzunaJobs.length}, Arbeitnow=${arbeitnowJobs.length}, Greenhouse=${greenhouseJobs.length}, Lever=${leverJobs.length}, SmartRecruiters=${smartrecruitersJobs.length}`);

    // Merge and deduplicate by company+title
    const seen = new Set<string>();
    const allJobs: any[] = [];
    for (const job of [...adzunaJobs, ...arbeitnowJobs, ...greenhouseJobs, ...leverJobs, ...smartrecruitersJobs]) {
      const key = `${job.company_name.toLowerCase()}_${job.job_title.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        allJobs.push(job);
      }
    }

    if (allJobs.length === 0) {
      return new Response(JSON.stringify({ jobs: [], sources: { adzuna: 0, arbeitnow: 0, greenhouse: 0, lever: 0, smartrecruiters: 0 } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Load IND sponsors + AI enrichment IN PARALLEL
    const jobsToEnrich = allJobs.slice(0, 40);
    const jobSummaries = jobsToEnrich.map(
      (j: any) => `JOB_ID: ${j.job_id}\nTITLE: ${j.job_title}\nCOMPANY: ${j.company_name}\nDESCRIPTION: ${j.job_description_raw?.substring(0, 400)}`
    );

    let enrichedMap: Record<string, any> = {};
    let enrichmentStatus = "success";

    // Run IND sponsor lookup and AI enrichment concurrently
    const [indResult, aiResult] = await Promise.allSettled([
      // IND sponsors
      supabase.from("ind_sponsors").select("company_name_normalized"),
      // AI enrichment
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
                    text: `You are a job listing analyzer. Extract structured data ONLY from what is explicitly stated in the job description. Do NOT infer, guess, or fabricate any information. If a field is not mentioned, use null or empty arrays. Be strictly accurate.\n\nAnalyze these ${jobsToEnrich.length} jobs and extract ONLY explicitly mentioned information:\n\n${jobSummaries.join("\n---\n")}`,
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
                              soft_skills: { type: "ARRAY", items: { type: "STRING" } },
                              years_experience_min: { type: "INTEGER" },
                              education_level: { type: "STRING" },
                              required_languages: { type: "ARRAY", items: { type: "STRING" } },
                              seniority_level: { type: "STRING" },
                              work_mode: { type: "STRING" },
                              visa_sponsorship_mentioned: { type: "STRING" },
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
            generationConfig: {
              temperature: 0,
            },
          }),
        }
      ),
    ]);

    // Process IND sponsors result
    let sponsorSet = new Set<string>();
    if (indResult.status === "fulfilled") {
      const { data: indSponsors } = indResult.value;
      sponsorSet = new Set((indSponsors || []).map((s: any) => s.company_name_normalized));
    } else {
      console.error("IND sponsors load failed:", indResult.reason);
    }

    // Process AI enrichment result
    if (aiResult.status === "fulfilled") {
      const aiResponse = aiResult.value;
      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const functionCall = aiData.candidates?.[0]?.content?.parts?.find(
          (p: any) => p.functionCall
        )?.functionCall;
        if (functionCall) {
          const parsed = functionCall.args;
          for (const ej of parsed.jobs || []) {
            enrichedMap[ej.job_id] = ej;
          }
        }
      } else {
        const errText = await aiResponse.text();
        console.error("Gemini enrichment failed:", aiResponse.status, errText);
        enrichmentStatus = aiResponse.status === 429 ? "rate_limited" : "failed";
      }
    } else {
      console.error("AI enrichment error:", aiResult.reason);
      enrichmentStatus = "failed";
    }

    // 4. Enrich, match, filter
    const finalJobs = enrichAndMatch(allJobs, enrichedMap, sponsorSet, params.candidateProfile, params.strictMode);

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

    results.sort((a: any, b: any) => b.match_score_overall - a.match_score_overall);

    return new Response(JSON.stringify({
      jobs: results,
      sources: {
        adzuna: adzunaJobs.length,
        arbeitnow: arbeitnowJobs.length,
        greenhouse: greenhouseJobs.length,
        lever: leverJobs.length,
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
