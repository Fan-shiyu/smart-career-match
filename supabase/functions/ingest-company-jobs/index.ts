import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Company {
  id: string;
  company_name: string;
  company_name_normalized: string;
  ats_type: string;
  ats_identifier: string;
  careers_url: string;
  ingestion_frequency_minutes: number;
  last_ingested_at: string | null;
  country: string;
}

interface GreenhouseJob {
  id: number;
  title: string;
  updated_at: string;
  location: { name: string };
  absolute_url: string;
  content: string;
}

interface LeverJob {
  id: string;
  text: string;
  createdAt: number;
  categories: { location?: string; team?: string };
  hostedUrl: string;
  applyUrl: string;
  descriptionPlain: string;
}

function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(b\.?v\.?|n\.?v\.?|ltd\.?|inc\.?|gmbh|ag|se|plc)\b/gi, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

function parseLocation(locationStr: string): { city: string; country: string } {
  if (!locationStr) return { city: "", country: "" };
  const parts = locationStr.split(",").map((s) => s.trim());
  if (parts.length >= 2) {
    return { city: parts[0], country: parts[parts.length - 1] };
  }
  return { city: parts[0], country: "" };
}

async function fetchGreenhouseJobs(company: Company): Promise<any[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${company.ats_identifier}/jobs?content=true`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Greenhouse API error ${resp.status}: ${text}`);
  }
  const data = await resp.json();
  const jobs: GreenhouseJob[] = data.jobs || [];

  return jobs.map((j) => {
    const loc = parseLocation(j.location?.name || "");
    return {
      job_id: `gh_${company.ats_identifier}_${j.id}`,
      company_id: company.id,
      source: "company_direct",
      source_job_id: String(j.id),
      job_url: j.absolute_url,
      apply_url: j.absolute_url,
      job_title: j.title,
      location_raw: j.location?.name || "",
      country: loc.country || company.country,
      city: loc.city,
      date_posted: j.updated_at?.split("T")[0] || null,
      job_description_raw: j.content || "",
      job_description_source: "api_full",
      raw_json: j,
      company_name: company.company_name,
      company_name_normalized: company.company_name_normalized,
    };
  });
}

async function fetchLeverJobs(company: Company): Promise<any[]> {
  const url = `https://api.lever.co/v0/postings/${company.ats_identifier}?mode=json`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Lever API error ${resp.status}: ${text}`);
  }
  const jobs: LeverJob[] = await resp.json();

  return jobs.map((j) => {
    const locStr = j.categories?.location || "";
    const loc = parseLocation(locStr);
    return {
      job_id: `lv_${company.ats_identifier}_${j.id}`,
      company_id: company.id,
      source: "company_direct",
      source_job_id: j.id,
      job_url: j.hostedUrl,
      apply_url: j.applyUrl || j.hostedUrl,
      job_title: j.text,
      location_raw: locStr,
      country: loc.country || company.country,
      city: loc.city,
      date_posted: j.createdAt ? new Date(j.createdAt).toISOString().split("T")[0] : null,
      job_description_raw: j.descriptionPlain || "",
      job_description_source: "api_full",
      raw_json: j,
      company_name: company.company_name,
      company_name_normalized: company.company_name_normalized,
    };
  });
}

async function ingestCompany(
  supabase: any,
  company: Company
): Promise<{ found: number; inserted: number; error?: string }> {
  let jobs: any[] = [];

  try {
    switch (company.ats_type) {
      case "greenhouse":
        jobs = await fetchGreenhouseJobs(company);
        break;
      case "lever":
        jobs = await fetchLeverJobs(company);
        break;
      default:
        return { found: 0, inserted: 0, error: `Unsupported ATS type: ${company.ats_type}` };
    }
  } catch (e) {
    return { found: 0, inserted: 0, error: e instanceof Error ? e.message : String(e) };
  }

  let inserted = 0;

  // Batch upsert in chunks of 50
  for (let i = 0; i < jobs.length; i += 50) {
    const batch = jobs.slice(i, i + 50);
    const { error } = await supabase
      .from("company_jobs")
      .upsert(batch, { onConflict: "job_id" });

    if (error) {
      console.error(`Upsert error for ${company.company_name}:`, error);
    } else {
      inserted += batch.length;
    }
  }

  // Mark jobs not in this batch as inactive
  const currentJobIds = jobs.map((j) => j.job_id);
  if (currentJobIds.length > 0) {
    await supabase
      .from("company_jobs")
      .update({ is_active: false })
      .eq("company_id", company.id)
      .eq("is_active", true)
      .not("job_id", "in", `(${currentJobIds.join(",")})`);
  }

  // Update company last_ingested_at
  await supabase
    .from("companies")
    .update({ last_ingested_at: new Date().toISOString() })
    .eq("id", company.id);

  return { found: jobs.length, inserted };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse optional body params
    let companyId: string | null = null;
    let forceAll = false;
    try {
      const body = await req.json();
      companyId = body.companyId || null;
      forceAll = body.forceAll || false;
    } catch {
      // No body = run all due companies
    }

    // Fetch companies due for ingestion
    let query = supabase
      .from("companies")
      .select("*")
      .in("ats_type", ["greenhouse", "lever"])
      .eq("ingestion_status", "active");

    if (companyId) {
      query = query.eq("id", companyId);
    }

    const { data: companies, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;

    const now = new Date();
    const dueCompanies = (companies || []).filter((c: Company) => {
      if (forceAll || companyId) return true;
      if (!c.last_ingested_at) return true;
      const lastIngested = new Date(c.last_ingested_at);
      const diffMinutes = (now.getTime() - lastIngested.getTime()) / 60000;
      return diffMinutes >= c.ingestion_frequency_minutes;
    });

    console.log(`Found ${dueCompanies.length} companies due for ingestion`);

    const results: any[] = [];
    let consecutiveFailures: Record<string, number> = {};

    for (const company of dueCompanies) {
      const startTime = Date.now();
      const result = await ingestCompany(supabase, company);
      const duration = Date.now() - startTime;

      // Log the run
      const logStatus = result.error ? "failed" : result.found > 0 ? "success" : "partial";
      await supabase.from("ingestion_logs").insert({
        company_id: company.id,
        status: logStatus,
        jobs_found: result.found,
        jobs_inserted: result.inserted,
        duration_ms: duration,
        error_message: result.error || null,
      });

      // Track consecutive failures
      if (result.error) {
        consecutiveFailures[company.id] = (consecutiveFailures[company.id] || 0) + 1;
        if (consecutiveFailures[company.id] >= 3) {
          await supabase
            .from("companies")
            .update({ ingestion_status: "error" })
            .eq("id", company.id);
        }
      }

      results.push({
        company: company.company_name,
        ...result,
        duration_ms: duration,
      });

      console.log(`${company.company_name}: ${result.found} found, ${result.inserted} inserted, ${duration}ms${result.error ? ` ERROR: ${result.error}` : ""}`);
    }

    return new Response(
      JSON.stringify({
        companiesProcessed: dueCompanies.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Ingestion error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
