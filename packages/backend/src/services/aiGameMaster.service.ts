import { Pool } from 'pg';
import { claudeService } from './claude.service';
import logger from '../utils/logger';

/**
 * AI Game Master Service
 * Uses Claude to generate dynamic, context-aware incidents and scenarios
 */

interface GameContext {
  gameId: string;
  gameName: string;
  scenarioType: string;
  currentRound: number;
  maxRounds: number;
  difficultyLevel: number;
  aiPersonality: string;
  teams: Array<{
    id: string;
    name: string;
    role: string;
    score: number;
    budgetRemaining: number;
    moraleLevel: number;
  }>;
  recentIncidents: Array<{
    title: string;
    priority: string;
    status: string;
    createdAt: Date;
  }>;
  technicalDebtLevel: number;
  activeIncidentCount: number;
}

interface GeneratedIncident {
  title: string;
  description: string;
  priority: 'P1' | 'P2' | 'P3';
  severity: 'critical' | 'high' | 'medium' | 'low';
  affectedService: string;
  estimatedCostPerMinute: number;
  slaMinutes: number;
  teachingPoint: string;
  aiReasoning: string;
}

export class AIGameMasterService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Generate a contextual incident using AI
   */
  async generateIncident(gameId: string): Promise<GeneratedIncident> {
    logger.info(`AI-GM: Generating incident for game ${gameId}`);

    // 1. Gather game context
    const context = await this.gatherGameContext(gameId);

    // 2. Build AI prompt
    const systemPrompt = this.buildSystemPrompt(context);
    const userPrompt = this.buildIncidentGenerationPrompt(context);

    // 3. Call Claude
    const startTime = Date.now();
    const result = await claudeService.sendMessageJSON<GeneratedIncident>({
      systemPrompt,
      userPrompt,
      maxTokens: 1500,
      temperature: 0.9, // Higher temperature for more creative scenarios
    });

    const latency = Date.now() - startTime;

    // 4. Log AI interaction
    await this.logAIInteraction({
      gameId,
      agentType: 'game_master',
      interactionType: 'incident_generation',
      fullPrompt: `${systemPrompt}\n\n${userPrompt}`,
      aiResponse: JSON.stringify(result.data),
      promptTokens: result.usage.inputTokens,
      completionTokens: result.usage.outputTokens,
      latencyMs: latency,
      contextUsed: context,
    });

    logger.info(`AI-GM: Generated ${result.data.priority} incident: "${result.data.title}"`);

    return result.data;
  }

  /**
   * Gather comprehensive game context for AI
   */
  private async gatherGameContext(gameId: string): Promise<GameContext> {
    const client = await this.pool.connect();

    try {
      // Get game details
      const gameResult = await client.query(
        `SELECT name, scenario_type, current_round, max_rounds, difficulty_level, ai_personality
         FROM games WHERE id = $1`,
        [gameId]
      );

      if (gameResult.rows.length === 0) {
        throw new Error(`Game ${gameId} not found`);
      }

      const game = gameResult.rows[0];

      // Get team summaries
      const teamsResult = await client.query(
        `SELECT id, name, role, score, budget_remaining, morale_level
         FROM teams WHERE game_id = $1`,
        [gameId]
      );

      // Get recent incidents
      const incidentsResult = await client.query(
        `SELECT title, priority, status, created_at
         FROM incidents
         WHERE game_id = $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [gameId]
      );

      // Get technical debt level
      const techDebtResult = await client.query(
        `SELECT COALESCE(SUM(debt_points), 0) as total_debt
         FROM technical_debt_log
         WHERE game_id = $1 AND resolved = false`,
        [gameId]
      );

      // Get active incident count
      const activeIncidentsResult = await client.query(
        `SELECT COUNT(*) as count
         FROM incidents
         WHERE game_id = $1 AND status NOT IN ('closed', 'resolved')`,
        [gameId]
      );

      return {
        gameId,
        gameName: game.name,
        scenarioType: game.scenario_type,
        currentRound: game.current_round,
        maxRounds: game.max_rounds,
        difficultyLevel: game.difficulty_level,
        aiPersonality: game.ai_personality,
        teams: teamsResult.rows.map((t: any) => ({
          id: t.id,
          name: t.name,
          role: t.role,
          score: t.score,
          budgetRemaining: parseFloat(t.budget_remaining),
          moraleLevel: t.morale_level,
        })),
        recentIncidents: incidentsResult.rows,
        technicalDebtLevel: parseInt(techDebtResult.rows[0].total_debt),
        activeIncidentCount: parseInt(activeIncidentsResult.rows[0].count),
      };
    } finally {
      client.release();
    }
  }

  /**
   * Build system prompt for AI Game Master
   */
  private buildSystemPrompt(context: GameContext): string {
    return `You are the AI Game Master for HawkOps, an ITSM business simulation teaching DevOps and ITIL principles.

Your role is to generate realistic, challenging IT incidents that create learning opportunities while maintaining an engaging experience.

Key Principles:
1. Incidents should have clear cause-effect relationships
2. They should require cross-team collaboration (Management, Operations, Development)
3. They must teach specific ITSM/DevOps concepts
4. Difficulty should match the current game state
5. Incidents should build on previous events (create narrative continuity)

ITSM Concepts to Teach:
- SLA management and prioritization
- Incident vs Problem Management
- Change management and CAB approval
- Technical debt consequences
- The "Three Ways" of DevOps (Flow, Feedback, Continuous Learning)
- ITIL Service Value System
- Cost of Poor Quality (COPQ)

Your personality: ${context.aiPersonality}
- "balanced": Fair but challenging, educational focus
- "strict": High pressure, realistic enterprise conditions
- "encouraging": Supportive, provides hints and guidance

Output Format:
Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "title": "Brief incident title",
  "description": "Detailed description of what's happening. Include user impact and symptoms.",
  "priority": "critical" | "high" | "medium" | "low",
  "severity": "critical" | "high" | "medium" | "low",
  "affectedService": "Name of the service/component affected",
  "estimatedCostPerMinute": number (business impact in dollars),
  "slaMinutes": number (time before SLA breach),
  "teachingPoint": "What ITSM/DevOps principle this incident teaches",
  "aiReasoning": "Why you chose this incident given the current game state"
}`;
  }

  /**
   * Build user prompt with game context
   */
  private buildIncidentGenerationPrompt(context: GameContext): string {
    const chaosLevel = this.calculateChaosLevel(context);

    return `Generate an IT incident for the current game state:

Game: "${context.gameName}"
Scenario: ${context.scenarioType}
Round: ${context.currentRound} of ${context.maxRounds}
Difficulty: ${context.difficultyLevel}/10
Current Chaos Level: ${chaosLevel}/10

Team Status:
${context.teams
  .map(
    (t) =>
      `- ${t.name} (${t.role}): Score ${t.score}, Budget $${t.budgetRemaining.toLocaleString()}, Morale ${t.moraleLevel}%`
  )
  .join('\n')}

Recent Activity:
- Active Incidents: ${context.activeIncidentCount}
- Technical Debt: ${context.technicalDebtLevel} points
- Recent Incidents: ${
      context.recentIncidents.length > 0
        ? context.recentIncidents.map((i) => `"${i.title}" (${i.priority})`).join(', ')
        : 'None'
    }

Analysis:
${this.generateAnalysis(context)}

Generate an incident that:
1. Matches the current difficulty level (${context.difficultyLevel}/10)
2. Creates interesting cross-team dependencies
3. Has a clear teaching moment
4. Feels realistic for a ${context.scenarioType} business

Return ONLY the JSON object, no other text.`;
  }

  /**
   * Calculate chaos level (0-10) based on game state
   */
  private calculateChaosLevel(context: GameContext): number {
    let chaos = 0;

    // Active incidents add chaos
    chaos += Math.min(context.activeIncidentCount * 1.5, 4);

    // Technical debt adds chaos
    chaos += Math.min(context.technicalDebtLevel / 20, 3);

    // Low team morale adds chaos
    const avgMorale = context.teams.reduce((sum, t) => sum + t.moraleLevel, 0) / context.teams.length;
    if (avgMorale < 50) chaos += 2;
    else if (avgMorale < 75) chaos += 1;

    // Budget pressure adds chaos
    const avgBudget = context.teams.reduce((sum, t) => sum + t.budgetRemaining, 0) / context.teams.length;
    if (avgBudget < 25000) chaos += 2;
    else if (avgBudget < 50000) chaos += 1;

    return Math.min(Math.round(chaos), 10);
  }

  /**
   * Generate situational analysis for AI
   */
  private generateAnalysis(context: GameContext): string {
    const analysis: string[] = [];

    // Identify struggling teams
    const strugglingTeams = context.teams.filter((t) => t.moraleLevel < 60 || t.budgetRemaining < 30000);
    if (strugglingTeams.length > 0) {
      analysis.push(`Struggling teams: ${strugglingTeams.map((t) => t.name).join(', ')}`);
    }

    // Technical debt warning
    if (context.technicalDebtLevel > 50) {
      analysis.push(`HIGH technical debt (${context.technicalDebtLevel}) - incidents more likely`);
    }

    // Incident overload
    if (context.activeIncidentCount > 3) {
      analysis.push(`Team is overloaded with ${context.activeIncidentCount} active incidents`);
    }

    // Game progression
    if (context.currentRound === 1) {
      analysis.push('Early game - introduce fundamental concepts');
    } else if (context.currentRound === context.maxRounds) {
      analysis.push('Final round - create climactic scenario that tests all skills');
    } else {
      analysis.push('Mid-game - build complexity and show consequences of earlier decisions');
    }

    return analysis.join('. ');
  }

  /**
   * Log AI interaction to database
   */
  private async logAIInteraction(params: {
    gameId: string;
    agentType: string;
    interactionType: string;
    fullPrompt: string;
    aiResponse: string;
    promptTokens: number;
    completionTokens: number;
    latencyMs: number;
    contextUsed: any;
  }): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query(
        `INSERT INTO ai_interactions
         (game_id, agent_type, interaction_type, full_prompt, ai_response,
          prompt_tokens, completion_tokens, total_tokens, latency_ms,
          context_used, outcome_category)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          params.gameId,
          params.agentType,
          params.interactionType,
          params.fullPrompt,
          params.aiResponse,
          params.promptTokens,
          params.completionTokens,
          params.promptTokens + params.completionTokens,
          params.latencyMs,
          JSON.stringify(params.contextUsed),
          'success',
        ]
      );
    } finally {
      client.release();
    }
  }
}
