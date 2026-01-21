-- Migration: 006_competitive_elements.sql
-- Description: Add achievements, badges, and team challenges for competitive gameplay

-- Achievement definitions (templates)
CREATE TABLE IF NOT EXISTS achievement_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL, -- speed, quality, teamwork, leadership, learning
    icon VARCHAR(50) DEFAULT '🏆',
    points INTEGER DEFAULT 100,
    rarity VARCHAR(50) DEFAULT 'common', -- common, uncommon, rare, epic, legendary
    criteria JSONB NOT NULL, -- conditions to unlock
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Team achievements (earned badges)
CREATE TABLE IF NOT EXISTS team_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievement_definitions(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    context JSONB, -- additional context about how it was earned
    UNIQUE(team_id, achievement_id, game_id)
);

-- Team challenges (special objectives)
CREATE TABLE IF NOT EXISTS team_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    challenge_type VARCHAR(50) NOT NULL, -- speed, efficiency, collaboration, quality
    target_value INTEGER NOT NULL, -- target to achieve
    current_value INTEGER DEFAULT 0,
    reward_points INTEGER DEFAULT 500,
    reward_badge_id UUID REFERENCES achievement_definitions(id),
    status VARCHAR(50) DEFAULT 'active', -- active, completed, failed, expired
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    assigned_team_id UUID REFERENCES teams(id) ON DELETE CASCADE, -- null = all teams
    completed_by_team_id UUID REFERENCES teams(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leaderboard snapshots (for historical tracking)
CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    rankings JSONB NOT NULL, -- array of {teamId, rank, score, metrics}
    snapshot_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default achievement definitions
INSERT INTO achievement_definitions (code, name, description, category, icon, points, rarity, criteria) VALUES
-- Speed achievements
('first_responder', 'First Responder', 'Acknowledge an incident within 2 minutes of creation', 'speed', '⚡', 50, 'common', '{"type": "incident_response_time", "maxMinutes": 2}'),
('speed_demon', 'Speed Demon', 'Resolve 3 incidents in under 10 minutes each', 'speed', '🏎️', 150, 'uncommon', '{"type": "fast_resolutions", "count": 3, "maxMinutes": 10}'),
('sla_champion', 'SLA Champion', 'Complete 5 incidents without any SLA breaches', 'speed', '🎯', 200, 'rare', '{"type": "no_sla_breaches", "count": 5}'),

-- Quality achievements
('root_cause_master', 'Root Cause Master', 'Score 90+ on a Post-Incident Review', 'quality', '🔍', 200, 'rare', '{"type": "pir_score", "minScore": 90}'),
('zero_rework', 'Zero Rework', 'Resolve 3 incidents without reopening', 'quality', '✨', 100, 'uncommon', '{"type": "no_reopens", "count": 3}'),
('documentation_hero', 'Documentation Hero', 'Submit 5 comprehensive PIRs with all fields completed', 'quality', '📝', 150, 'uncommon', '{"type": "complete_pirs", "count": 5}'),

-- Teamwork achievements
('helping_hand', 'Helping Hand', 'Collaborate with another team on an incident', 'teamwork', '🤝', 100, 'common', '{"type": "cross_team_collab", "count": 1}'),
('communication_pro', 'Communication Pro', 'Respond to 5 stakeholder messages with high scores', 'teamwork', '💬', 150, 'uncommon', '{"type": "stakeholder_responses", "count": 5, "minScore": 80}'),
('bridge_builder', 'Bridge Builder', 'Successfully coordinate 3 major incidents', 'teamwork', '🌉', 250, 'rare', '{"type": "major_coordination", "count": 3}'),

-- Leadership achievements
('crisis_manager', 'Crisis Manager', 'Successfully manage a critical incident without escalation', 'leadership', '🎖️', 300, 'epic', '{"type": "critical_no_escalation", "count": 1}'),
('calm_under_pressure', 'Calm Under Pressure', 'Handle 3+ simultaneous incidents successfully', 'leadership', '🧘', 200, 'rare', '{"type": "concurrent_incidents", "count": 3}'),
('mentor', 'Mentor', 'Provide detailed lessons learned that help other teams', 'leadership', '👨‍🏫', 150, 'uncommon', '{"type": "shared_learnings", "count": 1}'),

-- Learning achievements
('continuous_learner', 'Continuous Learner', 'Complete PIRs for all resolved incidents', 'learning', '📚', 100, 'common', '{"type": "pir_completion_rate", "rate": 100}'),
('improvement_mindset', 'Improvement Mindset', 'Identify 10 actionable improvements across PIRs', 'learning', '🚀', 150, 'uncommon', '{"type": "action_items", "count": 10}'),
('knowledge_seeker', 'Knowledge Seeker', 'Review all briefing documents before first incident', 'learning', '🎓', 75, 'common', '{"type": "briefing_review", "complete": true}'),

-- Special achievements
('perfect_round', 'Perfect Round', 'Complete a round with 100% SLA compliance and no budget overruns', 'special', '🏆', 500, 'legendary', '{"type": "perfect_round"}'),
('comeback_kid', 'Comeback Kid', 'Recover from last place to top 3 in a single round', 'special', '🔥', 300, 'epic', '{"type": "ranking_improvement", "positions": 3}'),
('early_bird', 'Early Bird', 'Start working on an incident before any other team', 'special', '🐦', 50, 'common', '{"type": "first_to_respond"}')
ON CONFLICT (code) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_achievements_team ON team_achievements(team_id);
CREATE INDEX IF NOT EXISTS idx_team_achievements_game ON team_achievements(game_id);
CREATE INDEX IF NOT EXISTS idx_team_challenges_game ON team_challenges(game_id);
CREATE INDEX IF NOT EXISTS idx_team_challenges_status ON team_challenges(status);
CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_game ON leaderboard_snapshots(game_id);
