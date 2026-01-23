import { Pool } from 'pg';

interface TeamRanking {
  rank: number;
  teamId: string;
  teamName: string;
  teamRole: string;
  score: number;
  metrics: {
    incidentsResolved: number;
    avgResolutionTime: number;
    slaCompliance: number;
    stakeholderSatisfaction: number;
    pirScore: number;
    achievementCount: number;
    achievementPoints: number;
  };
  trend: 'up' | 'down' | 'stable';
  previousRank: number | null;
}

interface LeaderboardData {
  gameId: string;
  gameName: string;
  currentRound: number;
  rankings: TeamRanking[];
  lastUpdated: Date;
}

export class LeaderboardService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Get the current leaderboard for a game
   */
  async getLeaderboard(gameId: string): Promise<LeaderboardData> {
    // Get game info
    const gameResult = await this.pool.query(
      `SELECT id, name, current_round FROM games WHERE id = $1`,
      [gameId]
    );

    if (gameResult.rows.length === 0) {
      throw new Error('Game not found');
    }

    const game = gameResult.rows[0];

    // Get team rankings with metrics
    const teamsResult = await this.pool.query(
      `SELECT
         t.id,
         t.name,
         t.role,
         t.score,
         t.budget_remaining,
         t.morale_level,
         -- Incidents resolved
         (SELECT COUNT(*) FROM incidents WHERE assigned_team_id = t.id AND game_id = $1 AND status IN ('resolved', 'closed')) as incidents_resolved,
         -- Avg resolution time (minutes)
         (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/60), 0)
          FROM incidents WHERE assigned_team_id = t.id AND game_id = $1 AND status IN ('resolved', 'closed')) as avg_resolution_time,
         -- SLA compliance
         (SELECT CASE
           WHEN COUNT(*) = 0 THEN 100
           ELSE ROUND(
             (COUNT(*) FILTER (WHERE sla_breached = false OR sla_breached IS NULL)::DECIMAL / NULLIF(COUNT(*), 0)) * 100
           )
          END
          FROM incidents WHERE assigned_team_id = t.id AND game_id = $1 AND status IN ('resolved', 'closed')) as sla_compliance,
         -- Stakeholder satisfaction (avg response score)
         (SELECT COALESCE(AVG(ai_response_score), 0)
          FROM stakeholder_communications WHERE assigned_to_team_id = t.id AND game_id = $1 AND status = 'responded') as stakeholder_satisfaction,
         -- PIR score average
         (SELECT COALESCE(AVG(ai_score), 0)
          FROM post_incident_reviews WHERE team_id = t.id AND game_id = $1 AND status = 'graded') as pir_score,
         -- Achievement count and points
         (SELECT COUNT(*) FROM team_achievements WHERE team_id = t.id AND game_id = $1) as achievement_count,
         (SELECT COALESCE(SUM(ad.points), 0)
          FROM team_achievements ta
          JOIN achievement_definitions ad ON ta.achievement_id = ad.id
          WHERE ta.team_id = t.id AND ta.game_id = $1) as achievement_points
       FROM teams t
       WHERE t.game_id = $1
       ORDER BY t.score DESC, t.name ASC`,
      [gameId]
    );

    // Get previous round's rankings for trend calculation
    const previousSnapshot = await this.pool.query(
      `SELECT rankings FROM leaderboard_snapshots
       WHERE game_id = $1 AND round_number = $2 - 1
       ORDER BY snapshot_time DESC LIMIT 1`,
      [gameId, game.current_round]
    );

    const previousRankings: Record<string, number> = {};
    if (previousSnapshot.rows.length > 0 && previousSnapshot.rows[0].rankings) {
      previousSnapshot.rows[0].rankings.forEach((r: any) => {
        previousRankings[r.teamId] = r.rank;
      });
    }

    // Build rankings with trends
    const rankings: TeamRanking[] = teamsResult.rows.map((team: any, index: number) => {
      const rank = index + 1;
      const previousRank = previousRankings[team.id] || null;
      let trend: 'up' | 'down' | 'stable' = 'stable';

      if (previousRank !== null) {
        if (rank < previousRank) trend = 'up';
        else if (rank > previousRank) trend = 'down';
      }

      return {
        rank,
        teamId: team.id,
        teamName: team.name,
        teamRole: team.role,
        score: team.score,
        metrics: {
          incidentsResolved: parseInt(team.incidents_resolved) || 0,
          avgResolutionTime: Math.round(parseFloat(team.avg_resolution_time) || 0),
          slaCompliance: parseInt(team.sla_compliance) || 100,
          stakeholderSatisfaction: Math.round(parseFloat(team.stakeholder_satisfaction) || 0),
          pirScore: Math.round(parseFloat(team.pir_score) || 0),
          achievementCount: parseInt(team.achievement_count) || 0,
          achievementPoints: parseInt(team.achievement_points) || 0
        },
        trend,
        previousRank
      };
    });

    return {
      gameId: game.id,
      gameName: game.name,
      currentRound: game.current_round,
      rankings,
      lastUpdated: new Date()
    };
  }

  /**
   * Save a leaderboard snapshot for historical tracking
   */
  async saveSnapshot(gameId: string): Promise<void> {
    const leaderboard = await this.getLeaderboard(gameId);

    // Get current round
    const gameResult = await this.pool.query(
      `SELECT current_round FROM games WHERE id = $1`,
      [gameId]
    );

    if (gameResult.rows.length === 0) return;

    await this.pool.query(
      `INSERT INTO leaderboard_snapshots (game_id, round_number, rankings)
       VALUES ($1, $2, $3)`,
      [gameId, gameResult.rows[0].current_round, JSON.stringify(leaderboard.rankings)]
    );
  }

  /**
   * Get leaderboard history for a game
   */
  async getLeaderboardHistory(gameId: string): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT round_number, rankings, snapshot_time
       FROM leaderboard_snapshots
       WHERE game_id = $1
       ORDER BY round_number ASC`,
      [gameId]
    );
    return result.rows;
  }

  /**
   * Get a team's ranking details
   */
  async getTeamRanking(teamId: string, gameId: string): Promise<TeamRanking | null> {
    const leaderboard = await this.getLeaderboard(gameId);
    return leaderboard.rankings.find(r => r.teamId === teamId) || null;
  }

  /**
   * Calculate composite score for a team
   * This can be used to award bonus points based on performance
   */
  async calculateCompositeScore(teamId: string, gameId: string): Promise<number> {
    const ranking = await this.getTeamRanking(teamId, gameId);
    if (!ranking) return 0;

    const { metrics } = ranking;

    // Weighted composite score
    const weights = {
      slaCompliance: 0.25,
      avgResolutionTime: 0.20, // Inverse - lower is better
      stakeholderSatisfaction: 0.20,
      pirScore: 0.20,
      achievementPoints: 0.15
    };

    // Normalize resolution time (assuming max 60 minutes, lower is better)
    const normalizedResolutionTime = Math.max(0, 100 - (metrics.avgResolutionTime / 60) * 100);

    const composite =
      (metrics.slaCompliance * weights.slaCompliance) +
      (normalizedResolutionTime * weights.avgResolutionTime) +
      (metrics.stakeholderSatisfaction * weights.stakeholderSatisfaction) +
      (metrics.pirScore * weights.pirScore) +
      (Math.min(100, metrics.achievementPoints / 10) * weights.achievementPoints);

    return Math.round(composite);
  }

  /**
   * Get live activity feed for the leaderboard
   */
  async getActivityFeed(gameId: string, limit: number = 20): Promise<any[]> {
    // Combine recent achievements and incident resolutions
    const result = await this.pool.query(
      `(
        SELECT
          'achievement' as type,
          ta.earned_at as timestamp,
          t.name as "teamName",
          ad.name as title,
          ad.icon as icon,
          ad.points as points,
          ad.rarity as rarity
        FROM team_achievements ta
        JOIN teams t ON ta.team_id = t.id
        JOIN achievement_definitions ad ON ta.achievement_id = ad.id
        WHERE ta.game_id = $1
      )
      UNION ALL
      (
        SELECT
          'resolution' as type,
          i.updated_at as timestamp,
          t.name as "teamName",
          i.title as title,
          CASE i.priority
            WHEN 'critical' THEN '🔴'
            WHEN 'high' THEN '🟠'
            WHEN 'medium' THEN '🟡'
            ELSE '🟢'
          END as icon,
          CASE i.priority
            WHEN 'critical' THEN 100
            WHEN 'high' THEN 75
            WHEN 'medium' THEN 50
            ELSE 25
          END as points,
          i.priority as rarity
        FROM incidents i
        JOIN teams t ON i.assigned_team_id = t.id
        WHERE i.game_id = $1 AND i.status IN ('resolved', 'closed')
      )
      ORDER BY timestamp DESC
      LIMIT $2`,
      [gameId, limit]
    );

    return result.rows;
  }
}
