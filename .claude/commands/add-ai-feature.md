# Add an AI-Powered Feature

Create a complete AI feature vertical slice for SmartCRM: database table, Edge/Netlify function, React component, and wiring.

**Argument: $ARGUMENTS** (e.g., "Contact Intent Scoring - AI analyzes contact activity to predict purchase intent")

## Steps

### 1. Plan the Feature

Determine:
- What data the feature needs (new table? new columns?)
- Where the AI processing happens (Netlify function or Edge Function)
- Where the UI lives (contact detail tab, dashboard widget, standalone page)
- What the AI prompt should accomplish

### 2. Create Database Table (if needed)

Use `mcp__supabase__apply_migration` to create any new tables following the project's migration pattern:
- Detailed comment block at top
- `IF NOT EXISTS` guards
- RLS enabled with ownership-based policies
- `user_id` or contact FK for multi-tenant isolation
- Proper indexes

### 3. Create the Backend Function

**For Netlify Functions** (simpler, used by most SDR agents):
Create `netlify/functions/<slug>.js` following `netlify/functions/cold-email-sdr.js` pattern.

**For Edge Functions** (authenticated, uses Supabase directly):
Create `supabase/functions/<slug>/index.ts` following existing Edge Function patterns.

The function must:
- Accept relevant input (contactId, dealId, etc.)
- Fetch data from Supabase
- Build a GPT-5.2 prompt with the data
- Call OpenAI API (`model: "gpt-5.2"`)
- Parse the response (with JSON regex fallback)
- Optionally store results back in Supabase
- Return structured JSON

### 4. Create the React Component

Place in the appropriate `src/components/` subdirectory:
- Use TypeScript with proper interfaces
- Include loading, error, and empty states
- Use Lucide React icons
- Use Tailwind CSS for styling
- Call the backend function via fetch or `callEdgeFunction`
- Display results in a clean, readable format

### 5. Wire Up

- Import the component into the parent view
- For contact features: add to `src/components/modals/ContactDetailView.tsx` or the appropriate tab
- For dashboard features: add to `src/pages/Dashboard.tsx`
- For AI tools: add to `src/pages/AITools.tsx`

### 6. Deploy and Verify

- If using Edge Function: deploy via `mcp__supabase__deploy_edge_function`
- Run `npm run build` to verify compilation
- Test the feature end-to-end

## AI Prompt Guidelines

When building the GPT-5.2 prompt:
- Include all relevant contact/deal data as structured context
- Be specific about the output format (always request JSON)
- Set clear constraints (word limits, tone, focus areas)
- Include fallback parsing for non-JSON responses
- Use `temperature: 0.7` for creative tasks, `0.3` for analytical tasks

## Reference Architecture

```
[Frontend Component]
        |
        v
[fetch / callEdgeFunction]
        |
        v
[Netlify Function / Edge Function]
        |
        v
[Supabase Query] --> [GPT-5.2 API Call]
        |                    |
        v                    v
[Contact Data]        [AI Analysis]
        |                    |
        v                    v
[Store Results in DB] <-- [Parse Response]
        |
        v
[Return to Frontend]
```
