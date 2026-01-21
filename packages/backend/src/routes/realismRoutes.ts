import { Router } from 'express';
import {
  // Escalation
  getEscalationRules,
  checkEscalations,
  processAutoEscalations,
  escalateIncident,
  getIncidentEscalations,
  acknowledgeEscalation,
  // Service Dependencies
  getDependencies,
  getDependencyGraph,
  addDependency,
  calculateCascadeImpact,
  applyCascadeImpact,
  initializeDefaultDependencies,
  // Change Requests
  getChangeRequests,
  createChangeRequest,
  getChangeRequest,
  approveChangeRequest,
  implementChange,
  // Resources
  getTeamResources,
  initializeTeamResources,
  getShiftSchedules,
  initializeShiftSchedules,
  getGameCapacityStatus
} from '../controllers/realismController';

const router = Router();

// ==================== ESCALATION ====================
router.get('/games/:gameId/escalation/rules', getEscalationRules);
router.get('/games/:gameId/escalation/check', checkEscalations);
router.post('/games/:gameId/escalation/process', processAutoEscalations);
router.post('/incidents/:incidentId/escalate', escalateIncident);
router.get('/incidents/:incidentId/escalations', getIncidentEscalations);
router.post('/escalations/:escalationId/acknowledge', acknowledgeEscalation);

// ==================== SERVICE DEPENDENCIES ====================
router.get('/games/:gameId/dependencies', getDependencies);
router.get('/games/:gameId/dependencies/graph', getDependencyGraph);
router.post('/games/:gameId/dependencies', addDependency);
router.post('/games/:gameId/dependencies/initialize', initializeDefaultDependencies);
router.get('/services/:serviceId/cascade-impact', calculateCascadeImpact);
router.post('/services/:serviceId/cascade-impact/apply', applyCascadeImpact);

// ==================== CHANGE REQUESTS ====================
router.get('/games/:gameId/changes', getChangeRequests);
router.post('/games/:gameId/changes', createChangeRequest);
router.get('/changes/:changeId', getChangeRequest);
router.post('/changes/:changeId/approve', approveChangeRequest);
router.post('/changes/:changeId/implement', implementChange);

// ==================== RESOURCES ====================
router.get('/teams/:teamId/resources', getTeamResources);
router.post('/teams/:teamId/resources/initialize', initializeTeamResources);
router.get('/games/:gameId/shifts', getShiftSchedules);
router.post('/games/:gameId/shifts/initialize', initializeShiftSchedules);
router.get('/games/:gameId/capacity', getGameCapacityStatus);

export default router;
