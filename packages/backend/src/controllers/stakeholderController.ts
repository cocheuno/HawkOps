import { Request, Response } from 'express';
import { getPool } from '../config/database';
import { StakeholderCommService } from '../services/stakeholderComm.service';
import logger from '../utils/logger';

export class StakeholderController {
  /**
   * Generate a stakeholder communication for an incident
   * POST /api/instructor/games/:gameId/stakeholder-comm
   */
  async generateCommunication(req: Request, res: Response) {
    const { gameId } = req.params;
    const { incidentId, stakeholderType } = req.body;
    const pool = getPool();
    const commService = new StakeholderCommService(pool);

    try {
      if (!incidentId) {
        return res.status(400).json({ error: 'incidentId is required' });
      }

      const comm = await commService.generateStakeholderComm(gameId, incidentId, stakeholderType);

      return res.status(201).json({
        success: true,
        message: `Stakeholder communication generated from ${comm.stakeholderName}`,
        communication: comm,
      });
    } catch (error: any) {
      logger.error('Error generating stakeholder communication:', error);
      return res.status(500).json({
        error: 'Failed to generate communication',
        message: error.message,
      });
    }
  }

  /**
   * Get pending communications for a team
   * GET /api/teams/:teamId/communications
   */
  async getTeamCommunications(req: Request, res: Response) {
    const { teamId } = req.params;
    const pool = getPool();
    const commService = new StakeholderCommService(pool);

    try {
      const communications = await commService.getTeamCommunications(teamId);
      return res.json({ communications });
    } catch (error: any) {
      logger.error('Error getting team communications:', error);
      return res.status(500).json({ error: 'Failed to get communications', message: error.message });
    }
  }

  /**
   * Get a single communication
   * GET /api/communications/:commId
   */
  async getCommunication(req: Request, res: Response) {
    const { commId } = req.params;
    const pool = getPool();
    const commService = new StakeholderCommService(pool);

    try {
      const comm = await commService.getCommunication(commId);
      if (!comm) {
        return res.status(404).json({ error: 'Communication not found' });
      }
      return res.json(comm);
    } catch (error: any) {
      logger.error('Error getting communication:', error);
      return res.status(500).json({ error: 'Failed to get communication', message: error.message });
    }
  }

  /**
   * Submit a response to a communication
   * POST /api/communications/:commId/respond
   */
  async submitResponse(req: Request, res: Response) {
    const { commId } = req.params;
    const { responseText, playerId } = req.body;
    const pool = getPool();
    const commService = new StakeholderCommService(pool);

    try {
      if (!responseText || responseText.trim().length === 0) {
        return res.status(400).json({ error: 'Response text is required' });
      }

      const comm = await commService.submitResponse(commId, { responseText, playerId });

      return res.json({
        success: true,
        message: 'Response submitted successfully',
        communication: comm,
      });
    } catch (error: any) {
      logger.error('Error submitting response:', error);
      return res.status(400).json({ error: 'Failed to submit response', message: error.message });
    }
  }

  /**
   * Get all communications for a game (instructor view)
   * GET /api/instructor/games/:gameId/communications
   */
  async getGameCommunications(req: Request, res: Response) {
    const { gameId } = req.params;
    const pool = getPool();
    const commService = new StakeholderCommService(pool);

    try {
      const communications = await commService.getGameCommunications(gameId);
      return res.json({ communications });
    } catch (error: any) {
      logger.error('Error getting game communications:', error);
      return res.status(500).json({ error: 'Failed to get communications', message: error.message });
    }
  }
}

export const stakeholderController = new StakeholderController();
