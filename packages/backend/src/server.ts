import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join } from 'path';
import app, { configureSession } from './app';
import { initializeSocket } from './socket';
import { connectDatabase, disconnectDatabase } from './config/database';
import { connectRedis, disconnectRedis, createRedisStore } from './config/redis';
import { env } from './config/env';
import logger from './utils/logger';

const httpServer = createServer(app);
const io = initializeSocket(httpServer);

async function startServer() {
  try {
    // Connect to database
    const pool = await connectDatabase();
    logger.info('Database connected successfully');

    // Run migrations
    try {
      logger.info('Running database migrations...');

      // Look in source directory since .sql files aren't compiled to dist/
      const isProduction = process.env.NODE_ENV === 'production';
      const srcPath = isProduction
        ? join(__dirname, '../src/database')  // In production, go from dist/ to src/
        : join(__dirname, 'database');        // In dev, relative to dist/

      const schemaSQL = readFileSync(
        join(srcPath, 'schema.sql'),
        'utf-8'
      );
      await pool.query(schemaSQL);
      logger.info('Database migrations completed successfully');
    } catch (error) {
      logger.error('Migration failed:', error);
      // Don't fail startup if migrations fail - tables might already exist
      logger.warn('Continuing server startup despite migration warning');
    }

    // Connect to Redis
    await connectRedis();
    logger.info('Redis connected successfully');

    // Configure session with Redis store
    const redisStore = createRedisStore();
    configureSession(redisStore);
    logger.info('Session middleware configured');

    // Start HTTP server
    httpServer.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);

      // Close HTTP server
      httpServer.close(async () => {
        logger.info('HTTP server closed');

        // Disconnect from database
        await disconnectDatabase();
        logger.info('Database disconnected');

        // Disconnect from Redis
        await disconnectRedis();
        logger.info('Redis disconnected');

        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { io };
