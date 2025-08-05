# Supabase Edge Functions Setup Guide

## ⚠️ CRITICAL: Follow these steps to fix the AI enrichment errors

The errors you're seeing are because the Supabase Edge Functions are not properly configured with API keys. Here's how to fix them:

## Step 1: Get API Keys

### Option A: OpenAI API Key (Recommended)
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-`)

### Option B: Google Gemini API Key (Free Alternative)
1. Go to https://aistudio.google.com/app/apikey
2. Create a new API key
3. Copy the key

## Step 2: Connect to Supabase (Required)

**You MUST do this from your local computer, not from Bolt.new**

1. Install Supabase CLI on your computer:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   npx supabase login
   ```

3. Find your project reference ID:
   - Go to https://supabase.com/dashboard
   - Open your project
   - Copy the project reference from the URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

4. Link to your project:
   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```
   (Replace YOUR_PROJECT_REF with your actual project reference)

## Step 3: Set API Keys as Supabase Secrets

**Choose ONE of these options:**

### For OpenAI:
```bash
npx supabase secrets set OPENAI_API_KEY=sk-your-actual-openai-key-here
```

### For Gemini:
```bash
npx supabase secrets set GEMINI_API_KEY=your-actual-gemini-key-here
```

### For Both (Recommended):
```bash
npx supabase secrets set OPENAI_API_KEY=sk-your-actual-openai-key-here
npx supabase secrets set GEMINI_API_KEY=your-actual-gemini-key-here
```

## Step 4: Deploy Edge Functions

**Deploy all the AI functions:**

```bash
# Deploy individual functions (replace YOUR_PROJECT_REF with your actual project reference)
npx supabase functions deploy ai-enrichment --project-ref YOUR_PROJECT_REF
npx supabase functions deploy smart-score --project-ref YOUR_PROJECT_REF
npx supabase functions deploy smart-categorize --project-ref YOUR_PROJECT_REF
npx supabase functions deploy smart-qualify --project-ref YOUR_PROJECT_REF
npx supabase functions deploy smart-enrichment --project-ref YOUR_PROJECT_REF
npx supabase functions deploy smart-bulk --project-ref YOUR_PROJECT_REF
npx supabase functions deploy email-composer --project-ref YOUR_PROJECT_REF
npx supabase functions deploy email-analyzer --project-ref YOUR_PROJECT_REF
npx supabase functions deploy personalized-messages --project-ref YOUR_PROJECT_REF
npx supabase functions deploy email-templates --project-ref YOUR_PROJECT_REF
```

## Step 5: Verify Configuration

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Navigate to "Edge Functions" in the sidebar
3. You should see all the functions listed and marked as "Deployed"
4. Click on "ai-enrichment" and check the logs to ensure it's working

## Step 6: Test the Application

1. Go back to your Bolt.new application
2. Try using any AI feature (like contact scoring or email generation)
3. The errors should now be resolved

## Troubleshooting

### If you see "Project not linked" errors:
```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

### If you see "Authentication failed" errors:
```bash
npx supabase login
```

### If functions are not deploying:
1. Make sure you're in the correct directory (where the `supabase` folder exists)
2. Check that your API keys are valid
3. Verify your project reference ID is correct

### If you still see "Failed to fetch" errors:
1. Wait 2-3 minutes after deployment (functions need time to start)
2. Check the Edge Function logs in your Supabase dashboard
3. Verify that your `.env` file has the correct SUPABASE_URL and SUPABASE_ANON_KEY

## Important Notes

- **You must run these commands from your local computer**, not from Bolt.new
- **Download the project first** if you need to run commands in the project directory
- **The project reference ID** is critical - get it from your Supabase dashboard URL
- **API keys are secrets** - they're stored securely in Supabase, not in your code
- **Functions must be deployed** after setting secrets for changes to take effect

## Alternative: Temporary Fix

If you can't set up Supabase right now, the application will fall back to mock data mode, but AI features won't work until properly configured.