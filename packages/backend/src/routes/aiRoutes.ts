import { Router } from 'express';
import { aiController } from '../controllers/aiController';

const router = Router();

// Generate scenario options
router.post('/instructor/ai/generate-scenarios', aiController.generateScenarios.bind(aiController));

// Generate documents for a scenario
router.post('/instructor/games/:gameId/ai/generate-documents', aiController.generateDocuments.bind(aiController));

// Get generation history
router.get('/instructor/ai/generations', aiController.getGenerations.bind(aiController));

export default router;
