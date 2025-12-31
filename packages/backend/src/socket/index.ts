import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from '../config/env';
import logger from '../utils/logger';
import { gameHandlers } from './gameHandlers';
import { teamHandlers } from './teamHandlers';
import { chatHandlers } from './chatHandlers';

export function initializeSocket(httpServer: HTTPServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: env.SOCKET_CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Middleware for authentication
  io.use((socket, next) => {
    const sessionId = socket.handshake.auth.sessionId;
    if (!sessionId) {
      return next(new Error('Authentication error'));
    }
    // TODO: Validate session with Redis
    next();
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`Client connected: ${socket.id}`);

    // Register event handlers
    gameHandlers(io, socket);
    teamHandlers(io, socket);
    chatHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });
  });

  return io;
}
