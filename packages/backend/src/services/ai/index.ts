import { env } from '../../config/env';
import { IAIService } from './aiService.interface';
import { ClaudeAIService } from './claudeAIService';
import { GeminiAIService } from './geminiAIService';
import logger from '../../utils/logger';

/**
 * AI Service Factory
 *
 * Creates the appropriate AI service based on the AI_PROVIDER environment variable.
 * Defaults to 'claude' if not set.
 *
 * Usage:
 *   import { aiService } from '../services/ai';
 *   const response = await aiService.sendMessage({ ... });
 */
function createAIService(): IAIService {
  const provider = env.AI_PROVIDER;

  switch (provider) {
    case 'gemini':
      logger.info('Using Gemini AI provider');
      return new GeminiAIService();
    case 'claude':
    default:
      logger.info('Using Claude AI provider');
      return new ClaudeAIService();
  }
}

/** Singleton AI service instance */
export const aiService: IAIService = createAIService();

export { IAIService, ClaudeAIService, GeminiAIService };
export type { AIResponse, AIJSONResponse, AIMessageParams } from './aiService.interface';
