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

### Agent System (Latest Addition)
- **AI SDR Agent**: Automated sales development representative for outreach and lead qualification
- **AI AE Agent**: Account executive agent for deal management and relationship building
- **Agent Framework**: Extensible agent architecture with tool integration
- **Agent Runner**: Interactive agent execution with real-time monitoring
- **Agent Analytics**: Performance tracking and optimization for agent operations

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

#### Using AI Agents
```typescript
// Execute AI SDR agent for outreach
const result = await agentFramework.executeAgent({
  agentId: 'ai-sdr-agent',
  contactId: contactId,
  input: { campaign_type: 'introduction' }
});
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

## 🔧 API Reference

### Core Services

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

#### Agent Framework
```typescript
// Execute agent
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
