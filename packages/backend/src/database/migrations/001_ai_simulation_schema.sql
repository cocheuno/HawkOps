-- HawkOps AI-Driven Simulation Schema Migration
-- Version: 001
-- Description: Core schema for AI-driven ITSM business simulation

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pgvector extension (optional - for AI embeddings)
-- If not available, ai_memory table will use TEXT instead of vector type
-- To enable: Run "CREATE EXTENSION pgvector;" in your PostgreSQL database
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS "pgvector";
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pgvector extension not available - ai_memory will use TEXT for embeddings';
END $$;

-- Drop new tables if they exist (for clean migration)
-- NOTE: ai_interactions and chat_messages are updated via ALTER TABLE instead of dropped
DROP TABLE IF EXISTS instructor_notes CASCADE;
DROP TABLE IF EXISTS change_requests CASCADE;
DROP TABLE IF EXISTS ai_memory CASCADE;
DROP TABLE IF EXISTS financial_transactions CASCADE;
DROP TABLE IF EXISTS technical_debt_log CASCADE;
DROP TABLE IF EXISTS work_items CASCADE;
DROP TABLE IF EXISTS ci_dependencies CASCADE;
DROP TABLE IF EXISTS configuration_items CASCADE;

-- Update existing games table with AI features
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS scenario_type VARCHAR(100) DEFAULT 'general_itsm',
  ADD COLUMN IF NOT EXISTS difficulty_level INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS current_round INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_rounds INTEGER DEFAULT 4,
  ADD COLUMN IF NOT EXISTS ai_personality VARCHAR(50) DEFAULT 'balanced',
  ADD COLUMN IF NOT EXISTS dynamic_difficulty BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP;

-- Update existing teams table with performance metrics
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS budget_remaining DECIMAL(12, 2) DEFAULT 100000.00,
  ADD COLUMN IF NOT EXISTS morale_level INTEGER DEFAULT 75;

-- Update existing players table with role types
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS role_type VARCHAR(50) DEFAULT 'participant',
  ADD COLUMN IF NOT EXISTS last_active TIMESTAMP DEFAULT NOW();

-- Update existing incidents table with AI and financial tracking
ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS incident_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS severity VARCHAR(50) DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS affected_ci_id UUID,
  ADD COLUMN IF NOT EXISTS assigned_to_team_id UUID REFERENCES teams(id),
  ADD COLUMN IF NOT EXISTS assigned_to_player_id UUID REFERENCES players(id),
  ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMP,
  ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS resolution_notes TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS estimated_cost_per_minute DECIMAL(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS total_cost DECIMAL(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_context JSONB;

-- Generate incident numbers for existing incidents
-- Uses CTE because window functions can't be used directly in UPDATE
WITH numbered_incidents AS (
  SELECT
    id,
    'INC' || LPAD(CAST(ROW_NUMBER() OVER (PARTITION BY game_id ORDER BY created_at) AS TEXT), 4, '0') as new_number
  FROM incidents
  WHERE incident_number IS NULL
)
UPDATE incidents
SET incident_number = numbered_incidents.new_number
FROM numbered_incidents
WHERE incidents.id = numbered_incidents.id;

-- Configuration Items (CMDB) table
CREATE TABLE IF NOT EXISTS configuration_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'server', 'database', 'service', 'application'
    status VARCHAR(50) DEFAULT 'operational', -- operational, degraded, down

    -- Technical details
    criticality INTEGER DEFAULT 5, -- 1-10 scale
    complexity_factor DECIMAL(3, 2) DEFAULT 1.0,

    -- Metadata
    description TEXT,
    properties JSONB,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- CI Dependencies (for Service Map)
CREATE TABLE IF NOT EXISTS ci_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    parent_ci_id UUID NOT NULL REFERENCES configuration_items(id) ON DELETE CASCADE,
    child_ci_id UUID NOT NULL REFERENCES configuration_items(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) DEFAULT 'depends_on',

    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(parent_ci_id, child_ci_id)
);

-- Work Items / Kanban backlog
CREATE TABLE IF NOT EXISTS work_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

    -- Work item details
    title VARCHAR(500) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- feature, bug, technical_debt, maintenance
    status VARCHAR(50) DEFAULT 'backlog', -- backlog, ready, in_progress, review, done
    priority INTEGER DEFAULT 5,

    -- Estimation
    story_points INTEGER,
    estimated_hours DECIMAL(5, 2),

    -- Technical Debt tracking
    creates_tech_debt BOOLEAN DEFAULT false,
    tech_debt_value INTEGER DEFAULT 0,

    -- Dependencies
    blocked_by UUID REFERENCES work_items(id),

    -- Assignment
    assigned_to_player_id UUID REFERENCES players(id),

    -- Completion
    completed_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Financial Transactions (CAPEX/OPEX tracking)
CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

    -- Transaction details
    transaction_type VARCHAR(50) NOT NULL, -- capex, opex, penalty, revenue
    category VARCHAR(100),
    amount DECIMAL(12, 2) NOT NULL,
    description TEXT,

    -- References
    reference_type VARCHAR(50),
    reference_id UUID,

    created_at TIMESTAMP DEFAULT NOW()
);

-- Technical Debt Ledger
CREATE TABLE IF NOT EXISTS technical_debt_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

    -- Debt details
    description TEXT,
    source_type VARCHAR(50) NOT NULL,
    source_id UUID,
    debt_points INTEGER NOT NULL,

    -- Resolution
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    resolution_cost INTEGER,

    created_at TIMESTAMP DEFAULT NOW()
);

-- Add description column if technical_debt_log already exists
ALTER TABLE technical_debt_log
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Update game_events table with categories
ALTER TABLE game_events
  ADD COLUMN IF NOT EXISTS event_category VARCHAR(50) DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS actor_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS actor_id UUID;

-- AI Interactions Log - Update existing table or create if not exists
-- Add new columns to existing ai_interactions table
ALTER TABLE ai_interactions
  ADD COLUMN IF NOT EXISTS agent_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS agent_personality VARCHAR(50),
  ADD COLUMN IF NOT EXISTS prompt_template TEXT,
  ADD COLUMN IF NOT EXISTS prompt_variables JSONB,
  ADD COLUMN IF NOT EXISTS full_prompt TEXT,
  ADD COLUMN IF NOT EXISTS ai_response TEXT,
  ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS completion_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS total_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS context_used JSONB,
  ADD COLUMN IF NOT EXISTS outcome_category VARCHAR(50),
  ADD COLUMN IF NOT EXISTS outcome_notes TEXT,
  ADD COLUMN IF NOT EXISTS latency_ms INTEGER;

-- Rename old columns to match new schema
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_interactions' AND column_name='tokens_used') THEN
    ALTER TABLE ai_interactions RENAME COLUMN tokens_used TO total_tokens;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_interactions' AND column_name='prompt') THEN
    ALTER TABLE ai_interactions RENAME COLUMN prompt TO full_prompt;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_interactions' AND column_name='response') THEN
    ALTER TABLE ai_interactions RENAME COLUMN response TO ai_response;
  END IF;
END $$;

-- AI Memory / Context Store (using pgvector)
CREATE TABLE IF NOT EXISTS ai_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,

    -- Memory details
    memory_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,

    -- Vector embedding for semantic search
    -- Uses TEXT to store JSON array if pgvector is not available
    -- Can be converted to vector(1536) type once pgvector is enabled
    embedding TEXT,

    -- Metadata
    relevance_score DECIMAL(3, 2) DEFAULT 1.0,
    tags TEXT[],

    -- References
    related_entity_type VARCHAR(50),
    related_entity_id UUID,

    created_at TIMESTAMP DEFAULT NOW()
);

-- Change Requests (for ITSM Change Management workflow)
CREATE TABLE IF NOT EXISTS change_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    change_number VARCHAR(50) NOT NULL,

    -- Request details
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    change_type VARCHAR(50) NOT NULL,
    risk_level VARCHAR(50) NOT NULL,

    -- Requester
    requested_by_team_id UUID NOT NULL REFERENCES teams(id),
    requested_by_player_id UUID REFERENCES players(id),

    -- Approval workflow
    status VARCHAR(50) DEFAULT 'pending',
    approval_required_from UUID REFERENCES teams(id),
    approved_by_player_id UUID REFERENCES players(id),
    approval_notes TEXT,

    -- Implementation
    implementation_plan TEXT,
    rollback_plan TEXT,
    scheduled_for TIMESTAMP,
    implemented_at TIMESTAMP,

    -- Impact analysis
    affected_cis UUID[],
    estimated_downtime_minutes INTEGER DEFAULT 0,
    business_justification TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Chat Messages - Update existing table
-- Add new columns to existing chat_messages table (including old schema columns if missing)
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS channel_type VARCHAR(50) DEFAULT 'team',
  ADD COLUMN IF NOT EXISTS channel_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS sender_type VARCHAR(50) DEFAULT 'player',
  ADD COLUMN IF NOT EXISTS sender_id UUID,
  ADD COLUMN IF NOT EXISTS sender_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS message_text TEXT,
  ADD COLUMN IF NOT EXISTS message_metadata JSONB,
  ADD COLUMN IF NOT EXISTS sentiment_score DECIMAL(3, 2),
  ADD COLUMN IF NOT EXISTS sentiment_analyzed BOOLEAN DEFAULT false;

-- Migrate old message column to message_text if needed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_messages' AND column_name='message') THEN
    UPDATE chat_messages SET message_text = message WHERE message_text IS NULL;
    ALTER TABLE chat_messages DROP COLUMN IF EXISTS message;
  END IF;
END $$;

-- Instructor Notes / Observations
CREATE TABLE IF NOT EXISTS instructor_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,

    -- Note content
    note_type VARCHAR(50),
    content TEXT NOT NULL,
    tags TEXT[],

    -- Context
    game_round INTEGER,
    related_event_id UUID REFERENCES game_events(id),

    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_incidents_game_status ON incidents(game_id, status);
CREATE INDEX IF NOT EXISTS idx_incidents_sla ON incidents(game_id, sla_deadline) WHERE status != 'closed';
CREATE INDEX IF NOT EXISTS idx_incidents_ai ON incidents(game_id, ai_generated);
CREATE INDEX IF NOT EXISTS idx_work_items_team_status ON work_items(team_id, status);
CREATE INDEX IF NOT EXISTS idx_game_events_game_time ON game_events(game_id, created_at);
CREATE INDEX IF NOT EXISTS idx_game_events_category ON game_events(game_id, event_category);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_game ON ai_interactions(game_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_agent ON ai_interactions(game_id, agent_type);
CREATE INDEX IF NOT EXISTS idx_chat_messages_game_channel ON chat_messages(game_id, channel_id, created_at);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_game ON financial_transactions(game_id, created_at);
CREATE INDEX IF NOT EXISTS idx_config_items_game ON configuration_items(game_id);
CREATE INDEX IF NOT EXISTS idx_ci_deps_parent ON ci_dependencies(parent_ci_id);
CREATE INDEX IF NOT EXISTS idx_ci_deps_child ON ci_dependencies(child_ci_id);

-- Create index for vector similarity search (only if pgvector is available)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        CREATE INDEX IF NOT EXISTS idx_ai_memory_embedding ON ai_memory USING ivfflat (embedding vector_cosine_ops);
    END IF;
END $$;

-- Insert default configuration items for new games (example seed data)
-- This will be used by the AI to generate realistic incidents

COMMENT ON TABLE ai_interactions IS 'Logs all AI interactions for analytics and debugging';
COMMENT ON TABLE ai_memory IS 'Long-term memory store using vector embeddings for semantic search';
COMMENT ON TABLE configuration_items IS 'CMDB - Configuration Items for dependency mapping';
COMMENT ON TABLE technical_debt_log IS 'Tracks accumulated technical debt and its impact';
COMMENT ON TABLE financial_transactions IS 'CAPEX/OPEX ledger for financial simulation';
