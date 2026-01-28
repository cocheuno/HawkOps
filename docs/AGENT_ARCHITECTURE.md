# HawkOps AI Agent Architecture

## Overview

This document describes an architecture for AI agents that can play as student team members in HawkOps simulations. Agents can be used for demos, testing, training, or to fill empty team slots.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HawkOps Server                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  REST API   │  │  WebSocket  │  │  Database   │  │  AI Game Master     │ │
│  │  /api/*     │  │  Events     │  │  PostgreSQL │  │  (Incident Gen)     │ │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘  └─────────────────────┘ │
└─────────┼────────────────┼──────────────────────────────────────────────────┘
          │                │
          ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Agent Orchestrator                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  AgentManager                                                            ││
│  │  - Spawns/manages team agents                                            ││
│  │  - Coordinates cross-team communication                                  ││
│  │  - Handles game lifecycle events                                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────────────┐│
│  │ ServiceDeskAgent  │  │ TechOpsAgent      │  │ ManagementAgent           ││
│  │                   │  │                   │  │                           ││
│  │ • Triage incidents│  │ • Investigate     │  │ • Review changes          ││
│  │ • First response  │  │ • Create plans    │  │ • Approve/reject          ││
│  │ • Escalate        │  │ • Resolve issues  │  │ • Resource allocation     ││
│  │ • Stakeholder     │  │ • Submit changes  │  │ • Strategic decisions     ││
│  │   communication   │  │                   │  │                           ││
│  └───────────────────┘  └───────────────────┘  └───────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Agent Base Class

All agents share common functionality:

```typescript
// packages/agents/src/base/BaseAgent.ts

import { AIService } from './AIService';

export interface AgentConfig {
  gameId: string;
  teamId: string;
  playerId: string;
  accessToken: string;
  apiBaseUrl: string;
  aiService: AIService;
  personality?: 'cautious' | 'balanced' | 'aggressive';
  decisionDelayMs?: number; // Simulate human think time
}

export interface GameState {
  game: {
    id: string;
    name: string;
    status: 'lobby' | 'active' | 'paused' | 'completed';
    currentRound: number;
    maxRounds: number;
  };
  team: {
    id: string;
    name: string;
    role: string;
    score: number;
    budget: number;
    morale: number;
  };
  incidents: Incident[];
  implementationPlans: ImplementationPlan[];
  changeRequests: ChangeRequest[];
  challenges: Challenge[];
}

export abstract class BaseAgent {
  protected config: AgentConfig;
  protected gameState: GameState | null = null;
  protected isRunning: boolean = false;
  protected pollIntervalMs: number = 5000;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  // Main agent loop
  async run(): Promise<void> {
    this.isRunning = true;
    console.log(`[${this.getAgentType()}] Agent started for team ${this.config.teamId}`);

    while (this.isRunning) {
      try {
        // 1. Fetch current game state
        await this.refreshGameState();

        // 2. Check if game is active
        if (this.gameState?.game.status !== 'active') {
          await this.sleep(this.pollIntervalMs);
          continue;
        }

        // 3. Perceive - analyze current situation
        const perception = await this.perceive();

        // 4. Decide - use AI to determine next action
        const decision = await this.decide(perception);

        // 5. Act - execute the decision
        if (decision) {
          await this.simulateThinkTime();
          await this.act(decision);
        }

        // 6. Wait before next cycle
        await this.sleep(this.pollIntervalMs);

      } catch (error) {
        console.error(`[${this.getAgentType()}] Error in agent loop:`, error);
        await this.sleep(this.pollIntervalMs * 2); // Back off on error
      }
    }
  }

  stop(): void {
    this.isRunning = false;
    console.log(`[${this.getAgentType()}] Agent stopped`);
  }

  // Abstract methods - implemented by specific agent types
  abstract getAgentType(): string;
  abstract perceive(): Promise<AgentPerception>;
  abstract decide(perception: AgentPerception): Promise<AgentDecision | null>;
  abstract act(decision: AgentDecision): Promise<void>;

  // Shared utilities
  protected async refreshGameState(): Promise<void> {
    const response = await fetch(
      `${this.config.apiBaseUrl}/student/team/${this.config.teamId}/dashboard`,
      {
        headers: { Authorization: `Bearer ${this.config.accessToken}` }
      }
    );
    this.gameState = await response.json();
  }

  protected async simulateThinkTime(): Promise<void> {
    const delay = this.config.decisionDelayMs || 2000 + Math.random() * 3000;
    await this.sleep(delay);
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // API helpers
  protected async updateIncidentStatus(incidentId: string, status: string): Promise<void> {
    await fetch(
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
  }

  protected async createImplementationPlan(plan: Partial<ImplementationPlan>): Promise<void> {
    await fetch(
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
  }

  protected async submitChangeRequest(changeRequest: Partial<ChangeRequest>): Promise<void> {
    await fetch(
      `${this.config.apiBaseUrl}/games/${this.config.gameId}/change-requests`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(changeRequest)
      }
    );
  }
}

export interface AgentPerception {
  urgentIncidents: Incident[];
  pendingWork: Incident[];
  plansNeedingAttention: ImplementationPlan[];
  changesNeedingReview: ChangeRequest[];
  activeChallenges: Challenge[];
  teamHealth: {
    budget: number;
    morale: number;
    workload: 'low' | 'medium' | 'high' | 'overloaded';
  };
  recommendations: string[];
}

export interface AgentDecision {
  action: string;
  target?: string;
  params?: Record<string, any>;
  reasoning: string;
  priority: number;
}
```

### 2. Service Desk Agent

Handles first-line support, triage, and stakeholder communication:

```typescript
// packages/agents/src/agents/ServiceDeskAgent.ts

import { BaseAgent, AgentPerception, AgentDecision } from '../base/BaseAgent';

export class ServiceDeskAgent extends BaseAgent {
  getAgentType(): string {
    return 'ServiceDesk';
  }

  async perceive(): Promise<AgentPerception> {
    const incidents = this.gameState?.incidents || [];

    // Categorize incidents by urgency
    const urgentIncidents = incidents.filter(i =>
      i.status === 'open' &&
      (i.priority === 'critical' || i.priority === 'high' || this.isSLAAtRisk(i))
    );

    const pendingWork = incidents.filter(i =>
      i.status === 'open' || i.status === 'in_progress'
    );

    // Calculate workload
    const workload = pendingWork.length <= 2 ? 'low' :
                     pendingWork.length <= 4 ? 'medium' :
                     pendingWork.length <= 6 ? 'high' : 'overloaded';

    return {
      urgentIncidents,
      pendingWork,
      plansNeedingAttention: [],
      changesNeedingReview: [],
      activeChallenges: this.gameState?.challenges || [],
      teamHealth: {
        budget: this.gameState?.team.budget || 0,
        morale: this.gameState?.team.morale || 75,
        workload
      },
      recommendations: this.generateRecommendations(urgentIncidents, workload)
    };
  }

  async decide(perception: AgentPerception): Promise<AgentDecision | null> {
    // Priority 1: Handle urgent SLA-at-risk incidents
    if (perception.urgentIncidents.length > 0) {
      const incident = perception.urgentIncidents[0];

      // If critical/high and not started, escalate immediately
      if (incident.priority === 'critical' && incident.status === 'open') {
        return {
          action: 'escalate',
          target: incident.id,
          params: { toTeam: 'Technical Operations', reason: 'Critical priority requires immediate technical attention' },
          reasoning: `Critical incident ${incident.incidentNumber} needs immediate escalation`,
          priority: 1
        };
      }

      // Start work on high priority
      if (incident.status === 'open') {
        return {
          action: 'start_work',
          target: incident.id,
          reasoning: `Starting work on ${incident.priority} priority incident ${incident.incidentNumber}`,
          priority: 2
        };
      }
    }

    // Priority 2: Start work on oldest open incident
    const openIncidents = perception.pendingWork.filter(i => i.status === 'open');
    if (openIncidents.length > 0) {
      const oldest = openIncidents.sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )[0];

      return {
        action: 'start_work',
        target: oldest.id,
        reasoning: `Processing oldest open incident ${oldest.incidentNumber}`,
        priority: 3
      };
    }

    // Priority 3: Resolve in-progress incidents that can be handled at L1
    const inProgress = perception.pendingWork.filter(i =>
      i.status === 'in_progress' && this.canResolveAtL1(i)
    );
    if (inProgress.length > 0) {
      return {
        action: 'resolve',
        target: inProgress[0].id,
        params: { resolution: 'Resolved by Service Desk following standard procedures' },
        reasoning: `Resolving L1-appropriate incident ${inProgress[0].incidentNumber}`,
        priority: 4
      };
    }

    // Priority 4: Escalate complex incidents to Tech Ops
    const needsEscalation = perception.pendingWork.filter(i =>
      i.status === 'in_progress' && !this.canResolveAtL1(i)
    );
    if (needsEscalation.length > 0) {
      return {
        action: 'escalate',
        target: needsEscalation[0].id,
        params: { toTeam: 'Technical Operations', reason: 'Requires technical investigation' },
        reasoning: `Escalating complex incident ${needsEscalation[0].incidentNumber} to Tech Ops`,
        priority: 5
      };
    }

    return null; // No action needed
  }

  async act(decision: AgentDecision): Promise<void> {
    console.log(`[ServiceDesk] Executing: ${decision.action} - ${decision.reasoning}`);

    switch (decision.action) {
      case 'start_work':
        await this.updateIncidentStatus(decision.target!, 'in_progress');
        break;

      case 'resolve':
        await this.updateIncidentStatus(decision.target!, 'resolved');
        break;

      case 'escalate':
        await this.escalateIncident(decision.target!, decision.params!);
        break;

      case 'respond_to_stakeholder':
        await this.sendStakeholderResponse(decision.target!, decision.params!);
        break;
    }
  }

  private isSLAAtRisk(incident: Incident): boolean {
    if (!incident.slaDeadline) return false;
    const remaining = new Date(incident.slaDeadline).getTime() - Date.now();
    const threshold = 5 * 60 * 1000; // 5 minutes
    return remaining < threshold;
  }

  private canResolveAtL1(incident: Incident): boolean {
    // Simple heuristic - L1 can resolve low/medium, non-infrastructure issues
    const l1Resolvable = ['password_reset', 'access_request', 'how_to', 'known_error'];
    return incident.priority === 'low' ||
           incident.priority === 'medium' ||
           l1Resolvable.some(tag => incident.title.toLowerCase().includes(tag));
  }

  private generateRecommendations(urgent: Incident[], workload: string): string[] {
    const recs: string[] = [];
    if (urgent.length > 0) recs.push(`${urgent.length} urgent incidents need attention`);
    if (workload === 'overloaded') recs.push('Consider escalating lower-priority items');
    return recs;
  }

  private async escalateIncident(incidentId: string, params: any): Promise<void> {
    await fetch(
      `${this.config.apiBaseUrl}/teams/${this.config.teamId}/incidents/${incidentId}/escalate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      }
    );
  }

  private async sendStakeholderResponse(messageId: string, params: any): Promise<void> {
    await fetch(
      `${this.config.apiBaseUrl}/games/${this.config.gameId}/stakeholder-responses`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messageId, ...params })
      }
    );
  }
}
```

### 3. Technical Operations Agent

Handles investigation, implementation plans, and technical resolution:

```typescript
// packages/agents/src/agents/TechOpsAgent.ts

import { BaseAgent, AgentPerception, AgentDecision } from '../base/BaseAgent';

export class TechOpsAgent extends BaseAgent {
  getAgentType(): string {
    return 'TechOps';
  }

  async perceive(): Promise<AgentPerception> {
    const incidents = this.gameState?.incidents || [];
    const plans = this.gameState?.implementationPlans || [];

    const urgentIncidents = incidents.filter(i =>
      (i.status === 'open' || i.status === 'in_progress') &&
      (i.priority === 'critical' || i.priority === 'high')
    );

    const pendingWork = incidents.filter(i =>
      i.status === 'open' || i.status === 'in_progress'
    );

    // Plans needing work
    const plansNeedingAttention = plans.filter(p =>
      p.status === 'draft' ||
      p.status === 'ai_needs_revision' ||
      p.status === 'ai_approved' // Ready for change request
    );

    const workload = pendingWork.length + plansNeedingAttention.length <= 3 ? 'low' :
                     pendingWork.length + plansNeedingAttention.length <= 6 ? 'medium' :
                     pendingWork.length + plansNeedingAttention.length <= 9 ? 'high' : 'overloaded';

    return {
      urgentIncidents,
      pendingWork,
      plansNeedingAttention,
      changesNeedingReview: [],
      activeChallenges: this.gameState?.challenges || [],
      teamHealth: {
        budget: this.gameState?.team.budget || 0,
        morale: this.gameState?.team.morale || 75,
        workload
      },
      recommendations: []
    };
  }

  async decide(perception: AgentPerception): Promise<AgentDecision | null> {
    // Priority 1: Create implementation plans for critical incidents without plans
    const incidentsNeedingPlans = perception.urgentIncidents.filter(i =>
      !this.hasImplementationPlan(i.id)
    );

    if (incidentsNeedingPlans.length > 0) {
      const incident = incidentsNeedingPlans[0];
      const plan = await this.generateImplementationPlan(incident);

      return {
        action: 'create_plan',
        target: incident.id,
        params: { plan },
        reasoning: `Creating implementation plan for ${incident.priority} incident ${incident.incidentNumber}`,
        priority: 1
      };
    }

    // Priority 2: Submit approved plans for change request
    const approvedPlans = perception.plansNeedingAttention.filter(p =>
      p.status === 'ai_approved'
    );

    if (approvedPlans.length > 0) {
      return {
        action: 'submit_change_request',
        target: approvedPlans[0].id,
        reasoning: `Submitting change request for approved plan ${approvedPlans[0].planNumber}`,
        priority: 2
      };
    }

    // Priority 3: Revise plans that need revision
    const needsRevision = perception.plansNeedingAttention.filter(p =>
      p.status === 'ai_needs_revision'
    );

    if (needsRevision.length > 0) {
      const revisedPlan = await this.reviseImplementationPlan(needsRevision[0]);
      return {
        action: 'revise_plan',
        target: needsRevision[0].id,
        params: { plan: revisedPlan },
        reasoning: `Revising plan ${needsRevision[0].planNumber} based on AI feedback`,
        priority: 3
      };
    }

    // Priority 4: Start work on assigned incidents
    const openIncidents = perception.pendingWork.filter(i => i.status === 'open');
    if (openIncidents.length > 0) {
      return {
        action: 'start_work',
        target: openIncidents[0].id,
        reasoning: `Starting investigation on incident ${openIncidents[0].incidentNumber}`,
        priority: 4
      };
    }

    // Priority 5: Resolve incidents with approved changes
    const resolvable = perception.pendingWork.filter(i =>
      i.status === 'in_progress' && this.hasApprovedChange(i.id)
    );

    if (resolvable.length > 0) {
      return {
        action: 'resolve',
        target: resolvable[0].id,
        params: { resolution: 'Resolved after implementing approved change' },
        reasoning: `Resolving incident ${resolvable[0].incidentNumber} - change implemented`,
        priority: 5
      };
    }

    return null;
  }

  async act(decision: AgentDecision): Promise<void> {
    console.log(`[TechOps] Executing: ${decision.action} - ${decision.reasoning}`);

    switch (decision.action) {
      case 'start_work':
        await this.updateIncidentStatus(decision.target!, 'in_progress');
        break;

      case 'resolve':
        await this.updateIncidentStatus(decision.target!, 'resolved');
        break;

      case 'create_plan':
        await this.createImplementationPlan(decision.params!.plan);
        break;

      case 'revise_plan':
        await this.updateImplementationPlan(decision.target!, decision.params!.plan);
        break;

      case 'submit_change_request':
        await this.submitChangeRequestForPlan(decision.target!);
        break;
    }
  }

  private hasImplementationPlan(incidentId: string): boolean {
    return this.gameState?.implementationPlans.some(p =>
      p.incidentId === incidentId
    ) || false;
  }

  private hasApprovedChange(incidentId: string): boolean {
    const plan = this.gameState?.implementationPlans.find(p =>
      p.incidentId === incidentId
    );
    if (!plan) return false;

    return this.gameState?.changeRequests.some(cr =>
      cr.relatedPlanId === plan.id && cr.status === 'approved'
    ) || false;
  }

  private async generateImplementationPlan(incident: Incident): Promise<Partial<ImplementationPlan>> {
    // Use AI to generate a realistic implementation plan
    const prompt = `Generate an implementation plan for this IT incident:

Title: ${incident.title}
Description: ${incident.description}
Priority: ${incident.priority}
Severity: ${incident.severity}

Create a professional implementation plan with:
1. Root cause analysis
2. 5-7 implementation steps
3. Risk assessment
4. Rollback plan
5. Estimated effort (in hours)

Return as JSON with fields: title, description, rootCauseAnalysis, implementationSteps (array), riskLevel, riskMitigation, rollbackPlan, estimatedEffortHours`;

    const response = await this.config.aiService.generateJSON(prompt);

    return {
      incidentId: incident.id,
      ...response
    };
  }

  private async reviseImplementationPlan(plan: ImplementationPlan): Promise<Partial<ImplementationPlan>> {
    const prompt = `Revise this implementation plan based on the AI feedback:

Current Plan:
${JSON.stringify(plan, null, 2)}

AI Feedback:
${plan.aiFeedback}

Improve the plan to address the feedback. Return the complete revised plan as JSON.`;

    return await this.config.aiService.generateJSON(prompt);
  }

  private async updateImplementationPlan(planId: string, updates: any): Promise<void> {
    await fetch(
      `${this.config.apiBaseUrl}/teams/${this.config.teamId}/implementation-plans/${planId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      }
    );
  }

  private async submitChangeRequestForPlan(planId: string): Promise<void> {
    await fetch(
      `${this.config.apiBaseUrl}/teams/${this.config.teamId}/implementation-plans/${planId}/create-change-request`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
  }
}
```

### 4. Management/CAB Agent

Handles change approvals and strategic decisions:

```typescript
// packages/agents/src/agents/ManagementAgent.ts

import { BaseAgent, AgentPerception, AgentDecision } from '../base/BaseAgent';

export class ManagementAgent extends BaseAgent {
  getAgentType(): string {
    return 'Management';
  }

  async perceive(): Promise<AgentPerception> {
    // Fetch pending change requests for CAB review
    const changeRequests = await this.fetchPendingChangeRequests();

    return {
      urgentIncidents: [],
      pendingWork: [],
      plansNeedingAttention: [],
      changesNeedingReview: changeRequests.filter(cr =>
        cr.workflowState === 'pending_cab' || cr.workflowState === 'under_review'
      ),
      activeChallenges: this.gameState?.challenges || [],
      teamHealth: {
        budget: this.gameState?.team.budget || 0,
        morale: this.gameState?.team.morale || 75,
        workload: changeRequests.length <= 2 ? 'low' :
                  changeRequests.length <= 5 ? 'medium' : 'high'
      },
      recommendations: []
    };
  }

  async decide(perception: AgentPerception): Promise<AgentDecision | null> {
    const pendingChanges = perception.changesNeedingReview;

    if (pendingChanges.length === 0) {
      return null;
    }

    // Priority 1: Emergency changes need immediate decision
    const emergencyChanges = pendingChanges.filter(cr => cr.changeType === 'emergency');
    if (emergencyChanges.length > 0) {
      const change = emergencyChanges[0];
      const decision = await this.evaluateChangeRequest(change);

      return {
        action: decision.approve ? 'approve_change' : 'reject_change',
        target: change.id,
        params: { notes: decision.notes },
        reasoning: `Emergency change ${change.changeNumber}: ${decision.reasoning}`,
        priority: 1
      };
    }

    // Priority 2: High-risk changes need thorough review
    const highRiskChanges = pendingChanges.filter(cr =>
      cr.riskLevel === 'high' || cr.riskLevel === 'critical'
    );

    if (highRiskChanges.length > 0) {
      const change = highRiskChanges[0];

      // Request technical review if not done
      if (change.workflowState === 'pending_cab') {
        return {
          action: 'request_technical_review',
          target: change.id,
          reasoning: `High-risk change ${change.changeNumber} needs technical review`,
          priority: 2
        };
      }

      // Make decision after review
      const decision = await this.evaluateChangeRequest(change);
      return {
        action: decision.approve ? 'approve_change' : 'reject_change',
        target: change.id,
        params: { notes: decision.notes },
        reasoning: `High-risk change ${change.changeNumber}: ${decision.reasoning}`,
        priority: 2
      };
    }

    // Priority 3: Process normal changes
    const normalChanges = pendingChanges.filter(cr =>
      cr.changeType === 'normal' && cr.workflowState === 'pending_cab'
    );

    if (normalChanges.length > 0) {
      const change = normalChanges[0];
      const decision = await this.evaluateChangeRequest(change);

      return {
        action: decision.approve ? 'approve_change' : 'reject_change',
        target: change.id,
        params: { notes: decision.notes },
        reasoning: `Normal change ${change.changeNumber}: ${decision.reasoning}`,
        priority: 3
      };
    }

    return null;
  }

  async act(decision: AgentDecision): Promise<void> {
    console.log(`[Management] Executing: ${decision.action} - ${decision.reasoning}`);

    switch (decision.action) {
      case 'approve_change':
        await this.approveChangeRequest(decision.target!, decision.params?.notes);
        break;

      case 'reject_change':
        await this.rejectChangeRequest(decision.target!, decision.params?.notes);
        break;

      case 'request_technical_review':
        await this.requestTechnicalReview(decision.target!);
        break;
    }
  }

  private async fetchPendingChangeRequests(): Promise<ChangeRequest[]> {
    const response = await fetch(
      `${this.config.apiBaseUrl}/games/${this.config.gameId}/change-requests?status=pending`,
      {
        headers: { Authorization: `Bearer ${this.config.accessToken}` }
      }
    );
    const data = await response.json();
    return data.changeRequests || [];
  }

  private async evaluateChangeRequest(change: ChangeRequest): Promise<{
    approve: boolean;
    notes: string;
    reasoning: string;
  }> {
    // Use AI to evaluate the change request
    const prompt = `Evaluate this IT change request as a CAB member:

Change Request: ${change.changeNumber}
Title: ${change.title}
Description: ${change.description}
Type: ${change.changeType}
Risk Level: ${change.riskLevel}
Implementation Plan: ${change.implementationPlan}
Rollback Plan: ${change.rollbackPlan}
Affected Services: ${change.affectedServices?.join(', ')}
${change.technicalReviewNotes ? `Technical Review Notes: ${change.technicalReviewNotes}` : ''}

Consider:
1. Is the risk assessment accurate?
2. Is the implementation plan thorough?
3. Is the rollback plan adequate?
4. Are there any compliance concerns?
5. Is the timing appropriate?

Return JSON: { approve: boolean, notes: string, reasoning: string }`;

    const result = await this.config.aiService.generateJSON(prompt);

    // Apply personality bias
    if (this.config.personality === 'cautious') {
      // More likely to request additional review or reject
      if (change.riskLevel === 'high' || change.riskLevel === 'critical') {
        result.approve = false;
        result.notes = 'Requires additional risk mitigation steps. ' + result.notes;
      }
    } else if (this.config.personality === 'aggressive') {
      // More likely to approve quickly
      if (change.changeType === 'emergency') {
        result.approve = true;
      }
    }

    return result;
  }

  private async approveChangeRequest(changeId: string, notes?: string): Promise<void> {
    await fetch(
      `${this.config.apiBaseUrl}/games/${this.config.gameId}/change-requests/${changeId}/approve`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes })
      }
    );
  }

  private async rejectChangeRequest(changeId: string, notes?: string): Promise<void> {
    await fetch(
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
  }

  private async requestTechnicalReview(changeId: string): Promise<void> {
    await fetch(
      `${this.config.apiBaseUrl}/games/${this.config.gameId}/change-requests/${changeId}/request-review`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reviewTeam: 'Technical Operations' })
      }
    );
  }
}
```

### 5. Agent Manager

Orchestrates multiple agents for a game:

```typescript
// packages/agents/src/AgentManager.ts

import { BaseAgent, AgentConfig } from './base/BaseAgent';
import { ServiceDeskAgent } from './agents/ServiceDeskAgent';
import { TechOpsAgent } from './agents/TechOpsAgent';
import { ManagementAgent } from './agents/ManagementAgent';
import { AIService } from './services/AIService';

export interface GameAgentConfig {
  gameId: string;
  apiBaseUrl: string;
  aiService: AIService;
  teams: Array<{
    teamId: string;
    role: 'Service Desk' | 'Technical Operations' | 'Management/CAB';
    playerId: string;
    accessToken: string;
    personality?: 'cautious' | 'balanced' | 'aggressive';
  }>;
}

export class AgentManager {
  private agents: Map<string, BaseAgent> = new Map();
  private config: GameAgentConfig;

  constructor(config: GameAgentConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    for (const team of this.config.teams) {
      const agentConfig: AgentConfig = {
        gameId: this.config.gameId,
        teamId: team.teamId,
        playerId: team.playerId,
        accessToken: team.accessToken,
        apiBaseUrl: this.config.apiBaseUrl,
        aiService: this.config.aiService,
        personality: team.personality || 'balanced',
        decisionDelayMs: 2000 + Math.random() * 3000 // 2-5 seconds
      };

      let agent: BaseAgent;

      switch (team.role) {
        case 'Service Desk':
          agent = new ServiceDeskAgent(agentConfig);
          break;
        case 'Technical Operations':
          agent = new TechOpsAgent(agentConfig);
          break;
        case 'Management/CAB':
          agent = new ManagementAgent(agentConfig);
          break;
        default:
          console.warn(`Unknown team role: ${team.role}`);
          continue;
      }

      this.agents.set(team.teamId, agent);
      console.log(`[AgentManager] Initialized ${team.role} agent for team ${team.teamId}`);
    }
  }

  async startAll(): Promise<void> {
    console.log(`[AgentManager] Starting ${this.agents.size} agents...`);

    const promises: Promise<void>[] = [];
    for (const [teamId, agent] of this.agents) {
      promises.push(agent.run());
    }

    // Agents run concurrently
    await Promise.all(promises);
  }

  stopAll(): void {
    console.log(`[AgentManager] Stopping all agents...`);
    for (const agent of this.agents.values()) {
      agent.stop();
    }
  }

  getAgent(teamId: string): BaseAgent | undefined {
    return this.agents.get(teamId);
  }
}
```

### 6. Usage Example

```typescript
// packages/agents/src/example.ts

import { AgentManager } from './AgentManager';
import { GeminiAIService } from './services/GeminiAIService';

async function runAgentSimulation() {
  // Initialize AI service
  const aiService = new GeminiAIService(process.env.GEMINI_API_KEY!);

  // Configure agents for a game
  const manager = new AgentManager({
    gameId: 'game-uuid-here',
    apiBaseUrl: 'http://localhost:3000/api',
    aiService,
    teams: [
      {
        teamId: 'service-desk-team-uuid',
        role: 'Service Desk',
        playerId: 'player-1-uuid',
        accessToken: 'jwt-token-for-player-1',
        personality: 'balanced'
      },
      {
        teamId: 'tech-ops-team-uuid',
        role: 'Technical Operations',
        playerId: 'player-2-uuid',
        accessToken: 'jwt-token-for-player-2',
        personality: 'aggressive' // Quick to act
      },
      {
        teamId: 'management-team-uuid',
        role: 'Management/CAB',
        playerId: 'player-3-uuid',
        accessToken: 'jwt-token-for-player-3',
        personality: 'cautious' // Thorough review
      }
    ]
  });

  // Initialize and start
  await manager.initialize();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down agents...');
    manager.stopAll();
    process.exit(0);
  });

  // Run until stopped
  await manager.startAll();
}

runAgentSimulation().catch(console.error);
```

## Configuration Options

### Agent Personalities

| Personality | Service Desk | Tech Ops | Management |
|-------------|--------------|----------|------------|
| `cautious` | Escalates more readily | Thorough plans, more revisions | Stricter approval criteria |
| `balanced` | Standard triage rules | Normal planning cycle | Risk-based decisions |
| `aggressive` | Quick resolution attempts | Fast plans, may skip steps | Faster approvals |

### Timing Controls

| Parameter | Default | Description |
|-----------|---------|-------------|
| `pollIntervalMs` | 5000 | How often to check for new work |
| `decisionDelayMs` | 2000-5000 | Simulated "think time" before actions |

## Benefits of Using Agents

1. **Demo Mode**: Run full simulations without needing human players
2. **Training**: Students can observe how "expert" agents handle situations
3. **Hybrid Teams**: Mix AI and human players on the same team
4. **Stress Testing**: See how the system handles high activity levels
5. **Benchmarking**: Establish performance baselines to compare against
6. **After-Hours**: Run extended simulations overnight for analytics

## Future Enhancements

1. **Learning Agents**: Agents that improve based on game outcomes
2. **Persona Library**: Pre-built agent personalities (novice, expert, chaotic)
3. **WebSocket Support**: Real-time event-driven instead of polling
4. **Multi-Agent Coordination**: Agents that communicate with each other
5. **Replay Mode**: Record and replay agent decision sequences
