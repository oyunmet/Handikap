import { WORLD_GATE_INTERACTION_RANGE_METERS } from "./world-progress.ts";

export function shouldOpenWorldV2Gate(
  distanceToGate: number,
  chapterAtGate: number,
  unlockedThroughChapter: number,
) {
  if (
    !Number.isFinite(distanceToGate)
    || !Number.isSafeInteger(chapterAtGate)
    || !Number.isSafeInteger(unlockedThroughChapter)
  ) return false;

  return chapterAtGate < unlockedThroughChapter
    && distanceToGate <= WORLD_GATE_INTERACTION_RANGE_METERS
    && distanceToGate >= -1.5;
}
