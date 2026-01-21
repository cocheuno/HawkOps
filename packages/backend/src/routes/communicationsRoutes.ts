import { Router } from 'express';
import { stakeholderController } from '../controllers/stakeholderController';

const router = Router();

// Get a single communication
router.get('/:commId', (req, res) =>
  stakeholderController.getCommunication(req, res)
);

// Submit response to a communication
router.post('/:commId/respond', (req, res) =>
  stakeholderController.submitResponse(req, res)
);

export default router;
