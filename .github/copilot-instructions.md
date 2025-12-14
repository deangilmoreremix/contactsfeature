# AI Coding Agent Instructions for SmartCRM Dashboard

## Architecture Overview
This is a React/TypeScript CRM dashboard with AI-powered SDR automation. Key components:
- **Frontend**: React 18 + Vite, TypeScript, Tailwind CSS, Zustand state management
- **Backend**: Supabase (PostgreSQL + real-time subscriptions) + Netlify Functions for serverless AI processing
- **AI Stack**: OpenAI GPT-4 for content generation, Google Gemini for multimodal tasks
- **Communication**: AgentMail for email/SMS delivery, Twilio for voice, multi-channel orchestration

## Core Systems
- **14 SDR Agents**: Cold Email, Follow-Up, Objection Handling, LinkedIn, WhatsApp, etc. (see `src/components/AgentControlPanel.tsx`)
- **30 AI Personas**: Sales styles (Direct Closer, Challenger), tones, industries, buyer types
- **Smart Autopilot**: AI decision engine selecting strategies based on contact status (`src/components/AutopilotPanel.tsx`)
- **Contact Ecosystem**: Cards with AI enrichment, scoring, health analysis (`src/components/contacts/`)

## Developer Workflows
- **Development**: `npm run dev` (Vite dev server)
- **Build**: `npm run build` (production build)
- **Type Checking**: `npm run typecheck` (TypeScript)
- **Linting**: `npm run lint` (ESLint)
- **Database**: Use Supabase CLI for migrations (`npx supabase db push`)
- **Functions**: Deploy Netlify functions with `npx netlify deploy --prod`
- **Testing**: Vitest for unit tests, Playwright for E2E (`playwright.config.ts`)

## Project Conventions
- **State Management**: Zustand stores in `src/store/`, avoid Redux
- **Services**: All API calls in `src/services/`, use Supabase client from `supabaseClient.ts`
- **Components**: Feature-based organization in `src/components/`, shared UI in `ui/`
- **AI Integration**: Serverless functions in `netlify/functions/` handle AI processing, never call OpenAI directly from frontend
- **Error Handling**: Use try/catch in services, display user-friendly messages via toast notifications
- **Environment**: VITE_ prefixed env vars for frontend, regular for functions

## Integration Patterns
- **AgentMail**: Use `lib/agentmailClient.ts` for email/SMS sending with tracking
- **AI Generation**: Call Netlify functions like `email-composer.js` for content, pass structured prompts
- **Sequences**: Track `current_step` and `sequence_length` in database for multi-step outreach
- **Multi-Channel**: Coordinate email + SMS + LinkedIn via `channels` object in agent settings
- **Real-time**: Use Supabase subscriptions for live updates, avoid polling

## Code Examples
**Trigger SDR Agent:**
```typescript
const result = await triggerAutopilot({
  contactId,
  agentId: 'cold_email_sdr',
  personaId: 'consultative_advisor'
});
```

**AI Email Generation:**
```typescript
const response = await fetch('/.netlify/functions/email-composer', {
  method: 'POST',
  body: JSON.stringify({ contact, agentId, step: 1 })
});
```

**Contact Service Pattern:**
```typescript
// In src/services/contactService.ts
export const updateContactAgent = async (contactId: string, agentId: string) => {
  const { error } = await supabase
    .from('contacts')
    .update({ assigned_agent: agentId })
    .eq('id', contactId);
  if (error) throw error;
};
```

## Key Files
- [src/App.tsx](src/App.tsx) - Main app structure
- [src/services/agentService.ts](src/services/agentService.ts) - Agent management
- [netlify/functions/email-composer.js](netlify/functions/email-composer.js) - AI email generation
- [src/components/contacts/ContactCard.tsx](src/components/contacts/ContactCard.tsx) - Contact display logic</content>
<parameter name="filePath">/workspaces/contactsfeature/.github/copilot-instructions.md