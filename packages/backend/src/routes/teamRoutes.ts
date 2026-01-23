import { Router } from 'express';
import { teamController } from '../controllers/teamController';
import { pirController } from '../controllers/pirController';
import { stakeholderController } from '../controllers/stakeholderController';
import { implementationPlanController } from '../controllers/implementationPlanController';

const router = Router();

// Get team dashboard
router.get('/:teamId/dashboard', (req, res) =>
  teamController.getDashboard(req, res)
);

// Get specific incident details
router.get('/:teamId/incidents/:incidentId', (req, res) =>
  teamController.getIncidentDetails(req, res)
);

// Update incident status
router.patch('/:teamId/incidents/:incidentId/status', (req, res) =>
  teamController.updateIncidentStatus(req, res)
);

// PIR routes
router.get('/:teamId/pir/:incidentId', (req, res) =>
  pirController.getOrCreatePIR(req, res)
);
router.get('/:teamId/pirs', (req, res) =>
  pirController.getTeamPIRs(req, res)
);
router.get('/:teamId/incidents-requiring-pir', (req, res) =>
  pirController.getIncidentsRequiringPIR(req, res)
);

// Stakeholder communication routes
router.get('/:teamId/communications', (req, res) =>
  stakeholderController.getTeamCommunications(req, res)
);

// ============================================
// IMPLEMENTATION PLANS (Problem Resolution)
// ============================================

// Get all implementation plans for a team
router.get('/:teamId/implementation-plans', (req, res) =>
  implementationPlanController.getTeamPlans(req, res)
);

// Create a new implementation plan
router.post('/:teamId/implementation-plans', (req, res) =>
  implementationPlanController.createPlan(req, res)
);

// Get a specific implementation plan
router.get('/:teamId/implementation-plans/:planId', (req, res) =>
  implementationPlanController.getPlan(req, res)
);

// Update an implementation plan
router.put('/:teamId/implementation-plans/:planId', (req, res) =>
  implementationPlanController.updatePlan(req, res)
);

// Submit plan for AI evaluation
router.post('/:teamId/implementation-plans/:planId/submit', (req, res) =>
  implementationPlanController.submitPlan(req, res)
);

// Start implementing an approved plan
router.post('/:teamId/implementation-plans/:planId/implement', (req, res) =>
  implementationPlanController.startImplementation(req, res)
);

// Complete implementation
router.post('/:teamId/implementation-plans/:planId/complete', (req, res) =>
  implementationPlanController.completeImplementation(req, res)
);

export default router;
