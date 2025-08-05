# Quick Fix Guide for AI Enrichment Errors

## The Problem
Your Supabase Edge Functions are failing because they don't have API keys configured. The "Failed to fetch" error means the functions can't connect to OpenAI or Gemini.

## The Solution (5 Minutes)

### Step 1: Download This Project
1. Click the "Download" button in Bolt.new to get a `.zip` file
2. Extract the `.zip` file to your computer
3. Open a terminal/command prompt in the extracted folder

### Step 2: Get an API Key
**Choose ONE:**

#### Option A: OpenAI (Paid but more accurate)
- Go to: https://platform.openai.com/api-keys
- Create API key (starts with `sk-`)
- Cost: ~$0.002 per analysis

#### Option B: Gemini (Free tier available)
- Go to: https://aistudio.google.com/app/apikey  
- Create API key
- Free tier: 15 requests/minute

### Step 3: Configure Supabase
1. **Find your project reference:**
   - Go to https://supabase.com/dashboard
   - Open your project
   - Copy the ID from the URL (after `/project/`)

2. **Run these commands in your terminal:**
   ```bash
   # Login to Supabase
   npx supabase login
   
   # Link to your project (replace YOUR_PROJECT_REF)
   npx supabase link --project-ref YOUR_PROJECT_REF
   
   # Set your API key (choose one)
   npx supabase secrets set OPENAI_API_KEY=sk-your-key
   # OR
   npx supabase secrets set GEMINI_API_KEY=your-key
   
   # Deploy the ai-enrichment function
   npx supabase functions deploy ai-enrichment --project-ref YOUR_PROJECT_REF
   ```

### Step 4: Test
1. Go back to your Bolt.new app
2. Wait 2 minutes for the function to start
3. Try using any AI feature - it should now work!

## If You're Still Getting Errors

### Check Your Edge Function Logs:
1. Go to https://supabase.com/dashboard
2. Click on your project
3. Go to "Edge Functions" → "ai-enrichment"
4. Check the "Logs" tab for specific error messages

### Common Issues:
- **"API key not found"**: Your secrets weren't set correctly
- **"Function not found"**: The function wasn't deployed
- **"Rate limit exceeded"**: You've hit API limits (wait or upgrade)

### Quick Test Commands:
```bash
# Check if your function is deployed
npx supabase functions list --project-ref YOUR_PROJECT_REF

# Check if secrets are set
npx supabase secrets list --project-ref YOUR_PROJECT_REF

# Redeploy if needed
npx supabase functions deploy ai-enrichment --project-ref YOUR_PROJECT_REF
```

## Need Help?
If you're still stuck:
1. Check the Edge Function logs in your Supabase dashboard
2. Verify your API keys are valid by testing them directly
3. Make sure you're using the correct project reference ID