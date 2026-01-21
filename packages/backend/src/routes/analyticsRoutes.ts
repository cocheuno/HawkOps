import { Router } from 'express';
import * as analyticsController from '../controllers/analyticsController';

const router = Router();

// Metric definitions
router.get('/metrics/definitions', analyticsController.getMetricDefinitions);

// Game analytics
router.get('/games/:gameId/analytics', analyticsController.getAnalyticsDashboard);
router.get('/games/:gameId/analytics/snapshots', analyticsController.getSnapshots);
router.post('/games/:gameId/analytics/snapshot', analyticsController.captureSnapshot);
router.get('/games/:gameId/analytics/comparison', analyticsController.getTeamComparison);
router.get('/games/:gameId/analytics/report', analyticsController.generateGameReport);
router.get('/games/:gameId/analytics/export', analyticsController.exportAnalytics);

// Team analytics
router.get('/teams/:teamId/games/:gameId/metrics', analyticsController.calculateTeamMetrics);
router.get('/teams/:teamId/games/:gameId/performance-history', analyticsController.getTeamPerformanceHistory);
router.post('/teams/:teamId/performance', analyticsController.recordTeamPerformance);

// Learning progress
router.get('/teams/:teamId/games/:gameId/learning', analyticsController.getLearningProgress);
router.post('/teams/:teamId/games/:gameId/learning', analyticsController.updateLearningProgress);

export default router;
