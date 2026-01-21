import { Request, Response } from 'express';
import { getPool } from '../config/database';
import { PIRService } from '../services/pir.service';
import logger from '../utils/logger';

export class PIRController {
  /**
   * Get or create PIR for an incident
   * GET /api/teams/:teamId/pir/:incidentId
   */
  async getOrCreatePIR(req: Request, res: Response) {
    const { teamId, incidentId } = req.params;
    const pool = getPool();
    const pirService = new PIRService(pool);

    try {
      // Get game ID from team
      const teamResult = await pool.query('SELECT game_id FROM teams WHERE id = $1', [teamId]);
      if (teamResult.rows.length === 0) {
        return res.status(404).json({ error: 'Team not found' });
      }

      const pir = await pirService.getOrCreatePIR(incidentId, teamId, teamResult.rows[0].game_id);

      // Also get incident details
      const incidentResult = await pool.query(
        `SELECT id, incident_number, title, description, severity, priority, ai_context
         FROM incidents WHERE id = $1`,
        [incidentId]
      );

      return res.json({
        pir,
        incident: incidentResult.rows[0] ? {
          id: incidentResult.rows[0].id,
          incidentNumber: incidentResult.rows[0].incident_number,
          title: incidentResult.rows[0].title,
          description: incidentResult.rows[0].description,
          severity: incidentResult.rows[0].severity,
          priority: incidentResult.rows[0].priority,
          aiContext: incidentResult.rows[0].ai_context,
        } : null,
      });
    } catch (error: any) {
      logger.error('Error getting/creating PIR:', error);
      return res.status(500).json({ error: 'Failed to get PIR', message: error.message });
    }
  }

  /**
   * Save PIR draft
   * PUT /api/pir/:pirId
   */
  async saveDraft(req: Request, res: Response) {
    const { pirId } = req.params;
    const pool = getPool();
    const pirService = new PIRService(pool);

    try {
      const pir = await pirService.saveDraft(pirId, req.body);
      return res.json({ success: true, pir });
    } catch (error: any) {
      logger.error('Error saving PIR draft:', error);
      return res.status(500).json({ error: 'Failed to save PIR', message: error.message });
    }
  }

  /**
   * Submit PIR for grading
   * POST /api/pir/:pirId/submit
   */
  async submitPIR(req: Request, res: Response) {
    const { pirId } = req.params;
    const { playerId } = req.body;
    const pool = getPool();
    const pirService = new PIRService(pool);

    try {
      const pir = await pirService.submitPIR(pirId, playerId);
      return res.json({
        success: true,
        message: 'PIR submitted for grading',
        pir,
      });
    } catch (error: any) {
      logger.error('Error submitting PIR:', error);
      return res.status(400).json({ error: 'Failed to submit PIR', message: error.message });
    }
  }

  /**
   * Get PIR by ID
   * GET /api/pir/:pirId
   */
  async getPIR(req: Request, res: Response) {
    const { pirId } = req.params;
    const pool = getPool();
    const pirService = new PIRService(pool);

    try {
      const pir = await pirService.getPIR(pirId);
      if (!pir) {
        return res.status(404).json({ error: 'PIR not found' });
      }
      return res.json(pir);
    } catch (error: any) {
      logger.error('Error getting PIR:', error);
      return res.status(500).json({ error: 'Failed to get PIR', message: error.message });
    }
  }

  /**
   * Get all PIRs for a team
   * GET /api/teams/:teamId/pirs
   */
  async getTeamPIRs(req: Request, res: Response) {
    const { teamId } = req.params;
    const pool = getPool();
    const pirService = new PIRService(pool);

    try {
      const pirs = await pirService.getTeamPIRs(teamId);
      return res.json({ pirs });
    } catch (error: any) {
      logger.error('Error getting team PIRs:', error);
      return res.status(500).json({ error: 'Failed to get PIRs', message: error.message });
    }
  }

  /**
   * Get incidents requiring PIR
   * GET /api/teams/:teamId/incidents-requiring-pir
   */
  async getIncidentsRequiringPIR(req: Request, res: Response) {
    const { teamId } = req.params;
    const pool = getPool();
    const pirService = new PIRService(pool);

    try {
      const incidents = await pirService.getIncidentsRequiringPIR(teamId);
      return res.json({ incidents });
    } catch (error: any) {
      logger.error('Error getting incidents requiring PIR:', error);
      return res.status(500).json({ error: 'Failed to get incidents', message: error.message });
    }
  }
}

export const pirController = new PIRController();
