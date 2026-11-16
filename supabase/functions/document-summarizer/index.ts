import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { resolveModel, respondDual, MODEL_ROLES } from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SummarizationRequest {
  fileName: string;
  text: string;
  context?: {
    contactName?: string;
    companyName?: string;
  };
  model?: string;
}

interface SummarizationResponse {
  summary: string;
  keyPoints: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  model: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();
    const { fileName, text, context, model: requestedRole }: SummarizationRequest = body;

    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({
          error: "No text provided for summarization",
          summary: "No content to summarize",
          keyPoints: [],
          sentiment: "neutral",
          confidence: 0,
          model: "none"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const contextInfo = context
      ? `This document is related to ${context.contactName || 'a contact'}${context.companyName ? ` from ${context.companyName}` : ''}.`
      : '';

    const systemPrompt = `You are a professional document analyst. Analyze the provided document and return a structured summary. ${contextInfo}

Return a concise 2-3 sentence summary, 3-5 key points, the overall sentiment (positive, neutral or negative) and a confidence from 0 to 100.

Guidelines:
- Summary should capture the essence of the document
- Provide 3-5 actionable key points
- Sentiment should reflect the overall tone
- Confidence should reflect how well you understood the content (higher for clear documents)`;

    const userPrompt = `Please analyze this document titled "${fileName}":\n\n${text.substring(0, 10000)}`;

    // Only model roles are accepted from clients; unknown values fall back to the fast role.
    const role = requestedRole && MODEL_ROLES[requestedRole] ? requestedRole : "fast";
    return await respondDual({
      req, body, headers: corsHeaders,
      options: {
        role,
        effort: role === "fast" ? "none" : undefined,
        instructions: systemPrompt,
        input: userPrompt,
        schemaName: "document_summary",
        maxOutputTokens: 2000,
        schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            keyPoints: { type: "array", items: { type: "string" } },
            sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
            confidence: { type: "number" },
          },
        },
      },
      finalize: async (ai) => {

        if (!ai.json) {
          throw new Error("AI returned no structured summary");
        }
        const parsed = ai.json;
        const result: SummarizationResponse = {
          summary: parsed.summary,
          keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
          sentiment: ["positive", "neutral", "negative"].includes(parsed.sentiment) ? parsed.sentiment : "neutral",
          confidence: typeof parsed.confidence === "number" ? Math.min(100, Math.max(0, parsed.confidence)) : 0,
          model: resolveModel(role).model,
        };

        return result;
      },
    });

  } catch (error) {
    console.error("Document summarization error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Summarization failed",
        summary: "Unable to summarize document due to an error",
        keyPoints: [],
        sentiment: "neutral",
        confidence: 0,
        model: "error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
