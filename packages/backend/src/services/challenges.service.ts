import { Pool } from 'pg';
import { AchievementsService } from './achievements.service';
import { computeChallengeWindow, ChallengeWindowType } from '@hawkops/shared';

interface Challenge {
  id: string;
  gameId: string;
  title: string;
  description: string;
  challengeType: string;
  targetValue: number;
  currentValue: number;
  rewardPoints: number;
  rewardBadgeId: string | null;
  status: string;
  startTime: Date;
  endTime: Date | null;
  assignedTeamId: string | null;
  completedByTeamId: string | null;
  progress: number;
}

interface ChallengeTemplate {
  title: string;
  descriptionTemplate: string; // Use {duration} placeholder
  challengeType: string;
  targetValue: number;
  rewardPoints: number;
  windowType: ChallengeWindowType; // 'quick', 'standard', or 'long'
}

// Challenge templates with duration-aware window types
const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  // Speed challenges (quick windows)
  {
    title: 'Speed Run',
    descriptionTemplate: 'Resolve 3 incidents in the next {duration} minutes',
    challengeType: 'speed',
    targetValue: 3,
    rewardPoints: 300,
    windowType: 'quick'
  },
  {
    title: 'Lightning Response',
    descriptionTemplate: 'Respond to 5 incidents within 2 minutes of assignment (complete in {duration} min)',
    challengeType: 'response_time',
    targetValue: 5,
    rewardPoints: 250,
    windowType: 'standard'
  },
  {
    title: 'Marathon Runner',
    descriptionTemplate: 'Maintain zero SLA breaches for the next {duration} minutes',
    challengeType: 'sla_streak',
    targetValue: 60, // Will be scaled to match duration
    rewardPoints: 400,
    windowType: 'standard'
  },

  // Quality challenges (standard to long windows)
  {
    title: 'Quality Control',
    descriptionTemplate: 'Complete 2 PIRs with scores above 75 within {duration} minutes',
    challengeType: 'pir_quality',
    targetValue: 2, // Reduced from 3 for shorter games
    rewardPoints: 350,
    windowType: 'long'
  },
  {
    title: 'Deep Analysis',
    descriptionTemplate: 'Submit a PIR that scores 90 or higher within {duration} minutes',
    challengeType: 'pir_excellence',
    targetValue: 90,
    rewardPoints: 500,
    windowType: 'long'
  },

  // Communication challenges (standard windows)
  {
    title: 'Stakeholder Whisperer',
    descriptionTemplate: 'Respond to 3 stakeholder messages with 80+ satisfaction within {duration} minutes',
    challengeType: 'stakeholder_satisfaction',
    targetValue: 3, // Reduced from 5 for shorter games
    rewardPoints: 400,
    windowType: 'standard'
  },
  {
    title: 'Crisis Communicator',
    descriptionTemplate: 'Handle an executive or media inquiry with 85+ score within {duration} minutes',
    challengeType: 'high_stakes_comm',
    targetValue: 85,
    rewardPoints: 450,
    windowType: 'standard'
  },

  // Efficiency challenges (standard windows)
  {
    title: 'Budget Conscious',
    descriptionTemplate: 'Resolve 2 incidents while keeping costs under $5,000 (complete in {duration} min)',
    challengeType: 'cost_efficiency',
    targetValue: 5000,
    rewardPoints: 350,
    windowType: 'standard'
  },
  {
    title: 'Clean Sweep',
    descriptionTemplate: 'Clear all open incidents assigned to your team within {duration} minutes',
    challengeType: 'clear_queue',
    targetValue: 0,
    rewardPoints: 300,
    windowType: 'quick'
  },

  // Collaboration challenges (quick windows)
  {
    title: 'Team Player',
    descriptionTemplate: 'Successfully hand off 2 incidents to appropriate teams within {duration} minutes',
    challengeType: 'collaboration',
    targetValue: 2,
    rewardPoints: 250,
    windowType: 'quick'
  }
];

export class ChallengesService {
  private pool: Pool;
  private achievementsService: AchievementsService;

  constructor(pool: Pool) {
    this.pool = pool;
    this.achievementsService = new AchievementsService(pool);
  }

  /**
   * Get active challenges for a game
   */
  async getActiveChallenges(gameId: string, teamId?: string): Promise<Challenge[]> {
    let query = `
      SELECT id, game_id as "gameId", title, description, challenge_type as "challengeType",
             target_value as "targetValue", current_value as "currentValue",
             reward_points as "rewardPoints", reward_badge_id as "rewardBadgeId",
             status, start_time as "startTime", end_time as "endTime",
             assigned_team_id as "assignedTeamId", completed_by_team_id as "completedByTeamId"
      FROM team_challenges
      WHERE game_id = $1 AND status = 'active'
    `;
    const params: any[] = [gameId];

    if (teamId) {
      query += ` AND (assigned_team_id IS NULL OR assigned_team_id = $2)`;
      params.push(teamId);
    }

    query += ` ORDER BY start_time DESC`;

    const result = await this.pool.query(query, params);

    return result.rows.map((challenge: any) => ({
      ...challenge,
      progress: challenge.targetValue > 0
        ? Math.min(100, Math.round((challenge.currentValue / challenge.targetValue) * 100))
        : 0
    }));
  }

  /**
   * Get all challenges for a game (including completed)
   */
  async getAllChallenges(gameId: string): Promise<Challenge[]> {
    const result = await this.pool.query(
      `SELECT id, game_id as "gameId", title, description, challenge_type as "challengeType",
              target_value as "targetValue", current_value as "currentValue",
              reward_points as "rewardPoints", reward_badge_id as "rewardBadgeId",
              status, start_time as "startTime", end_time as "endTime",
              assigned_team_id as "assignedTeamId", completed_by_team_id as "completedByTeamId"
       FROM team_challenges
       WHERE game_id = $1
       ORDER BY status = 'active' DESC, start_time DESC`,
      [gameId]
    );

    return result.rows.map((challenge: any) => ({
      ...challenge,
      progress: challenge.targetValue > 0
        ? Math.min(100, Math.round((challenge.currentValue / challenge.targetValue) * 100))
        : 0
    }));
  }

  /**
   * Create a new challenge
   */
  async createChallenge(
    gameId: string,
    title: string,
    description: string,
    challengeType: string,
    targetValue: number,
    rewardPoints: number,
    durationMinutes: number,
    assignedTeamId?: string
  ): Promise<Challenge> {
    const endTime = new Date(Date.now() + durationMinutes * 60 * 1000);

    const result = await this.pool.query(
      `INSERT INTO team_challenges
       (game_id, title, description, challenge_type, target_value, reward_points, end_time, assigned_team_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, game_id as "gameId", title, description, challenge_type as "challengeType",
                 target_value as "targetValue", current_value as "currentValue",
                 reward_points as "rewardPoints", status, start_time as "startTime",
                 end_time as "endTime", assigned_team_id as "assignedTeamId"`,
      [gameId, title, description, challengeType, targetValue, rewardPoints, endTime, assignedTeamId || null]
    );

    return { ...result.rows[0], progress: 0 };
  }

  /**
   * Create a random challenge from templates with duration-aware windows
   */
  async createRandomChallenge(gameId: string, assignedTeamId?: string): Promise<Challenge> {
    // Get game duration and remaining time
    const gameResult = await this.pool.query(
      `SELECT duration_minutes, started_at FROM games WHERE id = $1`,
      [gameId]
    );

    const gameDurationMinutes = gameResult.rows[0]?.duration_minutes || 75;
    const startedAt = gameResult.rows[0]?.started_at;

    // Calculate remaining game time
    let gameRemainingMinutes = gameDurationMinutes;
    if (startedAt) {
      const elapsedMs = Date.now() - new Date(startedAt).getTime();
      const elapsedMinutes = Math.floor(elapsedMs / 60000);
      gameRemainingMinutes = Math.max(5, gameDurationMinutes - elapsedMinutes);
    }

    // Pick a random template
    const template = CHALLENGE_TEMPLATES[Math.floor(Math.random() * CHALLENGE_TEMPLATES.length)];

    // Compute duration-aware challenge window, capped to remaining game time
    const durationMinutes = computeChallengeWindow(
      template.windowType,
      gameDurationMinutes,
      gameRemainingMinutes
    );

    // Generate description with actual duration
    const description = template.descriptionTemplate.replace('{duration}', String(durationMinutes));

    // For sla_streak challenges, adjust target to match duration
    let targetValue = template.targetValue;
    if (template.challengeType === 'sla_streak') {
      targetValue = durationMinutes; // Target is minutes without breach
    }

    return this.createChallenge(
      gameId,
      template.title,
      description,
      template.challengeType,
      targetValue,
      template.rewardPoints,
      durationMinutes,
      assignedTeamId
    );
  }

  /**
   * Update challenge progress
   */
  async updateChallengeProgress(
    challengeId: string,
    currentValue: number
  ): Promise<Challenge | null> {
    const result = await this.pool.query(
      `UPDATE team_challenges
       SET current_value = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, game_id as "gameId", title, target_value as "targetValue",
                 current_value as "currentValue", status`,
      [challengeId, currentValue]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  /**
   * Complete a challenge
   */
  async completeChallenge(challengeId: string, completedByTeamId: string): Promise<void> {
    // Get challenge details
    const challengeResult = await this.pool.query(
      `SELECT game_id, reward_points, reward_badge_id
       FROM team_challenges WHERE id = $1`,
      [challengeId]
    );

    if (challengeResult.rows.length === 0) return;

    const challenge = challengeResult.rows[0];

    // Update challenge status
    await this.pool.query(
      `UPDATE team_challenges
       SET status = 'completed', completed_by_team_id = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [challengeId, completedByTeamId]
    );

    // Award points to the team
    await this.pool.query(
      `UPDATE teams SET score = score + $1 WHERE id = $2`,
      [challenge.reward_points, completedByTeamId]
    );

    // Award badge if one is associated
    if (challenge.reward_badge_id) {
      // Get badge code
      const badgeResult = await this.pool.query(
        `SELECT code FROM achievement_definitions WHERE id = $1`,
        [challenge.reward_badge_id]
      );

      if (badgeResult.rows.length > 0) {
        await this.achievementsService.awardAchievement(
          completedByTeamId,
          challenge.game_id,
          badgeResult.rows[0].code,
          { challengeId }
        );
      }
    }
  }

  /**
   * Check and update challenges based on game events
   */
  async checkChallenges(gameId: string, teamId: string, eventType: string, eventData: any): Promise<void> {
    const activeChallenges = await this.getActiveChallenges(gameId, teamId);

    for (const challenge of activeChallenges) {
      let shouldUpdate = false;
      let newValue = challenge.currentValue;

      switch (challenge.challengeType) {
        case 'speed':
          if (eventType === 'incident_resolved') {
            newValue = challenge.currentValue + 1;
            shouldUpdate = true;
          }
          break;

        case 'response_time':
          if (eventType === 'incident_started' && eventData.responseMinutes <= 2) {
            newValue = challenge.currentValue + 1;
            shouldUpdate = true;
          }
          break;

        case 'pir_quality':
          if (eventType === 'pir_graded' && eventData.score >= 75) {
            newValue = challenge.currentValue + 1;
            shouldUpdate = true;
          }
          break;

        case 'pir_excellence':
          if (eventType === 'pir_graded' && eventData.score >= challenge.targetValue) {
            newValue = challenge.targetValue;
            shouldUpdate = true;
          }
          break;

        case 'stakeholder_satisfaction':
          if (eventType === 'stakeholder_response' && eventData.score >= 80) {
            newValue = challenge.currentValue + 1;
            shouldUpdate = true;
          }
          break;

        case 'high_stakes_comm':
          if (eventType === 'stakeholder_response' &&
              ['executive', 'media'].includes(eventData.stakeholderType) &&
              eventData.score >= challenge.targetValue) {
            newValue = eventData.score;
            shouldUpdate = true;
          }
          break;

        case 'clear_queue':
          if (eventType === 'incident_resolved') {
            // Check if queue is clear
            const queueResult = await this.pool.query(
              `SELECT COUNT(*) as count FROM incidents
               WHERE assigned_team_id = $1 AND game_id = $2
               AND status NOT IN ('resolved', 'closed')`,
              [teamId, gameId]
            );
            if (parseInt(queueResult.rows[0].count) === 0) {
              newValue = 0;
              shouldUpdate = true;
            }
          }
          break;

        case 'collaboration':
          if (eventType === 'incident_transferred') {
            newValue = challenge.currentValue + 1;
            shouldUpdate = true;
          }
          break;
      }

      if (shouldUpdate) {
        await this.updateChallengeProgress(challenge.id, newValue);

        // Check if challenge is completed
        if (this.isChallengeComplete(challenge.challengeType, newValue, challenge.targetValue)) {
          await this.completeChallenge(challenge.id, teamId);
        }
      }
    }
  }

  /**
   * Check if a challenge is complete based on type
   */
  private isChallengeComplete(challengeType: string, currentValue: number, targetValue: number): boolean {
    switch (challengeType) {
      case 'clear_queue':
        return currentValue === 0;
      case 'pir_excellence':
      case 'high_stakes_comm':
        return currentValue >= targetValue;
      default:
        return currentValue >= targetValue;
    }
  }

  /**
   * Expire old challenges
   */
  async expireChallenges(gameId: string): Promise<number> {
    const result = await this.pool.query(
      `UPDATE team_challenges
       SET status = 'expired', updated_at = CURRENT_TIMESTAMP
       WHERE game_id = $1 AND status = 'active' AND end_time < CURRENT_TIMESTAMP
       RETURNING id`,
      [gameId]
    );
    return result.rowCount || 0;
  }

  /**
   * Get challenge completion stats for a team
   */
  async getTeamChallengeStats(teamId: string, gameId: string): Promise<any> {
    const result = await this.pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'completed' AND completed_by_team_id = $1) as completed,
         COUNT(*) FILTER (WHERE status = 'active' AND (assigned_team_id IS NULL OR assigned_team_id = $1)) as active,
         COUNT(*) FILTER (WHERE status = 'expired' AND (assigned_team_id IS NULL OR assigned_team_id = $1)) as expired,
         COALESCE(SUM(reward_points) FILTER (WHERE status = 'completed' AND completed_by_team_id = $1), 0) as total_points
       FROM team_challenges
       WHERE game_id = $2`,
      [teamId, gameId]
    );
    return result.rows[0];
  }
}
