import {
  AgentConfig,
  AgentPerception,
  AgentDecision,
  GameState,
  Incident,
  ImplementationPlan,
  ChangeRequest,
} from '../types.js';
import { AIService } from '../services/AIService.js';

/**
 * Base class for all HawkOps agents
 * Implements the perceive-decide-act loop
 */
export abstract class BaseAgent {
  protected config: AgentConfig;
  protected aiService: AIService;
  protected gameState: GameState | null = null;
  protected implementationPlans: ImplementationPlan[] = [];
  protected changeRequests: ChangeRequest[] = [];
  protected isRunning: boolean = false;

  constructor(config: AgentConfig, aiService: AIService) {
    this.config = config;
    this.aiService = aiService;
  }

  /**
   * Main agent loop - runs until stopped
   */
  async run(): Promise<void> {
    this.isRunning = true;
    this.log('Agent started');

    while (this.isRunning) {
      try {
        // 1. Fetch current game state
        await this.refreshGameState();

        // 2. Check if game is active
        if (!this.gameState || this.gameState.game.status !== 'active') {
          if (this.gameState?.game.status === 'lobby') {
            this.log('Game in lobby, waiting...');
          } else if (this.gameState?.game.status === 'paused') {
            this.log('Game paused, waiting...');
          } else if (this.gameState?.game.status === 'completed') {
            this.log('Game completed, stopping agent');
            this.isRunning = false;
            break;
          }
          await this.sleep(this.config.pollIntervalMs || 5000);
          continue;
        }

        // 3. Perceive - analyze current situation
        const perception = await this.perceive();

        // 4. Decide - determine next action
        const decision = await this.decide(perception);

        // 5. Act - execute the decision
        if (decision) {
          await this.simulateThinkTime();
          await this.act(decision);
        }

        // 6. Wait before next cycle
        await this.sleep(this.config.pollIntervalMs || 5000);

      } catch (error) {
        this.logError('Error in agent loop', error);
        await this.sleep((this.config.pollIntervalMs || 5000) * 2); // Back off on error
      }
    }

    this.log('Agent stopped');
  }

  /**
   * Stop the agent
   */
  stop(): void {
    this.isRunning = false;
  }

  // Abstract methods - must be implemented by specific agent types
  abstract getAgentType(): string;
  abstract perceive(): Promise<AgentPerception>;
  abstract decide(perception: AgentPerception): Promise<AgentDecision | null>;
  abstract act(decision: AgentDecision): Promise<void>;

  // ==================== API Methods ====================

  /**
   * Fetch current game state from API
   */
  protected async refreshGameState(): Promise<void> {
    try {
      const response = await fetch(
        `${this.config.apiBaseUrl}/student/team/${this.config.teamId}/dashboard`,
        {
          headers: { Authorization: `Bearer ${this.config.accessToken}` }
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      this.gameState = await response.json() as GameState;

      // Also fetch implementation plans
      await this.fetchImplementationPlans();

      // Also fetch change requests
      await this.fetchChangeRequests();

    } catch (error) {
      this.logError('Failed to refresh game state', error);
    }
  }

  /**
   * Fetch implementation plans for the team
   */
  protected async fetchImplementationPlans(): Promise<void> {
    try {
      const response = await fetch(
        `${this.config.apiBaseUrl}/teams/${this.config.teamId}/implementation-plans`,
        {
          headers: { Authorization: `Bearer ${this.config.accessToken}` }
        }
      );

      if (response.ok) {
        const data = await response.json() as { plans?: ImplementationPlan[] };
        this.implementationPlans = data.plans || [];
      }
    } catch (error) {
      // Plans endpoint may not exist for all teams
      this.implementationPlans = [];
    }
  }

  /**
   * Fetch change requests for the game
   */
  protected async fetchChangeRequests(): Promise<void> {
    try {
      const response = await fetch(
        `${this.config.apiBaseUrl}/games/${this.config.gameId}/change-requests`,
        {
          headers: { Authorization: `Bearer ${this.config.accessToken}` }
        }
      );

      if (response.ok) {
        const data = await response.json() as { changeRequests?: ChangeRequest[] };
        this.changeRequests = data.changeRequests || [];
      }
    } catch (error) {
      this.changeRequests = [];
    }
  }

  /**
   * Update incident status
   */
  protected async updateIncidentStatus(incidentId: string, status: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.config.apiBaseUrl}/teams/${this.config.teamId}/incidents/${incidentId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status })
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update status: ${response.status}`);
      }

      this.log(`Updated incident ${incidentId} to ${status}`);
      return true;
    } catch (error) {
      this.logError(`Failed to update incident ${incidentId}`, error);
      return false;
    }
  }

  /**
   * Create an implementation plan
   */
  protected async createImplementationPlan(plan: Partial<ImplementationPlan>): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.config.apiBaseUrl}/teams/${this.config.teamId}/implementation-plans`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(plan)
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to create plan: ${response.status}`);
      }

      this.log(`Created implementation plan: ${plan.title}`);
      return true;
    } catch (error) {
      this.logError('Failed to create implementation plan', error);
      return false;
    }
  }

  /**
   * Submit plan for AI review
   */
  protected async submitPlanForReview(planId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.config.apiBaseUrl}/teams/${this.config.teamId}/implementation-plans/${planId}/submit`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to submit plan: ${response.status}`);
      }

      this.log(`Submitted plan ${planId} for AI review`);
      return true;
    } catch (error) {
      this.logError(`Failed to submit plan ${planId}`, error);
      return false;
    }
  }

  /**
   * Create a change request from an approved plan
   */
  protected async createChangeRequestFromPlan(planId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.config.apiBaseUrl}/teams/${this.config.teamId}/implementation-plans/${planId}/create-change-request`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to create change request: ${response.status}`);
      }

      this.log(`Created change request from plan ${planId}`);
      return true;
    } catch (error) {
      this.logError(`Failed to create change request from plan ${planId}`, error);
      return false;
    }
  }

  /**
   * Approve a change request (CAB only)
   */
  protected async approveChangeRequest(changeId: string, notes?: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.config.apiBaseUrl}/games/${this.config.gameId}/change-requests/${changeId}/approve`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ notes: notes || 'Approved by AI agent' })
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to approve: ${response.status}`);
      }

      this.log(`Approved change request ${changeId}`);
      return true;
    } catch (error) {
      this.logError(`Failed to approve change ${changeId}`, error);
      return false;
    }
  }

  /**
   * Reject a change request (CAB only)
   */
  protected async rejectChangeRequest(changeId: string, notes: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.config.apiBaseUrl}/games/${this.config.gameId}/change-requests/${changeId}/reject`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ notes })
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to reject: ${response.status}`);
      }

      this.log(`Rejected change request ${changeId}`);
      return true;
    } catch (error) {
      this.logError(`Failed to reject change ${changeId}`, error);
      return false;
    }
  }

  // ==================== Utility Methods ====================

  /**
   * Simulate human think time before acting
   */
  protected async simulateThinkTime(): Promise<void> {
    const delay = this.config.decisionDelayMs || (2000 + Math.random() * 3000);
    await this.sleep(delay);
  }

  /**
   * Sleep for specified milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if an incident's SLA is at risk
   */
  protected isSLAAtRisk(incident: Incident): boolean {
    if (!incident.slaDeadline) return false;
    const remaining = new Date(incident.slaDeadline).getTime() - Date.now();
    const threshold = 5 * 60 * 1000; // 5 minutes
    return remaining > 0 && remaining < threshold;
  }

  /**
   * Check if an incident's SLA is breached
   */
  protected isSLABreached(incident: Incident): boolean {
    if (!incident.slaDeadline) return false;
    return new Date(incident.slaDeadline).getTime() < Date.now();
  }

  /**
   * Log a message with agent context
   */
  protected log(message: string): void {
    if (this.config.verbose !== false) {
      console.log(`[${this.getAgentType()}] ${message}`);
    }
  }

  /**
   * Log an error with agent context
   */
  protected logError(message: string, error: any): void {
    console.error(`[${this.getAgentType()}] ${message}:`, error?.message || error);
  }
}
