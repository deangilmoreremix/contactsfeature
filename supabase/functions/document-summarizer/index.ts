import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({
          error: "OpenAI API key not configured",
          summary: "Unable to summarize document - API key not available",
          keyPoints: [],
          sentiment: "neutral",
          confidence: 0,
          model: "none"
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { fileName, text, context, model = "gpt-4o-mini" }: SummarizationRequest = await req.json();

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

Your response must be valid JSON with exactly this structure:
{
  "summary": "A concise 2-3 sentence summary of the document's main content and purpose",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3", "Key point 4", "Key point 5"],
  "sentiment": "positive" | "neutral" | "negative",
  "confidence": 0-100
}

Guidelines:
- Summary should capture the essence of the document
- Provide 3-5 actionable key points
- Sentiment should reflect the overall tone
- Confidence should reflect how well you understood the content (higher for clear documents)`;

    const userPrompt = `Please analyze this document titled "${fileName}":\n\n${text.substring(0, 10000)}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in OpenAI response");
    }

    let result: SummarizationResponse;
    try {
      const parsed = JSON.parse(content);
      result = {
        summary: parsed.summary || "Summary not available",
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
        sentiment: ['positive', 'neutral', 'negative'].includes(parsed.sentiment)
          ? parsed.sentiment
          : 'neutral',
        confidence: typeof parsed.confidence === 'number'
          ? Math.min(100, Math.max(0, parsed.confidence))
          : 75,
        model: model
      };
    } catch {
      result = {
        summary: content.substring(0, 500),
        keyPoints: [],
        sentiment: 'neutral',
        confidence: 50,
        model: model
      };
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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
