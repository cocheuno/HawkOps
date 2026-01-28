import { Request, Response } from 'express';
import { getPool } from '../config/database';
import { ServiceHealthService } from '../services/serviceHealth.service';
import { ResourceManagementService } from '../services/resourceManagement.service';
import { ServiceDependencyService } from '../services/serviceDependency.service';
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
  /**
   * Get service health status for a game
   * GET /api/games/:gameId/service-health
   */
  async getServiceHealth(req: Request, res: Response) {
    const { gameId } = req.params;
    const pool = getPool();
    const serviceHealthService = new ServiceHealthService(pool);

    try {
      const health = await serviceHealthService.getServiceHealth(gameId);
      return res.json(health);
    } catch (error) {
      logger.error('Error getting service health:', error);
      return res.status(500).json({ error: 'Failed to get service health' });
    }
  }

  /**
   * Initialize services for a game
   * POST /api/games/:gameId/initialize-services
   */
  async initializeServices(req: Request, res: Response) {
    const { gameId } = req.params;
    const { scenarioType } = req.body;
    const pool = getPool();
    const serviceHealthService = new ServiceHealthService(pool);

    try {
      await serviceHealthService.initializeServicesForGame(gameId, scenarioType || 'general_itsm');
      const health = await serviceHealthService.getServiceHealth(gameId);
      return res.json({
        success: true,
        message: `Initialized ${health.total} services`,
        ...health,
      });
    } catch (error) {
      logger.error('Error initializing services:', error);
      return res.status(500).json({ error: 'Failed to initialize services' });
    }
  }

  /**
   * Refresh service statuses based on active incidents
   * POST /api/games/:gameId/refresh-service-status
   */
  async refreshServiceStatus(req: Request, res: Response) {
    const { gameId } = req.params;
    const pool = getPool();
    const serviceHealthService = new ServiceHealthService(pool);

    try {
      await serviceHealthService.updateServiceStatuses(gameId);
      const health = await serviceHealthService.getServiceHealth(gameId);
      return res.json({
        success: true,
        message: 'Service statuses refreshed',
        ...health,
      });
    } catch (error) {
      logger.error('Error refreshing service status:', error);
      return res.status(500).json({ error: 'Failed to refresh service status' });
    }
  }

  /**
   * Start a game and initialize all realism features
   * POST /api/games/:gameId/start
   */
  async startGame(req: Request, res: Response) {
    const { gameId } = req.params;
    const pool = getPool();

    try {
      // Check game exists and is in lobby
      const gameResult = await pool.query(
        'SELECT id, status FROM games WHERE id = $1',
        [gameId]
      );

      if (gameResult.rows.length === 0) {
        return res.status(404).json({ error: 'Game not found' });
      }

      const game = gameResult.rows[0];
      if (game.status !== 'lobby') {
        return res.status(400).json({ error: `Cannot start game. Current status: ${game.status}` });
      }

      const initResults = {
        services: 0,
        escalationRules: 0,
        resources: 0,
        shifts: 0,
        dependencies: 0
      };

      // 1. Initialize services (into services table for dependency tracking)
      const servicesResult = await pool.query(
        `SELECT COUNT(*) as count FROM services WHERE game_id = $1`,
        [gameId]
      );

      if (parseInt(servicesResult.rows[0].count) === 0) {
        const defaultServices = [
          { name: 'Authentication Service', type: 'application', criticality: 10, description: 'User authentication and authorization' },
          { name: 'Primary Database', type: 'database', criticality: 10, description: 'Main application database' },
          { name: 'Web Application', type: 'application', criticality: 9, description: 'Customer-facing web application' },
          { name: 'API Gateway', type: 'application', criticality: 9, description: 'Central API routing and management' },
          { name: 'Email Service', type: 'application', criticality: 6, description: 'Email notification system' },
          { name: 'Backup System', type: 'infrastructure', criticality: 7, description: 'Data backup and recovery' },
          { name: 'Monitoring Service', type: 'application', criticality: 7, description: 'System monitoring and alerting' },
          { name: 'CDN', type: 'network', criticality: 5, description: 'Content delivery network' },
          { name: 'Storage System', type: 'storage', criticality: 8, description: 'File and object storage' },
          { name: 'Security Gateway', type: 'security', criticality: 9, description: 'Security and firewall services' }
        ];

        for (const svc of defaultServices) {
          await pool.query(
            `INSERT INTO services (game_id, name, type, status, criticality, description)
             VALUES ($1, $2, $3, 'operational', $4, $5)`,
            [gameId, svc.name, svc.type, svc.criticality, svc.description]
          );
          initResults.services++;
        }
      }

      // 2. Initialize escalation rules
      const escResult = await pool.query(
        `SELECT COUNT(*) as count FROM escalation_rules WHERE game_id = $1`,
        [gameId]
      );

      if (parseInt(escResult.rows[0].count) === 0) {
        const rules = [
          { name: 'Critical P1 - 15 min', description: 'Escalate critical incidents after 15 minutes', priority: 'critical', time: 15, level: 1, roles: ['manager', 'lead'] },
          { name: 'Critical P1 - 30 min', description: 'Major escalation for critical incidents after 30 minutes', priority: 'critical', time: 30, level: 2, roles: ['director', 'vp'] },
          { name: 'High Priority - 30 min', description: 'Escalate high priority incidents after 30 minutes', priority: 'high', time: 30, level: 1, roles: ['manager'] },
          { name: 'High Priority - 60 min', description: 'Major escalation for high priority incidents after 60 minutes', priority: 'high', time: 60, level: 2, roles: ['director'] },
          { name: 'Medium Priority - 60 min', description: 'Escalate medium priority incidents after 60 minutes', priority: 'medium', time: 60, level: 1, roles: ['lead'] }
        ];

        for (const rule of rules) {
          await pool.query(
            `INSERT INTO escalation_rules (game_id, name, description, priority_trigger, time_threshold_minutes, escalation_level, notify_roles)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [gameId, rule.name, rule.description, rule.priority, rule.time, rule.level, rule.roles]
          );
          initResults.escalationRules++;
        }
      }

      // 3. Initialize team resources for all teams
      const teamsResult = await pool.query(
        `SELECT id FROM teams WHERE game_id = $1`,
        [gameId]
      );

      const resourceService = new ResourceManagementService(pool);
      for (const team of teamsResult.rows) {
        const count = await resourceService.initializeTeamResources(team.id);
        initResults.resources += count;
      }

      // 4. Initialize shift schedules
      const shiftsCount = await resourceService.initializeShiftSchedules(gameId);
      initResults.shifts = shiftsCount;

      // 5. Initialize service dependencies
      const depService = new ServiceDependencyService(pool);
      const depCount = await depService.initializeDefaultDependencies(gameId);
      initResults.dependencies = depCount;

      // 6. Also initialize configuration_items for service health tracking
      const serviceHealthService = new ServiceHealthService(pool);
      await serviceHealthService.initializeServicesForGame(gameId, 'general_itsm');

      // 7. Update game status to active
      await pool.query(
        `UPDATE games SET status = 'active', started_at = NOW(), current_round = 1 WHERE id = $1`,
        [gameId]
      );

      // 8. Log game start event
      await pool.query(
        `INSERT INTO game_events (game_id, event_type, event_data, severity)
         VALUES ($1, 'game_started', $2, 'info')`,
        [gameId, JSON.stringify({ initResults })]
      );

      logger.info(`Game ${gameId} started with initialization: ${JSON.stringify(initResults)}`);

      return res.json({
        success: true,
        message: 'Game started successfully',
        initResults
      });
    } catch (error) {
      logger.error('Error starting game:', error);
      return res.status(500).json({ error: 'Failed to start game' });
    }
  }
  /**
   * Pause a game
   * POST /api/games/:gameId/pause
   */
  async pauseGame(req: Request, res: Response) {
    const { gameId } = req.params;
    const pool = getPool();

    try {
      const gameResult = await pool.query(
        'SELECT id, status, name FROM games WHERE id = $1',
        [gameId]
      );

      if (gameResult.rows.length === 0) {
        return res.status(404).json({ error: 'Game not found' });
      }

      const game = gameResult.rows[0];
      if (game.status !== 'active') {
        return res.status(400).json({ error: `Cannot pause game. Current status: ${game.status}` });
      }

      await pool.query(
        `UPDATE games SET status = 'paused', updated_at = NOW() WHERE id = $1`,
        [gameId]
      );

      await pool.query(
        `INSERT INTO game_events (game_id, event_type, event_data, severity)
         VALUES ($1, 'game_paused', $2, 'info')`,
        [gameId, JSON.stringify({ pausedAt: new Date().toISOString() })]
      );

      logger.info(`Game ${gameId} paused`);
      return res.json({ success: true, message: 'Game paused', status: 'paused' });
    } catch (error) {
      logger.error('Error pausing game:', error);
      return res.status(500).json({ error: 'Failed to pause game' });
    }
  }

  /**
   * Resume a paused game
   * POST /api/games/:gameId/resume
   */
  async resumeGame(req: Request, res: Response) {
    const { gameId } = req.params;
    const pool = getPool();

    try {
      const gameResult = await pool.query(
        'SELECT id, status, name FROM games WHERE id = $1',
        [gameId]
      );

      if (gameResult.rows.length === 0) {
        return res.status(404).json({ error: 'Game not found' });
      }

      const game = gameResult.rows[0];
      if (game.status !== 'paused') {
        return res.status(400).json({ error: `Cannot resume game. Current status: ${game.status}` });
      }

      await pool.query(
        `UPDATE games SET status = 'active', updated_at = NOW() WHERE id = $1`,
        [gameId]
      );

      await pool.query(
        `INSERT INTO game_events (game_id, event_type, event_data, severity)
         VALUES ($1, 'game_resumed', $2, 'info')`,
        [gameId, JSON.stringify({ resumedAt: new Date().toISOString() })]
      );

      logger.info(`Game ${gameId} resumed`);
      return res.json({ success: true, message: 'Game resumed', status: 'active' });
    } catch (error) {
      logger.error('Error resuming game:', error);
      return res.status(500).json({ error: 'Failed to resume game' });
    }
  }

  /**
   * End a game
   * POST /api/games/:gameId/end
   */
  async endGame(req: Request, res: Response) {
    const { gameId } = req.params;
    const pool = getPool();

    try {
      const gameResult = await pool.query(
        'SELECT id, status FROM games WHERE id = $1',
        [gameId]
      );

      if (gameResult.rows.length === 0) {
        return res.status(404).json({ error: 'Game not found' });
      }

      const game = gameResult.rows[0];
      if (game.status !== 'active' && game.status !== 'paused') {
        return res.status(400).json({ error: `Cannot end game. Current status: ${game.status}` });
      }

      await pool.query(
        `UPDATE games SET status = 'completed', ended_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [gameId]
      );

      await pool.query(
        `INSERT INTO game_events (game_id, event_type, event_data, severity)
         VALUES ($1, 'game_ended', $2, 'info')`,
        [gameId, JSON.stringify({ endedAt: new Date().toISOString() })]
      );

      logger.info(`Game ${gameId} ended`);
      return res.json({ success: true, message: 'Game ended', status: 'completed' });
    } catch (error) {
      logger.error('Error ending game:', error);
      return res.status(500).json({ error: 'Failed to end game' });
    }
  }

  /**
   * Delete a game and all associated data (cascading)
   * DELETE /api/games/:gameId
   */
  async deleteGame(req: Request, res: Response) {
    const { gameId } = req.params;
    const pool = getPool();

    try {
      const gameResult = await pool.query(
        'SELECT id, name, status FROM games WHERE id = $1',
        [gameId]
      );

      if (gameResult.rows.length === 0) {
        return res.status(404).json({ error: 'Game not found' });
      }

      const game = gameResult.rows[0];

      if (game.status === 'active') {
        return res.status(400).json({ error: 'Cannot delete an active game. End or pause it first.' });
      }

      // All related tables have ON DELETE CASCADE, so this single delete handles everything
      await pool.query('DELETE FROM games WHERE id = $1', [gameId]);

      logger.info(`Game deleted: ${gameId} - ${game.name}`);
      return res.json({ success: true, message: `Game "${game.name}" deleted successfully` });
    } catch (error) {
      logger.error('Error deleting game:', error);
      return res.status(500).json({ error: 'Failed to delete game' });
    }
  }

  /**
   * List all games including paused/completed for instructor to resume
   * GET /api/games/all
   */
  async listAllGames(_req: Request, res: Response) {
    try {
      const pool = getPool();
      const result = await pool.query(
        `SELECT g.*,
                (SELECT COUNT(*) FROM players p WHERE p.game_id = g.id AND p.left_at IS NULL) as player_count,
                (SELECT COUNT(*) FROM teams t WHERE t.game_id = g.id) as team_count
         FROM games g
         ORDER BY g.created_at DESC
         LIMIT 50`
      );
      return res.json({
        games: result.rows.map((g: any) => ({
          id: g.id,
          name: g.name,
          status: g.status,
          playerCount: parseInt(g.player_count),
          teamCount: parseInt(g.team_count),
          durationMinutes: g.duration_minutes,
          currentRound: g.current_round,
          maxRounds: g.max_rounds,
          startedAt: g.started_at,
          endedAt: g.ended_at,
          createdAt: g.created_at,
        })),
      });
    } catch (error) {
      logger.error('Error listing all games:', error);
      return res.status(500).json({ error: 'Failed to list games' });
    }
  }
}

export const gameController = new GameController();

