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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Send file content to AI for extraction
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
              content: `You are a CV/resume parser. Extract structured information from the provided CV text. Be accurate and do not hallucinate. If information is not found, use null or empty arrays.`,
            },
            {
              role: "user",
              content: `Parse this CV and extract the candidate's profile:\n\n${atob(fileBase64)}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_profile",
                description:
                  "Extract structured candidate profile from a CV",
                parameters: {
                  type: "object",
                  properties: {
                    hard_skills: {
                      type: "array",
                      items: { type: "string" },
                      description:
                        "Technical/hard skills (e.g. React, Python, SQL)",
                    },
                    software_tools: {
                      type: "array",
                      items: { type: "string" },
                      description:
                        "Software tools and platforms (e.g. Docker, AWS, Jira)",
                    },
                    years_experience: {
                      type: "integer",
                      description: "Total years of professional experience",
                    },
                    education_level: {
                      type: "string",
                      description:
                        "Highest education level (e.g. Bachelor's, Master's, PhD)",
                    },
                    languages: {
                      type: "array",
                      items: { type: "string" },
                      description: "Spoken languages",
                    },
                    seniority: {
                      type: "string",
                      enum: ["Junior", "Mid", "Senior", "Lead", "Manager"],
                      description: "Estimated seniority level",
                    },
                  },
                  required: [
                    "hard_skills",
                    "software_tools",
                    "years_experience",
                    "education_level",
                    "languages",
                    "seniority",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "extract_profile" },
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("AI did not return structured profile");
    }

    const profile = JSON.parse(toolCall.function.arguments);

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
