import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LEGAL_SUFFIXES = /\b(b\.?v\.?|n\.?v\.?|ltd\.?|inc\.?|gmbh|ag|s\.?a\.?|plc|llc|co\.?|corp\.?|holding|group|international|netherlands|nederland)\b/gi;

function normalizeCompanyName(name: string): string {
  return name.toLowerCase().replace(LEGAL_SUFFIXES, "").replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}

function tokenSimilarity(a: string, b: string): number {
  const tokensA = new Set(a.split(" ").filter(t => t.length > 1));
  const tokensB = new Set(b.split(" ").filter(t => t.length > 1));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let intersection = 0;
  for (const t of tokensA) if (tokensB.has(t)) intersection++;
  return (2 * intersection) / (tokensA.size + tokensB.size);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin via auth header
    const authHeader = req.headers.get("authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Parse request
    const { action, batchSize = 20, daysBack, forceReenrich = false } = await req.json();

    if (action === "status") {
      // Return enrichment stats
      const { data: stats } = await supabase.rpc("get_enrichment_stats").maybeSingle();
      
      // Fallback: manual count
      const { count: total } = await supabase.from("cached_jobs").select("*", { count: "exact", head: true });
      const { count: enriched } = await supabase.from("cached_jobs").select("*", { count: "exact", head: true }).eq("enrichment_status", "done");
      const { count: pending } = await supabase.from("cached_jobs").select("*", { count: "exact", head: true }).eq("enrichment_status", "pending");
      const { count: failed } = await supabase.from("cached_jobs").select("*", { count: "exact", head: true }).eq("enrichment_status", "failed");
      const { count: indMatched } = await supabase.from("cached_jobs").select("*", { count: "exact", head: true }).eq("ind_registered_sponsor", true);

      return new Response(JSON.stringify({
        total: total || 0,
        enriched: enriched || 0,
        pending: pending || 0,
        failed: failed || 0,
        ind_matched: indMatched || 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "enrich") {
      const GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
      if (!GEMINI_API_KEY) throw new Error("GOOGLE_GEMINI_API_KEY not configured");

      // Fetch jobs needing enrichment
      let query = supabase
        .from("cached_jobs")
        .select("job_id, job_title, company_name, job_description_raw")
        .not("job_description_raw", "is", null)
        .limit(batchSize);

      if (!forceReenrich) {
        query = query.or("enrichment_status.eq.pending,enrichment_status.is.null");
      }
      if (daysBack) {
        const cutoff = new Date(Date.now() - daysBack * 86400000).toISOString();
        query = query.gte("fetched_at", cutoff);
      }

      const { data: jobs, error } = await query;
      if (error) throw error;
      if (!jobs || jobs.length === 0) {
        return new Response(JSON.stringify({ message: "No jobs to enrich", enriched: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // AI enrichment
      const jobSummaries = jobs.map(
        (j: any) => `JOB_ID: ${j.job_id}\nTITLE: ${j.job_title}\nCOMPANY: ${j.company_name}\nDESCRIPTION: ${(j.job_description_raw || "").substring(0, 1500)}`
      );

      const aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              role: "user",
              parts: [{
                text: `You are a job listing analyzer. Extract structured data ONLY from what is explicitly stated. Never fabricate.\n\nAnalyze these ${jobs.length} jobs:\n\n${jobSummaries.join("\n---\n")}`,
              }],
            }],
            tools: [{
              functionDeclarations: [{
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
                          visa_sponsorship_mentioned: { type: "STRING" },
                          relocation_support_mentioned: { type: "STRING" },
                          job_description_language: { type: "STRING" },
                          salary_min: { type: "INTEGER" },
                          salary_max: { type: "INTEGER" },
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
              }],
            }],
            toolConfig: { functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["enrich_jobs"] } },
            generationConfig: { temperature: 0 },
          }),
        }
      );

      let enrichedCount = 0;
      let failedCount = 0;

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const functionCall = aiData.candidates?.[0]?.content?.parts?.find(
          (p: any) => p.functionCall
        )?.functionCall;

        if (functionCall?.args?.jobs) {
          for (const ej of functionCall.args.jobs) {
            const update: any = {
              enrichment_status: "done",
              enrichment_status_updated_at: new Date().toISOString(),
              hard_skills: ej.hard_skills || [],
              software_tools: ej.software_tools || [],
              cloud_platforms: ej.cloud_platforms || [],
              ml_ds_methods: ej.ml_ds_methods || [],
              data_stack: ej.data_stack || [],
              soft_skills: ej.soft_skills || [],
              nice_to_have_skills: ej.nice_to_have_skills || [],
              years_experience_min: ej.years_experience_min || null,
              education_level: ej.education_level || null,
              degree_fields: ej.degree_fields || [],
              certifications: ej.certifications || [],
              required_languages: ej.required_languages || [],
              language_level: ej.language_level || null,
              seniority_level: ej.seniority_level || null,
              employment_type: ej.employment_type || null,
              contract_type: ej.contract_type || null,
              work_mode: ej.work_mode || null,
              visa_sponsorship_mentioned: ej.visa_sponsorship_mentioned || "unclear",
              relocation_support_mentioned: ej.relocation_support_mentioned || "no",
              job_description_language: ej.job_description_language || null,
              salary_min: ej.salary_min || null,
              salary_max: ej.salary_max || null,
              salary_period: ej.salary_period || null,
              bonus_mentioned: ej.bonus_mentioned || "no",
              equity_mentioned: ej.equity_mentioned || "no",
              pension: ej.pension || "no",
              health_insurance: ej.health_insurance || "no",
              learning_budget: ej.learning_budget || "no",
              learning_budget_amount: ej.learning_budget_amount || null,
              transport_allowance: ej.transport_allowance || "no",
              car_lease: ej.car_lease || "no",
              home_office_budget: ej.home_office_budget || "no",
              gym_wellbeing: ej.gym_wellbeing || "no",
              extra_holidays: ej.extra_holidays || "no",
              parental_leave: ej.parental_leave || "no",
              benefits_text_raw: ej.benefits_text_raw || null,
              requirements_raw: ej.requirements_raw || null,
            };

            const { error: updateError } = await supabase
              .from("cached_jobs")
              .update(update)
              .eq("job_id", ej.job_id);

            if (updateError) {
              console.error(`Update error for ${ej.job_id}:`, updateError.message);
              failedCount++;
            } else {
              enrichedCount++;
            }
          }
        }
      } else {
        const errText = await aiResponse.text();
        console.error("Gemini error:", aiResponse.status, errText);
        // Mark all as failed
        for (const j of jobs) {
          await supabase.from("cached_jobs").update({
            enrichment_status: "failed",
            enrichment_error: `Gemini ${aiResponse.status}`,
          }).eq("job_id", j.job_id);
          failedCount++;
        }
      }

      return new Response(JSON.stringify({
        message: `Enriched ${enrichedCount} jobs, ${failedCount} failed`,
        enriched: enrichedCount,
        failed: failedCount,
        batch_size: jobs.length,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "ind-match") {
      // Fetch all IND sponsors
      const allSponsors: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data } = await supabase.from("ind_sponsors")
          .select("company_name, company_name_normalized")
          .range(from, from + pageSize - 1);
        allSponsors.push(...(data || []));
        hasMore = (data || []).length === pageSize;
        from += pageSize;
      }

      const sponsorSet = new Set<string>();
      const sponsorList: string[] = [];
      const sponsorRawMap = new Map<string, string>();
      for (const s of allSponsors) {
        const n = normalizeCompanyName(s.company_name_normalized || s.company_name);
        sponsorSet.add(n);
        sponsorList.push(n);
        sponsorRawMap.set(n, s.company_name);
      }

      // Fetch all cached jobs
      let jobQuery = supabase.from("cached_jobs").select("job_id, company_name").limit(batchSize);
      if (daysBack) {
        const cutoff = new Date(Date.now() - daysBack * 86400000).toISOString();
        jobQuery = jobQuery.gte("fetched_at", cutoff);
      }
      const { data: jobs } = await jobQuery;

      let matched = 0;
      for (const job of (jobs || [])) {
        const normalized = normalizeCompanyName(job.company_name);
        let isMatch = false;
        let method = "none";
        let matchedName: string | null = null;

        if (sponsorSet.has(normalized)) {
          isMatch = true; method = "exact"; matchedName = sponsorRawMap.get(normalized) || normalized;
        } else {
          for (const sp of sponsorList) {
            if (sp.startsWith(normalized) || normalized.startsWith(sp)) {
              isMatch = true; method = "prefix"; matchedName = sponsorRawMap.get(sp) || sp; break;
            }
          }
          if (!isMatch) {
            let best = 0; let bestSp = "";
            for (const sp of sponsorList) {
              const score = tokenSimilarity(normalized, sp);
              if (score > best) { best = score; bestSp = sp; }
            }
            if (best >= 0.80) {
              isMatch = true; method = "fuzzy"; matchedName = sponsorRawMap.get(bestSp) || bestSp;
            }
          }
        }

        // Compute visa likelihood
        let visaLikelihood = "Low";
        if (isMatch) visaLikelihood = "Medium";

        await supabase.from("cached_jobs").update({
          ind_registered_sponsor: isMatch,
          ind_match_method: method,
          ind_matched_name: matchedName,
          visa_likelihood: visaLikelihood,
          company_name_normalized: normalized,
        }).eq("job_id", job.job_id);

        if (isMatch) matched++;
      }

      return new Response(JSON.stringify({
        message: `IND matched ${matched}/${(jobs || []).length} jobs`,
        matched, total: (jobs || []).length,
        sponsors_loaded: allSponsors.length,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "commute") {
      const { origin, mode = "transit" } = await req.json();
      if (!origin) throw new Error("Origin required for commute calculation");
      
      const GOOGLE_MAPS_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
      if (!GOOGLE_MAPS_KEY) throw new Error("GOOGLE_MAPS_API_KEY not configured");

      let jobQuery = supabase.from("cached_jobs")
        .select("job_id, city, work_lat, work_lng")
        .not("city", "is", null)
        .limit(batchSize);
      
      if (daysBack) {
        const cutoff = new Date(Date.now() - daysBack * 86400000).toISOString();
        jobQuery = jobQuery.gte("fetched_at", cutoff);
      }

      const { data: jobs } = await jobQuery;
      if (!jobs || jobs.length === 0) {
        return new Response(JSON.stringify({ message: "No jobs with location", computed: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let computed = 0;
      const batchSizeGM = 25;
      for (let i = 0; i < jobs.length; i += batchSizeGM) {
        const batch = jobs.slice(i, i + batchSizeGM);
        const destinations = batch.map(j => {
          if (j.work_lat && j.work_lng) return `${j.work_lat},${j.work_lng}`;
          return `${j.city}, Netherlands`;
        }).join("|");

        const travelMode = mode === "bicycling" ? "bicycling" : mode === "transit" ? "transit" : "driving";
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin + ", Netherlands")}&destinations=${encodeURIComponent(destinations)}&mode=${travelMode}&key=${GOOGLE_MAPS_KEY}`;
        
        const resp = await fetch(url);
        if (!resp.ok) continue;
        const data = await resp.json();

        if (data.rows?.[0]?.elements) {
          for (let idx = 0; idx < data.rows[0].elements.length; idx++) {
            const el = data.rows[0].elements[idx];
            if (el.status === "OK") {
              await supabase.from("cached_jobs").update({
                commute_distance_km: Math.round((el.distance?.value || 0) / 1000 * 10) / 10,
                commute_time_min: Math.round((el.duration?.value || 0) / 60),
                commute_time_text: el.duration?.text || null,
                commute_mode: travelMode,
                commute_status: "done",
              }).eq("job_id", batch[idx].job_id);
              computed++;
            }
          }
        }
      }

      return new Response(JSON.stringify({
        message: `Computed commute for ${computed}/${jobs.length} jobs`,
        computed, total: jobs.length,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action. Use: status, enrich, ind-match, commute" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("backfill-jobs error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
