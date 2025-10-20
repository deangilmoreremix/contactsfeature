# Netlify Functions - Environment Variables Configuration

## Required API Keys and Configuration

### OpenAI Integration
- `OPENAI_API_KEY` - Your OpenAI API key for contact analysis and email template generation

### Social Media & Company Data (Now using OpenAI Responses API) ⭐⭐
- **Latest API Technology** - Uses OpenAI's newest Responses API with built-in web search
- **Superior Performance** - Better reasoning, lower costs, and advanced tool integration
- **Agentic by Default** - Built-in web search and multi-tool capabilities in single requests
- `OPENAI_API_KEY` - Required for Responses API with native web search

### Geocoding Services (Optional)
- `GOOGLE_MAPS_API_KEY` - Google Maps API key for enhanced address geocoding
- **OpenAI Responses API** - Advanced fallback for location determination with native web search

### Competitor and VIP Configuration
- `COMPETITOR_COMPANIES` - Comma-separated list of competitor company names
- `REPUTABLE_COMPANIES` - Comma-separated list of reputable companies for VIP detection
- `VIP_COMPANIES` - Comma-separated list of VIP-level companies

## Example .env file:

```env
# OpenAI (Required for all AI features)
OPENAI_API_KEY=sk-your-openai-key-here

# Geocoding (Optional - enhances territory assignment)
GOOGLE_MAPS_API_KEY=your-google-maps-key

# Business Configuration
COMPETITOR_COMPANIES=CompetitorCorp,RivalTech,MarketLeader
REPUTABLE_COMPANIES=Microsoft,Google,Amazon,Apple,Meta
VIP_COMPANIES=Fortune500,TechGiants,IndustryLeaders
```

## Database Configuration (Supabase)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key

## Function Status

### ✅ Core AI Functions (Required by Frontend)
- `ai-enrichment.js` - **Contact scoring and enrichment** ⭐⭐⭐
- `email-composer.js` - **Email generation and personalization** ⭐⭐⭐
- `email-analyzer.js` - **Email analysis and optimization** ⭐⭐⭐
- `ai-insights.js` - **Contact insights and recommendations** ⭐⭐⭐
- `communication-optimization.js` - **Communication strategy optimization** ⭐⭐⭐
- `adaptive-playbook.js` - **Automation suggestions and playbooks** ⭐⭐⭐
- `sales-forecasting.js` - **Predictive analytics and forecasting** ⭐⭐⭐

### ✅ Advanced Sales Intelligence Functions
- `discovery-questions.js` - **Strategic discovery question generation** ⭐⭐⭐
- `lead-nurturing.js` - **Lead nurturing campaign strategies** ⭐⭐⭐
- `feature-analysis.js` - **Product feature relevance analysis** ⭐⭐⭐
- `deal-health-analysis.js` - **Deal health assessment and risk analysis** ⭐⭐⭐

### ✅ Specialized Functions
- `gemini-contact-research.cjs` - **Advanced contact research** ⭐⭐
- `email-engagement-scoring.js` - **Email engagement analysis** ⭐⭐
- `social-media-enrichment.js` - **Social media research with Responses API** ⭐⭐⭐
- `geographic-territory-assignment.js` - **Territory assignment with Responses API** ⭐⭐⭐

### ✅ Business Logic Functions
- `competitor-alert.js` - **Competitor detection and alerts** ⭐⭐
- `contact-automation.js` - **Contact workflow automation** ⭐⭐
- `openai-contact-analysis.cjs` - **Contact analysis with Responses API** ⭐⭐⭐
- `openai-email-template.cjs` - **Email templates with Responses API** ⭐⭐⭐
- `vip-contact-escalation.js` - **VIP contact management** ⭐⭐

### 🔧 Major Improvements Completed
- ✅ **Created 7 Missing Core Functions** - All frontend AI features now have Netlify function fallbacks
- ✅ **Upgraded to OpenAI Responses API** - Latest API technology across all functions
- ✅ **Native Web Search Integration** - Built-in web search tools in Responses API
- ✅ **Complete Frontend Integration** - All AI buttons now have corresponding Netlify functions
- ✅ **Environment Configuration** - Dynamic configuration for all business data
- ✅ **Production-Ready Error Handling** - Comprehensive fallbacks and logging

### 🚧 Next Steps
1. **API Key Setup** - Configure the OPENAI_API_KEY environment variable in Netlify
2. **Database Schema** - Ensure all required tables exist in Supabase (see function implementations)
3. **Testing** - Test each function with real data using the frontend AI buttons
4. **Deploy** - Deploy all 20 functions to Netlify with proper environment variables
5. **Monitor** - Set up logging and error tracking for production use

## Setup Instructions

1. Copy the example .env file to your project root
2. Fill in all required API keys
3. Deploy to Netlify with environment variables configured
4. Test each function endpoint
5. Monitor logs for any API integration issues