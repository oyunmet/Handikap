import {
  WORLD_GATE_AUTO_OPEN_DISTANCE_METERS,
  WORLD_GATE_PASSAGE_CLEARANCE_METERS,
} from "./world-progress.ts";

export function shouldOpenWorldV2Gate(
  distanceToGate: number,
  chapterAtGate: number,
  unlockedThroughChapter: number,
  forwardSpeed = 0,
) {
  if (
    !Number.isFinite(distanceToGate)
    || !Number.isSafeInteger(chapterAtGate)
    || !Number.isSafeInteger(unlockedThroughChapter)
    || !Number.isFinite(forwardSpeed)
  ) return false;

  if (chapterAtGate >= unlockedThroughChapter) return false;
  const distance = Math.abs(distanceToGate);
  if (Math.abs(forwardSpeed) <= 0.05) {
    return distance <= WORLD_GATE_PASSAGE_CLEARANCE_METERS;
  }
  const approachingFromThisSide = distanceToGate > 0
    ? forwardSpeed > 0
    : forwardSpeed < 0;
  if (approachingFromThisSide) return distance <= WORLD_GATE_AUTO_OPEN_DISTANCE_METERS;
  return distanceToGate < 0
    && forwardSpeed > 0
    && distance <= WORLD_GATE_PASSAGE_CLEARANCE_METERS;
}
