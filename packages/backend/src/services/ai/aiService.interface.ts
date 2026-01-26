/**
 * AIService Interface
 *
 * Provider-agnostic interface for AI services used throughout HawkOps.
 * Implementations exist for Anthropic Claude and Google Gemini.
 *
 * To switch providers, set the AI_PROVIDER environment variable:
 *   AI_PROVIDER=claude   (default) - Uses Anthropic Claude API
 *   AI_PROVIDER=gemini              - Uses Google Gemini API
 */

/** Response from a text generation call */
export interface AIResponse {
  response: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

/** Response from a JSON generation call */
export interface AIJSONResponse<T = any> {
  data: T;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

/** Parameters for a text generation call */
export interface AIMessageParams {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Core AI service interface.
 *
 * Used by:
 * - AIGameMasterService (incident generation)
 * - ImplementationPlanController (plan evaluation)
 * - AIController (scenario/document generation)
 * - StakeholderCommService (stakeholder comms)
 * - PIRService (PIR grading)
 */
export interface IAIService {
  /** Send a prompt and get a text response */
  sendMessage(params: AIMessageParams): Promise<AIResponse>;

  /** Send a prompt expecting a JSON response, parsed and validated */
  sendMessageJSON<T = any>(params: AIMessageParams): Promise<AIJSONResponse<T>>;

  /** Generate a simple text response (convenience method for scenario prompts) */
  generateScenarioResponse(prompt: string, context?: string): Promise<string>;

  /** Generate 5 scenario options */
  generateScenarios(params: {
    domains: string[];
    additionalContext?: string;
    difficultyLevel?: number;
    estimatedDuration?: number;
  }): Promise<any[]>;

  /** Generate simulation documents for a selected scenario */
  generateDocuments(params: {
    scenario: any;
    gameName: string;
    teams: Array<{ id: string; name: string; role: string }>;
    duration: number;
    rounds: number;
  }): Promise<any[]>;
}
