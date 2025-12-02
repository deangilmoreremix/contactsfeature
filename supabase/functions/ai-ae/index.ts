import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OpenAI API key not configured");
    }

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

Return responses in this JSON format:
{
  "recommendations": ["array of specific, actionable recommendations"],
  "next_steps": ["immediate next steps to take"],
  "risks": ["potential risks to be aware of"],
  "confidence": "high|medium|low",
  "deal_health_score": 1-100
}`;

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
          temperature: 0.7,
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
    const content = JSON.parse(openaiData.choices[0].message.content);

    let generatedImages: any[] = [];

    // Generate demo visuals if requested
    if (generate_images) {
      try {
        const imageResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/gemini-image-generator`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('Authorization') || '',
          },
          body: JSON.stringify({
            prompt: custom_prompt || `Create professional demo visuals for ${action}. Business presentation style, modern design, suitable for sales demos.`,
            variants: 3,
            aspect_ratio: '16:9',
            deal_id,
            contact_id,
            agent_id: 'ai-ae-agent',
            feature: 'demo-visuals',
            format: 'presentation'
          })
        });

        if (imageResponse.ok) {
          const imageResult = await imageResponse.json();
          if (imageResult.success) {
            generatedImages = imageResult.images;
          }
        }
      } catch (imageError) {
        console.warn('Demo visual generation failed:', imageError);
        // Continue without images - don't fail the whole request
      }
    }

    const result = {
      ...content,
      images: generatedImages,
      demo_visual_url: generatedImages.length > 0 ? generatedImages[0].url : null,
      action_performed: action,
      model: "gpt-4o",
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