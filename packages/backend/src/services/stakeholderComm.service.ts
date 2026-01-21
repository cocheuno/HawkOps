import { Pool } from 'pg';
import logger from '../utils/logger';
import { ClaudeService } from './claude.service';

interface StakeholderProfile {
  type: 'executive' | 'customer' | 'media' | 'regulator' | 'vendor';
  name: string;
  title: string;
  avatar?: string;
}

interface StakeholderMessage {
  id: string;
  gameId: string;
  incidentId: string | null;
  stakeholderType: string;
  stakeholderName: string;
  stakeholderTitle: string;
  stakeholderAvatar: string | null;
  message: string;
  urgency: string;
  sentiment: string;
  requiresResponse: boolean;
  responseDeadline: string | null;
  assignedToTeamId: string | null;
  responseText: string | null;
  respondedAt: string | null;
  aiResponseScore: number | null;
  aiResponseFeedback: any | null;
  status: string;
  createdAt: string;
}

interface ResponseSubmission {
  responseText: string;
  playerId?: string;
}

const STAKEHOLDER_PROFILES: Record<string, StakeholderProfile[]> = {
  executive: [
    { type: 'executive', name: 'Sarah Chen', title: 'Chief Executive Officer' },
    { type: 'executive', name: 'Michael Thompson', title: 'Chief Financial Officer' },
    { type: 'executive', name: 'Jennifer Walsh', title: 'Chief Operating Officer' },
    { type: 'executive', name: 'David Park', title: 'VP of Engineering' },
  ],
  customer: [
    { type: 'customer', name: 'Enterprise Solutions Inc.', title: 'Key Account (Tier 1)' },
    { type: 'customer', name: 'Regional Healthcare Network', title: 'Healthcare Partner' },
    { type: 'customer', name: 'Global Retail Corp', title: 'Retail Client' },
    { type: 'customer', name: 'TechStart Innovations', title: 'SMB Customer' },
  ],
  media: [
    { type: 'media', name: 'Alex Rivera', title: 'Tech Reporter, TechNews Daily' },
    { type: 'media', name: 'Emily Foster', title: 'Cybersecurity Correspondent, InfoSec Times' },
    { type: 'media', name: 'Jordan Blake', title: 'Industry Analyst, Market Watch' },
  ],
  regulator: [
    { type: 'regulator', name: 'Compliance Office', title: 'Data Protection Authority' },
    { type: 'regulator', name: 'Industry Standards Board', title: 'Regulatory Body' },
    { type: 'regulator', name: 'Financial Services Authority', title: 'FSA Compliance Team' },
  ],
  vendor: [
    { type: 'vendor', name: 'CloudHost Services', title: 'Infrastructure Provider' },
    { type: 'vendor', name: 'SecureNet Partners', title: 'Security Vendor' },
    { type: 'vendor', name: 'DataFlow Systems', title: 'Integration Partner' },
  ],
};

/**
 * Stakeholder Communications Service
 * Manages stakeholder inquiries and team responses
 */
export class StakeholderCommService {
  private pool: Pool;
  private claudeService: ClaudeService;

  constructor(pool: Pool) {
    this.pool = pool;
    this.claudeService = new ClaudeService();
  }

  /**
   * Generate a stakeholder communication based on an incident
   */
  async generateStakeholderComm(
    gameId: string,
    incidentId: string,
    stakeholderType?: string
  ): Promise<StakeholderMessage> {
    // Get incident details
    const incidentResult = await this.pool.query(
      `SELECT i.*, g.scenario_type, g.scenario_context
       FROM incidents i
       JOIN games g ON i.game_id = g.id
       WHERE i.id = $1`,
      [incidentId]
    );

    if (incidentResult.rows.length === 0) {
      throw new Error('Incident not found');
    }

    const incident = incidentResult.rows[0];

    // Select stakeholder type based on incident severity/context
    const selectedType = stakeholderType || this.selectStakeholderType(incident);
    const profiles = STAKEHOLDER_PROFILES[selectedType] || STAKEHOLDER_PROFILES.customer;
    const profile = profiles[Math.floor(Math.random() * profiles.length)];

    // Generate message with AI
    const message = await this.generateMessage(incident, profile);

    // Calculate response deadline based on urgency
    const deadline = this.calculateDeadline(message.urgency);

    // Determine which team should handle this
    const assignedTeamId = await this.determineAssignedTeam(gameId, selectedType);

    // Insert into database
    const result = await this.pool.query(
      `INSERT INTO stakeholder_communications
       (game_id, incident_id, stakeholder_type, stakeholder_name, stakeholder_title,
        message, urgency, sentiment, requires_response, response_deadline,
        assigned_to_team_id, ai_generated, ai_context, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        gameId,
        incidentId,
        profile.type,
        profile.name,
        profile.title,
        message.text,
        message.urgency,
        message.sentiment,
        true,
        deadline,
        assignedTeamId,
        true,
        JSON.stringify({
          incidentTitle: incident.title,
          incidentSeverity: incident.severity,
          generatedFor: profile.type,
        }),
        'pending',
      ]
    );

    // Log event
    await this.pool.query(
      `INSERT INTO game_events
       (game_id, event_type, event_category, severity, event_data, actor_type)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        gameId,
        'stakeholder_inquiry',
        'communication',
        message.urgency === 'critical' ? 'critical' : message.urgency === 'high' ? 'warning' : 'info',
        JSON.stringify({
          stakeholderType: profile.type,
          stakeholderName: profile.name,
          incidentId,
          urgency: message.urgency,
        }),
        'ai',
      ]
    );

    logger.info(`Stakeholder communication generated: ${profile.name} (${profile.type}) for incident ${incident.incident_number}`);

    return this.mapCommRow(result.rows[0]);
  }

  /**
   * Generate message content with AI
   */
  private async generateMessage(
    incident: any,
    profile: StakeholderProfile
  ): Promise<{ text: string; urgency: string; sentiment: string }> {
    const prompt = `You are simulating a ${profile.type} stakeholder named "${profile.name}" (${profile.title}) who is reaching out about an IT incident.

INCIDENT DETAILS:
Title: ${incident.title}
Description: ${incident.description}
Severity: ${incident.severity}
Priority: ${incident.priority}
Status: ${incident.status}
Scenario: ${incident.scenario_context?.title || incident.scenario_type}

STAKEHOLDER PERSONALITY:
- ${profile.type === 'executive' ? 'Focused on business impact, costs, and reputation' : ''}
- ${profile.type === 'customer' ? 'Concerned about service availability and their own business operations' : ''}
- ${profile.type === 'media' ? 'Seeking information for a story, asking probing questions' : ''}
- ${profile.type === 'regulator' ? 'Focused on compliance, data protection, and proper procedures' : ''}
- ${profile.type === 'vendor' ? 'Concerned about partnership, technical details, and responsibilities' : ''}

Generate a realistic message from this stakeholder. The message should:
1. Be appropriate for the incident severity
2. Reflect the stakeholder's perspective and concerns
3. Require a thoughtful response from the IT team
4. Be 2-4 sentences long

Return a JSON object:
{
  "text": "<the stakeholder's message>",
  "urgency": "<low|normal|high|critical>",
  "sentiment": "<angry|concerned|neutral|supportive>"
}

Return ONLY the JSON object.`;

    try {
      const response = await this.claudeService.sendMessageJSON<{ text: string; urgency: string; sentiment: string }>({
        systemPrompt: 'You are simulating a stakeholder in an IT incident management simulation. Always return valid JSON.',
        userPrompt: prompt,
        temperature: 0.8,
      });
      return response.data;
    } catch (error) {
      logger.error('Error generating stakeholder message:', error);
      // Fallback message
      return {
        text: `I need an update on the current ${incident.severity} incident affecting our services. Please provide a status update and expected resolution timeline.`,
        urgency: incident.severity === 'critical' ? 'critical' : incident.severity === 'high' ? 'high' : 'normal',
        sentiment: incident.severity === 'critical' ? 'concerned' : 'neutral',
      };
    }
  }

  /**
   * Select stakeholder type based on incident
   */
  private selectStakeholderType(incident: any): string {
    const severity = incident.severity;
    const random = Math.random();

    if (severity === 'critical') {
      // Critical incidents attract executive and media attention
      if (random < 0.4) return 'executive';
      if (random < 0.7) return 'customer';
      if (random < 0.9) return 'media';
      return 'regulator';
    } else if (severity === 'high') {
      if (random < 0.3) return 'executive';
      if (random < 0.7) return 'customer';
      return 'vendor';
    } else {
      // Lower severity typically from customers/vendors
      if (random < 0.6) return 'customer';
      if (random < 0.9) return 'vendor';
      return 'executive';
    }
  }

  /**
   * Calculate response deadline based on urgency
   */
  private calculateDeadline(urgency: string): Date {
    const now = new Date();
    switch (urgency) {
      case 'critical':
        return new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
      case 'high':
        return new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes
      case 'normal':
        return new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
      default:
        return new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours
    }
  }

  /**
   * Determine which team should handle the communication
   */
  private async determineAssignedTeam(gameId: string, stakeholderType: string): Promise<string | null> {
    // Executives and media go to Management
    // Customers and vendors go to Service Desk
    // Regulators go to Management
    const targetRole = ['executive', 'media', 'regulator'].includes(stakeholderType)
      ? 'Management'
      : 'Service Desk';

    const result = await this.pool.query(
      `SELECT id FROM teams
       WHERE game_id = $1 AND (role ILIKE $2 OR name ILIKE $2)
       LIMIT 1`,
      [gameId, `%${targetRole}%`]
    );

    return result.rows.length > 0 ? result.rows[0].id : null;
  }

  /**
   * Submit a response to a stakeholder communication
   */
  async submitResponse(commId: string, submission: ResponseSubmission): Promise<StakeholderMessage> {
    // Get the communication
    const commResult = await this.pool.query(
      'SELECT * FROM stakeholder_communications WHERE id = $1',
      [commId]
    );

    if (commResult.rows.length === 0) {
      throw new Error('Communication not found');
    }

    const comm = commResult.rows[0];

    if (comm.status !== 'pending') {
      throw new Error('Communication already responded to');
    }

    // Update with response
    await this.pool.query(
      `UPDATE stakeholder_communications
       SET response_text = $1,
           responded_at = NOW(),
           responded_by_player_id = $2,
           status = 'responded',
           updated_at = NOW()
       WHERE id = $3`,
      [submission.responseText, submission.playerId || null, commId]
    );

    // Grade response with AI (async)
    this.gradeResponse(commId, comm, submission.responseText).catch((error) => {
      logger.error('Error grading stakeholder response:', error);
    });

    // Get updated record
    const updatedResult = await this.pool.query(
      'SELECT * FROM stakeholder_communications WHERE id = $1',
      [commId]
    );

    return this.mapCommRow(updatedResult.rows[0]);
  }

  /**
   * Grade a stakeholder response with AI
   */
  private async gradeResponse(commId: string, comm: any, responseText: string): Promise<void> {
    try {
      const prompt = `You are an ITSM instructor evaluating a student's response to a stakeholder communication.

STAKEHOLDER:
Type: ${comm.stakeholder_type}
Name: ${comm.stakeholder_name}
Title: ${comm.stakeholder_title}

STAKEHOLDER'S MESSAGE:
${comm.message}

URGENCY: ${comm.urgency}
SENTIMENT: ${comm.sentiment}

STUDENT'S RESPONSE:
${responseText}

EVALUATION CRITERIA:
1. Professionalism (25 points): Appropriate tone, grammar, formatting
2. Empathy (25 points): Acknowledges concerns, shows understanding
3. Information (25 points): Provides relevant details without over-sharing
4. Action-Oriented (25 points): Clear next steps, timeline, or resolution

Grade the response and return a JSON object:
{
  "score": <0-100>,
  "feedback": {
    "professionalism": { "score": <0-25>, "feedback": "<feedback>" },
    "empathy": { "score": <0-25>, "feedback": "<feedback>" },
    "information": { "score": <0-25>, "feedback": "<feedback>" },
    "actionOriented": { "score": <0-25>, "feedback": "<feedback>" },
    "overall": "<2-3 sentence overall assessment>",
    "exampleResponse": "<brief example of an ideal response>"
  }
}

Return ONLY the JSON object.`;

      const response = await this.claudeService.sendMessageJSON<any>({
        systemPrompt: 'You are an ITSM instructor evaluating stakeholder communication responses. Always return valid JSON.',
        userPrompt: prompt,
        temperature: 0.7,
      });
      const grade = response.data;

      // Update with grade
      await this.pool.query(
        `UPDATE stakeholder_communications
         SET ai_response_score = $1,
             ai_response_feedback = $2,
             status = 'closed',
             updated_at = NOW()
         WHERE id = $3`,
        [grade.score, JSON.stringify(grade.feedback), commId]
      );

      // Award points to team
      const pointsAwarded = Math.round(grade.score / 10);
      if (comm.assigned_to_team_id) {
        await this.pool.query(
          `UPDATE teams SET score = score + $1 WHERE id = $2`,
          [pointsAwarded, comm.assigned_to_team_id]
        );
      }

      // Log event
      await this.pool.query(
        `INSERT INTO game_events
         (game_id, event_type, event_category, severity, event_data, actor_type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          comm.game_id,
          'stakeholder_response_graded',
          'communication',
          'info',
          JSON.stringify({
            commId,
            stakeholderType: comm.stakeholder_type,
            score: grade.score,
            pointsAwarded,
          }),
          'ai',
        ]
      );

      logger.info(`Stakeholder response ${commId} graded: score ${grade.score}`);
    } catch (error) {
      logger.error('Error grading stakeholder response:', error);
    }
  }

  /**
   * Get pending communications for a team
   */
  async getTeamCommunications(teamId: string): Promise<StakeholderMessage[]> {
    const result = await this.pool.query(
      `SELECT * FROM stakeholder_communications
       WHERE assigned_to_team_id = $1
       ORDER BY
         CASE urgency
           WHEN 'critical' THEN 1
           WHEN 'high' THEN 2
           WHEN 'normal' THEN 3
           ELSE 4
         END,
         created_at DESC`,
      [teamId]
    );

    return result.rows.map((row) => this.mapCommRow(row));
  }

  /**
   * Get communication by ID
   */
  async getCommunication(commId: string): Promise<StakeholderMessage | null> {
    const result = await this.pool.query(
      'SELECT * FROM stakeholder_communications WHERE id = $1',
      [commId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapCommRow(result.rows[0]);
  }

  /**
   * Get all communications for a game
   */
  async getGameCommunications(gameId: string): Promise<StakeholderMessage[]> {
    const result = await this.pool.query(
      `SELECT * FROM stakeholder_communications
       WHERE game_id = $1
       ORDER BY created_at DESC`,
      [gameId]
    );

    return result.rows.map((row) => this.mapCommRow(row));
  }

  /**
   * Map database row to StakeholderMessage
   */
  private mapCommRow(row: any): StakeholderMessage {
    return {
      id: row.id,
      gameId: row.game_id,
      incidentId: row.incident_id,
      stakeholderType: row.stakeholder_type,
      stakeholderName: row.stakeholder_name,
      stakeholderTitle: row.stakeholder_title,
      stakeholderAvatar: row.stakeholder_avatar,
      message: row.message,
      urgency: row.urgency,
      sentiment: row.sentiment,
      requiresResponse: row.requires_response,
      responseDeadline: row.response_deadline,
      assignedToTeamId: row.assigned_to_team_id,
      responseText: row.response_text,
      respondedAt: row.responded_at,
      aiResponseScore: row.ai_response_score,
      aiResponseFeedback: row.ai_response_feedback,
      status: row.status,
      createdAt: row.created_at,
    };
  }
}
