-- HawkOps Migration 009: Student Roster and CAB Workflow
-- Description: Adds student roster management and CAB change request workflow

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STUDENT ROSTER (Global list of students)
-- ============================================
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id VARCHAR(50) UNIQUE,  -- e.g., employee ID, student number
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    department VARCHAR(100),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Link players to students (allows tracking same student across games)
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id) ON DELETE SET NULL;

-- ============================================
-- CAB WORKFLOW ENHANCEMENTS
-- ============================================

-- Add CAB workflow fields to change_requests
ALTER TABLE change_requests
  ADD COLUMN IF NOT EXISTS cab_team_id UUID REFERENCES teams(id),
  ADD COLUMN IF NOT EXISTS review_team_id UUID REFERENCES teams(id),
  ADD COLUMN IF NOT EXISTS review_status VARCHAR(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS review_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by_player_id UUID REFERENCES players(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS implementation_time_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS workflow_state VARCHAR(50) DEFAULT 'pending_cab';

-- Change request workflow states:
-- pending_cab: Initial state, waiting for CAB review
-- under_review: CAB sent to another team for technical review
-- review_complete: Review team has provided recommendation
-- approved: CAB approved the change
-- rejected: CAB rejected the change
-- implementing: Change is being implemented
-- completed: Change successfully implemented
-- failed: Implementation failed
-- rolled_back: Change was rolled back

-- ============================================
-- PROBLEM RESOLUTION WORKFLOW
-- ============================================

-- Implementation plans submitted by teams for problem resolution
CREATE TABLE IF NOT EXISTS implementation_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
    problem_id UUID,  -- Reference to problems table if exists

    -- Plan details
    plan_number VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,

    -- Root cause analysis
    root_cause_analysis TEXT,
    affected_systems TEXT[],

    -- Implementation steps (JSON array of steps)
    implementation_steps JSONB NOT NULL DEFAULT '[]',

    -- Resource requirements
    estimated_effort_hours DECIMAL(5, 2),
    required_resources TEXT[],
    estimated_cost DECIMAL(12, 2),

    -- Risk assessment
    risk_level VARCHAR(50) DEFAULT 'medium',
    mitigation_strategy TEXT,
    rollback_plan TEXT,

    -- Workflow
    status VARCHAR(50) DEFAULT 'draft',
    -- draft, submitted, ai_reviewing, ai_approved, ai_rejected, ai_needs_revision, implementing, completed

    -- AI evaluation
    ai_evaluation JSONB,  -- Stores AI assessment
    ai_evaluation_score INTEGER,  -- 0-100 score
    ai_suggestions TEXT[],  -- Array of improvement suggestions
    ai_reviewed_at TIMESTAMP,

    -- Submission tracking
    submitted_by_player_id UUID REFERENCES players(id),
    submitted_at TIMESTAMP,

    -- Completion tracking
    completed_at TIMESTAMP,
    actual_effort_hours DECIMAL(5, 2),
    outcome_notes TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Track plan revision history
CREATE TABLE IF NOT EXISTS implementation_plan_revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES implementation_plans(id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL,

    -- Snapshot of plan at this revision
    plan_snapshot JSONB NOT NULL,

    -- AI feedback for this revision
    ai_feedback TEXT,
    ai_score INTEGER,

    -- Who submitted
    submitted_by_player_id UUID REFERENCES players(id),

    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- GAMES TABLE: Add scenario_generated flag
-- ============================================
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS scenario_generated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS scenario_generated_at TIMESTAMP;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_active ON students(is_active);
CREATE INDEX IF NOT EXISTS idx_players_student ON players(student_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_workflow ON change_requests(game_id, workflow_state);
CREATE INDEX IF NOT EXISTS idx_change_requests_cab ON change_requests(cab_team_id);
CREATE INDEX IF NOT EXISTS idx_implementation_plans_game ON implementation_plans(game_id);
CREATE INDEX IF NOT EXISTS idx_implementation_plans_team ON implementation_plans(team_id);
CREATE INDEX IF NOT EXISTS idx_implementation_plans_status ON implementation_plans(status);

-- ============================================
-- TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS update_students_updated_at ON students;
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_implementation_plans_updated_at ON implementation_plans;
CREATE TRIGGER update_implementation_plans_updated_at BEFORE UPDATE ON implementation_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE students IS 'Global student roster - students can be assigned to teams across multiple games';
COMMENT ON TABLE implementation_plans IS 'Team-submitted plans for resolving incidents/problems, evaluated by AI';
COMMENT ON TABLE implementation_plan_revisions IS 'Revision history of implementation plans with AI feedback';
