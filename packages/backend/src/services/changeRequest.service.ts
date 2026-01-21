import { Pool } from 'pg';

interface ChangeRequest {
  id: string;
  gameId: string;
  changeNumber: string;
  title: string;
  description: string;
  changeType: 'standard' | 'normal' | 'emergency';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  affectedServices: string[];
  requestedByTeamId: string | null;
  assignedToTeamId: string | null;
  status: string;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  actualStart: Date | null;
  actualEnd: Date | null;
  implementationPlan: string | null;
  rollbackPlan: string | null;
  testPlan: string | null;
  approvalNotes: string | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ChangeApproval {
  id: string;
  changeRequestId: string;
  approverTeamId: string;
  approverTeamName?: string;
  decision: 'approved' | 'rejected' | 'needs_info';
  comments: string | null;
  createdAt: Date;
}

export class ChangeRequestService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Generate a change request number
   */
  private async generateChangeNumber(gameId: string): Promise<string> {
    const result = await this.pool.query(
      `SELECT COUNT(*) as count FROM change_requests WHERE game_id = $1`,
      [gameId]
    );
    const count = parseInt(result.rows[0].count) + 1;
    return `CHG${count.toString().padStart(5, '0')}`;
  }

  /**
   * Create a new change request
   */
  async createChangeRequest(
    gameId: string,
    title: string,
    description: string,
    changeType: 'standard' | 'normal' | 'emergency',
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    affectedServices: string[],
    requestedByTeamId: string,
    scheduledStart?: Date,
    scheduledEnd?: Date,
    implementationPlan?: string,
    rollbackPlan?: string,
    testPlan?: string
  ): Promise<ChangeRequest> {
    const changeNumber = await this.generateChangeNumber(gameId);

    // Emergency changes are auto-approved
    const initialStatus = changeType === 'emergency' ? 'approved' : 'pending';

    const result = await this.pool.query(
      `INSERT INTO change_requests
       (game_id, change_number, title, description, change_type, risk_level,
        affected_services, requested_by_team_id, status, scheduled_start, scheduled_end,
        implementation_plan, rollback_plan, test_plan)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        gameId, changeNumber, title, description, changeType, riskLevel,
        affectedServices, requestedByTeamId, initialStatus,
        scheduledStart || null, scheduledEnd || null,
        implementationPlan || null, rollbackPlan || null, testPlan || null
      ]
    );

    return this.mapChangeRequest(result.rows[0]);
  }

  /**
   * Get all change requests for a game
   */
  async getChangeRequests(gameId: string, status?: string): Promise<ChangeRequest[]> {
    let query = `
      SELECT cr.*, rt.name as requested_by_name, at.name as assigned_to_name
      FROM change_requests cr
      LEFT JOIN teams rt ON cr.requested_by_team_id = rt.id
      LEFT JOIN teams at ON cr.assigned_to_team_id = at.id
      WHERE cr.game_id = $1
    `;
    const params: any[] = [gameId];

    if (status) {
      query += ` AND cr.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY cr.created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows.map((row: any) => this.mapChangeRequest(row));
  }

  /**
   * Get a single change request
   */
  async getChangeRequest(changeId: string): Promise<ChangeRequest | null> {
    const result = await this.pool.query(
      `SELECT * FROM change_requests WHERE id = $1`,
      [changeId]
    );
    if (result.rows.length === 0) return null;
    return this.mapChangeRequest(result.rows[0]);
  }

  /**
   * Update change request status
   */
  async updateStatus(changeId: string, status: string, failureReason?: string): Promise<ChangeRequest> {
    const updates: string[] = ['status = $2', 'updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [changeId, status];

    if (status === 'in_progress') {
      updates.push('actual_start = CURRENT_TIMESTAMP');
    } else if (['completed', 'failed', 'rolled_back'].includes(status)) {
      updates.push('actual_end = CURRENT_TIMESTAMP');
    }

    if (failureReason) {
      updates.push(`failure_reason = $${params.length + 1}`);
      params.push(failureReason);
    }

    const result = await this.pool.query(
      `UPDATE change_requests SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );

    // Apply scoring based on outcome
    const change = result.rows[0];
    if (change.requested_by_team_id) {
      let points = 0;
      if (status === 'completed') {
        // Successful change = points based on risk
        const riskPoints: Record<string, number> = {
          low: 50, medium: 100, high: 150, critical: 200
        };
        points = riskPoints[change.risk_level] || 50;
      } else if (status === 'failed' || status === 'rolled_back') {
        // Failed change = penalty
        const riskPenalty: Record<string, number> = {
          low: -25, medium: -50, high: -100, critical: -150
        };
        points = riskPenalty[change.risk_level] || -25;
      }

      if (points !== 0) {
        await this.pool.query(
          `UPDATE teams SET score = GREATEST(0, score + $1) WHERE id = $2`,
          [points, change.requested_by_team_id]
        );
      }
    }

    return this.mapChangeRequest(result.rows[0]);
  }

  /**
   * Assign change request to a team
   */
  async assignToTeam(changeId: string, teamId: string): Promise<ChangeRequest> {
    const result = await this.pool.query(
      `UPDATE change_requests
       SET assigned_to_team_id = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [changeId, teamId]
    );
    return this.mapChangeRequest(result.rows[0]);
  }

  /**
   * Add an approval decision
   */
  async addApproval(
    changeId: string,
    approverTeamId: string,
    decision: 'approved' | 'rejected' | 'needs_info',
    comments?: string
  ): Promise<ChangeApproval> {
    const result = await this.pool.query(
      `INSERT INTO change_approvals (change_request_id, approver_team_id, decision, comments)
       VALUES ($1, $2, $3, $4)
       RETURNING id, change_request_id as "changeRequestId",
                 approver_team_id as "approverTeamId",
                 decision, comments, created_at as "createdAt"`,
      [changeId, approverTeamId, decision, comments || null]
    );

    // If approved, update the change request status
    if (decision === 'approved') {
      await this.pool.query(
        `UPDATE change_requests
         SET status = 'approved', approval_notes = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND status = 'pending'`,
        [changeId, comments || null]
      );
    } else if (decision === 'rejected') {
      await this.pool.query(
        `UPDATE change_requests
         SET status = 'rejected', approval_notes = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [changeId, comments || null]
      );
    }

    return result.rows[0];
  }

  /**
   * Get approvals for a change request
   */
  async getApprovals(changeId: string): Promise<ChangeApproval[]> {
    const result = await this.pool.query(
      `SELECT ca.id, ca.change_request_id as "changeRequestId",
              ca.approver_team_id as "approverTeamId",
              t.name as "approverTeamName",
              ca.decision, ca.comments, ca.created_at as "createdAt"
       FROM change_approvals ca
       JOIN teams t ON ca.approver_team_id = t.id
       WHERE ca.change_request_id = $1
       ORDER BY ca.created_at DESC`,
      [changeId]
    );
    return result.rows;
  }

  /**
   * Get pending changes that are scheduled to start soon
   */
  async getUpcomingChanges(gameId: string, withinMinutes: number = 60): Promise<ChangeRequest[]> {
    const result = await this.pool.query(
      `SELECT * FROM change_requests
       WHERE game_id = $1
       AND status = 'approved'
       AND scheduled_start IS NOT NULL
       AND scheduled_start <= NOW() + INTERVAL '${withinMinutes} minutes'
       AND scheduled_start > NOW()
       ORDER BY scheduled_start ASC`,
      [gameId]
    );
    return result.rows.map((row: any) => this.mapChangeRequest(row));
  }

  /**
   * Get changes currently in progress
   */
  async getInProgressChanges(gameId: string): Promise<ChangeRequest[]> {
    const result = await this.pool.query(
      `SELECT * FROM change_requests
       WHERE game_id = $1 AND status = 'in_progress'
       ORDER BY actual_start ASC`,
      [gameId]
    );
    return result.rows.map((row: any) => this.mapChangeRequest(row));
  }

  /**
   * Simulate change implementation (can fail based on risk)
   */
  async implementChange(changeId: string): Promise<{ success: boolean; message: string }> {
    const change = await this.getChangeRequest(changeId);
    if (!change) throw new Error('Change request not found');

    // Start the change
    await this.updateStatus(changeId, 'in_progress');

    // Simulate success/failure based on risk level and preparation
    const riskFailureChance: Record<string, number> = {
      low: 0.05,      // 5% failure rate
      medium: 0.15,   // 15% failure rate
      high: 0.30,     // 30% failure rate
      critical: 0.45  // 45% failure rate
    };

    let failureChance = riskFailureChance[change.riskLevel] || 0.15;

    // Reduce failure chance if plans are provided
    if (change.implementationPlan) failureChance *= 0.7;
    if (change.rollbackPlan) failureChance *= 0.8;
    if (change.testPlan) failureChance *= 0.9;

    const success = Math.random() > failureChance;

    if (success) {
      await this.updateStatus(changeId, 'completed');
      return { success: true, message: 'Change implemented successfully' };
    } else {
      // Determine if we can rollback
      if (change.rollbackPlan) {
        await this.updateStatus(changeId, 'rolled_back', 'Implementation failed, rollback executed');
        return { success: false, message: 'Change failed but was rolled back successfully' };
      } else {
        await this.updateStatus(changeId, 'failed', 'Implementation failed, no rollback plan available');

        // Create an incident if change fails without rollback
        if (change.affectedServices && change.affectedServices.length > 0) {
          await this.createIncidentFromFailedChange(change);
        }

        return { success: false, message: 'Change failed and could not be rolled back - incident created' };
      }
    }
  }

  /**
   * Create an incident from a failed change
   */
  private async createIncidentFromFailedChange(change: ChangeRequest): Promise<void> {
    const incidentNumber = `INC${Date.now().toString().slice(-8)}`;

    await this.pool.query(
      `INSERT INTO incidents
       (game_id, incident_number, title, description, priority, severity, status,
        assigned_team_id, sla_deadline, estimated_cost_per_minute, ai_generated, ai_context)
       VALUES ($1, $2, $3, $4, 'high', 'high', 'open', $5,
               NOW() + INTERVAL '1 hour', 75, FALSE, $6)`,
      [
        change.gameId,
        incidentNumber,
        `Failed Change: ${change.title}`,
        `Incident created due to failed change request ${change.changeNumber}. ${change.failureReason || 'Change implementation failed.'}`,
        change.assignedToTeamId || change.requestedByTeamId,
        JSON.stringify({
          sourceType: 'change_request',
          changeNumber: change.changeNumber,
          affectedServices: change.affectedServices
        })
      ]
    );
  }

  private mapChangeRequest(row: any): ChangeRequest {
    return {
      id: row.id,
      gameId: row.game_id,
      changeNumber: row.change_number,
      title: row.title,
      description: row.description,
      changeType: row.change_type,
      riskLevel: row.risk_level,
      affectedServices: row.affected_services || [],
      requestedByTeamId: row.requested_by_team_id,
      assignedToTeamId: row.assigned_to_team_id,
      status: row.status,
      scheduledStart: row.scheduled_start,
      scheduledEnd: row.scheduled_end,
      actualStart: row.actual_start,
      actualEnd: row.actual_end,
      implementationPlan: row.implementation_plan,
      rollbackPlan: row.rollback_plan,
      testPlan: row.test_plan,
      approvalNotes: row.approval_notes,
      failureReason: row.failure_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
