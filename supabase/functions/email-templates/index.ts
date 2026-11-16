import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { createResponse, resolveModel } from "../_shared/openai.ts";

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

    // Listing is supported via GET ?category= and, for supabase.functions.invoke clients, POST { category } with no action.
    let postBody: any = null;
    if (req.method === "POST") postBody = await req.json().catch(() => ({}));
    const isListPost = req.method === "POST" && postBody && !postBody.action && !postBody.templateData && !postBody.aiGenerate;

    if (req.method === "GET" || isListPost) {
      const url = new URL(req.url);
      const category = req.method === "GET" ? url.searchParams.get("category") : postBody.category;

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
      const {
        action,
        templateData,
        aiGenerate,
        category,
        purpose,
      } = postBody;

      if (action === "generate" && aiGenerate) {
        const systemPrompt = `You are an expert email template designer for B2B sales. Create professional, reusable email templates with:
- Clear, engaging subject lines
- Proper variable placeholders (use {{variable_name}} format)
- Professional structure (greeting, body, CTA, closing)
- Flexibility for personalization
- Industry best practices

Return the template name, a brief description, the category "${category || "general"}", a subject with {{variables}}, a body with {{variables}} and proper formatting, and the list of variable names used.`;

        const userPrompt = `Create a professional email template for: ${purpose || category || "general business communication"}

Template should:
1. Include appropriate variable placeholders for personalization
2. Have a compelling subject line
3. Be structured for ${category || "general"} emails
4. Include common variables like {{first_name}}, {{company_name}}, {{sender_name}}
5. Be professional yet approachable
6. Include a clear call-to-action
7. List all variables used in the "variables" array`;

        const ai = await createResponse({
          role: "default",
          effort: "low",
          instructions: systemPrompt,
          input: userPrompt,
          schemaName: "email_template",
          maxOutputTokens: 3000,
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              category: { type: "string" },
              subject: { type: "string" },
              body: { type: "string" },
              variables: { type: "array", items: { type: "string" } },
            },
          },
        });
        if (!ai.json) throw new Error("AI returned no structured template");
        const generatedTemplate = ai.json;

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
            model: resolveModel("default").model,
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
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
