-- HawkOps Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'lobby',
  duration_minutes INTEGER DEFAULT 75,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT games_status_check CHECK (status IN ('lobby', 'active', 'paused', 'completed'))
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL,
  score INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT teams_role_check CHECK (role IN ('Service Desk', 'Technical Operations', 'Management/CAB'))
);

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  is_ready BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP,
  UNIQUE(game_id, name)
);

-- Incidents table
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  affected_services TEXT[],
  assigned_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT incidents_priority_check CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT incidents_status_check CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'))
);

-- Actions table (player actions during the game)
CREATE TABLE IF NOT EXISTS actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
  action_type VARCHAR(100) NOT NULL,
  action_data JSONB NOT NULL,
  result JSONB,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Game events (for timeline/audit log)
CREATE TABLE IF NOT EXISTS game_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL,
  severity VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT game_events_severity_check CHECK (severity IN ('info', 'warning', 'error', 'critical'))
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns if chat_messages already exists
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS message TEXT;

-- Add missing columns to incidents table
ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS severity VARCHAR(50) DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS incident_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS ai_context JSONB,
  ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

-- Add missing columns to games table
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS scenario_context JSONB,
  ADD COLUMN IF NOT EXISTS scenario_type VARCHAR(100);

-- Add missing columns to game_events table
ALTER TABLE game_events
  ADD COLUMN IF NOT EXISTS event_category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS actor_type VARCHAR(50);

-- Game metrics (for scoring and analytics)
CREATE TABLE IF NOT EXISTS game_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  metric_name VARCHAR(100) NOT NULL,
  metric_value NUMERIC NOT NULL,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI interactions (for Claude API calls)
CREATE TABLE IF NOT EXISTS ai_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  interaction_type VARCHAR(100) NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Implementation Plans table
CREATE TABLE IF NOT EXISTS implementation_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
  plan_number VARCHAR(50) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  root_cause_analysis TEXT,
  affected_systems TEXT[],
  implementation_steps JSONB DEFAULT '[]'::jsonb,
  estimated_effort_hours NUMERIC,
  required_resources TEXT,
  estimated_cost NUMERIC,
  risk_level VARCHAR(50) DEFAULT 'medium',
  mitigation_strategy TEXT,
  rollback_plan TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMP,
  submitted_by_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  ai_evaluation JSONB,
  ai_evaluation_score INTEGER,
  ai_suggestions TEXT[],
  ai_reviewed_at TIMESTAMP,
  related_change_request_id UUID,
  completed_at TIMESTAMP,
  actual_effort_hours NUMERIC,
  outcome_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT implementation_plans_risk_check CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT implementation_plans_status_check CHECK (status IN ('draft', 'ai_reviewing', 'ai_approved', 'ai_needs_revision', 'ai_rejected', 'change_requested', 'implementing', 'completed'))
);

-- Implementation Plan Revisions table
CREATE TABLE IF NOT EXISTS implementation_plan_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES implementation_plans(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  plan_snapshot JSONB NOT NULL,
  submitted_by_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  ai_feedback TEXT,
  ai_score INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Change Requests table
CREATE TABLE IF NOT EXISTS change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  change_number VARCHAR(50) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  change_type VARCHAR(50) NOT NULL DEFAULT 'normal',
  risk_level VARCHAR(50) NOT NULL DEFAULT 'medium',
  affected_services TEXT[],
  requested_by_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  implementation_plan TEXT,
  rollback_plan TEXT,
  cab_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  workflow_state VARCHAR(50) DEFAULT 'pending_cab',
  review_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  review_status VARCHAR(50),
  review_notes TEXT,
  approval_notes TEXT,
  implementation_time_minutes INTEGER,
  related_plan_id UUID REFERENCES implementation_plans(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT change_requests_type_check CHECK (change_type IN ('standard', 'normal', 'emergency')),
  CONSTRAINT change_requests_risk_check CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT change_requests_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'implemented', 'cancelled')),
  CONSTRAINT change_requests_workflow_check CHECK (workflow_state IN ('pending_cab', 'under_review', 'review_complete', 'approved', 'rejected'))
);

-- Student Evaluations table (end-of-game AI evaluations)
CREATE TABLE IF NOT EXISTS student_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  student_name VARCHAR(255),
  student_email VARCHAR(255),
  actions_summary JSONB,
  ai_evaluation TEXT,
  ai_score INTEGER,
  strengths TEXT[],
  improvements TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_student_evaluations_game_id ON student_evaluations(game_id);
CREATE INDEX IF NOT EXISTS idx_implementation_plans_game_id ON implementation_plans(game_id);
CREATE INDEX IF NOT EXISTS idx_implementation_plans_team_id ON implementation_plans(team_id);
CREATE INDEX IF NOT EXISTS idx_implementation_plans_incident_id ON implementation_plans(incident_id);
CREATE INDEX IF NOT EXISTS idx_implementation_plan_revisions_plan_id ON implementation_plan_revisions(plan_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_game_id ON change_requests(game_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_requested_by ON change_requests(requested_by_team_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_cab_team ON change_requests(cab_team_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_review_team ON change_requests(review_team_id);
CREATE INDEX IF NOT EXISTS idx_teams_game_id ON teams(game_id);
CREATE INDEX IF NOT EXISTS idx_players_game_id ON players(game_id);
CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_incidents_game_id ON incidents(game_id);
CREATE INDEX IF NOT EXISTS idx_incidents_team_id ON incidents(assigned_team_id);
CREATE INDEX IF NOT EXISTS idx_actions_game_id ON actions(game_id);
CREATE INDEX IF NOT EXISTS idx_actions_team_id ON actions(team_id);
CREATE INDEX IF NOT EXISTS idx_game_events_game_id ON game_events(game_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_game_id ON chat_messages(game_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_team_id ON chat_messages(team_id);
CREATE INDEX IF NOT EXISTS idx_game_metrics_game_id ON game_metrics(game_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_game_id ON ai_interactions(game_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at (drop first to avoid "already exists" errors)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_games_updated_at ON games;
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_incidents_updated_at ON incidents;
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_implementation_plans_updated_at ON implementation_plans;
CREATE TRIGGER update_implementation_plans_updated_at BEFORE UPDATE ON implementation_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_change_requests_updated_at ON change_requests;
CREATE TRIGGER update_change_requests_updated_at BEFORE UPDATE ON change_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
