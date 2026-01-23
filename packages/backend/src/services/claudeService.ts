import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env';
import logger from '../utils/logger';

class ClaudeService {
  private client: Anthropic;

  /**
   * Sanitize JSON string by properly escaping control characters within string values
   */
  private sanitizeJsonString(text: string): string {
    // First, try to extract JSON array from the response (in case there's extra text)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return text;
    }

    let jsonStr = jsonMatch[0];

    // Fix control characters within JSON string values
    // This regex finds string content between quotes and escapes unescaped control characters
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

      // If we're inside a string and find a control character, escape it
      if (inString && charCode < 32) {
        if (charCode === 10) { // newline
          result += '\\n';
        } else if (charCode === 13) { // carriage return
          result += '\\r';
        } else if (charCode === 9) { // tab
          result += '\\t';
        } else {
          // Other control characters - use unicode escape
          result += '\\u' + charCode.toString(16).padStart(4, '0');
        }
      } else {
        result += char;
      }
    }

    return result;
  }

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
      // Check if API key is available
      if (!env.ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY === 'dummy-key') {
        logger.warn('Anthropic API key not configured, using fallback response');
        throw new Error('API key not configured');
      }

      const systemPrompt = `You are an AI assistant for HawkOps, an ITSM business simulation game.
You help generate realistic IT service management scenarios, incidents, and responses.
${context ? `Context: ${context}` : ''}`;

      const message = await this.client.messages.create({
        model: env.CLAUDE_MODEL,
        max_tokens: 2048,
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
    } catch (error: any) {
      logger.error('Error generating Claude response:', error?.message || error);
      throw new Error(`Failed to generate AI response: ${error?.message || 'Unknown error'}`);
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

  /**
   * Generate 5 scenario options based on selected ITSM domains
   */
  async generateScenarios(params: {
    domains: string[];
    additionalContext?: string;
    difficultyLevel?: number;
    estimatedDuration?: number;
  }): Promise<any[]> {
    try {
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
        model: env.CLAUDE_MODEL,
        max_tokens: 4000,
        system: 'You are an ITSM expert and instructional designer creating simulation scenarios for professional training.',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const textContent = response.content.find(block => block.type === 'text');
      const text = textContent && 'text' in textContent ? textContent.text : '';

      try {
        // Sanitize the response to handle control characters in string values
        const sanitizedText = this.sanitizeJsonString(text);
        const scenarios = JSON.parse(sanitizedText);
        if (Array.isArray(scenarios) && scenarios.length === 5) {
          return scenarios;
        }
        throw new Error('Invalid scenario format');
      } catch (parseError) {
        logger.error('Error parsing scenarios:', parseError);
        logger.error('Raw response length:', text.length);
        throw new Error('Failed to parse AI-generated scenarios');
      }
    } catch (error) {
      logger.error('Error generating scenarios:', error);
      throw new Error('Failed to generate scenarios');
    }
  }

  /**
   * Generate all simulation documents for a selected scenario
   */
  async generateDocuments(params: {
    scenario: any;
    gameName: string;
    teams: Array<{ id: string; name: string; role: string }>;
    duration: number;
    rounds: number;
  }): Promise<any[]> {
    try {
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

      // Use configured model (Haiku) with 4096 max tokens
      const response = await this.client.messages.create({
        model: env.CLAUDE_MODEL,
        max_tokens: 4096,
        system: 'You are an expert ITSM instructor creating detailed simulation materials.',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const textContent = response.content.find(block => block.type === 'text');
      const text = textContent && 'text' in textContent ? textContent.text : '';

      try {
        // Sanitize the response to handle control characters in string values
        const sanitizedText = this.sanitizeJsonString(text);
        const documents = JSON.parse(sanitizedText);
        if (Array.isArray(documents)) {
          return documents;
        }
        throw new Error('Invalid documents format');
      } catch (parseError) {
        logger.error('Error parsing documents:', parseError);
        logger.error('Raw response length:', text.length);
        throw new Error('Failed to parse AI-generated documents');
      }
    } catch (error) {
      logger.error('Error generating documents:', error);
      throw new Error('Failed to generate documents');
    }
  }
}

export const claudeService = new ClaudeService();
