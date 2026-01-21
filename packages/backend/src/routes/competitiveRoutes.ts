import { Router } from 'express';
import {
  // Achievements
  getAchievementDefinitions,
  getTeamAchievements,
  getAchievementProgress,
  getRecentGameAchievements,
  // Leaderboard
  getLeaderboard,
  getLeaderboardHistory,
  getTeamRanking,
  getActivityFeed,
  saveLeaderboardSnapshot,
  // Challenges
  getActiveChallenges,
  getAllChallenges,
  createChallenge,
  createRandomChallenge,
  getTeamChallengeStats,
  expireChallenges
} from '../controllers/competitiveController';

const router = Router();

// ==================== ACHIEVEMENTS ====================
// Get all achievement definitions
router.get('/achievements/definitions', getAchievementDefinitions);

// Get achievements for a team
router.get('/teams/:teamId/achievements', getTeamAchievements);

// Get achievement progress for a team
router.get('/teams/:teamId/achievements/progress', getAchievementProgress);

// Get recent achievements for a game
router.get('/games/:gameId/achievements/recent', getRecentGameAchievements);

// ==================== LEADERBOARD ====================
// Get leaderboard for a game
router.get('/games/:gameId/leaderboard', getLeaderboard);

// Get leaderboard history
router.get('/games/:gameId/leaderboard/history', getLeaderboardHistory);

// Get activity feed
router.get('/games/:gameId/leaderboard/activity', getActivityFeed);

// Save leaderboard snapshot (instructor)
router.post('/games/:gameId/leaderboard/snapshot', saveLeaderboardSnapshot);

// Get team ranking
router.get('/teams/:teamId/ranking', getTeamRanking);

// ==================== CHALLENGES ====================
// Get active challenges for a game
router.get('/games/:gameId/challenges', getActiveChallenges);

// Get all challenges for a game (including completed)
router.get('/games/:gameId/challenges/all', getAllChallenges);

// Create a new challenge (instructor)
router.post('/games/:gameId/challenges', createChallenge);

// Create a random challenge (instructor)
router.post('/games/:gameId/challenges/random', createRandomChallenge);

// Expire old challenges
router.post('/games/:gameId/challenges/expire', expireChallenges);

// Get team challenge stats
router.get('/teams/:teamId/challenges/stats', getTeamChallengeStats);

export default router;
