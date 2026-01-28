import { Request, Response } from 'express';
import { aiService, AIServiceError } from '../services/ai';
import { getPool } from '../config/database';
import logger from '../utils/logger';

/**
 * Helper to format AI errors for API responses
 */
function formatAIError(error: any): { error: string; userMessage: string; isRetryable: boolean } {
  if (error instanceof AIServiceError) {
    return {
      error: error.message,
      userMessage: error.userMessage,
      isRetryable: error.isRetryable,
    };
  }
  return {
    error: error.message || 'Unknown error',
    userMessage: 'An unexpected error occurred with the AI service. Please try again.',
    isRetryable: false,
  };
}

export class AIController {
  /**
   * Generate 5 scenario options based on selected ITSM domains
   * POST /api/instructor/ai/generate-scenarios
   */
  async generateScenarios(req: Request, res: Response) {
    const { domains, additionalContext, difficultyLevel, estimatedDuration } = req.body;

    if (!domains || !Array.isArray(domains) || domains.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one domain must be selected',
      });
    }

    const pool = getPool();

    try {
      // Generate scenarios using AI
      const scenarios = await aiService.generateScenarios({
        domains,
        additionalContext,
        difficultyLevel: difficultyLevel || 5,
        estimatedDuration: estimatedDuration || 75,
      });

      // Store the generation in the database
      const generationResult = await pool.query(
        `INSERT INTO scenario_generations (selected_domains, additional_context, difficulty_level, estimated_duration_minutes, scenarios_offered, generation_status)
         VALUES ($1::jsonb, $2, $3, $4, $5::jsonb, 'completed')
         RETURNING id`,
        [
          JSON.stringify(domains),
          additionalContext || null,
          difficultyLevel || 5,
          estimatedDuration || 75,
          JSON.stringify(scenarios),
        ]
      );

      const generationId = generationResult.rows[0].id;

      return res.json({
        success: true,
        generationId,
        scenarios,
      });
    } catch (error: any) {
      logger.error('Error generating scenarios:', error);
      const { error: errMsg, userMessage, isRetryable } = formatAIError(error);
      return res.status(error instanceof AIServiceError && error.statusCode === 429 ? 429 : 500).json({
        success: false,
        error: errMsg,
        userMessage,
        isRetryable,
      });
    }
  }

  /**
   * Generate all simulation documents for a selected scenario
   * POST /api/instructor/games/:gameId/ai/generate-documents
   */
  async generateDocuments(req: Request, res: Response) {
    const { gameId } = req.params;
    const { scenario, generationId } = req.body;

    if (!scenario) {
      return res.status(400).json({
        success: false,
        error: 'Scenario is required',
      });
    }

    const pool = getPool();

    try {
      // Get game details
      const gameResult = await pool.query(
        `SELECT id, name, max_rounds FROM games WHERE id = $1::uuid`,
        [gameId]
      );

      if (gameResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Game not found',
        });
      }

      const game = gameResult.rows[0];

      // Get teams for this game
      const teamsResult = await pool.query(
        `SELECT id, name, role FROM teams WHERE game_id = $1::uuid ORDER BY created_at`,
        [gameId]
      );

      const teams = teamsResult.rows;

      if (teams.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No teams found for this game. Please create teams first.',
        });
      }

      // Generate documents using AI
      const aiDocuments = await aiService.generateDocuments({
        scenario,
        gameName: game.name,
        teams: teams.map(t => ({ id: t.id, name: t.name, role: t.role })),
        duration: scenario.estimatedDuration || 75,
        rounds: game.max_rounds || 4,
      });

      // Save generated documents to database
      const savedDocuments = [];
      for (const doc of aiDocuments) {
        // Map team name to team ID if this is a team-specific document
        let teamId = null;
        let visibility = 'all_participants';

        if (doc.documentType === 'instructor_playbook') {
          visibility = 'instructor_only';
        } else if (doc.documentType === 'team_packet' && doc.teamId) {
          // Find team by name
          const team = teams.find(t => t.name === doc.teamId);
          if (team) {
            teamId = team.id;
            visibility = 'team_only';
          }
        }

        const result = await pool.query(
          `INSERT INTO simulation_documents
           (game_id, document_type, title, content, visibility, team_id, status, is_required_reading)
           VALUES ($1::uuid, $2, $3, $4, $5, $6::uuid, 'draft', true)
           RETURNING *`,
          [
            gameId,
            doc.documentType,
            doc.title,
            doc.content,
            visibility,
            teamId,
          ]
        );

        savedDocuments.push(result.rows[0]);
      }

      // Update scenario generation record if generationId provided
      if (generationId) {
        await pool.query(
          `UPDATE scenario_generations
           SET game_id = $1::uuid,
               selected_scenario_id = $2::uuid,
               completed_at = NOW()
           WHERE id = $3::uuid`,
          [gameId, savedDocuments[0]?.id || null, generationId]
        );
      }

      // Save the scenario context to the game for AI incident generation
      // Also mark scenario as generated
      await pool.query(
        `UPDATE games
         SET scenario_context = $1::jsonb,
             scenario_generated = true,
             scenario_generated_at = NOW()
         WHERE id = $2::uuid`,
        [
          JSON.stringify({
            title: scenario.title,
            description: scenario.description,
            learningObjectives: scenario.learningObjectives || [],
            primaryDomain: scenario.primaryDomain,
            secondaryDomains: scenario.secondaryDomains || [],
            keyChallenges: scenario.keyChallenges || [],
            difficulty: scenario.difficulty,
          }),
          gameId,
        ]
      );

      return res.json({
        success: true,
        documentsCreated: savedDocuments.length,
        documents: savedDocuments,
      });
    } catch (error: any) {
      logger.error('Error generating documents:', error);
      const { error: errMsg, userMessage, isRetryable } = formatAIError(error);
      return res.status(error instanceof AIServiceError && error.statusCode === 429 ? 429 : 500).json({
        success: false,
        error: errMsg,
        userMessage,
        isRetryable,
      });
    }
  }

  /**
   * Get generation history
   * GET /api/instructor/ai/generations
   */
  async getGenerations(_req: Request, res: Response) {
    const pool = getPool();

    try {
      const result = await pool.query(
        `SELECT id, selected_domains, additional_context, difficulty_level,
                estimated_duration_minutes, generation_status, created_at
         FROM scenario_generations
         ORDER BY created_at DESC
         LIMIT 50`
      );

      return res.json({
        success: true,
        generations: result.rows,
      });
    } catch (error: any) {
      logger.error('Error fetching generations:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch generations',
      });
    }
  }
}

export const aiController = new AIController();
