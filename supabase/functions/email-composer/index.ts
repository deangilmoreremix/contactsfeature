import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { resolveModel, respondDual } from "../_shared/openai.ts";
import { generateImages as generateBannerImages } from "../_shared/images.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailCompositionRequest {
  contact?: {
    id?: string;
    name: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    title: string;
    company: string;
    industry?: string;
  };
  purpose?: string;
  /** Accepted aliases from older clients */
  contactData?: EmailCompositionRequest["contact"];
  emailType?: string;
  /** Free-form extra context (object or string) from older clients */
  context?: unknown;
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
    const body: EmailCompositionRequest = await req.json();
    const contact = body.contact ?? body.contactData;
    const purpose = body.purpose ?? body.emailType;
    const {
      tone = "professional",
      length = "medium",
      includeSignature = true,
      webResearch,
      companyContext,
      generateImages = false,
      campaignId: _campaignId,
    } = body;

    if (!contact || !contact.name || !purpose) {
      return new Response(
        JSON.stringify({ error: "Contact data and purpose are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const firstName = contact.firstName || String(contact.name).split(" ")[0];
    const extraContext = body.context
      ? typeof body.context === "string" ? body.context : JSON.stringify(body.context)
      : "";
    const contextInfo = (webResearch ? `\n\nRecent Research Context:\n${webResearch}` : "") +
      (extraContext ? `\n\nAdditional Context:\n${extraContext}` : "");

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

Return a subject line (40-60 characters) and the email body with proper formatting and line breaks. Use only facts given in the prompt; never invent company news, metrics or prior interactions.`;

    const userPrompt = `Generate a ${tone} ${purpose} email for this contact:

Contact Information:
- Name: ${contact.name}
- Title: ${contact.title || "Not specified"}
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

${length === "short" ? "Be extremely concise - every word must add value." : length === "long" ? "Provide thorough detail while maintaining engagement." : "Balance detail with brevity."}`;

    return await respondDual({
      req, body, headers: corsHeaders,
      options: {
        role: "default",
        effort: "low",
        instructions: systemPrompt,
        input: userPrompt,
        schemaName: "email_draft",
        maxOutputTokens: 3000,
        schema: {
          type: "object",
          properties: {
            subject: { type: "string" },
            body: { type: "string" },
          },
        },
      },
      finalize: async (ai) => {
        if (!ai.json) throw new Error("AI returned no structured email");
        const content = ai.json;

        let generatedImages: { url: string; mime_type: string }[] = [];
        let imageError: string | null = null;

        // Generate email banner images if requested (failure does not fail the whole request)
        if (generateImages) {
          const gen = await generateBannerImages(
            req.headers.get("Authorization"),
            `Create a professional email banner for ${contact.company} ${purpose} campaign. ${tone} style, suitable for email headers. Company: ${contact.company}, Industry: ${contact.industry || "general"}. Make it visually appealing and brand-appropriate.`,
            2,
          );
          generatedImages = gen.images;
          imageError = gen.error;
        }

        const result = {
          subject: content.subject,
          body: content.body,
          purpose,
          tone,
          model: resolveModel("default").model,
          webResearchUsed: !!webResearch,
          sources: companyContext || [],
          images: generatedImages,
          imageError,
          bannerImageUrl: generatedImages.length > 0 ? generatedImages[0].url : null,
        };

        return result;
      },
    });
  } catch (error) {
    console.error("Email composition failed:", error);
    return new Response(
      JSON.stringify({
        error: "Email composition failed",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
