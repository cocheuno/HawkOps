-- Phase 5: Analytics & Reporting
-- Performance metrics, dashboards, and exportable reports

-- Game Session Snapshots (periodic state captures)
CREATE TABLE IF NOT EXISTS game_session_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    snapshot_type VARCHAR(50) NOT NULL DEFAULT 'periodic', -- periodic, milestone, final
    round_number INTEGER NOT NULL,
    total_incidents INTEGER DEFAULT 0,
    resolved_incidents INTEGER DEFAULT 0,
    breached_slas INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    system_health_score DECIMAL(5,2) DEFAULT 100.00,
    avg_resolution_time_minutes DECIMAL(10,2),
    total_cost_incurred DECIMAL(12,2) DEFAULT 0,
    team_data JSONB, -- Array of team snapshots
    service_data JSONB, -- Array of service states
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Team Performance History (time series data)
CREATE TABLE IF NOT EXISTS team_performance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    score INTEGER DEFAULT 0,
    incidents_assigned INTEGER DEFAULT 0,
    incidents_resolved INTEGER DEFAULT 0,
    incidents_breached INTEGER DEFAULT 0,
    avg_resolution_minutes DECIMAL(10,2),
    budget_remaining DECIMAL(12,2),
    morale_level INTEGER DEFAULT 100,
    efficiency_rating DECIMAL(5,2), -- calculated metric
    collaboration_score DECIMAL(5,2), -- based on handoffs, communications
    learning_score DECIMAL(5,2) -- based on PIRs, improvement
);

-- Metric Definitions (configurable metrics)
CREATE TABLE IF NOT EXISTS metric_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- performance, learning, collaboration, efficiency
    calculation_type VARCHAR(50) NOT NULL, -- sum, avg, rate, percentage
    unit VARCHAR(50), -- points, minutes, percentage, dollars
    higher_is_better BOOLEAN DEFAULT TRUE,
    benchmark_value DECIMAL(12,2), -- industry standard or target
    weight DECIMAL(5,2) DEFAULT 1.0, -- for composite scoring
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Team Metric Values
CREATE TABLE IF NOT EXISTS team_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    metric_id UUID REFERENCES metric_definitions(id) ON DELETE CASCADE,
    value DECIMAL(12,4) NOT NULL,
    context JSONB, -- additional context for the metric
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, game_id, metric_id, recorded_at)
);

-- Learning Progress Tracking
CREATE TABLE IF NOT EXISTS learning_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    skill_area VARCHAR(100) NOT NULL, -- incident_management, communication, prioritization, etc.
    proficiency_level INTEGER DEFAULT 1, -- 1-5 scale
    demonstrated_count INTEGER DEFAULT 0, -- times skill was demonstrated
    last_demonstrated_at TIMESTAMP,
    improvement_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, game_id, skill_area)
);

-- Report Templates
CREATE TABLE IF NOT EXISTS report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) NOT NULL, -- summary, detailed, comparison, progress
    template_config JSONB NOT NULL, -- sections, metrics to include, formatting
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Generated Reports
CREATE TABLE IF NOT EXISTS generated_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL,
    title VARCHAR(300) NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    report_data JSONB NOT NULL, -- full report content
    format VARCHAR(20) DEFAULT 'json', -- json, pdf, csv
    generated_by VARCHAR(100), -- system or user identifier
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comparison Baselines (for benchmarking)
CREATE TABLE IF NOT EXISTS comparison_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    baseline_type VARCHAR(50) NOT NULL, -- historical_avg, best_performance, industry_standard
    metrics JSONB NOT NULL, -- metric_name: value pairs
    sample_size INTEGER, -- number of games/teams this is based on
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_game_snapshots_game ON game_session_snapshots(game_id);
CREATE INDEX IF NOT EXISTS idx_game_snapshots_type ON game_session_snapshots(snapshot_type);
CREATE INDEX IF NOT EXISTS idx_performance_history_team ON team_performance_history(team_id);
CREATE INDEX IF NOT EXISTS idx_performance_history_game ON team_performance_history(game_id);
CREATE INDEX IF NOT EXISTS idx_performance_history_time ON team_performance_history(recorded_at);
CREATE INDEX IF NOT EXISTS idx_team_metrics_team ON team_metrics(team_id);
CREATE INDEX IF NOT EXISTS idx_team_metrics_game ON team_metrics(game_id);
CREATE INDEX IF NOT EXISTS idx_team_metrics_metric ON team_metrics(metric_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_team ON learning_progress(team_id, game_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_game ON generated_reports(game_id);

-- Insert default metric definitions
INSERT INTO metric_definitions (name, display_name, description, category, calculation_type, unit, higher_is_better, benchmark_value, weight) VALUES
    ('mttr', 'Mean Time to Resolution', 'Average time to resolve incidents', 'performance', 'avg', 'minutes', FALSE, 30.0, 1.5),
    ('sla_compliance', 'SLA Compliance Rate', 'Percentage of incidents resolved within SLA', 'performance', 'percentage', 'percent', TRUE, 95.0, 2.0),
    ('first_response_time', 'First Response Time', 'Average time to first action on incident', 'performance', 'avg', 'minutes', FALSE, 5.0, 1.0),
    ('escalation_rate', 'Escalation Rate', 'Percentage of incidents requiring escalation', 'efficiency', 'percentage', 'percent', FALSE, 10.0, 1.0),
    ('reopen_rate', 'Incident Reopen Rate', 'Percentage of resolved incidents reopened', 'quality', 'percentage', 'percent', FALSE, 5.0, 1.5),
    ('change_success_rate', 'Change Success Rate', 'Percentage of changes implemented successfully', 'quality', 'percentage', 'percent', TRUE, 90.0, 1.5),
    ('communication_score', 'Communication Score', 'Quality of stakeholder communications', 'collaboration', 'avg', 'points', TRUE, 80.0, 1.0),
    ('pir_quality', 'PIR Quality Score', 'Quality and completeness of post-incident reviews', 'learning', 'avg', 'points', TRUE, 80.0, 1.2),
    ('collaboration_index', 'Collaboration Index', 'Team collaboration and knowledge sharing', 'collaboration', 'avg', 'points', TRUE, 75.0, 1.0),
    ('cost_efficiency', 'Cost Efficiency', 'Value delivered relative to budget spent', 'efficiency', 'avg', 'ratio', TRUE, 1.0, 1.5),
    ('proactive_actions', 'Proactive Actions', 'Number of proactive vs reactive actions', 'efficiency', 'sum', 'count', TRUE, 10.0, 1.0),
    ('knowledge_application', 'Knowledge Application', 'Application of learned lessons', 'learning', 'avg', 'points', TRUE, 70.0, 1.2)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description;

-- Insert default learning skill areas
INSERT INTO learning_progress (team_id, game_id, skill_area, proficiency_level, demonstrated_count)
SELECT t.id, t.game_id, skill.area, 1, 0
FROM teams t
CROSS JOIN (VALUES
    ('incident_triage'),
    ('root_cause_analysis'),
    ('stakeholder_communication'),
    ('priority_management'),
    ('escalation_judgment'),
    ('change_planning'),
    ('risk_assessment'),
    ('team_coordination'),
    ('documentation'),
    ('continuous_improvement')
) AS skill(area)
WHERE NOT EXISTS (
    SELECT 1 FROM learning_progress lp
    WHERE lp.team_id = t.id AND lp.game_id = t.game_id AND lp.skill_area = skill.area
);

-- Insert default report templates
INSERT INTO report_templates (name, description, report_type, template_config, is_default) VALUES
    ('Game Summary', 'High-level summary of game performance', 'summary',
     '{"sections": ["overview", "team_rankings", "key_metrics", "highlights", "areas_for_improvement"]}', TRUE),
    ('Team Performance Detail', 'Detailed performance analysis for a single team', 'detailed',
     '{"sections": ["team_overview", "incident_analysis", "sla_performance", "learning_progress", "recommendations"]}', TRUE),
    ('Multi-Team Comparison', 'Side-by-side comparison of team performance', 'comparison',
     '{"sections": ["ranking_table", "metric_comparison", "trend_analysis", "best_practices"]}', TRUE),
    ('Learning Progress Report', 'Track skill development and learning outcomes', 'progress',
     '{"sections": ["skill_assessment", "improvement_areas", "demonstrated_competencies", "learning_path"]}', TRUE)
ON CONFLICT DO NOTHING;
