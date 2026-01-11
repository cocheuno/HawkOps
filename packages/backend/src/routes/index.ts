import { Router } from 'express';
import gameRoutes from './gameRoutes';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Game routes
router.use('/games', gameRoutes);

// TODO: Add additional route modules
// import teamRoutes from './teamRoutes';
// import userRoutes from './userRoutes';
// import aiRoutes from './aiRoutes';

// router.use('/teams', teamRoutes);
// router.use('/users', userRoutes);
// router.use('/ai', aiRoutes);

export default router;
