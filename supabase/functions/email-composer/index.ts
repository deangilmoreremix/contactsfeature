import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailCompositionRequest {
  contact: {
    id?: string;
    name: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    title: string;
    company: string;
    industry?: string;
  };
  purpose: string;
  tone?: string;
  length?: string;
  includeSignature?: boolean;
  webResearch?: string;
  companyContext?: any[];
  generateImages?: boolean;
  campaignId?: string;
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
      contact,
      purpose,
      tone = "professional",
      length = "medium",
      includeSignature = true,
      webResearch,
      companyContext,
      generateImages = false,
      campaignId,
    }: EmailCompositionRequest = await req.json();

    if (!contact || !purpose) {
      return new Response(
        JSON.stringify({ error: "Contact data and purpose are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const firstName = contact.firstName || contact.name.split(" ")[0];
    const contextInfo = webResearch
      ? `\n\nRecent Research Context:\n${webResearch}`
      : "";

    const lengthGuidelines = {
      short: "Keep the email concise and to the point (50-100 words). Focus on one key message.",
      medium: "Write a balanced email with clear structure (100-200 words). Include introduction, main point, and call to action.",
      long: "Write a comprehensive email (200-350 words). Include detailed context, multiple points, and thorough explanation.",
    };

    const toneGuidelines = {
      professional:
        "Use formal business language, maintain respectful distance, focus on value and professionalism.",
      friendly:
        "Use warm, approachable language while maintaining professionalism. Be conversational and personable.",
      formal:
        "Use highly formal language, traditional business etiquette, and conservative phrasing.",
      casual:
        "Use relaxed, informal language as if speaking to a colleague. Be authentic and conversational.",
    };

    const purposeGuidelines = {
      introduction:
        "First outreach - establish credibility, show you've done research, provide clear value proposition, low-pressure ask.",
      "follow-up":
        "Reference previous interaction, provide update or additional value, gentle nudge towards next step.",
      proposal:
        "Present solution clearly, highlight benefits, address potential concerns, strong call to action.",
      "meeting-request":
        "Clear purpose for meeting, specific time suggestions, show respect for their time.",
      "thank-you":
        "Express genuine gratitude, reference specific points, suggest next steps if appropriate.",
      "check-in":
        "Maintain relationship, provide value, no heavy ask, keep door open.",
    };

    const systemPrompt = `You are an expert B2B sales email copywriter with deep expertise in personalized outreach. Your emails are known for:
- High response rates due to personalization and relevance
- Clear, compelling value propositions
- Natural, conversational tone that builds trust
- Strategic use of social proof and credibility markers
- Strong but not pushy calls to action

Guidelines:
- Tone: ${toneGuidelines[tone as keyof typeof toneGuidelines] || toneGuidelines.professional}
- Length: ${lengthGuidelines[length as keyof typeof lengthGuidelines] || lengthGuidelines.medium}
- Purpose: ${purposeGuidelines[purpose as keyof typeof purposeGuidelines] || "General business communication"}

Return ONLY valid JSON with this exact structure:
{
  "subject": "compelling subject line (40-60 characters)",
  "body": "email body with proper formatting and line breaks"
}`;

    const userPrompt = `Generate a ${tone} ${purpose} email for this contact:

Contact Information:
- Name: ${contact.name}
- Title: ${contact.title}
- Company: ${contact.company}
- Industry: ${contact.industry || "Not specified"}
- Email: ${contact.email || "Not provided"}
${contextInfo}

Requirements:
1. Use compelling, specific subject line that ${purpose === "introduction" ? "piques curiosity" : purpose === "follow-up" ? "references previous interaction" : "clearly states purpose"}
2. Personalized greeting using "${firstName}"
3. ${purpose === "introduction" ? "Show you've researched their company" : purpose === "follow-up" ? "Reference previous conversation naturally" : purpose === "proposal" ? "Lead with main benefit" : "State purpose clearly"}
4. Demonstrate understanding of their role/industry challenges
5. ${webResearch ? "Incorporate recent company news or developments" : "Include relevant context"}
6. Clear, specific call-to-action
7. ${includeSignature ? "Professional sign-off with placeholders: [Your Name], [Your Title], [Your Company], [Your Contact]" : "Simple closing"}

${length === "short" ? "Be extremely concise - every word must add value." : length === "long" ? "Provide thorough detail while maintaining engagement." : "Balance detail with brevity."}

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
          temperature: tone === "creative" || tone === "casual" ? 0.7 : 0.4,
          max_tokens: length === "long" ? 800 : length === "medium" ? 500 : 300,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${errorData}`);
    }

    const openaiData = await openaiResponse.json();
    const content = JSON.parse(
      openaiData.choices[0].message.content
    );

    let generatedImages: any[] = [];

    // Generate email banner images if requested
    if (generateImages) {
      try {
        const imageResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/gemini-image-generator`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('Authorization') || '',
          },
          body: JSON.stringify({
            prompt: `Create a professional email banner for ${contact.company} ${purpose} campaign. ${tone} style, suitable for email headers. Company: ${contact.company}, Industry: ${contact.industry || 'general'}. Make it visually appealing and brand-appropriate.`,
            variants: 2,
            aspect_ratio: '3:1',
            contact_id: contact.id,
            agent_id: 'email-composer',
            feature: 'email-banners',
            format: 'banner'
          })
        });

        if (imageResponse.ok) {
          const imageResult = await imageResponse.json();
          if (imageResult.success) {
            generatedImages = imageResult.images;
          }
        }
      } catch (imageError) {
        console.warn('Email banner generation failed:', imageError);
        // Continue without images - don't fail the whole request
      }
    }

    const result = {
      subject: content.subject,
      body: content.body,
      purpose,
      tone,
      confidence: 90,
      model: "gpt-4o",
      webResearchUsed: !!webResearch,
      sources: companyContext || [],
      images: generatedImages,
      bannerImageUrl: generatedImages.length > 0 ? generatedImages[0].url : null,
    };

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Email composition failed:", error);
    return new Response(
      JSON.stringify({
        error: "Email composition failed",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
