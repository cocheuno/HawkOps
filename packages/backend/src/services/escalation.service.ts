import { Pool } from 'pg';

interface EscalationRule {
  id: string;
  gameId: string;
  name: string;
  description: string;
  priorityTrigger: string;
  timeThresholdMinutes: number;
  escalationLevel: number;
  notifyRoles: string[];
  autoReassign: boolean;
  targetTeamRole: string | null;
}

interface IncidentEscalation {
  id: string;
  incidentId: string;
  escalationRuleId: string | null;
  fromTeamId: string | null;
  toTeamId: string | null;
  escalationLevel: number;
  reason: string;
  escalatedBy: string;
  acknowledged: boolean;
  acknowledgedAt: Date | null;
  createdAt: Date;
}

interface EscalationCheck {
  incidentId: string;
  incidentNumber: string;
  title: string;
  priority: string;
  currentLevel: number;
  minutesOpen: number;
  shouldEscalate: boolean;
  nextLevel: number | null;
  rule: EscalationRule | null;
}

export class EscalationService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Get escalation rules for a game
   */
  async getEscalationRules(gameId: string): Promise<EscalationRule[]> {
    const result = await this.pool.query(
      `SELECT id, game_id as "gameId", name, description,
              priority_trigger as "priorityTrigger",
              time_threshold_minutes as "timeThresholdMinutes",
              escalation_level as "escalationLevel",
              notify_roles as "notifyRoles",
              auto_reassign as "autoReassign",
              target_team_role as "targetTeamRole"
       FROM escalation_rules
       WHERE game_id = $1
       ORDER BY priority_trigger, escalation_level`,
      [gameId]
    );
    return result.rows;
  }

  /**
   * Check which incidents need escalation
   */
  async checkEscalations(gameId: string): Promise<EscalationCheck[]> {
    // Get all active incidents with their current escalation level and time open
    const incidentsResult = await this.pool.query(
      `SELECT i.id, i.incident_number, i.title, i.priority,
              COALESCE(i.current_escalation_level, 0) as current_level,
              EXTRACT(EPOCH FROM (NOW() - i.created_at))/60 as minutes_open
       FROM incidents i
       WHERE i.game_id = $1
       AND i.status NOT IN ('resolved', 'closed')
       ORDER BY i.priority DESC, i.created_at ASC`,
      [gameId]
    );

    const rules = await this.getEscalationRules(gameId);
    const checks: EscalationCheck[] = [];

    for (const incident of incidentsResult.rows) {
      // Find applicable rules for this incident's priority
      const applicableRules = rules.filter(
        r => r.priorityTrigger === incident.priority && r.escalationLevel > incident.current_level
      );

      // Sort by escalation level to get the next level
      applicableRules.sort((a, b) => a.escalationLevel - b.escalationLevel);

      // Find the next rule that should trigger
      let shouldEscalate = false;
      let nextRule: EscalationRule | null = null;

      for (const rule of applicableRules) {
        if (incident.minutes_open >= rule.timeThresholdMinutes) {
          shouldEscalate = true;
          nextRule = rule;
          break;
        }
      }

      checks.push({
        incidentId: incident.id,
        incidentNumber: incident.incident_number,
        title: incident.title,
        priority: incident.priority,
        currentLevel: incident.current_level,
        minutesOpen: Math.round(incident.minutes_open),
        shouldEscalate,
        nextLevel: nextRule?.escalationLevel || null,
        rule: nextRule
      });
    }

    return checks;
  }

  /**
   * Escalate an incident
   */
  async escalateIncident(
    incidentId: string,
    escalationRuleId: string | null,
    reason: string,
    escalatedBy: string = 'system',
    toTeamId?: string
  ): Promise<IncidentEscalation> {
    // Get current incident info
    const incidentResult = await this.pool.query(
      `SELECT assigned_team_id, current_escalation_level FROM incidents WHERE id = $1`,
      [incidentId]
    );

    if (incidentResult.rows.length === 0) {
      throw new Error('Incident not found');
    }

    const incident = incidentResult.rows[0];
    const currentLevel = incident.current_escalation_level || 0;
    const newLevel = currentLevel + 1;

    // Get rule details if provided
    let targetTeamId = toTeamId;
    if (escalationRuleId && !targetTeamId) {
      const ruleResult = await this.pool.query(
        `SELECT auto_reassign, target_team_role FROM escalation_rules WHERE id = $1`,
        [escalationRuleId]
      );
      if (ruleResult.rows.length > 0 && ruleResult.rows[0].auto_reassign) {
        // Find a team with the target role
        const teamResult = await this.pool.query(
          `SELECT id FROM teams t
           JOIN incidents i ON i.game_id = t.game_id
           WHERE i.id = $1 AND t.role ILIKE $2
           LIMIT 1`,
          [incidentId, `%${ruleResult.rows[0].target_team_role}%`]
        );
        if (teamResult.rows.length > 0) {
          targetTeamId = teamResult.rows[0].id;
        }
      }
    }

    // Create escalation record
    const escalationResult = await this.pool.query(
      `INSERT INTO incident_escalations
       (incident_id, escalation_rule_id, from_team_id, to_team_id, escalation_level, reason, escalated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, incident_id as "incidentId", escalation_rule_id as "escalationRuleId",
                 from_team_id as "fromTeamId", to_team_id as "toTeamId",
                 escalation_level as "escalationLevel", reason, escalated_by as "escalatedBy",
                 acknowledged, acknowledged_at as "acknowledgedAt", created_at as "createdAt"`,
      [
        incidentId,
        escalationRuleId,
        incident.assigned_team_id,
        targetTeamId || null,
        newLevel,
        reason,
        escalatedBy
      ]
    );

    // Update incident escalation level
    await this.pool.query(
      `UPDATE incidents
       SET current_escalation_level = $2,
           escalation_count = COALESCE(escalation_count, 0) + 1,
           assigned_team_id = COALESCE($3, assigned_team_id),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [incidentId, newLevel, targetTeamId]
    );

    // Deduct points for escalation (penalty)
    if (incident.assigned_team_id) {
      const penalty = newLevel * 25; // 25, 50, 75 points etc.
      await this.pool.query(
        `UPDATE teams SET score = GREATEST(0, score - $1) WHERE id = $2`,
        [penalty, incident.assigned_team_id]
      );
    }

    return escalationResult.rows[0];
  }

  /**
   * Acknowledge an escalation
   */
  async acknowledgeEscalation(escalationId: string): Promise<void> {
    await this.pool.query(
      `UPDATE incident_escalations
       SET acknowledged = TRUE, acknowledged_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [escalationId]
    );
  }

  /**
   * Get escalation history for an incident
   */
  async getIncidentEscalations(incidentId: string): Promise<IncidentEscalation[]> {
    const result = await this.pool.query(
      `SELECT ie.id, ie.incident_id as "incidentId",
              ie.escalation_rule_id as "escalationRuleId",
              ie.from_team_id as "fromTeamId", ie.to_team_id as "toTeamId",
              ie.escalation_level as "escalationLevel", ie.reason,
              ie.escalated_by as "escalatedBy", ie.acknowledged,
              ie.acknowledged_at as "acknowledgedAt", ie.created_at as "createdAt",
              ft.name as "fromTeamName", tt.name as "toTeamName"
       FROM incident_escalations ie
       LEFT JOIN teams ft ON ie.from_team_id = ft.id
       LEFT JOIN teams tt ON ie.to_team_id = tt.id
       WHERE ie.incident_id = $1
       ORDER BY ie.created_at DESC`,
      [incidentId]
    );
    return result.rows;
  }

  /**
   * Get unacknowledged escalations for a team
   */
  async getUnacknowledgedEscalations(teamId: string): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT ie.*, i.incident_number, i.title, i.priority
       FROM incident_escalations ie
       JOIN incidents i ON ie.incident_id = i.id
       WHERE ie.to_team_id = $1 AND ie.acknowledged = FALSE
       ORDER BY ie.created_at DESC`,
      [teamId]
    );
    return result.rows;
  }

  /**
   * Process automatic escalations for a game
   */
  async processAutoEscalations(gameId: string): Promise<number> {
    const checks = await this.checkEscalations(gameId);
    let escalatedCount = 0;

    for (const check of checks) {
      if (check.shouldEscalate && check.rule) {
        await this.escalateIncident(
          check.incidentId,
          check.rule.id,
          `Automatic escalation: ${check.rule.name} - ${check.minutesOpen} minutes without resolution`,
          'system'
        );
        escalatedCount++;
      }
    }

    return escalatedCount;
  }

  /**
   * Create a custom escalation rule
   */
  async createEscalationRule(
    gameId: string,
    name: string,
    description: string,
    priorityTrigger: string,
    timeThresholdMinutes: number,
    escalationLevel: number,
    notifyRoles: string[],
    autoReassign: boolean = false,
    targetTeamRole?: string
  ): Promise<EscalationRule> {
    const result = await this.pool.query(
      `INSERT INTO escalation_rules
       (game_id, name, description, priority_trigger, time_threshold_minutes,
        escalation_level, notify_roles, auto_reassign, target_team_role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, game_id as "gameId", name, description,
                 priority_trigger as "priorityTrigger",
                 time_threshold_minutes as "timeThresholdMinutes",
                 escalation_level as "escalationLevel",
                 notify_roles as "notifyRoles",
                 auto_reassign as "autoReassign",
                 target_team_role as "targetTeamRole"`,
      [gameId, name, description, priorityTrigger, timeThresholdMinutes,
       escalationLevel, notifyRoles, autoReassign, targetTeamRole || null]
    );
    return result.rows[0];
  }
}
