# Briefing Documents System Design

## Overview
System for creating, distributing, and tracking simulation briefing materials (playbooks, briefings, team packets, individual instructions).

## Document Types

1. **Instructor Playbook** (`instructor_playbook`)
   - Simulation objectives and learning outcomes
   - Timeline and key decision points
   - Expected challenges and responses
   - Evaluation criteria
   - Answer keys and solutions
   - Audience: Instructor only

2. **General Briefing** (`general_briefing`)
   - Scenario overview
   - Rules of engagement
   - Available resources and tools
   - Communication guidelines
   - Success criteria
   - Audience: All participants

3. **Team Packet** (`team_packet`)
   - Team-specific roles and responsibilities
   - Team objectives (may differ from other teams)
   - Team resources and budget allocation
   - Team member roster
   - Team success metrics
   - Audience: Specific team only

4. **Player Instructions** (`player_instructions`)
   - Individual role within team
   - Personal objectives (may conflict with team goals)
   - Hidden information or special knowledge
   - Special capabilities or constraints
   - Audience: Specific player only

## Database Schema

### New Table: `simulation_documents`

```sql
CREATE TABLE IF NOT EXISTS simulation_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,

    -- Document info
    document_type VARCHAR(50) NOT NULL, -- 'instructor_playbook', 'general_briefing', 'team_packet', 'player_instructions'
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,

    -- Targeting/visibility
    visibility VARCHAR(50) NOT NULL, -- 'instructor_only', 'all_participants', 'team_only', 'player_only'
    team_id UUID REFERENCES teams(id), -- NULL if not team-specific
    player_id UUID REFERENCES players(id), -- NULL if not player-specific

    -- Publishing control
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'published', 'archived'
    publish_at TIMESTAMP, -- Scheduled release time (NULL = immediate)

    -- Metadata
    order_index INTEGER DEFAULT 0, -- For sorting documents
    is_required_reading BOOLEAN DEFAULT false,
    estimated_read_time INTEGER, -- Minutes
    tags TEXT[],

    -- Tracking
    read_receipts JSONB DEFAULT '[]'::jsonb, -- [{player_id, read_at, ip_address}, ...]

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sim_docs_game ON simulation_documents(game_id);
CREATE INDEX idx_sim_docs_team ON simulation_documents(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX idx_sim_docs_player ON simulation_documents(player_id) WHERE player_id IS NOT NULL;
CREATE INDEX idx_sim_docs_visibility ON simulation_documents(game_id, visibility, status);
```

### New Table: `document_templates`

```sql
CREATE TABLE IF NOT EXISTS document_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Template info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    document_type VARCHAR(50) NOT NULL,

    -- Template content (with placeholders)
    content_template TEXT NOT NULL,
    placeholders JSONB, -- [{name, description, default_value}, ...]

    -- Categorization
    scenario_type VARCHAR(100), -- 'general_itsm', 'security_breach', 'major_outage', etc.
    tags TEXT[],

    -- Usage
    is_public BOOLEAN DEFAULT true,
    created_by VARCHAR(255),
    usage_count INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### Instructor Endpoints

```
POST   /api/instructor/games/:gameId/documents          Create document
GET    /api/instructor/games/:gameId/documents          List all documents
GET    /api/instructor/games/:gameId/documents/:docId   Get document details
PUT    /api/instructor/games/:gameId/documents/:docId   Update document
DELETE /api/instructor/games/:gameId/documents/:docId   Delete document
PATCH  /api/instructor/games/:gameId/documents/:docId/publish  Publish document
GET    /api/instructor/games/:gameId/documents/:docId/receipts Get read receipts

POST   /api/instructor/games/:gameId/documents/bulk-create     Create multiple docs from template
GET    /api/instructor/templates                               List templates
POST   /api/instructor/templates                               Create template
```

### Participant Endpoints

```
GET    /api/games/:gameId/documents                     List documents available to me
GET    /api/games/:gameId/documents/:docId              Get document content
POST   /api/games/:gameId/documents/:docId/mark-read    Mark as read
```

## UI Components

### 1. Instructor Document Manager

Location: `/instructor/game/:gameId/documents`

Features:
- Document list with type badges
- Create new document button
- Duplicate existing document
- Preview document
- Publish/unpublish toggle
- View read receipts (who has read what)
- Bulk operations (publish all, create from template)

### 2. Document Editor

Features:
- Rich text editor (with Markdown support)
- Template selection
- Placeholder replacement (e.g., {{team_name}}, {{game_name}})
- Preview mode
- Visibility/targeting settings
- Schedule publish option
- AI assistance to generate content

### 3. Participant Document Viewer

Location: `/game/:gameId/briefing` or integrated into team dashboard

Features:
- List of available documents
- Unread badges
- Required reading indicators
- Search/filter by type
- Mark as read button
- Print/export to PDF

### 4. Document Card/Badge in Dashboard

Show in header or sidebar:
- "📄 3 unread briefings"
- Required documents notification
- Quick access to documents

## Workflows

### Instructor Creates Briefing Materials

1. Instructor clicks "Manage Briefing Materials" in game setup
2. System shows document manager with templates
3. Instructor creates documents:
   - **Instructor Playbook**: Creates from "ITSM Simulation Playbook" template
   - **General Briefing**: Creates from "Standard Briefing" template, customizes scenario
   - **Team Packets**: Uses "Bulk Create" to generate 3 team packets from template
   - **Player Instructions**: Creates individual instructions for key roles
4. Instructor previews documents
5. Instructor publishes documents (or schedules for game start)

### Participant Reads Briefing

1. Participant joins game
2. Dashboard shows "📄 You have 2 unread briefings"
3. Participant clicks to view documents
4. Sees:
   - ✅ General Briefing (required reading)
   - ✅ Team Alpha Packet (required reading)
   - Individual Role: Incident Manager (optional)
5. Opens each document, reads content
6. Clicks "Mark as Read"
7. Badge updates: "📄 All briefings read"

### Instructor Tracks Progress

1. Instructor opens "Briefing Materials" tab
2. Sees read receipt dashboard:
   - General Briefing: 8/10 players read
   - Team Alpha Packet: 3/3 players read
   - Team Bravo Packet: 2/3 players read (John Smith hasn't read)
3. Can send reminder to players who haven't read required materials

## AI Integration

Use Claude to help generate briefing materials:

1. **Generate from Scenario**
   - Input: Scenario type, difficulty, learning objectives
   - Output: Complete general briefing and instructor playbook

2. **Customize Team Packets**
   - Input: Team role, number of members, complexity level
   - Output: Team-specific packet with appropriate scope

3. **Create Player Instructions**
   - Input: Player role, experience level, team context
   - Output: Individual instructions with appropriate detail

4. **Generate Injects**
   - Input: Current game state, learning objectives
   - Output: Suggested scenario injects for instructor playbook

## Templates

### Template: General Briefing (ITSM Simulation)

```markdown
# {{game_name}} - General Briefing

## Mission Overview
You are participating in a {{scenario_type}} simulation designed to test and improve your ITSM capabilities.

## Scenario
{{scenario_description}}

## Your Objectives
- Respond to incidents within SLA timeframes
- Maintain service quality while managing costs
- Collaborate effectively with other teams
- Document actions and decisions

## Available Resources
- ServiceNow ticketing system
- Communication channels (Teams/Slack)
- Budget: ${{team_budget}}
- Team members: {{team_size}}

## Rules of Engagement
1. Treat all scenarios as if they were real
2. Follow your organization's ITSM processes
3. Communicate clearly with other teams
4. Document all actions in tickets

## Success Criteria
- SLA compliance: >95%
- Budget adherence: Within ±10%
- Quality: Zero critical incidents escalated
- Collaboration: Effective cross-team coordination

## Timeline
- Duration: {{duration_minutes}} minutes
- Rounds: {{max_rounds}}
- Current time: {{current_time}}

Good luck!
```

### Template: Team Packet (Operations Team)

```markdown
# Team {{team_name}} - Operations Packet

## Your Team Role
You are the {{team_role}} team responsible for:
- Incident detection and response
- Problem management
- Service restoration
- SLA compliance

## Team Members
{{#each team_members}}
- {{name}} - {{role}}
{{/each}}

## Your Resources
- Budget: ${{budget_remaining}}
- Tools: {{available_tools}}
- Escalation path: {{escalation_contacts}}

## Your Success Metrics
- MTTR (Mean Time to Restore): < {{target_mttr}} minutes
- SLA compliance: > {{target_sla}}%
- First-call resolution: > {{target_fcr}}%
- Customer satisfaction: > {{target_csat}}

## Key Information
{{team_specific_context}}

## Your Strategy
{{team_strategy_notes}}
```

## Migration Path

### Phase 1: Database Schema
1. Add `simulation_documents` table
2. Add `document_templates` table
3. Create indexes

### Phase 2: Backend API
1. Create document controller
2. Implement CRUD operations
3. Add read receipt tracking
4. Implement access control

### Phase 3: Frontend (Instructor)
1. Document manager page
2. Document editor component
3. Template selector
4. Read receipt dashboard

### Phase 4: Frontend (Participant)
1. Document list component
2. Document viewer
3. Mark as read functionality
4. Dashboard integration

### Phase 5: Templates & AI
1. Create default templates
2. Implement AI generation
3. Add bulk create functionality

## Future Enhancements

- Version control for documents
- Collaborative editing (multiple instructors)
- Comments/annotations on documents
- Translation support for multi-language
- Video/multimedia briefings
- Interactive briefings with quizzes
- Document analytics (time spent reading, scroll depth)
