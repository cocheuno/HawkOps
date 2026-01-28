import { Router, Request, Response } from 'express';
import { verifyStudentToken, ensureOwnTeam } from '../middleware/studentAuth.middleware';
import { getPool } from '../config/database';
import logger from '../utils/logger';

const router = Router();

/**
 * Verify student token and return team info
 * GET /api/student/verify
 */
router.get('/verify', verifyStudentToken, async (req: Request, res: Response): Promise<void> => {
  const pool = getPool();

  try {
    // Get full team and game info
    const result = await pool.query(
      `SELECT
         t.id as team_id,
         t.name as team_name,
         t.role as team_role,
         g.id as game_id,
         g.name as game_name,
         g.status as game_status,
         g.current_round
       FROM teams t
       JOIN games g ON t.game_id = g.id
       WHERE t.id = $1::uuid`,
      [req.student!.teamId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Team not found',
      });
      return;
    }

    const teamInfo = result.rows[0];

    res.json({
      success: true,
      student: {
        id: req.student!.studentId,
        playerId: req.student!.playerId,
        name: req.student!.name,
        email: req.student!.email,
      },
      team: {
        id: teamInfo.team_id,
        name: teamInfo.team_name,
        role: teamInfo.team_role,
      },
      game: {
        id: teamInfo.game_id,
        name: teamInfo.game_name,
        status: teamInfo.game_status,
        currentRound: teamInfo.current_round,
      },
    });
  } catch (error: any) {
    logger.error('Error verifying student:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify student',
    });
  }
});

/**
 * Get student's team dashboard data
 * GET /api/student/team/:teamId/dashboard
 */
router.get(
  '/team/:teamId/dashboard',
  verifyStudentToken,
  ensureOwnTeam,
  async (req: Request, res: Response): Promise<void> => {
    const { teamId } = req.params;
    const pool = getPool();

    try {
      // Get team details with game info
      const teamResult = await pool.query(
        `SELECT t.*, g.name as game_name, g.status as game_status, g.current_round
         FROM teams t
         JOIN games g ON t.game_id = g.id
         WHERE t.id = $1::uuid`,
        [teamId]
      );

      if (teamResult.rows.length === 0) {
        res.status(404).json({ error: 'Team not found' });
        return;
      }

      const team = teamResult.rows[0];

      // Get incidents assigned to this team
      const incidentsResult = await pool.query(
        `SELECT id, incident_number, title, description, priority, severity,
                status, sla_deadline, created_at, updated_at
         FROM incidents
         WHERE assigned_to_team_id = $1::uuid
         ORDER BY
           CASE priority
             WHEN 'critical' THEN 1
             WHEN 'high' THEN 2
             WHEN 'medium' THEN 3
             ELSE 4
           END,
           created_at DESC`,
        [teamId]
      );

      // Get team members (include ready status for lobby view)
      const membersResult = await pool.query(
        `SELECT p.id, p.name, s.email, p.joined_at, p.is_ready
         FROM players p
         LEFT JOIN students s ON p.student_id = s.id
         WHERE p.team_id = $1::uuid AND p.left_at IS NULL
         ORDER BY p.joined_at`,
        [teamId]
      );

      // Get current player's ready status
      const currentPlayerResult = await pool.query(
        `SELECT is_ready FROM players WHERE id = $1::uuid`,
        [req.student!.playerId]
      );
      const isReady = currentPlayerResult.rows[0]?.is_ready ?? false;

      // Get all teams in game (for lobby view)
      const allTeamsResult = await pool.query(
        `SELECT t.id, t.name, t.role,
                (SELECT COUNT(*) FROM players p WHERE p.team_id = t.id AND p.left_at IS NULL) as member_count,
                (SELECT COUNT(*) FROM players p WHERE p.team_id = t.id AND p.left_at IS NULL AND p.is_ready = true) as ready_count
         FROM teams t
         WHERE t.game_id = $1::uuid
         ORDER BY t.created_at`,
        [team.game_id]
      );

      res.json({
        success: true,
        team: {
          id: team.id,
          name: team.name,
          role: team.role,
          score: team.score,
        },
        game: {
          id: team.game_id,
          name: team.game_name,
          status: team.game_status,
          currentRound: team.current_round,
        },
        incidents: incidentsResult.rows.map((row: any) => ({
          id: row.id,
          incidentNumber: row.incident_number,
          title: row.title,
          description: row.description,
          priority: row.priority,
          severity: row.severity,
          status: row.status,
          slaDeadline: row.sla_deadline,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
        members: membersResult.rows.map((m: any) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          joinedAt: m.joined_at,
          isReady: m.is_ready,
        })),
        allTeams: allTeamsResult.rows.map((t: any) => ({
          id: t.id,
          name: t.name,
          role: t.role,
          memberCount: parseInt(t.member_count),
          readyCount: parseInt(t.ready_count),
        })),
        currentStudent: {
          playerId: req.student!.playerId,
          name: req.student!.name,
          isReady,
        },
      });
    } catch (error: any) {
      logger.error('Error fetching student dashboard:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard' });
    }
  }
);

/**
 * Toggle student ready status
 * POST /api/student/team/:teamId/ready
 */
router.post(
  '/team/:teamId/ready',
  verifyStudentToken,
  ensureOwnTeam,
  async (req: Request, res: Response): Promise<void> => {
    const pool = getPool();
    const { isReady } = req.body;
    const playerId = req.student!.playerId;

    try {
      // Toggle or set ready status
      const newReadyState = typeof isReady === 'boolean' ? isReady : true;

      await pool.query(
        `UPDATE players SET is_ready = $1, updated_at = NOW()
         WHERE id = $2::uuid`,
        [newReadyState, playerId]
      );

      // Get updated team ready status
      const teamResult = await pool.query(
        `SELECT
           (SELECT COUNT(*) FROM players WHERE team_id = $1::uuid AND left_at IS NULL) as total,
           (SELECT COUNT(*) FROM players WHERE team_id = $1::uuid AND left_at IS NULL AND is_ready = true) as ready
        `,
        [req.student!.teamId]
      );

      const teamStats = teamResult.rows[0];

      res.json({
        success: true,
        isReady: newReadyState,
        teamReadyCount: parseInt(teamStats.ready),
        teamTotalCount: parseInt(teamStats.total),
      });
    } catch (error: any) {
      logger.error('Error updating ready status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update ready status',
      });
    }
  }
);

export default router;
