import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createResponse } from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { task, dealId, workspaceId: _workspaceId, options = {} } = await req.json();

    if (!task || typeof task !== "string") {
      return new Response(JSON.stringify({ error: "task is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ai = await createResponse({
      role: "fast",
      instructions: "You are a sales deal assistant. Complete the requested task concisely and concretely.",
      input: `Perform task ${task} for deal ${dealId ?? "(none)"}. Options: ${JSON.stringify(options)}`,
      maxOutputTokens: 2000,
    });

    return new Response(JSON.stringify({ result: ai.text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("execute-deal-ai failed:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
