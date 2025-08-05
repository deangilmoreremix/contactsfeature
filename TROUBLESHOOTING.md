# Troubleshooting AI Enrichment Errors

## Current Error: "Failed to fetch" from ai-enrichment function

### Root Cause Analysis
The error stack shows that `aiEnrichmentService.findContactImage()` is failing when trying to reach the Supabase Edge Function at:
```
https://gadedbrnqzpfqtsdfzcg.supabase.co/functions/v1/ai-enrichment
```

### Why This Happens
1. **Edge Function Not Deployed**: The `ai-enrichment` function hasn't been deployed to your Supabase project
2. **No API Keys Configured**: The function is deployed but crashes because no OpenAI/Gemini API keys are set
3. **Wrong Environment Variables**: Your `.env` file has incorrect Supabase URL or keys

### Fix Steps (Choose One)

#### Quick Fix Option 1: Disable AI Features Temporarily
If you just want to stop the errors and use the app without AI:

1. Open `src/services/aiEnrichmentService.ts`
2. Find the constructor (around line 25)
3. Change `this.isMockMode = import.meta.env.DEV` to `this.isMockMode = true`

This will make the app use mock data instead of calling the AI functions.

#### Permanent Fix Option 2: Configure Supabase Properly

**You must do this from your local computer:**

1. **Download this project** from Bolt.new (click Download button)
2. **Extract the ZIP file** to your computer
3. **Open terminal/command prompt** in the extracted folder
4. **Run these commands:**

```bash
# Login to Supabase
npx supabase login

# Link to your project (get PROJECT_REF from your Supabase dashboard URL)
npx supabase link --project-ref YOUR_PROJECT_REF

# Set API key (choose OpenAI OR Gemini)
npx supabase secrets set OPENAI_API_KEY=sk-your-openai-key
# OR
npx supabase secrets set GEMINI_API_KEY=your-gemini-key

# Deploy the function
npx supabase functions deploy ai-enrichment --project-ref YOUR_PROJECT_REF
```

5. **Wait 2-3 minutes** for the function to start
6. **Test in your Bolt.new app** - errors should be gone

### How to Get API Keys

#### OpenAI API Key:
1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-`)
4. Note: Requires billing setup, costs ~$0.002 per analysis

#### Gemini API Key (Free Option):
1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API key"
3. Copy the key
4. Free tier: 15 requests/minute, 1,500/day

### Verification Steps

After configuration, verify it's working:

1. **Check Supabase Dashboard**:
   - Go to https://supabase.com/dashboard
   - Open your project
   - Go to "Edge Functions" → should see "ai-enrichment" as "Deployed"

2. **Check Function Logs**:
   - Click on "ai-enrichment" function
   - Go to "Logs" tab
   - Should see successful requests, not error messages

3. **Test in App**:
   - Go back to your Bolt.new application
   - Try any AI feature (contact scoring, email generation)
   - Should work without "Failed to fetch" errors

### Common Issues and Solutions

| Error | Solution |
|-------|----------|
| "Project not linked" | Run `npx supabase link --project-ref YOUR_PROJECT_REF` |
| "Authentication failed" | Run `npx supabase login` |
| "Function not found" | Deploy with `npx supabase functions deploy ai-enrichment` |
| "API key not configured" | Set secrets with `npx supabase secrets set` |
| "Rate limit exceeded" | Wait or upgrade your API plan |

### Environment File Check

Make sure your `.env` file in Bolt.new has:
```
VITE_SUPABASE_URL=https://gadedbrnqzpfqtsdfzcg.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

If these are missing or wrong, the app can't connect to Supabase at all.

### Still Not Working?

1. **Check your internet connection**
2. **Verify your Supabase project is active** (not paused)
3. **Try using different API keys** (maybe the current ones are invalid)
4. **Check the browser console** for more detailed error messages
5. **Look at Supabase Edge Function logs** for server-side errors

The key point is: **this is a configuration issue, not a code bug**. The code has proper error handling - it just needs the infrastructure to be set up correctly.