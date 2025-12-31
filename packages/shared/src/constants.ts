// Game configuration constants
export const GAME_CONFIG = {
  DEFAULT_DURATION_MINUTES: 75,
  MAX_TEAMS: 3,
  MIN_TEAMS: 2,
  MAX_MEMBERS_PER_TEAM: 3,
  MIN_MEMBERS_PER_TEAM: 2,
  POINTS_PER_RESOLVED_INCIDENT: 100,
  PENALTY_PER_ESCALATION: -25,
} as const;

// Team roles
export const TEAM_ROLES = {
  SERVICE_DESK: 'Service Desk',
  TECH_OPS: 'Technical Operations',
  MANAGEMENT: 'Management/CAB',
} as const;

// Incident priorities
export const INCIDENT_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

// Incident statuses
export const INCIDENT_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
} as const;

// Game statuses
export const GAME_STATUS = {
  LOBBY: 'lobby',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
} as const;

// Event severities
export const EVENT_SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
} as const;

// Action types
export const ACTION_TYPES = {
  INVESTIGATE: 'investigate',
  DIAGNOSE: 'diagnose',
  RESOLVE: 'resolve',
  ESCALATE: 'escalate',
  COMMUNICATE: 'communicate',
  REQUEST_CHANGE: 'request_change',
  APPROVE_CHANGE: 'approve_change',
  REJECT_CHANGE: 'reject_change',
} as const;

// Metric names
export const METRIC_NAMES = {
  CUSTOMER_SATISFACTION: 'customer_satisfaction',
  SLA_COMPLIANCE: 'sla_compliance',
  MEAN_TIME_TO_RESOLVE: 'mean_time_to_resolve',
  INCIDENT_COUNT: 'incident_count',
  ESCALATION_RATE: 'escalation_rate',
  FIRST_CALL_RESOLUTION: 'first_call_resolution',
} as const;

// Socket event names
export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  // Game events
  GAME_JOIN: 'game:join',
  GAME_LEAVE: 'game:leave',
  GAME_ACTION: 'game:action',
  GAME_REQUEST_STATE: 'game:requestState',
  GAME_JOINED: 'game:joined',
  GAME_PLAYER_JOINED: 'game:playerJoined',
  GAME_PLAYER_LEFT: 'game:playerLeft',
  GAME_ACTION_PROCESSED: 'game:actionProcessed',
  GAME_STATE_UPDATE: 'game:stateUpdate',

  // Team events
  TEAM_MESSAGE: 'team:message',
  TEAM_MESSAGE_RECEIVED: 'team:messageReceived',
  TEAM_COORDINATE_ACTION: 'team:coordinateAction',
  TEAM_ACTION_PROPOSED: 'team:actionProposed',

  // Chat events
  CHAT_SEND: 'chat:send',
  CHAT_MESSAGE: 'chat:message',
  CHAT_TYPING: 'chat:typing',
  CHAT_USER_TYPING: 'chat:userTyping',
} as const;

// API endpoints
export const API_ENDPOINTS = {
  GAMES: '/api/games',
  TEAMS: '/api/teams',
  PLAYERS: '/api/players',
  INCIDENTS: '/api/incidents',
  ACTIONS: '/api/actions',
  METRICS: '/api/metrics',
  AI: '/api/ai',
} as const;

// Time constants (in milliseconds)
export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  GAME_DURATION: 75 * 60 * 1000, // 75 minutes
  TYPING_INDICATOR_TIMEOUT: 3000, // 3 seconds
  RECONNECTION_DELAY: 1000, // 1 second
} as const;
