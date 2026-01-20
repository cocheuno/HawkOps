import { Router } from 'express';
import { instructorController } from '../controllers/instructorController';

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

export default router;
