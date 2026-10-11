export function nextWorldRecoveryStage(currentStage: number, errorMessage = ""): number {
  const stage = Number.isFinite(currentStage)
    ? Math.max(0, Math.min(5, Math.floor(currentStage)))
    : 0;
  if (stage >= 4) return 5;
  if (
    stage < 2
    && /error creating webgl context|could not create a webgl context/i.test(errorMessage)
  ) {
    return 3;
  }
  return stage + 1;
}
