export type CanvasRecoveryDecision = {
  attempts: number;
  shouldRebuild: boolean;
};

export const CANVAS_RECOVERY_STABLE_WINDOW_MS = 15_000;
export const CANVAS_CONTEXT_RESTORE_TIMEOUT_MS = 8_000;
export const MAX_RECENT_CANVAS_CONTEXT_LOSSES = 3;

export function resolveCanvasRecovery(
  attempts: number,
  manual = false,
  maxAutomaticAttempts = 1,
): CanvasRecoveryDecision {
  if (manual) return { attempts: 0, shouldRebuild: true };
  if (attempts >= maxAutomaticAttempts) return { attempts, shouldRebuild: false };
  return { attempts: attempts + 1, shouldRebuild: true };
}

export function shouldFailCanvasRecovery(recentLossCount: number) {
  return Number.isFinite(recentLossCount)
    && recentLossCount > MAX_RECENT_CANVAS_CONTEXT_LOSSES;
}

export function resolveCanvasRecoveryDprScale(currentScale: number, stable = false) {
  if (stable) return 1;
  const safeScale = Number.isFinite(currentScale)
    ? Math.max(0.5, Math.min(1, currentScale))
    : 1;
  return Math.max(0.5, safeScale * 0.75);
}
