import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env';
import logger from '../utils/logger';

/**
 * Claude AI Service
 * Wrapper around Anthropic SDK for structured AI interactions
 */
export class ClaudeService {
  private client: Anthropic;
  private model: string;

  constructor() {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    this.client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
    });

    this.model = env.CLAUDE_MODEL;
    logger.info(`Claude service initialized with model: ${this.model}`);
  }

  /**
   * Send a prompt to Claude and get a text response
   */
  async sendMessage(params: {
    systemPrompt: string;
    userPrompt: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<{
    response: string;
    usage: {
      inputTokens: number;
      outputTokens: number;
    };
  }> {
    const startTime = Date.now();

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: params.maxTokens || 2048,
        temperature: params.temperature || 1.0,
        system: params.systemPrompt,
        messages: [
          {
            role: 'user',
            content: params.userPrompt,
          },
        ],
      });

      const latency = Date.now() - startTime;
      logger.info(`Claude response received in ${latency}ms`);

      // Extract text content from response
      const textContent = message.content.find((block) => block.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in Claude response');
      }

      return {
        response: textContent.text,
        usage: {
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
        },
      };
    } catch (error) {
      logger.error('Claude API error:', error);
      throw error;
    }
  }

  /**
   * Send a prompt expecting JSON response
   * Parses the response and validates it's valid JSON
   */
  async sendMessageJSON<T = any>(params: {
    systemPrompt: string;
    userPrompt: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<{
    data: T;
    usage: {
      inputTokens: number;
      outputTokens: number;
    };
  }> {
    const result = await this.sendMessage(params);

    try {
      // Try to extract JSON from the response
      // Claude sometimes wraps JSON in markdown code blocks
      let jsonText = result.response.trim();

      // Remove markdown code blocks if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      const data = JSON.parse(jsonText) as T;

      return {
        data,
        usage: result.usage,
      };
    } catch (error) {
      logger.error('Failed to parse Claude JSON response:', result.response);
      throw new Error('Claude response was not valid JSON');
    }
  }

  /**
   * Stream a response from Claude (for future use)
   * Currently not implemented but included for completeness
   */
  async *streamMessage(params: {
    systemPrompt: string;
    userPrompt: string;
    maxTokens?: number;
  }): AsyncGenerator<string> {
    const stream = await this.client.messages.create({
      model: this.model,
      max_tokens: params.maxTokens || 2048,
      system: params.systemPrompt,
      messages: [
        {
          role: 'user',
          content: params.userPrompt,
        },
      ],
      stream: true,
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text;
      }
    }
  }
}

// Singleton instance
export const claudeService = new ClaudeService();
