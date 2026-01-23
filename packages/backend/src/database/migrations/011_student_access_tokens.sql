-- Migration 011: Add student access tokens and session tracking
-- This enables email-based team access for students

-- Add access_token column to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS access_token TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP;
ALTER TABLE players ADD COLUMN IF NOT EXISTS access_count INTEGER DEFAULT 0;

-- Create index for token lookups
CREATE INDEX IF NOT EXISTS idx_players_access_token ON players(access_token) WHERE access_token IS NOT NULL;

-- Create student sessions table for tracking
CREATE TABLE IF NOT EXISTS student_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_student_sessions_player ON student_sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_student_sessions_active ON student_sessions(is_active) WHERE is_active = true;

-- Add comments
COMMENT ON COLUMN players.access_token IS 'JWT token for student to access their team page via email link';
COMMENT ON COLUMN players.last_accessed_at IS 'Timestamp of last access to the team page';
COMMENT ON COLUMN players.access_count IS 'Number of times the student accessed the team page';
COMMENT ON TABLE student_sessions IS 'Tracks student login sessions for activity monitoring';
