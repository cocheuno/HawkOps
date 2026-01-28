import { AgentConfig, AgentPersonality } from './types.js';
import { AIService } from './services/AIService.js';
import { BaseAgent } from './base/BaseAgent.js';
import { ServiceDeskAgent } from './agents/ServiceDeskAgent.js';
import { TechOpsAgent } from './agents/TechOpsAgent.js';
import { ManagementAgent } from './agents/ManagementAgent.js';

export type AgentRole = 'service_desk' | 'tech_ops' | 'management' | 'full_team';

export interface AgentManagerConfig {
  gameId: string;
  teamId: string;
  playerId: string;
  accessToken: string;
  apiBaseUrl: string;
  geminiApiKey: string;
  roles: AgentRole[];
  personality?: AgentPersonality;
  pollIntervalMs?: number;
  decisionDelayMs?: number;
  verbose?: boolean;
}

/**
 * AgentManager orchestrates multiple AI agents
 * to act as a complete IT Operations team
 */
export class AgentManager {
  private config: AgentManagerConfig;
  private aiService: AIService;
  private agents: BaseAgent[] = [];
  private isRunning: boolean = false;

  constructor(config: AgentManagerConfig) {
    this.config = {
      pollIntervalMs: 5000,
      decisionDelayMs: 3000,
      personality: 'balanced',
      verbose: true,
      ...config
    };

    this.aiService = new AIService(config.geminiApiKey);
  }

  /**
   * Initialize and create the requested agents
   */
  initialize(): void {
    const agentConfig: AgentConfig = {
      gameId: this.config.gameId,
      teamId: this.config.teamId,
      playerId: this.config.playerId,
      accessToken: this.config.accessToken,
      apiBaseUrl: this.config.apiBaseUrl,
      personality: this.config.personality,
      pollIntervalMs: this.config.pollIntervalMs,
      decisionDelayMs: this.config.decisionDelayMs,
      verbose: this.config.verbose
    };

    // Determine which agents to create
    const roles = this.config.roles.includes('full_team')
      ? ['service_desk', 'tech_ops', 'management'] as AgentRole[]
      : this.config.roles;

    for (const role of roles) {
      switch (role) {
        case 'service_desk':
          this.agents.push(new ServiceDeskAgent(agentConfig, this.aiService));
          break;
        case 'tech_ops':
          this.agents.push(new TechOpsAgent(agentConfig, this.aiService));
          break;
        case 'management':
          this.agents.push(new ManagementAgent(agentConfig, this.aiService));
          break;
      }
    }

    this.log(`Initialized ${this.agents.length} agent(s): ${roles.join(', ')}`);
  }

  /**
   * Start all agents
   */
  async start(): Promise<void> {
    if (this.agents.length === 0) {
      this.initialize();
    }

    this.isRunning = true;
    this.log('Starting agent team...');

    // Start all agents concurrently
    const agentPromises = this.agents.map(agent => {
      return agent.run().catch(error => {
        console.error(`[AgentManager] Agent ${agent.getAgentType()} crashed:`, error);
      });
    });

    // Wait for all agents (they run indefinitely until stopped)
    await Promise.all(agentPromises);

    this.log('All agents stopped');
  }

  /**
   * Stop all agents
   */
  stop(): void {
    this.log('Stopping agent team...');
    this.isRunning = false;
    this.agents.forEach(agent => agent.stop());
  }

  /**
   * Get status of all agents
   */
  getStatus(): { agent: string; running: boolean }[] {
    return this.agents.map(agent => ({
      agent: agent.getAgentType(),
      running: this.isRunning
    }));
  }

  private log(message: string): void {
    if (this.config.verbose !== false) {
      console.log(`[AgentManager] ${message}`);
    }
  }
}

/**
 * Factory function to create an agent manager with a single role
 */
export function createAgent(
  role: AgentRole,
  config: Omit<AgentManagerConfig, 'roles'>
): AgentManager {
  return new AgentManager({ ...config, roles: [role] });
}

/**
 * Factory function to create a full agent team
 */
export function createFullTeam(
  config: Omit<AgentManagerConfig, 'roles'>
): AgentManager {
  return new AgentManager({ ...config, roles: ['full_team'] });
}
