import { BaseAgent } from '../base/BaseAgent.js';
import { AgentPerception, AgentDecision, ChangeRequest } from '../types.js';

/**
 * Management Agent
 *
 * Handles CAB (Change Advisory Board) responsibilities:
 * - Review pending change requests
 * - Approve/reject changes based on AI analysis
 * - Monitor team health and escalation needs
 * - Provide oversight for critical decisions
 */
export class ManagementAgent extends BaseAgent {
  getAgentType(): string {
    return 'Management';
  }

  async perceive(): Promise<AgentPerception> {
    const incidents = this.gameState?.incidents || [];

    // Find urgent incidents for awareness
    const urgentIncidents = incidents.filter(i =>
      (i.status === 'open' || i.status === 'in_progress') &&
      (i.priority === 'critical' || i.priority === 'high' || this.isSLAAtRisk(i))
    );

    // Find changes needing CAB review
    const changesNeedingReview = this.changeRequests.filter(cr =>
      cr.workflowState === 'pending_cab' || cr.workflowState === 'under_review'
    );

    // Calculate team workload
    const activeIncidents = incidents.filter(i =>
      i.status === 'open' || i.status === 'in_progress'
    ).length;
    const workload = this.calculateWorkload(activeIncidents);

    return {
      urgentIncidents,
      pendingWork: incidents.filter(i => i.status === 'open' || i.status === 'in_progress'),
      plansNeedingAttention: [],
      changesNeedingReview,
      activeChallenges: [],
      teamHealth: {
        budget: this.gameState?.team.budgetRemaining || 0,
        morale: this.gameState?.team.moraleLevel || 75,
        workload
      },
      recommendations: this.generateRecommendations(urgentIncidents, changesNeedingReview, workload)
    };
  }

  async decide(perception: AgentPerception): Promise<AgentDecision | null> {
    // Priority 1: Emergency change requests (approve quickly if valid)
    const emergencyChanges = perception.changesNeedingReview.filter(cr =>
      cr.changeType === 'emergency'
    );
    if (emergencyChanges.length > 0) {
      return {
        action: 'review_change',
        target: emergencyChanges[0].id,
        params: { expedited: true },
        reasoning: `Emergency change ${emergencyChanges[0].changeNumber} requires immediate review`,
        priority: 0
      };
    }

    // Priority 2: High-risk change requests
    const highRiskChanges = perception.changesNeedingReview.filter(cr =>
      cr.riskLevel === 'high' || cr.riskLevel === 'critical'
    );
    if (highRiskChanges.length > 0) {
      return {
        action: 'review_change',
        target: highRiskChanges[0].id,
        params: { thoroughReview: true },
        reasoning: `High-risk change ${highRiskChanges[0].changeNumber} needs thorough review`,
        priority: 1
      };
    }

    // Priority 3: Standard and normal change requests
    const pendingChanges = perception.changesNeedingReview.filter(cr =>
      cr.workflowState === 'pending_cab'
    );
    if (pendingChanges.length > 0) {
      return {
        action: 'review_change',
        target: pendingChanges[0].id,
        reasoning: `Reviewing change request ${pendingChanges[0].changeNumber}`,
        priority: 2
      };
    }

    // Priority 4: Monitor SLA breaches and provide management oversight
    const slaBreached = perception.urgentIncidents.filter(i => this.isSLABreached(i));
    if (slaBreached.length > 2 && this.config.personality !== 'aggressive') {
      // Multiple SLA breaches - might need management intervention
      return {
        action: 'escalate_management',
        params: {
          reason: `Multiple SLA breaches (${slaBreached.length}), management attention needed`
        },
        reasoning: 'Too many SLA breaches, needs executive attention',
        priority: 3
      };
    }

    return null;
  }

  async act(decision: AgentDecision): Promise<void> {
    this.log(`Executing: ${decision.action} - ${decision.reasoning}`);

    switch (decision.action) {
      case 'review_change':
        await this.reviewChangeRequest(decision.target!, decision.params);
        break;

      case 'escalate_management':
        this.log(`Management alert: ${decision.params?.reason}`);
        // In a real system, this might trigger notifications
        break;
    }
  }

  /**
   * Review a change request using AI evaluation
   */
  private async reviewChangeRequest(
    changeId: string,
    params?: { expedited?: boolean; thoroughReview?: boolean }
  ): Promise<void> {
    const change = this.changeRequests.find(cr => cr.id === changeId);
    if (!change) {
      this.logError(`Change request ${changeId} not found`, null);
      return;
    }

    try {
      // Use AI to evaluate the change request
      const evaluation = await this.aiService.evaluateChangeRequest({
        changeNumber: change.changeNumber,
        title: change.title,
        description: change.description,
        changeType: change.changeType,
        riskLevel: change.riskLevel,
        implementationPlan: change.implementationPlan,
        rollbackPlan: change.rollbackPlan,
        affectedServices: change.affectedServices,
        technicalReviewNotes: change.technicalReviewNotes
      });

      // Apply personality-based adjustments
      let shouldApprove = evaluation.approve;

      if (this.config.personality === 'cautious') {
        // Cautious: reject high-risk without thorough review
        if ((change.riskLevel === 'high' || change.riskLevel === 'critical') && !params?.thoroughReview) {
          shouldApprove = false;
        }
      } else if (this.config.personality === 'aggressive') {
        // Aggressive: approve more readily, especially emergencies
        if (change.changeType === 'emergency' && params?.expedited) {
          shouldApprove = true;
        }
      }

      // Make the decision
      if (shouldApprove) {
        await this.approveChangeRequest(changeId, evaluation.notes);
        this.log(`Approved ${change.changeNumber}: ${evaluation.reasoning}`);
      } else {
        await this.rejectChangeRequest(changeId, evaluation.notes);
        this.log(`Rejected ${change.changeNumber}: ${evaluation.reasoning}`);
      }

    } catch (error) {
      this.logError(`Failed to review change ${changeId}`, error);

      // Fallback: use rule-based decision
      await this.fallbackReview(change);
    }
  }

  /**
   * Fallback rule-based review when AI is unavailable
   */
  private async fallbackReview(change: ChangeRequest): Promise<void> {
    this.log(`Using fallback review for ${change.changeNumber}`);

    // Simple rules-based approval
    const hasImplementationPlan = !!change.implementationPlan && change.implementationPlan.length > 50;
    const hasRollbackPlan = !!change.rollbackPlan && change.rollbackPlan.length > 20;
    const hasTechReview = !!change.technicalReviewNotes;

    // Standard changes with plans are usually safe
    if (change.changeType === 'standard' && change.riskLevel === 'low') {
      await this.approveChangeRequest(change.id, 'Standard low-risk change approved');
      return;
    }

    // Emergency changes get expedited review
    if (change.changeType === 'emergency') {
      if (this.config.personality === 'cautious') {
        await this.rejectChangeRequest(change.id, 'Emergency changes require more documentation');
      } else {
        await this.approveChangeRequest(change.id, 'Emergency change approved with expedited review');
      }
      return;
    }

    // Normal changes need complete documentation
    if (hasImplementationPlan && hasRollbackPlan) {
      if (change.riskLevel === 'critical' || change.riskLevel === 'high') {
        if (hasTechReview || this.config.personality === 'aggressive') {
          await this.approveChangeRequest(change.id, 'Approved after thorough review');
        } else {
          await this.rejectChangeRequest(change.id, 'High-risk change requires technical review notes');
        }
      } else {
        await this.approveChangeRequest(change.id, 'Change request meets all criteria');
      }
    } else {
      await this.rejectChangeRequest(change.id, 'Incomplete documentation - needs implementation and rollback plans');
    }
  }

  /**
   * Calculate workload level
   */
  private calculateWorkload(activeCount: number): 'low' | 'medium' | 'high' | 'overloaded' {
    if (activeCount <= 4) return 'low';
    if (activeCount <= 8) return 'medium';
    if (activeCount <= 12) return 'high';
    return 'overloaded';
  }

  /**
   * Generate management recommendations
   */
  private generateRecommendations(
    urgent: any[],
    pendingChanges: ChangeRequest[],
    workload: string
  ): string[] {
    const recs: string[] = [];

    const breached = urgent.filter(i => this.isSLABreached(i));
    if (breached.length > 0) {
      recs.push(`${breached.length} SLA breach(es) require management attention`);
    }

    if (pendingChanges.length > 3) {
      recs.push(`${pendingChanges.length} change requests pending - CAB review needed`);
    }

    const emergencyChanges = pendingChanges.filter(cr => cr.changeType === 'emergency');
    if (emergencyChanges.length > 0) {
      recs.push(`${emergencyChanges.length} emergency change(s) require immediate attention`);
    }

    if (workload === 'overloaded') {
      recs.push('Team overloaded - consider resource allocation');
    }

    return recs;
  }
}
