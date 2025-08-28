# Edge Function Redeployment Instructions

## The Issue
Even though your API keys are set as Supabase secrets, the Edge Functions need to be redeployed to pick up the new environment variables.

## Solution: Redeploy the Edge Function

**Run this command from your local computer (not from Bolt.new):**

```bash
# Redeploy the ai-enrichment function
npx supabase functions deploy ai-enrichment --project-ref YOUR_PROJECT_REF
```

Replace `YOUR_PROJECT_REF` with your actual project reference ID from your Supabase dashboard URL.

## Alternative: Deploy All AI Functions

If you want to ensure all AI functions are working:

```bash
# Deploy all AI functions
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

## Verification Steps

1. **Wait 2-3 minutes** after deployment
2. **Check Supabase Dashboard**:
   - Go to Edge Functions in your Supabase dashboard
   - Verify `ai-enrichment` shows as "Deployed"
   - Check the logs for any error messages
3. **Test in your application**:
   - Try using any AI feature
   - The "Failed to fetch" errors should be resolved

## If You Still See Errors

1. **Check the Edge Function logs** in your Supabase dashboard
2. **Verify your API keys are valid**:
   ```bash
   npx supabase secrets list --project-ref YOUR_PROJECT_REF
   ```
3. **Test your API keys directly** (outside of Supabase) to ensure they work

## Why This Happens

- Supabase Edge Functions are stateless
- When you set new environment variables (secrets), existing function instances don't automatically pick them up
- Redeployment creates new function instances with the updated environment variables
- This is normal behavior and a one-time setup step