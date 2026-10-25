import { WAR_ROOM_CHARACTER_HEIGHT, WAR_ROOM_HEADSHOT_HEIGHT_RATIO } from "./war-room-data";

export type WarRoomAimTarget = {
  x: number;
  z: number;
  alive: boolean;
  commander: boolean;
};

export type WarRoomAimPoint = { x: number; y: number; z: number };

export type WarRoomAimResult<T extends WarRoomAimTarget> = {
  target: T | null;
  targetIndex: number | null;
  point: WarRoomAimPoint;
  distance: number;
  headshot: boolean;
  blocked: boolean;
};

type Vector3Like = { x: number; y: number; z: number };

function raySphereDistance(
  origin: Vector3Like,
  direction: Vector3Like,
  center: Vector3Like,
  radius: number,
) {
  const offsetX = origin.x - center.x;
  const offsetY = origin.y - center.y;
  const offsetZ = origin.z - center.z;
  const projection = offsetX * direction.x + offsetY * direction.y + offsetZ * direction.z;
  const discriminant = projection * projection
    - (offsetX * offsetX + offsetY * offsetY + offsetZ * offsetZ - radius * radius);
  if (discriminant < 0) return null;
  const near = -projection - Math.sqrt(discriminant);
  const far = -projection + Math.sqrt(discriminant);
  return near >= 0 ? near : far >= 0 ? far : null;
}

function rayCapsuleDistance(
  origin: Vector3Like,
  direction: Vector3Like,
  x: number,
  z: number,
  bottom: number,
  top: number,
  radius: number,
) {
  let nearest = Number.POSITIVE_INFINITY;
  const horizontalDirection = direction.x * direction.x + direction.z * direction.z;
  if (horizontalDirection > 1e-8) {
    const offsetX = origin.x - x;
    const offsetZ = origin.z - z;
    const b = 2 * (offsetX * direction.x + offsetZ * direction.z);
    const c = offsetX * offsetX + offsetZ * offsetZ - radius * radius;
    const discriminant = b * b - 4 * horizontalDirection * c;
    if (discriminant >= 0) {
      const root = Math.sqrt(discriminant);
      for (const distance of [
        (-b - root) / (2 * horizontalDirection),
        (-b + root) / (2 * horizontalDirection),
      ]) {
        const height = origin.y + direction.y * distance;
        if (distance >= 0 && height >= bottom && height <= top) nearest = Math.min(nearest, distance);
      }
    }
  }

  for (const capY of [bottom, top]) {
    const distance = raySphereDistance(origin, direction, { x, y: capY, z }, radius);
    if (distance !== null) nearest = Math.min(nearest, distance);
  }
  return Number.isFinite(nearest) ? nearest : null;
}

/**
 * Resolves the center-screen camera ray against world-space enemy capsules.
 * This deliberately does not depend on rendered model meshes or their GLB rigs.
 */
export function traceWarRoomRay<T extends WarRoomAimTarget>(
  origin: Vector3Like,
  rawDirection: Vector3Like,
  targets: readonly T[],
  range: number,
  blockedAtFraction: number | null = null,
): WarRoomAimResult<T> {
  const directionLength = Math.hypot(rawDirection.x, rawDirection.y, rawDirection.z);
  const direction = directionLength > 1e-8
    ? {
        x: rawDirection.x / directionLength,
        y: rawDirection.y / directionLength,
        z: rawDirection.z / directionLength,
      }
    : { x: 0, y: 0, z: -1 };

  const blockDistance = blockedAtFraction === null
    ? Number.POSITIVE_INFINITY
    : Math.max(0, Math.min(1, blockedAtFraction)) * range;
  let nearestDistance = Math.min(range, blockDistance);
  let target: T | null = null;
  let targetIndex: number | null = null;
  let headshot = false;

  targets.forEach((candidate, index) => {
    if (!candidate.alive) return;
    const height = WAR_ROOM_CHARACTER_HEIGHT * (candidate.commander ? 1.3 : 1);
    const headshotFloor = height * WAR_ROOM_HEADSHOT_HEIGHT_RATIO;
    const headshotRadius = height * (1 - WAR_ROOM_HEADSHOT_HEIGHT_RATIO) / 2;
    const headDistance = raySphereDistance(
      origin,
      direction,
      { x: candidate.x, y: headshotFloor + headshotRadius, z: candidate.z },
      headshotRadius,
    );
    const bodyRadius = candidate.commander ? 0.29 : 0.25;
    const bodyDistance = rayCapsuleDistance(
      origin,
      direction,
      candidate.x,
      candidate.z,
      bodyRadius,
      headshotFloor - bodyRadius,
      bodyRadius,
    );
    const hitsHead = headDistance !== null && headDistance <= range;
    const hitsBody = bodyDistance !== null && bodyDistance <= range;
    const distance = hitsHead && (!hitsBody || headDistance! <= bodyDistance!)
      ? headDistance!
      : hitsBody ? bodyDistance! : null;
    if (distance === null || distance >= nearestDistance || distance >= blockDistance) return;
    nearestDistance = distance;
    target = candidate;
    targetIndex = index;
    headshot = hitsHead && distance === headDistance;
  });

  const blocked = target === null && blockDistance <= range;
  const impactDistance = target ? nearestDistance : Math.min(range, blockDistance);
  return {
    target,
    targetIndex,
    point: {
      x: origin.x + direction.x * impactDistance,
      y: origin.y + direction.y * impactDistance,
      z: origin.z + direction.z * impactDistance,
    },
    distance: impactDistance,
    headshot,
    blocked,
  };
}
