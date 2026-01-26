import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env';
import logger from '../../utils/logger';
import { IAIService, AIResponse, AIJSONResponse, AIMessageParams } from './aiService.interface';

/**
 * Claude AI Service Implementation
 *
 * Uses Anthropic's Claude API for all AI operations.
 * Implements the IAIService interface for provider-agnostic usage.
 */
export class ClaudeAIService implements IAIService {
  private client: Anthropic;
  private model: string;

  constructor() {
    this.client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY || 'dummy-key',
    });
    this.model = env.CLAUDE_MODEL;

    if (!env.ANTHROPIC_API_KEY) {
      logger.warn('ANTHROPIC_API_KEY not set. Claude AI features will be disabled.');
    } else {
      logger.info(`Claude AI service initialized with model: ${this.model}`);
    }
  }

  /**
   * Sanitize JSON string by properly escaping control characters within string values.
   * Claude sometimes returns JSON with unescaped newlines/tabs inside strings.
   */
  private sanitizeJsonString(text: string): string {
    const jsonMatch = text.match(/\[[\s\S]*\]/) || text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return text;
    }

    let jsonStr = jsonMatch[0];
    let result = '';
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr[i];
      const charCode = char.charCodeAt(0);

      if (escapeNext) {
        result += char;
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        result += char;
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        result += char;
        continue;
      }

      if (inString && charCode < 32) {
        if (charCode === 10) result += '\\n';
        else if (charCode === 13) result += '\\r';
        else if (charCode === 9) result += '\\t';
        else result += '\\u' + charCode.toString(16).padStart(4, '0');
      } else {
        result += char;
      }
    }

    return result;
  }

  /**
   * Strip markdown code block wrappers that Claude sometimes adds around JSON.
   */
  private stripMarkdownCodeBlocks(text: string): string {
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
    }
    return jsonText;
  }

  private ensureApiKey(): void {
    if (!env.ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY === 'dummy-key') {
      throw new Error('Anthropic API key not configured');
    }
  }

  async sendMessage(params: AIMessageParams): Promise<AIResponse> {
    this.ensureApiKey();
    const startTime = Date.now();

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: params.maxTokens || 2048,
        temperature: params.temperature ?? 1.0,
        system: params.systemPrompt,
        messages: [
          { role: 'user', content: params.userPrompt },
        ],
      });

      const latency = Date.now() - startTime;
      logger.info(`Claude response received in ${latency}ms`);

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
    } catch (error: any) {
      logger.error('Claude API error:', error?.message || error);
      throw error;
    }
  }

  async sendMessageJSON<T = any>(params: AIMessageParams): Promise<AIJSONResponse<T>> {
    const result = await this.sendMessage(params);

    try {
      let jsonText = this.stripMarkdownCodeBlocks(result.response);
      jsonText = this.sanitizeJsonString(jsonText);
      const data = JSON.parse(jsonText) as T;

      return {
        data,
        usage: result.usage,
      };
    } catch (error) {
      logger.error('Failed to parse Claude JSON response:', result.response.substring(0, 500));
      throw new Error('AI response was not valid JSON');
    }
  }

  async generateScenarioResponse(prompt: string, context?: string): Promise<string> {
    this.ensureApiKey();

    const systemPrompt = `You are an AI assistant for HawkOps, an ITSM business simulation game.
You help generate realistic IT service management scenarios, incidents, and responses.
${context ? `Context: ${context}` : ''}`;

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        { role: 'user', content: prompt },
      ],
    });

    const textContent = message.content.find(block => block.type === 'text');
    return textContent && 'text' in textContent ? textContent.text : '';
  }

  async generateScenarios(params: {
    domains: string[];
    additionalContext?: string;
    difficultyLevel?: number;
    estimatedDuration?: number;
  }): Promise<any[]> {
    this.ensureApiKey();

    const { domains, additionalContext, difficultyLevel = 5, estimatedDuration = 75 } = params;

    const prompt = `Generate 5 distinct ITSM simulation scenarios based on the following criteria:

Selected ITSM Domains: ${domains.join(', ')}
${additionalContext ? `Additional Context: ${additionalContext}` : ''}
Difficulty Level: ${difficultyLevel}/10
Target Duration: ${estimatedDuration} minutes

For each scenario, provide:
1. A compelling, professional title (max 80 characters)
2. A detailed 2-3 paragraph description of the situation that sets the scene
3. 3-5 specific, measurable learning objectives
4. Primary ITSM domain (choose from the selected domains)
5. Secondary ITSM domains (1-3 additional domains from the selected list)
6. Key challenges participants will face (3-5 bullet points)
7. Estimated difficulty rating (1-10)

Ensure scenarios are:
- Realistic and based on real-world ITSM situations
- Engaging with clear stakes and urgency
- Appropriate for the specified difficulty level
- Distinct from each other with different focuses
- Professionally written

IMPORTANT: Return ONLY a valid JSON array with 5 scenario objects. No explanations, no markdown formatting.
Each object should have these exact fields: title, description, learningObjectives (array), primaryDomain, secondaryDomains (array), keyChallenges (array), difficulty.`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4000,
      system: 'You are an ITSM expert and instructional designer creating simulation scenarios for professional training.',
      messages: [
        { role: 'user', content: prompt },
      ],
    });

    const textContent = response.content.find(block => block.type === 'text');
    const text = textContent && 'text' in textContent ? textContent.text : '';

    try {
      const sanitizedText = this.sanitizeJsonString(text);
      const scenarios = JSON.parse(sanitizedText);
      if (Array.isArray(scenarios) && scenarios.length === 5) {
        return scenarios;
      }
      throw new Error('Invalid scenario format');
    } catch (parseError) {
      logger.error('Error parsing scenarios:', parseError);
      throw new Error('Failed to parse AI-generated scenarios');
    }
  }

  async generateDocuments(params: {
    scenario: any;
    gameName: string;
    teams: Array<{ id: string; name: string; role: string }>;
    duration: number;
    rounds: number;
  }): Promise<any[]> {
    this.ensureApiKey();

    const { scenario, gameName, teams, duration, rounds } = params;
    const teamList = teams.map(t => `- ${t.name} (${t.role})`).join('\n');

    const prompt = `Generate simulation documents for: ${gameName}

Scenario: ${scenario.title}
Domains: ${scenario.primaryDomain}, ${scenario.secondaryDomains.join(', ')}
Difficulty: ${scenario.difficulty}/10 | Duration: ${duration}min | Rounds: ${rounds}
Teams: ${teamList}

Create these documents (be concise but complete):

1. Instructor Playbook (instructor_playbook): Timeline, incident injection plan, evaluation criteria, answer key
2. General Briefing (general_briefing): Background, objectives, rules, timeline, resources
3. Team Packets (team_packet, one per team): Role, resources, metrics, challenges

Use markdown. Keep content focused and practical.

Return ONLY valid JSON array: [{documentType, title, content, visibility, teamId}]
- visibility: "instructor_only" for playbook, "all_participants" for general, "team_only" for team packets
- teamId: null for general, exact team name for team packets`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: 'You are an expert ITSM instructor creating detailed simulation materials.',
      messages: [
        { role: 'user', content: prompt },
      ],
    });

    const textContent = response.content.find(block => block.type === 'text');
    const text = textContent && 'text' in textContent ? textContent.text : '';

    try {
      const sanitizedText = this.sanitizeJsonString(text);
      const documents = JSON.parse(sanitizedText);
      if (Array.isArray(documents)) {
        return documents;
      }
      throw new Error('Invalid documents format');
    } catch (parseError) {
      logger.error('Error parsing documents:', parseError);
      throw new Error('Failed to parse AI-generated documents');
    }
  }
}
