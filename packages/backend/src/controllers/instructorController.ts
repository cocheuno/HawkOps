import { Request, Response } from 'express';
import { getPool } from '../config/database';
import { AIGameMasterService } from '../services/aiGameMaster.service';
import { SLAService } from '../services/sla.service';
import { ServiceHealthService } from '../services/serviceHealth.service';
import logger from '../utils/logger';

/**
 * Map incident severity to game_events severity constraint
 * Database allows: 'info', 'warning', 'error', 'critical'
 */
function mapSeverityToEventSeverity(severity: string): string {
  const severityMap: Record<string, string> = {
    'low': 'info',
    'medium': 'warning',
    'high': 'error',
    'critical': 'critical',
    'SEV1': 'critical',
    'SEV2': 'error',
    'SEV3': 'warning',
    'SEV4': 'info',
  };

  return severityMap[severity] || 'warning';
}

/**
 * Instructor Controller
 * Handles instructor-specific actions like AI incident injection
 */
export class InstructorController {
  /**
   * Trigger AI to generate and inject an incident
   * POST /api/instructor/games/:gameId/inject-incident
   */
  async injectAIIncident(req: Request, res: Response) {
    const { gameId } = req.params;
    const pool = getPool();
    const aiGM = new AIGameMasterService(pool);

    try {
      logger.info(`Instructor triggering AI incident injection for game ${gameId}`);

      // 1. Verify game exists
      const gameCheck = await pool.query('SELECT id, name, status FROM games WHERE id = $1', [gameId]);

      if (gameCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Game not found' });
      }

      const game = gameCheck.rows[0];

      if (game.status === 'completed') {
        return res.status(400).json({ error: 'Cannot inject incidents into completed game' });
      }

      // 2. Generate incident using AI
      logger.info(`Calling AI Game Master to generate incident...`);
      const generatedIncident = await aiGM.generateIncident(gameId);

      // 3. Calculate SLA deadline
      const slaDeadline = new Date();
      slaDeadline.setMinutes(slaDeadline.getMinutes() + generatedIncident.slaMinutes);

      // 4. Generate incident number
      const incidentCountResult = await pool.query(
        'SELECT COUNT(*) as count FROM incidents WHERE game_id = $1',
        [gameId]
      );
      const incidentNumber = `INC${String(parseInt(incidentCountResult.rows[0].count) + 1).padStart(4, '0')}`;

      // 5. Find the team to assign - use round-robin distribution to ensure fairness
      // IMPORTANT: CAB/Management teams should NOT receive technical incidents
      let assignedToTeamId = null;

      // Get all operational teams (exclude CAB/Management teams from incident assignment)
      const teamsWithCounts = await pool.query(
        `SELECT t.id, t.name, t.role,
                COUNT(i.id) FILTER (WHERE i.status NOT IN ('resolved', 'closed')) as open_incidents
         FROM teams t
         LEFT JOIN incidents i ON i.assigned_to_team_id = t.id AND i.game_id = t.game_id
         WHERE t.game_id = $1
         GROUP BY t.id, t.name, t.role
         ORDER BY open_incidents ASC, t.created_at ASC`,
        [gameId]
      );

      // Filter out CAB/Management teams - they handle change requests, not technical incidents
      const isCABTeam = (team: any) =>
        team.role?.toLowerCase().includes('cab') ||
        team.role?.toLowerCase().includes('management') ||
        team.name?.toLowerCase().includes('cab');

      const operationalTeams = teamsWithCounts.rows.filter((t: any) => !isCABTeam(t));

      if (operationalTeams.length > 0) {
        // If AI suggested a specific team, check if it's appropriate
        if (generatedIncident.assignToTeam) {
          // Don't assign to CAB team even if AI suggests it
          const suggestedTeamName = generatedIncident.assignToTeam.toLowerCase();
          const isCABSuggestion = suggestedTeamName.includes('cab') || suggestedTeamName.includes('management');

          if (!isCABSuggestion) {
            // Try to find the suggested operational team
            const suggestedTeam = operationalTeams.find(
              (t: any) =>
                t.role.toLowerCase().includes(suggestedTeamName) ||
                t.name.toLowerCase().includes(suggestedTeamName)
            );

            if (suggestedTeam) {
              // Check workload fairness
              const minIncidents = parseInt(operationalTeams[0].open_incidents);
              const suggestedIncidents = parseInt(suggestedTeam.open_incidents);

              if (suggestedIncidents <= minIncidents + 2) {
                assignedToTeamId = suggestedTeam.id;
                logger.info(`AI assigned incident to suggested team: ${suggestedTeam.name} (${suggestedTeam.open_incidents} open)`);
              } else {
                assignedToTeamId = operationalTeams[0].id;
                logger.info(`Overriding AI suggestion for fairness. Assigned to: ${operationalTeams[0].name}`);
              }
            } else {
              assignedToTeamId = operationalTeams[0].id;
              logger.info(`Team "${generatedIncident.assignToTeam}" not found, assigned to ${operationalTeams[0].name}`);
            }
          } else {
            // AI incorrectly suggested CAB team - assign to operational team instead
            assignedToTeamId = operationalTeams[0].id;
            logger.info(`AI suggested CAB team but incidents go to operational teams. Assigned to: ${operationalTeams[0].name}`);
          }
        } else {
          // No suggestion from AI, assign to operational team with fewest incidents
          assignedToTeamId = operationalTeams[0].id;
          logger.info(`No team suggestion, assigned to operational team: ${operationalTeams[0].name}`);
        }
      } else if (teamsWithCounts.rows.length > 0) {
        // Fallback: if somehow there are no operational teams, assign to any team
        assignedToTeamId = teamsWithCounts.rows[0].id;
        logger.warn(`No operational teams found, falling back to: ${teamsWithCounts.rows[0].name}`);
      }

      // 6. Insert incident into database
      const incidentResult = await pool.query(
        `INSERT INTO incidents
         (game_id, incident_number, title, description, priority, severity, status,
          sla_deadline, estimated_cost_per_minute, ai_generated, ai_context, assigned_to_team_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          gameId,
          incidentNumber,
          generatedIncident.title,
          generatedIncident.description,
          generatedIncident.priority,
          generatedIncident.severity,
          'open',
          slaDeadline,
          generatedIncident.estimatedCostPerMinute,
          true, // ai_generated
          JSON.stringify({
            affectedService: generatedIncident.affectedService,
            teachingPoint: generatedIncident.teachingPoint,
            aiReasoning: generatedIncident.aiReasoning,
          }),
          assignedToTeamId,
        ]
      );

      const incident = incidentResult.rows[0];

      // 7. Log game event
      await pool.query(
        `INSERT INTO game_events
         (game_id, event_type, event_category, severity, event_data, actor_type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          gameId,
          'ai_incident_injected',
          'ai_action',
          mapSeverityToEventSeverity(generatedIncident.severity),
          JSON.stringify({
            incidentId: incident.id,
            incidentNumber,
            title: generatedIncident.title,
            priority: generatedIncident.priority,
            severity: generatedIncident.severity,
            teachingPoint: generatedIncident.teachingPoint,
          }),
          'ai',
        ]
      );

      logger.info(`AI incident ${incidentNumber} injected successfully: "${generatedIncident.title}"`);

      // 8. Update service statuses based on the new incident
      const serviceHealthService = new ServiceHealthService(pool);
      await serviceHealthService.updateServiceStatuses(gameId);
      logger.info(`Service statuses updated after incident injection`);

      // 9. Return incident details
      return res.status(201).json({
        success: true,
        message: 'AI incident generated and injected successfully',
        incident: {
          id: incident.id,
          incidentNumber,
          title: generatedIncident.title,
          description: generatedIncident.description,
          priority: generatedIncident.priority,
          severity: generatedIncident.severity,
          affectedService: generatedIncident.affectedService,
          slaDeadline,
          estimatedCostPerMinute: generatedIncident.estimatedCostPerMinute,
          aiGenerated: true,
          teachingPoint: generatedIncident.teachingPoint,
          aiReasoning: generatedIncident.aiReasoning,
          assignedToTeam: generatedIncident.assignToTeam,
        },
      });
    } catch (error: any) {
      logger.error('Error injecting AI incident:', error);

      // Log failure event
      await pool.query(
        `INSERT INTO game_events
         (game_id, event_type, event_category, severity, event_data, actor_type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          gameId,
          'ai_incident_injection_failed',
          'ai_action',
          'error',
          JSON.stringify({
            error: error.message,
            stack: error.stack,
          }),
          'ai',
        ]
      );

      return res.status(500).json({
        success: false,
        error: 'Failed to generate AI incident',
        message: error.message,
      });
    }
  }

  /**
   * Get game state for instructor dashboard
   * GET /api/instructor/games/:gameId/state
   */
  async getGameState(req: Request, res: Response) {
    const { gameId } = req.params;
    const pool = getPool();

    try {
      // Get comprehensive game state
      const gameResult = await pool.query(
        `SELECT id, name, status, scenario_type, difficulty_level, current_round, max_rounds,
                ai_personality, started_at, created_at, scenario_generated, scenario_generated_at
         FROM games WHERE id = $1`,
        [gameId]
      );

      if (gameResult.rows.length === 0) {
        return res.status(404).json({ error: 'Game not found' });
      }

      const game = gameResult.rows[0];

      // Get teams
      const teamsResult = await pool.query(
        `SELECT id, name, role, score, budget_remaining, morale_level
         FROM teams WHERE game_id = $1 ORDER BY created_at`,
        [gameId]
      );

      // Get active incidents
      const incidentsResult = await pool.query(
        `SELECT id, incident_number, title, description, priority, severity, status,
                sla_deadline, ai_generated, ai_context, assigned_to_team_id, created_at
         FROM incidents
         WHERE game_id = $1 AND status NOT IN ('closed', 'resolved')
         ORDER BY priority, created_at DESC`,
        [gameId]
      );

      // Get technical debt
      const techDebtResult = await pool.query(
        `SELECT COALESCE(SUM(debt_points), 0) as total_debt
         FROM technical_debt_log
         WHERE game_id = $1 AND resolved = false`,
        [gameId]
      );

      // Get recent AI interactions
      const aiInteractionsResult = await pool.query(
        `SELECT id, agent_type, interaction_type, total_tokens, latency_ms, created_at
         FROM ai_interactions
         WHERE game_id = $1
         ORDER BY created_at DESC
         LIMIT 10`,
        [gameId]
      );

      return res.json({
        game: {
          id: game.id,
          name: game.name,
          status: game.status,
          scenarioType: game.scenario_type,
          difficultyLevel: game.difficulty_level,
          currentRound: game.current_round,
          maxRounds: game.max_rounds,
          aiPersonality: game.ai_personality,
          startedAt: game.started_at,
          createdAt: game.created_at,
          scenarioGenerated: game.scenario_generated || false,
          scenarioGeneratedAt: game.scenario_generated_at,
        },
        teams: teamsResult.rows.map((t: any) => ({
          id: t.id,
          name: t.name,
          role: t.role,
          score: t.score,
          budgetRemaining: parseFloat(t.budget_remaining),
          moraleLevel: t.morale_level,
        })),
        activeIncidents: incidentsResult.rows.map((i: any) => ({
          id: i.id,
          incidentNumber: i.incident_number,
          title: i.title,
          description: i.description,
          priority: i.priority,
          severity: i.severity,
          status: i.status,
          slaDeadline: i.sla_deadline,
          aiGenerated: i.ai_generated,
          aiContext: i.ai_context,
          assignedTeamId: i.assigned_to_team_id,
          createdAt: i.created_at,
        })),
        technicalDebt: parseInt(techDebtResult.rows[0].total_debt),
        recentAIInteractions: aiInteractionsResult.rows.map((ai: any) => ({
          id: ai.id,
          agentType: ai.agent_type,
          interactionType: ai.interaction_type,
          totalTokens: ai.total_tokens,
          latencyMs: ai.latency_ms,
          createdAt: ai.created_at,
        })),
      });
    } catch (error) {
      logger.error('Error fetching game state:', error);
      return res.status(500).json({ error: 'Failed to fetch game state' });
    }
  }

  /**
   * Check and process SLA breaches
   * POST /api/instructor/games/:gameId/check-sla
   */
  async checkSLABreaches(req: Request, res: Response) {
    const { gameId } = req.params;
    const pool = getPool();
    const slaService = new SLAService(pool);

    try {
      const result = await slaService.checkAndProcessBreaches(gameId);

      return res.json({
        success: true,
        message: `Processed ${result.breachedCount} SLA breaches, ${result.escalatedCount} escalations`,
        ...result,
      });
    } catch (error: any) {
      logger.error('Error checking SLA breaches:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to check SLA breaches',
        message: error.message,
      });
    }
  }

  /**
   * Get SLA status summary for a game
   * GET /api/instructor/games/:gameId/sla-status
   */
  async getSLAStatus(req: Request, res: Response) {
    const { gameId } = req.params;
    const pool = getPool();
    const slaService = new SLAService(pool);

    try {
      const status = await slaService.getSLAStatus(gameId);
      const atRiskIncidents = await slaService.getAtRiskIncidents(gameId);

      return res.json({
        success: true,
        status,
        atRiskIncidents,
      });
    } catch (error: any) {
      logger.error('Error getting SLA status:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get SLA status',
        message: error.message,
      });
    }
  }
}

export const instructorController = new InstructorController();
