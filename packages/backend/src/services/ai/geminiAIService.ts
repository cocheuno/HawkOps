import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { env } from '../../config/env';
import logger from '../../utils/logger';
import { IAIService, AIResponse, AIJSONResponse, AIMessageParams } from './aiService.interface';

/**
 * Gemini AI Service Implementation
 *
 * Uses Google's Gemini API for all AI operations.
 * Implements the IAIService interface for provider-agnostic usage.
 */
export class GeminiAIService implements IAIService {
  private client: GoogleGenerativeAI;
  private modelName: string;

  constructor() {
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.warn('GEMINI_API_KEY not set. Gemini AI features will be disabled.');
    }

    this.client = new GoogleGenerativeAI(apiKey || 'dummy-key');
    this.modelName = env.GEMINI_MODEL;
    if (apiKey) {
      logger.info(`Gemini AI service initialized with model: ${this.modelName}`);
    }
  }

  private getModel(systemInstruction?: string): GenerativeModel {
    return this.client.getGenerativeModel({
      model: this.modelName,
      ...(systemInstruction ? { systemInstruction } : {}),
    });
  }

  private ensureApiKey(): void {
    if (!env.GEMINI_API_KEY || env.GEMINI_API_KEY === 'dummy-key') {
      throw new Error('Gemini API key not configured');
    }
  }

  /**
   * Strip markdown code block wrappers that Gemini sometimes adds around JSON.
   */
  private stripMarkdownCodeBlocks(text: string): string {
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }
    return jsonText;
  }

  /**
   * Sanitize JSON string by escaping control characters within string values.
   */
  private sanitizeJsonString(text: string): string {
    const jsonMatch = text.match(/\[[\s\S]*\]/) || text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return text;

    let jsonStr = jsonMatch[0];
    let result = '';
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr[i];
      const charCode = char.charCodeAt(0);

      if (escapeNext) { result += char; escapeNext = false; continue; }
      if (char === '\\') { result += char; escapeNext = true; continue; }
      if (char === '"') { inString = !inString; result += char; continue; }

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
   * Estimate token count from text length.
   * Gemini doesn't always return token usage in the same way as Claude,
   * so we estimate when not available.
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  async sendMessage(params: AIMessageParams): Promise<AIResponse> {
    this.ensureApiKey();
    const startTime = Date.now();

    try {
      const model = this.getModel(params.systemPrompt);
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: params.userPrompt }] }],
        generationConfig: {
          maxOutputTokens: params.maxTokens || 2048,
          temperature: params.temperature ?? 1.0,
        },
      });

      const latency = Date.now() - startTime;
      logger.info(`Gemini response received in ${latency}ms`);

      const response = result.response;
      const text = response.text();

      const usage = response.usageMetadata;

      return {
        response: text,
        usage: {
          inputTokens: usage?.promptTokenCount ?? this.estimateTokens(params.userPrompt + params.systemPrompt),
          outputTokens: usage?.candidatesTokenCount ?? this.estimateTokens(text),
        },
      };
    } catch (error: any) {
      logger.error('Gemini API error:', error?.message || error);
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
      logger.error('Failed to parse Gemini JSON response:', result.response.substring(0, 500));
      throw new Error('AI response was not valid JSON');
    }
  }

  async generateScenarioResponse(prompt: string, context?: string): Promise<string> {
    this.ensureApiKey();

    const systemPrompt = `You are an AI assistant for HawkOps, an ITSM business simulation game.
You help generate realistic IT service management scenarios, incidents, and responses.
${context ? `Context: ${context}` : ''}`;

    const model = this.getModel(systemPrompt);
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 2048 },
    });

    return result.response.text();
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

    const model = this.getModel(
      'You are an ITSM expert and instructional designer creating simulation scenarios for professional training.'
    );

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 4000 },
    });

    const text = result.response.text();

    try {
      let jsonText = this.stripMarkdownCodeBlocks(text);
      jsonText = this.sanitizeJsonString(jsonText);
      const scenarios = JSON.parse(jsonText);
      if (Array.isArray(scenarios) && scenarios.length === 5) {
        return scenarios;
      }
      throw new Error('Invalid scenario format');
    } catch (parseError) {
      logger.error('Error parsing Gemini scenarios:', parseError);
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

    const model = this.getModel(
      'You are an expert ITSM instructor creating detailed simulation materials.'
    );

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 4096 },
    });

    const text = result.response.text();

    try {
      let jsonText = this.stripMarkdownCodeBlocks(text);
      jsonText = this.sanitizeJsonString(jsonText);
      const documents = JSON.parse(jsonText);
      if (Array.isArray(documents)) {
        return documents;
      }
      throw new Error('Invalid documents format');
    } catch (parseError) {
      logger.error('Error parsing Gemini documents:', parseError);
      throw new Error('Failed to parse AI-generated documents');
    }
  }
}
