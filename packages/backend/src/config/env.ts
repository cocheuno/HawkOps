import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const env = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',

  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://hawkops:hawkops@localhost:5432/hawkops',

  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',

  // Session
  SESSION_SECRET: process.env.SESSION_SECRET || 'change-this-in-production',

  // Claude AI
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  CLAUDE_MODEL: process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229',

  // Game Configuration
  GAME_DURATION_MINUTES: parseInt(process.env.GAME_DURATION_MINUTES || '75', 10),
  MAX_TEAMS: parseInt(process.env.MAX_TEAMS || '3', 10),
  MAX_MEMBERS_PER_TEAM: parseInt(process.env.MAX_MEMBERS_PER_TEAM || '3', 10),

  // Socket.IO
  SOCKET_CORS_ORIGIN: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:5173',
} as const;

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'REDIS_URL', 'SESSION_SECRET'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`Warning: ${envVar} is not set in environment variables`);
  }
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('Warning: ANTHROPIC_API_KEY is not set. Claude AI features will not work.');
}
