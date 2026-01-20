-- Briefing Documents System Migration
-- Version: 002
-- Description: Add support for simulation briefing materials (playbooks, briefings, team packets, player instructions)

-- Simulation Documents Table
CREATE TABLE IF NOT EXISTS simulation_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,

    -- Document info
    document_type VARCHAR(50) NOT NULL, -- 'instructor_playbook', 'general_briefing', 'team_packet', 'player_instructions'
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,

    -- Targeting/visibility
    visibility VARCHAR(50) NOT NULL, -- 'instructor_only', 'all_participants', 'team_only', 'player_only'
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE, -- NULL if not team-specific
    player_id UUID REFERENCES players(id) ON DELETE CASCADE, -- NULL if not player-specific

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
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Constraints
    CONSTRAINT sim_docs_type_check CHECK (document_type IN ('instructor_playbook', 'general_briefing', 'team_packet', 'player_instructions')),
    CONSTRAINT sim_docs_visibility_check CHECK (visibility IN ('instructor_only', 'all_participants', 'team_only', 'player_only')),
    CONSTRAINT sim_docs_status_check CHECK (status IN ('draft', 'published', 'archived'))
);

-- Document Templates Table
CREATE TABLE IF NOT EXISTS document_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Template info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    document_type VARCHAR(50) NOT NULL,

    -- Template content (with placeholders)
    content_template TEXT NOT NULL,
    placeholders JSONB, -- [{name, description, default_value, required}, ...]

    -- Categorization
    scenario_type VARCHAR(100), -- 'general_itsm', 'security_breach', 'major_outage', etc.
    tags TEXT[],

    -- Usage
    is_public BOOLEAN DEFAULT true,
    created_by VARCHAR(255),
    usage_count INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT doc_templates_type_check CHECK (document_type IN ('instructor_playbook', 'general_briefing', 'team_packet', 'player_instructions'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sim_docs_game ON simulation_documents(game_id);
CREATE INDEX IF NOT EXISTS idx_sim_docs_team ON simulation_documents(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sim_docs_player ON simulation_documents(player_id) WHERE player_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sim_docs_visibility ON simulation_documents(game_id, visibility, status);
CREATE INDEX IF NOT EXISTS idx_sim_docs_type ON simulation_documents(game_id, document_type);
CREATE INDEX IF NOT EXISTS idx_doc_templates_type ON document_templates(document_type);
CREATE INDEX IF NOT EXISTS idx_doc_templates_scenario ON document_templates(scenario_type) WHERE scenario_type IS NOT NULL;

-- Insert default templates (delete existing system templates first to prevent duplicates)
DELETE FROM document_templates WHERE created_by = 'system';

INSERT INTO document_templates (name, description, document_type, content_template, placeholders, scenario_type, is_public, created_by) VALUES
('Standard General Briefing', 'Basic briefing template for ITSM simulations', 'general_briefing',
'# {{game_name}} - General Briefing

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
- Ticketing system for incident tracking
- Communication channels for team coordination
- Budget allocation for your team
- Access to technical documentation

## Rules of Engagement
1. Treat all scenarios as if they were real
2. Follow ITIL best practices
3. Communicate clearly with other teams
4. Document all actions and decisions

## Success Criteria
- SLA compliance: >95%
- Budget adherence: Within ±10%
- Quality: Zero critical incidents escalated
- Collaboration: Effective cross-team coordination

## Timeline
- Duration: {{duration_minutes}} minutes
- Number of rounds: {{max_rounds}}
- Game will begin at: {{start_time}}

Good luck!',
'[
  {"name": "game_name", "description": "Name of the simulation", "required": true},
  {"name": "scenario_type", "description": "Type of scenario (e.g., major outage, security breach)", "default_value": "ITSM", "required": false},
  {"name": "scenario_description", "description": "Detailed description of the scenario", "required": true},
  {"name": "duration_minutes", "description": "Duration in minutes", "default_value": "75", "required": false},
  {"name": "max_rounds", "description": "Number of rounds", "default_value": "4", "required": false},
  {"name": "start_time", "description": "When the game starts", "required": false}
]'::jsonb,
'general_itsm', true, 'system'),

('Operations Team Packet', 'Standard briefing for operations teams', 'team_packet',
'# Team {{team_name}} - Operations Team Packet

## Your Team Role
You are the **Operations Team** responsible for:
- Incident detection and initial response
- Service restoration
- SLA compliance and monitoring
- Escalation when needed

## Team Members
{{team_members_list}}

## Your Resources
- **Budget**: ${{budget_remaining}}
- **Tools**: Monitoring dashboard, ticketing system, runbooks
- **Escalation path**: {{escalation_contacts}}

## Your Success Metrics
- **MTTR** (Mean Time to Restore): < {{target_mttr}} minutes
- **SLA compliance**: > {{target_sla}}%
- **First-call resolution**: > {{target_fcr}}%

## Key Information
{{team_specific_context}}

## Strategy Tips
- Prioritize by business impact
- Document all actions
- Communicate with other teams early
- Don''t be afraid to escalate when needed',
'[
  {"name": "team_name", "description": "Name of the team", "required": true},
  {"name": "team_members_list", "description": "List of team members", "required": false},
  {"name": "budget_remaining", "description": "Team budget", "default_value": "100000", "required": false},
  {"name": "escalation_contacts", "description": "Who to escalate to", "required": false},
  {"name": "target_mttr", "description": "Target MTTR in minutes", "default_value": "30", "required": false},
  {"name": "target_sla", "description": "Target SLA percentage", "default_value": "95", "required": false},
  {"name": "target_fcr", "description": "Target first-call resolution %", "default_value": "80", "required": false},
  {"name": "team_specific_context", "description": "Additional context for this team", "required": false}
]'::jsonb,
'general_itsm', true, 'system'),

('Instructor Playbook', 'Comprehensive instructor guide', 'instructor_playbook',
'# {{game_name}} - Instructor Playbook

## Simulation Overview
**Scenario**: {{scenario_description}}
**Learning Objectives**: {{learning_objectives}}
**Difficulty**: {{difficulty_level}}/10

## Timeline & Structure
- **Duration**: {{duration_minutes}} minutes
- **Rounds**: {{max_rounds}}
- **Key decision points**: {{key_decision_points}}

## Incident Injection Plan
{{incident_plan}}

## Expected Challenges
{{expected_challenges}}

## Evaluation Criteria
{{evaluation_criteria}}

## Debriefing Guide
### Key Questions to Ask:
1. What was your initial assessment?
2. How did you prioritize actions?
3. What would you do differently?
4. What did you learn about team collaboration?

### Learning Points:
{{learning_points}}

## Answer Key
{{answer_key}}',
'[
  {"name": "game_name", "description": "Name of the simulation", "required": true},
  {"name": "scenario_description", "description": "Detailed scenario description", "required": true},
  {"name": "learning_objectives", "description": "What participants should learn", "required": true},
  {"name": "difficulty_level", "description": "Difficulty from 1-10", "default_value": "5", "required": false},
  {"name": "duration_minutes", "description": "Duration in minutes", "default_value": "75", "required": false},
  {"name": "max_rounds", "description": "Number of rounds", "default_value": "4", "required": false},
  {"name": "key_decision_points", "description": "Critical moments in the simulation", "required": false},
  {"name": "incident_plan", "description": "When to inject incidents", "required": false},
  {"name": "expected_challenges", "description": "What participants will struggle with", "required": false},
  {"name": "evaluation_criteria", "description": "How to evaluate performance", "required": false},
  {"name": "learning_points", "description": "Key takeaways", "required": false},
  {"name": "answer_key", "description": "Correct approaches and solutions", "required": false}
]'::jsonb,
'general_itsm', true, 'system');

-- Comments for documentation
COMMENT ON TABLE simulation_documents IS 'Stores briefing materials for simulations (playbooks, briefings, team packets, player instructions)';
COMMENT ON TABLE document_templates IS 'Reusable templates for creating simulation documents';
COMMENT ON COLUMN simulation_documents.read_receipts IS 'JSON array tracking which players have read the document';
COMMENT ON COLUMN document_templates.placeholders IS 'JSON array defining template variables that need to be filled';
