import { Router } from 'express';
import { teamController } from '../controllers/teamController';

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

export default router;
