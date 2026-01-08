# HawkOps

**Rise Above the Chaos** - An ITSM Business Simulation for UW-Whitewater

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)
![Deployment](https://img.shields.io/badge/deployed-Render.com-46E3B7.svg)

🚀 **Live Application**: [https://hawkops.caronelabs.com](https://hawkops.caronelabs.com)

## 🎯 Overview

HawkOps is an interactive, real-time multiplayer business simulation designed to teach IT Service Management (ITSM) principles through hands-on experience. Students work in teams to manage IT incidents, coordinate responses, and make critical decisions while learning ITIL best practices.

### Key Features

- **Real-time Multiplayer**: 2-3 teams with 2-3 members each
- **Role-based Gameplay**: Service Desk, Technical Operations, and Management/CAB teams
- **75-minute Sessions**: Intensive, focused learning experiences
- **AI-Powered Scenarios**: Claude AI generates dynamic incidents and provides intelligent feedback
- **Persistent State**: Games can be saved and resumed across sessions
- **Team Collaboration**: Built-in chat and coordination tools

## 🏗️ Architecture

### Tech Stack

**Frontend**
- React 18 with TypeScript
- Vite for build tooling
- TailwindCSS for styling
- Socket.IO client for real-time communication
- Zustand for state management

**Backend**
- Node.js with Express
- TypeScript
- Socket.IO for WebSocket connections
- PostgreSQL for persistent data
- Redis for session management and real-time state
- Anthropic Claude API for AI-powered scenarios

### Project Structure

```
HawkOps/
├── packages/
│   ├── frontend/          # React frontend application
│   │   ├── src/
│   │   │   ├── components/    # Reusable UI components
│   │   │   ├── pages/         # Page components
│   │   │   ├── hooks/         # Custom React hooks
│   │   │   ├── services/      # API and Socket services
│   │   │   ├── store/         # Zustand state management
│   │   │   ├── types/         # TypeScript type definitions
│   │   │   └── utils/         # Utility functions
│   │   └── package.json
│   │
│   ├── backend/           # Node.js backend server
│   │   ├── src/
│   │   │   ├── config/        # Configuration files
│   │   │   ├── routes/        # API routes
│   │   │   ├── controllers/   # Request handlers
│   │   │   ├── services/      # Business logic
│   │   │   ├── models/        # Database models
│   │   │   ├── middleware/    # Express middleware
│   │   │   ├── socket/        # Socket.IO handlers
│   │   │   ├── database/      # Database schemas and migrations
│   │   │   └── utils/         # Utility functions
│   │   └── package.json
│   │
│   └── shared/            # Shared types and constants
│       ├── src/
│       │   ├── types.ts       # Shared TypeScript types
│       │   └── constants.ts   # Shared constants
│       └── package.json
│
├── .env.example           # Environment variable template
├── package.json           # Root package.json (workspace)
└── README.md

```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL >= 14
- Redis >= 6
- Anthropic API key (for Claude AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/cocheuno/HawkOps.git
   cd HawkOps
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Configure your `.env` file**
   ```env
   # Database
   DATABASE_URL=postgresql://hawkops:hawkops@localhost:5432/hawkops

   # Redis
   REDIS_URL=redis://localhost:6379

   # Session
   SESSION_SECRET=your-secret-key-here

   # Claude AI
   ANTHROPIC_API_KEY=your-api-key-here
   ```

5. **Set up the database**
   ```bash
   # Create the database
   createdb hawkops

   # Run migrations
   npm run db:migrate --workspace=packages/backend

   # (Optional) Seed with demo data
   npm run db:seed --workspace=packages/backend
   ```

6. **Start development servers**
   ```bash
   # Start both frontend and backend
   npm run dev

   # Or start individually
   npm run dev:backend
   npm run dev:frontend
   ```

7. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - Health check: http://localhost:3000/health
  

## ☁️ Production Deployment

HawkOps is deployed on Render.com with automatic deployments from the `main` branch.

### Live URLs

- **Production App**: https://hawkops.caronelabs.com
- **Health Check**: https://hawkops.caronelabs.com/health

### Deployment Configuration

The application uses Render Blueprint (`render.yaml`) for infrastructure as code:

**Services:**
- Web Service: Node.js application (frontend + backend)
- PostgreSQL Database: Free tier with automatic backups
- Redis Instance: For session management and caching

**Environment Variables (set in Render Dashboard):**
```env
DATABASE_URL          # Auto-linked from PostgreSQL database
REDIS_URL             # Auto-linked from Redis instance
SESSION_SECRET        # Auto-generated by Render
ANTHROPIC_API_KEY     # Must be set manually
CLAUDE_MODEL          # Optional: defaults to claude-3-5-sonnet-20241022


## 🎮 Game Mechanics

### Team Roles

**Service Desk**
- First point of contact for incidents
- Initial triage and categorization
- Communication with end users
- Escalation to Technical Operations

**Technical Operations**
- Deep technical investigation
- Root cause analysis
- Incident resolution
- Infrastructure management

**Management/CAB (Change Advisory Board)**
- Strategic oversight
- Change approval/rejection
- Resource allocation
- Risk management

### Scoring System

Teams earn points through:
- Quick incident resolution
- Proper escalation procedures
- Effective communication
- SLA compliance
- Customer satisfaction

Points are deducted for:
- SLA violations
- Improper escalations
- Poor communication
- Unresolved incidents

## 🔧 Development

### Available Scripts

**Root level:**
- `npm run dev` - Start both frontend and backend
- `npm run build` - Build all packages
- `npm run test` - Run tests for all packages
- `npm run lint` - Lint all packages
- `npm run clean` - Clean node_modules and build artifacts

**Backend:**
- `npm run dev --workspace=packages/backend` - Start backend in watch mode
- `npm run build --workspace=packages/backend` - Build backend
- `npm run db:migrate --workspace=packages/backend` - Run database migrations
- `npm run db:seed --workspace=packages/backend` - Seed database

**Frontend:**
- `npm run dev --workspace=packages/frontend` - Start frontend dev server
- `npm run build --workspace=packages/frontend` - Build frontend for production
- `npm run preview --workspace=packages/frontend` - Preview production build

### Database Schema

The application uses PostgreSQL with the following main tables:
- `users` - User accounts
- `games` - Game sessions
- `teams` - Teams within games
- `players` - Players in games
- `incidents` - IT incidents to be resolved
- `actions` - Player actions and decisions
- `game_events` - Event timeline
- `chat_messages` - Team communication
- `game_metrics` - Performance metrics
- `ai_interactions` - Claude AI interactions

See `packages/backend/src/database/schema.sql` for the complete schema.

## 🤖 AI Integration

HawkOps uses Anthropic's Claude API to:
- Generate realistic IT incidents based on difficulty level
- Analyze player actions and determine consequences
- Provide contextual hints and guidance
- Create dynamic scenario variations
- Simulate stakeholder responses

## 📊 Monitoring & Logging

- Winston for structured logging
- Request/response logging middleware
- Error tracking and reporting
- Game metrics and analytics

## 🔒 Security

- Helmet.js for security headers
- Rate limiting on API endpoints
- Session management with Redis
- Input validation with Joi
- CORS configuration
- Secure WebSocket connections

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run backend tests
npm run test --workspace=packages/backend

# Run frontend tests
npm run test --workspace=packages/frontend
```

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For questions or support, please contact the UW-Whitewater IT program.

## 🙏 Acknowledgments

- UW-Whitewater for project sponsorship
- Anthropic for Claude AI API
- The open-source community for excellent tools and libraries

---

**HawkOps** - Empowering the next generation of IT professionals through immersive simulation.
