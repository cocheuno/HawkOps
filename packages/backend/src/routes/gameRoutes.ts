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

export default router;
