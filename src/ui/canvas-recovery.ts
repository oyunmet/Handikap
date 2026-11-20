export type CanvasRecoveryDecision = {
  attempts: number;
  shouldRebuild: boolean;
};

export function resolveCanvasRecovery(
  attempts: number,
  manual = false,
  maxAutomaticAttempts = 1,
): CanvasRecoveryDecision {
  if (manual) return { attempts: 0, shouldRebuild: true };
  if (attempts >= maxAutomaticAttempts) return { attempts, shouldRebuild: false };
  return { attempts: attempts + 1, shouldRebuild: true };
}
