# Enhanced Contacts Module for SmartCRM

A comprehensive, AI-driven contact management module that combines intelligent contact scoring with advanced AI enrichment, real-time web research, and interactive demonstrations. Built for modern sales teams seeking to leverage AI for enhanced contact intelligence and productivity.

**🎯 Latest Update**: Complete Gemini AI Image Generation with Supabase Storage Integration - Generate, save, and manage AI-powered marketing visuals directly within your contacts module.

## 🌟 Key Features

### 🎨 Gemini AI Image Generation with Storage
- **SmartCRM Prompt Templates**: Pre-built templates for 9 different features (Enhanced Contacts, AI Sales Intelligence, etc.)
- **Advanced Image Generation**: Powered by Gemini 2.5 Flash with aspect ratio optimization
- **Supabase Storage Integration**: Automatic upload and storage of generated images
- **Thumbnail Generation**: Automatic 200px thumbnail creation for faster loading
- **Saved Images Gallery**: Complete gallery management with metadata tracking
- **History Management**: Persistent generation history with re-run capabilities
- **Batch Operations**: Generate multiple variants and download all at once
- **Smart Branding**: Automatic SmartCRM style injection for consistent visuals

### 🤖 Enhanced AI-Powered Contact Management
- **Advanced Contact Scoring**: Multi-model AI analysis (OpenAI GPT-4 + Google Gemini) for lead prioritization
- **Intelligent Contact Enrichment**: Web research integration with LinkedIn and company data
- **AI Research Integration**: Real-time web search for contact background and company insights
- **Smart Categorization**: Automatic tagging based on industry, role, and engagement patterns
- **Relationship Mapping**: AI-powered analysis of professional networks and connections
- **Bulk Analysis**: Process hundreds of contacts with AI insights and recommendations
- **Contact Journey Timeline**: Visual timeline of all contact interactions and touchpoints
- **AI Insights Panel**: Deep analysis with predictive recommendations and next actions
- **Communication Hub**: Unified messaging across email, phone, SMS, and social platforms
- **Automation Panel**: Intelligent workflow automation with AI-suggested actions
- **Contact Analytics**: Comprehensive analytics on engagement patterns and conversion probability
- **Email Integration**: AI-powered email composition and analysis within contact context

### 📊 Advanced Dashboard & Analytics
- **Real-time KPIs**: Live metrics tracking for sales performance
- **Interactive Charts**: Visual analytics for trends and performance
- **Lead Tracking**: Comprehensive pipeline and funnel management
- **Customer Insights**: AI-generated insights from contact interactions
- **Performance Metrics**: Detailed analytics on sales activities and outcomes

### 🛠️ Advanced AI Tools Suite

#### Contact Intelligence Tools
- **AI Contact Scoring**: Multi-model analysis using GPT-4 and Gemini for lead qualification
- **Contact Enrichment**: Web research integration for missing contact data (phone, email, social profiles)
- **AI Research Integration**: Real-time web search for company background and executive insights
- **Smart Categorization**: Automatic tagging based on industry, role, and engagement patterns
- **Relationship Mapping**: AI analysis of professional networks and connection strength
- **Bulk Contact Analysis**: Process multiple contacts simultaneously with AI insights

#### Communication & Content Tools
- **AI Email Composer**: Context-aware email generation with personalization and tone optimization
- **Smart Social Messaging**: Platform-specific content generation for LinkedIn, Twitter, WhatsApp
- **Objection Handler**: AI-powered responses to 50+ common sales objections
- **Subject Line Generator**: High-converting email subject lines with A/B testing insights
- **Meeting Summary Generator**: Automatic transcription and actionable summary creation
- **Communication Optimizer**: AI suggestions for better customer interaction timing and content

#### Sales Intelligence Tools
- **Live Deal Analysis**: Real-time deal health assessment with risk scoring and recommendations
- **Adaptive Playbook Generator**: AI-created sales strategies based on contact profiles and industry
- **Discovery Questions Generator**: Intelligent question suggestions for effective prospecting
- **Sales Forecasting**: Predictive deal outcomes with confidence intervals and risk factors
- **Communication Optimization**: AI timing suggestions for follow-ups and engagement

#### Search & Analysis Tools
- **Semantic Search**: Natural language search across contacts, deals, and communications
- **Voice Analysis**: AI-powered call recording analysis and sentiment detection
- **Vision Analyzer**: Image and document content extraction and analysis
- **Market Trend Content**: Real-time market insights and competitive intelligence
- **Form Validation**: AI-powered form error detection and correction suggestions

### 🎯 Sales Intelligence & Forecasting
- **AI Sales Forecasting**: Predictive analytics for deal outcomes
- **Communication Optimization**: AI suggestions for better customer interactions
- **Deal Health Analysis**: Real-time assessment of deal progress and risks
- **Adaptive Playbook Generation**: AI-created sales strategies based on contact profiles
- **Discovery Questions Generator**: Intelligent question suggestions for prospecting

### 📧 Communication & Email Management
- **AI Email Composer**: Intelligent email drafting with personalization
- **Social Message Generator**: AI-powered social media content creation
- **Email Analyzer**: AI analysis of email performance and engagement
- **Communication Hub**: Centralized communication management across channels

### 📋 Task & Pipeline Management
- **Automated Lead Nurturing**: AI-driven follow-up sequences
- **Task Automation**: Intelligent task creation and assignment
- **Pipeline Optimization**: AI recommendations for pipeline improvements
- **Deal Tracking**: Comprehensive deal management with AI insights

### 🎨 Interactive Landing Page & Demos
- **AI Sales Intelligence Demo**: Live demonstration of sales AI capabilities
- **Contact Management Demo**: Interactive contact processing showcase
- **Feature Exploration**: Hands-on experience with all AI tools
- **Guided Tours**: Contextual help and onboarding experiences

### 🎯 Guidance & User Experience
- **Welcome Experience**: Personalized onboarding for new users
- **Contextual Help**: Intelligent help system that appears when needed
- **Smart Tooltips**: AI-powered contextual information and tips
- **Progress Tracking**: User progress monitoring and recommendations

## 🚀 AI Integration Architecture

### Supported AI Providers
- **OpenAI**: GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-3.5 Turbo
- **Google Gemini & Gemma**: Gemini 2.0 Flash, Gemini 1.5 Pro, Gemma 2 models
- **Anthropic Claude**: Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus

### Smart AI Routing System
- **Automatic Model Selection**: Intelligent routing based on task requirements
- **Cost Optimization**: Prefer cost-effective models when quality permits
- **Performance Monitoring**: Real-time tracking of AI model performance
- **Fallback Chains**: Automatic failover between providers
- **Bulk Processing**: Optimized for high-volume AI operations

### AI Task Categories
- **Contact Analysis**: Scoring, enrichment, categorization, relationship mapping
- **Content Generation**: Emails, social posts, meeting summaries, responses
- **Sales Intelligence**: Forecasting, objection handling, deal analysis
- **Communication**: Email optimization, subject lines, personalization
- **Search & Discovery**: Semantic search, market trends, insights
- **Image Generation**: AI-powered marketing visuals with SmartCRM branding

## 🎨 Gemini AI Image Generation System

### Core Features
- **SmartCRM Prompt Templates**: 9 pre-built templates for different features (Enhanced Contacts, AI Sales Intelligence, etc.)
- **Advanced Image Generation**: Powered by Gemini 2.5 Flash with aspect ratio optimization
- **Supabase Storage Integration**: Automatic upload and storage of generated images with thumbnails
- **Saved Images Gallery**: Complete gallery management with metadata tracking and search
- **History Management**: Persistent generation history with re-run capabilities
- **Batch Operations**: Generate multiple variants and download all at once
- **Smart Branding**: Automatic SmartCRM style injection for consistent visuals

### Image Storage Architecture
- **Supabase Storage Buckets**: Separate buckets for full images (10MB) and thumbnails (1MB)
- **Database Integration**: PostgreSQL table for metadata, tags, and generation details
- **User Isolation**: Row Level Security ensures users only access their own images
- **Thumbnail Generation**: Automatic 200px thumbnail creation for faster gallery loading
- **Metadata Tracking**: Stores prompts, aspect ratios, variants, and generation parameters

### Gallery Management
- **Grid Layout**: Responsive gallery with thumbnail previews
- **Image Details**: Click any image to view full metadata and generation details
- **Search & Filter**: Find images by feature, format, or custom tags
- **Download Options**: Individual or batch download capabilities
- **Delete Management**: Secure deletion with confirmation dialogs
- **Performance Optimized**: Lazy loading and thumbnail caching

### Technical Implementation
- **TypeScript Integration**: Full type safety for image operations
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Loading States**: Real-time progress indicators for all operations
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Security**: Secure file uploads with proper authentication and validation

## 👥 Enhanced Contact Management Features

### AI-Powered Contact Intelligence
- **Multi-Model Scoring**: Uses OpenAI GPT-4 and Google Gemini for comprehensive lead qualification
- **Web Research Integration**: Real-time LinkedIn and company data enrichment
- **Smart Categorization**: Automatic tagging based on industry, role, and engagement patterns
- **Relationship Mapping**: AI analysis of professional networks and connection strength
- **Bulk Analysis**: Process hundreds of contacts simultaneously with AI insights

### Contact Detail View Features
- **8 Specialized Tabs**: Overview, Journey, Analytics, Communication, Automation, Sales Intelligence, AI Insights, Email
- **AI Research Integration**: Web search for background information and company insights
- **Contact Journey Timeline**: Visual timeline of all interactions and touchpoints
- **AI Insights Panel**: Deep analysis with predictive recommendations and next actions
- **Communication Hub**: Unified messaging across email, phone, SMS, and social platforms
- **Automation Panel**: Intelligent workflow automation with AI-suggested actions
- **Contact Analytics**: Comprehensive analytics on engagement patterns and conversion probability
- **Email Integration**: AI-powered email composition and analysis within contact context

### Contact Card Enhancements
- **AI Score Display**: Visual scoring with color-coded indicators (green/yellow/red)
- **Interest Level Tracking**: Hot/Medium/Low/Cold classification with animated indicators
- **Source Tracking**: Visual source badges (LinkedIn, Email, Website, etc.)
- **AI Insights Section**: Real-time AI recommendations and analysis
- **Customizable AI Toolbar**: Quick access to various AI tools and actions
- **Quick Actions**: Email, Call, and View buttons with streamlined workflows

### How Contact AI Features Work

#### 1. AI Contact Scoring Process
```
Input: Contact Data (name, company, title, interactions)
├── Multi-Model Analysis (GPT-4 + Gemini)
├── Web Research Integration
├── Pattern Recognition & Historical Data
├── Scoring Algorithm (0-100 scale)
└── Output: AI Score + Reasoning + Recommendations
```

#### 2. Contact Enrichment Workflow
```
Contact Data Gaps Detected
├── Web Search Queries Generated
├── LinkedIn Profile Research
├── Company Information Lookup
├── Social Media Profile Discovery
├── Data Validation & Verification
└── Contact Record Updated with New Data
```

#### 3. Relationship Mapping Algorithm
```
Contact Network Analysis
├── Professional Connections Identified
├── Interaction History Reviewed
├── Communication Patterns Analyzed
├── Influence & Decision-Making Power Assessed
└── Relationship Strength Score Generated
```

#### 4. Predictive Analytics Engine
```
Historical Contact Data
├── Engagement Pattern Analysis
├── Conversion Probability Modeling
├── Optimal Contact Timing Prediction
├── Recommended Actions Generation
└── Next Best Action Suggestions
```

## 🛠️ Technical Architecture

### Frontend Stack
- **React 18**: Modern React with hooks and concurrent features
- **TypeScript**: Full type safety and enhanced developer experience
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **Vite**: Fast build tool and development server
- **Zustand**: Lightweight state management
- **React Context**: Global state management for AI and guidance systems

### Backend & Infrastructure
- **Supabase**: PostgreSQL database, real-time subscriptions, authentication
- **Edge Functions**: Serverless functions for AI processing and integrations
- **Module Federation**: Micro-frontend architecture support
- **RESTful APIs**: Clean API design with comprehensive documentation

### Key Libraries & Tools
- **@google/generative-ai**: Google Gemini AI integration for image generation and analysis
- **@supabase/supabase-js**: Supabase client with storage and database integration
- **@supabase/storage-js**: Supabase Storage for file uploads and management
- **fuse.js**: Fuzzy search capabilities for intelligent contact search
- **react-hook-form**: Advanced form management and validation
- **recharts**: Data visualization and interactive charts
- **lucide-react**: Modern icon library with 1000+ icons
- **@floating-ui**: Advanced tooltip and popover positioning
- **clsx**: Utility for conditional CSS classes
- **date-fns**: Modern date utility library
- **uuid**: Universally unique identifier generation

## 📱 Remote Apps & Modules

The Smart CRM platform consists of multiple interconnected remote applications, each serving specific business functions. These modules can be deployed independently and communicate through Module Federation.

### Core Business Applications

#### 🏠 **Dashboard** (`src/pages/Dashboard.tsx`)
**Main Analytics Hub**
- Real-time KPI tracking and performance metrics
- Interactive charts and data visualizations
- Lead analytics and conversion tracking
- Revenue forecasting and trend analysis
- Custom dashboard widgets and layouts
- Performance benchmarking against goals

#### 👥 **Contacts** (`src/pages/Contacts.tsx`)
**AI-Powered Contact Management**
- Intelligent contact database with AI scoring
- Advanced search and filtering capabilities
- Bulk contact operations and management
- Contact enrichment from public sources
- Relationship mapping and network analysis
- Contact segmentation and categorization

#### 🤖 **AI Tools** (`src/pages/AITools.tsx`)
**Comprehensive AI Toolkit**
- Access to all 16+ real-time AI tools
- Streaming chat and conversational AI
- Voice analysis and transcription
- Semantic search across all data
- Vision analysis for images and documents
- Content generation and reasoning tools
- Real-time form validation and assistance

#### 📊 **Pipeline** (`src/pages/Pipeline.tsx`)
**Sales Pipeline Management**
- Visual pipeline stages and deal tracking
- Deal progression analytics and forecasting
- Automated stage transitions and notifications
- Revenue projection and quota tracking
- Pipeline health monitoring and alerts
- Custom pipeline configurations

#### ✅ **Tasks** (`src/pages/Tasks.tsx`)
**Task Management & Automation**
- Intelligent task creation and assignment
- Automated follow-up sequences
- Task prioritization and scheduling
- Progress tracking and completion analytics
- Integration with calendar and reminders
- Team collaboration and task delegation

#### 📅 **Appointments** (`src/pages/Appointments.tsx`)
**Appointment Scheduling System**
- AI-powered scheduling optimization
- Calendar integration and availability management
- Automated meeting reminders and follow-ups
- Appointment analytics and no-show tracking
- Virtual meeting integration (Zoom, Teams, etc.)
- Resource and room booking management

#### 💰 **Invoicing** (`src/pages/Invoicing.tsx`)
**Invoice Management & Billing**
- Automated invoice generation and sending
- Payment tracking and overdue management
- Tax calculation and compliance
- Recurring billing and subscription management
- Invoice templates and customization
- Financial reporting and analytics

#### 💬 **Text Messages** (`src/pages/TextMessages.tsx`)
**SMS Communication Hub**
- Bulk SMS campaigns and messaging
- AI-powered message personalization
- SMS analytics and delivery tracking
- Automated SMS sequences and drip campaigns
- Two-way SMS conversations
- SMS template management

#### 🎥 **Video Email** (`src/pages/VideoEmail.tsx`)
**Video Email Platform**
- Personal video email recording and sending
- Video analytics and engagement tracking
- Video template library and customization
- Automated video follow-up sequences
- Integration with email marketing tools
- Video performance analytics

#### ⚡ **Lead Automation** (`src/pages/LeadAutomation.tsx`)
**Automated Lead Management**
- Lead scoring and qualification automation
- Automated email sequences and nurturing
- Lead routing and assignment rules
- Lead source tracking and attribution
- Automated follow-up workflows
- Lead conversion optimization

#### 🎯 **Circle Prospecting** (`src/pages/CircleProspecting.tsx`)
**Advanced Prospecting Tools**
- LinkedIn and social media prospecting
- AI-powered lead research and enrichment
- Prospect list building and management
- Outreach sequence automation
- Prospect engagement tracking
- Compliance and privacy management

#### 📝 **Forms & Surveys** (`src/pages/FormsAndSurveys.tsx`)
**Form Builder & Survey Platform**
- Drag-and-drop form builder
- Advanced survey creation with logic
- Form analytics and response tracking
- Integration with CRM data
- Automated follow-up sequences
- A/B testing for form optimization

#### 📚 **Content Library** (`src/pages/ContentLibrary/ContentLibrary.tsx`)
**Content Management System**
- Centralized content storage and organization
- AI-powered content generation and optimization
- Content performance analytics
- Multi-format content support (text, images, video)
- Content approval workflows
- Content distribution and sharing

#### ❓ **FAQ** (`src/pages/FAQ.tsx`)
**Knowledge Base & Support**
- Comprehensive FAQ database
- AI-powered search and recommendations
- User feedback and improvement tracking
- Multi-language support
- Integration with help desk systems
- Analytics on frequently accessed topics

### Landing & Marketing Pages

#### 🏠 **Landing Page** (`src/pages/Landing/LandingPage.tsx`)
**Main Marketing Landing Page**
- Interactive product demonstrations
- Feature showcase and benefits
- Customer testimonials and social proof
- Pricing information and plans
- Lead capture forms and CTAs
- SEO-optimized content

#### 🤖 **AI Assistant Feature Page** (`src/pages/Landing/FeaturePage/AiAssistantFeaturePage.tsx`)
**AI Assistant Showcase**
- Live AI assistant demonstrations
- Use case examples and scenarios
- Performance metrics and capabilities
- Integration examples and code samples
- Customer success stories

#### 👥 **Contacts Feature Page** (`src/pages/Landing/FeaturePage/ContactsFeaturePage.tsx`)
**Contact Management Showcase**
- Contact management workflow demos
- AI enrichment examples
- Search and filtering demonstrations
- Bulk operation capabilities
- Integration with other tools

#### ⚙️ **Function Assistant Feature Page** (`src/pages/Landing/FeaturePage/FunctionAssistantFeaturePage.tsx`)
**Function Assistant Showcase**
- Custom function creation demos
- Automation workflow examples
- Integration capabilities
- Performance and reliability metrics
- Use case studies

#### 🖼️ **Image Generator Feature Page** (`src/pages/Landing/FeaturePage/ImageGeneratorFeaturePage.tsx`)
**AI Image Generation Showcase**
- Live image generation demos
- Style and customization options
- Quality and speed comparisons
- Integration examples
- Brand customization features

#### 📈 **Pipeline Feature Page** (`src/pages/Landing/FeaturePage/PipelineFeaturePage.tsx`)
**Pipeline Management Showcase**
- Pipeline visualization demos
- Deal tracking examples
- Analytics and reporting features
- Mobile and desktop experiences
- Integration with sales tools

#### 🔍 **Semantic Search Feature Page** (`src/pages/Landing/FeaturePage/SemanticSearchFeaturePage.tsx`)
**Semantic Search Showcase**
- Advanced search capability demos
- Natural language query examples
- Search result relevance demonstrations
- Performance metrics and speed
- Enterprise search integration

### Authentication & User Management

#### 🔐 **Registration** (`src/pages/Auth/Register.tsx`)
**User Registration System**
- Multi-step registration process
- Social login integration
- Email verification and validation
- Account setup and preferences
- Onboarding flow initiation
- Security and compliance features

### Development & Testing Modules

#### 🧪 **Test Web Search** (App.tsx - test mode)
**Web Search Testing Interface**
- AI-powered web search capabilities
- Search result analysis and ranking
- Performance testing and optimization
- Integration testing with search APIs
- Result validation and accuracy metrics

#### 🧪 **AI Testing Suite** (App.tsx - ai-test mode)
**Comprehensive AI Testing Platform**
- AI model performance testing
- Response quality evaluation
- Speed and latency measurements
- Error handling and fallback testing
- Integration testing across providers
- Cost analysis and optimization

#### 🧪 **Tooltip Test Suite** (App.tsx - tooltip-test mode)
**UI Component Testing Interface**
- Tooltip positioning and behavior testing
- Accessibility compliance validation
- Performance testing for UI components
- Cross-browser compatibility testing
- User experience optimization

## 📁 Project Structure

```
src/
├── components/
│   ├── ai-sales-intelligence/     # Sales AI tools and forecasting
│   │   ├── AdaptivePlaybookGenerator.tsx    # AI sales strategies
│   │   ├── CommunicationOptimizer.tsx       # Communication timing
│   │   ├── DealHealthPanel.tsx             # Deal risk analysis
│   │   ├── DiscoveryQuestionsGenerator.tsx # Prospecting questions
│   │   └── index.ts
│   ├── aiTools/                   # Real-time AI tool components
│   ├── contacts/                  # Enhanced contact management with AI
│   │   ├── AIEnhancedContactCard.tsx       # AI-powered contact cards
│   │   ├── AIInsightsPanel.tsx             # Deep contact analysis
│   │   ├── AutomationPanel.tsx             # Workflow automation
│   │   ├── CommunicationHub.tsx            # Unified messaging
│   │   ├── ContactAnalytics.tsx            # Engagement analytics
│   │   ├── ContactEmailPanel.tsx           # Email integration
│   │   ├── ContactJourneyTimeline.tsx      # Interaction timeline
│   │   └── index.ts
│   ├── dashboard/                 # Dashboard and analytics
│   ├── email/                     # Email and communication tools
│   ├── guidance/                  # Onboarding and help system
│   ├── landing/                   # Landing page and interactive demos
│   │   ├── InteractiveAISalesIntelligence.tsx  # Sales AI demo
│   │   ├── InteractiveContactDemo.tsx          # Contact features demo
│   │   ├── InteractiveEmailComposer.tsx        # Email composition demo
│   │   ├── LandingPage.tsx                     # Main landing page
│   │   └── index.ts
│   ├── layout/                    # Navigation and layout components
│   ├── modals/                    # Modal dialogs and forms
│   │   ├── ContactDetailView.tsx         # Enhanced contact details
│   │   ├── GeminiImageModal.tsx          # AI image generation
│   │   └── index.ts
│   ├── SavedImagesGallery.tsx     # Image gallery management
│   ├── shared/                    # Shared/reusable components
│   └── ui/                        # UI primitives and components
├── contexts/                      # React context providers
├── hooks/                         # Custom React hooks
├── lib/                           # Utility libraries
│   ├── supabase.ts                # Supabase client configuration
│   ├── promptTemplates.ts         # SmartCRM prompt templates
│   ├── history.ts                 # History management utilities
│   └── index.ts
├── pages/                         # Page components and remote apps
│   ├── AITools.tsx               # AI tools suite
│   ├── Appointments.tsx          # Appointment scheduling
│   ├── CircleProspecting.tsx     # Prospecting tools
│   ├── ContactDetail.tsx         # Contact details view
│   ├── Contacts.tsx              # Contact management
│   ├── Dashboard.tsx             # Main analytics dashboard
│   ├── FAQ.tsx                   # Knowledge base
│   ├── FormsAndSurveys.tsx       # Form builder
│   ├── Invoicing.tsx             # Invoice management
│   ├── LeadAutomation.tsx        # Lead automation
│   ├── Pipeline.tsx              # Sales pipeline
│   ├── Tasks.tsx                 # Task management
│   ├── TextMessages.tsx          # SMS platform
│   ├── VideoEmail.tsx            # Video email platform
│   ├── Auth/                     # Authentication pages
│   ├── ContentLibrary/           # Content management
│   └── Landing/                  # Marketing pages
├── services/                      # API services and integrations
│   ├── imageStorage.service.ts    # Supabase image storage
│   ├── geminiService.ts           # Gemini AI integration
│   ├── contactService.ts          # Contact management
│   ├── webSearchService.ts        # Web research integration
│   └── index.ts
├── store/                         # Zustand state stores
├── styles/                        # Global styles and CSS
├── tests/                         # Test files
├── types/                         # TypeScript type definitions
└── docs/                          # Documentation
supabase/
└── migrations/                    # Database migrations
    └── 001_create_generated_images_table.sql
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager
- Supabase account for backend services

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/deangilmoreremix/contactsfeature.git
cd contactsfeature
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment setup**
```bash
cp .env.example .env
# Configure your API keys and Supabase credentials in .env
```

4. **Start development server**
```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### Build for Production
```bash
npm run build
npm run preview
```

## 🔧 Configuration

### AI Provider Setup
Configure AI providers in your environment variables:

```env
# OpenAI
VITE_OPENAI_API_KEY=your_openai_key

# Google AI (for Gemini Image Generation)
VITE_GOOGLE_AI_API_KEY=your_google_ai_key

# Anthropic
VITE_ANTHROPIC_API_KEY=your_anthropic_key

# Supabase (Database & Storage)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Gemini API Key (if different from Google AI)
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### Feature Flags
Control feature availability through environment variables:

```env
VITE_ENABLE_AI_TOOLS=true
VITE_ENABLE_DASHBOARD_ANALYTICS=true
VITE_ENABLE_INTERACTIVE_DEMOS=true
```

## 📊 Usage Examples

### Contact Management with AI
```typescript
// AI-powered contact analysis
const analysis = await aiService.analyzeContact(contactData, {
  analysisTypes: ['scoring', 'categorization', 'insights'],
  urgency: 'high'
});
```

### Real-time AI Tools
```typescript
// Streaming chat with AI
const chatResponse = await streamingChat.generateResponse({
  message: userInput,
  context: conversationHistory,
  mode: 'professional'
});
```

### Sales Intelligence
```typescript
// AI sales forecasting
const forecast = await salesIntelligence.predictDealOutcome({
  dealData: currentDeal,
  historicalData: pastDeals,
  marketConditions: marketTrends
});
```

### Gemini AI Image Generation
```typescript
// Generate SmartCRM branded images
import { imageStorageService } from './services/imageStorage.service';

const imageModal = new GeminiImageModal();
await imageModal.generateImage({
  prompt: "Create a professional contact management dashboard interface",
  feature: "Enhanced Contacts",
  aspectRatio: "16:9",
  variants: 3
});

// Save generated image to Supabase
const result = await imageStorageService.saveGeneratedImage(
  imageDataUrl,
  "smartcrm-contacts-dashboard.png",
  {
    prompt: "Professional contact management interface",
    feature: "Enhanced Contacts",
    format: "presentation",
    aspect_ratio: "16:9"
  }
);
```

### Enhanced Contact Management
```typescript
// AI-powered contact analysis with web research
import { contactAI } from './services/contact-ai.service';

const analysis = await contactAI.analyzeContact(contactData, {
  includeWebResearch: true,
  businessGoals: ['lead_qualification', 'opportunity_identification'],
  analysisDepth: 'comprehensive'
});

// Contact enrichment with LinkedIn data
const enrichedContact = await contactAI.enrichContact(contactId, {
  sources: ['linkedin', 'company_website', 'social_media'],
  updateExisting: true
});

// Bulk contact processing
const bulkResults = await contactAI.processBulkContacts(contactList, {
  analysisType: 'scoring',
  priority: 'high',
  generateInsights: true
});
```

### Image Storage & Gallery Management
```typescript
// Load user's saved images
const userImages = await imageStorageService.getUserImages(20, 0);

// Update image metadata
await imageStorageService.updateImageMetadata(imageId, {
  tags: ['presentation', 'dashboard', 'professional'],
  feature: 'Enhanced Contacts'
});

// Delete saved image
const deleted = await imageStorageService.deleteSavedImage(imageId);
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Use TypeScript for all new code
- Follow React best practices and hooks patterns
- Write comprehensive tests for new features
- Update documentation for API changes
- Ensure AI integrations follow security best practices

## 📚 Documentation

- [Smart AI Integration Guide](src/docs/smart-ai-integration-guide.md)
- [API Documentation](src/docs/integration-api-docs.md)
- [AI Models Guide](src/docs/ai-models-guide.md)
- [Gemini Image Generation Guide](src/lib/promptTemplates.ts) - SmartCRM prompt templates
- [Image Storage Service](src/services/imageStorage.service.ts) - Supabase storage integration
- [Contact AI Features](src/components/contacts/) - Enhanced contact management
- [Database Migrations](supabase/migrations/) - Supabase schema setup

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e

# Type checking
npm run typecheck

# Linting
npm run lint
```

## 🚀 Deployment

### Vercel Deployment
```bash
npm run build
# Deploy to Vercel with vercel CLI or GitHub integration
```

### Docker Deployment
```bash
docker build -t smart-crm .
docker run -p 3000:3000 smart-crm
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern web technologies and AI-first design
- Powered by Supabase for backend infrastructure
- AI capabilities provided by OpenAI, Google, and Anthropic
- Community contributions and open-source ecosystem

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Contact the development team
- Check the documentation for common solutions

---

**Experience the future of CRM with AI-powered insights and automation.**
