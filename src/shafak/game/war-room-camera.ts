export type WarRoomCameraPoint = { x: number; y: number; z: number };

export type WarRoomCameraBounds = {
  id: string;
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
};

export type WarRoomCameraSweep = {
  blocked: boolean;
  blockerId: string | null;
  hitDistance: number | null;
  safeDistance: number;
};

function expandedBounds(bounds: WarRoomCameraBounds, radius: number) {
  return {
    minX: bounds.minX - radius,
    minY: bounds.minY - radius,
    minZ: bounds.minZ - radius,
    maxX: bounds.maxX + radius,
    maxY: bounds.maxY + radius,
    maxZ: bounds.maxZ + radius,
  };
}

function containsPoint(bounds: ReturnType<typeof expandedBounds>, point: WarRoomCameraPoint) {
  return point.x >= bounds.minX && point.x <= bounds.maxX
    && point.y >= bounds.minY && point.y <= bounds.maxY
    && point.z >= bounds.minZ && point.z <= bounds.maxZ;
}

export function isWarRoomCameraPointClear(
  point: WarRoomCameraPoint,
  bounds: readonly WarRoomCameraBounds[],
  radius = 0.22,
) {
  return bounds.every((obstacle) => {
    const box = expandedBounds(obstacle, radius);
    return point.x < box.minX || point.x > box.maxX
      || point.y < box.minY || point.y > box.maxY
      || point.z < box.minZ || point.z > box.maxZ;
  });
}

function getSegmentBoxEntry(
  start: WarRoomCameraPoint,
  end: WarRoomCameraPoint,
  bounds: WarRoomCameraBounds,
  radius: number,
) {
  const box = expandedBounds(bounds, radius);
  let entry = 0;
  let exit = 1;
  for (const axis of ["x", "y", "z"] as const) {
    const delta = end[axis] - start[axis];
    if (Math.abs(delta) < 1e-9) {
      if (start[axis] < box[`min${axis.toUpperCase()}` as "minX" | "minY" | "minZ"]
        || start[axis] > box[`max${axis.toUpperCase()}` as "maxX" | "maxY" | "maxZ"]) return null;
      continue;
    }
    const min = box[`min${axis.toUpperCase()}` as "minX" | "minY" | "minZ"];
    const max = box[`max${axis.toUpperCase()}` as "maxX" | "maxY" | "maxZ"];
    const first = (min - start[axis]) / delta;
    const second = (max - start[axis]) / delta;
    entry = Math.max(entry, Math.min(first, second));
    exit = Math.min(exit, Math.max(first, second));
    if (entry > exit) return null;
  }
  return exit < 0 || entry > 1 ? null : Math.max(0, entry);
}

export function resolveWarRoomCameraSweep(
  start: WarRoomCameraPoint,
  end: WarRoomCameraPoint,
  bounds: readonly WarRoomCameraBounds[],
  radius = 0.22,
  minimumDistance = 1.2,
  clearance = 0.08,
): WarRoomCameraSweep {
  const distance = Math.hypot(end.x - start.x, end.y - start.y, end.z - start.z);
  if (distance < 1e-8) {
    return { blocked: false, blockerId: null, hitDistance: null, safeDistance: distance };
  }

  let nearest: { id: string; distance: number; startsInside: boolean } | null = null;
  for (const obstacle of bounds) {
    const startsInside = containsPoint(expandedBounds(obstacle, radius), start);
    const fraction = getSegmentBoxEntry(start, end, obstacle, radius);
    if (fraction === null) continue;
    const hitDistance = fraction * distance;
    if (nearest && hitDistance >= nearest.distance) continue;
    nearest = { id: obstacle.id, distance: hitDistance, startsInside };
  }

  if (!nearest) {
    return { blocked: false, blockerId: null, hitDistance: null, safeDistance: distance };
  }

  // The camera can begin within the expanded wall bounds when the player is
  // close to a wall. Clamp-to-zero pushes the camera into the player; instead
  // keep the shoulder distance and let the matching wall fade out.
  if (nearest.startsInside) {
    return {
      blocked: true,
      blockerId: nearest.id,
      hitDistance: 0,
      safeDistance: distance,
    };
  }

  const beforeImpact = Math.max(0.2, nearest.distance - clearance);
  return {
    blocked: true,
    blockerId: nearest.id,
    hitDistance: nearest.distance,
    // Keep the requested 1.2 m minimum unless the obstacle itself is closer;
    // in that case stop before the expanded box rather than placing the camera inside it.
    safeDistance: nearest.distance <= minimumDistance + clearance
      ? beforeImpact
      : Math.max(minimumDistance, beforeImpact),
  };
}

export type WarRoomCameraMode = "first-person" | "third-person";
export type WarRoomShoulderSide = "left" | "right";

export function getWarRoomCameraRig({
  mode,
  aiming,
  shoulderOffset,
  shoulderSide,
  victoryZoom = 0,
}: {
  mode: WarRoomCameraMode;
  aiming: boolean;
  shoulderOffset: number;
  shoulderSide: WarRoomShoulderSide;
  victoryZoom?: number;
}) {
  if (mode === "first-person") return { back: 0, shoulder: 0 };

  const offset = Number.isFinite(shoulderOffset)
    ? Math.max(0, Math.min(1.5, shoulderOffset))
    : 0.92;
  const zoom = Number.isFinite(victoryZoom)
    ? Math.max(0, Math.min(1, victoryZoom))
    : 0;
  const back = (aiming ? 2.75 : 3.65) * (1 - zoom * 0.18);
  const shoulder = (aiming ? Math.max(0, offset + 0.1) : offset)
    * (shoulderSide === "left" ? -1 : 1);

  return { back, shoulder };
}
