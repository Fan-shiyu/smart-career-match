import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch the IND public register page for Regular Labour and Highly Skilled Migrants
    console.log("Fetching IND sponsor list...");
    const resp = await fetch(
      "https://ind.nl/en/public-register-recognised-sponsors/public-register-regular-labour-and-highly-skilled-migrants"
    );

    if (!resp.ok) {
      throw new Error(`Failed to fetch IND page: ${resp.status}`);
    }

    const html = await resp.text();

    // Parse the HTML table - company names are in <th> inside <tbody> <tr>
    // Structure: <tr><th>Company Name</th><td>KvK number</td></tr>
    const companies: { company_name: string; company_name_normalized: string }[] = [];

    // Extract tbody content first
    const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
    if (tbodyMatch) {
      const tbody = tbodyMatch[1];
      // Match each row's first <th> which contains the company name
      const rowRegex = /<tr>\s*<th>(.*?)<\/th>/gs;
      let match;
      while ((match = rowRegex.exec(tbody)) !== null) {
        const rawName = match[1]
          .replace(/<[^>]*>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&nbsp;/g, " ")
          .trim();

        if (rawName && rawName.length > 1) {
          const normalized = rawName
            .toLowerCase()
            .replace(/\b(b\.?v\.?|n\.?v\.?|ltd\.?|inc\.?|gmbh|ag|s\.?a\.?|plc|llc|co\.?|corp\.?|holding|group|international|netherlands|nederland)\b/gi, "")
            .replace(/[^\w\s]/g, "")
            .replace(/\s+/g, " ")
            .trim();
          companies.push({
            company_name: rawName,
            company_name_normalized: normalized || rawName.toLowerCase().trim(),
          });
        }
      }
    }

    console.log(`Parsed ${companies.length} companies from IND register`);

    if (companies.length === 0) {
      throw new Error("Could not parse any companies from IND page");
    }

    // Clear existing data and insert fresh
    console.log("Clearing existing IND sponsors...");
    await supabase.from("ind_sponsors").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Insert in batches of 500
    const batchSize = 500;
    let inserted = 0;
    for (let i = 0; i < companies.length; i += batchSize) {
      const batch = companies.slice(i, i + batchSize);
      const { error } = await supabase.from("ind_sponsors").insert(batch);
      if (error) {
        console.error(`Batch insert error at ${i}:`, error);
      } else {
        inserted += batch.length;
      }
    }

    console.log(`Successfully inserted ${inserted} IND sponsors`);

    return new Response(
      JSON.stringify({
        success: true,
        total_parsed: companies.length,
        total_inserted: inserted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("sync-ind-sponsors error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
