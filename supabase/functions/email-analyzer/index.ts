import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OpenAI API key not configured");
    }

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

Return ONLY valid JSON with this exact structure:
{
  "metrics": {
    "wordCount": number,
    "sentenceCount": number,
    "avgSentenceLength": number,
    "paragraphCount": number,
    "subjectLength": number
  },
  "toneAnalysis": {
    "formal": number (0-100),
    "friendly": number (0-100),
    "persuasive": number (0-100),
    "urgent": number (0-100),
    "informative": number (0-100)
  },
  "dominantTone": "string (one of: formal, friendly, persuasive, urgent, informative)",
  "qualityScore": number (0-100),
  "responseLikelihood": number (0-100),
  "improvements": [
    {
      "type": "string (issue, suggestion, structural, subject)",
      "description": "specific actionable improvement"
    }
  ],
  "assessment": "overall email assessment in 2-3 sentences",
  "confidence": number (0-100)
}`;

    const userPrompt = `Analyze this email comprehensively:

Subject: ${emailSubject}

Body:
${emailBody}
${recipientContext}
${additionalContext}

Provide detailed analysis covering:
1. **Metrics**: Calculate word count, sentence count, average sentence length, paragraph count, subject length
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
- Likelihood to prompt response

Return ONLY valid JSON, no other text.`;

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 1000,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${errorData}`);
    }

    const openaiData = await openaiResponse.json();
    const analysis = JSON.parse(
      openaiData.choices[0].message.content
    );

    const result = {
      metrics: analysis.metrics,
      toneAnalysis: analysis.toneAnalysis,
      dominantTone: analysis.dominantTone,
      qualityScore: analysis.qualityScore,
      responseLikelihood: analysis.responseLikelihood,
      improvements: analysis.improvements,
      assessment: analysis.assessment,
      confidence: analysis.confidence,
      model: "gpt-4o",
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
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
