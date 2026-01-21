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
