-- Migration: 007_realism_enhancements.sql
-- Description: Add escalation paths, service dependencies, change requests, and resource constraints

-- Services table (for service dependency tracking)
-- Note: This complements configuration_items which tracks CI health
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- application, database, infrastructure, network, etc.
    status VARCHAR(50) DEFAULT 'operational', -- operational, degraded, down
    criticality INTEGER DEFAULT 5, -- 1-10 scale
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_services_game ON services(game_id);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);

-- Escalation paths for incidents
CREATE TABLE IF NOT EXISTS escalation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    priority_trigger VARCHAR(50) NOT NULL, -- critical, high, medium, low
    time_threshold_minutes INTEGER NOT NULL, -- time before escalation
    escalation_level INTEGER DEFAULT 1, -- 1, 2, 3 etc.
    notify_roles TEXT[], -- roles to notify
    auto_reassign BOOLEAN DEFAULT FALSE,
    target_team_role VARCHAR(100), -- team role to reassign to
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Incident escalation history
CREATE TABLE IF NOT EXISTS incident_escalations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    escalation_rule_id UUID REFERENCES escalation_rules(id),
    from_team_id UUID REFERENCES teams(id),
    to_team_id UUID REFERENCES teams(id),
    escalation_level INTEGER NOT NULL,
    reason TEXT,
    escalated_by VARCHAR(100), -- 'system' or 'manual'
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Service dependencies
CREATE TABLE IF NOT EXISTS service_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    depends_on_service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) DEFAULT 'hard', -- hard (fails if dep down), soft (degraded if dep down)
    impact_delay_minutes INTEGER DEFAULT 0, -- delay before impact propagates
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(service_id, depends_on_service_id)
);

-- Change requests (planned changes)
CREATE TABLE IF NOT EXISTS change_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    change_number VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    change_type VARCHAR(50) NOT NULL, -- standard, normal, emergency
    risk_level VARCHAR(50) DEFAULT 'medium', -- low, medium, high, critical
    affected_services UUID[], -- array of service IDs
    requested_by_team_id UUID REFERENCES teams(id),
    assigned_to_team_id UUID REFERENCES teams(id),
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, in_progress, completed, failed, rolled_back
    scheduled_start TIMESTAMP,
    scheduled_end TIMESTAMP,
    actual_start TIMESTAMP,
    actual_end TIMESTAMP,
    implementation_plan TEXT,
    rollback_plan TEXT,
    test_plan TEXT,
    approval_notes TEXT,
    failure_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Change request approvals
CREATE TABLE IF NOT EXISTS change_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    change_request_id UUID NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
    approver_team_id UUID NOT NULL REFERENCES teams(id),
    decision VARCHAR(50) NOT NULL, -- approved, rejected, needs_info
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resource constraints (staffing)
CREATE TABLE IF NOT EXISTS team_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL, -- staff, expertise, tools
    resource_name VARCHAR(255) NOT NULL,
    total_capacity INTEGER NOT NULL,
    available_capacity INTEGER NOT NULL,
    cost_per_hour DECIMAL(10,2) DEFAULT 0,
    skill_level VARCHAR(50) DEFAULT 'standard', -- junior, standard, senior, expert
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resource allocations
CREATE TABLE IF NOT EXISTS resource_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL REFERENCES team_resources(id) ON DELETE CASCADE,
    incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
    change_request_id UUID REFERENCES change_requests(id) ON DELETE SET NULL,
    units_allocated INTEGER NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active', -- active, completed, released
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shift schedules
CREATE TABLE IF NOT EXISTS shift_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    shift_name VARCHAR(100) NOT NULL, -- day, evening, night, on-call
    start_hour INTEGER NOT NULL, -- 0-23
    end_hour INTEGER NOT NULL, -- 0-23
    staff_count INTEGER NOT NULL,
    efficiency_modifier DECIMAL(3,2) DEFAULT 1.0, -- 0.5 = 50% efficiency (night shift)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- On-call rotations
CREATE TABLE IF NOT EXISTS on_call_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    primary_contact VARCHAR(255),
    secondary_contact VARCHAR(255),
    response_time_minutes INTEGER DEFAULT 15,
    effective_from TIMESTAMP NOT NULL,
    effective_to TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default escalation rules
INSERT INTO escalation_rules (game_id, name, description, priority_trigger, time_threshold_minutes, escalation_level, notify_roles, auto_reassign)
SELECT
    g.id,
    'Critical P1 - 15 min',
    'Escalate critical incidents after 15 minutes without resolution',
    'critical',
    15,
    1,
    ARRAY['manager', 'lead'],
    FALSE
FROM games g
WHERE NOT EXISTS (SELECT 1 FROM escalation_rules er WHERE er.game_id = g.id)
ON CONFLICT DO NOTHING;

INSERT INTO escalation_rules (game_id, name, description, priority_trigger, time_threshold_minutes, escalation_level, notify_roles, auto_reassign)
SELECT
    g.id,
    'Critical P1 - 30 min',
    'Major escalation for critical incidents after 30 minutes',
    'critical',
    30,
    2,
    ARRAY['director', 'vp'],
    FALSE
FROM games g
WHERE NOT EXISTS (SELECT 1 FROM escalation_rules er WHERE er.game_id = g.id AND er.escalation_level = 2)
ON CONFLICT DO NOTHING;

INSERT INTO escalation_rules (game_id, name, description, priority_trigger, time_threshold_minutes, escalation_level, notify_roles, auto_reassign)
SELECT
    g.id,
    'High Priority - 30 min',
    'Escalate high priority incidents after 30 minutes',
    'high',
    30,
    1,
    ARRAY['manager'],
    FALSE
FROM games g
WHERE NOT EXISTS (SELECT 1 FROM escalation_rules er WHERE er.game_id = g.id AND er.priority_trigger = 'high')
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_escalation_rules_game ON escalation_rules(game_id);
CREATE INDEX IF NOT EXISTS idx_incident_escalations_incident ON incident_escalations(incident_id);
CREATE INDEX IF NOT EXISTS idx_service_dependencies_service ON service_dependencies(service_id);
CREATE INDEX IF NOT EXISTS idx_service_dependencies_depends ON service_dependencies(depends_on_service_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_game ON change_requests(game_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_status ON change_requests(status);
CREATE INDEX IF NOT EXISTS idx_team_resources_team ON team_resources(team_id);
CREATE INDEX IF NOT EXISTS idx_resource_allocations_resource ON resource_allocations(resource_id);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_team ON shift_schedules(team_id);

-- Add escalation_count to incidents table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'incidents' AND column_name = 'escalation_count') THEN
        ALTER TABLE incidents ADD COLUMN escalation_count INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'incidents' AND column_name = 'current_escalation_level') THEN
        ALTER TABLE incidents ADD COLUMN current_escalation_level INTEGER DEFAULT 0;
    END IF;
END $$;
