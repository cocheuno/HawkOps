import { Request, Response } from 'express';
import { getPool } from '../config/database';
import logger from '../utils/logger';

interface CreateGameRequest {
  gameName: string;
  facilitatorName: string;
  durationMinutes: number;
  teams: Array<{
    name: string;
    role: 'Service Desk' | 'Technical Operations' | 'Management/CAB';
  }>;
}

export class GameController {
  async createGame(req: Request, res: Response) {
    const pool = getPool();
    const client = await pool.connect();
    try {
      const { gameName, facilitatorName, durationMinutes, teams }: CreateGameRequest = req.body;
      if (!gameName || !facilitatorName || !teams || teams.length === 0) {
        return res.status(400).json({ error: 'Missing required fields: gameName, facilitatorName, teams' });
      }
      if (teams.length < 2 || teams.length > 3) {
        return res.status(400).json({ error: 'Must have between 2 and 3 teams' });
      }
      const validRoles = ['Service Desk', 'Technical Operations', 'Management/CAB'];
      for (const team of teams) {
        if (!validRoles.includes(team.role)) {
          return res.status(400).json({ error: `Invalid team role: ${team.role}. Must be one of: ${validRoles.join(', ')}` });
        }
      }
      await client.query('BEGIN');
      const gameResult = await client.query(`INSERT INTO games (name, status, duration_minutes) VALUES ($1, $2, $3) RETURNING *`, [gameName, 'lobby', durationMinutes || 75]);
      const game = gameResult.rows[0];
      const createdTeams = [];
      for (const team of teams) {
        const teamResult = await client.query(`INSERT INTO teams (game_id, name, role, score) VALUES ($1, $2, $3, $4) RETURNING *`, [game.id, team.name, team.role, 0]);
        createdTeams.push(teamResult.rows[0]);
      }
      await client.query(`INSERT INTO players (game_id, name, is_ready) VALUES ($1, $2, $3)`, [game.id, facilitatorName, true]);
      await client.query(`INSERT INTO game_events (game_id, event_type, event_data, severity) VALUES ($1, $2, $3, $4)`, [game.id, 'game_created', JSON.stringify({ gameName, facilitatorName, teamCount: teams.length, teams: teams.map(t => ({ name: t.name, role: t.role })) }), 'info']);
      await client.query('COMMIT');
      logger.info(`Game created: ${game.id} - ${gameName}`);
      return res.status(201).json({
        game: { id: game.id, name: game.name, status: game.status, durationMinutes: game.duration_minutes, createdAt: game.created_at },
        teams: createdTeams.map(t => ({ id: t.id, name: t.name, role: t.role, score: t.score })),
        facilitator: facilitatorName
      });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating game:', error);
      return res.status(500).json({ error: 'Failed to create game' });
    } finally {
      client.release();
    }
  }

  async getGame(req: Request, res: Response) {
    try {
      const pool = getPool();
      const { gameId } = req.params;
      const gameResult = await pool.query('SELECT * FROM games WHERE id = $1', [gameId]);
      if (gameResult.rows.length === 0) {
        return res.status(404).json({ error: 'Game not found' });
      }
      const game = gameResult.rows[0];
      const teamsResult = await pool.query('SELECT * FROM teams WHERE game_id = $1 ORDER BY created_at', [gameId]);
      const playersResult = await pool.query('SELECT * FROM players WHERE game_id = $1 AND left_at IS NULL ORDER BY joined_at', [gameId]);
      return res.json({
        game: { id: game.id, name: game.name, status: game.status, durationMinutes: game.duration_minutes, startedAt: game.started_at, endedAt: game.ended_at, createdAt: game.created_at },
        teams: teamsResult.rows.map((t: any) => ({ id: t.id, name: t.name, role: t.role, score: t.score })),
        players: playersResult.rows.map((p: any) => ({ id: p.id, name: p.name, teamId: p.team_id, isReady: p.is_ready, joinedAt: p.joined_at }))
      });
    } catch (error) {
      logger.error('Error fetching game:', error);
      return res.status(500).json({ error: 'Failed to fetch game' });
    }
  }

  async listGames(_req: Request, res: Response) {
    try {
      const pool = getPool();
      const result = await pool.query(`SELECT g.*, (SELECT COUNT(*) FROM players p WHERE p.game_id = g.id AND p.left_at IS NULL) as player_count, (SELECT COUNT(*) FROM teams t WHERE t.game_id = g.id) as team_count FROM games g WHERE g.status IN ('lobby', 'active') ORDER BY g.created_at DESC LIMIT 50`);
      return res.json({
        games: result.rows.map((g: any) => ({ id: g.id, name: g.name, status: g.status, playerCount: parseInt(g.player_count), teamCount: parseInt(g.team_count), durationMinutes: g.duration_minutes, createdAt: g.created_at }))
      });
    } catch (error) {
      logger.error('Error listing games:', error);
      return res.status(500).json({ error: 'Failed to list games' });
    }
  }

  async joinGame(req: Request, res: Response) {
    try {
      const pool = getPool();
      const { gameId } = req.params;
      const { playerName, teamId } = req.body;
      if (!playerName) {
        return res.status(400).json({ error: 'Player name is required' });
      }
      const gameResult = await pool.query('SELECT * FROM games WHERE id = $1', [gameId]);
      if (gameResult.rows.length === 0) {
        return res.status(404).json({ error: 'Game not found' });
      }
      const game = gameResult.rows[0];
      if (game.status === 'completed') {
        return res.status(400).json({ error: 'Game has already completed' });
      }
      const existingPlayer = await pool.query('SELECT id FROM players WHERE game_id = $1 AND name = $2 AND left_at IS NULL', [gameId, playerName]);
      if (existingPlayer.rows.length > 0) {
        return res.status(400).json({ error: 'Player name already taken in this game' });
      }
      if (teamId) {
        const teamResult = await pool.query('SELECT id FROM teams WHERE id = $1 AND game_id = $2', [teamId, gameId]);
        if (teamResult.rows.length === 0) {
          return res.status(400).json({ error: 'Invalid team ID' });
        }
      }
      const playerResult = await pool.query(`INSERT INTO players (game_id, team_id, name, is_ready) VALUES ($1, $2, $3, $4) RETURNING *`, [gameId, teamId || null, playerName, false]);
      const player = playerResult.rows[0];
      await pool.query(`INSERT INTO game_events (game_id, event_type, event_data, severity) VALUES ($1, $2, $3, $4)`, [gameId, 'player_joined', JSON.stringify({ playerName, teamId }), 'info']);
      logger.info(`Player ${playerName} joined game ${gameId}`);
      return res.status(201).json({
        player: { id: player.id, name: player.name, teamId: player.team_id, gameId: player.game_id, isReady: player.is_ready }
      });
    } catch (error) {
      logger.error('Error joining game:', error);
      return res.status(500).json({ error: 'Failed to join game' });
    }
  }
}

export const gameController = new GameController();

