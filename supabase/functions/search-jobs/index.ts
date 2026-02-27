import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COUNTRY_MAP: Record<string, string> = {
  Netherlands: "nl",
  Germany: "de",
  Belgium: "be",
  "United Kingdom": "gb",
};

interface SearchParams {
  keywords: string;
  country: string;
  city: string;
  workMode: string;
  employmentType: string;
  minSalary: number;
  postedWithin: string;
  // Candidate profile for matching
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const params: SearchParams = await req.json();
    const ADZUNA_APP_ID = Deno.env.get("ADZUNA_APP_ID");
    const ADZUNA_APP_KEY = Deno.env.get("ADZUNA_APP_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
      throw new Error("Adzuna API credentials not configured");
    }
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Fetch jobs from Adzuna
    const countryCode = COUNTRY_MAP[params.country] || "nl";
    const adzunaUrl = new URL(
      `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/1`
    );
    adzunaUrl.searchParams.set("app_id", ADZUNA_APP_ID);
    adzunaUrl.searchParams.set("app_key", ADZUNA_APP_KEY);
    adzunaUrl.searchParams.set("results_per_page", "30");
    adzunaUrl.searchParams.set("content-type", "application/json");

    if (params.keywords) adzunaUrl.searchParams.set("what", params.keywords);
    if (params.city) adzunaUrl.searchParams.set("where", params.city);
    if (params.minSalary > 0)
      adzunaUrl.searchParams.set("salary_min", String(params.minSalary));

    // Employment type mapping
    if (params.employmentType === "Full-time")
      adzunaUrl.searchParams.set("full_time", "1");
    else if (params.employmentType === "Part-time")
      adzunaUrl.searchParams.set("part_time", "1");
    else if (params.employmentType === "Contract")
      adzunaUrl.searchParams.set("contract", "1");

    // Posted within
    if (params.postedWithin === "24h")
      adzunaUrl.searchParams.set("max_days_old", "1");
    else if (params.postedWithin === "7d")
      adzunaUrl.searchParams.set("max_days_old", "7");
    else if (params.postedWithin === "30d")
      adzunaUrl.searchParams.set("max_days_old", "30");

    console.log("Fetching from Adzuna:", adzunaUrl.toString());

    const adzunaResp = await fetch(adzunaUrl.toString());
    if (!adzunaResp.ok) {
      const errText = await adzunaResp.text();
      console.error("Adzuna error:", adzunaResp.status, errText);
      throw new Error(`Adzuna API error: ${adzunaResp.status}`);
    }

    const adzunaData = await adzunaResp.json();
    const rawJobs = adzunaData.results || [];

    if (rawJobs.length === 0) {
      return new Response(JSON.stringify({ jobs: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Normalize Adzuna jobs
    const normalizedJobs = rawJobs.map((j: any) => ({
      job_id: `adz-${j.id}`,
      source: "adzuna",
      job_url: j.redirect_url || "",
      apply_url: j.redirect_url || "",
      date_posted: j.created?.split("T")[0] || "",
      job_title: j.title?.replace(/<[^>]*>/g, "") || "Unknown",
      seniority_level: null,
      employment_type: params.employmentType !== "all" ? params.employmentType : null,
      work_mode: null,
      country: params.country,
      city: j.location?.display_name?.split(",")[0]?.trim() || params.city || null,
      company_name: j.company?.display_name || "Unknown",
      industry: j.category?.label || null,
      salary_min: j.salary_min ? Math.round(j.salary_min) : null,
      salary_max: j.salary_max ? Math.round(j.salary_max) : null,
      salary_currency: "EUR",
      job_description_raw: j.description?.replace(/<[^>]*>/g, "") || "",
    }));

    // 3. Load IND sponsors for visa check
    const { data: indSponsors } = await supabase
      .from("ind_sponsors")
      .select("company_name_normalized");

    const sponsorSet = new Set(
      (indSponsors || []).map((s: any) => s.company_name_normalized)
    );

    // 4. AI enrichment - batch enrich jobs with skills extraction
    const jobSummaries = normalizedJobs.map(
      (j: any) =>
        `JOB_ID: ${j.job_id}\nTITLE: ${j.job_title}\nCOMPANY: ${j.company_name}\nDESCRIPTION: ${j.job_description_raw?.substring(0, 500)}`
    );

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `You are a job listing analyzer. For each job, extract structured data. Be accurate — do not fabricate data. If information isn't available, use empty arrays or null.`,
            },
            {
              role: "user",
              content: `Analyze these ${normalizedJobs.length} job listings and extract skills, tools, requirements for each:\n\n${jobSummaries.join("\n---\n")}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "enrich_jobs",
                description: "Return enriched data for all job listings",
                parameters: {
                  type: "object",
                  properties: {
                    jobs: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          job_id: { type: "string" },
                          hard_skills: {
                            type: "array",
                            items: { type: "string" },
                          },
                          software_tools: {
                            type: "array",
                            items: { type: "string" },
                          },
                          soft_skills: {
                            type: "array",
                            items: { type: "string" },
                          },
                          years_experience_min: {
                            type: "integer",
                            nullable: true,
                          },
                          education_level: {
                            type: "string",
                            nullable: true,
                          },
                          required_languages: {
                            type: "array",
                            items: { type: "string" },
                          },
                          seniority_level: {
                            type: "string",
                            nullable: true,
                            enum: [
                              "Junior",
                              "Mid",
                              "Senior",
                              "Lead",
                              "Manager",
                            ],
                          },
                          work_mode: {
                            type: "string",
                            nullable: true,
                            enum: ["On-site", "Hybrid", "Remote"],
                          },
                          visa_sponsorship_mentioned: {
                            type: "string",
                            enum: ["yes", "no", "unclear"],
                          },
                        },
                        required: ["job_id"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["jobs"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "enrich_jobs" },
          },
        }),
      }
    );

    let enrichedMap: Record<string, any> = {};
    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) {
        try {
          const parsed = JSON.parse(toolCall.function.arguments);
          for (const ej of parsed.jobs || []) {
            enrichedMap[ej.job_id] = ej;
          }
        } catch (e) {
          console.error("Failed to parse AI enrichment:", e);
        }
      }
    } else {
      console.error("AI enrichment failed:", aiResponse.status);
    }

    // 5. Merge enrichment + calculate visa likelihood + matching
    const profile = params.candidateProfile;
    const finalJobs = normalizedJobs.map((job: any) => {
      const enriched = enrichedMap[job.job_id] || {};
      const companyNormalized = job.company_name.toLowerCase().trim();
      const isIndSponsor = sponsorSet.has(companyNormalized);
      const visaMentioned = enriched.visa_sponsorship_mentioned || "unclear";
      const requiredLangs = enriched.required_languages || [];
      const hasEnglish = requiredLangs.some(
        (l: string) => l.toLowerCase() === "english"
      );

      let visaLikelihood: string | null = null;
      if (isIndSponsor && (visaMentioned === "yes" || hasEnglish)) {
        visaLikelihood = "High";
      } else if (isIndSponsor) {
        visaLikelihood = "Medium";
      } else if (visaMentioned === "yes") {
        visaLikelihood = "Medium";
      } else {
        visaLikelihood = "Low";
      }

      // Matching
      let matchScore = 0;
      let matchBreakdown = {
        hard_skills: 0,
        tools: 0,
        seniority: 0,
        experience: 0,
        language: 0,
      };
      let matchedSkills: string[] = [];
      let missingSkills: string[] = [];

      const jobSkills = (enriched.hard_skills || []).map((s: string) =>
        s.toLowerCase()
      );
      const jobTools = (enriched.software_tools || []).map((s: string) =>
        s.toLowerCase()
      );

      if (profile) {
        const candidateSkills = profile.hard_skills.map((s) => s.toLowerCase());
        const candidateTools = profile.software_tools.map((s) =>
          s.toLowerCase()
        );

        // Hard skills (40%)
        matchedSkills = jobSkills.filter((s: string) =>
          candidateSkills.includes(s)
        );
        missingSkills = jobSkills.filter(
          (s: string) => !candidateSkills.includes(s)
        );
        const skillScore =
          jobSkills.length > 0
            ? (matchedSkills.length / jobSkills.length) * 100
            : 50;

        // Tools (20%)
        const matchedTools = jobTools.filter((t: string) =>
          candidateTools.includes(t)
        );
        const toolScore =
          jobTools.length > 0
            ? (matchedTools.length / jobTools.length) * 100
            : 50;

        // Seniority (15%)
        const seniorityLevels = [
          "junior",
          "mid",
          "senior",
          "lead",
          "manager",
        ];
        const jobSenIdx = seniorityLevels.indexOf(
          (enriched.seniority_level || "").toLowerCase()
        );
        const candSenIdx = seniorityLevels.indexOf(
          profile.seniority.toLowerCase()
        );
        const seniorityScore =
          jobSenIdx >= 0 && candSenIdx >= 0
            ? Math.max(0, 100 - Math.abs(jobSenIdx - candSenIdx) * 25)
            : 50;

        // Experience (15%)
        const jobExpMin = enriched.years_experience_min || 0;
        const expDiff = profile.years_experience - jobExpMin;
        const expScore = expDiff >= 0 ? 100 : Math.max(0, 100 + expDiff * 20);

        // Language (10%)
        const candidateLangs = profile.languages.map((l) => l.toLowerCase());
        const langMatch = requiredLangs.filter((l: string) =>
          candidateLangs.includes(l.toLowerCase())
        );
        const langScore =
          requiredLangs.length > 0
            ? (langMatch.length / requiredLangs.length) * 100
            : 100;

        matchBreakdown = {
          hard_skills: Math.round(skillScore),
          tools: Math.round(toolScore),
          seniority: Math.round(seniorityScore),
          experience: Math.round(expScore),
          language: Math.round(langScore),
        };

        matchScore = Math.round(
          skillScore * 0.4 +
            toolScore * 0.2 +
            seniorityScore * 0.15 +
            expScore * 0.15 +
            langScore * 0.1
        );

        // Strict mode penalty
        if (params.strictMode && missingSkills.length > 0) {
          matchScore = Math.max(
            0,
            matchScore - missingSkills.length * 10
          );
        }

        // Restore original casing for display
        matchedSkills = (enriched.hard_skills || []).filter((s: string) =>
          candidateSkills.includes(s.toLowerCase())
        );
        missingSkills = (enriched.hard_skills || []).filter(
          (s: string) => !candidateSkills.includes(s.toLowerCase())
        );
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

    // 6. Apply filters
    let results = finalJobs;

    if (params.workMode && params.workMode !== "all") {
      results = results.filter((j: any) => j.work_mode === params.workMode);
    }
    if (params.indSponsorOnly) {
      results = results.filter((j: any) => j.ind_registered_sponsor);
    }
    if (params.matchThreshold > 0 && profile) {
      results = results.filter(
        (j: any) => j.match_score_overall >= params.matchThreshold
      );
    }

    // Sort by match score descending
    results.sort(
      (a: any, b: any) => b.match_score_overall - a.match_score_overall
    );

    return new Response(JSON.stringify({ jobs: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("search-jobs error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
