import { Pool } from 'pg';
import logger from '../utils/logger';

interface SLABreachResult {
  incidentId: string;
  incidentNumber: string;
  title: string;
  previousPriority: string;
  newPriority: string;
  escalated: boolean;
  teamId: string | null;
  teamName: string | null;
}

interface SLACheckResult {
  breachedCount: number;
  escalatedCount: number;
  breaches: SLABreachResult[];
}

/**
 * SLA Service
 * Handles SLA breach detection, escalation, and notifications
 */
export class SLAService {
  private pool: Pool;

  // Priority escalation mapping
  private readonly escalationMap: Record<string, string> = {
    'low': 'medium',
    'medium': 'high',
    'high': 'critical',
    'critical': 'critical', // Already at max
  };

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Check all open incidents for SLA breaches and handle escalation
   */
  async checkAndProcessBreaches(gameId: string): Promise<SLACheckResult> {
    const result: SLACheckResult = {
      breachedCount: 0,
      escalatedCount: 0,
      breaches: [],
    };

    try {
      // Find all incidents that have breached SLA but not yet marked
      const breachedIncidents = await this.pool.query(
        `SELECT i.id, i.incident_number, i.title, i.priority, i.severity,
                i.sla_deadline, i.assigned_to_team_id, t.name as team_name
         FROM incidents i
         LEFT JOIN teams t ON i.assigned_to_team_id = t.id
         WHERE i.game_id = $1
           AND i.status NOT IN ('resolved', 'closed')
           AND i.sla_deadline < NOW()
           AND (i.sla_breached IS NULL OR i.sla_breached = false)
         ORDER BY i.sla_deadline`,
        [gameId]
      );

      for (const incident of breachedIncidents.rows) {
        const breachResult = await this.processBreachedIncident(gameId, incident);
        result.breaches.push(breachResult);
        result.breachedCount++;
        if (breachResult.escalated) {
          result.escalatedCount++;
        }
      }

      if (result.breachedCount > 0) {
        logger.info(`SLA Check for game ${gameId}: ${result.breachedCount} breaches, ${result.escalatedCount} escalations`);
      }

      return result;
    } catch (error) {
      logger.error('Error checking SLA breaches:', error);
      throw error;
    }
  }

  /**
   * Process a single breached incident
   */
  private async processBreachedIncident(gameId: string, incident: any): Promise<SLABreachResult> {
    const previousPriority = incident.priority;
    const newPriority = this.escalationMap[previousPriority] || previousPriority;
    const shouldEscalate = newPriority !== previousPriority;

    // Update incident - mark as breached and optionally escalate
    await this.pool.query(
      `UPDATE incidents
       SET sla_breached = true,
           priority = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [newPriority, incident.id]
    );

    // Log the breach event
    await this.pool.query(
      `INSERT INTO game_events
       (game_id, event_type, event_category, severity, event_data, actor_type)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        gameId,
        'sla_breached',
        'incident',
        'critical',
        JSON.stringify({
          incidentId: incident.id,
          incidentNumber: incident.incident_number,
          title: incident.title,
          previousPriority,
          newPriority,
          escalated: shouldEscalate,
          teamId: incident.assigned_to_team_id,
          teamName: incident.team_name,
          breachTime: new Date().toISOString(),
          slaDeadline: incident.sla_deadline,
        }),
        'system',
      ]
    );

    // If escalated, log additional event
    if (shouldEscalate) {
      await this.pool.query(
        `INSERT INTO game_events
         (game_id, event_type, event_category, severity, event_data, actor_type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          gameId,
          'incident_escalated',
          'incident',
          'warning',
          JSON.stringify({
            incidentId: incident.id,
            incidentNumber: incident.incident_number,
            reason: 'SLA breach auto-escalation',
            previousPriority,
            newPriority,
          }),
          'system',
        ]
      );

      // Decrease team morale for SLA breach (if team assigned)
      if (incident.assigned_to_team_id) {
        await this.pool.query(
          `UPDATE teams
           SET morale_level = GREATEST(0, morale_level - 5)
           WHERE id = $1`,
          [incident.assigned_to_team_id]
        );
      }
    }

    logger.info(
      `SLA Breach: ${incident.incident_number} - "${incident.title}" ` +
      `(${previousPriority} → ${newPriority}, escalated: ${shouldEscalate})`
    );

    return {
      incidentId: incident.id,
      incidentNumber: incident.incident_number,
      title: incident.title,
      previousPriority,
      newPriority,
      escalated: shouldEscalate,
      teamId: incident.assigned_to_team_id,
      teamName: incident.team_name,
    };
  }

  /**
   * Get SLA status summary for a game
   */
  async getSLAStatus(gameId: string): Promise<{
    total: number;
    withinSLA: number;
    breached: number;
    atRisk: number; // Within 15 minutes of breach
  }> {
    const result = await this.pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'closed')) as total,
         COUNT(*) FILTER (
           WHERE status NOT IN ('resolved', 'closed')
           AND sla_deadline > NOW()
           AND sla_deadline > NOW() + INTERVAL '15 minutes'
         ) as within_sla,
         COUNT(*) FILTER (
           WHERE status NOT IN ('resolved', 'closed')
           AND (sla_breached = true OR sla_deadline <= NOW())
         ) as breached,
         COUNT(*) FILTER (
           WHERE status NOT IN ('resolved', 'closed')
           AND sla_deadline > NOW()
           AND sla_deadline <= NOW() + INTERVAL '15 minutes'
           AND (sla_breached IS NULL OR sla_breached = false)
         ) as at_risk
       FROM incidents
       WHERE game_id = $1`,
      [gameId]
    );

    const row = result.rows[0];
    return {
      total: parseInt(row.total) || 0,
      withinSLA: parseInt(row.within_sla) || 0,
      breached: parseInt(row.breached) || 0,
      atRisk: parseInt(row.at_risk) || 0,
    };
  }

  /**
   * Get incidents at risk of breaching (within specified minutes)
   */
  async getAtRiskIncidents(gameId: string, withinMinutes: number = 15): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT i.id, i.incident_number, i.title, i.priority, i.severity,
              i.sla_deadline, i.status, i.assigned_to_team_id, t.name as team_name,
              EXTRACT(EPOCH FROM (i.sla_deadline - NOW())) / 60 as minutes_remaining
       FROM incidents i
       LEFT JOIN teams t ON i.assigned_to_team_id = t.id
       WHERE i.game_id = $1
         AND i.status NOT IN ('resolved', 'closed')
         AND i.sla_deadline > NOW()
         AND i.sla_deadline <= NOW() + INTERVAL '${withinMinutes} minutes'
         AND (i.sla_breached IS NULL OR i.sla_breached = false)
       ORDER BY i.sla_deadline`,
      [gameId]
    );

    return result.rows.map(row => ({
      id: row.id,
      incidentNumber: row.incident_number,
      title: row.title,
      priority: row.priority,
      severity: row.severity,
      slaDeadline: row.sla_deadline,
      status: row.status,
      teamId: row.assigned_to_team_id,
      teamName: row.team_name,
      minutesRemaining: Math.round(parseFloat(row.minutes_remaining)),
    }));
  }
}
