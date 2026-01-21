import { Request, Response } from 'express';
import { getPool } from '../config/database';
import { AchievementsService } from '../services/achievements.service';
import { LeaderboardService } from '../services/leaderboard.service';
import { ChallengesService } from '../services/challenges.service';

// ==================== ACHIEVEMENTS ====================

/**
 * Get all achievement definitions
 */
export const getAchievementDefinitions = async (_req: Request, res: Response) => {
  try {
    const pool = getPool();
    const achievementsService = new AchievementsService(pool);
    const definitions = await achievementsService.getAllDefinitions();
    res.json(definitions);
  } catch (error: any) {
    console.error('Error fetching achievement definitions:', error);
    res.status(500).json({ error: 'Failed to fetch achievement definitions' });
  }
};

/**
 * Get achievements earned by a team
 */
export const getTeamAchievements = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const { gameId } = req.query;

    if (!gameId) {
      res.status(400).json({ error: 'gameId query parameter is required' });
      return;
    }

    const pool = getPool();
    const achievementsService = new AchievementsService(pool);
    const achievements = await achievementsService.getTeamAchievements(teamId, gameId as string);
    res.json(achievements);
  } catch (error: any) {
    console.error('Error fetching team achievements:', error);
    res.status(500).json({ error: 'Failed to fetch team achievements' });
  }
};

/**
 * Get achievement progress for a team
 */
export const getAchievementProgress = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const { gameId } = req.query;

    if (!gameId) {
      res.status(400).json({ error: 'gameId query parameter is required' });
      return;
    }

    const pool = getPool();
    const achievementsService = new AchievementsService(pool);
    const progress = await achievementsService.getAchievementProgress(teamId, gameId as string);
    res.json(progress);
  } catch (error: any) {
    console.error('Error fetching achievement progress:', error);
    res.status(500).json({ error: 'Failed to fetch achievement progress' });
  }
};

/**
 * Get recent achievements for a game
 */
export const getRecentGameAchievements = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const pool = getPool();
    const achievementsService = new AchievementsService(pool);
    const achievements = await achievementsService.getRecentGameAchievements(gameId, limit);
    res.json(achievements);
  } catch (error: any) {
    console.error('Error fetching recent achievements:', error);
    res.status(500).json({ error: 'Failed to fetch recent achievements' });
  }
};

// ==================== LEADERBOARD ====================

/**
 * Get the leaderboard for a game
 */
export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const pool = getPool();
    const leaderboardService = new LeaderboardService(pool);
    const leaderboard = await leaderboardService.getLeaderboard(gameId);
    res.json(leaderboard);
  } catch (error: any) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
};

/**
 * Get leaderboard history
 */
export const getLeaderboardHistory = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const pool = getPool();
    const leaderboardService = new LeaderboardService(pool);
    const history = await leaderboardService.getLeaderboardHistory(gameId);
    res.json(history);
  } catch (error: any) {
    console.error('Error fetching leaderboard history:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard history' });
  }
};

/**
 * Get a team's ranking
 */
export const getTeamRanking = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const { gameId } = req.query;

    if (!gameId) {
      res.status(400).json({ error: 'gameId query parameter is required' });
      return;
    }

    const pool = getPool();
    const leaderboardService = new LeaderboardService(pool);
    const ranking = await leaderboardService.getTeamRanking(teamId, gameId as string);
    res.json(ranking);
  } catch (error: any) {
    console.error('Error fetching team ranking:', error);
    res.status(500).json({ error: 'Failed to fetch team ranking' });
  }
};

/**
 * Get activity feed for leaderboard
 */
export const getActivityFeed = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    const pool = getPool();
    const leaderboardService = new LeaderboardService(pool);
    const feed = await leaderboardService.getActivityFeed(gameId, limit);
    res.json(feed);
  } catch (error: any) {
    console.error('Error fetching activity feed:', error);
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
};

/**
 * Save a leaderboard snapshot (instructor action)
 */
export const saveLeaderboardSnapshot = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const pool = getPool();
    const leaderboardService = new LeaderboardService(pool);
    await leaderboardService.saveSnapshot(gameId);
    res.json({ success: true, message: 'Leaderboard snapshot saved' });
  } catch (error: any) {
    console.error('Error saving leaderboard snapshot:', error);
    res.status(500).json({ error: 'Failed to save leaderboard snapshot' });
  }
};

// ==================== CHALLENGES ====================

/**
 * Get active challenges for a game
 */
export const getActiveChallenges = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const { teamId } = req.query;

    const pool = getPool();
    const challengesService = new ChallengesService(pool);
    const challenges = await challengesService.getActiveChallenges(gameId, teamId as string | undefined);
    res.json(challenges);
  } catch (error: any) {
    console.error('Error fetching active challenges:', error);
    res.status(500).json({ error: 'Failed to fetch active challenges' });
  }
};

/**
 * Get all challenges for a game
 */
export const getAllChallenges = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const pool = getPool();
    const challengesService = new ChallengesService(pool);
    const challenges = await challengesService.getAllChallenges(gameId);
    res.json(challenges);
  } catch (error: any) {
    console.error('Error fetching challenges:', error);
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
};

/**
 * Create a new challenge (instructor action)
 */
export const createChallenge = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const { title, description, challengeType, targetValue, rewardPoints, durationMinutes, assignedTeamId } = req.body;

    if (!title || !description || !challengeType || targetValue === undefined || !rewardPoints || !durationMinutes) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const pool = getPool();
    const challengesService = new ChallengesService(pool);
    const challenge = await challengesService.createChallenge(
      gameId,
      title,
      description,
      challengeType,
      targetValue,
      rewardPoints,
      durationMinutes,
      assignedTeamId
    );

    res.status(201).json(challenge);
  } catch (error: any) {
    console.error('Error creating challenge:', error);
    res.status(500).json({ error: 'Failed to create challenge' });
  }
};

/**
 * Create a random challenge (instructor action)
 */
export const createRandomChallenge = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const { assignedTeamId } = req.body;

    const pool = getPool();
    const challengesService = new ChallengesService(pool);
    const challenge = await challengesService.createRandomChallenge(gameId, assignedTeamId);
    res.status(201).json(challenge);
  } catch (error: any) {
    console.error('Error creating random challenge:', error);
    res.status(500).json({ error: 'Failed to create random challenge' });
  }
};

/**
 * Get challenge stats for a team
 */
export const getTeamChallengeStats = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const { gameId } = req.query;

    if (!gameId) {
      res.status(400).json({ error: 'gameId query parameter is required' });
      return;
    }

    const pool = getPool();
    const challengesService = new ChallengesService(pool);
    const stats = await challengesService.getTeamChallengeStats(teamId, gameId as string);
    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching team challenge stats:', error);
    res.status(500).json({ error: 'Failed to fetch team challenge stats' });
  }
};

/**
 * Expire old challenges (system/instructor action)
 */
export const expireChallenges = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const pool = getPool();
    const challengesService = new ChallengesService(pool);
    const expiredCount = await challengesService.expireChallenges(gameId);
    res.json({ success: true, expiredCount });
  } catch (error: any) {
    console.error('Error expiring challenges:', error);
    res.status(500).json({ error: 'Failed to expire challenges' });
  }
};
