/**
 * Game Timing Utilities
 *
 * Central source of truth for computing duration-aware time thresholds.
 * All SLA, escalation, and challenge timings scale based on game duration.
 */

// Time scaling configuration
export const TIME_SCALING_CONFIG = {
  // SLA targets as percentage of game duration, with min/max caps in minutes
  SLA_TARGETS: {
    critical: { percent: 0.20, min: 8, max: 25 },   // 20% of duration, 8-25 min
    high:     { percent: 0.35, min: 12, max: 40 },  // 35% of duration, 12-40 min
    medium:   { percent: 0.55, min: 20, max: 55 },  // 55% of duration, 20-55 min
    low:      { percent: 0.80, min: 30, max: 75 },  // 80% of duration, 30-75 min
  },

  // Escalation thresholds as percentage of SLA target
  ESCALATION_LEVELS: {
    L1: 0.50,  // 50% of SLA time
    L2: 0.75,  // 75% of SLA time
    L3: 0.95,  // 95% of SLA time (just before breach)
  },

  // At-risk threshold as percentage of SLA remaining
  AT_RISK_THRESHOLD: 0.25, // Warning when 25% of SLA time remains

  // Challenge windows as percentage of game duration, with min/max caps
  CHALLENGE_WINDOWS: {
    quick:    { percent: 0.30, min: 15, max: 30 },  // Quick challenges
    standard: { percent: 0.50, min: 25, max: 45 },  // Standard challenges
    long:     { percent: 0.75, min: 35, max: 60 },  // Long challenges
  },

  // Challenge appearance frequency (as fraction of game duration)
  CHALLENGE_FREQUENCY: {
    minIntervalPercent: 0.15,  // At least 15% of game between challenges
    maxIntervalPercent: 0.25,  // At most 25% of game between challenges
    minIntervalMinutes: 8,     // At least 8 minutes
    maxIntervalMinutes: 20,    // At most 20 minutes
  },

  // Round timing
  ROUNDS: {
    default: 4,
    snapshotIntervalPercent: 0.25, // Snapshot every 25% of duration
  },
} as const;

export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type EscalationLevel = 'L1' | 'L2' | 'L3';
export type ChallengeWindowType = 'quick' | 'standard' | 'long';

/**
 * Calculate SLA target in minutes for a given priority and game duration
 */
export function computeSLATarget(priority: Priority, gameDurationMinutes: number): number {
  const config = TIME_SCALING_CONFIG.SLA_TARGETS[priority];
  const computed = Math.round(gameDurationMinutes * config.percent);
  return Math.max(config.min, Math.min(config.max, computed));
}

/**
 * Get all SLA targets for a game duration
 */
export function computeAllSLATargets(gameDurationMinutes: number): Record<Priority, number> {
  return {
    critical: computeSLATarget('critical', gameDurationMinutes),
    high: computeSLATarget('high', gameDurationMinutes),
    medium: computeSLATarget('medium', gameDurationMinutes),
    low: computeSLATarget('low', gameDurationMinutes),
  };
}

/**
 * Calculate escalation threshold in minutes for a given priority and level
 */
export function computeEscalationThreshold(
  priority: Priority,
  level: EscalationLevel,
  gameDurationMinutes: number
): number {
  const slaTarget = computeSLATarget(priority, gameDurationMinutes);
  const levelPercent = TIME_SCALING_CONFIG.ESCALATION_LEVELS[level];
  return Math.round(slaTarget * levelPercent);
}

/**
 * Get all escalation rules for a game
 */
export interface EscalationRuleConfig {
  name: string;
  description: string;
  priority: Priority;
  timeThresholdMinutes: number;
  escalationLevel: number;
  notifyRoles: string[];
}

export function computeEscalationRules(gameDurationMinutes: number): EscalationRuleConfig[] {
  const rules: EscalationRuleConfig[] = [];

  // Critical priority - L1 and L2
  rules.push({
    name: 'Critical P1 - L1',
    description: `Escalate critical incidents after ${computeEscalationThreshold('critical', 'L1', gameDurationMinutes)} minutes`,
    priority: 'critical',
    timeThresholdMinutes: computeEscalationThreshold('critical', 'L1', gameDurationMinutes),
    escalationLevel: 1,
    notifyRoles: ['manager', 'lead'],
  });
  rules.push({
    name: 'Critical P1 - L2',
    description: `Major escalation for critical incidents after ${computeEscalationThreshold('critical', 'L2', gameDurationMinutes)} minutes`,
    priority: 'critical',
    timeThresholdMinutes: computeEscalationThreshold('critical', 'L2', gameDurationMinutes),
    escalationLevel: 2,
    notifyRoles: ['director', 'vp'],
  });

  // High priority - L1 and L2
  rules.push({
    name: 'High Priority - L1',
    description: `Escalate high priority incidents after ${computeEscalationThreshold('high', 'L1', gameDurationMinutes)} minutes`,
    priority: 'high',
    timeThresholdMinutes: computeEscalationThreshold('high', 'L1', gameDurationMinutes),
    escalationLevel: 1,
    notifyRoles: ['manager'],
  });
  rules.push({
    name: 'High Priority - L2',
    description: `Major escalation for high priority incidents after ${computeEscalationThreshold('high', 'L2', gameDurationMinutes)} minutes`,
    priority: 'high',
    timeThresholdMinutes: computeEscalationThreshold('high', 'L2', gameDurationMinutes),
    escalationLevel: 2,
    notifyRoles: ['director'],
  });

  // Medium priority - L1 only
  rules.push({
    name: 'Medium Priority - L1',
    description: `Escalate medium priority incidents after ${computeEscalationThreshold('medium', 'L1', gameDurationMinutes)} minutes`,
    priority: 'medium',
    timeThresholdMinutes: computeEscalationThreshold('medium', 'L1', gameDurationMinutes),
    escalationLevel: 1,
    notifyRoles: ['lead'],
  });

  return rules;
}

/**
 * Calculate at-risk threshold in minutes for a given SLA target
 */
export function computeAtRiskThreshold(slaTargetMinutes: number): number {
  // Warning when 25% of SLA time remains
  const threshold = Math.round(slaTargetMinutes * TIME_SCALING_CONFIG.AT_RISK_THRESHOLD);
  return Math.max(2, Math.min(15, threshold)); // Between 2-15 minutes
}

/**
 * Compute at-risk thresholds for all priorities
 */
export function computeAtRiskThresholds(gameDurationMinutes: number): Record<Priority, number> {
  const slaTargets = computeAllSLATargets(gameDurationMinutes);
  return {
    critical: computeAtRiskThreshold(slaTargets.critical),
    high: computeAtRiskThreshold(slaTargets.high),
    medium: computeAtRiskThreshold(slaTargets.medium),
    low: computeAtRiskThreshold(slaTargets.low),
  };
}

/**
 * Calculate challenge window duration in minutes
 */
export function computeChallengeWindow(
  windowType: ChallengeWindowType,
  gameDurationMinutes: number,
  gameRemainingMinutes?: number
): number {
  const config = TIME_SCALING_CONFIG.CHALLENGE_WINDOWS[windowType];
  let computed = Math.round(gameDurationMinutes * config.percent);
  computed = Math.max(config.min, Math.min(config.max, computed));

  // If we know remaining time, cap the window to not exceed it
  if (gameRemainingMinutes !== undefined && computed > gameRemainingMinutes) {
    computed = Math.max(5, gameRemainingMinutes - 2); // Leave 2 min buffer
  }

  return computed;
}

/**
 * Calculate challenge appearance interval in minutes
 */
export function computeChallengeInterval(gameDurationMinutes: number): { min: number; max: number } {
  const config = TIME_SCALING_CONFIG.CHALLENGE_FREQUENCY;
  return {
    min: Math.max(config.minIntervalMinutes, Math.round(gameDurationMinutes * config.minIntervalPercent)),
    max: Math.min(config.maxIntervalMinutes, Math.round(gameDurationMinutes * config.maxIntervalPercent)),
  };
}

/**
 * Calculate round duration and snapshot intervals
 */
export function computeRoundTiming(gameDurationMinutes: number, numRounds?: number): {
  roundDurationMinutes: number;
  snapshotIntervalMinutes: number;
  totalRounds: number;
} {
  const totalRounds = numRounds || TIME_SCALING_CONFIG.ROUNDS.default;
  return {
    roundDurationMinutes: Math.round(gameDurationMinutes / totalRounds),
    snapshotIntervalMinutes: Math.round(gameDurationMinutes * TIME_SCALING_CONFIG.ROUNDS.snapshotIntervalPercent),
    totalRounds,
  };
}

/**
 * Get SLA warning color based on time remaining and SLA target
 */
export function getSLAWarningLevel(
  timeRemainingMinutes: number,
  slaTargetMinutes: number
): 'green' | 'yellow' | 'red' | 'breached' {
  if (timeRemainingMinutes <= 0) return 'breached';

  const percentRemaining = timeRemainingMinutes / slaTargetMinutes;

  if (percentRemaining <= 0.15) return 'red';      // < 15% remaining
  if (percentRemaining <= 0.35) return 'yellow';   // 15-35% remaining
  return 'green';                                   // > 35% remaining
}

/**
 * Format SLA time for display
 */
export function formatSLATime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

/**
 * Summary object for a game's timing configuration
 */
export interface GameTimingConfig {
  gameDurationMinutes: number;
  slaTargets: Record<Priority, number>;
  escalationRules: EscalationRuleConfig[];
  atRiskThresholds: Record<Priority, number>;
  challengeWindows: Record<ChallengeWindowType, number>;
  challengeInterval: { min: number; max: number };
  roundTiming: {
    roundDurationMinutes: number;
    snapshotIntervalMinutes: number;
    totalRounds: number;
  };
}

/**
 * Get complete timing configuration for a game
 */
export function getGameTimingConfig(gameDurationMinutes: number): GameTimingConfig {
  return {
    gameDurationMinutes,
    slaTargets: computeAllSLATargets(gameDurationMinutes),
    escalationRules: computeEscalationRules(gameDurationMinutes),
    atRiskThresholds: computeAtRiskThresholds(gameDurationMinutes),
    challengeWindows: {
      quick: computeChallengeWindow('quick', gameDurationMinutes),
      standard: computeChallengeWindow('standard', gameDurationMinutes),
      long: computeChallengeWindow('long', gameDurationMinutes),
    },
    challengeInterval: computeChallengeInterval(gameDurationMinutes),
    roundTiming: computeRoundTiming(gameDurationMinutes),
  };
}

// Example outputs for common durations (for documentation/testing):
// 30-minute game: Critical SLA = 8min, High = 12min, Medium = 20min, Low = 30min
// 75-minute game: Critical SLA = 15min, High = 26min, Medium = 41min, Low = 60min
// 120-minute game: Critical SLA = 24min, High = 40min, Medium = 55min, Low = 75min
