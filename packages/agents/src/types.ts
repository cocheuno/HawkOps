/**
 * HawkOps Agent Types
 */

export interface Incident {
  id: string;
  incidentNumber: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  severity: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  slaDeadline: string | null;
  assignedTeamId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImplementationPlan {
  id: string;
  planNumber: string;
  title: string;
  description: string;
  incidentId: string | null;
  rootCauseAnalysis: string | null;
  implementationSteps: Array<{ step: number; description: string; completed: boolean }>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskMitigation: string | null;
  rollbackPlan: string | null;
  estimatedEffortHours: number | null;
  status: string;
  aiScore: number | null;
  aiFeedback: string | null;
  createdAt: string;
}

export interface ChangeRequest {
  id: string;
  changeNumber: string;
  title: string;
  description: string;
  changeType: 'standard' | 'normal' | 'emergency';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  affectedServices: string[] | null;
  implementationPlan: string | null;
  rollbackPlan: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'implemented' | 'cancelled';
  workflowState: 'pending_cab' | 'under_review' | 'review_complete' | 'approved' | 'rejected';
  relatedPlanId: string | null;
  technicalReviewNotes: string | null;
  createdAt: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  challengeType: string;
  pointReward: number;
  expiresAt: string;
  progress: number;
  targetValue: number;
}

export interface TeamInfo {
  id: string;
  name: string;
  role: string;
  score: number;
  budgetRemaining: number;
  moraleLevel: number;
}

export interface GameInfo {
  id: string;
  name: string;
  status: 'lobby' | 'active' | 'paused' | 'completed';
  currentRound: number;
  maxRounds: number;
}

export interface GameState {
  success: boolean;
  game: GameInfo;
  team: TeamInfo;
  incidents: Incident[];
  members: Array<{ id: string; name: string; isReady: boolean }>;
  currentStudent: {
    playerId: string;
    name: string;
    isReady: boolean;
  };
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

export type AgentPersonality = 'cautious' | 'balanced' | 'aggressive';

export interface AgentConfig {
  gameId: string;
  teamId: string;
  playerId: string;
  accessToken: string;
  apiBaseUrl: string;
  personality?: AgentPersonality;
  decisionDelayMs?: number;
  pollIntervalMs?: number;
  verbose?: boolean;
}
