# Contacts Feature - AI-Powered Contact Management

A modern, AI-driven contact management application built with React, TypeScript, and Supabase. Features advanced AI tools for sales intelligence, contact enrichment, and interactive demos.

## Features

- **AI-Powered Contact Management**: Intelligent contact scoring, enrichment, and insights
- **Sales Intelligence Tools**: AI-driven sales forecasting, objection handling, and communication optimization
- **Interactive Landing Page**: Live demos showcasing AI sales intelligence and contact management capabilities
- **Real-time AI Tools**: Streaming chat, voice analysis, semantic search, and more
- **Dashboard Analytics**: Comprehensive metrics, KPIs, and lead tracking
- **Email & Communication Hub**: AI-enhanced email composition and social messaging
- **Task & Pipeline Management**: Automated lead nurturing and deal tracking
- **Guidance System**: Contextual help and user onboarding experiences

### Recent Updates

- **Interactive AI Sales Intelligence**: Live demo component for exploring AI-driven sales features
- **Interactive Contact Demo**: Hands-on demonstration of contact management capabilities
- **Enhanced Landing Page**: Updated with new interactive components and improved user experience

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account (for backend services)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/deangilmoreremix/contactsfeature.git
cd contactsfeature
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys and configuration
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173` (default Vite port).

### Build for Production

```bash
npm run build
```

## Project Structure

```
src/
├── components/
│   ├── ai-sales-intelligence/     # AI sales tools
│   ├── contacts/                  # Contact management
│   ├── dashboard/                 # Dashboard components
│   ├── landing/                   # Landing page with interactive demos
│   ├── ui/                        # Reusable UI components
│   └── ...
├── contexts/                      # React contexts
├── hooks/                         # Custom React hooks
├── pages/                         # Application pages
├── services/                      # API and service integrations
├── store/                         # State management
└── types/                         # TypeScript type definitions
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **AI Integration**: OpenAI, Gemini, and custom AI services
- **Build Tool**: Vite
- **State Management**: Zustand, React Context
- **UI Components**: Custom component library with shadcn/ui inspiration

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
