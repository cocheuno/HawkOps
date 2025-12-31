import { Server, Socket } from 'socket.io';
import logger from '../utils/logger';

export function chatHandlers(io: Server, socket: Socket) {
  // Send chat message
  socket.on('chat:send', async (data: { gameId: string; teamId: string; message: string; userId: string; userName: string }) => {
    try {
      const { gameId, teamId, message, userId, userName } = data;

      logger.info(`Chat message from ${userName} in team ${teamId}`);

      const chatMessage = {
        id: `msg_${Date.now()}_${userId}`,
        userId,
        userName,
        teamId,
        message,
        timestamp: new Date().toISOString()
      };

      // Broadcast to team
      io.to(`team:${teamId}`).emit('chat:message', chatMessage);

      // TODO: Store message in database for persistence
    } catch (error) {
      logger.error('Error sending chat message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // User typing indicator
  socket.on('chat:typing', async (data: { teamId: string; userId: string; userName: string; isTyping: boolean }) => {
    try {
      const { teamId, userId, userName, isTyping } = data;

      socket.to(`team:${teamId}`).emit('chat:userTyping', {
        userId,
        userName,
        isTyping
      });
    } catch (error) {
      logger.error('Error broadcasting typing indicator:', error);
    }
  });
}
