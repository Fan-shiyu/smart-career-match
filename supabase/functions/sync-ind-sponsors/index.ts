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

    // Parse the HTML table - extract company names from table rows
    // The page has a table with columns: Organisation | KvK number
    const companies: { company_name: string; company_name_normalized: string }[] = [];

    // Match table rows: look for <td> pairs inside <tr>
    const rowRegex = /<tr[^>]*>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<\/tr>/gs;
    let match;
    while ((match = rowRegex.exec(html)) !== null) {
      const rawName = match[1]
        .replace(/<[^>]*>/g, "") // strip HTML tags
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .trim();

      if (rawName && rawName !== "Organisation" && rawName.length > 1) {
        companies.push({
          company_name: rawName,
          company_name_normalized: rawName.toLowerCase().trim(),
        });
      }
    }

    console.log(`Parsed ${companies.length} companies from IND register`);

    if (companies.length === 0) {
      // Fallback: try a simpler regex for different HTML structure
      const cellRegex = /<td[^>]*class="[^"]*"[^>]*>(.*?)<\/td>/gs;
      const cells: string[] = [];
      let cellMatch;
      while ((cellMatch = cellRegex.exec(html)) !== null) {
        cells.push(
          cellMatch[1]
            .replace(/<[^>]*>/g, "")
            .replace(/&amp;/g, "&")
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .trim()
        );
      }
      // Every other cell is a company name (odd indices are KvK numbers)
      for (let i = 0; i < cells.length; i += 2) {
        const name = cells[i];
        if (name && name !== "Organisation" && name.length > 1) {
          companies.push({
            company_name: name,
            company_name_normalized: name.toLowerCase().trim(),
          });
        }
      }
      console.log(`Fallback parsing found ${companies.length} companies`);
    }

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
