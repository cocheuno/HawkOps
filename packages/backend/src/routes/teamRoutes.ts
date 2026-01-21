import { Router } from 'express';
import { teamController } from '../controllers/teamController';
import { pirController } from '../controllers/pirController';
import { stakeholderController } from '../controllers/stakeholderController';

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

export default router;
