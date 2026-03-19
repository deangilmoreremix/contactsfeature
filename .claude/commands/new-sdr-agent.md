# Create a New SDR Agent

Create a complete end-to-end SDR agent for SmartCRM. The user will provide the agent name and purpose.

**Argument: $ARGUMENTS** (e.g., "Referral SDR - generates referral request emails to existing customers")

## Steps

### 1. Generate the slug

Convert the agent name to a kebab-case slug (e.g., "Referral SDR" -> "referral-sdr"). This slug is used for:
- Netlify function filename: `netlify/functions/<slug>.js`
- Component agentId: `<slug>`
- SDR draft mailbox_key: `<slug>`

### 2. Create the Netlify Function

Create `netlify/functions/<slug>.js` following this exact pattern from the existing cold-email-sdr.js:

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
    const { contactId } = JSON.parse(event.body);

    if (!contactId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Contact ID is required' })
      };
    }

    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .maybeSingle();

    if (contactError) throw new Error(`Database error: ${contactError.message}`);
    if (!contact) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Contact not found' })
      };
    }

    const result = await generateContent(contact);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        contactId,
        subject: result.subject,
        body: result.body,
        sent: true,
        debug: result.debug
      })
    };
  } catch (error) {
    console.error('<AGENT_NAME> error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: '<AGENT_NAME> generation failed',
        details: error instanceof Error ? error.message : String(error)
      })
    };
  }
};
```

The `generateContent` function must:
- Use `process.env.OPENAI_API_KEY`
- Call `https://api.openai.com/v1/chat/completions` with model `gpt-5.2`
- Build a prompt specific to this SDR agent type using contact data (name, company, title, industry, email, notes)
- Parse JSON response with regex fallback (`content.match(/\{[\s\S]*\}/)`)
- Return `{ subject, body, debug }` object

### 3. Create the React Component

Create `src/components/sdr/<PascalName>Agent.tsx` following the exact ColdEmailSDRAgent pattern:

- Import React, useState, useEffect from "react"
- Import Settings, Send, Mail, Copy, Check from "lucide-react"
- Import SDRAgentConfigurator from "./SDRAgentConfigurator"
- Import Contact type from "../../types/contact"
- Import saveSdrDraft from "../../utils/sdrDraftUtils"
- Define response interface with contactId, subject, body, sent, debug fields
- Define props interface accepting optional `contact?: Contact`
- Implement states: contactId, loading, error, result, showSettings, draftSaved, copied
- handleSaveDraft calls saveSdrDraft with agentType set to the slug
- handleCopy copies "Subject: {subject}\n\n{body}" to clipboard
- handleSend fetches `/.netlify/functions/<slug>` with POST
- Render: card with border, title with emoji, description, contact display or ID input, send button, result display with Copy/Save Draft buttons, settings modal

### 4. Register the Agent

- Add the new component to `src/components/sdr/` exports
- If an SDR modal or agent panel exists that lists agents, add the new agent there
- Check `src/components/modals/SDRModal.tsx` and `src/components/contacts/ContactSDRPanel.tsx` for registration points

### 5. Deploy

- Run `npm run build` to verify the build succeeds
- Deploy the Netlify function (it auto-deploys from the netlify/functions directory)

## Existing SDR Agents for Reference

Located in `src/components/sdr/`:
- ColdEmailSDRAgent.tsx -> netlify/functions/cold-email-sdr.js
- FollowUpSDRAgent.tsx -> netlify/functions/follow-up-sdr.js
- ObjectionHandlerSDRAgent.tsx -> netlify/functions/objection-handler-sdr.js
- DiscoverySDRAgent.tsx -> netlify/functions/discovery-sdr.js
- WinBackSDRAgent.tsx -> netlify/functions/win-back-sdr.js
- ReactivationSDRAgent.tsx -> netlify/functions/reactivation-sdr.js

## 30 Available Personas

When creating the AI prompt for the new agent, reference the persona system in `src/agents/personas.ts`. The prompt should align with the appropriate persona's tone and rules.
