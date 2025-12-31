import { Server, Socket } from 'socket.io';
import logger from '../utils/logger';

export function gameHandlers(io: Server, socket: Socket) {
  // Join a game session
  socket.on('game:join', async (data: { gameId: string; teamId: string; userId: string }) => {
    try {
      const { gameId, teamId, userId } = data;

      // Join the game room
      await socket.join(`game:${gameId}`);
      await socket.join(`team:${teamId}`);

      logger.info(`User ${userId} joined game ${gameId} on team ${teamId}`);

      // Notify other players
      socket.to(`game:${gameId}`).emit('game:playerJoined', {
        userId,
        teamId,
        timestamp: new Date().toISOString()
      });

      // Send game state to the joining player
      socket.emit('game:joined', {
        gameId,
        teamId,
        message: 'Successfully joined the game'
      });
    } catch (error) {
      logger.error('Error joining game:', error);
      socket.emit('error', { message: 'Failed to join game' });
    }
  });

  // Leave a game session
  socket.on('game:leave', async (data: { gameId: string; teamId: string; userId: string }) => {
    try {
      const { gameId, teamId, userId } = data;

      await socket.leave(`game:${gameId}`);
      await socket.leave(`team:${teamId}`);

      logger.info(`User ${userId} left game ${gameId}`);

      // Notify other players
      socket.to(`game:${gameId}`).emit('game:playerLeft', {
        userId,
        teamId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error leaving game:', error);
    }
  });

  // Submit an action
  socket.on('game:action', async (data: { gameId: string; action: any }) => {
    try {
      const { gameId, action } = data;

      logger.info(`Action submitted for game ${gameId}:`, action);

      // TODO: Process action through game engine
      // TODO: Update game state
      // TODO: Calculate consequences

      // Broadcast action to all players in the game
      io.to(`game:${gameId}`).emit('game:actionProcessed', {
        action,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error processing action:', error);
      socket.emit('error', { message: 'Failed to process action' });
    }
  });

  // Game state update
  socket.on('game:requestState', async (data: { gameId: string }) => {
    try {
      const { gameId } = data;

      // TODO: Fetch current game state from database
      const gameState = {
        gameId,
        status: 'active',
        currentTime: new Date().toISOString(),
        // Add more game state data
      };

      socket.emit('game:stateUpdate', gameState);
    } catch (error) {
      logger.error('Error fetching game state:', error);
      socket.emit('error', { message: 'Failed to fetch game state' });
    }
  });
}
