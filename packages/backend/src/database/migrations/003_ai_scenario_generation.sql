-- Migration 003: AI Scenario Generation Tables
-- This migration adds tables to support AI-powered scenario and document generation

-- Table to store generated scenario templates
CREATE TABLE IF NOT EXISTS scenario_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  learning_objectives TEXT,
  difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 10),
  estimated_duration_minutes INTEGER,
  primary_domain VARCHAR(100),
  secondary_domains JSONB DEFAULT '[]'::jsonb,
  key_challenges TEXT,
  ai_generated BOOLEAN DEFAULT true,
  ai_prompt TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table to track scenario generation sessions
CREATE TABLE IF NOT EXISTS scenario_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  selected_domains JSONB NOT NULL,
  additional_context TEXT,
  difficulty_level INTEGER,
  estimated_duration_minutes INTEGER,
  scenarios_offered JSONB, -- Array of 5 generated scenarios
  selected_scenario_id UUID,
  generation_status VARCHAR(50) DEFAULT 'in_progress',
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scenario_templates_domain ON scenario_templates(primary_domain);
CREATE INDEX IF NOT EXISTS idx_scenario_templates_difficulty ON scenario_templates(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_scenario_generations_game ON scenario_generations(game_id);
CREATE INDEX IF NOT EXISTS idx_scenario_generations_status ON scenario_generations(generation_status);

-- Comments for documentation
COMMENT ON TABLE scenario_templates IS 'Stores AI-generated or manually created scenario templates';
COMMENT ON TABLE scenario_generations IS 'Tracks AI scenario generation sessions for games';
COMMENT ON COLUMN scenario_templates.secondary_domains IS 'JSON array of additional ITSM domains covered by this scenario';
COMMENT ON COLUMN scenario_generations.scenarios_offered IS 'JSON array containing the 5 scenarios presented to the instructor';
