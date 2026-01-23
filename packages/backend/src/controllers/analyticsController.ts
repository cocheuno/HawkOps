import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { getPool } from '../config/database';

/**
 * Capture a game snapshot
 */
export const captureSnapshot = async (req: Request, res: Response) => {
  const { gameId } = req.params;
  const { snapshotType } = req.body;

  try {
    const pool = getPool();
    const analyticsService = new AnalyticsService(pool);
    const snapshot = await analyticsService.captureSnapshot(
      gameId,
      snapshotType || 'periodic'
    );
    res.json(snapshot);
  } catch (error) {
    console.error('Error capturing snapshot:', error);
    res.status(500).json({ error: 'Failed to capture snapshot' });
  }
};

/**
 * Get game snapshots
 */
export const getSnapshots = async (req: Request, res: Response) => {
  const { gameId } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;

  try {
    const pool = getPool();
    const analyticsService = new AnalyticsService(pool);
    const snapshots = await analyticsService.getSnapshots(gameId, limit);
    res.json(snapshots);
  } catch (error) {
    console.error('Error fetching snapshots:', error);
    res.status(500).json({ error: 'Failed to fetch snapshots' });
  }
};

/**
 * Record team performance
 */
export const recordTeamPerformance = async (req: Request, res: Response) => {
  const { teamId } = req.params;
  const { gameId } = req.body;

  try {
    const pool = getPool();
    const analyticsService = new AnalyticsService(pool);
    await analyticsService.recordTeamPerformance(teamId, gameId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error recording team performance:', error);
    res.status(500).json({ error: 'Failed to record team performance' });
  }
};

/**
 * Get team performance history
 */
export const getTeamPerformanceHistory = async (req: Request, res: Response) => {
  const { teamId, gameId } = req.params;

  try {
    const pool = getPool();
    const analyticsService = new AnalyticsService(pool);
    const history = await analyticsService.getTeamPerformanceHistory(teamId, gameId);
    res.json(history);
  } catch (error) {
    console.error('Error fetching performance history:', error);
    res.status(500).json({ error: 'Failed to fetch performance history' });
  }
};

/**
 * Get metric definitions
 */
export const getMetricDefinitions = async (_req: Request, res: Response) => {
  try {
    const pool = getPool();
    const analyticsService = new AnalyticsService(pool);
    const metrics = await analyticsService.getMetricDefinitions();
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching metric definitions:', error);
    res.status(500).json({ error: 'Failed to fetch metric definitions' });
  }
};

/**
 * Calculate team metrics
 */
export const calculateTeamMetrics = async (req: Request, res: Response) => {
  const { teamId, gameId } = req.params;

  try {
    const pool = getPool();
    const analyticsService = new AnalyticsService(pool);
    const metrics = await analyticsService.calculateTeamMetrics(teamId, gameId);
    res.json(metrics);
  } catch (error) {
    console.error('Error calculating team metrics:', error);
    res.status(500).json({ error: 'Failed to calculate team metrics' });
  }
};

/**
 * Get learning progress for a team
 */
export const getLearningProgress = async (req: Request, res: Response) => {
  const { teamId, gameId } = req.params;

  try {
    const pool = getPool();
    const analyticsService = new AnalyticsService(pool);
    const progress = await analyticsService.getLearningProgress(teamId, gameId);
    res.json(progress);
  } catch (error) {
    console.error('Error fetching learning progress:', error);
    res.status(500).json({ error: 'Failed to fetch learning progress' });
  }
};

/**
 * Update learning progress
 */
export const updateLearningProgress = async (req: Request, res: Response) => {
  const { teamId, gameId } = req.params;
  const { skillArea, demonstrated } = req.body;

  try {
    const pool = getPool();
    const analyticsService = new AnalyticsService(pool);
    await analyticsService.updateLearningProgress(teamId, gameId, skillArea, demonstrated);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating learning progress:', error);
    res.status(500).json({ error: 'Failed to update learning progress' });
  }
};

/**
 * Generate game summary report
 */
export const generateGameReport = async (req: Request, res: Response) => {
  const { gameId } = req.params;

  try {
    const pool = getPool();
    const analyticsService = new AnalyticsService(pool);
    const report = await analyticsService.generateGameSummaryReport(gameId);
    res.json(report);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};

/**
 * Get team comparison data
 */
export const getTeamComparison = async (req: Request, res: Response) => {
  const { gameId } = req.params;

  try {
    const pool = getPool();
    const analyticsService = new AnalyticsService(pool);
    const comparison = await analyticsService.getTeamComparison(gameId);
    res.json(comparison);
  } catch (error) {
    console.error('Error fetching team comparison:', error);
    res.status(500).json({ error: 'Failed to fetch team comparison' });
  }
};

/**
 * Export analytics data
 */
export const exportAnalytics = async (req: Request, res: Response) => {
  const { gameId } = req.params;

  try {
    const pool = getPool();
    const analyticsService = new AnalyticsService(pool);
    const data = await analyticsService.exportAnalyticsData(gameId);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="analytics-${gameId}.json"`);
    res.json(data);
  } catch (error) {
    console.error('Error exporting analytics:', error);
    res.status(500).json({ error: 'Failed to export analytics' });
  }
};

/**
 * Get analytics dashboard data (aggregated)
 */
export const getAnalyticsDashboard = async (req: Request, res: Response) => {
  const { gameId } = req.params;

  try {
    const pool = getPool();
    const analyticsService = new AnalyticsService(pool);

    // Get recent snapshots for trends
    const snapshots = await analyticsService.getSnapshots(gameId, 20);

    // Get team comparison
    let teamComparison = [];
    try {
      teamComparison = await analyticsService.getTeamComparison(gameId);
    } catch (e) {
      console.error('Error getting team comparison:', e);
    }

    // Get latest snapshot metrics or create a default state from current game data
    let latestSnapshot: any = snapshots[0] || null;

    // If no snapshots exist, generate current state from game data
    if (!latestSnapshot) {
      const gameDataResult = await pool.query(
        `SELECT
           COALESCE(SUM(t.score), 0) as total_score,
           COUNT(DISTINCT i.id) FILTER (WHERE i.status NOT IN ('resolved', 'closed')) as total_incidents,
           COUNT(DISTINCT i.id) FILTER (WHERE i.status IN ('resolved', 'closed')) as resolved_incidents,
           COUNT(DISTINCT i.id) FILTER (WHERE i.sla_breached = TRUE) as breached_slas
         FROM games g
         LEFT JOIN teams t ON t.game_id = g.id
         LEFT JOIN incidents i ON i.game_id = g.id
         WHERE g.id = $1
         GROUP BY g.id`,
        [gameId]
      );

      if (gameDataResult.rows.length > 0) {
        const gd = gameDataResult.rows[0];
        latestSnapshot = {
          totalScore: parseInt(gd.total_score) || 0,
          systemHealthScore: 100, // Default health
          totalIncidents: parseInt(gd.total_incidents) || 0,
          resolvedIncidents: parseInt(gd.resolved_incidents) || 0,
          breachedSlas: parseInt(gd.breached_slas) || 0,
          avgResolutionTimeMinutes: null,
          totalCostIncurred: 0
        };
      }
    }

    // Calculate trends from snapshots
    const trends = {
      incidentResolutionTrend: calculateTrend(snapshots.map(s => s.resolvedIncidents)),
      systemHealthTrend: calculateTrend(snapshots.map(s => s.systemHealthScore)),
      scoreTrend: calculateTrend(snapshots.map(s => s.totalScore))
    };

    res.json({
      currentState: latestSnapshot,
      trends,
      teamComparison,
      snapshotHistory: snapshots.slice(0, 10)
    });
  } catch (error) {
    console.error('Error fetching analytics dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch analytics dashboard' });
  }
};

// Helper function to calculate trend direction
function calculateTrend(values: number[]): 'up' | 'down' | 'stable' {
  if (values.length < 2) return 'stable';

  const recent = values.slice(0, 3);
  const older = values.slice(3, 6);

  if (recent.length === 0 || older.length === 0) return 'stable';

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

  const diff = ((recentAvg - olderAvg) / Math.max(olderAvg, 1)) * 100;

  if (diff > 5) return 'up';
  if (diff < -5) return 'down';
  return 'stable';
}
