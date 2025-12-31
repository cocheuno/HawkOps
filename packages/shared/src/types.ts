// User types
export interface User {
  id: string;
  username: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

// Game types
export type GameStatus = 'lobby' | 'active' | 'paused' | 'completed';

export interface Game {
  id: string;
  name: string;
  status: GameStatus;
  durationMinutes: number;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Team types
export type TeamRole = 'Service Desk' | 'Technical Operations' | 'Management/CAB';

export interface Team {
  id: string;
  gameId: string;
  name: string;
  role: TeamRole;
  score: number;
  createdAt: string;
  updatedAt: string;
}

// Player types
export interface Player {
  id: string;
  userId?: string;
  gameId: string;
  teamId?: string;
  name: string;
  isReady: boolean;
  joinedAt: string;
  leftAt?: string;
}

// Incident types
export type IncidentPriority = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Incident {
  id: string;
  gameId: string;
  title: string;
  description: string;
  priority: IncidentPriority;
  status: IncidentStatus;
  affectedServices: string[];
  assignedTeamId?: string;
  createdAt: string;
  resolvedAt?: string;
  updatedAt: string;
}

// Action types
export interface Action {
  id: string;
  gameId: string;
  teamId: string;
  playerId: string;
  incidentId?: string;
  actionType: string;
  actionData: Record<string, any>;
  result?: Record<string, any>;
  pointsAwarded: number;
  createdAt: string;
}

// Game event types
export type EventSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface GameEvent {
  id: string;
  gameId: string;
  eventType: string;
  eventData: Record<string, any>;
  severity?: EventSeverity;
  createdAt: string;
}

// Chat message types
export interface ChatMessage {
  id: string;
  gameId: string;
  teamId: string;
  playerId: string;
  message: string;
  createdAt: string;
}

// Metrics types
export interface GameMetric {
  id: string;
  gameId: string;
  teamId?: string;
  metricName: string;
  metricValue: number;
  recordedAt: string;
}

// AI interaction types
export interface AIInteraction {
  id: string;
  gameId: string;
  interactionType: string;
  prompt: string;
  response?: string;
  tokensUsed?: number;
  createdAt: string;
}

// Socket event payloads
export interface SocketEvents {
  // Game events
  'game:join': {
    gameId: string;
    teamId: string;
    userId: string;
  };
  'game:leave': {
    gameId: string;
    teamId: string;
    userId: string;
  };
  'game:action': {
    gameId: string;
    action: any;
  };
  'game:requestState': {
    gameId: string;
  };
  'game:joined': {
    gameId: string;
    teamId: string;
    message: string;
  };
  'game:playerJoined': {
    userId: string;
    teamId: string;
    timestamp: string;
  };
  'game:playerLeft': {
    userId: string;
    teamId: string;
    timestamp: string;
  };
  'game:actionProcessed': {
    action: any;
    timestamp: string;
  };
  'game:stateUpdate': any;

  // Team events
  'team:message': {
    teamId: string;
    message: string;
    userId: string;
  };
  'team:messageReceived': {
    userId: string;
    message: string;
    timestamp: string;
  };
  'team:coordinateAction': {
    teamId: string;
    action: any;
    userId: string;
  };
  'team:actionProposed': {
    userId: string;
    action: any;
    timestamp: string;
  };

  // Chat events
  'chat:send': {
    gameId: string;
    teamId: string;
    message: string;
    userId: string;
    userName: string;
  };
  'chat:message': {
    id: string;
    userId: string;
    userName: string;
    teamId: string;
    message: string;
    timestamp: string;
  };
  'chat:typing': {
    teamId: string;
    userId: string;
    userName: string;
    isTyping: boolean;
  };
  'chat:userTyping': {
    userId: string;
    userName: string;
    isTyping: boolean;
  };
}
