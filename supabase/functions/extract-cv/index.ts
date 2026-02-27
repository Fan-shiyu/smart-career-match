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
    const { fileBase64, fileName } = await req.json();
    if (!fileBase64) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GOOGLE_GEMINI_API_KEY not configured");

    const cvText = atob(fileBase64);

    // Call Gemini API directly with function calling
    const aiResponse = await fetch(
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
                  text: `You are a strict CV/resume parser. Extract ONLY information that is EXPLICITLY stated in the CV text.

CRITICAL RULES:
- NEVER infer, guess, or add skills/tools/languages that are not directly mentioned in the CV.
- If a skill or tool is not written in the CV, do NOT include it — even if it seems related or commonly paired with other listed skills.
- For years_experience: calculate ONLY from actual employment dates listed. If unclear, use 0.
- For seniority: determine ONLY from job titles explicitly stated. If unclear, use "Mid".
- For education_level: extract ONLY the degree explicitly mentioned. If none, use null.
- For languages: list ONLY languages explicitly mentioned. Do NOT assume English or any other language.
- Return empty arrays rather than guessing. Accuracy is more important than completeness.

Extract ONLY explicitly mentioned information from this CV:\n\n${cvText}`,
                },
              ],
            },
          ],
          tools: [
            {
              functionDeclarations: [
                {
                  name: "extract_profile",
                  description: "Extract structured candidate profile from a CV. Only include explicitly mentioned information.",
                  parameters: {
                    type: "OBJECT",
                    properties: {
                      hard_skills: {
                        type: "ARRAY",
                        items: { type: "STRING" },
                        description: "Technical/hard skills explicitly mentioned (e.g. React, Python, SQL)",
                      },
                      software_tools: {
                        type: "ARRAY",
                        items: { type: "STRING" },
                        description: "Software tools and platforms explicitly mentioned (e.g. Docker, AWS, Jira)",
                      },
                      years_experience: {
                        type: "INTEGER",
                        description: "Total years of professional experience calculated from employment dates",
                      },
                      education_level: {
                        type: "STRING",
                        description: "Highest education level explicitly mentioned (e.g. Bachelor's, Master's, PhD)",
                      },
                      languages: {
                        type: "ARRAY",
                        items: { type: "STRING" },
                        description: "Spoken languages explicitly mentioned",
                      },
                      seniority: {
                        type: "STRING",
                        description: "Seniority level based on job titles: Junior, Mid, Senior, Lead, or Manager",
                      },
                    },
                    required: ["hard_skills", "software_tools", "years_experience", "education_level", "languages", "seniority"],
                  },
                },
              ],
            },
          ],
          toolConfig: {
            functionCallingConfig: {
              mode: "ANY",
              allowedFunctionNames: ["extract_profile"],
            },
          },
          generationConfig: {
            temperature: 0,
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("Gemini API error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Gemini API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("Gemini response structure:", JSON.stringify(aiData).substring(0, 500));

    // Extract function call result from Gemini response
    const functionCall = aiData.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.functionCall
    )?.functionCall;

    if (!functionCall) {
      throw new Error("Gemini did not return structured profile");
    }

    const profile = functionCall.args;

    // Save to database
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: saved, error: dbError } = await supabase
      .from("candidate_profiles")
      .insert({
        file_name: fileName || "cv.pdf",
        hard_skills: profile.hard_skills || [],
        software_tools: profile.software_tools || [],
        years_experience: profile.years_experience,
        education_level: profile.education_level,
        languages: profile.languages || [],
        seniority: profile.seniority,
      })
      .select()
      .single();

    if (dbError) {
      console.error("DB error:", dbError);
      throw new Error("Failed to save profile");
    }

    return new Response(JSON.stringify({ profile: saved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-cv error:", e);
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
