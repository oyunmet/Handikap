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

export type WarRoomCameraPlacement = WarRoomCameraSweep & {
  position: WarRoomCameraPoint;
  usedAlternate: boolean;
};

export type WarRoomInteriorCameraBounds = {
  x: number;
  z: number;
  width: number;
  depth: number;
  rotationY: number;
};

function pointAlongSegment(
  start: WarRoomCameraPoint,
  end: WarRoomCameraPoint,
  distance: number,
): WarRoomCameraPoint {
  const segmentLength = Math.hypot(end.x - start.x, end.y - start.y, end.z - start.z);
  if (segmentLength < 1e-8) return { ...start };
  const fraction = Math.max(0, Math.min(1, distance / segmentLength));
  return {
    x: start.x + (end.x - start.x) * fraction,
    y: start.y + (end.y - start.y) * fraction,
    z: start.z + (end.z - start.z) * fraction,
  };
}

export function clampWarRoomCameraToInterior(
  point: WarRoomCameraPoint,
  interior: WarRoomInteriorCameraBounds,
  clearance = 0.62,
): WarRoomCameraPoint {
  const cosine = Math.cos(interior.rotationY);
  const sine = Math.sin(interior.rotationY);
  const dx = point.x - interior.x;
  const dz = point.z - interior.z;
  const localX = Math.max(
    -Math.max(0, interior.width / 2 - clearance),
    Math.min(Math.max(0, interior.width / 2 - clearance), cosine * dx - sine * dz),
  );
  const localZ = Math.max(
    -Math.max(0, interior.depth / 2 - clearance),
    Math.min(Math.max(0, interior.depth / 2 - clearance), sine * dx + cosine * dz),
  );
  return {
    x: interior.x + cosine * localX + sine * localZ,
    y: point.y,
    z: interior.z - sine * localX + cosine * localZ,
  };
}

export function getWarRoomRearCameraFrame(
  feet: WarRoomCameraPoint,
  bodyYaw: number,
  pitch: number,
  back: number,
  shoulder: number,
  cameraHeight: number,
  focusAhead: number,
  focusHeight: number,
) {
  const forwardX = Math.sin(bodyYaw) * Math.cos(pitch);
  const forwardY = Math.sin(pitch);
  const forwardZ = -Math.cos(bodyYaw) * Math.cos(pitch);
  const rightX = Math.cos(bodyYaw);
  const rightZ = Math.sin(bodyYaw);
  return {
    position: {
      x: feet.x - forwardX * back + rightX * shoulder,
      y: feet.y + cameraHeight + 0.35 - forwardY * back,
      z: feet.z - forwardZ * back + rightZ * shoulder,
    },
    lookAt: {
      x: feet.x + forwardX * focusAhead,
      y: feet.y + focusHeight + forwardY * focusAhead,
      z: feet.z + forwardZ * focusAhead,
    },
  };
}

/**
 * Indoor views stay on the direct shoulder-camera segment. Searching lateral
 * alternatives here can put the camera outside a house through its walls.
 */
export function resolveWarRoomInteriorCameraPlacement(
  start: WarRoomCameraPoint,
  end: WarRoomCameraPoint,
  bounds: readonly WarRoomCameraBounds[],
  interior: WarRoomInteriorCameraBounds,
  radius = 0.28,
  minimumDistance = 1.2,
  clearance = 0.08,
): WarRoomCameraPlacement {
  const candidate = clampWarRoomCameraToInterior(end, interior, radius + 0.24);
  const sweep = resolveWarRoomCameraSweep(start, candidate, bounds, radius, minimumDistance, clearance);
  const distance = Math.hypot(candidate.x - start.x, candidate.y - start.y, candidate.z - start.z);
  const placedDistance = sweep.blocked
    ? Math.max(sweep.safeDistance, Math.min(distance, minimumDistance))
    : distance;
  return {
    ...sweep,
    safeDistance: placedDistance,
    position: pointAlongSegment(start, candidate, placedDistance),
    usedAlternate: false,
  };
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

export function getWarRoomCameraBlockerIds(
  start: WarRoomCameraPoint,
  end: WarRoomCameraPoint,
  bounds: readonly WarRoomCameraBounds[],
  radius = 0.28,
) {
  const blockers = new Set<string>();
  for (const obstacle of bounds) {
    if (getSegmentBoxEntry(start, end, obstacle, radius) !== null) {
      blockers.add(obstacle.id);
    }
  }
  return blockers;
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

/**
 * Finds a collision-free shoulder-camera path before shortening the view.
 * A close wall may force a small fallback distance, but lateral and elevated
 * candidates are tried first so ordinary corridors retain third-person scale.
 */
export function resolveWarRoomCameraPlacement(
  start: WarRoomCameraPoint,
  end: WarRoomCameraPoint,
  bounds: readonly WarRoomCameraBounds[],
  radius = 0.28,
  minimumDistance = 2.5,
  clearance = 0.08,
): WarRoomCameraPlacement {
  const directionX = end.x - start.x;
  const directionZ = end.z - start.z;
  const horizontalLength = Math.hypot(directionX, directionZ);
  const rightX = horizontalLength > 1e-8 ? directionZ / horizontalLength : 1;
  const rightZ = horizontalLength > 1e-8 ? -directionX / horizontalLength : 0;
  const offsets = [
    [0, 0, 0],
    [rightX * 0.72, 0, rightZ * 0.72],
    [-rightX * 0.72, 0, -rightZ * 0.72],
    [rightX * 1.3, 0, rightZ * 1.3],
    [-rightX * 1.3, 0, -rightZ * 1.3],
    [0, 0.55, 0],
    [0, 0.95, 0],
    [rightX * 0.72, 0.55, rightZ * 0.72],
    [-rightX * 0.72, 0.55, -rightZ * 0.72],
  ] as const;
  const candidates = offsets.map(([offsetX, offsetY, offsetZ]) => ({
    x: end.x + offsetX,
    y: end.y + offsetY,
    z: end.z + offsetZ,
    usedAlternate: offsetX !== 0 || offsetY !== 0 || offsetZ !== 0,
  }));
  // Keep every alternate on the rear half of the player's facing direction.
  // Side/front angles can make the player face the camera in tight interiors.
  for (const angle of [-Math.PI / 6, Math.PI / 6, -Math.PI / 3, Math.PI / 3]) {
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    candidates.push({
      x: start.x + directionX * cosine + directionZ * sine,
      y: end.y,
      z: start.z - directionX * sine + directionZ * cosine,
      usedAlternate: true,
    });
  }

  let bestFallback: WarRoomCameraPlacement | null = null;
  for (const candidate of candidates) {
    const sweep = resolveWarRoomCameraSweep(
      start,
      candidate,
      bounds,
      radius,
      minimumDistance,
      clearance,
    );
    const position = pointAlongSegment(start, candidate, sweep.safeDistance);
    const pointClear = isWarRoomCameraPointClear(position, bounds, radius);
    const placement = {
      ...sweep,
      position,
      usedAlternate: candidate.usedAlternate,
    };
    if (
      pointClear
      && (!sweep.blocked || sweep.safeDistance >= minimumDistance)
    ) {
      return placement;
    }
    if (
      pointClear
      && (!bestFallback || sweep.safeDistance > bestFallback.safeDistance)
    ) {
      bestFallback = placement;
    }
  }

  if (bestFallback) return bestFallback;
  const primarySweep = resolveWarRoomCameraSweep(
    start,
    end,
    bounds,
    radius,
    minimumDistance,
    clearance,
  );
  return {
    ...primarySweep,
    position: pointAlongSegment(start, end, primarySweep.safeDistance),
    usedAlternate: false,
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
    : 0.6;
  const zoom = Number.isFinite(victoryZoom)
    ? Math.max(0, Math.min(1, victoryZoom))
    : 0;
  const back = (aiming ? 3.65 : 4.8) * (1 - zoom * 0.18);
  const shoulder = (aiming ? Math.max(0, offset + 0.1) : offset)
    * (shoulderSide === "left" ? -1 : 1);

  return { back, shoulder };
}
