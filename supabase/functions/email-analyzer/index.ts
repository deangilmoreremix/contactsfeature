import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createResponse, resolveModel } from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailAnalysisRequest {
  emailSubject: string;
  emailBody: string;
  context?: string;
  recipient?: {
    name: string;
    title: string;
    company: string;
    industry?: string;
  };
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
      emailSubject,
      emailBody,
      context,
      recipient,
    }: EmailAnalysisRequest = await req.json();

    if (!emailSubject || !emailBody) {
      return new Response(
        JSON.stringify({ error: "Email subject and body are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const recipientContext = recipient
      ? `\n\nRecipient Context:\n- Name: ${recipient.name}\n- Title: ${recipient.title}\n- Company: ${recipient.company}\n- Industry: ${recipient.industry || "Not specified"}`
      : "";

    const additionalContext = context
      ? `\n\nAdditional Context:\n${context}`
      : "";

    const systemPrompt = `You are an expert email analyst specializing in B2B sales communication. You analyze emails for:
- Effectiveness and engagement potential
- Tone and sentiment appropriateness
- Structure and clarity
- Call-to-action strength
- Response likelihood
- Areas for improvement

Provide detailed, actionable analysis that helps improve email performance.

Score tones and quality honestly from the email text alone; do not claim knowledge of the recipient's actual behavior.`;

    const userPrompt = `Analyze this email comprehensively:

Subject: ${emailSubject}

Body:
${emailBody}
${recipientContext}
${additionalContext}

Provide detailed analysis covering:
1. (Metrics are computed separately; do not return them)
2. **Tone Analysis**: Score the email on formal, friendly, persuasive, urgent, and informative tones (0-100 each, total should be ~100)
3. **Dominant Tone**: Identify the primary tone
4. **Quality Score**: Overall email quality (0-100) based on clarity, structure, personalization, and effectiveness
5. **Response Likelihood**: Probability recipient will respond (0-100) based on engagement factors
6. **Improvements**: List 3-6 specific, actionable improvements with types (issue, suggestion, structural, subject)
7. **Assessment**: Provide 2-3 sentence overall assessment
8. **Confidence**: Your confidence in this analysis (0-100)

Consider:
- Subject line effectiveness (length, clarity, curiosity)
- Email structure (greeting, body, CTA, closing)
- Personalization level
- Call-to-action clarity and strength
- Length appropriateness
- Professionalism vs. approachability balance
- Grammar and clarity
- Likelihood to prompt response`;

    const ai = await createResponse({
      role: "default",
      effort: "low",
      instructions: systemPrompt,
      input: userPrompt,
      schemaName: "email_analysis",
      maxOutputTokens: 3000,
      schema: {
        type: "object",
        properties: {
          toneAnalysis: {
            type: "object",
            properties: {
              formal: { type: "number" },
              friendly: { type: "number" },
              persuasive: { type: "number" },
              urgent: { type: "number" },
              informative: { type: "number" },
            },
          },
          dominantTone: { type: "string", enum: ["formal", "friendly", "persuasive", "urgent", "informative"] },
          qualityScore: { type: "number" },
          responseLikelihood: { type: "number" },
          improvements: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["issue", "suggestion", "structural", "subject"] },
                description: { type: "string" },
              },
            },
          },
          assessment: { type: "string" },
          confidence: { type: "number" },
        },
      },
    });
    if (!ai.json) throw new Error("AI returned no structured analysis");
    const analysis = ai.json;

    // Deterministic metrics (computed in code, not by the model)
    const words = emailBody.trim().split(/\s+/).filter(Boolean);
    const sentences = emailBody.split(/[.!?]+(?:\s|$)/).filter((s: string) => s.trim().length > 0);
    const paragraphs = emailBody.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0);
    const metrics = {
      wordCount: words.length,
      sentenceCount: sentences.length,
      avgSentenceLength: sentences.length ? Math.round((words.length / sentences.length) * 10) / 10 : 0,
      paragraphCount: paragraphs.length,
      subjectLength: emailSubject.length,
    };

    const result = {
      metrics,
      toneAnalysis: analysis.toneAnalysis,
      dominantTone: analysis.dominantTone,
      qualityScore: analysis.qualityScore,
      responseLikelihood: analysis.responseLikelihood,
      improvements: analysis.improvements,
      assessment: analysis.assessment,
      confidence: analysis.confidence,
      model: resolveModel("default").model,
    };

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Email analysis failed:", error);
    return new Response(
      JSON.stringify({
        error: "Email analysis failed",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
