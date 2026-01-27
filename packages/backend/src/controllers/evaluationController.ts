import { Request, Response } from 'express';
import { getPool } from '../config/database';
import { aiService } from '../services/ai';
import logger from '../utils/logger';

export class EvaluationController {
  /**
   * Generate end-of-game evaluations for all students
   * POST /api/instructor/games/:gameId/evaluate-students
   */
  async generateEvaluations(req: Request, res: Response) {
    const { gameId } = req.params;
    const pool = getPool();

    try {
      // Get game info
      const gameResult = await pool.query(
        'SELECT * FROM games WHERE id = $1',
        [gameId]
      );

      if (gameResult.rows.length === 0) {
        return res.status(404).json({ error: 'Game not found' });
      }

      const game = gameResult.rows[0];

      // Get all players with their student info and team info
      const playersResult = await pool.query(
        `SELECT p.id as player_id, p.name as player_name,
                s.email as student_email, s.first_name, s.last_name,
                t.id as team_id, t.name as team_name, t.role as team_role, t.score as team_score
         FROM players p
         LEFT JOIN students s ON p.student_id = s.id
         JOIN teams t ON p.team_id = t.id
         WHERE p.game_id = $1 AND p.left_at IS NULL AND p.team_id IS NOT NULL
         ORDER BY t.name, p.name`,
        [gameId]
      );

      if (playersResult.rows.length === 0) {
        return res.status(400).json({ error: 'No players found in this game' });
      }

      const evaluations = [];

      for (const player of playersResult.rows) {
        // Gather activity data for this player's team
        const teamId = player.team_id;

        // Get incidents handled by this team
        const incidentsResult = await pool.query(
          `SELECT COUNT(*) as total,
                  COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
                  COUNT(*) FILTER (WHERE status = 'closed') as closed,
                  COUNT(*) FILTER (WHERE sla_breached = true) as sla_breached
           FROM incidents
           WHERE assigned_to_team_id = $1 AND game_id = $2`,
          [teamId, gameId]
        );

        // Get implementation plans submitted
        const plansResult = await pool.query(
          `SELECT COUNT(*) as total,
                  COUNT(*) FILTER (WHERE status = 'ai_approved' OR status = 'completed') as approved,
                  AVG(ai_evaluation_score) as avg_score
           FROM implementation_plans
           WHERE team_id = $1 AND game_id = $2`,
          [teamId, gameId]
        );

        // Get change requests
        const changesResult = await pool.query(
          `SELECT COUNT(*) as total,
                  COUNT(*) FILTER (WHERE status = 'approved' OR status = 'implemented') as approved
           FROM change_requests
           WHERE requested_by_team_id = $1 AND game_id = $2`,
          [teamId, gameId]
        );

        // Get PIR scores
        const pirResult = await pool.query(
          `SELECT COUNT(*) as total,
                  AVG(ai_score) as avg_score
           FROM post_incident_reviews
           WHERE team_id = $1 AND game_id = $2 AND status = 'graded'`,
          [teamId, gameId]
        );

        const incidents = incidentsResult.rows[0];
        const plans = plansResult.rows[0];
        const changes = changesResult.rows[0];
        const pirs = pirResult.rows[0];

        const actionsSummary = {
          incidents: {
            total: parseInt(incidents.total),
            resolved: parseInt(incidents.resolved),
            closed: parseInt(incidents.closed),
            slaBreached: parseInt(incidents.sla_breached),
          },
          implementationPlans: {
            total: parseInt(plans.total),
            approved: parseInt(plans.approved),
            avgScore: plans.avg_score ? parseFloat(plans.avg_score) : null,
          },
          changeRequests: {
            total: parseInt(changes.total),
            approved: parseInt(changes.approved),
          },
          postIncidentReviews: {
            total: parseInt(pirs.total),
            avgScore: pirs.avg_score ? parseFloat(pirs.avg_score) : null,
          },
          teamScore: player.team_score,
        };

        // Generate AI evaluation
        const studentName = player.first_name
          ? `${player.first_name} ${player.last_name}`
          : player.player_name;

        const prompt = `You are evaluating a student's performance in an ITSM (IT Service Management) business simulation game called HawkOps.

GAME: ${game.name}
STUDENT: ${studentName}
TEAM: ${player.team_name} (Role: ${player.team_role})
TEAM SCORE: ${player.team_score} points

TEAM PERFORMANCE DATA:
- Incidents: ${incidents.total} total, ${incidents.resolved} resolved, ${incidents.sla_breached} SLA breaches
- Implementation Plans: ${plans.total} submitted, ${plans.approved} approved${plans.avg_score ? `, avg AI score: ${Math.round(parseFloat(plans.avg_score))}` : ''}
- Change Requests: ${changes.total} submitted, ${changes.approved} approved
- Post-Incident Reviews: ${pirs.total} completed${pirs.avg_score ? `, avg score: ${Math.round(parseFloat(pirs.avg_score))}` : ''}

Based on this data, provide a fair evaluation of the student's contribution as a member of the ${player.team_role} team. Consider:
1. How well did they handle incidents?
2. Quality of their implementation plans
3. Following ITSM processes (change management, PIRs)
4. Overall team coordination

Return a JSON object with this structure:
{
  "score": <0-100>,
  "evaluation": "<2-4 paragraph evaluation of the student's performance>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<area for improvement 1>", "<area for improvement 2>"]
}

Be constructive and educational. The purpose is to help students learn ITSM practices.
Return ONLY the JSON object.`;

        try {
          const aiResponse = await aiService.sendMessageJSON<{
            score: number;
            evaluation: string;
            strengths: string[];
            improvements: string[];
          }>({
            systemPrompt: 'You are an ITSM instructor evaluating student performance. Return valid JSON.',
            userPrompt: prompt,
            temperature: 0.7,
          });

          const evalData = aiResponse.data;

          // Store evaluation
          const evalResult = await pool.query(
            `INSERT INTO student_evaluations
             (game_id, team_id, player_id, student_name, student_email,
              actions_summary, ai_evaluation, ai_score, strengths, improvements)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [
              gameId,
              teamId,
              player.player_id,
              studentName,
              player.student_email || null,
              JSON.stringify(actionsSummary),
              evalData.evaluation,
              evalData.score,
              evalData.strengths,
              evalData.improvements,
            ]
          );

          evaluations.push({
            id: evalResult.rows[0].id,
            studentName,
            studentEmail: player.student_email,
            teamName: player.team_name,
            teamRole: player.team_role,
            score: evalData.score,
            evaluation: evalData.evaluation,
            strengths: evalData.strengths,
            improvements: evalData.improvements,
            actionsSummary,
          });
        } catch (aiError) {
          logger.error(`Error generating evaluation for ${studentName}:`, aiError);
          evaluations.push({
            studentName,
            studentEmail: player.student_email,
            teamName: player.team_name,
            teamRole: player.team_role,
            score: null,
            evaluation: 'Evaluation generation failed. Please try again.',
            strengths: [],
            improvements: [],
            actionsSummary,
            error: true,
          });
        }
      }

      return res.json({
        success: true,
        gameName: game.name,
        evaluations,
      });
    } catch (error) {
      logger.error('Error generating evaluations:', error);
      return res.status(500).json({ error: 'Failed to generate evaluations' });
    }
  }

  /**
   * Get existing evaluations for a game
   * GET /api/instructor/games/:gameId/evaluations
   */
  async getEvaluations(req: Request, res: Response) {
    const { gameId } = req.params;
    const pool = getPool();

    try {
      const result = await pool.query(
        `SELECT se.*, t.name as team_name, t.role as team_role
         FROM student_evaluations se
         JOIN teams t ON se.team_id = t.id
         WHERE se.game_id = $1
         ORDER BY t.name, se.student_name`,
        [gameId]
      );

      return res.json({
        evaluations: result.rows.map((row: any) => ({
          id: row.id,
          studentName: row.student_name,
          studentEmail: row.student_email,
          teamName: row.team_name,
          teamRole: row.team_role,
          score: row.ai_score,
          evaluation: row.ai_evaluation,
          strengths: row.strengths,
          improvements: row.improvements,
          actionsSummary: row.actions_summary,
          createdAt: row.created_at,
        })),
      });
    } catch (error) {
      logger.error('Error fetching evaluations:', error);
      return res.status(500).json({ error: 'Failed to fetch evaluations' });
    }
  }
}

export const evaluationController = new EvaluationController();
