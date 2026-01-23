-- Migration 010: Fix change_requests schema
-- Adds missing columns that the service expects
-- This migration reconciles the difference between migration 001 and migration 007 schemas

-- Add missing columns to change_requests table
-- These columns exist in migration 007 but not in migration 001

-- affected_services column (was affected_cis in 001)
ALTER TABLE change_requests ADD COLUMN IF NOT EXISTS affected_services UUID[];

-- scheduling columns (scheduled_for was renamed in 007)
ALTER TABLE change_requests ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMP;
ALTER TABLE change_requests ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMP;
ALTER TABLE change_requests ADD COLUMN IF NOT EXISTS actual_start TIMESTAMP;
ALTER TABLE change_requests ADD COLUMN IF NOT EXISTS actual_end TIMESTAMP;

-- Additional fields from migration 007
ALTER TABLE change_requests ADD COLUMN IF NOT EXISTS test_plan TEXT;
ALTER TABLE change_requests ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE change_requests ADD COLUMN IF NOT EXISTS assigned_to_team_id UUID REFERENCES teams(id);

-- Make requested_by_team_id nullable (it was NOT NULL in 001)
ALTER TABLE change_requests ALTER COLUMN requested_by_team_id DROP NOT NULL;

-- CAB workflow columns (from migration 009)
ALTER TABLE change_requests ADD COLUMN IF NOT EXISTS cab_team_id UUID REFERENCES teams(id);
ALTER TABLE change_requests ADD COLUMN IF NOT EXISTS review_team_id UUID REFERENCES teams(id);
ALTER TABLE change_requests ADD COLUMN IF NOT EXISTS review_status VARCHAR(50);
ALTER TABLE change_requests ADD COLUMN IF NOT EXISTS review_notes TEXT;
ALTER TABLE change_requests ADD COLUMN IF NOT EXISTS reviewed_by_player_id UUID REFERENCES players(id);
ALTER TABLE change_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
ALTER TABLE change_requests ADD COLUMN IF NOT EXISTS implementation_time_minutes INTEGER;
ALTER TABLE change_requests ADD COLUMN IF NOT EXISTS workflow_state VARCHAR(50) DEFAULT 'pending';

-- Also add the change_approvals table if it doesn't exist
CREATE TABLE IF NOT EXISTS change_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    change_request_id UUID NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
    approver_team_id UUID NOT NULL REFERENCES teams(id),
    decision VARCHAR(50) NOT NULL,
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for change approvals
CREATE INDEX IF NOT EXISTS idx_change_approvals_request ON change_approvals(change_request_id);

-- Add students table for student roster management (from migration 009)
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    student_id VARCHAR(100),
    department VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add implementation_plans table (from migration 009)
CREATE TABLE IF NOT EXISTS implementation_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id),
    incident_id UUID REFERENCES incidents(id),
    plan_number VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    root_cause_analysis TEXT,
    affected_systems TEXT[],
    implementation_steps JSONB DEFAULT '[]'::jsonb,
    estimated_effort_hours INTEGER,
    required_resources TEXT,
    estimated_cost DECIMAL(10, 2),
    risk_level VARCHAR(50) DEFAULT 'medium',
    mitigation_strategy TEXT,
    rollback_plan TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    submitted_at TIMESTAMP,
    submitted_by_player_id UUID REFERENCES players(id),
    ai_evaluation JSONB,
    ai_evaluation_score INTEGER,
    ai_suggestions TEXT[],
    ai_reviewed_at TIMESTAMP,
    completed_at TIMESTAMP,
    actual_effort_hours INTEGER,
    outcome_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Implementation plan revisions
CREATE TABLE IF NOT EXISTS implementation_plan_revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES implementation_plans(id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL,
    plan_snapshot JSONB NOT NULL,
    submitted_by_player_id UUID REFERENCES players(id),
    ai_feedback TEXT,
    ai_score INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_impl_plans_game ON implementation_plans(game_id);
CREATE INDEX IF NOT EXISTS idx_impl_plans_team ON implementation_plans(team_id);
CREATE INDEX IF NOT EXISTS idx_impl_plans_incident ON implementation_plans(incident_id);
CREATE INDEX IF NOT EXISTS idx_impl_plan_revisions_plan ON implementation_plan_revisions(plan_id);

-- Add scenario_generated flag to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS scenario_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE games ADD COLUMN IF NOT EXISTS scenario_generated_at TIMESTAMP;

-- Update comments
COMMENT ON TABLE implementation_plans IS 'Implementation plans for resolving incidents, evaluated by AI';
COMMENT ON TABLE students IS 'Global student roster that can be assigned to teams across games';

SELECT 'Migration 010: change_requests schema fix completed' AS status;
