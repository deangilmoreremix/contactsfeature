import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createResponse, resolveModel } from "../_shared/openai.ts";
import { generateImages } from "../_shared/images.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AIAERequest {
  deal_id?: string;
  contact_id?: string;
  action: string;
  generate_images?: boolean;
  custom_prompt?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const {
      deal_id,
      contact_id,
      action,
      generate_images = false,
      custom_prompt,
    }: AIAERequest = await req.json();

    if (!action) {
      return new Response(
        JSON.stringify({ error: "Action is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get deal and contact context if provided
    let dealContext = null;
    let contactContext = null;

    if (deal_id) {
      // In a real implementation, fetch deal data from database
      dealContext = { id: deal_id };
    }

    if (contact_id) {
      // In a real implementation, fetch contact data from database
      contactContext = { id: contact_id };
    }

    const systemPrompt = `You are an expert AI Account Executive assistant. You help sales professionals manage deals, create compelling presentations, and close more business.

Your capabilities include:
- Deal analysis and strategy recommendations
- Objection handling
- Presentation content creation
- Demo preparation
- Competitive intelligence
- Customer success planning

Always provide actionable, specific recommendations based on sales best practices. Be confident but realistic in your assessments. Focus on value creation for both the customer and the sales organization.

Return recommendations, next steps, risks, a confidence level (high|medium|low) and a deal_health_score from 1 to 100. Base the assessment only on the information provided; do not invent deal facts.`;

    const userPrompt = `Action requested: ${action}

${deal_id ? `Deal ID: ${deal_id}` : ''}
${contact_id ? `Contact ID: ${contact_id}` : ''}
${custom_prompt ? `Additional context: ${custom_prompt}` : ''}

Please provide comprehensive recommendations for this sales scenario. Focus on:
1. Immediate tactical recommendations
2. Strategic positioning
3. Risk mitigation
4. Timeline and milestones
5. Success metrics

Be specific and actionable in your response.`;

    const ai = await createResponse({
      role: "thinking",
      effort: "medium",
      instructions: systemPrompt,
      input: userPrompt,
      schemaName: "ai_ae_recommendations",
      maxOutputTokens: 4000,
      schema: {
        type: "object",
        properties: {
          recommendations: { type: "array", items: { type: "string" } },
          next_steps: { type: "array", items: { type: "string" } },
          risks: { type: "array", items: { type: "string" } },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          deal_health_score: { type: "number" },
        },
      },
    });
    if (!ai.json) throw new Error("AI returned no structured result");
    const content = ai.json;

    let generatedImages: { url: string; mime_type: string }[] = [];
    let imageError: string | null = null;

    // Generate demo visuals if requested (failure does not fail the whole request)
    if (generate_images) {
      const gen = await generateImages(
        req.headers.get("Authorization"),
        custom_prompt || `Create professional demo visuals for ${action}. Business presentation style, modern design, suitable for sales demos.`,
        3,
      );
      generatedImages = gen.images;
      imageError = gen.error;
    }

    const result = {
      ...content,
      images: generatedImages,
      image_error: imageError,
      demo_visual_url: generatedImages.length > 0 ? generatedImages[0].url : null,
      action_performed: action,
      model: resolveModel("thinking").model,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("AI AE Agent failed:", error);
    return new Response(
      JSON.stringify({
        error: "AI AE Agent request failed",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});