import { Router } from 'express';
import { pirController } from '../controllers/pirController';

const router = Router();

// Get PIR by ID
router.get('/:pirId', (req, res) =>
  pirController.getPIR(req, res)
);

// Save PIR draft
router.put('/:pirId', (req, res) =>
  pirController.saveDraft(req, res)
);

// Submit PIR for grading
router.post('/:pirId/submit', (req, res) =>
  pirController.submitPIR(req, res)
);

export default router;
