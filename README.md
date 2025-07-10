# Smart CRM Dashboard

A full-featured AI-powered CRM dashboard built with React, TypeScript, and Supabase.

## Features

- AI-powered contact enrichment and analysis
- Smart email generation and analysis
- Lead qualification and scoring
- Personalized communication templates
- Contact management

## Getting Started

### ⚠️ IMPORTANT: Connect to Supabase First

Before running any commands or deploying functions, you MUST connect to your Supabase project:

```bash
# 1. Login to Supabase (this will open a browser)
npx supabase login

# 2. Link to your project (replace YOUR_PROJECT_REF with your actual project reference)
npx supabase link --project-ref YOUR_PROJECT_REF
```

You can find your project reference ID in your Supabase dashboard URL:
`https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

### Prerequisites

- Node.js v18+
- Supabase account
- OpenAI API key and/or Google Gemini API key

### Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env` and set your environment variables:

```bash
cp .env.example .env
```

4. Edit `.env` file and add your Supabase and AI API credentials:

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_OPENAI_API_KEY=sk-your-openai-key
VITE_GEMINI_API_KEY=your-gemini-key
```

### Deploying Edge Functions

⚠️ **Make sure you've completed the Supabase connection setup above before deploying functions!**

Deploy all required Edge Functions to your Supabase project:

```bash
# Deploy individual functions
npx supabase functions deploy ai-enrichment --project-ref YOUR_PROJECT_REF
npx supabase functions deploy contacts --project-ref YOUR_PROJECT_REF
npx supabase functions deploy email-composer --project-ref YOUR_PROJECT_REF
npx supabase functions deploy email-analyzer --project-ref YOUR_PROJECT_REF
npx supabase functions deploy email-templates --project-ref YOUR_PROJECT_REF
npx supabase functions deploy personalized-messages --project-ref YOUR_PROJECT_REF
npx supabase functions deploy smart-bulk --project-ref YOUR_PROJECT_REF
npx supabase functions deploy smart-categorize --project-ref YOUR_PROJECT_REF
npx supabase functions deploy smart-enrichment --project-ref YOUR_PROJECT_REF
npx supabase functions deploy smart-qualify --project-ref YOUR_PROJECT_REF
npx supabase functions deploy smart-score --project-ref YOUR_PROJECT_REF

# Replace YOUR_PROJECT_REF with your actual project reference ID
```

### Setting Environment Variables in Supabase

For your Edge Functions to access AI APIs, you need to set environment variables in your Supabase project:

```bash
npx supabase secrets set OPENAI_API_KEY=sk-your-openai-key
npx supabase secrets set GEMINI_API_KEY=your-gemini-key
```

### Running the App

Start the development server:

```bash
npm run dev
```

## Troubleshooting

### Edge Function Connection Issues

If your Edge Functions are failing with "Failed to deploy" or "Supabase project not connected" errors:

1. **First, ensure you're connected to Supabase:**
   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```

2. Check if your Supabase Edge Functions are deployed correctly
3. Ensure your `.env` file has the correct Supabase URL and anon key
4. Make sure your Supabase project has the required environment variables set
5. Check CORS settings in your Supabase project

### AI Features Not Working

If you see "API enrichment unavailable. Using estimated data":

1. Ensure you have set valid API keys for either OpenAI or Gemini
2. Make sure these API keys are configured in your Supabase project secrets
3. Check the Edge Function logs in your Supabase dashboard for specific errors

## Development

### Local Edge Function Testing

For development, you can run Edge Functions locally with:

```bash
npx supabase functions serve
```

Then update your .env file to point to the local functions:

```
VITE_SUPABASE_FUNCTIONS_URL=http://localhost:54321/functions/v1
```