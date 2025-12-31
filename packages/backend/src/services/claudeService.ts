import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env';
import logger from '../utils/logger';

class ClaudeService {
  private client: Anthropic;

  constructor() {
    if (!env.ANTHROPIC_API_KEY) {
      logger.warn('ANTHROPIC_API_KEY not set. Claude AI features will be disabled.');
    }

    this.client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY || 'dummy-key',
    });
  }

  /**
   * Generate AI response for game scenarios
   */
  async generateScenarioResponse(prompt: string, context?: string): Promise<string> {
    try {
      const systemPrompt = `You are an AI assistant for HawkOps, an ITSM business simulation game.
You help generate realistic IT service management scenarios, incidents, and responses.
${context ? `Context: ${context}` : ''}`;

      const message = await this.client.messages.create({
        model: env.CLAUDE_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const textContent = message.content.find(block => block.type === 'text');
      return textContent && 'text' in textContent ? textContent.text : '';
    } catch (error) {
      logger.error('Error generating Claude response:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  /**
   * Analyze player action and generate consequences
   */
  async analyzeAction(action: string, gameState: any): Promise<any> {
    try {
      const prompt = `Analyze this ITSM action and determine its consequences:

Action: ${action}

Game State: ${JSON.stringify(gameState, null, 2)}

Provide a realistic assessment of:
1. Immediate impact
2. Long-term consequences
3. Stakeholder reactions
4. Metrics changes (customer satisfaction, SLA compliance, etc.)

Format your response as JSON.`;

      const response = await this.generateScenarioResponse(prompt);

      try {
        return JSON.parse(response);
      } catch {
        return { analysis: response };
      }
    } catch (error) {
      logger.error('Error analyzing action:', error);
      throw new Error('Failed to analyze action');
    }
  }

  /**
   * Generate incident scenario
   */
  async generateIncident(difficulty: 'easy' | 'medium' | 'hard'): Promise<any> {
    try {
      const prompt = `Generate a realistic IT incident scenario for an ITSM simulation game.

Difficulty: ${difficulty}

Include:
1. Incident title
2. Description
3. Affected services
4. Initial symptoms
5. Priority level
6. Potential root causes (don't reveal directly)
7. Recommended investigation steps

Format as JSON.`;

      const response = await this.generateScenarioResponse(prompt);

      try {
        return JSON.parse(response);
      } catch {
        return { description: response };
      }
    } catch (error) {
      logger.error('Error generating incident:', error);
      throw new Error('Failed to generate incident');
    }
  }

  /**
   * Provide hints or guidance based on game state
   */
  async provideGuidance(situation: string, teamRole: string): Promise<string> {
    try {
      const prompt = `As an ITSM mentor, provide guidance for a ${teamRole} team facing this situation:

${situation}

Provide helpful but not overly specific advice that helps them learn ITSM best practices.`;

      return await this.generateScenarioResponse(prompt);
    } catch (error) {
      logger.error('Error providing guidance:', error);
      throw new Error('Failed to provide guidance');
    }
  }
}

export const claudeService = new ClaudeService();
