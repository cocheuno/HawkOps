
 
**HawkOps - Rise Above the Chaos**
An ITSM Business Simulation for UW-Whitewater
 
---
 
## Table of Contents
 
1. [System Overview](#1-system-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Backend Architecture](#4-backend-architecture)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Shared Package](#6-shared-package)
7. [Database Architecture](#7-database-architecture)
8. [AI Integration](#8-ai-integration)
9. [Real-Time Communication](#9-real-time-communication)
10. [Authentication and Authorization](#10-authentication-and-authorization)
11. [Core Workflows](#11-core-workflows)
12. [Deployment Architecture](#12-deployment-architecture)
13. [API Reference](#13-api-reference)
14. [Configuration Reference](#14-configuration-reference)
 
---
 
## 1. System Overview
 
HawkOps is a web-based IT Service Management (ITSM) simulation platform designed for educational use. Students form teams with assigned ITSM roles (Service Desk, Technical Operations, Management/CAB) and work together to manage IT incidents, create implementation plans, process change requests through a Change Advisory Board workflow, and handle stakeholder communications -- all in a realistic, time-pressured simulation environment.
 
The platform uses Claude AI (Anthropic) to dynamically generate scenarios, inject context-aware incidents, evaluate student-submitted implementation plans, and provide educational feedback.
 
### Key Capabilities
 
- **Game Management**: Instructors create and facilitate simulation sessions with configurable duration and team composition
- **AI Scenario Generation**: Claude generates complete scenarios including instructor playbooks, general briefings, and team-specific packets
- **Incident Management**: Teams triage, assign, escalate, and resolve IT incidents with SLA tracking
- **Implementation Planning**: Teams create detailed plans that are evaluated by AI with constructive feedback
- **Change Advisory Board (CAB)**: Management/CAB teams review, edit, send for technical review, approve, or reject change requests
- **SLA Monitoring**: Real-time SLA tracking with automatic breach detection and priority escalation
- **Service Health Tracking**: Infrastructure service status monitoring with dependency cascade modeling
- **Stakeholder Communications**: Simulated executive, customer, media, and vendor communications with AI-evaluated responses
- **Post-Incident Reviews (PIR)**: Structured retrospective analysis with root cause investigation
- **Gamification**: Achievements (6 categories with rarity levels), challenges, leaderboards, and team scoring
- **Analytics**: Real-time metrics, team comparison, learning progress tracking, and exportable reports
 
---
 
## 2. High-Level Architecture
 
```
                           +---------------------+
                           |   Browser (React)   |
                           |  Vite + TypeScript   |
                           +----------+----------+
                                      |
                        HTTP/REST     |     WebSocket
                     (Axios)          |     (Socket.IO)
                                      |
                           +----------+----------+
                           |  Express.js Server  |
                           |   (Node.js 18+)     |
                           +----+------+----+----+
                                |      |    |
                    +-----------+  +---+    +----------+
                    |              |                    |
            +-------+------+ +----+-----+   +--------+--------+
            |  PostgreSQL  | |   Redis  |   |   Anthropic API  |
            |   (v16)      | |  (v7)    |   |   (Claude AI)    |
            +--------------+ +----------+   +------------------+
             Data Storage     Sessions       Scenario Generation
             Schema/SQL       Caching        Plan Evaluation
             Migrations                      Incident Creation
```
 
### Technology Stack
 
| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18, TypeScript, Vite | Single-page application |
| Styling | Tailwind CSS | Utility-first CSS framework |
| State Management | Zustand | Lightweight client-side state |
| HTTP Client | Axios | REST API communication |
| Real-Time | Socket.IO | WebSocket-based game events |
| Backend | Express.js, TypeScript | REST API server |
| Database | PostgreSQL 16 | Persistent data storage |
| Cache/Sessions | Redis 7 | Session storage |
| AI | Anthropic Claude API (Haiku) | Scenario/incident generation, evaluation |
| Logging | Winston | Structured logging with file rotation |
| Security | Helmet, bcrypt, JWT | HTTP security headers, password hashing, auth tokens |
| Email | Nodemailer | Student notification emails |
| Containerization | Docker, Docker Compose | Development and deployment |
 
---
 
## 3. Monorepo Structure
 
HawkOps uses npm workspaces to manage a monorepo with three packages:
 
```
HawkOps/
  package.json                  # Root workspace configuration
  docker-compose.yml            # Container orchestration (4 services)
  docs/                         # Documentation
  packages/
    shared/                     # Shared TypeScript types
      src/
        types.ts                # Domain interfaces (Game, Team, Incident, etc.)
      package.json
      tsconfig.json
 
    backend/                    # Express API server
      src/
        server.ts               # Entry point: HTTP server, DB, Redis, migrations
        app.ts                  # Express configuration and middleware stack
        config/
          database.ts           # PostgreSQL pool (max 20 connections)
          redis.ts              # Redis client with retry strategy
          env.ts                # Environment variable configuration
        middleware/
          errorHandler.ts       # AppError class and global error handler
          requestLogger.ts      # Winston-based request/response logging
          studentAuth.middleware.ts  # JWT verification and team authorization
        routes/                 # 12 route modules
          index.ts              # Route aggregator
          gameRoutes.ts         # Game lifecycle endpoints
          instructorRoutes.ts   # Instructor and student management
          teamRoutes.ts         # Team dashboard and implementation plans
          aiRoutes.ts           # AI generation endpoints
          realismRoutes.ts      # Escalation, dependencies, changes, resources
          competitiveRoutes.ts  # Achievements, leaderboard, challenges
          analyticsRoutes.ts    # Metrics and reporting
          documentRoutes.ts     # Simulation document management
          pirRoutes.ts          # Post-Incident Review
          communicationsRoutes.ts  # Stakeholder communications
          adminRoutes.ts        # Database migration trigger
          studentAuthRoutes.ts  # Student token verification
        controllers/            # 12 controller modules
          gameController.ts     # Game create/join/start, service health
          instructorController.ts  # AI incident injection, game state, SLA
          teamController.ts     # Team dashboard, incident status updates
          implementationPlanController.ts  # Plan CRUD, AI eval, change requests
          aiController.ts       # Scenario and document generation
          studentController.ts  # Student roster and team assignments
          pirController.ts      # PIR workflow
          stakeholderController.ts  # Stakeholder communications
          documentController.ts # Document CRUD and read tracking
          competitiveController.ts  # Achievements, leaderboard, challenges
          realismController.ts  # Escalation, dependencies, changes, resources
          analyticsController.ts  # Metrics and reporting
        services/               # Business logic services
          claudeService.ts      # Core Anthropic API wrapper
          aiGameMaster.service.ts  # Context-aware incident generation
          changeRequest.service.ts # Change request lifecycle, CAB workflow
          sla.service.ts        # SLA breach detection and escalation
          (and others for email, achievements, etc.)
        socket/                 # Real-time communication
          index.ts              # Socket.IO server initialization
          gameHandlers.ts       # Game room events
          teamHandlers.ts       # Team coordination events
          chatHandlers.ts       # Chat and typing events
        utils/
          logger.ts             # Winston logger configuration
        database/
          schema.sql            # Base schema (all core tables)
          migrate.ts            # Migration runner
          migrations/           # 12 incremental SQL migration files
      Dockerfile
      package.json
 
    frontend/                   # React SPA
      src/
        main.tsx                # React DOM entry point
        App.tsx                 # BrowserRouter with 12 routes
        pages/                  # 11 page components
        components/             # 18+ reusable UI components
        Components/             # CreateGameModal
        store/
          gameStore.ts          # Zustand state management
        services/
          api.ts                # Axios HTTP client
          socket.ts             # Socket.IO client singleton
        hooks/
          useSocket.ts          # Socket lifecycle hook
        index.css               # Tailwind directives and global styles
        App.css                 # Custom animations and component styles
      Dockerfile
      package.json
      vite.config.ts
      tailwind.config.js
```
 
### Build Pipeline
 
```
npm run build
  1. packages/shared   -> tsc          -> dist/    (types only)
  2. packages/backend  -> tsc          -> dist/    (Node.js compatible)
  3. packages/frontend -> tsc + vite   -> dist/    (Bundled SPA)
```
 
The shared package builds first as both backend and frontend depend on its type definitions. The backend compiles TypeScript to JavaScript. The frontend uses Vite for production bundling with TypeScript type checking.
 
---
 
## 4. Backend Architecture
 
### 4.1 Server Initialization (server.ts)
 
The server startup sequence:
 
1. Create HTTP server from the Express application
2. Initialize Socket.IO on the HTTP server
3. Connect to PostgreSQL (connection pool, max 20 connections, 30s idle timeout)
4. Run database schema (idempotent `CREATE TABLE IF NOT EXISTS` statements)
5. Connect to Redis with retry strategy (max 2000ms delay)
6. Configure session middleware with Redis store (24-hour cookie TTL)
7. Start listening on the configured port (default 3000)
8. Register graceful shutdown handlers (SIGTERM/SIGINT) with a 10-second forced shutdown timeout
 
### 4.2 Express Middleware Stack (app.ts)
 
Middleware executes in order (order matters):
 
```
Incoming Request
  -> Helmet (security headers, CSP in production)
  -> CORS (CLIENT_URL origin, credentials enabled, GET/POST/PUT/DELETE/PATCH)
  -> JSON body parser
  -> URL-encoded body parser
  -> Request logger (Winston: method, URL, IP, user-agent, response duration)
  -> Session middleware (Redis-backed, configured after Redis connects)
  -> API routes (/api/*)
  -> Static file serving (production: frontend dist/, development: JSON message)
  -> Global error handler (AppError class, hides stack traces in production)
```
 
### 4.3 Route Architecture
 
All API routes are mounted under `/api` via the route index module:
 
| Route Module | Mount Path | Purpose |
|-------------|-----------|---------|
| gameRoutes | `/api/games` | Game CRUD, join, start, service health |
| instructorRoutes | `/api/instructor` | Student management, incident injection, game state |
| teamRoutes | `/api/teams` | Team dashboard, incidents, implementation plans |
| pirRoutes | `/api/pir` | Post-Incident Review CRUD and submission |
| communicationsRoutes | `/api/communications` | Stakeholder message responses |
| competitiveRoutes | `/api/*` | Achievements, leaderboard, challenges |
| realismRoutes | `/api/*` | Escalation, dependencies, change requests, resources |
| analyticsRoutes | `/api/*` | Metrics, dashboard, reporting, export |
| documentRoutes | `/api/*` | Simulation document management and tracking |
| aiRoutes | `/api/instructor/ai` | AI scenario and document generation |
| adminRoutes | `/api/admin` | Database migration trigger |
| studentAuthRoutes | `/api/student` | Student token verification and dashboard |
 
### 4.4 Controller Layer
 
Controllers handle HTTP request/response processing. Each controller corresponds to a domain:
 
| Controller | Key Methods |
|-----------|-------------|
| gameController | `createGame` (with teams), `joinGame`, `startGame` (initializes services, escalation rules, resources, shifts, dependencies), `getServiceHealth` |
| instructorController | `injectAIIncident` (uses AIGameMasterService, round-robin team assignment excluding CAB), `getGameState`, `checkSLABreaches` |
| teamController | `getDashboard` (incidents, tech debt, game state), `updateIncidentStatus`, `getIncidentDetails` |
| implementationPlanController | `createPlan`, `submitPlan` (triggers async AI evaluation), `updatePlan`, `createChangeRequest` (from approved plan, score >= 50 required) |
| aiController | `generateScenarios` (5 scenario options), `generateDocuments` (playbook, briefing, team packets) |
| studentController | Student CRUD, team assignments, email notifications |
| realismController | Escalation, service dependencies, change requests, CAB workflow (send-for-review, submit-review, cab-approve, cab-reject), resource management |
 
### 4.5 Service Layer
 
Services encapsulate core business logic independent of HTTP concerns:
 
**claudeService** (`claudeService.ts`): Low-level Anthropic API wrapper
- Model: `claude-3-haiku-20240307` (configurable via CLAUDE_MODEL)
- Methods: `generateScenarioResponse()`, `generateScenarios()`, `generateDocuments()`, `analyzeAction()`, `generateIncident()`, `provideGuidance()`
- JSON sanitization for AI responses (strips control characters before parsing)
- Graceful fallback when API key is not configured or is a dummy key
 
**AIGameMasterService** (`aiGameMaster.service.ts`): Context-aware incident generation
- Gathers comprehensive game context: scenario, teams, recent incidents, technical debt, playbook
- Calculates dynamic chaos level (0-10) based on active incidents, technical debt, morale, and budget
- Ensures CAB/Management teams never receive incidents
- Round-robin assignment across operational teams for fairness
- Logs all AI interactions with token counts and latency
 
**ChangeRequestService** (`changeRequest.service.ts`): Full CAB workflow
- States: `pending_cab` -> `under_review` -> `review_complete` -> `approved`/`rejected`
- Emergency changes auto-approved
- Risk-based implementation simulation with failure rates (5-45% based on risk level)
- Mitigation factors reduce failure: implementation plan (x0.7), rollback plan (x0.8), test plan (x0.9)
- Scoring: +50 to +200 points for success, -25 to -150 for failure (based on risk)
 
**SLAService** (`sla.service.ts`): SLA monitoring and breach handling
- Detects breaches by comparing incident creation time + SLA minutes against current time
- Auto-escalates priority on breach: low -> medium -> high -> critical
- Marks incidents as `sla_breached` and logs game events
 
### 4.6 Middleware
 
| Middleware | Purpose |
|-----------|---------|
| `errorHandler` | Catches all errors, returns structured JSON. Custom `AppError` class with `statusCode` and `isOperational` flag. Hides stack traces in production. |
| `requestLogger` | Logs every request (method, URL, IP, user-agent) and response (status code, duration in ms) via Winston. |
| `verifyStudentToken` | Validates JWT from query parameter or Authorization header. Checks player exists, game is active, and updates last-access timestamp. |
| `ensureOwnTeam` | Ensures authenticated student can only access resources belonging to their assigned team. |
 
---
 
## 5. Frontend Architecture
 
### 5.1 Routing (App.tsx)
 
The React application uses React Router v6 for client-side routing:
 
| Path | Component | Access |
|------|-----------|--------|
| `/` | HomePage | Public - game creation and joining |
| `/lobby/:gameId` | GameLobbyPage | Players waiting for game start |
| `/game/:gameId` | GameplayPage | Active gameplay view |
| `/team/:teamId` | OperationsDashboardPage | Team operations dashboard |
| `/instructor/:gameId` | InstructorDashboardPage | Instructor control panel |
| `/instructor/game/:gameId/documents` | DocumentManagerPage | Document management |
| `/instructor/game/:gameId/ai-generate` | AIScenarioGeneratorPage | AI scenario generation |
| `/instructor/game/:gameId/playbook` | InstructorPlaybookPage | Playbook management |
| `/instructor/game/:gameId/students` | StudentManagementPage | Student roster and assignments |
| `/game/:gameId/briefing` | ParticipantDocumentsPage | Read-only documents for participants |
| `/student/team/:teamId` | StudentTeamPage | Token-authenticated student team view |
 
### 5.2 Page Components
 
| Page | Description |
|------|-------------|
| **HomePage** | Landing page with game creation modal (name, duration, teams/roles) and game join functionality |
| **GameLobbyPage** | Pre-game waiting room where players select teams and mark themselves ready |
| **GameplayPage** | Main game view during active simulation |
| **OperationsDashboardPage** | Primary team dashboard: incidents list, service health, SLA timers, implementation plans, change requests, stakeholder inbox, achievements. Composes most reusable components |
| **InstructorDashboardPage** | Instructor control panel: game state overview, team monitoring, incident injection, SLA management, analytics |
| **InstructorPlaybookPage** | Scenario playbook management for instructors |
| **DocumentManagerPage** | CRUD interface for simulation documents with visibility controls |
| **ParticipantDocumentsPage** | Read-only document viewer for game participants |
| **AIScenarioGeneratorPage** | Interface for AI-powered scenario generation (5 options per request) |
| **StudentManagementPage** | Student roster management, team assignments, email invitations |
| **StudentTeamPage** | Restricted student view accessed via email link with JWT token |
 
### 5.3 Reusable Components
 
**Incident and Operations:**
 
| Component | Props | Description |
|-----------|-------|-------------|
| IncidentDetailModal | `incident, onClose, onStatusChange` | Modal displaying incident details with status transition buttons (open -> in_progress -> resolved -> closed), priority/severity badges, SLA deadline, AI teaching points |
| SLATimer | `incidentId, deadline, priority` | Color-coded countdown timer with pulse animations for approaching deadlines |
| ServiceHealthDashboard | `gameId, compact?, isInstructor?` | Grid of service status cards (operational/degraded/down) with health metrics |
| ServiceDependencyGraph | `gameId, compact?` | Layered dependency visualization with cascade impact simulation and criticality assessment |
| EscalationPanel | `gameId, teamId, compact?` | Escalation queue with escalation workflow management and acknowledgment |
 
**Planning and Change Management:**
 
| Component | Props | Description |
|-----------|-------|-------------|
| ImplementationPlanPanel | `gameId, teamId, incidents?, compact?` | Full plan lifecycle: create draft, edit fields (title, description, root cause, steps, risk, mitigation, rollback), submit for AI evaluation, view feedback/score, create change request |
| ChangeRequestPanel | `gameId, teamId?, isInstructor?, compact?` | Change request creation form with implementation plan, rollback plan, and test plan fields; status tracking |
| CABWorkflowPanel | `gameId, teamId, teams, isCABTeam, compact?` | CAB review queue with modal showing change details. CAB actions: edit, send for technical review, approve (with notes), reject (with required reason). Technical review submission with recommendations |
 
**Communication and Review:**
 
| Component | Props | Description |
|-----------|-------|-------------|
| StakeholderInbox | `teamId, compact?` | Stakeholder messages from executives, customers, media, regulators, and vendors. Urgency and sentiment tracking. AI-evaluated response scoring (professionalism, empathy, information quality, action-orientation) |
| PIRForm | `teamId, incidentId, onClose, onSubmitted?` | Post-Incident Review form with what-happened analysis, root cause, lessons learned, action items with owners and due dates |
| DocumentEditor | `gameId, document?, onClose, onSave` | Document creation with template selection, visibility controls (instructor_only, all_participants, team_only), markdown support, required-reading flag |
 
**Gamification and Analytics:**
 
| Component | Props | Description |
|-----------|-------|-------------|
| AchievementsPanel | `teamId, gameId, compact?` | Achievement badges with rarity levels (legendary, epic, rare, uncommon), progress bars, category filtering (speed, quality, teamwork, leadership, learning, special) |
| ChallengesPanel | `gameId, teamId, compact?` | Active challenge objectives with progress tracking |
| Leaderboard | `gameId, compact?, isInstructor?` | Team rankings with score comparison and performance metrics |
| AnalyticsDashboard | `gameId, teamId?, isInstructor?` | Multi-tab analytics: Overview (key metrics cards), Metrics (team performance), Learning (skill progress by area), Trends (historical snapshots). Export and report generation |
| ResourceManagementPanel | `gameId, teamId?, isInstructor?, compact?` | Team capacity visualization, staff allocation, fatigue levels, skill assessment, shift schedules |
 
**Navigation and Creation:**
 
| Component | Props | Description |
|-----------|-------|-------------|
| Navigation | (none) | Main navigation bar |
| CreateGameModal | `isOpen, onClose, onSubmit, facilitatorName` | Game creation form: name, duration slider (30-120 min), team configuration (2-3 teams), role assignment |
 
### 5.4 State Management
 
**Zustand Store** (`store/gameStore.ts`):
 
```typescript
interface GameState {
  gameId: string | null;
  status: 'lobby' | 'active' | 'paused' | 'completed';
  teams: Team[];            // Each team: id, name, role, members[], score
  currentPlayer: Player | null;
  timeRemaining: number;    // Seconds (default: 75 * 60 = 4500)
  startedAt: string | null;
}
```
 
Actions: `setGameId`, `setStatus`, `setTeams`, `setCurrentPlayer`, `setTimeRemaining`, `addTeam`, `updateTeam`, `addPlayerToTeam`, `removePlayerFromTeam`, `reset`
 
Most components also use local `useState` for component-specific data, fetching directly from the API via Axios. The Zustand store manages core game session state shared across components.
 
### 5.5 API Communication
 
**HTTP Client** (`services/api.ts`):
- Base URL: `/api` in production, `http://localhost:3000/api` in development
- Components use the `API_URL` constant directly with Axios for API calls
- Toast notifications (react-hot-toast) for success/error feedback
 
**WebSocket Client** (`services/socket.ts`):
- Singleton `SocketService` class wrapping Socket.IO client
- Connects to `VITE_SOCKET_URL` (default: `http://localhost:3000`)
- Transports: WebSocket primary, polling fallback
- Auto-reconnection: 5 attempts, 1-5 second exponential backoff
- Game methods: `joinGame`, `leaveGame`, `submitAction`, `requestGameState`
- Chat methods: `sendMessage`, `sendTypingIndicator`
- Team methods: `sendTeamMessage`, `coordinateTeamAction`
 
**Custom Hook** (`hooks/useSocket.ts`):
- `useSocket(sessionId)` - Manages socket connection lifecycle tied to React component
- `useSocketEvent(event, callback)` - Event subscription with automatic cleanup
 
### 5.6 Styling
 
- **Framework**: Tailwind CSS with custom configuration
- **Brand Color**: `hawk-purple` (#4B2E83)
- **Custom Animations**: SLA timer pulse effects (`pulse`, `urgentPulse` keyframes)
- **Custom Styles**: Range slider theming, service health status indicators
- **Approach**: Utility-first Tailwind classes inline on components; minimal custom CSS in `App.css` and `index.css`
 
---
 
## 6. Shared Package
 
The `packages/shared` package provides TypeScript type definitions consumed by both backend and frontend:
 
### Domain Types
 
```typescript
type GameStatus = 'lobby' | 'active' | 'paused' | 'completed';
type TeamRole = 'Service Desk' | 'Technical Operations' | 'Management/CAB';
type IncidentPriority = 'low' | 'medium' | 'high' | 'critical';
type IncidentStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type EventSeverity = 'info' | 'warning' | 'error' | 'critical';
```
 
### Key Interfaces
 
- `User` - id, username, email, timestamps
- `Game` - id, name, status, durationMinutes, timestamps
- `Team` - id, gameId, name, role, score, timestamps
- `Player` - id, userId, gameId, teamId, name, isReady, joinedAt
- `Incident` - id, gameId, title, description, priority, status, affectedServices, assignedTeamId
- `Action` - id, gameId, teamId, playerId, actionType, actionData, result, pointsAwarded
- `GameEvent` - id, gameId, eventType, eventData, severity
- `ChatMessage` - id, gameId, teamId, playerId, message
- `GameMetric` - id, gameId, teamId, metricName, metricValue
- `AIInteraction` - id, gameId, interactionType, prompt, response, tokensUsed
 
### Socket Event Type Definitions
 
The `SocketEvents` interface provides type-safe definitions for all client-to-server and server-to-client Socket.IO events, covering game lifecycle, team coordination, and chat messaging.
 
---
 
## 7. Database Architecture
 
### 7.1 Engine and Connection
 
PostgreSQL 16 (Alpine) with connection pooling:
- Max connections: 20
- Idle timeout: 30 seconds
- Connection timeout: 2 seconds
- Connection string via `DATABASE_URL` environment variable
 
### 7.2 Schema Overview
 
The schema is organized into a base `schema.sql` file (which creates all core tables idempotently) and 12 migration files that add features incrementally.
 
```
games (root entity)
  |-- teams (3 per game: Service Desk, Technical Operations, Management/CAB)
  |     |-- players (up to 3 per team)
  |     |     |-- linked to students (global roster)
  |     |-- team_resources (budget, staff, tools)
  |     |-- shift_schedules
  |
  |-- incidents (assigned to teams, with SLA tracking)
  |     |-- incident_escalations (escalation history)
  |     |-- implementation_plans (team-submitted resolution plans)
  |           |-- implementation_plan_revisions (version history with AI feedback)
  |           |-- change_requests (CAB workflow: pending_cab -> review -> approved/rejected)
  |                 |-- change_approvals (CAB decision records)
  |
  |-- services (10 infrastructure services per game)
  |     |-- service_dependencies (hard/soft dependency relationships)
  |
  |-- escalation_rules (5 auto-escalation rules per game)
  |
  |-- game_events (audit log with event_type, category, severity)
  |-- game_metrics (team performance metrics)
  |-- chat_messages (team chat)
  |-- ai_interactions (AI API call logging)
  |-- simulation_documents (scenario documents with visibility)
  |-- scenario_generations (AI generation history)
```
 
### 7.3 Core Tables
 
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `games` | Game sessions | status, duration_minutes, scenario_context (JSONB), scenario_generated |
| `teams` | Teams within games | role (Service Desk/Technical Operations/Management-CAB), score |
| `players` | Individual participants | student_id (FK to students), is_ready, access_token |
| `students` | Global student roster | first_name, last_name, email, student_id, is_active |
| `incidents` | IT incidents | priority, severity, status, assigned_team_id, sla_deadline, sla_breached, ai_context (JSONB), resolution_notes |
| `implementation_plans` | Resolution plans | plan_number, title, description, root_cause_analysis, implementation_steps (JSONB), risk_level, mitigation_strategy, rollback_plan, status, ai_evaluation (JSONB), ai_evaluation_score |
| `implementation_plan_revisions` | Plan version history | revision_number, plan_snapshot (JSONB), ai_feedback, ai_score |
| `change_requests` | CAB workflow items | change_number, change_type, risk_level, workflow_state, requested_by_team_id, review_team_id, cab_team_id, review_status, review_notes, approval_notes, related_plan_id |
| `services` | Infrastructure services | name, type, status (operational/degraded/down), criticality |
| `service_dependencies` | Service relationships | service_id, depends_on_service_id, dependency_type (hard/soft) |
| `escalation_rules` | Auto-escalation config | priority_trigger, time_threshold_minutes, escalation_level, notify_roles |
| `incident_escalations` | Escalation history | from_team_id, to_team_id, escalation_level, reason, acknowledged |
| `game_events` | Audit log | event_type, event_category, severity, event_data (JSONB), actor_type |
| `ai_interactions` | AI call logging | agent_type, interaction_type, full_prompt, ai_response, tokens, latency_ms |
| `simulation_documents` | Scenario documents | document_type, title, content, visibility, team_id |
| `team_resources` | Resource management | resource_type, total_capacity, available_capacity, cost_per_hour |
 
### 7.4 Migration System
 
Migrations reside in `packages/backend/src/database/migrations/` and run in alphabetical order:
 
| File | Description |
|------|-------------|
| `001_ai_simulation_schema.sql` | AI interactions, scenario generation |
| `002_briefing_documents.sql` | Simulation documents with visibility controls |
| `003_ai_scenario_generation.sql` | Scenario generation history |
| `004_scenario_context.sql` | Game scenario context fields |
| `005_learning_reinforcement.sql` | Learning progress tracking |
| `006_competitive_elements.sql` | Achievements, leaderboard, challenges |
| `007_realism_enhancements.sql` | Services, escalation, dependencies, change requests, resources, shifts |
| `008_analytics_reporting.sql` | Analytics snapshots and metrics |
| `009_student_roster_and_cab_workflow.sql` | Students table, CAB workflow fields, implementation plans and revisions |
| `010_fix_change_requests_schema.sql` | Schema corrections for change requests |
| `011_student_access_tokens.sql` | JWT-based student access tokens |
| `012_plan_change_request_link.sql` | Bidirectional link between implementation plans and change requests |
 
All migrations are idempotent using `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, etc. The base `schema.sql` runs automatically on every server startup. The full migration runner (`npm run db:migrate`) executes schema.sql then all migration files in order.
 
---
 
## 8. AI Integration
 
### 8.1 Architecture
 
```
implementationPlanController  -->  claudeService  -->  Anthropic Claude API
instructorController          -->  AIGameMasterService  -->  claudeService
aiController                  -->  claudeService
```
 
### 8.2 Claude Service (claudeService.ts)
 
The low-level wrapper for all Anthropic API calls:
 
- **Model**: `claude-3-haiku-20240307` (configurable via `CLAUDE_MODEL` env var)
- **Max Tokens**: 2048 for evaluations, 4096 for document generation
- **JSON Sanitization**: Strips control characters from AI responses before JSON parsing
- **API Key Validation**: Checks for missing or dummy API key and falls back gracefully
 
Key methods:
- `generateScenarioResponse(prompt, context)` - Generic Claude call with system prompt
- `generateScenarios(params)` - Generates 5 scenario options with validation
- `generateDocuments(params)` - Generates instructor playbook, general briefing, and team packets
 
### 8.3 AI Game Master Service (aiGameMaster.service.ts)
 
Context-aware incident generation used by the instructor's incident injection feature:
 
1. **Context Gathering** (`gatherGameContext`):
   - Game details and scenario context
   - All teams with scores and budgets
   - Last 5 incidents
   - Technical debt level
   - Active incident count
   - Instructor playbook and scenario briefing excerpts
 
2. **Chaos Level Calculation** (`calculateChaosLevel`, scale 0-10):
   - Active incidents contribute up to +4
   - Technical debt contributes up to +3
   - Low team morale adds +1
   - Budget pressure adds +1
 
3. **Prompt Construction**:
   - System prompt defines the AI Game Master role with game-specific rules
   - User prompt includes full game context, team states, and game phase analysis
   - Explicit instruction: CAB/Management teams never receive incidents
 
4. **Team Assignment**:
   - AI suggests which team should receive the incident
   - System validates the suggestion (rejects CAB assignments)
   - Round-robin fairness across operational teams
 
5. **Logging**: All interactions saved to `ai_interactions` table with prompt, response, token counts, and latency
 
### 8.4 Implementation Plan Evaluation
 
**AI Evaluation (Primary Path):**
- Prompt includes the incident context, student's plan details, and scoring guidelines
- Educational scoring rubric: 70-100 approve, 50-69 approve with suggestions, 30-49 needs revision, 0-29 reject
- Structured JSON response: `{ score, decision, strengths[], suggestions[], criticalIssues[], overallFeedback }`
- Runs asynchronously after plan submission (student gets immediate "submitted" response)
 
**Rule-Based Fallback (When AI Unavailable):**
 
When the Claude API is unavailable or returns an unparseable response, a deterministic fallback evaluator runs:
 
| Criterion | Max Points | Scoring Logic |
|-----------|-----------|---------------|
| Base score (submitted a plan) | 30 | Always awarded |
| Title quality | 5 | Length > 10 characters |
| Description quality | 15 | Length > 50 (full), > 20 (partial: 8 pts) |
| Root cause analysis | 10 | Length > 30 characters |
| Implementation steps | 20 | 4+ steps (full), 2-3 (12 pts), 1 (5 pts) |
| Step detail quality | 10 | Any step > 20 characters |
| Mitigation strategy | 10 | Length > 20 characters |
| Rollback plan | 10 | Length > 20 characters |
| **Maximum** | **110** | Capped at 100 |
 
Feedback is constructive and actionable (e.g., "Make your steps more specific. Instead of 'Fix the server', try '1. SSH into server X, 2. Check logs in /var/log, 3. Restart service Y'").
 
### 8.5 Scenario Generation
 
The AI generates on instructor request:
- **5 scenario options**: Each with title, description, learning objectives, primary/secondary domains, key challenges, and difficulty level
- **Simulation documents** (per selected scenario):
  - Instructor Playbook (instructor_only visibility)
  - General Briefing (all_participants visibility)
  - Team-specific Packets (team_only visibility, one per team)
 
---
 
## 9. Real-Time Communication
 
### 9.1 Socket.IO Architecture
 
```
Browser (socket.io-client)  <--->  Server (socket.io on HTTP server)
      |                                    |
  SocketService                      Socket Handlers
  (singleton class)                  +-- gameHandlers.ts
                                     +-- teamHandlers.ts
                                     +-- chatHandlers.ts
```
 
**Server Configuration** (socket/index.ts):
- CORS: Configured via `SOCKET_CORS_ORIGIN` environment variable
- Ping timeout: 60 seconds
- Ping interval: 25 seconds
- Authentication: Validates `sessionId` from handshake auth
 
**Client Configuration** (services/socket.ts):
- Primary transport: WebSocket (falls back to polling)
- Reconnection: Enabled, max 5 attempts, 1-5 second exponential delay
 
### 9.2 Room Structure
 
```
game:{gameId}   - All players in a game session (broadcasts game-wide events)
team:{teamId}   - All players on a specific team (broadcasts team-specific events)
```
 
### 9.3 Event Catalog
 
| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `game:join` | Client -> Server | gameId, teamId, userId | Join game and team rooms |
| `game:leave` | Client -> Server | gameId, teamId, userId | Leave game rooms |
| `game:action` | Client -> Server | gameId, action | Submit player action |
| `game:requestState` | Client -> Server | gameId | Request current game state |
| `game:joined` | Server -> Client | gameId, teamId, message | Join confirmation |
| `game:playerJoined` | Server -> Room | userId, teamId | Player joined broadcast |
| `game:playerLeft` | Server -> Room | userId, teamId | Player left broadcast |
| `game:actionProcessed` | Server -> Room | action, timestamp | Action result broadcast |
| `game:stateUpdate` | Server -> Room | (full state) | Game state broadcast |
| `chat:send` | Client -> Server | gameId, teamId, message, userId, userName | Send chat message |
| `chat:message` | Server -> Team | id, userId, userName, teamId, message | Chat message broadcast |
| `chat:typing` | Client -> Server | teamId, userId, userName, isTyping | Typing indicator |
| `chat:userTyping` | Server -> Team | userId, userName, isTyping | Typing status broadcast |
| `team:message` | Client -> Server | teamId, message, userId | Team coordination |
| `team:coordinateAction` | Client -> Server | teamId, action, userId | Team action proposal |
 
---
 
## 10. Authentication and Authorization
 
### 10.1 Session-Based Access (Instructors and Players)
 
Instructors and in-lobby players use session-based authentication:
- Express sessions stored in Redis (prefix: `hawkops:sess:`)
- 24-hour session TTL
- HTTP-only, secure (in production) cookies
- CORS credentials enabled for cross-origin requests
 
### 10.2 JWT Token Access (Students)
 
Students receive access via email invitation with a JWT token:
 
```
Instructor creates student roster
  -> Assigns students to teams
  -> Sends email with link: /student/team/{teamId}?token={JWT}
    -> Student clicks link
      -> verifyStudentToken middleware:
           1. Extracts token from ?token= query param or Authorization: Bearer header
           2. Verifies JWT signature (SESSION_SECRET as signing key)
           3. Queries database for matching player record
           4. Confirms game is not completed/archived
           5. Updates player.last_accessed timestamp
           6. Attaches player/team/game info to request
      -> ensureOwnTeam middleware:
           Compares URL :teamId parameter with authenticated player's teamId
```
 
Token payload structure:
```typescript
{
  studentId: string,     // Player UUID
  teamId: string,        // Team UUID
  gameId: string,        // Game UUID
  email: string,         // Student email
  type: 'student_access' // Token type discriminator
}
```
 
### 10.3 Security Measures
 
- **Helmet**: Sets security headers including Content Security Policy in production
- **CORS**: Restricted to `CLIENT_URL` origin with credentials
- **HTTP-Only Cookies**: Session cookies not accessible via client-side JavaScript
- **Secure Cookies**: HTTPS-only flag in production
- **Data Isolation**: All database queries scoped by `game_id` to prevent cross-game access
- **UUID Validation**: Controllers validate UUID format before database queries
- **API Key Protection**: Anthropic API key stored in environment variables, never exposed to clients
 
---
 
## 11. Core Workflows
 
### 11.1 Game Lifecycle
 
```
CREATE GAME                LOBBY              START                ACTIVE           COMPLETED
  |                          |                  |                    |                  |
  Set game name           Players            Initialize:          Gameplay:          Final:
  Configure teams          join               - 10 services        - Incidents        - Scores
  Assign roles             teams              - 5 escalation       - Plans            - Analytics
  Set duration             Ready up             rules              - Changes          - Reports
                                              - Team resources     - SLA tracking
                                              - Shift schedules    - Stakeholder
                                              - Dependencies         comms
```
 
**Game Start Initialization** (gameController.startGame):
 
1. Create 10 default infrastructure services: Web Application, API Gateway, Database Primary, Database Replica, Cache Server, Message Queue, CDN, Monitoring System, Authentication Service, File Storage
2. Create 5 escalation rules: Critical P1 15min, Critical P1 30min, High Priority 30min, Medium Priority 60min, Low Priority 120min
3. Initialize team resources: staff, budget, tools per team
4. Create shift schedules with efficiency modifiers
5. Initialize service dependencies (web app -> API -> database chain, etc.)
6. Update game status to `active` with `started_at` timestamp
 
### 11.2 Incident Management Flow
 
```
Instructor triggers incident injection
  -> AIGameMasterService gathers game context
  -> Claude generates context-aware incident (aligned with scenario)
  -> System assigns to operational team (round-robin, never CAB)
  -> Incident appears on team dashboard
    -> Team updates status: open -> in_progress -> resolved -> closed
    -> SLA timer running concurrently
      -> If breached: auto-escalate priority, log event
    -> Service health updates cascade through dependency graph
    -> Post-resolution: PIR may be required
```
 
### 11.3 Implementation Plan Workflow
 
```
1. TEAM creates draft plan
     |
2. TEAM edits plan (title, description, root cause analysis,
     |                implementation steps, risk level, mitigation
     |                strategy, rollback plan, resources, cost)
     |
3. TEAM submits plan for AI evaluation
     |
4. AI EVALUATION (asynchronous)
     |-- Claude API available:
     |     Parse structured JSON response
     |-- Claude API unavailable:
     |     Rule-based fallback evaluation
     |
     |-- Score >= 70: status = ai_approved
     |-- Score 50-69: status = ai_approved (with improvement suggestions)
     |-- Score 30-49: status = ai_needs_revision
     |-- Score < 30:  status = ai_rejected
     |
5. TEAM reviews AI feedback (strengths, suggestions, critical issues)
     |
     |-- If needs_revision: go to step 2 (edit and resubmit)
     |
6. TEAM creates Change Request from approved plan (score >= 50)
     |
     -> Change Request enters CAB workflow (pending_cab)
```
 
### 11.4 CAB Change Request Workflow
 
```
                    +-- Edit Change Request
                    |
pending_cab --------+-- Send for Technical Review -----> under_review
    |               |                                        |
    |               +-- Approve Directly                Tech team submits
    |               |                                   recommendation
    |               +-- Reject Directly                      |
    |                                                        v
    |                                                  review_complete
    |                                                        |
    +--------------------------------------------------------+
    |
    v
  CAB DECISION
    |         |
    v         v
 approved   rejected
 (with       (requires
  notes)      reason)
```
 
**CAB Team Capabilities:**
- View all pending change requests with risk levels and requesting team
- Edit change request title, description, and risk level
- Send change for technical review to any non-CAB team
- Approve with optional notes
- Reject with mandatory justification
- View technical review recommendations before deciding
 
### 11.5 Change Implementation Simulation
 
When an approved change is implemented:
 
| Risk Level | Base Failure Rate | Successful Points | Failure Penalty |
|-----------|-------------------|-------------------|-----------------|
| Low | 5% | +50 | -25 |
| Medium | 15% | +100 | -50 |
| High | 30% | +150 | -100 |
| Critical | 45% | +200 | -150 |
 
Mitigation factors multiply the failure rate:
- Has implementation plan: x0.7
- Has rollback plan: x0.8
- Has test plan: x0.9
- All three combined: 0.05 * 0.7 * 0.8 * 0.9 = 2.5% failure for low-risk
 
### 11.6 SLA Monitoring
 
```
Incident created with SLA deadline (priority-based)
  -> SLA timer counts down in real-time (frontend SLATimer component)
    -> Periodic server-side check (SLAService.checkAndProcessBreaches)
      -> If deadline exceeded without resolution:
        -> Mark incident sla_breached = true
        -> Escalate priority: low -> medium -> high -> critical
        -> Log game event (severity: warning)
        -> Update escalation count on incident
```
 
---
 
## 12. Deployment Architecture
 
### 12.1 Docker Compose (Development)
 
```yaml
services:
  postgres:     # PostgreSQL 16 Alpine, port 5432, health-checked
  redis:        # Redis 7 Alpine, port 6379, health-checked
  backend:      # Node.js 18 Alpine, port 3000, depends on postgres + redis
  frontend:     # Node.js 18 Alpine, port 5173 (Vite dev server)
```
 
Startup order: postgres (healthy) -> redis (healthy) -> backend -> frontend
 
Source code volumes are mounted for hot-reload during development. Database and Redis data persist in named Docker volumes.
 
### 12.2 Production Deployment
 
In production:
- Backend serves the frontend's built static files from `packages/frontend/dist`
- Client-side routing handled by catch-all route returning `index.html`
- Single port (3000) serves both REST API and frontend SPA
- Helmet CSP enabled with strict directives
- Secure, HTTP-only cookies
- Winston logging at `info` level (no debug output)
 
### 12.3 Backend Dockerfile
 
```dockerfile
FROM node:18-alpine
# Install dependencies (root + backend + shared workspaces)
# Build shared package first, then backend
# Expose port 3000
# CMD: npm run start --workspace=packages/backend
```
 
### 12.4 Frontend Dockerfile
 
```dockerfile
FROM node:18-alpine
# Install dependencies (root + frontend + shared workspaces)
# Build shared package
# Expose port 5173
# CMD: npm run dev -- --host 0.0.0.0
```
 
Note: In production, the frontend is typically built and served by the backend rather than running its own container.
 
---
 
## 13. API Reference
 
### Game Management
 
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/games` | Create a game with teams (name, duration, teams with roles) |
| `GET` | `/api/games` | List active and lobby games with player counts |
| `GET` | `/api/games/:gameId` | Get game details with teams and players |
| `POST` | `/api/games/:gameId/join` | Join a game (playerName, teamId) |
| `POST` | `/api/games/:gameId/start` | Start game (initializes all simulation features) |
| `GET` | `/api/games/:gameId/service-health` | Get infrastructure service statuses |
| `POST` | `/api/games/:gameId/initialize-services` | Initialize default services |
| `POST` | `/api/games/:gameId/refresh-service-status` | Refresh service statuses from incidents |
 
### Team Operations
 
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/teams/:teamId/dashboard` | Team dashboard (incidents, tech debt, game state) |
| `PATCH` | `/api/teams/:teamId/incidents/:incidentId/status` | Update incident status |
| `GET` | `/api/teams/:teamId/incidents/:incidentId` | Incident details with timeline history |
 
### Implementation Plans
 
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/teams/:teamId/implementation-plans` | List team's plans (optional ?gameId filter) |
| `POST` | `/api/teams/:teamId/implementation-plans` | Create draft plan |
| `GET` | `/api/teams/:teamId/implementation-plans/:planId` | Get plan with revision history |
| `PUT` | `/api/teams/:teamId/implementation-plans/:planId` | Update plan (draft or needs_revision status only) |
| `POST` | `/api/teams/:teamId/implementation-plans/:planId/submit` | Submit for AI evaluation |
| `POST` | `/api/teams/:teamId/implementation-plans/:planId/implement` | Start implementation (requires ai_approved) |
| `POST` | `/api/teams/:teamId/implementation-plans/:planId/complete` | Mark implementation complete |
| `POST` | `/api/teams/:teamId/implementation-plans/:planId/create-change-request` | Create CAB change request (score >= 50) |
 
### CAB Workflow
 
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/games/:gameId/changes/cab-pending` | Get changes pending CAB review |
| `GET` | `/api/games/:gameId/teams/:teamId/changes/review` | Get changes assigned for team review |
| `POST` | `/api/changes/:changeId/send-for-review` | Send change to tech team for review |
| `POST` | `/api/changes/:changeId/submit-review` | Submit technical review with recommendation |
| `POST` | `/api/changes/:changeId/cab-approve` | CAB approves change (with optional notes) |
| `POST` | `/api/changes/:changeId/cab-reject` | CAB rejects change (requires reason) |
| `PUT` | `/api/changes/:changeId` | Edit change request details |
 
### Instructor Operations
 
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/instructor/games/:gameId/inject-incident` | Inject AI-generated incident |
| `GET` | `/api/instructor/games/:gameId/state` | Get comprehensive game state |
| `POST` | `/api/instructor/ai/generate-scenarios` | Generate 5 AI scenario options |
| `POST` | `/api/instructor/games/:gameId/ai/generate-documents` | Generate simulation documents |
| `GET` | `/api/instructor/ai/generations` | Get scenario generation history |
| `POST/GET/PUT/DELETE` | `/api/instructor/students/*` | Student CRUD operations |
| `POST/GET/DELETE` | `/api/instructor/teams/:teamId/students/*` | Team assignment operations |
 
### Student Authentication
 
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/student/verify` | Verify JWT token and get student/team info |
| `GET` | `/api/student/team/:teamId/dashboard` | Authenticated team dashboard |
 
### Other Endpoints
 
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Server health check |
| `GET/PUT/POST` | `/api/pir/*` | Post-Incident Review CRUD and submission |
| `GET/POST` | `/api/communications/*` | Stakeholder communication responses |
| `GET/POST` | `/api/games/:gameId/achievements/*` | Achievement tracking |
| `GET/POST` | `/api/games/:gameId/leaderboard/*` | Leaderboard and rankings |
| `GET/POST` | `/api/games/:gameId/challenges/*` | Challenge management |
| `GET` | `/api/games/:gameId/analytics/*` | Analytics and reporting |
| `POST` | `/api/admin/migrate` | Trigger database migrations |
 
---
 
## 14. Configuration Reference
 
### Environment Variables
 
| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `NODE_ENV` | `development` | No | Environment mode (development/production) |
| `PORT` | `3000` | No | HTTP server port |
| `DATABASE_URL` | - | Yes | PostgreSQL connection string |
| `REDIS_URL` | - | Yes | Redis connection string |
| `SESSION_SECRET` | - | Yes | Session and JWT signing secret |
| `ANTHROPIC_API_KEY` | - | No | Claude AI API key (AI features disabled without it) |
| `CLAUDE_MODEL` | `claude-3-haiku-20240307` | No | Anthropic model ID |
| `CLIENT_URL` | `http://localhost:5173` | No | Frontend origin for CORS |
| `SOCKET_CORS_ORIGIN` | (from CLIENT_URL) | No | Socket.IO CORS origin |
| `SMTP_HOST` | - | No | Email server hostname |
| `SMTP_PORT` | - | No | Email server port |
| `SMTP_SECURE` | - | No | Use TLS for email |
| `SMTP_USER` | - | No | Email authentication username |
| `SMTP_PASSWORD` | - | No | Email authentication password |
| `EMAIL_FROM` | - | No | Sender email address |
| `EMAIL_FROM_NAME` | - | No | Sender display name |
| `GAME_DURATION_MINUTES` | `75` | No | Default game duration |
| `MAX_TEAMS` | `3` | No | Maximum teams per game |
| `MAX_MEMBERS_PER_TEAM` | `3` | No | Maximum players per team |
 
### npm Scripts
 
| Script | Description |
|--------|-------------|
| `npm run dev` | Start backend and frontend concurrently in development mode |
| `npm run dev:backend` | Start backend only with hot reload (nodemon/ts-node) |
| `npm run dev:frontend` | Start frontend only with Vite HMR |
| `npm run build` | Build all packages: shared -> backend -> frontend |
| `npm run build:backend` | Build backend only |
| `npm run build:frontend` | Build frontend only |
| `npm run start` | Start production server (backend serves frontend) |
| `npm run db:migrate` | Compile backend and run all database migrations |
| `npm run clean` | Remove all node_modules and dist directories |
 
---
 
**Document Version**: 2.0
**Last Updated**: 2026-01-26
**Generated from**: Actual codebase analysis
 
