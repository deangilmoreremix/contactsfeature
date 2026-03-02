# Create a New Supabase Edge Function

Create and deploy a new Supabase Edge Function for SmartCRM.

**Argument: $ARGUMENTS** (e.g., "contact-scoring - AI-powered contact lead scoring")

## Steps

### 1. Check Existing Functions

Run `mcp__supabase__list_edge_functions` to see what's already deployed. Read any existing function at `supabase/functions/<name>/index.ts` before making changes.

### 2. Create the Edge Function

Write the function to `supabase/functions/<slug>/index.ts`:

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json();

    // Implement function logic here

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

### Required Patterns

1. **CORS Headers**: Must be on every response including errors. Use `"Content-Type, Authorization, X-Client-Info, Apikey"` for Allow-Headers.
2. **Auth**: Extract auth header, create Supabase client with user context, verify user via `getUser()`
3. **Imports**: Use `npm:` prefix for npm packages (e.g., `npm:@supabase/supabase-js@2`). Never use `deno.land/x`, `esm.sh`, or `unpkg.com`.
4. **Error handling**: Wrap entire function in try/catch
5. **Environment vars**: Use `Deno.env.get()`. `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are pre-populated.

### If the function needs OpenAI

```typescript
const openaiKey = Deno.env.get("OPENAI_API_KEY");
const response = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${openaiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "gpt-5.2",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  }),
});
```

### 3. Deploy

Use `mcp__supabase__deploy_edge_function` with the slug name. Set `verify_jwt: true` for authenticated endpoints, `verify_jwt: false` for public webhooks.

### 4. Wire Up Frontend

Call from frontend using the helper in `src/lib/supabase.ts`:

```typescript
import { callEdgeFunction } from '../lib/supabase';
const result = await callEdgeFunction('<slug>', { /* payload */ });
```

Or manually:
```typescript
const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/<slug>`;
const response = await fetch(apiUrl, {
  headers: {
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  },
  method: 'POST',
  body: JSON.stringify({ /* payload */ }),
});
```

## Reference

- Existing Edge Functions: `supabase/functions/*/index.ts`
- Frontend client: `src/lib/supabase.ts` (has `callEdgeFunction` helper)
