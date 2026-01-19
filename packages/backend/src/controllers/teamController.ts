import { Request, Response } from 'express';
import { getPool } from '../config/database';
import logger from '../utils/logger';

/**
 * Team Controller
 * Handles team-specific actions like viewing and managing incidents
 */
export class TeamController {
  /**
   * Get team dashboard data
   * GET /api/teams/:teamId/dashboard
   */
  async getDashboard(req: Request, res: Response) {
    const { teamId } = req.params;
    const pool = getPool();

    try {
      // Get team details
      const teamResult = await pool.query(
        `SELECT t.id, t.name, t.role, t.score, t.budget_remaining, t.morale_level,
                g.id as game_id, g.name as game_name, g.status as game_status,
                g.current_round, g.max_rounds, g.difficulty_level
         FROM teams t
         JOIN games g ON t.game_id = g.id
         WHERE t.id = $1`,
        [teamId]
      );

      if (teamResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Team not found',
        });
      }

      const team = teamResult.rows[0];

      // Get assigned incidents
      const incidentsResult = await pool.query(
        `SELECT id, incident_number, title, description, priority, severity, status,
                created_at, sla_deadline, estimated_cost_per_minute, total_cost,
                ai_generated, ai_context
         FROM incidents
         WHERE game_id = $1 AND assigned_to_team_id = $2
         ORDER BY
           CASE priority
             WHEN 'critical' THEN 1
             WHEN 'high' THEN 2
             WHEN 'medium' THEN 3
             WHEN 'low' THEN 4
           END,
           created_at DESC`,
        [team.game_id, teamId]
      );

      // Calculate active incident count
      const activeCount = incidentsResult.rows.filter(
        (i) => i.status !== 'resolved' && i.status !== 'closed'
      ).length;

      // Get technical debt assigned to this team
      const techDebtResult = await pool.query(
        `SELECT id, description, debt_points, created_at, resolved
         FROM technical_debt_log
         WHERE game_id = $1 AND team_id = $2 AND resolved = false
         ORDER BY created_at DESC`,
        [team.game_id, teamId]
      );

      return res.json({
        success: true,
        team: {
          id: team.id,
          name: team.name,
          role: team.role,
          score: team.score,
          budgetRemaining: team.budget_remaining,
          moraleLevel: team.morale_level,
        },
        game: {
          id: team.game_id,
          name: team.game_name,
          status: team.game_status,
          currentRound: team.current_round,
          maxRounds: team.max_rounds,
          difficultyLevel: team.difficulty_level,
        },
        incidents: incidentsResult.rows.map((i) => ({
          id: i.id,
          incidentNumber: i.incident_number,
          title: i.title,
          description: i.description,
          priority: i.priority,
          severity: i.severity,
          status: i.status,
          createdAt: i.created_at,
          slaDeadline: i.sla_deadline,
          estimatedCostPerMinute: i.estimated_cost_per_minute,
          totalCost: i.total_cost,
          aiGenerated: i.ai_generated,
          aiContext: i.ai_context,
        })),
        activeIncidentCount: activeCount,
        technicalDebt: techDebtResult.rows.map((td) => ({
          id: td.id,
          description: td.description,
          debtPoints: td.debt_points,
          createdAt: td.created_at,
        })),
      });
    } catch (error: any) {
      logger.error('Error fetching team dashboard:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch team dashboard',
        message: error.message,
      });
    }
  }

  /**
   * Update incident status
   * PATCH /api/teams/:teamId/incidents/:incidentId/status
   */
  async updateIncidentStatus(req: Request, res: Response) {
    const { teamId, incidentId } = req.params;
    const { status, notes } = req.body;
    const pool = getPool();

    try {
      // Validate status
      const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        });
      }

      // Verify incident belongs to this team
      const incidentResult = await pool.query(
        `SELECT game_id, assigned_to_team_id, status as current_status
         FROM incidents
         WHERE id = $1`,
        [incidentId]
      );

      if (incidentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Incident not found',
        });
      }

      const incident = incidentResult.rows[0];

      if (incident.assigned_to_team_id !== teamId) {
        return res.status(403).json({
          success: false,
          error: 'This incident is not assigned to your team',
        });
      }

      // Update incident status
      const updateResult = await pool.query(
        `UPDATE incidents
         SET status = $1, updated_at = NOW(),
             resolved_at = CASE WHEN $1 IN ('resolved', 'closed') THEN NOW() ELSE resolved_at END
         WHERE id = $2
         RETURNING *`,
        [status, incidentId]
      );

      // Log game event
      await pool.query(
        `INSERT INTO game_events
         (game_id, event_type, event_category, severity, event_data, actor_type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          incident.game_id,
          'incident_status_changed',
          'incident_management',
          'info',
          JSON.stringify({
            incidentId,
            oldStatus: incident.current_status,
            newStatus: status,
            teamId,
            notes: notes || null,
          }),
          'team',
        ]
      );

      logger.info(`Incident ${incidentId} status updated to ${status} by team ${teamId}`);

      return res.json({
        success: true,
        message: 'Incident status updated successfully',
        incident: updateResult.rows[0],
      });
    } catch (error: any) {
      logger.error('Error updating incident status:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update incident status',
        message: error.message,
      });
    }
  }

  /**
   * Get specific incident details
   * GET /api/teams/:teamId/incidents/:incidentId
   */
  async getIncidentDetails(req: Request, res: Response) {
    const { teamId, incidentId } = req.params;
    const pool = getPool();

    try {
      // Get incident with full details
      const incidentResult = await pool.query(
        `SELECT i.*, t.name as assigned_team_name
         FROM incidents i
         LEFT JOIN teams t ON i.assigned_to_team_id = t.id
         WHERE i.id = $1`,
        [incidentId]
      );

      if (incidentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Incident not found',
        });
      }

      const incident = incidentResult.rows[0];

      // Verify access
      if (incident.assigned_to_team_id !== teamId) {
        return res.status(403).json({
          success: false,
          error: 'This incident is not assigned to your team',
        });
      }

      // Get incident history (game events related to this incident)
      const historyResult = await pool.query(
        `SELECT event_type, event_data, severity, created_at
         FROM game_events
         WHERE game_id = $1
           AND event_data::jsonb @> $2::jsonb
         ORDER BY created_at DESC`,
        [incident.game_id, JSON.stringify({ incidentId })]
      );

      return res.json({
        success: true,
        incident: {
          id: incident.id,
          incidentNumber: incident.incident_number,
          title: incident.title,
          description: incident.description,
          priority: incident.priority,
          severity: incident.severity,
          status: incident.status,
          createdAt: incident.created_at,
          updatedAt: incident.updated_at,
          resolvedAt: incident.resolved_at,
          slaDeadline: incident.sla_deadline,
          estimatedCostPerMinute: incident.estimated_cost_per_minute,
          totalCost: incident.total_cost,
          aiGenerated: incident.ai_generated,
          aiContext: incident.ai_context,
          assignedTeamName: incident.assigned_team_name,
        },
        history: historyResult.rows.map((h) => ({
          eventType: h.event_type,
          eventData: h.event_data,
          severity: h.severity,
          timestamp: h.created_at,
        })),
      });
    } catch (error: any) {
      logger.error('Error fetching incident details:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch incident details',
        message: error.message,
      });
    }
  }
}

export const teamController = new TeamController();
