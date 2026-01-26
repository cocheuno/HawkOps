import { Pool } from 'pg';
import logger from '../utils/logger';
import { aiService } from './ai';
import { IAIService } from './ai/aiService.interface';

interface PIRSubmission {
  whatHappened: string;
  rootCause: string;
  whatWentWell?: string;
  whatCouldImprove?: string;
  actionItems?: Array<{ description: string; owner?: string; dueDate?: string }>;
  lessonsLearned?: string;
}

interface PIRGrade {
  score: number;
  feedback: {
    whatHappened: { score: number; feedback: string };
    rootCause: { score: number; feedback: string };
    actionItems: { score: number; feedback: string };
    lessonsLearned: { score: number; feedback: string };
    overall: string;
    suggestions: string[];
  };
}

interface PIRData {
  id: string;
  incidentId: string;
  teamId: string;
  whatHappened: string;
  rootCause: string;
  whatWentWell: string | null;
  whatCouldImprove: string | null;
  actionItems: any[];
  lessonsLearned: string | null;
  aiScore: number | null;
  aiFeedback: any | null;
  status: string;
  createdAt: string;
  submittedAt: string | null;
}

/**
 * Post-Incident Review Service
 * Handles PIR creation, submission, and AI grading
 */
export class PIRService {
  private pool: Pool;
  private ai: IAIService;

  constructor(pool: Pool) {
    this.pool = pool;
    this.ai = aiService;
  }

  /**
   * Create or get draft PIR for an incident
   */
  async getOrCreatePIR(incidentId: string, teamId: string, gameId: string): Promise<PIRData> {
    // Check if PIR already exists
    const existing = await this.pool.query(
      `SELECT * FROM post_incident_reviews
       WHERE incident_id = $1 AND team_id = $2`,
      [incidentId, teamId]
    );

    if (existing.rows.length > 0) {
      return this.mapPIRRow(existing.rows[0]);
    }

    // Create new draft PIR
    const result = await this.pool.query(
      `INSERT INTO post_incident_reviews
       (game_id, incident_id, team_id, what_happened, root_cause, status)
       VALUES ($1, $2, $3, '', '', 'draft')
       RETURNING *`,
      [gameId, incidentId, teamId]
    );

    return this.mapPIRRow(result.rows[0]);
  }

  /**
   * Save PIR draft
   */
  async saveDraft(pirId: string, submission: PIRSubmission): Promise<PIRData> {
    const result = await this.pool.query(
      `UPDATE post_incident_reviews
       SET what_happened = $1,
           root_cause = $2,
           what_went_well = $3,
           what_could_improve = $4,
           action_items = $5,
           lessons_learned = $6,
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        submission.whatHappened,
        submission.rootCause,
        submission.whatWentWell || null,
        submission.whatCouldImprove || null,
        JSON.stringify(submission.actionItems || []),
        submission.lessonsLearned || null,
        pirId,
      ]
    );

    return this.mapPIRRow(result.rows[0]);
  }

  /**
   * Submit PIR for grading
   */
  async submitPIR(pirId: string, playerId?: string): Promise<PIRData> {
    // Get the PIR and incident details
    const pirResult = await this.pool.query(
      `SELECT pir.*, i.title as incident_title, i.description as incident_description,
              i.ai_context, i.severity, i.priority
       FROM post_incident_reviews pir
       JOIN incidents i ON pir.incident_id = i.id
       WHERE pir.id = $1`,
      [pirId]
    );

    if (pirResult.rows.length === 0) {
      throw new Error('PIR not found');
    }

    const pir = pirResult.rows[0];

    // Validate required fields
    if (!pir.what_happened || !pir.root_cause) {
      throw new Error('What happened and root cause are required');
    }

    // Update status to submitted
    await this.pool.query(
      `UPDATE post_incident_reviews
       SET status = 'submitted',
           submitted_at = NOW(),
           submitted_by_player_id = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [playerId || null, pirId]
    );

    // Grade with AI (async, don't wait)
    this.gradeWithAI(pirId, pir).catch((error) => {
      logger.error('Error grading PIR with AI:', error);
    });

    // Get updated PIR
    const updatedResult = await this.pool.query(
      'SELECT * FROM post_incident_reviews WHERE id = $1',
      [pirId]
    );

    return this.mapPIRRow(updatedResult.rows[0]);
  }

  /**
   * Grade PIR with AI
   */
  private async gradeWithAI(pirId: string, pir: any): Promise<void> {
    try {
      const prompt = `You are an ITSM instructor grading a Post-Incident Review (PIR) submitted by a student team.

INCIDENT CONTEXT:
Title: ${pir.incident_title}
Description: ${pir.incident_description}
Severity: ${pir.severity}
Priority: ${pir.priority}
${pir.ai_context?.teachingPoint ? `Teaching Point: ${pir.ai_context.teachingPoint}` : ''}

STUDENT'S PIR SUBMISSION:

What Happened:
${pir.what_happened}

Root Cause Analysis:
${pir.root_cause}

What Went Well:
${pir.what_went_well || 'Not provided'}

What Could Improve:
${pir.what_could_improve || 'Not provided'}

Action Items:
${JSON.stringify(pir.action_items || [], null, 2)}

Lessons Learned:
${pir.lessons_learned || 'Not provided'}

GRADING CRITERIA:
1. What Happened (25 points): Clear, factual timeline of events
2. Root Cause (35 points): Demonstrates understanding of underlying cause, not just symptoms
3. Action Items (20 points): Specific, actionable, with clear ownership
4. Lessons Learned (20 points): Shows reflection and learning transfer

Grade this PIR and return a JSON object with this exact structure:
{
  "score": <overall score 0-100>,
  "feedback": {
    "whatHappened": { "score": <0-25>, "feedback": "<specific feedback>" },
    "rootCause": { "score": <0-35>, "feedback": "<specific feedback>" },
    "actionItems": { "score": <0-20>, "feedback": "<specific feedback>" },
    "lessonsLearned": { "score": <0-20>, "feedback": "<specific feedback>" },
    "overall": "<2-3 sentence overall assessment>",
    "suggestions": ["<suggestion 1>", "<suggestion 2>", "<suggestion 3>"]
  }
}

Be constructive but honest. Focus on helping students learn ITSM best practices.
Return ONLY the JSON object, no other text.`;

      const response = await this.ai.sendMessageJSON<PIRGrade>({
        systemPrompt: 'You are an ITSM instructor grading student submissions. Always return valid JSON.',
        userPrompt: prompt,
        temperature: 0.7,
      });
      const grade = response.data;

      // Update PIR with grade
      await this.pool.query(
        `UPDATE post_incident_reviews
         SET ai_score = $1,
             ai_feedback = $2,
             ai_graded_at = NOW(),
             status = 'graded',
             updated_at = NOW()
         WHERE id = $3`,
        [grade.score, JSON.stringify(grade.feedback), pirId]
      );

      // Update incident to mark PIR as completed
      await this.pool.query(
        `UPDATE incidents SET pir_completed = true WHERE id = $1`,
        [pir.incident_id]
      );

      // Award points to team based on score
      const pointsAwarded = Math.round(grade.score / 10); // 0-10 points
      await this.pool.query(
        `UPDATE teams SET score = score + $1 WHERE id = $2`,
        [pointsAwarded, pir.team_id]
      );

      // Log event
      await this.pool.query(
        `INSERT INTO game_events
         (game_id, event_type, event_category, severity, event_data, actor_type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          pir.game_id,
          'pir_graded',
          'learning',
          'info',
          JSON.stringify({
            pirId,
            incidentId: pir.incident_id,
            teamId: pir.team_id,
            score: grade.score,
            pointsAwarded,
          }),
          'ai',
        ]
      );

      logger.info(`PIR ${pirId} graded: score ${grade.score}, ${pointsAwarded} points awarded`);
    } catch (error) {
      logger.error('Error in AI grading:', error);
      throw error;
    }
  }

  /**
   * Get PIR by ID
   */
  async getPIR(pirId: string): Promise<PIRData | null> {
    const result = await this.pool.query(
      'SELECT * FROM post_incident_reviews WHERE id = $1',
      [pirId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapPIRRow(result.rows[0]);
  }

  /**
   * Get PIRs for a team
   */
  async getTeamPIRs(teamId: string): Promise<PIRData[]> {
    const result = await this.pool.query(
      `SELECT pir.*, i.title as incident_title, i.incident_number
       FROM post_incident_reviews pir
       JOIN incidents i ON pir.incident_id = i.id
       WHERE pir.team_id = $1
       ORDER BY pir.created_at DESC`,
      [teamId]
    );

    return result.rows.map((row) => ({
      ...this.mapPIRRow(row),
      incidentTitle: row.incident_title,
      incidentNumber: row.incident_number,
    }));
  }

  /**
   * Get incidents requiring PIR for a team
   */
  async getIncidentsRequiringPIR(teamId: string): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT i.id, i.incident_number, i.title, i.severity, i.resolved_at,
              pir.id as pir_id, pir.status as pir_status
       FROM incidents i
       LEFT JOIN post_incident_reviews pir ON i.id = pir.incident_id AND pir.team_id = $1
       WHERE i.assigned_to_team_id = $1
         AND i.status IN ('resolved', 'closed')
         AND i.requires_pir = true
         AND (pir.id IS NULL OR pir.status = 'draft')
       ORDER BY i.resolved_at DESC`,
      [teamId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      incidentNumber: row.incident_number,
      title: row.title,
      severity: row.severity,
      resolvedAt: row.resolved_at,
      pirId: row.pir_id,
      pirStatus: row.pir_status,
    }));
  }

  /**
   * Map database row to PIRData
   */
  private mapPIRRow(row: any): PIRData {
    return {
      id: row.id,
      incidentId: row.incident_id,
      teamId: row.team_id,
      whatHappened: row.what_happened,
      rootCause: row.root_cause,
      whatWentWell: row.what_went_well,
      whatCouldImprove: row.what_could_improve,
      actionItems: row.action_items || [],
      lessonsLearned: row.lessons_learned,
      aiScore: row.ai_score,
      aiFeedback: row.ai_feedback,
      status: row.status,
      createdAt: row.created_at,
      submittedAt: row.submitted_at,
    };
  }
}
