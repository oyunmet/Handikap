export function nextWorldRecoveryStage(currentStage: number, errorMessage = ""): number {
  const stage = Number.isFinite(currentStage)
    ? Math.max(0, Math.min(4, Math.floor(currentStage)))
    : 0;
  if (stage >= 3) return 4;
  if (
    stage < 1
    && /error creating webgl context|could not create a webgl context/i.test(errorMessage)
  ) return 2;
  return stage + 1;
}
