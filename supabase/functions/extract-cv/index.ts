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

    // Decode base64 to raw bytes for PDF support
    const binaryData = Uint8Array.from(atob(fileBase64), c => c.charCodeAt(0));
    
    // Determine MIME type
    const isPdf = fileName?.toLowerCase().endsWith(".pdf") || 
      (binaryData[0] === 0x25 && binaryData[1] === 0x50); // %P magic bytes
    const mimeType = isPdf ? "application/pdf" : "text/plain";

    // Build request parts - use inline_data for PDFs, text for plain text
    const contentParts: any[] = [];
    if (isPdf) {
      contentParts.push({
        inlineData: { mimeType, data: fileBase64 },
      });
    } else {
      contentParts.push({ text: new TextDecoder().decode(binaryData) });
    }
    contentParts.push({
      text: `You are a thorough CV/resume parser. Your goal is to extract as much relevant information as possible from this CV.

EXTRACTION GUIDELINES:
- Extract ALL technical skills, programming languages, frameworks, and methodologies mentioned anywhere in the CV — in job descriptions, project sections, skills sections, summaries, or education.
- Extract ALL software tools and platforms mentioned (e.g. Docker, AWS, Jira, Figma, Slack, Git, VS Code, etc.).
- For years_experience: calculate from employment dates if available. If the CV states "X years of experience", use that number. If unclear, estimate from the earliest job date to now.
- For seniority: determine from the most recent/senior job title. Use "Junior" for entry-level, "Mid" for standard roles, "Senior" for senior titles, "Lead" for lead/principal, "Manager" for management.
- For education_level: extract the highest degree mentioned (e.g. "Bachelor's", "Master's", "PhD", "High School"). If certifications are listed but no degree, return "Certification".
- For languages: extract all spoken/written languages mentioned. If the CV is written in English, include "English". If other language sections or proficiency levels are listed, include those languages.
- Include skills that are clearly implied by job context (e.g. if someone was a "React Developer", include "React" and "JavaScript").
- Be thorough — it's better to include a skill that was mentioned than to miss it.

Parse this CV and extract a complete profile:`,
    });

    // Call Gemini API with function calling
    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: contentParts,
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
            temperature: 0.2,
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
