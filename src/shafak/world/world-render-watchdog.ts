export const WORLD_FIRST_FRAME_GRACE_MS = 20_000;
export const WORLD_MAX_COUNTED_FRAME_MS = 250;

export type WorldWatchdogFrameState = {
  active: boolean;
  visible: boolean;
  paused: boolean;
  deltaMs: number;
};

export function shouldCountWorldWatchdogFrame(state: WorldWatchdogFrameState): boolean {
  return state.active
    && state.visible
    && !state.paused
    && Number.isFinite(state.deltaMs)
    && state.deltaMs > 0
    && state.deltaMs <= WORLD_MAX_COUNTED_FRAME_MS;
}

export function shouldReportFirstFrameTimeout(
  accumulatedActiveMs: number,
  firstFrameReported: boolean,
): boolean {
  return !firstFrameReported
    && Number.isFinite(accumulatedActiveMs)
    && accumulatedActiveMs >= WORLD_FIRST_FRAME_GRACE_MS;
}
