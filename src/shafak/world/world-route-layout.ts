import {
  WORLD_CHUNK_LENGTH_METERS,
  WORLD_GATE_INTERVAL_METERS,
} from "./movement.ts";

type RouteSide = "left" | "right";
type RoutePoint = readonly [x: number, z: number];

const FORK_CONTROL_POINTS: RoutePoint[] = [
  [0, 30],
  [0.72, 20],
  [1.58, 10],
  [2.2, 0],
  [2.2, -8],
  [1.12, -18],
  [0, -28],
];

export function getWorldForkCenterline(
  side: RouteSide,
  samplesPerSegment = 8,
): RoutePoint[] {
  const sampleCount = Math.max(1, Math.min(32, Math.floor(samplesPerSegment) || 1));
  const direction = side === "left" ? -1 : 1;
  const points: RoutePoint[] = [];

  for (let segment = 0; segment < FORK_CONTROL_POINTS.length - 1; segment += 1) {
    const [fromX, fromZ] = FORK_CONTROL_POINTS[segment];
    const [toX, toZ] = FORK_CONTROL_POINTS[segment + 1];
    for (let index = 0; index < sampleCount; index += 1) {
      const progress = index / sampleCount;
      const eased = progress * progress * (3 - 2 * progress);
      const x = direction * (fromX + (toX - fromX) * eased);
      points.push([
        x === 0 ? 0 : x,
        fromZ + (toZ - fromZ) * progress,
      ]);
    }
  }

  const [lastX, lastZ] = FORK_CONTROL_POINTS.at(-1)!;
  const finalX = direction * lastX;
  points.push([finalX === 0 ? 0 : finalX, lastZ]);
  return points;
}

export function getWorldForkGateDistances(chunkIndexes: readonly number[]): number[] {
  const distances = new Set<number>();
  for (const index of chunkIndexes) {
    if (!Number.isSafeInteger(index) || index <= 0) continue;
    const distance = index * WORLD_CHUNK_LENGTH_METERS;
    if (distance % WORLD_GATE_INTERVAL_METERS === 0) distances.add(distance);
  }
  return [...distances].sort((left, right) => left - right);
}
