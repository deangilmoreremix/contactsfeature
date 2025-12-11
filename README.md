# SmartCRM Dashboard

A comprehensive AI-powered CRM dashboard built with React, TypeScript, and Supabase, featuring advanced contact management, sales intelligence, automated workflows, and intelligent agent systems.

## 🚀 Features

### Core CRM Functionality
- **Contact Management**: Advanced contact cards with AI-powered insights and analytics
- **Deal Tracking**: Comprehensive deal management with health analysis and forecasting
- **Communication Hub**: Email scheduling, sequence management, and performance analytics
- **Data Enrichment**: Real-time contact enrichment from multiple sources (LinkedIn, web, social media)
- **Smart Search**: Semantic search across all contact data and interactions

### AI-Powered Intelligence
- **Contact Scoring**: AI-driven lead scoring with predictive analytics
- **Sales Forecasting**: Machine learning-based deal prediction and revenue forecasting
- **Communication Optimization**: AI-optimized email timing and content personalization
- **Automated Insights**: Real-time generation of actionable business intelligence
- **Predictive Analytics**: Conversion probability, response time prediction, and risk assessment

### Complete SDR Agent Ecosystem & Automation
- **14 Specialized SDR Agents**: Cold Email, Follow-Up, Objection Handling, LinkedIn, WhatsApp, Event-Based, Referral, Newsletter, High-Intent, Data Enrichment, Competitor-Aware, Reactivation, Win-Back, and Social SDR agents
- **30 AI Personas**: Sales Style (Direct Closer, Challenger, Consultative), Tone & Style (Professional, Friendly, Urgent), Industry (SaaS, E-Commerce), Buyer Types (Founder, CEO, Director), and Use-Case personas
- **Smart Autopilot System**: Intelligent decision engine that automatically selects and executes appropriate SDR strategies based on contact status and engagement patterns
- **Sequence Management**: Automated multi-step outreach sequences with current_step tracking and completion detection
- **AgentControlPanel**: Comprehensive UI for configuring, monitoring, and managing all SDR agents per contact
- **OpenAI GPT-4 Integration**: Real AI-powered message generation with dynamic agent loading, structured prompts, and context-aware responses
- **AgentMail Integration**: Production-ready email and SMS delivery with tracking, error handling, and delivery confirmation
- **Multi-Channel Orchestration**: Coordinated outreach across email, SMS, LinkedIn, and WhatsApp with intelligent channel selection
- **AE Agent Automation**: Advanced account executive workflows for demo preparation, negotiation support, and deal progression
- **Calendar AI**: Intelligent meeting scheduling with timezone handling, availability analysis, and automated booking
- **Pipeline Analytics**: Real-time performance dashboards with conversion analytics, agent effectiveness metrics, and revenue forecasting

### Automation & Workflows
- **Smart Automation**: AI-generated automation rules based on contact patterns
- **Workflow Engine**: Visual workflow builder with conditional logic
- **Task Automation**: Automated task creation and assignment
- **Communication Sequences**: Automated email and follow-up sequences
- **Integration Triggers**: Webhook-based integrations with external systems

### Communication Tools
- **Email Composer**: AI-powered email generation with personalization
- **Meeting Scheduler**: Intelligent meeting scheduling with availability analysis
- **SMS Integration**: SMS communication with AI-generated content
- **Call Tracking**: Voice call logging and analytics
- **Communication Analytics**: Comprehensive communication performance metrics

### Advanced Features
- **Image Generation**: AI-powered visual content creation for marketing
- **Document Analysis**: Intelligent document processing and insights extraction
- **Real-time Collaboration**: Multi-user collaboration with live updates
- **Offline Support**: Full offline functionality with data synchronization
- **Multi-tenant Architecture**: Enterprise-ready multi-organization support

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **React Table** - Advanced table components
- **Recharts** - Data visualization library

### Backend & Database
- **Supabase** - PostgreSQL database with real-time subscriptions
- **Supabase Edge Functions** - Serverless functions for AI processing
- **Netlify Functions** - Additional serverless compute

### AI & ML Services
- **OpenAI GPT-4** - Advanced language model for content generation
- **Google Gemini** - Multimodal AI for image and text analysis
- **Custom ML Models** - Proprietary algorithms for scoring and prediction

### Integrations
- **LinkedIn API** - Professional network data enrichment
- **SendGrid/Mailgun** - Email delivery services
- **Twilio** - SMS and voice communications
- **Google Calendar** - Meeting scheduling integration

## 📦 Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- OpenAI API key (optional, for enhanced AI features)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/smartcrm-dashboard.git
   cd smartcrm-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```

   Configure your environment variables:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_OPENAI_API_KEY=your_openai_api_key
   VITE_GOOGLE_GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Database Setup**
   ```bash
   # Connect to Supabase
   npx supabase login
   npx supabase link --project-ref your-project-ref

   # Run migrations
   npx supabase db push
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Build for Production**
   ```bash
   npm run build
   ```

## 🎯 Usage

### Getting Started
1. **Sign Up/Login**: Create your account or sign in
2. **Welcome Tour**: Complete the guided tour to understand key features
3. **Import Contacts**: Upload your contact data or connect integrations
4. **Configure AI Settings**: Set up your AI preferences and API keys

### Core Workflows

#### Contact Management
```typescript
// Add a new contact with AI enrichment
const contact = await contactService.createContact({
  name: "John Doe",
  email: "john@company.com",
  company: "Tech Corp"
});

// AI automatically enriches with LinkedIn data, scoring, etc.
```

#### **Complete SDR Agent Ecosystem Usage**

##### **AgentControlPanel Integration**
```typescript
// Configure SDR agent for contact with full ecosystem
import { AgentControlPanel } from './components/AgentControlPanel';

<AgentControlPanel
  contact={contact}
  availableAgents={await getAgents()}        // 14 SDR agents
  availablePersonas={await getPersonas()}    // 30 AI personas
  onAgentChange={(agentId) => updateContactAgent(contactId, agentId)}
  onPersonaChange={(personaId) => updateContactPersona(contactId, personaId)}
  onSettingsUpdate={(settings) => saveAgentSettings(contactId, settings)}
  realTimeLogs={agentLogs}
  performanceMetrics={agentMetrics}
/>
```

##### **Smart Autopilot Execution**
```typescript
// Trigger intelligent SDR automation
const result = await triggerAutopilot({
  contactId: contactId
});

// Result includes:
// - Selected strategy based on contact status
// - Agent and persona used
// - Message preview or delivery confirmation
// - Next steps in sequence
// - Performance metrics
```

##### **OpenAI GPT-4 Integration**
```typescript
// Real AI message generation with context
const message = await generateMessageWithAI({
  agentId: 'cold_email_sdr',        // From 14 SDR agents
  personaId: 'consultative_advisor', // From 30 personas
  sequenceLength: 30,
  step: 1,
  contact: contactData
});

// Returns structured response:
// {
//   message: "Personalized SDR message",
//   subject: "Email subject line",
//   tone_used: "Consultative approach",
//   strategy_notes: "Problem-focused opening"
// }
```

##### **AgentMail Production Delivery**
```typescript
// Send via AgentMail with full tracking
const deliveryResult = await sendViaAgentMail({
  contactId,
  agentId: 'followup_sdr',
  personaId: 'relationship_builder',
  messageText: aiGeneratedMessage,
  step: 2,
  sequenceLength: 30
});

// Includes:
// - Delivery confirmation
// - Tracking pixel insertion
// - Bounce handling
// - Reply detection setup
```

##### **Multi-Channel Orchestration**
```typescript
// Intelligent channel selection and coordination
const channelStrategy = await selectOptimalChannel(contact, 'introduction', 'high');

// Possible results:
// - 'email': Primary channel with SMS fallback
// - 'linkedin': Professional networking focus
// - 'whatsapp': Direct conversational approach
// - 'multi-channel': Coordinated email + SMS + LinkedIn

const campaign = await createMultiChannelCampaign({
  contactId,
  channels: ['email', 'linkedin'],
  sequence: [
    { step: 1, channel: 'email', delay: 0 },
    { step: 2, channel: 'linkedin', delay: 3, condition: 'no_reply' }
  ]
});
```

##### **AE Agent Advanced Workflows**
```typescript
// Execute AE agent for complex deal management
const aeResult = await runAeAgentForContact(contact, settings);

// Handles:
// - Demo preparation with contact intelligence
// - Negotiation coaching with objection handling
// - Proposal generation with competitive analysis
// - Relationship building with personalized touchpoints
```

##### **Calendar AI Scheduling**
```typescript
// Intelligent meeting scheduling
const meeting = await scheduleOptimalMeeting(contact, userPreferences);

// Features:
// - Timezone detection and conversion
// - Availability pattern analysis
// - Conflict resolution
// - Automated calendar invites
// - Confirmation sequences
```

##### **Pipeline Analytics**
```typescript
// Comprehensive performance analytics
const analytics = await getPipelineAnalytics({
  dateRange: 'last_30_days',
  includeAgentPerformance: true,
  includeRevenueForecast: true
});

// Returns:
// - Conversion funnel metrics
// - Agent effectiveness scores
// - Revenue projections with confidence
// - Bottleneck identification
// - Performance recommendations
```

#### Deal Management
```typescript
// Create and analyze a deal
const deal = await dealService.createDeal({
  name: "Enterprise Software License",
  value: 50000,
  contactId: contactId
});

// Get AI-powered health analysis
const health = await dealService.analyzeHealth(deal.id);
```

## 🤖 AI Agent System

### AI SDR Agent
- **Automated Outreach**: Generates personalized introduction sequences
- **Lead Qualification**: Scores and qualifies leads automatically
- **Follow-up Sequences**: Creates multi-touch email campaigns
- **Performance Tracking**: Monitors open rates, responses, and conversions

### AI AE Agent
- **Deal Management**: Handles complex deal negotiations
- **Relationship Building**: Maintains long-term account relationships
- **Demo Generation**: Creates personalized product demonstrations
- **Objection Handling**: AI-powered response to common sales objections

### Agent Framework Features
- **Tool Integration**: Extensible tool system for CRM operations
- **Real-time Execution**: Live monitoring of agent activities
- **Error Handling**: Robust error recovery and retry logic
- **Performance Analytics**: Detailed metrics on agent effectiveness

## 🔧 Complete API Reference

### **SDR Agent Ecosystem APIs**

#### **Agent Management**
```typescript
// Get all 14 SDR agents
GET /.netlify/functions/get-agents
Response: {
  agents: [
    {
      id: "cold_email_sdr",
      name: "Cold Email SDR",
      description: "First-touch cold outreach...",
      type: "sdr",
      category: "outbound"
    }
    // ... all 14 agents
  ]
}

// Get all 30 AI personas
GET /.netlify/functions/get-personas
Response: {
  personas: [
    {
      id: "consultative_advisor",
      name: "Consultative Advisor",
      persona_group: "Sales Style",
      description: "Asks questions and gives tailored advice..."
    }
    // ... all 30 personas
  ]
}
```

#### **Agent Configuration**
```typescript
// Save agent settings per contact
POST /.netlify/functions/save-agent-settings
{
  "contactId": "contact-123",
  "settings": {
    "autopilot_enabled": true,
    "agent_id": "cold_email_sdr",
    "persona_id": "consultative_advisor",
    "sequence_length": 30,
    "channels": ["email", "linkedin"],
    "custom_prompts": {
      "general": "Focus on their API integration needs"
    }
  }
}

// Get agent logs for contact
GET /.netlify/functions/get-agent-logs?contactId=contact-123&limit=50
Response: {
  logs: [
    {
      id: "log-123",
      contact_id: "contact-123",
      level: "info",
      message: "[cold_email_sdr] Step 1/30 prepared...",
      created_at: "2025-12-09T17:00:00Z"
    }
  ]
}
```

#### **Agent Execution APIs**

##### **Run Individual Agent Step**
```typescript
POST /.netlify/functions/run-agent
{
  "contactId": "contact-123"
}

// Success Response
{
  "success": true,
  "agentId": "cold_email_sdr",
  "personaId": "consultative_advisor",
  "sequenceLength": 30,
  "step": 1,
  "preview": "Hi John, I noticed your company is growing rapidly..."
}

// Sequence Complete
{
  "done": true,
  "message": "Sequence complete for this contact"
}

// Autopilot Disabled
{
  "skipped": true,
  "reason": "Autopilot disabled for this contact"
}
```

##### **Smart Autopilot Execution**
```typescript
POST /.netlify/functions/trigger-autopilot
{
  "contactId": "contact-123"
}

// Response based on contact status
{
  "status": "new",  // contact.lead_status
  "result": {
    "success": true,
    "step": 1,
    "messageText": "Generated SDR message content..."
  }
}

// Possible status-based actions:
// - "new" → SDR outreach sequence
// - "engaged" → AE agent workflow
// - "cold" → SDR reactivation sequence
// - Other → No action with logging
```

#### **OpenAI GPT-4 Integration Details**
```typescript
// Internal message generation (called by run-agent)
async function generateMessageWithAI({
  agentId,      // From 14 SDR agents
  personaId,    // From 30 AI personas
  sequenceLength,
  step,
  contact
})

// Features:
// - Loads agent config from agent_metadata table
// - Loads persona config from ai_personas table
// - Builds structured prompt with context
// - Calls OpenAI GPT-4 API with JSON response format
// - Returns: { message, subject, tone_used, strategy_notes }
```

#### **AgentMail Integration Details**
```typescript
// Production email/SMS delivery (called by run-agent)
async function sendViaAgentMail({
  contactId,
  agentId,
  personaId,
  messageText,
  step,
  sequenceLength
})

// Features:
// - Routes to appropriate channel (email/SMS)
// - Inserts tracking pixels for open/click monitoring
// - Handles delivery confirmations and bounces
// - Logs all delivery attempts and results
// - Supports reply detection and follow-up triggers
```

### **Multi-Channel Orchestration APIs**

#### **Channel Selection**
```typescript
// Intelligent channel recommendation
POST /.netlify/functions/select-channel
{
  "contactId": "contact-123",
  "campaignType": "introduction",
  "urgency": "high"
}

// Response
{
  "recommendedChannel": "email",  // or "linkedin", "whatsapp", "multi-channel"
  "reasoning": "Contact prefers email, high open rates detected",
  "fallbackChannels": ["sms", "linkedin"],
  "confidence": 0.89
}
```

#### **Campaign Orchestration**
```typescript
// Create multi-channel campaign
POST /.netlify/functions/create-campaign
{
  "contactId": "contact-123",
  "channels": ["email", "linkedin"],
  "sequence": [
    {
      "step": 1,
      "channel": "email",
      "delay": 0,
      "condition": null
    },
    {
      "step": 2,
      "channel": "linkedin",
      "delay": 3,
      "condition": "no_reply"
    }
  ]
}
```

### **AE Agent Automation APIs**

#### **Demo Preparation**
```typescript
POST /.netlify/functions/prepare-demo
{
  "contactId": "contact-123",
  "dealId": "deal-456",
  "contactIntelligence": {
    "painPoints": ["scaling challenges", "integration issues"],
    "techStack": ["Salesforce", "HubSpot"],
    "timeline": "Q1 2026"
  }
}

// Response
{
  "demoScript": "Customized demo script...",
  "slides": ["slide1.jpg", "slide2.jpg"],
  "talkingPoints": ["Address scaling concerns first"],
  "objectionHandling": ["Timeline concerns", "Integration questions"]
}
```

#### **Negotiation Coaching**
```typescript
POST /.netlify/functions/negotiation-coach
{
  "dealId": "deal-456",
  "currentObjections": ["price too high", "need approval"],
  "dealValue": 50000,
  "buyerPersona": "CFO"
}

// Response
{
  "strategy": "Value-based negotiation approach",
  "responses": {
    "price": "Focus on 3-year ROI and cost savings",
    "approval": "Offer phased implementation"
  },
  "nextSteps": ["Send ROI calculator", "Schedule technical demo"]
}
```

### **Calendar AI APIs**

#### **Intelligent Scheduling**
```typescript
POST /.netlify/functions/schedule-meeting
{
  "contactId": "contact-123",
  "userPreferences": {
    "duration": 30,
    "timezone": "America/New_York",
    "preferredDays": ["tuesday", "wednesday", "thursday"]
  },
  "contactTimezone": "Europe/London"
}

// Response
{
  "recommendedSlots": [
    {
      "startTime": "2025-12-10T14:00:00Z",
      "endTime": "2025-12-10T14:30:00Z",
      "confidence": 0.95,
      "reasoning": "High contact availability, optimal time zone overlap"
    }
  ],
  "calendarIntegration": "google",  // or "outlook"
  "automatedBooking": true
}
```

### **Pipeline Analytics APIs**

#### **Performance Dashboard**
```typescript
GET /.netlify/functions/pipeline-analytics?dateRange=last_30_days&includeAgentPerformance=true

// Response
{
  "conversionFunnel": {
    "awareness": 1000,
    "interest": 300,
    "consideration": 100,
    "purchase": 25,
    "conversionRate": 2.5
  },
  "agentPerformance": {
    "cold_email_sdr": {
      "messagesSent": 500,
      "responses": 45,
      "meetingsBooked": 12,
      "conversionRate": 9.0
    }
  },
  "revenueForecast": {
    "predictedRevenue": 125000,
    "confidence": 0.78,
    "basedOn": "Last 90 days trend analysis"
  },
  "bottlenecks": [
    {
      "stage": "consideration",
      "issue": "High drop-off rate",
      "recommendation": "Improve follow-up sequences"
    }
  ]
}
```

### **Legacy APIs (Maintained for Compatibility)**

#### Contact Service
```typescript
// Create contact
POST /api/contacts
{
  "name": "John Doe",
  "email": "john@example.com",
  "company": "Tech Corp"
}

// Get contacts with AI enrichment
GET /api/contacts?enrich=true&ai=true
```

#### Agent Framework (Legacy)
```typescript
// Execute agent (legacy endpoint)
POST /api/agents/execute
{
  "agentId": "ai-sdr-agent",
  "contactId": "contact-123",
  "input": {
    "campaign_type": "introduction",
    "urgency": "high"
  }
}
```

#### AI Enrichment
```typescript
// Enrich contact data
POST /api/enrichment/contact
{
  "contactId": "contact-123",
  "sources": ["linkedin", "web", "social"]
}
```

## 🏗️ Architecture

### System Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │  Supabase       │    │  AI Services    │
│                 │    │  PostgreSQL     │    │                 │
│ - Components    │◄──►│ - Real-time     │◄──►│ - OpenAI        │
│ - Services      │    │ - Edge Functions│    │ - Gemini        │
│ - State Mgmt    │    │ - Auth          │    │ - Custom ML     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Integrations   │
                    │                 │
                    │ - LinkedIn      │
                    │ - Email APIs    │
                    │ - Calendar      │
                    │ - SMS/Voice     │
                    └─────────────────┘
```

### Key Components

#### Frontend Architecture
- **Component Library**: Reusable UI components with consistent design
- **Service Layer**: Centralized API communication and data management
- **State Management**: Zustand for global state, React Query for server state
- **Routing**: React Router with protected routes and role-based access

#### Backend Architecture
- **Supabase**: Primary database and real-time subscriptions
- **Edge Functions**: Serverless functions for AI processing and integrations
- **Netlify Functions**: Additional compute for complex operations
- **Database Schema**: Normalized relational schema with JSON fields for flexibility

#### AI Architecture
- **Agent Framework**: Extensible system for AI agent execution
- **Tool Registry**: Plugin system for integrating various AI capabilities
- **Orchestrator**: Intelligent routing of requests to appropriate AI services
- **Cache Layer**: Performance optimization with intelligent caching

## 🧪 Testing

### Test Categories
- **Unit Tests**: Component and service testing with Vitest
- **Integration Tests**: API and database integration testing
- **E2E Tests**: Playwright-based end-to-end testing
- **Performance Tests**: Load testing and performance monitoring
- **Agent Tests**: Specialized testing for AI agent functionality

### Running Tests
```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Performance tests
npm run test:performance

# All tests
npm run test
```

## 🚀 Deployment

### Netlify Deployment
```bash
# Build and deploy
npm run build
npm run netlify:deploy

# Preview deployment
npm run netlify:deploy:preview
```

### Supabase Deployment
```bash
# Deploy edge functions
npx supabase functions deploy

# Deploy database changes
npx supabase db push
```

### Environment Configuration
- **Development**: Local development with hot reload
- **Staging**: Feature testing environment
- **Production**: Live environment with monitoring

## 📊 Monitoring & Analytics

### Application Metrics
- **User Engagement**: Feature usage and user journey analytics
- **AI Performance**: Model accuracy, response times, and error rates
- **System Health**: Database performance, API response times, error tracking

### Business Intelligence
- **Sales Analytics**: Conversion rates, deal velocity, pipeline health
- **Communication Metrics**: Email open rates, response times, engagement scores
- **Contact Insights**: Enrichment success rates, data quality metrics

## 🔒 Security

### Data Protection
- **Encryption**: End-to-end encryption for sensitive data
- **Access Control**: Role-based permissions and data isolation
- **Audit Logging**: Comprehensive logging of all user actions

### AI Safety
- **Content Filtering**: Safe content generation and moderation
- **Rate Limiting**: API rate limiting and abuse prevention
- **Privacy Compliance**: GDPR and CCPA compliance for data handling

## 🤝 Contributing

### Development Workflow
1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Standards
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting with React and TypeScript rules
- **Prettier**: Automated code formatting
- **Testing**: Minimum 80% test coverage required

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Supabase** for the amazing backend-as-a-service platform
- **OpenAI** for powerful AI capabilities
- **Google** for Gemini AI integration
- **React** community for excellent documentation and tools

## 📞 Support

- **Documentation**: [docs.smartcrm.com](https://docs.smartcrm.com)
- **Issues**: [GitHub Issues](https://github.com/your-org/smartcrm-dashboard/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/smartcrm-dashboard/discussions)
- **Email**: support@smartcrm.com

---

**Built with ❤️ for modern sales teams**
