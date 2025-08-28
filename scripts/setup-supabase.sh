#!/bin/bash
# Supabase Setup Script
# Run this script from your local computer after downloading the project

echo "🚀 Smart CRM Supabase Setup Script"
echo "=================================="

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

echo "📝 Please provide the following information:"

# Get project reference
read -p "Enter your Supabase project reference ID: " PROJECT_REF

if [ -z "$PROJECT_REF" ]; then
    echo "❌ Project reference is required"
    exit 1
fi

echo "🔐 Choose your AI provider(s):"
echo "1. OpenAI only"
echo "2. Gemini only" 
echo "3. Both OpenAI and Gemini (recommended)"
read -p "Enter choice (1, 2, or 3): " PROVIDER_CHOICE

# Set API keys based on choice
case $PROVIDER_CHOICE in
    1)
        read -p "Enter your OpenAI API key (starts with sk-): " OPENAI_KEY
        if [ -z "$OPENAI_KEY" ]; then
            echo "❌ OpenAI API key is required"
            exit 1
        fi
        echo "Setting OpenAI API key..."
        npx supabase secrets set OPENAI_API_KEY=$OPENAI_KEY --project-ref $PROJECT_REF
        ;;
    2)
        read -p "Enter your Gemini API key: " GEMINI_KEY
        if [ -z "$GEMINI_KEY" ]; then
            echo "❌ Gemini API key is required"
            exit 1
        fi
        echo "Setting Gemini API key..."
        npx supabase secrets set GEMINI_API_KEY=$GEMINI_KEY --project-ref $PROJECT_REF
        ;;
    3)
        read -p "Enter your OpenAI API key (starts with sk-): " OPENAI_KEY
        read -p "Enter your Gemini API key: " GEMINI_KEY
        if [ -z "$OPENAI_KEY" ] || [ -z "$GEMINI_KEY" ]; then
            echo "❌ Both API keys are required"
            exit 1
        fi
        echo "Setting both API keys..."
        npx supabase secrets set OPENAI_API_KEY=$OPENAI_KEY --project-ref $PROJECT_REF
        npx supabase secrets set GEMINI_API_KEY=$GEMINI_KEY --project-ref $PROJECT_REF
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo "🔗 Linking to Supabase project..."
npx supabase link --project-ref $PROJECT_REF

echo "🚀 Deploying Edge Functions..."

# Deploy all Edge Functions
FUNCTIONS=(
    "ai-enrichment"
    "smart-score" 
    "smart-categorize"
    "smart-qualify"
    "smart-enrichment"
    "smart-bulk"
    "email-composer"
    "email-analyzer"
    "personalized-messages"
    "email-templates"
)

for func in "${FUNCTIONS[@]}"; do
    echo "Deploying $func..."
    npx supabase functions deploy $func --project-ref $PROJECT_REF
    if [ $? -eq 0 ]; then
        echo "✅ $func deployed successfully"
    else
        echo "❌ Failed to deploy $func"
    fi
done

echo ""
echo "🎉 Setup Complete!"
echo "=================================="
echo "✅ API keys configured"
echo "✅ Edge Functions deployed"
echo ""
echo "Next steps:"
echo "1. Wait 2-3 minutes for functions to fully start"
echo "2. Go back to your Bolt.new application"
echo "3. Try using AI features - they should now work!"
echo ""
echo "If you still see errors:"
echo "- Check the Edge Function logs in your Supabase dashboard"
echo "- Verify your API keys are valid"
echo "- Ensure your .env file has correct SUPABASE_URL and SUPABASE_ANON_KEY"