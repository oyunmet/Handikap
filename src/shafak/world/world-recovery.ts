export type WorldRecoveryReason =
  | "CTX_LOST"
  | "CANARY_BLACK"
  | "NO_FIRST_FRAME"
  | "ZERO_DRAW_CALLS"
  | "FRAMELOOP_PAUSED";

export const WORLD_RECOVERY_REASON_CODES: readonly WorldRecoveryReason[] = [
  "CTX_LOST",
  "CANARY_BLACK",
  "NO_FIRST_FRAME",
  "ZERO_DRAW_CALLS",
  "FRAMELOOP_PAUSED",
];

export type WorldRecoveryDecision = {
  accepted: boolean;
  stage: number;
  exhausted: boolean;
  reasonCode: WorldRecoveryReason;
  recentEscalations: number[];
};

const RECOVERABLE_REASONS = new Set<WorldRecoveryReason>([
  "CTX_LOST",
  "CANARY_BLACK",
  "ZERO_DRAW_CALLS",
]);

const MAX_DESTRUCTIVE_RECOVERIES_PER_MINUTE = 2;
const RECOVERY_WINDOW_MS = 60_000;

export function shouldRecoverForWorldReason(reasonCode: WorldRecoveryReason): boolean {
  return RECOVERABLE_REASONS.has(reasonCode);
}

export function isWorldRecoveryReason(value: unknown): value is WorldRecoveryReason {
  return typeof value === "string"
    && WORLD_RECOVERY_REASON_CODES.includes(value as WorldRecoveryReason);
}

export function decideWorldRecovery(
  currentStage: number,
  reasonCode: WorldRecoveryReason,
  recentEscalations: readonly number[],
  now: number,
): WorldRecoveryDecision {
  const validTimes = recentEscalations
    .filter((timestamp) => Number.isFinite(timestamp) && now >= timestamp && now - timestamp < RECOVERY_WINDOW_MS)
    .slice(-MAX_DESTRUCTIVE_RECOVERIES_PER_MINUTE);
  const stage = Number.isFinite(currentStage)
    ? Math.max(0, Math.min(4, Math.floor(currentStage)))
    : 0;
  if (!shouldRecoverForWorldReason(reasonCode)) {
    return { accepted: false, stage, exhausted: false, reasonCode, recentEscalations: validTimes };
  }

  const nextStage = stage + 1;
  if (nextStage > 3) {
    return { accepted: false, stage: 4, exhausted: true, reasonCode, recentEscalations: validTimes };
  }
  if (nextStage >= 2 && validTimes.length >= MAX_DESTRUCTIVE_RECOVERIES_PER_MINUTE) {
    return { accepted: false, stage: 4, exhausted: true, reasonCode, recentEscalations: validTimes };
  }

  const updatedEscalations = nextStage >= 2 ? [...validTimes, now] : validTimes;
  return {
    accepted: true,
    stage: nextStage,
    exhausted: false,
    reasonCode,
    recentEscalations: updatedEscalations,
  };
}
