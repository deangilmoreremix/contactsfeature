# Create a New Netlify Serverless Function

Create a new backend function for SmartCRM.

**Argument: $ARGUMENTS** (e.g., "contact-scoring - scores contacts based on engagement data")

## Steps

### 1. Generate the slug

Convert the function name to kebab-case. The file goes at `netlify/functions/<slug>.js`.

### 2. Create the Function

Create `netlify/functions/<slug>.js` using CommonJS format:

```js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    // Validate required fields
    // Implement function logic
    // Return structured JSON response

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, data: {} })
    };
  } catch (error) {
    console.error('<function-name> error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Operation failed',
        details: error instanceof Error ? error.message : String(error)
      })
    };
  }
};
```

### Required Patterns

1. **CORS**: Every response must include `corsHeaders`
2. **Input Validation**: Check required fields early, return 400 with clear message
3. **Supabase Queries**: Always use `.maybeSingle()` not `.single()`
4. **Error Handling**: Wrap in try/catch, log to console.error, return 500 with details
5. **HTTP Methods**: Handle OPTIONS preflight, reject non-POST with 405

### If the function needs OpenAI

Add this pattern for GPT-5.2 calls:

```js
async function callOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API key not configured');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-5.2',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1000
    })
  });

  if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);

  const data = await response.json();
  const content = data.choices[0].message.content;

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : content);
  } catch {
    return { raw: content };
  }
}
```

### 3. Wire Up Frontend Caller (if needed)

Add a call site in the appropriate service file or component:

```typescript
const res = await fetch("/.netlify/functions/<slug>", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ /* payload */ })
});
const data = await res.json();
```

### 4. Verify

Run `npm run build` to confirm no compilation errors.

## Reference Files

- Shared OpenAI client: `netlify/functions/_aiClients.js`
- Shared Supabase client: `netlify/functions/_supabaseClient.js`
- Example function: `netlify/functions/cold-email-sdr.js`
- Example AI function: `netlify/functions/ai-enrichment.js`
