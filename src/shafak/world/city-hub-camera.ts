import type { CityPosition } from "./city-hub-layout";
import type { CityCameraControl } from "./city-hub-controls";

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
const ORBIT_ANGLES = [
  0,
  Math.PI / 8,
  -Math.PI / 8,
  Math.PI / 4,
  -Math.PI / 4,
  (3 * Math.PI) / 8,
  (-3 * Math.PI) / 8,
  Math.PI / 2,
  -Math.PI / 2,
  (5 * Math.PI) / 8,
  (-5 * Math.PI) / 8,
  (3 * Math.PI) / 4,
  (-3 * Math.PI) / 4,
  (7 * Math.PI) / 8,
  (-7 * Math.PI) / 8,
  Math.PI,
] as const;
const ORBIT_DISTANCES = [6.2, 5.2, 4.2, 3.2] as const;
const ORBIT_HEIGHTS = [CAMERA_HEIGHT, 4.4, 3.6] as const;
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

export function isCityCameraPointClear(point: CityCameraVector, obstacles: readonly CityCameraObstacle[]) {
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
  cameraControl: CityCameraControl = { yaw: 0, pitch: 0 },
  obstacles: readonly CityCameraObstacle[] = [],
): CityCameraFrame {
  const yaw = Number.isFinite(cameraControl.yaw) ? cameraControl.yaw : 0;
  const facingX = Math.sin(yaw);
  const facingZ = -Math.cos(yaw);
  const rightX = Math.cos(yaw);
  const rightZ = Math.sin(yaw);
  const intendedTarget = {
    x: player.x + facingX * CAMERA_LOOK_AHEAD,
    y: CAMERA_TARGET_HEIGHT,
    z: player.z + facingZ * CAMERA_LOOK_AHEAD,
  };
  // At a doorway the look-ahead point can land inside the solid wall even
  // though the player is still standing in the street. Starting the camera
  // sweep there leaves every shoulder blocked and can put the camera in a roof.
  const targetWasClamped = !isCityCameraPointClear(intendedTarget, obstacles);
  const target = targetWasClamped
    ? { x: player.x, y: CAMERA_TARGET_HEIGHT, z: player.z }
    : intendedTarget;
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
       return { position: desired, target, occluded: targetWasClamped || index > 0 };
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
      && distance >= MIN_CAMERA_DISTANCE
      && (!bestClipped || distance > bestClipped.distance)
    ) bestClipped = { position: clipped, distance };
  }

  if (bestClipped) {
    return { position: bestClipped.position, target, occluded: true };
  }

  // If the usual shoulders are blocked, search around the hero at a lower
  // third-person height instead of switching to a bird's-eye fallback.
  const backX = -facingX;
  const backZ = -facingZ;
  for (const angle of ORBIT_ANGLES) {
    const back = Math.cos(angle);
    const side = Math.sin(angle);
    for (const distance of ORBIT_DISTANCES) {
      for (const height of ORBIT_HEIGHTS) {
        const candidate = {
          x: target.x + backX * back * distance + rightX * side * distance,
          y: height,
          z: target.z + backZ * back * distance + rightZ * side * distance,
        };
        const cameraDistance = Math.hypot(
          candidate.x - target.x,
          candidate.y - target.y,
          candidate.z - target.z,
        );
        if (
          cameraDistance >= MIN_CAMERA_DISTANCE
          && isCityCameraPointClear(candidate, obstacles)
          && isCityCameraPathClear(target, candidate, obstacles)
        ) return { position: candidate, target, occluded: true };
      }
    }
  }

  // Keep a stable over-the-shoulder view if a malformed obstacle layout
  // leaves no clear orbit point. The renderer remains in the 3D scene.
  return {
    position: {
      x: player.x - facingX * 4.2 + rightX * 1.2,
      y: 4.2,
      z: player.z - facingZ * 4.2 + rightZ * 1.2,
    },
    target,
    occluded: true,
  };
}
