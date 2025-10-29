import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    if (req.method === "GET") {
      const url = new URL(req.url);
      const category = url.searchParams.get("category");

      let query = supabaseClient
        .from("email_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (category && category !== "all") {
        query = query.eq("category", category);
      }

      const { data: templates, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch templates: ${error.message}`);
      }

      return new Response(
        JSON.stringify({
          templates: templates || [],
          count: templates?.length || 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (req.method === "POST") {
      const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
      const {
        action,
        templateData,
        aiGenerate,
        category,
        purpose,
      } = await req.json();

      if (action === "generate" && aiGenerate && openaiApiKey) {
        const systemPrompt = `You are an expert email template designer for B2B sales. Create professional, reusable email templates with:
- Clear, engaging subject lines
- Proper variable placeholders (use {{variable_name}} format)
- Professional structure (greeting, body, CTA, closing)
- Flexibility for personalization
- Industry best practices

Return ONLY valid JSON with this exact structure:
{
  "name": "template name",
  "description": "brief template description",
  "category": "${category || "general"}",
  "subject": "subject with {{variables}}",
  "body": "body content with {{variables}} and proper formatting",
  "variables": ["array", "of", "variable", "names"]
}`;

        const userPrompt = `Create a professional email template for: ${purpose || category || "general business communication"}

Template should:
1. Include appropriate variable placeholders for personalization
2. Have a compelling subject line
3. Be structured for ${category || "general"} emails
4. Include common variables like {{first_name}}, {{company_name}}, {{sender_name}}
5. Be professional yet approachable
6. Include a clear call-to-action
7. List all variables used in the "variables" array

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
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              temperature: 0.7,
              max_tokens: 800,
              response_format: { type: "json_object" },
            }),
          }
        );

        if (!openaiResponse.ok) {
          const errorData = await openaiResponse.text();
          throw new Error(`OpenAI API error: ${errorData}`);
        }

        const openaiData = await openaiResponse.json();
        const generatedTemplate = JSON.parse(
          openaiData.choices[0].message.content
        );

        const { data: user } = await supabaseClient.auth.getUser();

        const { data: newTemplate, error: insertError } = await supabaseClient
          .from("email_templates")
          .insert({
            user_id: user?.user?.id,
            name: generatedTemplate.name,
            description: generatedTemplate.description,
            category: generatedTemplate.category,
            subject: generatedTemplate.subject,
            body: generatedTemplate.body,
            variables: generatedTemplate.variables,
            is_default: false,
            is_ai_generated: true,
            model: "gpt-4o-mini",
          })
          .select()
          .single();

        if (insertError) {
          throw new Error(`Failed to save template: ${insertError.message}`);
        }

        return new Response(
          JSON.stringify({
            success: true,
            template: newTemplate,
            aiGenerated: true,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (action === "create" && templateData) {
        const { data: user } = await supabaseClient.auth.getUser();

        const { data: newTemplate, error: insertError } = await supabaseClient
          .from("email_templates")
          .insert({
            user_id: user?.user?.id,
            name: templateData.name,
            description: templateData.description,
            category: templateData.category || "general",
            subject: templateData.subject,
            body: templateData.body,
            variables: templateData.variables || [],
            is_default: false,
            is_ai_generated: false,
          })
          .select()
          .single();

        if (insertError) {
          throw new Error(`Failed to create template: ${insertError.message}`);
        }

        return new Response(
          JSON.stringify({
            success: true,
            template: newTemplate,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      throw new Error("Invalid action or missing required data");
    }

    if (req.method === "PUT") {
      const { templateId, templateData } = await req.json();

      if (!templateId || !templateData) {
        throw new Error("Template ID and data are required");
      }

      const { data: updatedTemplate, error: updateError } =
        await supabaseClient
          .from("email_templates")
          .update({
            name: templateData.name,
            description: templateData.description,
            category: templateData.category,
            subject: templateData.subject,
            body: templateData.body,
            variables: templateData.variables,
            updated_at: new Date().toISOString(),
          })
          .eq("id", templateId)
          .select()
          .single();

      if (updateError) {
        throw new Error(`Failed to update template: ${updateError.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          template: updatedTemplate,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (req.method === "DELETE") {
      const { templateId } = await req.json();

      if (!templateId) {
        throw new Error("Template ID is required");
      }

      const { error: deleteError } = await supabaseClient
        .from("email_templates")
        .delete()
        .eq("id", templateId);

      if (deleteError) {
        throw new Error(`Failed to delete template: ${deleteError.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          deletedId: templateId,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    throw new Error(`Unsupported method: ${req.method}`);
  } catch (error) {
    console.error("Email templates operation failed:", error);
    return new Response(
      JSON.stringify({
        error: "Operation failed",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
