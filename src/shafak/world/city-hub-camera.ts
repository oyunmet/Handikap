import type { CityPosition } from "./city-hub-layout";

export type CityCameraVector = CityPosition & { y: number };

export type CityCameraObstacle = {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
};

export type CityCameraFrame = {
  position: CityCameraVector;
  target: CityCameraVector;
  occluded: boolean;
};

const CAMERA_HEIGHT = 5.2;
const CAMERA_LOOK_AHEAD = 1.05;
const CAMERA_TARGET_HEIGHT = 1.28;
const CAMERA_RADIUS = 0.28;
const CAMERA_CLEARANCE = 0.38;
const MIN_CAMERA_DISTANCE = 2.5;
const CAMERA_OFFSETS = [
  { back: 7.2, side: 2.6 },
  { back: 7.2, side: -2.6 },
  { back: 7.2, side: 0 },
  { back: 6.2, side: 1.5 },
  { back: 6.2, side: -1.5 },
  { back: 5.6, side: 0 },
] as const;

function getSegmentBoxEntry(
  start: CityCameraVector,
  end: CityCameraVector,
  obstacle: CityCameraObstacle,
  margin: number,
) {
  const box = {
    minX: obstacle.x - obstacle.width / 2 - margin,
    maxX: obstacle.x + obstacle.width / 2 + margin,
    minY: -0.15 - margin,
    maxY: obstacle.height + margin,
    minZ: obstacle.z - obstacle.depth / 2 - margin,
    maxZ: obstacle.z + obstacle.depth / 2 + margin,
  };
  let entry = 0;
  let exit = 1;
  for (const axis of ["x", "y", "z"] as const) {
    const delta = end[axis] - start[axis];
    const min = box[`min${axis.toUpperCase()}` as "minX" | "minY" | "minZ"];
    const max = box[`max${axis.toUpperCase()}` as "maxX" | "maxY" | "maxZ"];
    if (Math.abs(delta) < 1e-9) {
      if (start[axis] < min || start[axis] > max) return null;
      continue;
    }
    const first = (min - start[axis]) / delta;
    const second = (max - start[axis]) / delta;
    entry = Math.max(entry, Math.min(first, second));
    exit = Math.min(exit, Math.max(first, second));
    if (entry > exit) return null;
  }
  return exit < 0 || entry > 1 ? null : Math.max(0, entry);
}

function isCityCameraPointClear(point: CityCameraVector, obstacles: readonly CityCameraObstacle[]) {
  return obstacles.every((obstacle) => (
    point.x < obstacle.x - obstacle.width / 2 - CAMERA_RADIUS
    || point.x > obstacle.x + obstacle.width / 2 + CAMERA_RADIUS
    || point.y < -0.15 - CAMERA_RADIUS
    || point.y > obstacle.height + CAMERA_RADIUS
    || point.z < obstacle.z - obstacle.depth / 2 - CAMERA_RADIUS
    || point.z > obstacle.z + obstacle.depth / 2 + CAMERA_RADIUS
  ));
}

export function isCityCameraPathClear(
  start: CityCameraVector,
  end: CityCameraVector,
  obstacles: readonly CityCameraObstacle[],
) {
  return obstacles.every((obstacle) => (
    getSegmentBoxEntry(start, end, obstacle, CAMERA_RADIUS) === null
  ));
}

export function getCityCameraFrame(
  player: CityPosition,
  facing: CityPosition,
  obstacles: readonly CityCameraObstacle[] = [],
): CityCameraFrame {
  const facingLength = Math.hypot(facing.x, facing.z);
  const facingX = facingLength > 0.01 ? facing.x / facingLength : 0;
  const facingZ = facingLength > 0.01 ? facing.z / facingLength : -1;
  const rightX = -facingZ;
  const rightZ = facingX;
  const target = {
    x: player.x + facingX * CAMERA_LOOK_AHEAD,
    y: CAMERA_TARGET_HEIGHT,
    z: player.z + facingZ * CAMERA_LOOK_AHEAD,
  };
  let bestClipped: { position: CityCameraVector; distance: number } | null = null;

  for (let index = 0; index < CAMERA_OFFSETS.length; index += 1) {
    const { back, side } = CAMERA_OFFSETS[index];
    const desired = {
      x: player.x - facingX * back + rightX * side,
      y: CAMERA_HEIGHT,
      z: player.z - facingZ * back + rightZ * side,
    };
    const length = Math.hypot(
      desired.x - target.x,
      desired.y - target.y,
      desired.z - target.z,
    );
    const firstHit = obstacles.reduce<number | null>((nearest, obstacle) => {
      const entry = getSegmentBoxEntry(target, desired, obstacle, CAMERA_RADIUS);
      return entry === null ? nearest : nearest === null ? entry : Math.min(nearest, entry);
    }, null);

    if (firstHit === null && isCityCameraPointClear(desired, obstacles)) {
      return { position: desired, target, occluded: index > 0 };
    }

    const safeDistance = Math.max(0, (firstHit ?? 1) * length - CAMERA_CLEARANCE);
    const fraction = length > 0 ? Math.min(1, safeDistance / length) : 0;
    const clipped = {
      x: target.x + (desired.x - target.x) * fraction,
      y: target.y + (desired.y - target.y) * fraction,
      z: target.z + (desired.z - target.z) * fraction,
    };
    const clearPath = isCityCameraPathClear(target, clipped, obstacles);
    const distance = Math.hypot(
      clipped.x - target.x,
      clipped.y - target.y,
      clipped.z - target.z,
    );
    if (
      clearPath
      && isCityCameraPointClear(clipped, obstacles)
      && (!bestClipped || distance > bestClipped.distance)
    ) bestClipped = { position: clipped, distance };
  }

  if (bestClipped) {
    return { position: bestClipped.position, target, occluded: true };
  }

  return {
    position: {
      x: player.x - facingX * CAMERA_OFFSETS[0].back + rightX * CAMERA_OFFSETS[0].side,
      y: CAMERA_HEIGHT,
      z: player.z - facingZ * CAMERA_OFFSETS[0].back + rightZ * CAMERA_OFFSETS[0].side,
    },
    target,
    occluded: true,
  };
}
