import { Request, Response } from 'express';
import { getPool } from '../config/database';
import { claudeService } from '../services/claudeService';
import logger from '../utils/logger';

export class ImplementationPlanController {
  /**
   * Create a new implementation plan
   * POST /api/teams/:teamId/implementation-plans
   */
  async createPlan(req: Request, res: Response) {
    const { teamId } = req.params;
    const {
      gameId,
      incidentId,
      title,
      description,
      rootCauseAnalysis,
      affectedSystems,
      implementationSteps,
      estimatedEffortHours,
      requiredResources,
      estimatedCost,
      riskLevel,
      mitigationStrategy,
      rollbackPlan,
    } = req.body;

    const pool = getPool();

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Title and description are required',
      });
    }

    try {
      // Generate plan number
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM implementation_plans WHERE game_id = $1::uuid`,
        [gameId]
      );
      const planNumber = `PLAN${String(parseInt(countResult.rows[0].count) + 1).padStart(4, '0')}`;

      const result = await pool.query(
        `INSERT INTO implementation_plans (
          game_id, team_id, incident_id, plan_number, title, description,
          root_cause_analysis, affected_systems, implementation_steps,
          estimated_effort_hours, required_resources, estimated_cost,
          risk_level, mitigation_strategy, rollback_plan, status
        ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'draft')
         RETURNING *`,
        [
          gameId,
          teamId,
          incidentId || null,
          planNumber,
          title,
          description,
          rootCauseAnalysis || null,
          affectedSystems || null,
          JSON.stringify(implementationSteps || []),
          estimatedEffortHours || null,
          requiredResources || null,
          estimatedCost || null,
          riskLevel || 'medium',
          mitigationStrategy || null,
          rollbackPlan || null,
        ]
      );

      return res.status(201).json({
        success: true,
        plan: result.rows[0],
      });
    } catch (error: any) {
      logger.error('Error creating implementation plan:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create implementation plan',
        details: error.message,
      });
    }
  }

  /**
   * Submit plan for AI evaluation
   * POST /api/teams/:teamId/implementation-plans/:planId/submit
   */
  async submitPlan(req: Request, res: Response) {
    const { teamId, planId } = req.params;
    const { playerId } = req.body;
    const pool = getPool();

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get the plan
      const planResult = await client.query(
        `SELECT ip.*, i.title as incident_title, i.description as incident_description,
                i.priority, i.severity, i.ai_context,
                g.scenario_context
         FROM implementation_plans ip
         LEFT JOIN incidents i ON ip.incident_id = i.id
         LEFT JOIN games g ON ip.game_id = g.id
         WHERE ip.id = $1::uuid AND ip.team_id = $2::uuid`,
        [planId, teamId]
      );

      if (planResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Implementation plan not found',
        });
      }

      const plan = planResult.rows[0];

      if (plan.status !== 'draft' && plan.status !== 'ai_needs_revision') {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'Plan cannot be submitted in its current state',
        });
      }

      // Update status to ai_reviewing
      await client.query(
        `UPDATE implementation_plans
         SET status = 'ai_reviewing', submitted_at = NOW(), submitted_by_player_id = $1::uuid
         WHERE id = $2::uuid`,
        [playerId || null, planId]
      );

      // Save revision history
      const revisionCount = await client.query(
        `SELECT COUNT(*) FROM implementation_plan_revisions WHERE plan_id = $1::uuid`,
        [planId]
      );

      await client.query(
        `INSERT INTO implementation_plan_revisions (plan_id, revision_number, plan_snapshot, submitted_by_player_id)
         VALUES ($1::uuid, $2, $3::jsonb, $4::uuid)`,
        [planId, parseInt(revisionCount.rows[0].count) + 1, JSON.stringify(plan), playerId || null]
      );

      await client.query('COMMIT');

      // Perform AI evaluation asynchronously
      this.evaluatePlanWithAI(planId, plan).catch((err) => {
        logger.error('Error in async AI evaluation:', err);
      });

      return res.json({
        success: true,
        message: 'Plan submitted for AI evaluation',
        status: 'ai_reviewing',
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error('Error submitting implementation plan:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to submit implementation plan',
        details: error.message,
      });
    } finally {
      client.release();
    }
  }

  /**
   * Evaluate plan with AI (internal method)
   */
  private async evaluatePlanWithAI(planId: string, plan: any) {
    const pool = getPool();

    try {
      const prompt = `You are an ITSM expert evaluating an implementation plan submitted by a team to resolve an incident.

INCIDENT CONTEXT:
Title: ${plan.incident_title || 'General Problem'}
Description: ${plan.incident_description || 'No specific incident'}
Priority: ${plan.priority || 'medium'}
Severity: ${plan.severity || 'medium'}
${plan.ai_context ? `Teaching Point: ${plan.ai_context.teachingPoint}` : ''}

SCENARIO CONTEXT:
${plan.scenario_context ? JSON.stringify(plan.scenario_context, null, 2) : 'General ITSM scenario'}

SUBMITTED PLAN:
Title: ${plan.title}
Description: ${plan.description}
Root Cause Analysis: ${plan.root_cause_analysis || 'Not provided'}
Affected Systems: ${plan.affected_systems?.join(', ') || 'Not specified'}
Implementation Steps: ${JSON.stringify(plan.implementation_steps || [], null, 2)}
Estimated Effort: ${plan.estimated_effort_hours || 'Not specified'} hours
Risk Level: ${plan.risk_level}
Mitigation Strategy: ${plan.mitigation_strategy || 'Not provided'}
Rollback Plan: ${plan.rollback_plan || 'Not provided'}

Please evaluate this plan and provide:
1. An overall score from 0-100
2. A decision: "approve", "needs_revision", or "reject"
3. Specific feedback on what's good about the plan
4. Specific suggestions for improvement (if any)
5. Any critical issues that must be addressed

Return your evaluation as JSON:
{
  "score": <number>,
  "decision": "<approve|needs_revision|reject>",
  "strengths": ["<strength1>", "<strength2>"],
  "suggestions": ["<suggestion1>", "<suggestion2>"],
  "criticalIssues": ["<issue1>"] or [],
  "overallFeedback": "<summary feedback>"
}`;

      const aiResponse = await claudeService.generateScenarioResponse(prompt, 'plan_evaluation');

      // Parse AI response
      let evaluation;
      try {
        // Try to extract JSON from response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          evaluation = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        // Fallback evaluation
        evaluation = {
          score: 60,
          decision: 'needs_revision',
          strengths: ['Plan was submitted'],
          suggestions: ['Please provide more detailed implementation steps'],
          criticalIssues: [],
          overallFeedback: 'The plan needs more detail to be properly evaluated.',
        };
      }

      // Map decision to status
      let newStatus;
      switch (evaluation.decision) {
        case 'approve':
          newStatus = 'ai_approved';
          break;
        case 'reject':
          newStatus = 'ai_rejected';
          break;
        default:
          newStatus = 'ai_needs_revision';
      }

      // Update plan with evaluation
      await pool.query(
        `UPDATE implementation_plans
         SET status = $1,
             ai_evaluation = $2::jsonb,
             ai_evaluation_score = $3,
             ai_suggestions = $4,
             ai_reviewed_at = NOW()
         WHERE id = $5::uuid`,
        [
          newStatus,
          JSON.stringify(evaluation),
          evaluation.score,
          evaluation.suggestions || [],
          planId,
        ]
      );

      // Update revision with AI feedback
      await pool.query(
        `UPDATE implementation_plan_revisions
         SET ai_feedback = $1, ai_score = $2
         WHERE plan_id = $3::uuid
         ORDER BY revision_number DESC
         LIMIT 1`,
        [evaluation.overallFeedback, evaluation.score, planId]
      );

      logger.info(`Plan ${planId} evaluated: ${newStatus} (score: ${evaluation.score})`);
    } catch (error: any) {
      logger.error('Error evaluating plan with AI:', error);

      // Update plan to show error
      await pool.query(
        `UPDATE implementation_plans
         SET status = 'ai_needs_revision',
             ai_evaluation = $1::jsonb,
             ai_reviewed_at = NOW()
         WHERE id = $2::uuid`,
        [JSON.stringify({ error: 'AI evaluation failed', message: error.message }), planId]
      );
    }
  }

  /**
   * Get implementation plans for a team
   * GET /api/teams/:teamId/implementation-plans
   */
  async getTeamPlans(req: Request, res: Response) {
    const { teamId } = req.params;
    const { gameId } = req.query;
    const pool = getPool();

    try {
      const result = await pool.query(
        `SELECT ip.*, i.title as incident_title, i.incident_number
         FROM implementation_plans ip
         LEFT JOIN incidents i ON ip.incident_id = i.id
         WHERE ip.team_id = $1::uuid
         ${gameId ? 'AND ip.game_id = $2::uuid' : ''}
         ORDER BY ip.created_at DESC`,
        gameId ? [teamId, gameId] : [teamId]
      );

      return res.json({
        success: true,
        plans: result.rows,
      });
    } catch (error: any) {
      logger.error('Error fetching team plans:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch implementation plans',
        details: error.message,
      });
    }
  }

  /**
   * Get a specific implementation plan
   * GET /api/teams/:teamId/implementation-plans/:planId
   */
  async getPlan(req: Request, res: Response) {
    const { teamId, planId } = req.params;
    const pool = getPool();

    try {
      const result = await pool.query(
        `SELECT ip.*, i.title as incident_title, i.incident_number, i.description as incident_description
         FROM implementation_plans ip
         LEFT JOIN incidents i ON ip.incident_id = i.id
         WHERE ip.id = $1::uuid AND ip.team_id = $2::uuid`,
        [planId, teamId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Implementation plan not found',
        });
      }

      // Get revision history
      const revisions = await pool.query(
        `SELECT * FROM implementation_plan_revisions
         WHERE plan_id = $1::uuid
         ORDER BY revision_number DESC`,
        [planId]
      );

      return res.json({
        success: true,
        plan: result.rows[0],
        revisions: revisions.rows,
      });
    } catch (error: any) {
      logger.error('Error fetching implementation plan:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch implementation plan',
        details: error.message,
      });
    }
  }

  /**
   * Update an implementation plan
   * PUT /api/teams/:teamId/implementation-plans/:planId
   */
  async updatePlan(req: Request, res: Response) {
    const { teamId, planId } = req.params;
    const {
      title,
      description,
      rootCauseAnalysis,
      affectedSystems,
      implementationSteps,
      estimatedEffortHours,
      requiredResources,
      estimatedCost,
      riskLevel,
      mitigationStrategy,
      rollbackPlan,
    } = req.body;
    const pool = getPool();

    try {
      // Check current status allows editing
      const checkResult = await pool.query(
        `SELECT status FROM implementation_plans WHERE id = $1::uuid AND team_id = $2::uuid`,
        [planId, teamId]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Implementation plan not found',
        });
      }

      const { status } = checkResult.rows[0];
      if (!['draft', 'ai_needs_revision'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Plan cannot be edited in its current state',
        });
      }

      const result = await pool.query(
        `UPDATE implementation_plans
         SET title = COALESCE($1, title),
             description = COALESCE($2, description),
             root_cause_analysis = COALESCE($3, root_cause_analysis),
             affected_systems = COALESCE($4, affected_systems),
             implementation_steps = COALESCE($5, implementation_steps),
             estimated_effort_hours = COALESCE($6, estimated_effort_hours),
             required_resources = COALESCE($7, required_resources),
             estimated_cost = COALESCE($8, estimated_cost),
             risk_level = COALESCE($9, risk_level),
             mitigation_strategy = COALESCE($10, mitigation_strategy),
             rollback_plan = COALESCE($11, rollback_plan),
             updated_at = NOW()
         WHERE id = $12::uuid AND team_id = $13::uuid
         RETURNING *`,
        [
          title,
          description,
          rootCauseAnalysis,
          affectedSystems,
          implementationSteps ? JSON.stringify(implementationSteps) : null,
          estimatedEffortHours,
          requiredResources,
          estimatedCost,
          riskLevel,
          mitigationStrategy,
          rollbackPlan,
          planId,
          teamId,
        ]
      );

      return res.json({
        success: true,
        plan: result.rows[0],
      });
    } catch (error: any) {
      logger.error('Error updating implementation plan:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update implementation plan',
        details: error.message,
      });
    }
  }

  /**
   * Mark plan as implementing (after AI approval)
   * POST /api/teams/:teamId/implementation-plans/:planId/implement
   */
  async startImplementation(req: Request, res: Response) {
    const { teamId, planId } = req.params;
    const pool = getPool();

    try {
      const result = await pool.query(
        `UPDATE implementation_plans
         SET status = 'implementing'
         WHERE id = $1::uuid AND team_id = $2::uuid AND status = 'ai_approved'
         RETURNING *`,
        [planId, teamId]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Plan must be AI-approved before implementing',
        });
      }

      return res.json({
        success: true,
        plan: result.rows[0],
      });
    } catch (error: any) {
      logger.error('Error starting implementation:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to start implementation',
        details: error.message,
      });
    }
  }

  /**
   * Complete implementation
   * POST /api/teams/:teamId/implementation-plans/:planId/complete
   */
  async completeImplementation(req: Request, res: Response) {
    const { teamId, planId } = req.params;
    const { actualEffortHours, outcomeNotes } = req.body;
    const pool = getPool();

    try {
      const result = await pool.query(
        `UPDATE implementation_plans
         SET status = 'completed',
             completed_at = NOW(),
             actual_effort_hours = $1,
             outcome_notes = $2
         WHERE id = $3::uuid AND team_id = $4::uuid AND status = 'implementing'
         RETURNING *`,
        [actualEffortHours || null, outcomeNotes || null, planId, teamId]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Plan must be in implementing state to complete',
        });
      }

      // If linked to an incident, update incident status
      const plan = result.rows[0];
      if (plan.incident_id) {
        await pool.query(
          `UPDATE incidents
           SET status = 'resolved', resolved_at = NOW(), resolution_notes = $1
           WHERE id = $2::uuid`,
          [`Resolved via implementation plan ${plan.plan_number}`, plan.incident_id]
        );
      }

      return res.json({
        success: true,
        plan: result.rows[0],
        message: 'Implementation completed successfully',
      });
    } catch (error: any) {
      logger.error('Error completing implementation:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to complete implementation',
        details: error.message,
      });
    }
  }
}

export const implementationPlanController = new ImplementationPlanController();
