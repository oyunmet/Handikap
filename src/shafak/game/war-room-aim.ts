import { WAR_ROOM_CHARACTER_HEIGHT, WAR_ROOM_HEADSHOT_HEIGHT_RATIO } from "./war-room-data";

export type WarRoomAimTarget = {
  x: number;
  z: number;
  alive: boolean;
  commander: boolean;
  floorHeight?: number;
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

export type WarRoomMeleeConeReason = "hit" | "range" | "angle" | "blocked" | "no-target";

export type WarRoomMeleeConeResult<T extends WarRoomAimTarget> = {
  target: T | null;
  targetIndex: number | null;
  distance: number;
  angleDegrees: number | null;
  reason: WarRoomMeleeConeReason;
};

export const WAR_ROOM_SPEAR_RANGE_TOLERANCE_METERS = 0.4;

export function getWarRoomMeleeEffectiveReach(
  weaponId: string,
  baseRange: number,
  attackRangeBonus = 0,
) {
  const spearTolerance = weaponId === "melee_spear" || weaponId === "melee_war_spear"
    ? WAR_ROOM_SPEAR_RANGE_TOLERANCE_METERS
    : 0;
  return Math.max(0, baseRange) + attackRangeBonus + spearTolerance;
}

/**
 * Finds the nearest living target inside a horizontal, character-facing melee cone.
 * The blocker callback is evaluated per candidate so cover only blocks targets
 * behind that specific obstacle, not other enemies elsewhere in the cone.
 */
export function traceWarRoomMeleeCone<T extends WarRoomAimTarget>(
  origin: Pick<Vector3Like, "x" | "z">,
  rawForward: Pick<Vector3Like, "x" | "z">,
  targets: readonly T[],
  range: number,
  halfAngleDegrees = 50,
  isBlocked: (target: T, distance: number) => boolean = () => false,
): WarRoomMeleeConeResult<T> {
  const forwardLength = Math.hypot(rawForward.x, rawForward.z);
  const forwardX = forwardLength > 1e-8 ? rawForward.x / forwardLength : 0;
  const forwardZ = forwardLength > 1e-8 ? rawForward.z / forwardLength : -1;
  const minDot = Math.cos((Math.max(0, Math.min(180, halfAngleDegrees)) * Math.PI) / 180);
  let nearestTarget: T | null = null;
  let nearestIndex: number | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  let anyLiving = false;
  let anyInRange = false;
  let anyInAngle = false;
  let anyBlocked = false;
  let nearestFailureDistance = Number.POSITIVE_INFINITY;
  let nearestFailureAngleDegrees: number | null = null;
  let nearestTargetAngleDegrees: number | null = null;

  targets.forEach((candidate, index) => {
    if (!candidate.alive) return;
    anyLiving = true;
    const dx = candidate.x - origin.x;
    const dz = candidate.z - origin.z;
    const centerDistance = Math.hypot(dx, dz);
    const bodyRadius = candidate.commander ? 0.38 : 0.3;
    const surfaceDistance = Math.max(0, centerDistance - bodyRadius);
    const dot = centerDistance > 1e-8
      ? Math.max(-1, Math.min(1, (dx * forwardX + dz * forwardZ) / centerDistance))
      : 1;
    const angleDegrees = Math.acos(dot) * 180 / Math.PI;
    const recordFailure = () => {
      if (surfaceDistance < nearestFailureDistance) {
        nearestFailureDistance = surfaceDistance;
        nearestFailureAngleDegrees = angleDegrees;
      }
    };
    if (surfaceDistance > range) {
      recordFailure();
      return;
    }
    anyInRange = true;
    if (dot < minDot) {
      recordFailure();
      return;
    }
    anyInAngle = true;
    if (isBlocked(candidate, surfaceDistance)) {
      anyBlocked = true;
      recordFailure();
      return;
    }
    if (surfaceDistance < nearestDistance) {
      nearestTarget = candidate;
      nearestIndex = index;
      nearestDistance = surfaceDistance;
      nearestTargetAngleDegrees = angleDegrees;
    }
  });

  const reason: WarRoomMeleeConeReason = nearestTarget
    ? "hit"
    : !anyLiving
      ? "no-target"
      : !anyInRange
        ? "range"
        : anyBlocked && anyInAngle
          ? "blocked"
          : "angle";
  return {
    target: nearestTarget,
    targetIndex: nearestIndex,
    distance: nearestTarget ? nearestDistance : nearestFailureDistance,
    angleDegrees: nearestTarget ? nearestTargetAngleDegrees : nearestFailureAngleDegrees,
    reason,
  };
}

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
  targetRadiusPadding = 0,
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
    const floorHeight = Number.isFinite(candidate.floorHeight)
      ? Math.max(0, candidate.floorHeight ?? 0)
      : 0;
    const headshotFloor = height * WAR_ROOM_HEADSHOT_HEIGHT_RATIO;
    const headshotRadius = height * (1 - WAR_ROOM_HEADSHOT_HEIGHT_RATIO) / 2 + targetRadiusPadding;
    const headDistance = raySphereDistance(
      origin,
      direction,
      { x: candidate.x, y: floorHeight + headshotFloor + headshotRadius, z: candidate.z },
      headshotRadius,
    );
    const bodyRadius = (candidate.commander ? 0.29 : 0.25) + targetRadiusPadding;
    const bodyDistance = rayCapsuleDistance(
      origin,
      direction,
      candidate.x,
      candidate.z,
      floorHeight + bodyRadius,
      floorHeight + headshotFloor - bodyRadius,
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

export function traceWarRoomMeleeRay<T extends WarRoomAimTarget>(
  origin: Vector3Like,
  direction: Vector3Like,
  targets: readonly T[],
  range: number,
  blockedAtFraction: number | null = null,
) {
  return traceWarRoomRay(origin, direction, targets, range, blockedAtFraction, 0.34);
}
