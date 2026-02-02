# Sales Intelligence Features

This document provides comprehensive information about the AI-powered sales intelligence features in the SmartCRM application.

## 🎯 Overview

The sales intelligence system provides 8 AI-powered features that help sales teams optimize their outreach, understand prospects better, and close deals more effectively. All features use OpenAI's Responses API for structured JSON outputs.

## 🚀 Features

### 1. AI Insights Panel
**Function**: `ai-insights.js`
**Purpose**: Generate actionable insights about contacts based on their profile and interaction history.

**Input**:
```json
{
  "contact": {
    "id": "string",
    "name": "string",
    "company": "string",
    "title": "string",
    "email": "string",
    "industry": "string",
    "interestLevel": "string"
  },
  "insightTypes": ["opportunity", "recommendation", "risk"],
  "context": "Additional context (optional)"
}
```

**Output**:
```json
{
  "insights": [
    {
      "type": "opportunity",
      "title": "High-Value Prospect",
      "description": "Contact shows strong interest in enterprise solutions",
      "confidence": 85,
      "impact": "high",
      "actionable": true,
      "suggestedActions": ["Schedule demo", "Send case study"],
      "dataPoints": ["Recent job posting", "Budget approval"]
    }
  ]
}
```

### 2. Communication Optimization
**Function**: `communication-optimization.js`
**Purpose**: Analyze communication patterns and recommend optimal timing and messaging strategies.

**Input**:
```json
{
  "contact": { "id": "string", "name": "string", "company": "string" },
  "interactionHistory": [],
  "timeframe": "30d",
  "optimizationType": "comprehensive"
}
```

**Output**:
```json
{
  "optimalTiming": {
    "bestDay": "Tuesday",
    "bestTime": "10:00",
    "timezone": "UTC"
  },
  "communicationStyle": {
    "tone": "professional",
    "frequency": "weekly",
    "approach": "consultative"
  },
  "channelPreferences": {
    "primary": "email",
    "secondary": "phone",
    "avoid": []
  }
}
```

### 3. Deal Health Analysis
**Function**: `deal-health-analysis.js`
**Purpose**: Assess deal viability and identify risks using comprehensive health metrics.

**Input**:
```json
{
  "deal": {
    "id": "string",
    "name": "string",
    "company": "string",
    "value": 50000,
    "stage": "proposal",
    "industry": "string"
  },
  "healthMetrics": ["engagement", "budget_fit"],
  "analysisDepth": "comprehensive",
  "riskFactors": ["competition", "timeline"]
}
```

**Output**:
```json
{
  "healthScore": 75,
  "riskLevel": "medium",
  "healthIndicators": [
    {
      "metric": "engagement",
      "value": 85,
      "status": "good",
      "trend": "improving"
    }
  ],
  "recommendations": ["Increase follow-up frequency"],
  "nextActions": [
    {
      "action": "Schedule stakeholder meeting",
      "priority": "high",
      "timeline": "next_week",
      "owner": "Sales Rep"
    }
  ]
}
```

### 4. Discovery Questions
**Function**: `discovery-questions.js`
**Purpose**: Generate strategic discovery questions organized by category for effective prospect qualification.

**Input**:
```json
{
  "contact": { "id": "string", "name": "string", "company": "string" },
  "meetingContext": {
    "type": "discovery",
    "duration": 30,
    "objective": "Understand needs and qualify opportunity"
  },
  "questionType": "comprehensive"
}
```

**Output**:
```json
{
  "questions": [
    {
      "category": "Current Situation & Pain Points",
      "question": "What are your biggest challenges with [specific area]?",
      "rationale": "Uncovers current problems and need for change",
      "priority": "high"
    }
  ]
}
```

### 5. Email Composer
**Function**: `email-composer.js`
**Purpose**: Generate personalized, professional emails using AI for various sales scenarios.

**Input**:
```json
{
  "contact": {
    "id": "string",
    "name": "string",
    "company": "string",
    "title": "string",
    "email": "string"
  },
  "type": "introduction",
  "context": "Product demo follow-up",
  "tone": "professional"
}
```

**Output**:
```json
{
  "subject": "Following up on our product demo discussion",
  "body": "Dear [Name],\n\nI hope this email finds you well...\n\nBest regards,\n[Your Name]",
  "tone": "professional",
  "type": "introduction"
}
```

### 6. Sales Forecasting
**Function**: `sales-forecasting.js`
**Purpose**: Predict deal outcomes and provide conversion probabilities with actionable recommendations.

**Input**:
```json
{
  "contact": { "id": "string", "name": "string", "company": "string" },
  "interactionHistory": [],
  "timeframe": "90d",
  "predictionType": "conversion",
  "businessContext": "Enterprise software sales"
}
```

**Output**:
```json
{
  "conversionProbability": 75,
  "expectedValue": {
    "amount": 50000,
    "currency": "USD",
    "confidence": 80
  },
  "timeline": {
    "estimatedClose": "2024-03-15",
    "milestones": ["Technical review", "Contract negotiation"]
  },
  "optimalActions": [
    {
      "action": "Schedule technical demo",
      "timing": "next_week",
      "priority": "high",
      "expectedImpact": "Increase conversion by 20%"
    }
  ],
  "recommendations": ["Focus on ROI demonstration"]
}
```

### 7. Lead Nurturing
**Function**: `lead-nurturing.js`
**Purpose**: Create comprehensive lead nurturing campaigns with content calendars and engagement strategies.

**Input**:
```json
{
  "contact": { "id": "string", "name": "string", "company": "string" },
  "nurtureStrategy": "comprehensive",
  "timeframe": "90d",
  "businessGoals": ["build_relationship", "demonstrate_value"]
}
```

**Output**:
```json
{
  "nurtureSequence": [
    {
      "week": 1,
      "theme": "Understanding Your Challenges",
      "contentType": "email",
      "objective": "Build initial connection",
      "callToAction": "Reply with thoughts",
      "successCriteria": ["Email opened", "Reply received"]
    }
  ],
  "contentCalendar": [
    {
      "date": "2024-01-15",
      "content": "Industry trends report",
      "channel": "email",
      "purpose": "Provide value"
    }
  ],
  "engagementTriggers": ["Website visit", "Email click"],
  "successMetrics": ["Email open rate", "Response rate"],
  "personalizationStrategy": "Industry-specific content with personalized examples"
}
```

### 8. Adaptive Playbooks
**Function**: `adaptive-playbook.js`
**Purpose**: Generate comprehensive sales strategies with phases, tactics, risk mitigation, and success indicators.

**Input**:
```json
{
  "deal": {
    "id": "string",
    "name": "string",
    "company": "string",
    "value": 50000,
    "stage": "prospect",
    "industry": "technology"
  },
  "currentStage": "prospect",
  "businessGoals": ["increase_revenue", "expand_market"],
  "automationType": "comprehensive"
}
```

**Output**:
```json
{
  "strategy": {
    "name": "Enterprise Solution Sales Strategy",
    "description": "Comprehensive approach for technology company",
    "confidence": 0.85,
    "rationale": "Based on industry analysis and deal characteristics"
  },
  "phases": [
    {
      "id": "phase-1",
      "name": "Discovery & Research",
      "timeline": "Week 1-2",
      "objectives": ["Understand requirements", "Identify stakeholders"],
      "tactics": [
        {
          "id": "tactic-1",
          "name": "Stakeholder mapping",
          "description": "Identify key decision makers",
          "priority": "high",
          "estimatedEffort": "2-3 hours",
          "successMetrics": ["Stakeholders identified"],
          "dependencies": []
        }
      ],
      "milestones": [
        {
          "id": "milestone-1",
          "name": "Discovery Complete",
          "description": "All requirements gathered",
          "dueDate": "2024-01-15",
          "owner": "Sales Rep",
          "status": "pending"
        }
      ]
    }
  ],
  "riskMitigation": [
    {
      "risk": "Competition",
      "probability": 0.6,
      "impact": "High",
      "mitigation": "Differentiate on implementation speed"
    }
  ],
  "successIndicators": [
    {
      "metric": "Stakeholder Engagement",
      "target": "80%",
      "current": "60%",
      "status": "on_track"
    }
  ],
  "competitivePositioning": {
    "strengths": ["Technical expertise", "Implementation speed"],
    "weaknesses": ["Higher price point"],
    "differentiation": ["Custom integrations", "24/7 support"],
    "winThemes": ["Innovation", "Reliability"]
  }
}
```

## 🛠️ Technical Implementation

### API Architecture
- **Backend**: Netlify Functions (serverless)
- **AI Provider**: OpenAI Responses API
- **Database**: Supabase (PostgreSQL)
- **Response Format**: Structured JSON with schema validation

### Function Structure
Each function follows this pattern:
1. Input validation
2. AI provider routing (OpenAI primary, Gemini fallback)
3. API call with structured prompts
4. Response parsing and formatting
5. Database storage
6. Error handling

### Database Tables
All features store results in dedicated Supabase tables with proper indexing and relationships.

## 🚀 Deployment

### Quick Deploy
```bash
# Run the automated deployment script
./deploy-sales-intelligence.sh
```

### Manual Deploy
1. Set environment variables in Netlify dashboard
2. Run database setup script in Supabase
3. Deploy functions via Netlify CLI or Git
4. Test functions using provided curl commands

## 🧪 Testing

### Run Complete Test Suite
```bash
node test-netlify-functions-complete.js
```

### Test Individual Functions
Use the curl commands provided in the deployment script to test each function individually.

## 📊 Monitoring

### Function Logs
- Access via Netlify Dashboard → Functions
- Monitor for API errors, timeouts, or authentication issues

### Performance Metrics
- Response times
- Success rates
- Error patterns

### Database Monitoring
- Query performance
- Data consistency
- Storage usage

## 🔧 Configuration

### Environment Variables
```bash
OPENAI_API_KEY=sk-your-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
GEMINI_API_KEY=your-gemini-key-optional
```

### API Limits
- Monitor OpenAI API usage and costs
- Implement rate limiting if needed
- Set up billing alerts

## 🐛 Troubleshooting

### Common Issues
1. **API Key Errors**: Verify OpenAI API key has Responses API access
2. **Schema Validation**: Check JSON schema matches expected structure
3. **Database Connection**: Ensure Supabase credentials are correct
4. **Function Timeouts**: Complex requests may need optimization

### Debug Steps
1. Check Netlify function logs
2. Test API keys directly with curl
3. Verify database connectivity
4. Review request/response formats

## 📈 Performance Optimization

### Caching Strategies
- Implement response caching for similar requests
- Cache frequently accessed data
- Use Redis for high-performance caching

### Query Optimization
- Add database indexes for common queries
- Optimize complex JSON queries
- Implement pagination for large datasets

### API Optimization
- Batch similar requests
- Implement request deduplication
- Use streaming for large responses

## 🔒 Security

### API Key Management
- Rotate keys regularly
- Use environment variables, never hardcode
- Monitor API usage for anomalies

### Data Privacy
- Implement proper data sanitization
- Follow GDPR and privacy regulations
- Encrypt sensitive data at rest

### Access Control
- Implement proper authentication
- Use role-based access control
- Audit all API access

## 📚 API Reference

### Response Format
All functions return:
```json
{
  "success": true|false,
  "data": { /* function-specific data */ },
  "provider": "openai|gemini",
  "timestamp": "ISO date string",
  "error": "error message (if success=false)"
}
```

### Error Codes
- `400`: Bad Request (invalid input)
- `401`: Unauthorized (API key issues)
- `500`: Internal Server Error (API failures)

## 🎯 Best Practices

1. **Input Validation**: Always validate inputs before processing
2. **Error Handling**: Implement comprehensive error handling
3. **Logging**: Log all API calls and responses for debugging
4. **Caching**: Cache responses to improve performance
5. **Monitoring**: Monitor function performance and errors
6. **Testing**: Test all functions regularly
7. **Documentation**: Keep API documentation up to date

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review Netlify function logs
3. Test API keys independently
4. Contact development team with specific error details