import { Pool } from 'pg';

interface TeamResource {
  id: string;
  teamId: string;
  resourceType: string;
  resourceName: string;
  totalCapacity: number;
  availableCapacity: number;
  costPerHour: number;
  skillLevel: string;
}

interface ResourceAllocation {
  id: string;
  resourceId: string;
  resourceName?: string;
  incidentId: string | null;
  changeRequestId: string | null;
  unitsAllocated: number;
  startTime: Date;
  endTime: Date | null;
  status: string;
}

interface ShiftSchedule {
  id: string;
  gameId: string;
  teamId: string;
  teamName?: string;
  shiftName: string;
  startHour: number;
  endHour: number;
  staffCount: number;
  efficiencyModifier: number;
  isActive: boolean;
}

interface TeamCapacityStatus {
  teamId: string;
  teamName: string;
  currentShift: string;
  staffOnDuty: number;
  efficiencyModifier: number;
  totalResources: number;
  availableResources: number;
  utilizationPercent: number;
  isOverloaded: boolean;
}

export class ResourceManagementService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // ==================== TEAM RESOURCES ====================

  /**
   * Get all resources for all teams in a game
   */
  async getGameResources(gameId: string): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT tr.id, tr.team_id as "teamId", t.name as "teamName",
              tr.total_capacity as "totalStaff", tr.available_capacity as "availableStaff",
              COALESCE(
                (SELECT COUNT(*) FROM resource_allocations ra WHERE ra.resource_id = tr.id AND ra.status = 'active'),
                0
              ) as "currentWorkload",
              5 as "skillLevel",
              10 as "maxConcurrentIncidents",
              0 as "fatigueLevel"
       FROM team_resources tr
       JOIN teams t ON tr.team_id = t.id
       WHERE t.game_id = $1 AND tr.resource_type = 'staff'
       ORDER BY t.name`,
      [gameId]
    );
    return result.rows;
  }

  /**
   * Get resources for a team
   */
  async getTeamResources(teamId: string): Promise<TeamResource[]> {
    const result = await this.pool.query(
      `SELECT id, team_id as "teamId", resource_type as "resourceType",
              resource_name as "resourceName", total_capacity as "totalCapacity",
              available_capacity as "availableCapacity", cost_per_hour as "costPerHour",
              skill_level as "skillLevel"
       FROM team_resources
       WHERE team_id = $1
       ORDER BY resource_type, resource_name`,
      [teamId]
    );
    return result.rows;
  }

  /**
   * Initialize default resources for a team
   */
  async initializeTeamResources(teamId: string): Promise<number> {
    // Check if resources already exist
    const existing = await this.pool.query(
      `SELECT COUNT(*) as count FROM team_resources WHERE team_id = $1`,
      [teamId]
    );

    if (parseInt(existing.rows[0].count) > 0) {
      return 0;
    }

    // Create default resources
    const defaultResources = [
      { type: 'staff', name: 'Engineers', capacity: 5, cost: 75, skill: 'standard' },
      { type: 'staff', name: 'Senior Engineers', capacity: 2, cost: 125, skill: 'senior' },
      { type: 'staff', name: 'On-Call Staff', capacity: 1, cost: 100, skill: 'standard' },
      { type: 'expertise', name: 'Database Expertise', capacity: 3, cost: 0, skill: 'expert' },
      { type: 'expertise', name: 'Network Expertise', capacity: 2, cost: 0, skill: 'senior' },
      { type: 'tools', name: 'Monitoring Tools', capacity: 10, cost: 0, skill: 'standard' }
    ];

    for (const resource of defaultResources) {
      await this.pool.query(
        `INSERT INTO team_resources
         (team_id, resource_type, resource_name, total_capacity, available_capacity, cost_per_hour, skill_level)
         VALUES ($1, $2, $3, $4, $4, $5, $6)`,
        [teamId, resource.type, resource.name, resource.capacity, resource.cost, resource.skill]
      );
    }

    return defaultResources.length;
  }

  /**
   * Allocate resources to an incident or change
   */
  async allocateResource(
    resourceId: string,
    units: number,
    incidentId?: string,
    changeRequestId?: string
  ): Promise<ResourceAllocation | null> {
    // Check available capacity
    const resourceResult = await this.pool.query(
      `SELECT available_capacity FROM team_resources WHERE id = $1`,
      [resourceId]
    );

    if (resourceResult.rows.length === 0) {
      throw new Error('Resource not found');
    }

    if (resourceResult.rows[0].available_capacity < units) {
      return null; // Not enough capacity
    }

    // Create allocation
    const allocResult = await this.pool.query(
      `INSERT INTO resource_allocations
       (resource_id, incident_id, change_request_id, units_allocated, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING id, resource_id as "resourceId", incident_id as "incidentId",
                 change_request_id as "changeRequestId", units_allocated as "unitsAllocated",
                 start_time as "startTime", end_time as "endTime", status`,
      [resourceId, incidentId || null, changeRequestId || null, units]
    );

    // Update available capacity
    await this.pool.query(
      `UPDATE team_resources
       SET available_capacity = available_capacity - $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [resourceId, units]
    );

    return allocResult.rows[0];
  }

  /**
   * Release allocated resources
   */
  async releaseAllocation(allocationId: string): Promise<void> {
    // Get allocation details
    const allocResult = await this.pool.query(
      `SELECT resource_id, units_allocated FROM resource_allocations WHERE id = $1 AND status = 'active'`,
      [allocationId]
    );

    if (allocResult.rows.length === 0) {
      throw new Error('Active allocation not found');
    }

    const alloc = allocResult.rows[0];

    // Update allocation status
    await this.pool.query(
      `UPDATE resource_allocations
       SET status = 'released', end_time = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [allocationId]
    );

    // Return capacity
    await this.pool.query(
      `UPDATE team_resources
       SET available_capacity = available_capacity + $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [alloc.resource_id, alloc.units_allocated]
    );
  }

  /**
   * Get active allocations for a team
   */
  async getTeamAllocations(teamId: string): Promise<ResourceAllocation[]> {
    const result = await this.pool.query(
      `SELECT ra.id, ra.resource_id as "resourceId", tr.resource_name as "resourceName",
              ra.incident_id as "incidentId", ra.change_request_id as "changeRequestId",
              ra.units_allocated as "unitsAllocated", ra.start_time as "startTime",
              ra.end_time as "endTime", ra.status
       FROM resource_allocations ra
       JOIN team_resources tr ON ra.resource_id = tr.id
       WHERE tr.team_id = $1 AND ra.status = 'active'
       ORDER BY ra.start_time DESC`,
      [teamId]
    );
    return result.rows;
  }

  // ==================== SHIFT SCHEDULES ====================

  /**
   * Get shift schedules for a game
   */
  async getShiftSchedules(gameId: string, teamId?: string): Promise<ShiftSchedule[]> {
    let query = `
      SELECT ss.id, ss.game_id as "gameId", ss.team_id as "teamId", t.name as "teamName",
             ss.shift_name as "shiftName", ss.start_hour as "startHour", ss.end_hour as "endHour",
             ss.staff_count as "staffCount", ss.efficiency_modifier as "efficiencyModifier",
             ss.is_active as "isActive"
      FROM shift_schedules ss
      JOIN teams t ON ss.team_id = t.id
      WHERE ss.game_id = $1
    `;
    const params: any[] = [gameId];

    if (teamId) {
      query += ` AND ss.team_id = $2`;
      params.push(teamId);
    }

    query += ` ORDER BY t.name, ss.start_hour`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Initialize default shift schedules for all teams in a game
   */
  async initializeShiftSchedules(gameId: string): Promise<number> {
    // Get all teams
    const teamsResult = await this.pool.query(
      `SELECT id FROM teams WHERE game_id = $1`,
      [gameId]
    );

    const defaultShifts = [
      { name: 'Day Shift', startHour: 8, endHour: 16, staffCount: 5, efficiency: 1.0 },
      { name: 'Evening Shift', startHour: 16, endHour: 24, staffCount: 3, efficiency: 0.9 },
      { name: 'Night Shift', startHour: 0, endHour: 8, staffCount: 2, efficiency: 0.7 }
    ];

    let created = 0;
    for (const team of teamsResult.rows) {
      for (const shift of defaultShifts) {
        try {
          await this.pool.query(
            `INSERT INTO shift_schedules
             (game_id, team_id, shift_name, start_hour, end_hour, staff_count, efficiency_modifier)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT DO NOTHING`,
            [gameId, team.id, shift.name, shift.startHour, shift.endHour, shift.staffCount, shift.efficiency]
          );
          created++;
        } catch (e) { /* ignore duplicates */ }
      }
    }

    return created;
  }

  /**
   * Get current shift for a team based on game time
   */
  async getCurrentShift(teamId: string, currentHour?: number): Promise<ShiftSchedule | null> {
    const hour = currentHour ?? new Date().getHours();

    const result = await this.pool.query(
      `SELECT ss.id, ss.game_id as "gameId", ss.team_id as "teamId",
             ss.shift_name as "shiftName", ss.start_hour as "startHour", ss.end_hour as "endHour",
             ss.staff_count as "staffCount", ss.efficiency_modifier as "efficiencyModifier",
             ss.is_active as "isActive"
       FROM shift_schedules ss
       WHERE ss.team_id = $1 AND ss.is_active = TRUE
       AND (
         (ss.start_hour <= ss.end_hour AND $2 >= ss.start_hour AND $2 < ss.end_hour)
         OR
         (ss.start_hour > ss.end_hour AND ($2 >= ss.start_hour OR $2 < ss.end_hour))
       )
       LIMIT 1`,
      [teamId, hour]
    );

    return result.rows[0] || null;
  }

  /**
   * Update shift schedule
   */
  async updateShiftSchedule(
    scheduleId: string,
    staffCount?: number,
    efficiencyModifier?: number,
    isActive?: boolean
  ): Promise<ShiftSchedule> {
    const updates: string[] = [];
    const params: any[] = [scheduleId];
    let paramIndex = 2;

    if (staffCount !== undefined) {
      updates.push(`staff_count = $${paramIndex++}`);
      params.push(staffCount);
    }
    if (efficiencyModifier !== undefined) {
      updates.push(`efficiency_modifier = $${paramIndex++}`);
      params.push(efficiencyModifier);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(isActive);
    }

    if (updates.length === 0) {
      throw new Error('No updates provided');
    }

    const result = await this.pool.query(
      `UPDATE shift_schedules SET ${updates.join(', ')} WHERE id = $1
       RETURNING id, game_id as "gameId", team_id as "teamId",
                 shift_name as "shiftName", start_hour as "startHour", end_hour as "endHour",
                 staff_count as "staffCount", efficiency_modifier as "efficiencyModifier",
                 is_active as "isActive"`,
      params
    );

    return result.rows[0];
  }

  // ==================== CAPACITY STATUS ====================

  /**
   * Get capacity status for all teams in a game
   */
  async getGameCapacityStatus(gameId: string): Promise<TeamCapacityStatus[]> {
    const currentHour = new Date().getHours();

    const result = await this.pool.query(
      `SELECT
         t.id as "teamId",
         t.name as "teamName",
         COALESCE(ss.shift_name, 'No Shift') as "currentShift",
         COALESCE(ss.staff_count, 0) as "staffOnDuty",
         COALESCE(ss.efficiency_modifier, 1.0) as "efficiencyModifier",
         COALESCE(SUM(tr.total_capacity), 0) as "totalResources",
         COALESCE(SUM(tr.available_capacity), 0) as "availableResources"
       FROM teams t
       LEFT JOIN shift_schedules ss ON ss.team_id = t.id
         AND ss.is_active = TRUE
         AND (
           (ss.start_hour <= ss.end_hour AND $2 >= ss.start_hour AND $2 < ss.end_hour)
           OR
           (ss.start_hour > ss.end_hour AND ($2 >= ss.start_hour OR $2 < ss.end_hour))
         )
       LEFT JOIN team_resources tr ON tr.team_id = t.id AND tr.resource_type = 'staff'
       WHERE t.game_id = $1
       GROUP BY t.id, t.name, ss.shift_name, ss.staff_count, ss.efficiency_modifier`,
      [gameId, currentHour]
    );

    return result.rows.map((row: any) => ({
      teamId: row.teamId,
      teamName: row.teamName,
      currentShift: row.currentShift,
      staffOnDuty: parseInt(row.staffOnDuty),
      efficiencyModifier: parseFloat(row.efficiencyModifier),
      totalResources: parseInt(row.totalResources),
      availableResources: parseInt(row.availableResources),
      utilizationPercent: row.totalResources > 0
        ? Math.round(((row.totalResources - row.availableResources) / row.totalResources) * 100)
        : 0,
      isOverloaded: row.availableResources <= 0
    }));
  }

  /**
   * Check if a team can handle more work
   */
  async canTeamHandleWork(teamId: string, requiredStaff: number = 1): Promise<{ canHandle: boolean; reason?: string }> {
    const resources = await this.getTeamResources(teamId);
    const shift = await this.getCurrentShift(teamId);

    // Check if there's a shift active
    if (!shift) {
      return { canHandle: false, reason: 'No active shift for this team' };
    }

    // Check staff availability
    const staffResources = resources.filter(r => r.resourceType === 'staff');
    const availableStaff = staffResources.reduce((sum, r) => sum + r.availableCapacity, 0);

    if (availableStaff < requiredStaff) {
      return { canHandle: false, reason: `Insufficient staff (need ${requiredStaff}, have ${availableStaff})` };
    }

    // Check if overloaded (efficiency below threshold)
    if (shift.efficiencyModifier < 0.5) {
      return { canHandle: false, reason: 'Team efficiency too low (night shift constraints)' };
    }

    return { canHandle: true };
  }
}
