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
      const prompt = `You are a supportive ITSM instructor evaluating an implementation plan submitted by students learning IT Service Management. Your goal is to help them learn and improve, not to be overly critical.

CONTEXT: This is an educational ITSM simulation. Students are learning how to create implementation plans for IT incidents. Be encouraging while providing constructive feedback.

INCIDENT BEING ADDRESSED:
- Title: ${plan.incident_title || 'General IT Problem'}
- Description: ${plan.incident_description || 'No specific incident description'}
- Priority: ${plan.priority || 'medium'}
- Severity: ${plan.severity || 'medium'}
${plan.ai_context?.teachingPoint ? `- Learning Objective: ${plan.ai_context.teachingPoint}` : ''}

STUDENT'S SUBMITTED PLAN:
- Title: ${plan.title}
- Description: ${plan.description}
- Root Cause Analysis: ${plan.root_cause_analysis || 'Not provided'}
- Implementation Steps: ${JSON.stringify(plan.implementation_steps || [], null, 2)}
- Estimated Effort: ${plan.estimated_effort_hours || 'Not specified'} hours
- Risk Level: ${plan.risk_level || 'medium'}
- Mitigation Strategy: ${plan.mitigation_strategy || 'Not provided'}
- Rollback Plan: ${plan.rollback_plan || 'Not provided'}

SCORING GUIDELINES (be fair and educational):
- 70-100: Plan is well-structured with clear steps, addresses the incident, has risk mitigation. Approve.
- 50-69: Plan has good elements but needs some improvements. Approve with suggestions.
- 30-49: Plan has potential but is missing key elements. Needs revision.
- 0-29: Plan is too vague or doesn't address the incident. Needs significant revision.

KEY EVALUATION CRITERIA:
1. Does the plan clearly describe WHAT will be done? (even simple steps count)
2. Does it have a logical sequence of steps?
3. Is there some consideration of risks?
4. Is there a basic rollback/recovery approach?

IMPORTANT INSTRUCTIONS:
- Be CONSTRUCTIVE and SPECIFIC in your feedback
- If something is missing, explain exactly what they should add
- If steps are vague, give an example of how to make them clearer
- Acknowledge what they did well before suggesting improvements
- For educational purposes, a reasonable attempt should score at least 50-60
- Only score below 50 if the plan is truly incomplete or off-topic

Provide your evaluation as JSON:
{
  "score": <number 0-100>,
  "decision": "<approve|needs_revision|reject>",
  "strengths": ["<specific thing done well>", "<another strength>"],
  "suggestions": ["<specific actionable suggestion>", "<another suggestion>"],
  "criticalIssues": ["<only truly critical problems>"] or [],
  "overallFeedback": "<2-3 sentence summary with encouragement and clear next steps>"
}

Remember: Your feedback will be shown directly to students to help them improve. Be helpful and specific!`;

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
        logger.warn('Failed to parse AI evaluation response, using fallback:', parseError);
        // Fallback evaluation with helpful feedback
        evaluation = {
          score: 55,
          decision: 'needs_revision',
          strengths: ['You submitted a plan - good start!', 'The plan shows understanding of the problem'],
          suggestions: [
            'Add more specific implementation steps (e.g., "1. Check server logs for errors", "2. Restart the affected service")',
            'Include a rollback plan in case something goes wrong',
            'Specify who will perform each step and estimated timing'
          ],
          criticalIssues: [],
          overallFeedback: 'Your plan is a good starting point! To improve, try adding more specific, actionable steps and consider what you would do if the fix doesn\'t work. Keep going - you\'re on the right track!',
        };
      }

      // Ensure score is reasonable (between 0 and 100)
      evaluation.score = Math.max(0, Math.min(100, evaluation.score || 50));

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

      // Update plan with helpful error feedback
      const errorEvaluation = {
        score: 50,
        decision: 'needs_revision',
        strengths: ['Plan was submitted'],
        suggestions: ['Please try submitting again or add more details to your plan'],
        criticalIssues: [],
        overallFeedback: 'We had trouble evaluating your plan automatically. Please review your plan and try submitting again. Make sure you have clear implementation steps and a description of what you plan to do.',
        error: error.message
      };

      await pool.query(
        `UPDATE implementation_plans
         SET status = 'ai_needs_revision',
             ai_evaluation = $1::jsonb,
             ai_evaluation_score = 50,
             ai_reviewed_at = NOW()
         WHERE id = $2::uuid`,
        [JSON.stringify(errorEvaluation), planId]
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

  /**
   * Create a Change Request from an approved implementation plan
   * POST /api/teams/:teamId/implementation-plans/:planId/create-change-request
   */
  async createChangeRequest(req: Request, res: Response) {
    const { teamId, planId } = req.params;
    const { gameId } = req.body;
    const pool = getPool();

    try {
      // Get the implementation plan
      const planResult = await pool.query(
        `SELECT ip.*, i.title as incident_title, i.incident_number
         FROM implementation_plans ip
         LEFT JOIN incidents i ON ip.incident_id = i.id
         WHERE ip.id = $1::uuid AND ip.team_id = $2::uuid`,
        [planId, teamId]
      );

      if (planResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Implementation plan not found',
        });
      }

      const plan = planResult.rows[0];

      // Check score requirement (must be >= 50)
      const score = plan.ai_evaluation?.score || 0;
      if (score < 50) {
        return res.status(400).json({
          success: false,
          error: `Plans with scores under 50 cannot be converted to Change Requests. Current score: ${score}/100. Please revise your plan.`,
        });
      }

      // Check status allows conversion
      if (!['ai_approved', 'ai_needs_revision'].includes(plan.status)) {
        return res.status(400).json({
          success: false,
          error: 'Plan must be AI reviewed before creating a Change Request',
        });
      }

      // Generate change number
      const changeCountResult = await pool.query(
        'SELECT COUNT(*) as count FROM change_requests WHERE game_id = $1::uuid',
        [gameId]
      );
      const changeNumber = `CHG${String(parseInt(changeCountResult.rows[0].count) + 1).padStart(4, '0')}`;

      // Determine risk level mapping
      const riskMap: Record<string, string> = {
        low: 'low',
        medium: 'medium',
        high: 'high',
        critical: 'critical',
      };
      const riskLevel = riskMap[plan.risk_level] || 'medium';

      // Find CAB team for this game
      const cabResult = await pool.query(
        `SELECT id FROM teams WHERE game_id = $1::uuid AND role = 'Management/CAB' LIMIT 1`,
        [gameId]
      );
      const cabTeamId = cabResult.rows.length > 0 ? cabResult.rows[0].id : null;

      // Create change request from the plan
      const crResult = await pool.query(
        `INSERT INTO change_requests
         (game_id, change_number, title, description, change_type, risk_level,
          affected_services, requested_by_team_id, status, implementation_plan,
          rollback_plan, cab_team_id, workflow_state, implementation_time_minutes,
          related_plan_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10, $11, 'pending_cab', $12, $13)
         RETURNING *`,
        [
          gameId,
          changeNumber,
          `Change Request: ${plan.title}`,
          `${plan.description}\n\nRoot Cause Analysis: ${plan.root_cause_analysis || 'See implementation plan'}\n\nBased on Implementation Plan: ${plan.plan_number}${plan.incident_number ? ` (Incident ${plan.incident_number})` : ''}`,
          'normal',
          riskLevel,
          plan.affected_systems || [],
          teamId,
          Array.isArray(plan.implementation_steps)
            ? plan.implementation_steps.map((s: any) => typeof s === 'string' ? s : s.description).join('\n')
            : plan.implementation_steps || '',
          plan.rollback_plan || 'Revert to previous state',
          cabTeamId,
          (plan.estimated_effort_hours || 1) * 60,
          planId,
        ]
      );

      // Update the plan to link it to the change request
      await pool.query(
        `UPDATE implementation_plans
         SET related_change_request_id = $1, status = 'change_requested'
         WHERE id = $2::uuid`,
        [crResult.rows[0].id, planId]
      );

      // Log game event
      await pool.query(
        `INSERT INTO game_events
         (game_id, event_type, event_category, severity, event_data, actor_type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          gameId,
          'change_request_created',
          'change_management',
          'info',
          JSON.stringify({
            changeId: crResult.rows[0].id,
            changeNumber,
            fromPlan: plan.plan_number,
            teamId,
          }),
          'team',
        ]
      );

      return res.status(201).json({
        success: true,
        message: 'Change Request created and sent to CAB for review',
        changeRequest: {
          id: crResult.rows[0].id,
          changeNumber,
          title: crResult.rows[0].title,
          status: crResult.rows[0].status,
          workflowState: crResult.rows[0].workflow_state,
        },
      });
    } catch (error: any) {
      logger.error('Error creating change request from plan:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create change request',
        details: error.message,
      });
    }
  }
}

export const implementationPlanController = new ImplementationPlanController();
