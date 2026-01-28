// Main exports for @hawkops/agents

// Types
export * from './types.js';

// Services
export { AIService } from './services/AIService.js';

// Base class
export { BaseAgent } from './base/BaseAgent.js';

// Agents
export { ServiceDeskAgent } from './agents/ServiceDeskAgent.js';
export { TechOpsAgent } from './agents/TechOpsAgent.js';
export { ManagementAgent } from './agents/ManagementAgent.js';

// Manager
export {
  AgentManager,
  AgentManagerConfig,
  AgentRole,
  createAgent,
  createFullTeam
} from './AgentManager.js';
