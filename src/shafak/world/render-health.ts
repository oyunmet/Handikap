export const BLACK_FRAME_LUMINANCE_THRESHOLD = 0.004;
export const BLACK_FRAME_RECOVERY_SAMPLES = 2;

export function advanceBlackFrameSamples(
  consecutiveSamples: number,
  meanLuminance: number | null,
) {
  const current = Number.isSafeInteger(consecutiveSamples) && consecutiveSamples > 0
    ? consecutiveSamples
    : 0;
  if (typeof meanLuminance !== "number" || !Number.isFinite(meanLuminance)) {
    return { consecutiveSamples: current, shouldRecover: false };
  }
  if (meanLuminance >= BLACK_FRAME_LUMINANCE_THRESHOLD) {
    return { consecutiveSamples: 0, shouldRecover: false };
  }
  const next = current + 1;
  return {
    consecutiveSamples: next,
    shouldRecover: next >= BLACK_FRAME_RECOVERY_SAMPLES,
  };
}
