import { env } from '../../config/env';
import { IAIService } from './aiService.interface';
import { ClaudeAIService } from './claudeAIService';
import { GeminiAIService } from './geminiAIService';
import { ResilientAIService, AIServiceError } from './resilientAIService';
import logger from '../../utils/logger';

/**
 * AI Service Factory
 *
 * Creates the appropriate AI service based on the AI_PROVIDER environment variable.
 * Defaults to 'gemini' if not set.
 *
 * All services are wrapped with resilient retry logic for:
 * - Rate limiting (429) with automatic backoff
 * - Transient server errors (5xx)
 * - Network connectivity issues
 *
 * Usage:
 *   import { aiService } from '../services/ai';
 *   const response = await aiService.sendMessage({ ... });
 */
function createAIService(): IAIService {
  const provider = env.AI_PROVIDER;
  let baseService: IAIService;

  switch (provider) {
    case 'gemini':
      logger.info('Using Gemini AI provider (with resilient retry wrapper)');
      baseService = new GeminiAIService();
      break;
    case 'claude':
    default:
      logger.info('Using Claude AI provider (with resilient retry wrapper)');
      baseService = new ClaudeAIService();
      break;
  }

  // Wrap with resilient retry logic
  return new ResilientAIService(baseService, {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
  });
}

/** Singleton AI service instance */
export const aiService: IAIService = createAIService();

/** Get the current AI provider name for display */
export function getAIProviderInfo(): { provider: string; model: string } {
  const provider = env.AI_PROVIDER;
  if (provider === 'gemini') {
    return { provider: 'gemini', model: env.GEMINI_MODEL };
  }
  return { provider: 'claude', model: env.CLAUDE_MODEL || 'claude-3-haiku-20240307' };
}

export { IAIService, ClaudeAIService, GeminiAIService, ResilientAIService, AIServiceError };
export type { AIResponse, AIJSONResponse, AIMessageParams } from './aiService.interface';
