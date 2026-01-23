import { Router, Request, Response } from 'express';
import { verifyStudentToken, ensureOwnTeam } from '../middleware/studentAuth.middleware';
import { getPool } from '../database/pool';
import logger from '../utils/logger';

const router = Router();

/**
 * Verify student token and return team info
 * GET /api/student/verify
 */
router.get('/verify', verifyStudentToken, async (req: Request, res: Response) => {
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
      return res.status(404).json({
        success: false,
        error: 'Team not found',
      });
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
  async (req: Request, res: Response) => {
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
        return res.status(404).json({ error: 'Team not found' });
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

      // Get team members
      const membersResult = await pool.query(
        `SELECT p.id, p.name, s.email, p.joined_at
         FROM players p
         LEFT JOIN students s ON p.student_id = s.id
         WHERE p.team_id = $1::uuid AND p.left_at IS NULL
         ORDER BY p.joined_at`,
        [teamId]
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
        incidents: incidentsResult.rows.map(row => ({
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
        members: membersResult.rows,
        currentStudent: {
          playerId: req.student!.playerId,
          name: req.student!.name,
        },
      });
    } catch (error: any) {
      logger.error('Error fetching student dashboard:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard' });
    }
  }
);

export default router;
