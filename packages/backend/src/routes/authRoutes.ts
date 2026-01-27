import { Router } from 'express';
import { authController } from '../controllers/authController';

const router = Router();

// Email-only login
router.post('/login', (req, res) => authController.login(req, res));

// Get AI model info
router.get('/ai-info', (req, res) => authController.getAIInfo(req, res));

export default router;
