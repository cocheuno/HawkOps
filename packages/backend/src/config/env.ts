import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

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

  // AI Provider: 'claude' (default) or 'gemini'
  AI_PROVIDER: (process.env.AI_PROVIDER || 'claude') as 'claude' | 'gemini',

  // Claude AI
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  CLAUDE_MODEL: process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307',

  // Gemini AI
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',

  // Email (SMTP)
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@hawkops.edu',
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'HawkOps ITSM Simulation',

  // Instructor
  INSTRUCTOR_EMAIL: process.env.INSTRUCTOR_EMAIL || 'caronet@uww.edu',

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

const aiProvider = process.env.AI_PROVIDER || 'claude';
if (aiProvider === 'claude' && !process.env.ANTHROPIC_API_KEY) {
  console.warn('Warning: ANTHROPIC_API_KEY is not set. Claude AI features will not work.');
}
if (aiProvider === 'gemini' && !process.env.GEMINI_API_KEY) {
  console.warn('Warning: GEMINI_API_KEY is not set. Gemini AI features will not work.');
}
