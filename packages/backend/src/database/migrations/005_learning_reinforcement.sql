-- Migration 005: Learning Reinforcement - PIR and Stakeholder Communications
-- Phase 2 features for educational value

-- Post-Incident Reviews table
CREATE TABLE IF NOT EXISTS post_incident_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    submitted_by_player_id UUID REFERENCES players(id),

    -- PIR Content
    what_happened TEXT NOT NULL,
    root_cause TEXT NOT NULL,
    what_went_well TEXT,
    what_could_improve TEXT,
    action_items JSONB DEFAULT '[]', -- Array of action items
    lessons_learned TEXT,

    -- AI Grading
    ai_score INTEGER, -- 0-100
    ai_feedback JSONB, -- Structured feedback from AI
    ai_graded_at TIMESTAMP,

    -- Metadata
    status VARCHAR(50) DEFAULT 'draft', -- draft, submitted, graded
    created_at TIMESTAMP DEFAULT NOW(),
    submitted_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Stakeholder Communications table
CREATE TABLE IF NOT EXISTS stakeholder_communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,

    -- Stakeholder details
    stakeholder_type VARCHAR(50) NOT NULL, -- 'executive', 'customer', 'media', 'regulator', 'vendor'
    stakeholder_name VARCHAR(255) NOT NULL,
    stakeholder_title VARCHAR(255),
    stakeholder_avatar VARCHAR(255), -- URL or identifier for avatar

    -- Communication
    message TEXT NOT NULL, -- The stakeholder's message/inquiry
    urgency VARCHAR(50) DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'
    sentiment VARCHAR(50) DEFAULT 'neutral', -- 'angry', 'concerned', 'neutral', 'supportive'
    requires_response BOOLEAN DEFAULT true,
    response_deadline TIMESTAMP,

    -- Team response
    assigned_to_team_id UUID REFERENCES teams(id),
    response_text TEXT,
    responded_at TIMESTAMP,
    responded_by_player_id UUID REFERENCES players(id),

    -- AI evaluation of response
    ai_response_score INTEGER, -- 0-100
    ai_response_feedback JSONB,

    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'responded', 'escalated', 'closed'

    -- AI generation flag
    ai_generated BOOLEAN DEFAULT false,
    ai_context JSONB, -- Context used for generation

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pir_incident ON post_incident_reviews(incident_id);
CREATE INDEX IF NOT EXISTS idx_pir_team ON post_incident_reviews(team_id);
CREATE INDEX IF NOT EXISTS idx_pir_game_status ON post_incident_reviews(game_id, status);

CREATE INDEX IF NOT EXISTS idx_stakeholder_comm_game ON stakeholder_communications(game_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_comm_incident ON stakeholder_communications(incident_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_comm_team ON stakeholder_communications(assigned_to_team_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_comm_status ON stakeholder_communications(game_id, status);
CREATE INDEX IF NOT EXISTS idx_stakeholder_comm_deadline ON stakeholder_communications(response_deadline)
    WHERE status = 'pending' AND requires_response = true;

-- Add PIR requirement flag to incidents
ALTER TABLE incidents
    ADD COLUMN IF NOT EXISTS requires_pir BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS pir_completed BOOLEAN DEFAULT false;

-- Comments
COMMENT ON TABLE post_incident_reviews IS 'Post-incident reviews submitted by teams after resolving incidents';
COMMENT ON TABLE stakeholder_communications IS 'Stakeholder communications (executives, customers, media) requiring team response';
