import { Router } from 'express';
import { instructorController } from '../controllers/instructorController';
import { stakeholderController } from '../controllers/stakeholderController';

const router = Router();

// Inject AI-generated incident
router.post('/games/:gameId/inject-incident', (req, res) =>
  instructorController.injectAIIncident(req, res)
);

// Get game state for instructor dashboard
router.get('/games/:gameId/state', (req, res) =>
  instructorController.getGameState(req, res)
);

// Check and process SLA breaches
router.post('/games/:gameId/check-sla', (req, res) =>
  instructorController.checkSLABreaches(req, res)
);

// Get SLA status summary
router.get('/games/:gameId/sla-status', (req, res) =>
  instructorController.getSLAStatus(req, res)
);

// Stakeholder communication routes
router.post('/games/:gameId/stakeholder-comm', (req, res) =>
  stakeholderController.generateCommunication(req, res)
);
router.get('/games/:gameId/communications', (req, res) =>
  stakeholderController.getGameCommunications(req, res)
);

export default router;
