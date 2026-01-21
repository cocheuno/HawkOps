import { Pool } from 'pg';

interface GameSnapshot {
  id: string;
  gameId: string;
  snapshotType: string;
  roundNumber: number;
  totalIncidents: number;
  resolvedIncidents: number;
  breachedSlas: number;
  totalScore: number;
  systemHealthScore: number;
  avgResolutionTimeMinutes: number | null;
  totalCostIncurred: number;
  teamData: any[];
  serviceData: any[];
  createdAt: Date;
}

interface TeamPerformanceRecord {
  teamId: string;
  teamName?: string;
  score: number;
  incidentsAssigned: number;
  incidentsResolved: number;
  incidentsBreached: number;
  avgResolutionMinutes: number | null;
  budgetRemaining: number;
  moraleLevel: number;
  efficiencyRating: number;
  collaborationScore: number;
  learningScore: number;
}

interface MetricDefinition {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  calculationType: string;
  unit: string;
  higherIsBetter: boolean;
  benchmarkValue: number;
  weight: number;
}

interface TeamMetricSummary {
  teamId: string;
  teamName: string;
  metrics: {
    name: string;
    displayName: string;
    value: number;
    unit: string;
    benchmark: number;
    performance: 'above' | 'at' | 'below'; // relative to benchmark
  }[];
  overallScore: number;
}

interface LearningProgress {
  skillArea: string;
  proficiencyLevel: number;
  demonstratedCount: number;
  lastDemonstratedAt: Date | null;
  trend: 'improving' | 'stable' | 'declining';
}

interface GeneratedReport {
  id: string;
  title: string;
  reportType: string;
  sections: any[];
  generatedAt: Date;
}

export class AnalyticsService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Capture a game state snapshot
   */
  async captureSnapshot(gameId: string, snapshotType: 'periodic' | 'milestone' | 'final' = 'periodic'): Promise<GameSnapshot> {
    // Get game info
    const gameResult = await this.pool.query(
      `SELECT current_round FROM games WHERE id = $1`,
      [gameId]
    );
    const roundNumber = gameResult.rows[0]?.current_round || 1;

    // Get incident statistics
    const incidentStats = await this.pool.query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) as resolved,
         COUNT(*) FILTER (WHERE sla_breached = TRUE) as breached,
         AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/60)
           FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution_minutes
       FROM incidents WHERE game_id = $1`,
      [gameId]
    );

    // Get total scores
    const scoreResult = await this.pool.query(
      `SELECT COALESCE(SUM(score), 0) as total_score FROM teams WHERE game_id = $1`,
      [gameId]
    );

    // Get system health
    const healthResult = await this.pool.query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'operational') as operational
       FROM services WHERE game_id = $1`,
      [gameId]
    );
    const healthScore = healthResult.rows[0]?.total > 0
      ? (healthResult.rows[0].operational / healthResult.rows[0].total) * 100
      : 100;

    // Get total cost
    const costResult = await this.pool.query(
      `SELECT COALESCE(SUM(total_cost), 0) as total_cost FROM incidents WHERE game_id = $1`,
      [gameId]
    );

    // Get team data
    const teamData = await this.pool.query(
      `SELECT t.id, t.name, t.score, t.budget_remaining, t.morale_level,
              COUNT(i.id) FILTER (WHERE i.status NOT IN ('resolved', 'closed')) as active_incidents
       FROM teams t
       LEFT JOIN incidents i ON t.id = i.assigned_team_id
       WHERE t.game_id = $1
       GROUP BY t.id`,
      [gameId]
    );

    // Get service data
    const serviceData = await this.pool.query(
      `SELECT id, name, status, criticality FROM services WHERE game_id = $1`,
      [gameId]
    );

    // Insert snapshot
    const result = await this.pool.query(
      `INSERT INTO game_session_snapshots
       (game_id, snapshot_type, round_number, total_incidents, resolved_incidents,
        breached_slas, total_score, system_health_score, avg_resolution_time_minutes,
        total_cost_incurred, team_data, service_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        gameId, snapshotType, roundNumber,
        incidentStats.rows[0]?.total || 0,
        incidentStats.rows[0]?.resolved || 0,
        incidentStats.rows[0]?.breached || 0,
        scoreResult.rows[0]?.total_score || 0,
        healthScore,
        incidentStats.rows[0]?.avg_resolution_minutes || null,
        costResult.rows[0]?.total_cost || 0,
        JSON.stringify(teamData.rows),
        JSON.stringify(serviceData.rows)
      ]
    );

    return this.mapSnapshot(result.rows[0]);
  }

  /**
   * Get historical snapshots for a game
   */
  async getSnapshots(gameId: string, limit: number = 50): Promise<GameSnapshot[]> {
    const result = await this.pool.query(
      `SELECT * FROM game_session_snapshots
       WHERE game_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [gameId, limit]
    );
    return result.rows.map((row: any) => this.mapSnapshot(row));
  }

  /**
   * Record team performance data point
   */
  async recordTeamPerformance(teamId: string, gameId: string): Promise<void> {
    // Calculate current metrics for the team
    const metricsResult = await this.pool.query(
      `SELECT
         t.score,
         t.budget_remaining,
         t.morale_level,
         COUNT(i.id) as incidents_assigned,
         COUNT(i.id) FILTER (WHERE i.status IN ('resolved', 'closed')) as incidents_resolved,
         COUNT(i.id) FILTER (WHERE i.sla_breached = TRUE) as incidents_breached,
         AVG(EXTRACT(EPOCH FROM (i.resolved_at - i.created_at))/60)
           FILTER (WHERE i.resolved_at IS NOT NULL) as avg_resolution_minutes
       FROM teams t
       LEFT JOIN incidents i ON t.id = i.assigned_team_id
       WHERE t.id = $1 AND t.game_id = $2
       GROUP BY t.id`,
      [teamId, gameId]
    );

    if (metricsResult.rows.length === 0) return;

    const data = metricsResult.rows[0];

    // Calculate efficiency rating (incidents resolved / time)
    const efficiencyRating = data.incidents_assigned > 0
      ? (data.incidents_resolved / data.incidents_assigned) * 100
      : 100;

    // Get collaboration score from communications
    const collabResult = await this.pool.query(
      `SELECT COALESCE(AVG(response_quality_score), 50) as collab_score
       FROM stakeholder_communications
       WHERE team_id = $1 AND response_quality_score IS NOT NULL`,
      [teamId]
    );
    const collaborationScore = collabResult.rows[0]?.collab_score || 50;

    // Get learning score from PIRs
    const pirResult = await this.pool.query(
      `SELECT COALESCE(AVG(quality_score), 50) as pir_score
       FROM post_incident_reviews
       WHERE submitted_by_team_id = $1 AND quality_score IS NOT NULL`,
      [teamId]
    );
    const learningScore = pirResult.rows[0]?.pir_score || 50;

    await this.pool.query(
      `INSERT INTO team_performance_history
       (team_id, game_id, score, incidents_assigned, incidents_resolved, incidents_breached,
        avg_resolution_minutes, budget_remaining, morale_level, efficiency_rating,
        collaboration_score, learning_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        teamId, gameId,
        data.score,
        data.incidents_assigned,
        data.incidents_resolved,
        data.incidents_breached,
        data.avg_resolution_minutes,
        data.budget_remaining,
        data.morale_level,
        efficiencyRating,
        collaborationScore,
        learningScore
      ]
    );
  }

  /**
   * Get team performance history
   */
  async getTeamPerformanceHistory(teamId: string, gameId: string): Promise<TeamPerformanceRecord[]> {
    const result = await this.pool.query(
      `SELECT tph.*, t.name as team_name
       FROM team_performance_history tph
       JOIN teams t ON tph.team_id = t.id
       WHERE tph.team_id = $1 AND tph.game_id = $2
       ORDER BY tph.recorded_at ASC`,
      [teamId, gameId]
    );
    return result.rows.map((row: any) => ({
      teamId: row.team_id,
      teamName: row.team_name,
      score: row.score,
      incidentsAssigned: row.incidents_assigned,
      incidentsResolved: row.incidents_resolved,
      incidentsBreached: row.incidents_breached,
      avgResolutionMinutes: row.avg_resolution_minutes,
      budgetRemaining: parseFloat(row.budget_remaining),
      moraleLevel: row.morale_level,
      efficiencyRating: parseFloat(row.efficiency_rating),
      collaborationScore: parseFloat(row.collaboration_score),
      learningScore: parseFloat(row.learning_score)
    }));
  }

  /**
   * Get all metric definitions
   */
  async getMetricDefinitions(): Promise<MetricDefinition[]> {
    const result = await this.pool.query(
      `SELECT * FROM metric_definitions WHERE is_active = TRUE ORDER BY category, name`
    );
    return result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      category: row.category,
      calculationType: row.calculation_type,
      unit: row.unit,
      higherIsBetter: row.higher_is_better,
      benchmarkValue: parseFloat(row.benchmark_value),
      weight: parseFloat(row.weight)
    }));
  }

  /**
   * Calculate and store metrics for a team
   */
  async calculateTeamMetrics(teamId: string, gameId: string): Promise<TeamMetricSummary> {
    const metrics = await this.getMetricDefinitions();
    const teamResult = await this.pool.query(
      `SELECT name FROM teams WHERE id = $1`,
      [teamId]
    );
    const teamName = teamResult.rows[0]?.name || 'Unknown';

    const calculatedMetrics: TeamMetricSummary['metrics'] = [];
    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const metric of metrics) {
      const value = await this.calculateMetricValue(teamId, gameId, metric);
      if (value === null) continue;

      // Determine performance relative to benchmark
      let performance: 'above' | 'at' | 'below';
      if (metric.higherIsBetter) {
        performance = value > metric.benchmarkValue ? 'above' : value === metric.benchmarkValue ? 'at' : 'below';
      } else {
        performance = value < metric.benchmarkValue ? 'above' : value === metric.benchmarkValue ? 'at' : 'below';
      }

      calculatedMetrics.push({
        name: metric.name,
        displayName: metric.displayName,
        value,
        unit: metric.unit,
        benchmark: metric.benchmarkValue,
        performance
      });

      // Calculate normalized score (0-100)
      let normalizedScore: number;
      if (metric.higherIsBetter) {
        normalizedScore = Math.min(100, (value / metric.benchmarkValue) * 100);
      } else {
        normalizedScore = Math.min(100, (metric.benchmarkValue / Math.max(value, 0.1)) * 100);
      }

      totalWeightedScore += normalizedScore * metric.weight;
      totalWeight += metric.weight;

      // Store the metric value
      await this.pool.query(
        `INSERT INTO team_metrics (team_id, game_id, metric_id, value)
         VALUES ($1, $2, $3, $4)`,
        [teamId, gameId, metric.id, value]
      );
    }

    const overallScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;

    return {
      teamId,
      teamName,
      metrics: calculatedMetrics,
      overallScore
    };
  }

  /**
   * Calculate a specific metric value for a team
   */
  private async calculateMetricValue(teamId: string, _gameId: string, metric: MetricDefinition): Promise<number | null> {
    switch (metric.name) {
      case 'mttr': {
        const result = await this.pool.query(
          `SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/60) as value
           FROM incidents WHERE assigned_team_id = $1 AND resolved_at IS NOT NULL`,
          [teamId]
        );
        return result.rows[0]?.value ? parseFloat(result.rows[0].value) : null;
      }

      case 'sla_compliance': {
        const result = await this.pool.query(
          `SELECT
             COUNT(*) as total,
             COUNT(*) FILTER (WHERE sla_breached = FALSE OR sla_breached IS NULL) as compliant
           FROM incidents WHERE assigned_team_id = $1`,
          [teamId]
        );
        const total = parseInt(result.rows[0]?.total) || 0;
        if (total === 0) return null;
        return (parseInt(result.rows[0]?.compliant) / total) * 100;
      }

      case 'first_response_time': {
        const result = await this.pool.query(
          `SELECT AVG(EXTRACT(EPOCH FROM (
             COALESCE(
               (SELECT MIN(created_at) FROM incident_updates WHERE incident_id = i.id),
               i.updated_at
             ) - i.created_at
           ))/60) as value
           FROM incidents i WHERE i.assigned_team_id = $1`,
          [teamId]
        );
        return result.rows[0]?.value ? parseFloat(result.rows[0].value) : null;
      }

      case 'escalation_rate': {
        const result = await this.pool.query(
          `SELECT
             COUNT(*) as total,
             COUNT(*) FILTER (WHERE escalation_count > 0) as escalated
           FROM incidents WHERE assigned_team_id = $1`,
          [teamId]
        );
        const total = parseInt(result.rows[0]?.total) || 0;
        if (total === 0) return null;
        return (parseInt(result.rows[0]?.escalated) / total) * 100;
      }

      case 'change_success_rate': {
        const result = await this.pool.query(
          `SELECT
             COUNT(*) as total,
             COUNT(*) FILTER (WHERE status = 'completed') as successful
           FROM change_requests WHERE requested_by_team_id = $1`,
          [teamId]
        );
        const total = parseInt(result.rows[0]?.total) || 0;
        if (total === 0) return null;
        return (parseInt(result.rows[0]?.successful) / total) * 100;
      }

      case 'communication_score': {
        const result = await this.pool.query(
          `SELECT AVG(response_quality_score) as value
           FROM stakeholder_communications
           WHERE team_id = $1 AND response_quality_score IS NOT NULL`,
          [teamId]
        );
        return result.rows[0]?.value ? parseFloat(result.rows[0].value) : null;
      }

      case 'pir_quality': {
        const result = await this.pool.query(
          `SELECT AVG(quality_score) as value
           FROM post_incident_reviews
           WHERE submitted_by_team_id = $1 AND quality_score IS NOT NULL`,
          [teamId]
        );
        return result.rows[0]?.value ? parseFloat(result.rows[0].value) : null;
      }

      case 'cost_efficiency': {
        const teamResult = await this.pool.query(
          `SELECT score, budget_remaining FROM teams WHERE id = $1`,
          [teamId]
        );
        if (!teamResult.rows[0]) return null;
        const budgetUsed = 100000 - parseFloat(teamResult.rows[0].budget_remaining);
        if (budgetUsed <= 0) return 1.0;
        return teamResult.rows[0].score / budgetUsed;
      }

      default:
        return null;
    }
  }

  /**
   * Get learning progress for a team
   */
  async getLearningProgress(teamId: string, gameId: string): Promise<LearningProgress[]> {
    const result = await this.pool.query(
      `SELECT skill_area, proficiency_level, demonstrated_count, last_demonstrated_at
       FROM learning_progress
       WHERE team_id = $1 AND game_id = $2
       ORDER BY skill_area`,
      [teamId, gameId]
    );

    return result.rows.map((row: any) => ({
      skillArea: row.skill_area,
      proficiencyLevel: row.proficiency_level,
      demonstratedCount: row.demonstrated_count,
      lastDemonstratedAt: row.last_demonstrated_at,
      trend: row.demonstrated_count > 3 ? 'improving' : row.demonstrated_count > 0 ? 'stable' : 'declining'
    }));
  }

  /**
   * Update learning progress for a skill
   */
  async updateLearningProgress(teamId: string, gameId: string, skillArea: string, demonstrated: boolean = true): Promise<void> {
    if (demonstrated) {
      await this.pool.query(
        `INSERT INTO learning_progress (team_id, game_id, skill_area, demonstrated_count, last_demonstrated_at)
         VALUES ($1, $2, $3, 1, CURRENT_TIMESTAMP)
         ON CONFLICT (team_id, game_id, skill_area) DO UPDATE SET
           demonstrated_count = learning_progress.demonstrated_count + 1,
           last_demonstrated_at = CURRENT_TIMESTAMP,
           proficiency_level = LEAST(5, learning_progress.proficiency_level +
             CASE WHEN learning_progress.demonstrated_count >= 5 THEN 1 ELSE 0 END),
           updated_at = CURRENT_TIMESTAMP`,
        [teamId, gameId, skillArea]
      );
    }
  }

  /**
   * Generate a summary report for a game
   */
  async generateGameSummaryReport(gameId: string): Promise<GeneratedReport> {
    // Get game info
    const gameResult = await this.pool.query(
      `SELECT * FROM games WHERE id = $1`,
      [gameId]
    );
    const game = gameResult.rows[0];

    // Get final snapshot or create one
    let snapshot = await this.pool.query(
      `SELECT * FROM game_session_snapshots
       WHERE game_id = $1 AND snapshot_type = 'final'
       ORDER BY created_at DESC LIMIT 1`,
      [gameId]
    );

    if (snapshot.rows.length === 0) {
      await this.captureSnapshot(gameId, 'final');
      snapshot = await this.pool.query(
        `SELECT * FROM game_session_snapshots
         WHERE game_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [gameId]
      );
    }

    // Get team rankings
    const teamsResult = await this.pool.query(
      `SELECT t.*,
              RANK() OVER (ORDER BY t.score DESC) as rank
       FROM teams t WHERE t.game_id = $1
       ORDER BY t.score DESC`,
      [gameId]
    );

    // Calculate metrics for all teams
    const teamMetrics = [];
    for (const team of teamsResult.rows) {
      const metrics = await this.calculateTeamMetrics(team.id, gameId);
      teamMetrics.push(metrics);
    }

    // Build report sections
    const reportData = {
      overview: {
        gameName: game.name,
        scenarioType: game.scenario_type,
        difficulty: game.difficulty_level,
        duration: game.ended_at ?
          Math.round((new Date(game.ended_at).getTime() - new Date(game.started_at).getTime()) / 60000) :
          null,
        totalIncidents: snapshot.rows[0]?.total_incidents || 0,
        resolvedIncidents: snapshot.rows[0]?.resolved_incidents || 0,
        slaBreaches: snapshot.rows[0]?.breached_slas || 0,
        systemHealthFinal: snapshot.rows[0]?.system_health_score || 100
      },
      teamRankings: teamsResult.rows.map((t: any) => ({
        rank: t.rank,
        name: t.name,
        score: t.score,
        role: t.role
      })),
      keyMetrics: teamMetrics,
      highlights: this.identifyHighlights(teamMetrics),
      areasForImprovement: this.identifyImprovementAreas(teamMetrics)
    };

    // Save report
    const reportResult = await this.pool.query(
      `INSERT INTO generated_reports (game_id, title, report_type, report_data, generated_by)
       VALUES ($1, $2, 'summary', $3, 'system')
       RETURNING *`,
      [gameId, `Game Summary - ${game.name}`, JSON.stringify(reportData)]
    );

    return {
      id: reportResult.rows[0].id,
      title: reportResult.rows[0].title,
      reportType: reportResult.rows[0].report_type,
      sections: [reportData],
      generatedAt: reportResult.rows[0].created_at
    };
  }

  /**
   * Get comparison data for multiple teams
   */
  async getTeamComparison(gameId: string): Promise<any> {
    const teamsResult = await this.pool.query(
      `SELECT t.id, t.name, t.score, t.budget_remaining, t.morale_level
       FROM teams t WHERE t.game_id = $1
       ORDER BY t.score DESC`,
      [gameId]
    );

    const comparison = [];
    for (const team of teamsResult.rows) {
      const metrics = await this.calculateTeamMetrics(team.id, gameId);
      const history = await this.getTeamPerformanceHistory(team.id, gameId);
      const learning = await this.getLearningProgress(team.id, gameId);

      comparison.push({
        team: {
          id: team.id,
          name: team.name,
          score: team.score,
          budgetRemaining: team.budget_remaining,
          moraleLevel: team.morale_level
        },
        metrics,
        performanceTrend: history.slice(-10), // Last 10 data points
        learningProgress: learning
      });
    }

    return comparison;
  }

  /**
   * Export analytics data as JSON
   */
  async exportAnalyticsData(gameId: string): Promise<any> {
    const snapshots = await this.getSnapshots(gameId);
    const comparison = await this.getTeamComparison(gameId);
    const report = await this.generateGameSummaryReport(gameId);

    return {
      exportedAt: new Date().toISOString(),
      gameId,
      snapshots,
      teamComparison: comparison,
      summaryReport: report
    };
  }

  private identifyHighlights(teamMetrics: TeamMetricSummary[]): string[] {
    const highlights: string[] = [];

    for (const team of teamMetrics) {
      const aboveBenchmark = team.metrics.filter(m => m.performance === 'above');
      if (aboveBenchmark.length >= 3) {
        highlights.push(`${team.teamName} exceeded benchmarks in ${aboveBenchmark.length} metrics`);
      }

      const slaMetric = team.metrics.find(m => m.name === 'sla_compliance');
      if (slaMetric && slaMetric.value >= 95) {
        highlights.push(`${team.teamName} achieved ${slaMetric.value.toFixed(1)}% SLA compliance`);
      }
    }

    return highlights;
  }

  private identifyImprovementAreas(teamMetrics: TeamMetricSummary[]): string[] {
    const areas: string[] = [];

    for (const team of teamMetrics) {
      const belowBenchmark = team.metrics.filter(m => m.performance === 'below');
      for (const metric of belowBenchmark) {
        areas.push(`${team.teamName}: Improve ${metric.displayName} (current: ${metric.value.toFixed(1)}, target: ${metric.benchmark})`);
      }
    }

    return areas.slice(0, 5); // Top 5 improvement areas
  }

  private mapSnapshot(row: any): GameSnapshot {
    return {
      id: row.id,
      gameId: row.game_id,
      snapshotType: row.snapshot_type,
      roundNumber: row.round_number,
      totalIncidents: row.total_incidents,
      resolvedIncidents: row.resolved_incidents,
      breachedSlas: row.breached_slas,
      totalScore: row.total_score,
      systemHealthScore: parseFloat(row.system_health_score),
      avgResolutionTimeMinutes: row.avg_resolution_time_minutes ? parseFloat(row.avg_resolution_time_minutes) : null,
      totalCostIncurred: parseFloat(row.total_cost_incurred),
      teamData: row.team_data || [],
      serviceData: row.service_data || [],
      createdAt: row.created_at
    };
  }
}
