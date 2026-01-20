-- Migration 004: Add scenario context to games table
-- This migration adds a JSONB column to store the selected scenario context
-- so AI-generated incidents can be faithful to the scenario

-- Add scenario_context column to games table
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS scenario_context JSONB;

-- Comment for documentation
COMMENT ON COLUMN games.scenario_context IS 'JSON object storing the selected scenario details (title, description, learning objectives, key challenges, domains) for AI incident generation';
