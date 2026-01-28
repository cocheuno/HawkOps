import {
  IAIService,
  AIResponse,
  AIJSONResponse,
  AIMessageParams,
} from './aiService.interface';
import logger from '../../utils/logger';

/**
 * Custom error class for AI service errors with user-friendly messages
 */
export class AIServiceError extends Error {
  public readonly userMessage: string;
  public readonly isRetryable: boolean;
  public readonly statusCode?: number;

  constructor(
    message: string,
    userMessage: string,
    isRetryable: boolean = false,
    statusCode?: number
  ) {
    super(message);
    this.name = 'AIServiceError';
    this.userMessage = userMessage;
    this.isRetryable = isRetryable;
    this.statusCode = statusCode;
  }
}

/**
 * Configuration for retry behavior
 */
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatusCodes: number[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  retryableStatusCodes: [429, 500, 502, 503, 504],
};

/**
 * Resilient AI Service Wrapper
 *
 * Wraps an IAIService implementation and adds:
 * - Automatic retry with exponential backoff for transient errors
 * - Rate limit (429) handling with appropriate delays
 * - Graceful error messages for end users
 * - Comprehensive logging
 */
export class ResilientAIService implements IAIService {
  private baseService: IAIService;
  private retryConfig: RetryConfig;

  constructor(baseService: IAIService, retryConfig?: Partial<RetryConfig>) {
    this.baseService = baseService;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  /**
   * Sleep for a specified number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number, retryAfterMs?: number): number {
    if (retryAfterMs) {
      return Math.min(retryAfterMs, this.retryConfig.maxDelayMs);
    }

    const exponentialDelay = this.retryConfig.baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, this.retryConfig.maxDelayMs);
  }

  /**
   * Extract status code and retry-after from error
   */
  private extractErrorInfo(error: any): { statusCode?: number; retryAfterMs?: number } {
    const statusCode = error?.response?.status || error?.status || error?.statusCode;
    let retryAfterMs: number | undefined;

    // Check for Retry-After header (can be seconds or date)
    const retryAfter =
      error?.response?.headers?.['retry-after'] || error?.headers?.['retry-after'];
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        retryAfterMs = seconds * 1000;
      }
    }

    return { statusCode, retryAfterMs };
  }

  /**
   * Convert error to user-friendly AIServiceError
   */
  private toServiceError(error: any): AIServiceError {
    const { statusCode } = this.extractErrorInfo(error);
    const errorMessage = error?.message || 'Unknown error';

    // Rate limiting
    if (statusCode === 429) {
      return new AIServiceError(
        `Rate limited: ${errorMessage}`,
        'AI service is busy. Please wait a moment and try again.',
        true,
        429
      );
    }

    // Authentication errors
    if (statusCode === 401 || statusCode === 403) {
      return new AIServiceError(
        `Authentication error: ${errorMessage}`,
        'AI service authentication failed. Please contact your instructor.',
        false,
        statusCode
      );
    }

    // Server errors
    if (statusCode && statusCode >= 500) {
      return new AIServiceError(
        `Server error (${statusCode}): ${errorMessage}`,
        'AI service is temporarily unavailable. Please try again in a few minutes.',
        true,
        statusCode
      );
    }

    // Network errors
    if (
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('network') ||
      errorMessage.includes('fetch failed')
    ) {
      return new AIServiceError(
        `Network error: ${errorMessage}`,
        'Unable to connect to AI service. Please check your internet connection.',
        true
      );
    }

    // API key errors
    if (errorMessage.includes('API key') || errorMessage.includes('not configured')) {
      return new AIServiceError(
        `Configuration error: ${errorMessage}`,
        'AI service is not properly configured. Please contact your instructor.',
        false
      );
    }

    // JSON parsing errors
    if (errorMessage.includes('JSON') || errorMessage.includes('parse')) {
      return new AIServiceError(
        `Parse error: ${errorMessage}`,
        'AI response was invalid. Please try again.',
        true
      );
    }

    // Default error
    return new AIServiceError(
      errorMessage,
      'An error occurred with the AI service. Please try again.',
      false
    );
  }

  /**
   * Execute a function with retry logic
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: AIServiceError | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        const serviceError = this.toServiceError(error);
        lastError = serviceError;

        const { statusCode, retryAfterMs } = this.extractErrorInfo(error);
        const isRetryable =
          serviceError.isRetryable ||
          (statusCode && this.retryConfig.retryableStatusCodes.includes(statusCode));

        if (isRetryable && attempt < this.retryConfig.maxRetries) {
          const delay = this.calculateDelay(attempt, retryAfterMs);
          logger.warn(
            `AI ${operationName} failed (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1}), retrying in ${Math.round(delay / 1000)}s: ${serviceError.message}`
          );
          await this.sleep(delay);
        } else {
          logger.error(
            `AI ${operationName} failed after ${attempt + 1} attempt(s): ${serviceError.message}`
          );
          throw serviceError;
        }
      }
    }

    throw lastError || new AIServiceError('Unexpected error', 'An unexpected error occurred.', false);
  }

  async sendMessage(params: AIMessageParams): Promise<AIResponse> {
    return this.withRetry(() => this.baseService.sendMessage(params), 'sendMessage');
  }

  async sendMessageJSON<T = any>(params: AIMessageParams): Promise<AIJSONResponse<T>> {
    return this.withRetry(
      () => this.baseService.sendMessageJSON<T>(params),
      'sendMessageJSON'
    );
  }

  async generateScenarioResponse(prompt: string, context?: string): Promise<string> {
    return this.withRetry(
      () => this.baseService.generateScenarioResponse(prompt, context),
      'generateScenarioResponse'
    );
  }

  async generateScenarios(params: {
    domains: string[];
    additionalContext?: string;
    difficultyLevel?: number;
    estimatedDuration?: number;
  }): Promise<any[]> {
    return this.withRetry(
      () => this.baseService.generateScenarios(params),
      'generateScenarios'
    );
  }

  async generateDocuments(params: {
    scenario: any;
    gameName: string;
    teams: Array<{ id: string; name: string; role: string }>;
    duration: number;
    rounds: number;
  }): Promise<any[]> {
    return this.withRetry(
      () => this.baseService.generateDocuments(params),
      'generateDocuments'
    );
  }
}
