import { Router } from 'express';
import { gameController } from '../controllers/gameController';

const router = Router();

// Create a new game
router.post('/', (req, res) => gameController.createGame(req, res));

// List all active games
router.get('/', (req, res) => gameController.listGames(req, res));

// Get game by ID
router.get('/:gameId', (req, res) => gameController.getGame(req, res));

// Join a game
router.post('/:gameId/join', (req, res) => gameController.joinGame(req, res));

// Start a game (initializes all realism features)
router.post('/:gameId/start', (req, res) => gameController.startGame(req, res));

// Service Health endpoints
router.get('/:gameId/service-health', (req, res) => gameController.getServiceHealth(req, res));
router.post('/:gameId/initialize-services', (req, res) => gameController.initializeServices(req, res));
router.post('/:gameId/refresh-service-status', (req, res) => gameController.refreshServiceStatus(req, res));

export default router;
