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
        const scenarios = JSON.parse(text);
        if (Array.isArray(scenarios) && scenarios.length === 5) {
          return scenarios;
        }
        throw new Error('Invalid scenario format');
      } catch (parseError) {
        logger.error('Error parsing scenarios:', parseError);
        logger.error('Raw response:', text);
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

      const prompt = `Generate comprehensive simulation documents for the following ITSM scenario:

**Game Name**: ${gameName}
**Scenario Title**: ${scenario.title}
**Description**: ${scenario.description}
**Learning Objectives**: ${scenario.learningObjectives.join(', ')}
**Primary Domain**: ${scenario.primaryDomain}
**Secondary Domains**: ${scenario.secondaryDomains.join(', ')}
**Difficulty**: ${scenario.difficulty}/10
**Duration**: ${duration} minutes
**Rounds**: ${rounds}

**Teams**:
${teamList}

Generate the following documents in JSON format:

1. **Instructor Playbook** (instructor_playbook)
   - Detailed scenario timeline with specific timestamps
   - Incident injection plan (what incidents to inject and when)
   - Expected participant challenges and how to address them
   - Evaluation criteria with specific metrics
   - Answer key with best practices and optimal solutions
   - Debriefing guide with key questions

2. **General Briefing** (general_briefing)
   - Scenario background that sets the context
   - Mission objectives (what participants need to achieve)
   - Rules of engagement
   - Timeline and structure
   - Available resources

3. **Team Packets** (team_packet, one for EACH team)
   - Team-specific role and responsibilities tailored to their expertise
   - Available resources and budget
   - Success metrics specific to their role
   - Team-specific challenges they'll face
   - Escalation procedures

Use markdown formatting for all content. Be specific, detailed, and realistic.

IMPORTANT: Return ONLY a valid JSON array of document objects. No explanations, no markdown code blocks.
Each document object must have: documentType, title, content (markdown string), visibility, teamId (null for general docs, team ID string for team-specific).

For team packets, create one document per team with teamId set to the team name (exact match from the list above).`;

      // Use Sonnet for document generation as it produces better quality detailed content
      // Haiku's 4096 token limit may be insufficient for multiple comprehensive documents
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20240620',
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
        const documents = JSON.parse(text);
        if (Array.isArray(documents)) {
          return documents;
        }
        throw new Error('Invalid documents format');
      } catch (parseError) {
        logger.error('Error parsing documents:', parseError);
        logger.error('Raw response:', text);
        throw new Error('Failed to parse AI-generated documents');
      }
    } catch (error) {
      logger.error('Error generating documents:', error);
      throw new Error('Failed to generate documents');
    }
  }
}

export const claudeService = new ClaudeService();
