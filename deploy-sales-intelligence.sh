#!/bin/bash

# Sales Intelligence Deployment Script
# This script helps deploy and configure all sales intelligence features

echo "🚀 Sales Intelligence Deployment Script"
echo "======================================"

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "❌ Netlify CLI not found. Installing..."
    npm install -g netlify-cli
fi

# Check if user is logged in to Netlify
echo "🔐 Checking Netlify authentication..."
if ! netlify status &> /dev/null; then
    echo "Please login to Netlify:"
    netlify login
fi

# Link to site if not already linked
if [ ! -f ".netlify/state.json" ]; then
    echo "🔗 Linking to Netlify site..."
    netlify link
fi

# Deploy functions
echo "📦 Deploying Netlify functions..."
netlify deploy --prod --dir=netlify/functions

# Get the site URL
SITE_URL=$(netlify status | grep -o 'https://[^ ]*\.netlify\.app')

if [ -n "$SITE_URL" ]; then
    echo "✅ Deployment successful!"
    echo "🌐 Site URL: $SITE_URL"
    echo ""
    echo "🧪 Test your functions:"
    echo ""
    echo "# Test Adaptive Playbook"
    echo "curl -X POST $SITE_URL/.netlify/functions/adaptive-playbook \\"
    echo "  -H \"Content-Type: application/json\" \\"
    echo "  -d '{"
    echo "    \"contact\": {"
    echo "      \"id\": \"test123\","
    echo "      \"name\": \"John Doe\","
    echo "      \"company\": \"TechCorp\","
    echo "      \"title\": \"CTO\""
    echo "    },"
    echo "    \"currentStage\": \"prospect\","
    echo "    \"businessGoals\": [\"increase_revenue\"]"
    echo "  }'"
    echo ""
    echo "# Test AI Insights"
    echo "curl -X POST $SITE_URL/.netlify/functions/ai-insights \\"
    echo "  -H \"Content-Type: application/json\" \\"
    echo "  -d '{"
    echo "    \"contact\": {"
    echo "      \"id\": \"test123\","
    echo "      \"name\": \"John Doe\","
    echo "      \"company\": \"TechCorp\""
    echo "    },"
    echo "    \"insightTypes\": [\"opportunity\"]"
    echo "  }'"
else
    echo "⚠️  Could not determine site URL. Please check Netlify dashboard."
fi

echo ""
echo "📋 Next Steps:"
echo "1. Set environment variables in Netlify dashboard:"
echo "   - OPENAI_API_KEY"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_SERVICE_KEY"
echo ""
echo "2. Run the database setup script in Supabase:"
echo "   psql -f create_tables.sql"
echo ""
echo "3. Test all functions using the curl commands above"
echo ""
echo "4. Check function logs in Netlify dashboard for any errors"