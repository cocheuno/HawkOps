import { Server, Socket } from 'socket.io';
import logger from '../utils/logger';

export function teamHandlers(io: Server, socket: Socket) {
  // Team-specific message
  socket.on('team:message', async (data: { teamId: string; message: string; userId: string }) => {
    try {
      const { teamId, message, userId } = data;

      logger.info(`Team message from user ${userId} in team ${teamId}`);

      // Broadcast to team members only
      io.to(`team:${teamId}`).emit('team:messageReceived', {
        userId,
        message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error sending team message:', error);
      socket.emit('error', { message: 'Failed to send team message' });
    }
  });

  // Team action coordination
  socket.on('team:coordinateAction', async (data: { teamId: string; action: any; userId: string }) => {
    try {
      const { teamId, action, userId } = data;

      logger.info(`Team action coordination from user ${userId} in team ${teamId}`);

      // Notify team members
      socket.to(`team:${teamId}`).emit('team:actionProposed', {
        userId,
        action,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error coordinating team action:', error);
      socket.emit('error', { message: 'Failed to coordinate action' });
    }
  });
}
