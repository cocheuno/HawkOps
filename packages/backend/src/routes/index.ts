import { Router } from 'express';
import gameRoutes from './gameRoutes';
import instructorRoutes from './instructorRoutes';
import adminRoutes from './adminRoutes';
import teamRoutes from './teamRoutes';
import documentRoutes from './documentRoutes';

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

// Document routes (includes both instructor and participant endpoints)
router.use('/', documentRoutes);

// Admin routes (for database setup, etc.)
// WARNING: Secure these endpoints in production!
router.use('/admin', adminRoutes);

// TODO: Add additional route modules
// import userRoutes from './userRoutes';
// import aiRoutes from './aiRoutes';
// router.use('/users', userRoutes);
// router.use('/ai', aiRoutes);

export default router;
