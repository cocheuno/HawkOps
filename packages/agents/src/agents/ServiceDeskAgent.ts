import { BaseAgent } from '../base/BaseAgent.js';
import { AgentPerception, AgentDecision, Incident } from '../types.js';

/**
 * Service Desk Agent
 *
 * Handles first-line support:
 * - Triage incoming incidents
 * - Start work on tickets
 * - Escalate complex issues to Tech Ops
 * - Resolve L1-appropriate issues
 * - Respond to stakeholders
 */
export class ServiceDeskAgent extends BaseAgent {
  getAgentType(): string {
    return 'ServiceDesk';
  }

  async perceive(): Promise<AgentPerception> {
    const incidents = this.gameState?.incidents || [];

    // Categorize incidents by urgency
    const urgentIncidents = incidents.filter(i =>
      (i.status === 'open' || i.status === 'in_progress') &&
      (i.priority === 'critical' || i.priority === 'high' || this.isSLAAtRisk(i))
    );

    const pendingWork = incidents.filter(i =>
      i.status === 'open' || i.status === 'in_progress'
    );

    // Calculate workload
    const workload = this.calculateWorkload(pendingWork.length);

    return {
      urgentIncidents,
      pendingWork,
      plansNeedingAttention: [],
      changesNeedingReview: [],
      activeChallenges: [],
      teamHealth: {
        budget: this.gameState?.team.budgetRemaining || 0,
        morale: this.gameState?.team.moraleLevel || 75,
        workload
      },
      recommendations: this.generateRecommendations(urgentIncidents, workload)
    };
  }

  async decide(perception: AgentPerception): Promise<AgentDecision | null> {
    // Priority 1: Handle SLA breaches - escalate immediately
    const breached = perception.urgentIncidents.filter(i => this.isSLABreached(i));
    if (breached.length > 0) {
      const incident = breached[0];
      return {
        action: 'escalate',
        target: incident.id,
        params: { reason: 'SLA breached - requires immediate attention' },
        reasoning: `SLA breached for ${incident.incidentNumber}, escalating immediately`,
        priority: 0
      };
    }

    // Priority 2: Handle critical incidents
    const criticalOpen = perception.urgentIncidents.filter(i =>
      i.priority === 'critical' && i.status === 'open'
    );
    if (criticalOpen.length > 0) {
      const incident = criticalOpen[0];

      // Critical incidents should be escalated to Tech Ops immediately
      if (this.config.personality === 'aggressive') {
        // Aggressive: Try to handle it ourselves first
        return {
          action: 'start_work',
          target: incident.id,
          reasoning: `Starting work on critical incident ${incident.incidentNumber}`,
          priority: 1
        };
      } else {
        // Cautious/Balanced: Escalate critical issues
        return {
          action: 'escalate',
          target: incident.id,
          params: { reason: 'Critical priority requires technical investigation' },
          reasoning: `Critical incident ${incident.incidentNumber} needs Tech Ops`,
          priority: 1
        };
      }
    }

    // Priority 3: Handle high priority incidents at risk
    const highAtRisk = perception.urgentIncidents.filter(i =>
      i.priority === 'high' && this.isSLAAtRisk(i)
    );
    if (highAtRisk.length > 0) {
      const incident = highAtRisk[0];

      if (incident.status === 'open') {
        return {
          action: 'start_work',
          target: incident.id,
          reasoning: `SLA at risk for ${incident.incidentNumber}, starting work`,
          priority: 2
        };
      } else if (incident.status === 'in_progress' && !this.canResolveAtL1(incident)) {
        return {
          action: 'escalate',
          target: incident.id,
          params: { reason: 'SLA at risk, needs technical expertise' },
          reasoning: `Escalating ${incident.incidentNumber} before SLA breach`,
          priority: 2
        };
      }
    }

    // Priority 4: Start work on oldest open incident
    const openIncidents = perception.pendingWork
      .filter(i => i.status === 'open')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (openIncidents.length > 0) {
      return {
        action: 'start_work',
        target: openIncidents[0].id,
        reasoning: `Processing oldest open incident ${openIncidents[0].incidentNumber}`,
        priority: 3
      };
    }

    // Priority 5: Resolve L1-appropriate incidents
    const resolvable = perception.pendingWork.filter(i =>
      i.status === 'in_progress' && this.canResolveAtL1(i)
    );
    if (resolvable.length > 0) {
      return {
        action: 'resolve',
        target: resolvable[0].id,
        params: { resolution: 'Resolved by Service Desk following standard procedures' },
        reasoning: `Resolving L1 incident ${resolvable[0].incidentNumber}`,
        priority: 4
      };
    }

    // Priority 6: Escalate complex in-progress incidents
    const needsEscalation = perception.pendingWork.filter(i =>
      i.status === 'in_progress' && !this.canResolveAtL1(i)
    );
    if (needsEscalation.length > 0) {
      return {
        action: 'escalate',
        target: needsEscalation[0].id,
        params: { reason: 'Requires technical investigation beyond L1 scope' },
        reasoning: `Escalating complex incident ${needsEscalation[0].incidentNumber}`,
        priority: 5
      };
    }

    return null; // No action needed
  }

  async act(decision: AgentDecision): Promise<void> {
    this.log(`Executing: ${decision.action} - ${decision.reasoning}`);

    switch (decision.action) {
      case 'start_work':
        await this.updateIncidentStatus(decision.target!, 'in_progress');
        break;

      case 'resolve':
        await this.updateIncidentStatus(decision.target!, 'resolved');
        break;

      case 'escalate':
        await this.escalateIncident(decision.target!, decision.params?.reason);
        break;
    }
  }

  /**
   * Determine if incident can be resolved at L1 (Service Desk)
   */
  private canResolveAtL1(incident: Incident): boolean {
    const title = incident.title.toLowerCase();
    const desc = incident.description.toLowerCase();

    // L1-resolvable patterns
    const l1Patterns = [
      'password', 'reset', 'access', 'login', 'unlock',
      'how to', 'question', 'help', 'training',
      'slow', 'performance', 'restart',
      'email', 'outlook', 'calendar',
      'printer', 'print',
      'vpn', 'connect'
    ];

    // Definitely NOT L1 patterns
    const notL1Patterns = [
      'server', 'database', 'outage', 'down', 'crash',
      'security', 'breach', 'malware', 'ransomware',
      'data loss', 'corruption', 'backup',
      'network', 'firewall', 'infrastructure',
      'code', 'deploy', 'release', 'production'
    ];

    // Check for NOT L1 first
    if (notL1Patterns.some(p => title.includes(p) || desc.includes(p))) {
      return false;
    }

    // Check for L1 patterns
    if (l1Patterns.some(p => title.includes(p) || desc.includes(p))) {
      return true;
    }

    // Priority-based default
    if (this.config.personality === 'aggressive') {
      return incident.priority === 'low' || incident.priority === 'medium';
    } else if (this.config.personality === 'cautious') {
      return incident.priority === 'low';
    }

    // Balanced: low and some medium
    return incident.priority === 'low';
  }

  /**
   * Escalate an incident
   */
  private async escalateIncident(incidentId: string, reason: string): Promise<void> {
    try {
      // First try the escalate endpoint
      const response = await fetch(
        `${this.config.apiBaseUrl}/teams/${this.config.teamId}/incidents/${incidentId}/escalate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            toTeam: 'Technical Operations',
            reason
          })
        }
      );

      if (response.ok) {
        this.log(`Escalated incident ${incidentId} to Tech Ops`);
      } else {
        // Fallback: just update status and log
        this.log(`Escalation endpoint not available, marking as in_progress`);
      }
    } catch (error) {
      this.logError(`Failed to escalate incident ${incidentId}`, error);
    }
  }

  /**
   * Calculate workload level
   */
  private calculateWorkload(activeCount: number): 'low' | 'medium' | 'high' | 'overloaded' {
    if (activeCount <= 2) return 'low';
    if (activeCount <= 4) return 'medium';
    if (activeCount <= 6) return 'high';
    return 'overloaded';
  }

  /**
   * Generate recommendations based on current state
   */
  private generateRecommendations(urgent: Incident[], workload: string): string[] {
    const recs: string[] = [];

    if (urgent.length > 3) {
      recs.push(`${urgent.length} urgent incidents - consider escalating lower priority items`);
    }

    if (workload === 'overloaded') {
      recs.push('Team overloaded - escalate or request support');
    }

    const breached = urgent.filter(i => this.isSLABreached(i));
    if (breached.length > 0) {
      recs.push(`${breached.length} SLA breach(es) - immediate escalation needed`);
    }

    return recs;
  }
}
