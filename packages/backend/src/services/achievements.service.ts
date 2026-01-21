import { Pool } from 'pg';

interface AchievementDefinition {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  points: number;
  rarity: string;
  criteria: any;
}

interface TeamAchievement {
  id: string;
  teamId: string;
  achievementId: string;
  gameId: string;
  earnedAt: Date;
  context: any;
  achievement?: AchievementDefinition;
}

export class AchievementsService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Get all achievement definitions
   */
  async getAllDefinitions(): Promise<AchievementDefinition[]> {
    const result = await this.pool.query(
      `SELECT id, code, name, description, category, icon, points, rarity, criteria
       FROM achievement_definitions
       ORDER BY category, points DESC`
    );
    return result.rows;
  }

  /**
   * Get achievements earned by a team in a game
   */
  async getTeamAchievements(teamId: string, gameId: string): Promise<TeamAchievement[]> {
    const result = await this.pool.query(
      `SELECT ta.id, ta.team_id as "teamId", ta.achievement_id as "achievementId",
              ta.game_id as "gameId", ta.earned_at as "earnedAt", ta.context,
              ad.code, ad.name, ad.description, ad.category, ad.icon, ad.points, ad.rarity
       FROM team_achievements ta
       JOIN achievement_definitions ad ON ta.achievement_id = ad.id
       WHERE ta.team_id = $1 AND ta.game_id = $2
       ORDER BY ta.earned_at DESC`,
      [teamId, gameId]
    );
    return result.rows.map((row: any) => ({
      id: row.id,
      teamId: row.teamId,
      achievementId: row.achievementId,
      gameId: row.gameId,
      earnedAt: row.earnedAt,
      context: row.context,
      achievement: {
        id: row.achievementId,
        code: row.code,
        name: row.name,
        description: row.description,
        category: row.category,
        icon: row.icon,
        points: row.points,
        rarity: row.rarity,
        criteria: {}
      }
    }));
  }

  /**
   * Award an achievement to a team
   */
  async awardAchievement(
    teamId: string,
    gameId: string,
    achievementCode: string,
    context?: any
  ): Promise<TeamAchievement | null> {
    // Get the achievement definition
    const defResult = await this.pool.query(
      `SELECT id, code, name, description, category, icon, points, rarity
       FROM achievement_definitions WHERE code = $1`,
      [achievementCode]
    );

    if (defResult.rows.length === 0) {
      console.error(`Achievement definition not found: ${achievementCode}`);
      return null;
    }

    const definition = defResult.rows[0];

    // Check if already awarded
    const existingResult = await this.pool.query(
      `SELECT id FROM team_achievements
       WHERE team_id = $1 AND game_id = $2 AND achievement_id = $3`,
      [teamId, gameId, definition.id]
    );

    if (existingResult.rows.length > 0) {
      return null; // Already awarded
    }

    // Award the achievement
    const result = await this.pool.query(
      `INSERT INTO team_achievements (team_id, game_id, achievement_id, context)
       VALUES ($1, $2, $3, $4)
       RETURNING id, team_id as "teamId", achievement_id as "achievementId",
                 game_id as "gameId", earned_at as "earnedAt", context`,
      [teamId, gameId, definition.id, context ? JSON.stringify(context) : null]
    );

    // Award points to the team
    await this.pool.query(
      `UPDATE teams SET score = score + $1 WHERE id = $2`,
      [definition.points, teamId]
    );

    return {
      ...result.rows[0],
      achievement: definition
    };
  }

  /**
   * Check and award achievements based on incident resolution
   */
  async checkIncidentAchievements(
    teamId: string,
    gameId: string,
    incidentId: string
  ): Promise<TeamAchievement[]> {
    const awarded: TeamAchievement[] = [];

    // Get incident details
    const incidentResult = await this.pool.query(
      `SELECT i.*,
              EXTRACT(EPOCH FROM (i.updated_at - i.created_at))/60 as resolution_minutes,
              EXTRACT(EPOCH FROM (
                (SELECT MIN(created_at) FROM incident_updates
                 WHERE incident_id = i.id AND new_status = 'in_progress') - i.created_at
              ))/60 as response_minutes
       FROM incidents i WHERE i.id = $1`,
      [incidentId]
    );

    if (incidentResult.rows.length === 0) return awarded;
    const incident = incidentResult.rows[0];

    // First Responder - respond within 2 minutes
    if (incident.response_minutes !== null && incident.response_minutes <= 2) {
      const achievement = await this.awardAchievement(teamId, gameId, 'first_responder', {
        incidentId,
        responseTime: incident.response_minutes
      });
      if (achievement) awarded.push(achievement);
    }

    // SLA Champion - check for no SLA breaches
    const noBreachCount = await this.pool.query(
      `SELECT COUNT(*) as count FROM incidents
       WHERE assigned_team_id = $1 AND game_id = $2
       AND status IN ('resolved', 'closed')
       AND (sla_deadline IS NULL OR resolved_at <= sla_deadline)`,
      [teamId, gameId]
    );
    if (parseInt(noBreachCount.rows[0].count) >= 5) {
      const achievement = await this.awardAchievement(teamId, gameId, 'sla_champion', {
        incidentCount: noBreachCount.rows[0].count
      });
      if (achievement) awarded.push(achievement);
    }

    // Speed Demon - 3 fast resolutions
    const fastResolutions = await this.pool.query(
      `SELECT COUNT(*) as count FROM incidents
       WHERE assigned_team_id = $1 AND game_id = $2
       AND status IN ('resolved', 'closed')
       AND EXTRACT(EPOCH FROM (updated_at - created_at))/60 <= 10`,
      [teamId, gameId]
    );
    if (parseInt(fastResolutions.rows[0].count) >= 3) {
      const achievement = await this.awardAchievement(teamId, gameId, 'speed_demon', {
        fastResolutionCount: fastResolutions.rows[0].count
      });
      if (achievement) awarded.push(achievement);
    }

    // Zero Rework - 3 incidents without reopening
    const noReopenCount = await this.pool.query(
      `SELECT COUNT(*) as count FROM incidents i
       WHERE i.assigned_team_id = $1 AND i.game_id = $2
       AND i.status IN ('resolved', 'closed')
       AND NOT EXISTS (
         SELECT 1 FROM incident_updates iu
         WHERE iu.incident_id = i.id
         AND iu.old_status IN ('resolved', 'closed')
         AND iu.new_status = 'open'
       )`,
      [teamId, gameId]
    );
    if (parseInt(noReopenCount.rows[0].count) >= 3) {
      const achievement = await this.awardAchievement(teamId, gameId, 'zero_rework', {
        incidentCount: noReopenCount.rows[0].count
      });
      if (achievement) awarded.push(achievement);
    }

    // Crisis Manager - critical incident without escalation
    if (incident.priority === 'critical' && incident.severity === 'critical') {
      const wasEscalated = await this.pool.query(
        `SELECT COUNT(*) as count FROM incident_updates
         WHERE incident_id = $1 AND notes ILIKE '%escalat%'`,
        [incidentId]
      );
      if (parseInt(wasEscalated.rows[0].count) === 0) {
        const achievement = await this.awardAchievement(teamId, gameId, 'crisis_manager', {
          incidentId,
          priority: incident.priority
        });
        if (achievement) awarded.push(achievement);
      }
    }

    // Calm Under Pressure - handle 3+ concurrent incidents
    const concurrentMax = await this.pool.query(
      `WITH incident_times AS (
         SELECT created_at as start_time,
                COALESCE(
                  (SELECT MIN(created_at) FROM incident_updates
                   WHERE incident_id = incidents.id AND new_status IN ('resolved', 'closed')),
                  NOW()
                ) as end_time
         FROM incidents
         WHERE assigned_team_id = $1 AND game_id = $2
       )
       SELECT MAX(concurrent_count) as max_concurrent FROM (
         SELECT COUNT(*) as concurrent_count
         FROM incident_times t1
         WHERE EXISTS (
           SELECT 1 FROM incident_times t2
           WHERE t2.start_time <= t1.end_time AND t2.end_time >= t1.start_time
         )
         GROUP BY t1.start_time
       ) sub`,
      [teamId, gameId]
    );
    if (concurrentMax.rows[0]?.max_concurrent >= 3) {
      const achievement = await this.awardAchievement(teamId, gameId, 'calm_under_pressure', {
        maxConcurrent: concurrentMax.rows[0].max_concurrent
      });
      if (achievement) awarded.push(achievement);
    }

    return awarded;
  }

  /**
   * Check and award achievements based on PIR submission
   */
  async checkPIRAchievements(
    teamId: string,
    gameId: string,
    pirId: string
  ): Promise<TeamAchievement[]> {
    const awarded: TeamAchievement[] = [];

    // Get PIR details
    const pirResult = await this.pool.query(
      `SELECT * FROM post_incident_reviews WHERE id = $1`,
      [pirId]
    );

    if (pirResult.rows.length === 0) return awarded;
    const pir = pirResult.rows[0];

    // Root Cause Master - score 90+
    if (pir.ai_score >= 90) {
      const achievement = await this.awardAchievement(teamId, gameId, 'root_cause_master', {
        pirId,
        score: pir.ai_score
      });
      if (achievement) awarded.push(achievement);
    }

    // Documentation Hero - 5 complete PIRs
    const completePirs = await this.pool.query(
      `SELECT COUNT(*) as count FROM post_incident_reviews
       WHERE team_id = $1 AND game_id = $2 AND status = 'graded'
       AND what_happened IS NOT NULL AND what_happened != ''
       AND root_cause IS NOT NULL AND root_cause != ''
       AND what_went_well IS NOT NULL AND what_went_well != ''
       AND what_could_improve IS NOT NULL AND what_could_improve != ''
       AND lessons_learned IS NOT NULL AND lessons_learned != ''
       AND jsonb_array_length(action_items) > 0`,
      [teamId, gameId]
    );
    if (parseInt(completePirs.rows[0].count) >= 5) {
      const achievement = await this.awardAchievement(teamId, gameId, 'documentation_hero', {
        completePirCount: completePirs.rows[0].count
      });
      if (achievement) awarded.push(achievement);
    }

    // Improvement Mindset - 10 action items
    const actionItemCount = await this.pool.query(
      `SELECT SUM(jsonb_array_length(action_items)) as total
       FROM post_incident_reviews
       WHERE team_id = $1 AND game_id = $2 AND status = 'graded'`,
      [teamId, gameId]
    );
    if (parseInt(actionItemCount.rows[0]?.total || 0) >= 10) {
      const achievement = await this.awardAchievement(teamId, gameId, 'improvement_mindset', {
        totalActionItems: actionItemCount.rows[0].total
      });
      if (achievement) awarded.push(achievement);
    }

    // Continuous Learner - PIR completion rate 100%
    const resolutionStats = await this.pool.query(
      `SELECT
         (SELECT COUNT(*) FROM incidents WHERE assigned_team_id = $1 AND game_id = $2 AND status IN ('resolved', 'closed')) as resolved,
         (SELECT COUNT(*) FROM post_incident_reviews WHERE team_id = $1 AND game_id = $2 AND status = 'graded') as pirs`,
      [teamId, gameId]
    );
    const resolved = parseInt(resolutionStats.rows[0]?.resolved || 0);
    const pirs = parseInt(resolutionStats.rows[0]?.pirs || 0);
    if (resolved > 0 && pirs >= resolved) {
      const achievement = await this.awardAchievement(teamId, gameId, 'continuous_learner', {
        resolvedCount: resolved,
        pirCount: pirs
      });
      if (achievement) awarded.push(achievement);
    }

    return awarded;
  }

  /**
   * Check stakeholder communication achievements
   */
  async checkCommunicationAchievements(
    teamId: string,
    gameId: string
  ): Promise<TeamAchievement[]> {
    const awarded: TeamAchievement[] = [];

    // Communication Pro - 5 high-score responses
    const highScoreResponses = await this.pool.query(
      `SELECT COUNT(*) as count FROM stakeholder_communications
       WHERE team_id = $1 AND game_id = $2
       AND ai_response_score >= 80 AND status = 'responded'`,
      [teamId, gameId]
    );
    if (parseInt(highScoreResponses.rows[0].count) >= 5) {
      const achievement = await this.awardAchievement(teamId, gameId, 'communication_pro', {
        highScoreCount: highScoreResponses.rows[0].count
      });
      if (achievement) awarded.push(achievement);
    }

    return awarded;
  }

  /**
   * Get achievement progress for a team
   */
  async getAchievementProgress(teamId: string, gameId: string): Promise<any[]> {
    const definitions = await this.getAllDefinitions();
    const earned = await this.getTeamAchievements(teamId, gameId);
    const earnedCodes = new Set(earned.map(a => a.achievement?.code));

    // Calculate progress for each achievement
    const progress = await Promise.all(definitions.map(async (def) => {
      const isEarned = earnedCodes.has(def.code);
      let currentProgress = 0;
      let targetProgress = 1;

      if (!isEarned) {
        // Calculate progress based on criteria
        switch (def.criteria.type) {
          case 'no_sla_breaches':
            targetProgress = def.criteria.count;
            const noBreachResult = await this.pool.query(
              `SELECT COUNT(*) as count FROM incidents
               WHERE assigned_team_id = $1 AND game_id = $2
               AND status IN ('resolved', 'closed')
               AND (sla_deadline IS NULL OR resolved_at <= sla_deadline)`,
              [teamId, gameId]
            );
            currentProgress = parseInt(noBreachResult.rows[0].count);
            break;

          case 'fast_resolutions':
            targetProgress = def.criteria.count;
            const fastResult = await this.pool.query(
              `SELECT COUNT(*) as count FROM incidents
               WHERE assigned_team_id = $1 AND game_id = $2
               AND status IN ('resolved', 'closed')
               AND EXTRACT(EPOCH FROM (updated_at - created_at))/60 <= $3`,
              [teamId, gameId, def.criteria.maxMinutes]
            );
            currentProgress = parseInt(fastResult.rows[0].count);
            break;

          case 'stakeholder_responses':
            targetProgress = def.criteria.count;
            const respResult = await this.pool.query(
              `SELECT COUNT(*) as count FROM stakeholder_communications
               WHERE team_id = $1 AND game_id = $2
               AND ai_response_score >= $3 AND status = 'responded'`,
              [teamId, gameId, def.criteria.minScore]
            );
            currentProgress = parseInt(respResult.rows[0].count);
            break;

          case 'complete_pirs':
            targetProgress = def.criteria.count;
            const pirResult = await this.pool.query(
              `SELECT COUNT(*) as count FROM post_incident_reviews
               WHERE team_id = $1 AND game_id = $2 AND status = 'graded'
               AND what_happened IS NOT NULL AND root_cause IS NOT NULL`,
              [teamId, gameId]
            );
            currentProgress = parseInt(pirResult.rows[0].count);
            break;

          default:
            // For achievements without trackable progress, show 0/1
            break;
        }
      } else {
        currentProgress = targetProgress;
      }

      return {
        ...def,
        earned: isEarned,
        earnedAt: earned.find(a => a.achievement?.code === def.code)?.earnedAt,
        progress: {
          current: Math.min(currentProgress, targetProgress),
          target: targetProgress,
          percentage: Math.min(100, Math.round((currentProgress / targetProgress) * 100))
        }
      };
    }));

    return progress;
  }

  /**
   * Get recent achievements across all teams in a game
   */
  async getRecentGameAchievements(gameId: string, limit: number = 10): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT ta.id, ta.earned_at as "earnedAt", ta.context,
              t.id as "teamId", t.name as "teamName",
              ad.code, ad.name, ad.description, ad.icon, ad.points, ad.rarity
       FROM team_achievements ta
       JOIN teams t ON ta.team_id = t.id
       JOIN achievement_definitions ad ON ta.achievement_id = ad.id
       WHERE ta.game_id = $1
       ORDER BY ta.earned_at DESC
       LIMIT $2`,
      [gameId, limit]
    );
    return result.rows;
  }
}
