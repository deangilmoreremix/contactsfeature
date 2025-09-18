# Netlify Functions Setup for AI Features

This document explains how to configure your Netlify environment for the new hybrid AI architecture using Netlify Functions + Supabase.

## Overview

Your application now uses Netlify Functions for AI processing instead of direct client-side API calls. This provides better security by keeping API keys server-side and enables better rate limiting and cost control.

## Environment Variables Setup

You need to configure the following environment variables in your Netlify dashboard:

### 1. OpenAI API Key
- **Variable Name**: `OPENAI_API_KEY`
- **Value**: Your OpenAI API key (starts with `sk-`)
- **Required for**: Contact analysis, email template generation

### 2. Gemini API Key
- **Variable Name**: `GEMINI_API_KEY`
- **Value**: Your Google Gemini API key
- **Required for**: Contact research and enrichment

## Setup Instructions

### Step 1: Access Netlify Dashboard
1. Go to [netlify.com](https://netlify.com) and sign in
2. Select your SmartCRM project

### Step 2: Configure Environment Variables
1. Go to **Site settings** → **Environment variables**
2. Click **Add variable** for each required variable:
   - `OPENAI_API_KEY`
   - `GEMINI_API_KEY`
3. Set the values to your actual API keys
4. Make sure **All scopes** is selected
5. Click **Save**

### Step 3: Deploy Functions
After setting up the environment variables, deploy your functions:

```bash
# Login to Netlify (if not already logged in)
npm run netlify:login

# Link your project (if not already linked)
npm run netlify:link

# Deploy to production
npm run netlify:deploy
```

## Testing the Setup

After deployment, test the AI features:

1. **Contact Analysis**: Try analyzing a contact to ensure OpenAI integration works
2. **Contact Research**: Test researching a contact by name to verify Gemini integration
3. **Email Templates**: Generate an email template to confirm OpenAI email functionality

## Security Benefits

- ✅ API keys are no longer exposed in client-side code
- ✅ Server-side rate limiting prevents abuse
- ✅ Better cost control and monitoring
- ✅ CORS protection built-in

## Architecture Overview

```
Client (React) → Netlify Functions → AI APIs (OpenAI/Gemini)
                     ↓
                Supabase (Database/Storage)
```

- **Netlify Functions**: Handle AI processing securely
- **Supabase**: Manages data storage and non-AI backend functions
- **Client**: Clean separation with no direct API key exposure

## Troubleshooting

### Functions Not Working
- Check that environment variables are set correctly
- Verify the function URLs are accessible
- Check Netlify function logs in the dashboard

### API Key Issues
- Ensure API keys are valid and have proper permissions
- Check rate limits haven't been exceeded
- Verify keys are set for the correct environment (production/staging)

### CORS Issues
- Netlify functions automatically handle CORS
- If you see CORS errors, check function responses include proper headers

## Cost Optimization

The server-side approach enables:
- Request batching for multiple operations
- Intelligent caching of AI responses
- Better rate limit management across users
- Cost monitoring and alerts

## Next Steps

1. Monitor function performance in Netlify dashboard
2. Set up alerts for function failures
3. Consider upgrading to Netlify's paid plans for higher limits
4. Implement caching strategies for frequently requested data