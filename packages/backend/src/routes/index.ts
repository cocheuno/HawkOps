import { Router } from 'express';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// TODO: Add route modules
// import gameRoutes from './gameRoutes';
// import teamRoutes from './teamRoutes';
// import userRoutes from './userRoutes';
// import aiRoutes from './aiRoutes';

// router.use('/games', gameRoutes);
// router.use('/teams', teamRoutes);
// router.use('/users', userRoutes);
// router.use('/ai', aiRoutes);

export default router;
