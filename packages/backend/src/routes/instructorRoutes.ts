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

export default router;
