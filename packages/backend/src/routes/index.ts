import { Router } from 'express';
import gameRoutes from './gameRoutes';
import instructorRoutes from './instructorRoutes';
import adminRoutes from './adminRoutes';
import teamRoutes from './teamRoutes';
import documentRoutes from './documentRoutes';
import aiRoutes from './aiRoutes';
import pirRoutes from './pirRoutes';
import communicationsRoutes from './communicationsRoutes';
import competitiveRoutes from './competitiveRoutes';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Game routes
router.use('/games', gameRoutes);

// Instructor routes
router.use('/instructor', instructorRoutes);

// Team routes
router.use('/teams', teamRoutes);

// PIR routes (Post-Incident Reviews)
router.use('/pir', pirRoutes);

// Communications routes (Stakeholder Communications)
router.use('/communications', communicationsRoutes);

// Competitive routes (Achievements, Leaderboard, Challenges)
router.use('/', competitiveRoutes);

// Document routes (includes both instructor and participant endpoints)
router.use('/', documentRoutes);

// AI routes (scenario and document generation)
router.use('/', aiRoutes);

// Admin routes (for database setup, etc.)
// WARNING: Secure these endpoints in production!
router.use('/admin', adminRoutes);

export default router;
