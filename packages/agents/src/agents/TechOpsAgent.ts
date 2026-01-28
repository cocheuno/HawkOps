import { BaseAgent } from '../base/BaseAgent.js';
import { AgentPerception, AgentDecision, Incident, ImplementationPlan } from '../types.js';

/**
 * Technical Operations Agent
 *
 * Handles technical investigation and resolution:
 * - Investigate assigned incidents
 * - Create implementation plans
 * - Submit plans for AI review
 * - Submit change requests
 * - Resolve incidents after changes are approved
 */
export class TechOpsAgent extends BaseAgent {
  getAgentType(): string {
    return 'TechOps';
  }

  async perceive(): Promise<AgentPerception> {
    const incidents = this.gameState?.incidents || [];
    const plans = this.implementationPlans;

    // Urgent incidents (critical/high, or SLA at risk)
    const urgentIncidents = incidents.filter(i =>
      (i.status === 'open' || i.status === 'in_progress') &&
      (i.priority === 'critical' || i.priority === 'high' || this.isSLAAtRisk(i))
    );

    const pendingWork = incidents.filter(i =>
      i.status === 'open' || i.status === 'in_progress'
    );

    // Plans needing attention
    const plansNeedingAttention = plans.filter(p =>
      p.status === 'draft' ||
      p.status === 'ai_needs_revision' ||
      p.status === 'ai_approved'
    );

    // Calculate workload
    const totalWork = pendingWork.length + plansNeedingAttention.length;
    const workload = this.calculateWorkload(totalWork);

    return {
      urgentIncidents,
      pendingWork,
      plansNeedingAttention,
      changesNeedingReview: [],
      activeChallenges: [],
      teamHealth: {
        budget: this.gameState?.team.budgetRemaining || 0,
        morale: this.gameState?.team.moraleLevel || 75,
        workload
      },
      recommendations: []
    };
  }

  async decide(perception: AgentPerception): Promise<AgentDecision | null> {
    // Priority 1: Handle SLA breached incidents - resolve quickly even without full process
    const breached = perception.urgentIncidents.filter(i => this.isSLABreached(i));
    if (breached.length > 0 && this.config.personality === 'aggressive') {
      const incident = breached[0];
      if (incident.status === 'in_progress') {
        return {
          action: 'quick_resolve',
          target: incident.id,
          params: { resolution: 'Emergency resolution to prevent further SLA impact' },
          reasoning: `SLA breached for ${incident.incidentNumber}, quick resolution needed`,
          priority: 0
        };
      }
    }

    // Priority 2: Create implementation plans for critical incidents without plans
    const criticalWithoutPlans = perception.urgentIncidents.filter(i =>
      i.priority === 'critical' &&
      i.status === 'in_progress' &&
      !this.hasImplementationPlan(i.id)
    );

    if (criticalWithoutPlans.length > 0) {
      const incident = criticalWithoutPlans[0];
      return {
        action: 'create_plan',
        target: incident.id,
        reasoning: `Creating implementation plan for critical incident ${incident.incidentNumber}`,
        priority: 1
      };
    }

    // Priority 3: Submit draft plans for AI review
    const draftPlans = perception.plansNeedingAttention.filter(p => p.status === 'draft');
    if (draftPlans.length > 0) {
      return {
        action: 'submit_plan_for_review',
        target: draftPlans[0].id,
        reasoning: `Submitting plan ${draftPlans[0].planNumber} for AI review`,
        priority: 2
      };
    }

    // Priority 4: Create change request for approved plans
    const approvedPlans = perception.plansNeedingAttention.filter(p => p.status === 'ai_approved');
    if (approvedPlans.length > 0) {
      return {
        action: 'create_change_request',
        target: approvedPlans[0].id,
        reasoning: `Creating change request for approved plan ${approvedPlans[0].planNumber}`,
        priority: 3
      };
    }

    // Priority 5: Revise plans that need revision
    const needsRevision = perception.plansNeedingAttention.filter(p => p.status === 'ai_needs_revision');
    if (needsRevision.length > 0) {
      return {
        action: 'revise_plan',
        target: needsRevision[0].id,
        reasoning: `Revising plan ${needsRevision[0].planNumber} based on AI feedback`,
        priority: 4
      };
    }

    // Priority 6: Start work on high priority open incidents
    const highOpen = perception.pendingWork.filter(i =>
      i.status === 'open' && (i.priority === 'high' || i.priority === 'critical')
    );
    if (highOpen.length > 0) {
      return {
        action: 'start_work',
        target: highOpen[0].id,
        reasoning: `Starting investigation of ${highOpen[0].priority} incident ${highOpen[0].incidentNumber}`,
        priority: 5
      };
    }

    // Priority 7: Resolve incidents with approved changes
    const resolvable = perception.pendingWork.filter(i =>
      i.status === 'in_progress' && this.hasApprovedChange(i.id)
    );
    if (resolvable.length > 0) {
      return {
        action: 'resolve',
        target: resolvable[0].id,
        params: { resolution: 'Resolved after implementing approved change' },
        reasoning: `Resolving ${resolvable[0].incidentNumber} - change approved and implemented`,
        priority: 6
      };
    }

    // Priority 8: Create plans for other in-progress incidents
    const inProgressWithoutPlans = perception.pendingWork.filter(i =>
      i.status === 'in_progress' && !this.hasImplementationPlan(i.id)
    );
    if (inProgressWithoutPlans.length > 0) {
      return {
        action: 'create_plan',
        target: inProgressWithoutPlans[0].id,
        reasoning: `Creating implementation plan for ${inProgressWithoutPlans[0].incidentNumber}`,
        priority: 7
      };
    }

    // Priority 9: Start work on remaining open incidents
    const remaining = perception.pendingWork.filter(i => i.status === 'open');
    if (remaining.length > 0) {
      return {
        action: 'start_work',
        target: remaining[0].id,
        reasoning: `Starting work on incident ${remaining[0].incidentNumber}`,
        priority: 8
      };
    }

    return null;
  }

  async act(decision: AgentDecision): Promise<void> {
    this.log(`Executing: ${decision.action} - ${decision.reasoning}`);

    switch (decision.action) {
      case 'start_work':
        await this.updateIncidentStatus(decision.target!, 'in_progress');
        break;

      case 'resolve':
      case 'quick_resolve':
        await this.updateIncidentStatus(decision.target!, 'resolved');
        break;

      case 'create_plan':
        await this.createPlanForIncident(decision.target!);
        break;

      case 'submit_plan_for_review':
        await this.submitPlanForReview(decision.target!);
        break;

      case 'create_change_request':
        await this.createChangeRequestFromPlan(decision.target!);
        break;

      case 'revise_plan':
        await this.revisePlan(decision.target!);
        break;
    }
  }

  /**
   * Check if incident has an implementation plan
   */
  private hasImplementationPlan(incidentId: string): boolean {
    return this.implementationPlans.some(p => p.incidentId === incidentId);
  }

  /**
   * Check if incident has an approved change request
   */
  private hasApprovedChange(incidentId: string): boolean {
    const plan = this.implementationPlans.find(p => p.incidentId === incidentId);
    if (!plan) return false;

    return this.changeRequests.some(cr =>
      cr.relatedPlanId === plan.id && cr.status === 'approved'
    );
  }

  /**
   * Create an implementation plan for an incident using AI
   */
  private async createPlanForIncident(incidentId: string): Promise<void> {
    const incident = this.gameState?.incidents.find(i => i.id === incidentId);
    if (!incident) {
      this.logError(`Incident ${incidentId} not found`, null);
      return;
    }

    try {
      // Generate plan using AI
      const generatedPlan = await this.aiService.generateImplementationPlan({
        title: incident.title,
        description: incident.description,
        priority: incident.priority,
        severity: incident.severity
      });

      // Create the plan via API
      await this.createImplementationPlan({
        title: generatedPlan.title,
        description: generatedPlan.description,
        incidentId: incident.id,
        rootCauseAnalysis: generatedPlan.rootCauseAnalysis,
        implementationSteps: generatedPlan.implementationSteps.map(s => ({
          ...s,
          completed: false
        })),
        riskLevel: generatedPlan.riskLevel as any,
        riskMitigation: generatedPlan.riskMitigation,
        rollbackPlan: generatedPlan.rollbackPlan,
        estimatedEffortHours: generatedPlan.estimatedEffortHours
      });

    } catch (error) {
      this.logError(`Failed to create plan for incident ${incidentId}`, error);
    }
  }

  /**
   * Revise a plan based on AI feedback
   */
  private async revisePlan(planId: string): Promise<void> {
    const plan = this.implementationPlans.find(p => p.id === planId);
    if (!plan) {
      this.logError(`Plan ${planId} not found`, null);
      return;
    }

    try {
      // For now, just resubmit with minor improvements
      // In a full implementation, we'd use AI to revise based on feedback
      this.log(`Revising plan ${plan.planNumber} based on feedback: ${plan.aiFeedback}`);

      // Resubmit for review
      await this.submitPlanForReview(planId);

    } catch (error) {
      this.logError(`Failed to revise plan ${planId}`, error);
    }
  }

  /**
   * Calculate workload level
   */
  private calculateWorkload(activeCount: number): 'low' | 'medium' | 'high' | 'overloaded' {
    if (activeCount <= 3) return 'low';
    if (activeCount <= 6) return 'medium';
    if (activeCount <= 9) return 'high';
    return 'overloaded';
  }
}
