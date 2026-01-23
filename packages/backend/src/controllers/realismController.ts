import { Request, Response } from 'express';
import { getPool } from '../config/database';
import { EscalationService } from '../services/escalation.service';
import { ServiceDependencyService } from '../services/serviceDependency.service';
import { ChangeRequestService } from '../services/changeRequest.service';
import { ResourceManagementService } from '../services/resourceManagement.service';

// ==================== ESCALATION ====================

export const getEscalationRules = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const pool = getPool();
    const service = new EscalationService(pool);
    const rules = await service.getEscalationRules(gameId);
    res.json(rules);
  } catch (error: any) {
    console.error('Error fetching escalation rules:', error);
    res.status(500).json({ error: 'Failed to fetch escalation rules' });
  }
};

export const checkEscalations = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const pool = getPool();
    const service = new EscalationService(pool);
    const checks = await service.checkEscalations(gameId);
    res.json(checks);
  } catch (error: any) {
    console.error('Error checking escalations:', error);
    res.status(500).json({ error: 'Failed to check escalations' });
  }
};

export const processAutoEscalations = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const pool = getPool();
    const service = new EscalationService(pool);
    const count = await service.processAutoEscalations(gameId);
    res.json({ success: true, escalatedCount: count });
  } catch (error: any) {
    console.error('Error processing escalations:', error);
    res.status(500).json({ error: 'Failed to process escalations' });
  }
};

export const escalateIncident = async (req: Request, res: Response) => {
  try {
    const { incidentId } = req.params;
    const { reason, toTeamId } = req.body;
    const pool = getPool();
    const service = new EscalationService(pool);
    const escalation = await service.escalateIncident(incidentId, null, reason || 'Manual escalation', 'manual', toTeamId);
    res.json(escalation);
  } catch (error: any) {
    console.error('Error escalating incident:', error);
    res.status(500).json({ error: 'Failed to escalate incident' });
  }
};

export const getIncidentEscalations = async (req: Request, res: Response) => {
  try {
    const { incidentId } = req.params;
    const pool = getPool();
    const service = new EscalationService(pool);
    const escalations = await service.getIncidentEscalations(incidentId);
    res.json(escalations);
  } catch (error: any) {
    console.error('Error fetching incident escalations:', error);
    res.status(500).json({ error: 'Failed to fetch incident escalations' });
  }
};

export const acknowledgeEscalation = async (req: Request, res: Response) => {
  try {
    const { escalationId } = req.params;
    const pool = getPool();
    const service = new EscalationService(pool);
    await service.acknowledgeEscalation(escalationId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error acknowledging escalation:', error);
    res.status(500).json({ error: 'Failed to acknowledge escalation' });
  }
};

// ==================== SERVICE DEPENDENCIES ====================

export const getDependencies = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const pool = getPool();
    const service = new ServiceDependencyService(pool);
    const dependencies = await service.getDependencies(gameId);
    res.json(dependencies);
  } catch (error: any) {
    console.error('Error fetching dependencies:', error);
    res.status(500).json({ error: 'Failed to fetch dependencies' });
  }
};

export const getDependencyGraph = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const pool = getPool();
    const service = new ServiceDependencyService(pool);
    const graph = await service.getDependencyGraph(gameId);
    res.json(graph);
  } catch (error: any) {
    console.error('Error fetching dependency graph:', error);
    res.status(500).json({ error: 'Failed to fetch dependency graph' });
  }
};

export const addDependency = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const { serviceId, dependsOnServiceId, dependencyType, impactDelayMinutes } = req.body;
    const pool = getPool();
    const service = new ServiceDependencyService(pool);
    const dependency = await service.addDependency(
      gameId, serviceId, dependsOnServiceId,
      dependencyType || 'hard', impactDelayMinutes || 0
    );
    res.json(dependency);
  } catch (error: any) {
    console.error('Error adding dependency:', error);
    res.status(400).json({ error: error.message || 'Failed to add dependency' });
  }
};

export const calculateCascadeImpact = async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;
    const pool = getPool();
    const service = new ServiceDependencyService(pool);
    const impacts = await service.calculateCascadeImpact(serviceId);
    res.json(impacts);
  } catch (error: any) {
    console.error('Error calculating cascade impact:', error);
    res.status(500).json({ error: 'Failed to calculate cascade impact' });
  }
};

export const applyCascadeImpact = async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;
    const pool = getPool();
    const service = new ServiceDependencyService(pool);
    const impacts = await service.applyCascadeImpact(serviceId);
    res.json({ success: true, impacts });
  } catch (error: any) {
    console.error('Error applying cascade impact:', error);
    res.status(500).json({ error: 'Failed to apply cascade impact' });
  }
};

export const initializeDefaultDependencies = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const pool = getPool();
    const service = new ServiceDependencyService(pool);
    const count = await service.initializeDefaultDependencies(gameId);
    res.json({ success: true, dependenciesCreated: count });
  } catch (error: any) {
    console.error('Error initializing dependencies:', error);
    res.status(500).json({ error: 'Failed to initialize dependencies' });
  }
};

// ==================== CHANGE REQUESTS ====================

export const getChangeRequests = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const { status } = req.query;
    const pool = getPool();
    const service = new ChangeRequestService(pool);
    const changes = await service.getChangeRequests(gameId, status as string);
    res.json(changes);
  } catch (error: any) {
    console.error('Error fetching change requests:', error);
    res.status(500).json({ error: 'Failed to fetch change requests' });
  }
};

export const createChangeRequest = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const {
      title, description, changeType, riskLevel, affectedServices,
      requestedByTeamId, scheduledStart, scheduledEnd,
      implementationPlan, rollbackPlan, testPlan
    } = req.body;

    if (!title || !description || !changeType || !riskLevel || !requestedByTeamId) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const pool = getPool();
    const service = new ChangeRequestService(pool);
    const change = await service.createChangeRequest(
      gameId, title, description, changeType, riskLevel,
      affectedServices || [], requestedByTeamId,
      scheduledStart ? new Date(scheduledStart) : undefined,
      scheduledEnd ? new Date(scheduledEnd) : undefined,
      implementationPlan, rollbackPlan, testPlan
    );

    res.status(201).json(change);
  } catch (error: any) {
    console.error('Error creating change request:', error);
    res.status(500).json({ error: 'Failed to create change request' });
  }
};

export const getChangeRequest = async (req: Request, res: Response) => {
  try {
    const { changeId } = req.params;
    const pool = getPool();
    const service = new ChangeRequestService(pool);
    const change = await service.getChangeRequest(changeId);
    if (!change) {
      res.status(404).json({ error: 'Change request not found' });
      return;
    }
    res.json(change);
  } catch (error: any) {
    console.error('Error fetching change request:', error);
    res.status(500).json({ error: 'Failed to fetch change request' });
  }
};

export const updateChangeRequest = async (req: Request, res: Response) => {
  try {
    const { changeId } = req.params;
    const { title, description, riskLevel } = req.body;
    const pool = getPool();

    const result = await pool.query(
      `UPDATE change_requests
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           risk_level = COALESCE($3, risk_level),
           updated_at = NOW()
       WHERE id = $4::uuid
       RETURNING *`,
      [title, description, riskLevel, changeId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Change request not found' });
      return;
    }

    res.json({ success: true, change: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating change request:', error);
    res.status(500).json({ error: 'Failed to update change request' });
  }
};

export const approveChangeRequest = async (req: Request, res: Response) => {
  try {
    const { changeId } = req.params;
    const { approverTeamId, decision, comments } = req.body;
    const pool = getPool();
    const service = new ChangeRequestService(pool);
    const approval = await service.addApproval(changeId, approverTeamId, decision, comments);
    res.json(approval);
  } catch (error: any) {
    console.error('Error approving change request:', error);
    res.status(500).json({ error: 'Failed to approve change request' });
  }
};

export const implementChange = async (req: Request, res: Response) => {
  try {
    const { changeId } = req.params;
    const pool = getPool();
    const service = new ChangeRequestService(pool);
    const result = await service.implementChange(changeId);
    res.json(result);
  } catch (error: any) {
    console.error('Error implementing change:', error);
    res.status(500).json({ error: 'Failed to implement change' });
  }
};

// ==================== CAB WORKFLOW ====================

export const getCABPendingChanges = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const pool = getPool();
    const service = new ChangeRequestService(pool);
    const changes = await service.getCABPendingChanges(gameId);
    res.json({ success: true, changes });
  } catch (error: any) {
    console.error('Error fetching CAB pending changes:', error);
    res.status(500).json({ error: 'Failed to fetch CAB pending changes' });
  }
};

export const getTeamReviewChanges = async (req: Request, res: Response) => {
  try {
    const { gameId, teamId } = req.params;
    const pool = getPool();
    const service = new ChangeRequestService(pool);
    const changes = await service.getTeamReviewChanges(gameId, teamId);
    res.json({ success: true, changes });
  } catch (error: any) {
    console.error('Error fetching team review changes:', error);
    res.status(500).json({ error: 'Failed to fetch team review changes' });
  }
};

export const sendChangeForReview = async (req: Request, res: Response) => {
  try {
    const { changeId } = req.params;
    const { reviewTeamId, notes } = req.body;
    const pool = getPool();
    const service = new ChangeRequestService(pool);
    const change = await service.sendForReview(changeId, reviewTeamId, notes);
    res.json({ success: true, change });
  } catch (error: any) {
    console.error('Error sending change for review:', error);
    res.status(500).json({ error: error.message || 'Failed to send change for review' });
  }
};

export const submitChangeReview = async (req: Request, res: Response) => {
  try {
    const { changeId } = req.params;
    const { reviewStatus, reviewNotes, reviewerPlayerId } = req.body;
    const pool = getPool();
    const service = new ChangeRequestService(pool);
    const change = await service.submitReview(changeId, reviewStatus, reviewNotes, reviewerPlayerId);
    res.json({ success: true, change });
  } catch (error: any) {
    console.error('Error submitting change review:', error);
    res.status(500).json({ error: error.message || 'Failed to submit change review' });
  }
};

export const cabApproveChange = async (req: Request, res: Response) => {
  try {
    const { changeId } = req.params;
    const { approverPlayerId, notes } = req.body;
    const pool = getPool();
    const service = new ChangeRequestService(pool);
    const change = await service.cabApprove(changeId, approverPlayerId, notes);
    res.json({ success: true, change });
  } catch (error: any) {
    console.error('Error CAB approving change:', error);
    res.status(500).json({ error: error.message || 'Failed to approve change' });
  }
};

export const cabRejectChange = async (req: Request, res: Response) => {
  try {
    const { changeId } = req.params;
    const { approverPlayerId, reason } = req.body;
    const pool = getPool();
    const service = new ChangeRequestService(pool);
    const change = await service.cabReject(changeId, approverPlayerId, reason);
    res.json({ success: true, change });
  } catch (error: any) {
    console.error('Error CAB rejecting change:', error);
    res.status(500).json({ error: error.message || 'Failed to reject change' });
  }
};

// ==================== RESOURCES ====================

export const getTeamResources = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const pool = getPool();
    const service = new ResourceManagementService(pool);
    const resources = await service.getTeamResources(teamId);
    res.json(resources);
  } catch (error: any) {
    console.error('Error fetching team resources:', error);
    res.status(500).json({ error: 'Failed to fetch team resources' });
  }
};

export const initializeTeamResources = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const pool = getPool();
    const service = new ResourceManagementService(pool);
    const count = await service.initializeTeamResources(teamId);
    res.json({ success: true, resourcesCreated: count });
  } catch (error: any) {
    console.error('Error initializing team resources:', error);
    res.status(500).json({ error: 'Failed to initialize team resources' });
  }
};

export const getShiftSchedules = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const { teamId } = req.query;
    const pool = getPool();
    const service = new ResourceManagementService(pool);
    const schedules = await service.getShiftSchedules(gameId, teamId as string);
    res.json(schedules);
  } catch (error: any) {
    console.error('Error fetching shift schedules:', error);
    res.status(500).json({ error: 'Failed to fetch shift schedules' });
  }
};

export const initializeShiftSchedules = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const pool = getPool();
    const service = new ResourceManagementService(pool);
    const count = await service.initializeShiftSchedules(gameId);
    res.json({ success: true, schedulesCreated: count });
  } catch (error: any) {
    console.error('Error initializing shift schedules:', error);
    res.status(500).json({ error: 'Failed to initialize shift schedules' });
  }
};

export const getGameCapacityStatus = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const pool = getPool();
    const service = new ResourceManagementService(pool);
    const status = await service.getGameCapacityStatus(gameId);
    res.json(status);
  } catch (error: any) {
    console.error('Error fetching capacity status:', error);
    res.status(500).json({ error: 'Failed to fetch capacity status' });
  }
};

export const getGameResources = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const pool = getPool();
    const service = new ResourceManagementService(pool);
    const resources = await service.getGameResources(gameId);
    res.json(resources);
  } catch (error: any) {
    console.error('Error fetching game resources:', error);
    res.status(500).json({ error: 'Failed to fetch game resources' });
  }
};

export const getGameResourceCapacity = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const pool = getPool();
    const service = new ResourceManagementService(pool);
    const capacityStatus = await service.getGameCapacityStatus(gameId);

    // Transform to match frontend CapacityStatus interface
    const capacity = capacityStatus.map((team: any) => {
      // Determine status based on initialization and utilization
      let status = 'available';
      if (!team.resourcesInitialized) {
        status = 'available'; // Not yet initialized, show as available (not red)
      } else if (team.isOverloaded) {
        status = 'overloaded';
      } else if (team.utilizationPercent > 70) {
        status = 'busy';
      }

      return {
        teamId: team.teamId,
        teamName: team.teamName,
        currentCapacity: team.availableResources,
        maxCapacity: team.totalResources,
        utilizationPercent: team.utilizationPercent,
        status,
        activeIncidents: 0, // Will be populated below
        activeChanges: 0,
        resourcesInitialized: team.resourcesInitialized
      };
    });

    // Get active incidents per team
    for (const c of capacity) {
      const incidentResult = await pool.query(
        `SELECT COUNT(*) as count FROM incidents
         WHERE assigned_to_team_id = $1 AND status NOT IN ('resolved', 'closed')`,
        [c.teamId]
      );
      c.activeIncidents = parseInt(incidentResult.rows[0]?.count) || 0;

      const changeResult = await pool.query(
        `SELECT COUNT(*) as count FROM change_requests
         WHERE (requested_by_team_id = $1 OR assigned_to_team_id = $1) AND status = 'in_progress'`,
        [c.teamId]
      );
      c.activeChanges = parseInt(changeResult.rows[0]?.count) || 0;
    }

    res.json(capacity);
  } catch (error: any) {
    console.error('Error fetching resource capacity:', error);
    res.status(500).json({ error: 'Failed to fetch resource capacity' });
  }
};

// ==================== GAME INITIALIZATION ====================

export const initializeGameRealism = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const pool = getPool();

    const results = {
      services: 0,
      escalationRules: 0,
      resources: 0,
      shifts: 0,
      dependencies: 0
    };

    // 1. Initialize services (into services table for dependency tracking)
    const servicesResult = await pool.query(
      `SELECT COUNT(*) as count FROM services WHERE game_id = $1`,
      [gameId]
    );

    if (parseInt(servicesResult.rows[0].count) === 0) {
      const defaultServices = [
        { name: 'Authentication Service', type: 'application', criticality: 10, description: 'User authentication and authorization' },
        { name: 'Primary Database', type: 'database', criticality: 10, description: 'Main application database' },
        { name: 'Web Application', type: 'application', criticality: 9, description: 'Customer-facing web application' },
        { name: 'API Gateway', type: 'application', criticality: 9, description: 'Central API routing and management' },
        { name: 'Email Service', type: 'application', criticality: 6, description: 'Email notification system' },
        { name: 'Backup System', type: 'infrastructure', criticality: 7, description: 'Data backup and recovery' },
        { name: 'Monitoring Service', type: 'application', criticality: 7, description: 'System monitoring and alerting' },
        { name: 'CDN', type: 'network', criticality: 5, description: 'Content delivery network' },
        { name: 'Storage System', type: 'storage', criticality: 8, description: 'File and object storage' },
        { name: 'Security Gateway', type: 'security', criticality: 9, description: 'Security and firewall services' }
      ];

      for (const svc of defaultServices) {
        await pool.query(
          `INSERT INTO services (game_id, name, type, status, criticality, description)
           VALUES ($1, $2, $3, 'operational', $4, $5)`,
          [gameId, svc.name, svc.type, svc.criticality, svc.description]
        );
        results.services++;
      }
    }

    // 2. Initialize escalation rules
    const escResult = await pool.query(
      `SELECT COUNT(*) as count FROM escalation_rules WHERE game_id = $1`,
      [gameId]
    );

    if (parseInt(escResult.rows[0].count) === 0) {
      const rules = [
        { name: 'Critical P1 - 15 min', description: 'Escalate critical incidents after 15 minutes', priority: 'critical', time: 15, level: 1, roles: ['manager', 'lead'] },
        { name: 'Critical P1 - 30 min', description: 'Major escalation for critical incidents after 30 minutes', priority: 'critical', time: 30, level: 2, roles: ['director', 'vp'] },
        { name: 'High Priority - 30 min', description: 'Escalate high priority incidents after 30 minutes', priority: 'high', time: 30, level: 1, roles: ['manager'] },
        { name: 'High Priority - 60 min', description: 'Major escalation for high priority incidents after 60 minutes', priority: 'high', time: 60, level: 2, roles: ['director'] },
        { name: 'Medium Priority - 60 min', description: 'Escalate medium priority incidents after 60 minutes', priority: 'medium', time: 60, level: 1, roles: ['lead'] }
      ];

      for (const rule of rules) {
        await pool.query(
          `INSERT INTO escalation_rules (game_id, name, description, priority_trigger, time_threshold_minutes, escalation_level, notify_roles)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [gameId, rule.name, rule.description, rule.priority, rule.time, rule.level, rule.roles]
        );
        results.escalationRules++;
      }
    }

    // 3. Initialize team resources for all teams
    const teamsResult = await pool.query(
      `SELECT id FROM teams WHERE game_id = $1`,
      [gameId]
    );

    const resourceService = new ResourceManagementService(pool);
    for (const team of teamsResult.rows) {
      const count = await resourceService.initializeTeamResources(team.id);
      results.resources += count;
    }

    // 4. Initialize shift schedules
    const shiftsCount = await resourceService.initializeShiftSchedules(gameId);
    results.shifts = shiftsCount;

    // 5. Initialize service dependencies
    const depService = new ServiceDependencyService(pool);
    const depCount = await depService.initializeDefaultDependencies(gameId);
    results.dependencies = depCount;

    res.json({
      success: true,
      message: 'Game realism features initialized',
      results
    });
  } catch (error: any) {
    console.error('Error initializing game realism:', error);
    res.status(500).json({ error: 'Failed to initialize game realism features' });
  }
};
