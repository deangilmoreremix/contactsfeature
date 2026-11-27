import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { respondDual } from "../_shared/openai.ts";

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
    const body = await req.json();
    const { task, dealId, workspaceId: _workspaceId, options = {} } = body;

    if (!task || typeof task !== "string") {
      return new Response(JSON.stringify({ error: "task is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return await respondDual({
      req, body, headers: corsHeaders,
      options: {
        role: "fast",
        instructions: "You are a sales deal assistant. Complete the requested task concisely and concretely.",
        input: `Perform task ${task} for deal ${dealId ?? "(none)"}. Options: ${JSON.stringify(options)}`,
        maxOutputTokens: 2000,
      },
      finalize: async (ai) => {

        return { result: ai.text };
      },
    });
  } catch (error) {
    console.error("execute-deal-ai failed:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
