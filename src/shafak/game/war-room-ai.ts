import {
  isWarRoomPointClear,
  WAR_ROOM_HALF_SIZE,
  type WarRoomBlocker,
  type WarRoomBuilding,
} from "./war-room-data";
import { segmentBlockFraction } from "./war-room-engine";
import {
  getWarRoomBuildingLocalPoint,
  getWarRoomBuildingWorldPoint,
  getWarRoomStairProfile,
} from "./war-room-rooms";

type PursuitActor = { x: number; z: number; floorHeight?: number };
type PursuitPlayer = { x: number; z: number; floorHeight: number };

type WarRoomNavigationGrid = {
  min: number;
  step: number;
  size: number;
  blocked: Uint8Array;
};

type CachedPursuitWaypoint = {
  targetX: number;
  targetZ: number;
  targetFloor: number;
  radius: number;
  x: number;
  z: number;
  lastDistance: number;
};

const navigationGrids = new WeakMap<readonly WarRoomBlocker[], Map<string, WarRoomNavigationGrid>>();
const pursuitWaypoints = new WeakMap<object, CachedPursuitWaypoint>();

function pointToSegmentDistance(
  point: { x: number; z: number },
  start: { x: number; z: number },
  end: { x: number; z: number },
) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  const fraction = lengthSquared > 0
    ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared))
    : 0;
  return Math.hypot(point.x - (start.x + dx * fraction), point.z - (start.z + dz * fraction));
}

function segmentIntersectsBounds(
  start: { x: number; z: number },
  end: { x: number; z: number },
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
) {
  let minimum = 0;
  let maximum = 1;
  for (const [origin, delta, low, high] of [
    [start.x, end.x - start.x, minX, maxX],
    [start.z, end.z - start.z, minZ, maxZ],
  ]) {
    if (Math.abs(delta) < 1e-8) {
      if (origin < low || origin > high) return false;
      continue;
    }
    const first = (low - origin) / delta;
    const second = (high - origin) / delta;
    minimum = Math.max(minimum, Math.min(first, second));
    maximum = Math.min(maximum, Math.max(first, second));
    if (minimum > maximum) return false;
  }
  return true;
}

function isWarRoomSegmentClear(
  start: { x: number; z: number },
  end: { x: number; z: number },
  blockers: readonly WarRoomBlocker[],
  radius: number,
  floorHeight: number,
) {
  for (const blocker of blockers) {
    if (blocker.kind === "platform") continue;
    const baseY = blocker.baseY ?? 0;
    if (floorHeight >= baseY + blocker.height || floorHeight + 1.8 <= baseY) continue;
    const minX = blocker.x - blocker.width / 2;
    const maxX = blocker.x + blocker.width / 2;
    const minZ = blocker.z - blocker.depth / 2;
    const maxZ = blocker.z + blocker.depth / 2;
    if (segmentIntersectsBounds(start, end, minX, maxX, minZ, maxZ)) return false;

    const startX = Math.max(minX, Math.min(maxX, start.x));
    const startZ = Math.max(minZ, Math.min(maxZ, start.z));
    const endX = Math.max(minX, Math.min(maxX, end.x));
    const endZ = Math.max(minZ, Math.min(maxZ, end.z));
    let distance = Math.min(
      Math.hypot(start.x - startX, start.z - startZ),
      Math.hypot(end.x - endX, end.z - endZ),
    );
    for (const corner of [
      { x: minX, z: minZ },
      { x: minX, z: maxZ },
      { x: maxX, z: minZ },
      { x: maxX, z: maxZ },
    ]) {
      distance = Math.min(distance, pointToSegmentDistance(corner, start, end));
    }
    if (distance < radius) return false;
  }
  return true;
}

function getWarRoomNavigationGrid(
  blockers: readonly WarRoomBlocker[],
  radius: number,
  floorHeight: number,
) {
  const key = `${radius.toFixed(2)}:${floorHeight.toFixed(1)}`;
  let byFloor = navigationGrids.get(blockers);
  const cached = byFloor?.get(key);
  if (cached) return cached;

  const step = 1;
  const min = -Math.floor(WAR_ROOM_HALF_SIZE - 2);
  const size = Math.floor((WAR_ROOM_HALF_SIZE - 2 - min) / step) + 1;
  const blocked = new Uint8Array(size * size);
  for (let row = 0; row < size; row += 1) {
    const z = min + row * step;
    for (let column = 0; column < size; column += 1) {
      const x = min + column * step;
      blocked[row * size + column] = isWarRoomPointClear(x, z, blockers, radius, floorHeight) ? 0 : 1;
    }
  }

  const grid = { min, step, size, blocked };
  if (!byFloor) {
    byFloor = new Map();
    navigationGrids.set(blockers, byFloor);
  }
  byFloor.set(key, grid);
  return grid;
}

function nearestClearGridIndex(x: number, z: number, grid: WarRoomNavigationGrid) {
  const centerX = Math.round((x - grid.min) / grid.step);
  const centerZ = Math.round((z - grid.min) / grid.step);
  for (let ring = 0; ring <= 5; ring += 1) {
    let bestIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let offsetZ = -ring; offsetZ <= ring; offsetZ += 1) {
      for (let offsetX = -ring; offsetX <= ring; offsetX += 1) {
        if (ring > 0 && Math.max(Math.abs(offsetX), Math.abs(offsetZ)) !== ring) continue;
        const column = centerX + offsetX;
        const row = centerZ + offsetZ;
        if (column < 0 || column >= grid.size || row < 0 || row >= grid.size) continue;
        const index = row * grid.size + column;
        if (grid.blocked[index]) continue;
        const distance = offsetX * offsetX + offsetZ * offsetZ;
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      }
    }
    if (bestIndex >= 0) return bestIndex;
  }
  return -1;
}

function nearestVisibleGridIndex(
  actor: PursuitActor,
  grid: WarRoomNavigationGrid,
  blockers: readonly WarRoomBlocker[],
  radius: number,
) {
  const centerX = Math.round((actor.x - grid.min) / grid.step);
  const centerZ = Math.round((actor.z - grid.min) / grid.step);
  const floorHeight = actor.floorHeight ?? 0;
  for (let ring = 0; ring <= 5; ring += 1) {
    let bestIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let offsetZ = -ring; offsetZ <= ring; offsetZ += 1) {
      for (let offsetX = -ring; offsetX <= ring; offsetX += 1) {
        if (ring > 0 && Math.max(Math.abs(offsetX), Math.abs(offsetZ)) !== ring) continue;
        const column = centerX + offsetX;
        const row = centerZ + offsetZ;
        if (column < 0 || column >= grid.size || row < 0 || row >= grid.size) continue;
        const index = row * grid.size + column;
        if (grid.blocked[index]) continue;
        const point = getGridPoint(index, grid);
        if (!isWarRoomSegmentClear(actor, point, blockers, radius, floorHeight)) continue;
        const distance = offsetX * offsetX + offsetZ * offsetZ;
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      }
    }
    if (bestIndex >= 0) return bestIndex;
  }
  return -1;
}

function getGridPoint(index: number, grid: WarRoomNavigationGrid) {
  const row = Math.floor(index / grid.size);
  const column = index - row * grid.size;
  return { x: grid.min + column * grid.step, z: grid.min + row * grid.step };
}

function findWarRoomGridWaypoint(
  actor: PursuitActor,
  target: PursuitActor,
  blockers: readonly WarRoomBlocker[],
  radius: number,
) {
  const floorHeight = actor.floorHeight ?? 0;
  const grid = getWarRoomNavigationGrid(blockers, radius, floorHeight);
  const startIndex = nearestVisibleGridIndex(actor, grid, blockers, radius);
  const goalIndex = nearestClearGridIndex(target.x, target.z, grid);
  if (startIndex < 0 || goalIndex < 0 || startIndex === goalIndex) return null;

  const previous = new Int32Array(grid.blocked.length);
  previous.fill(-1);
  previous[startIndex] = startIndex;
  const queue = new Int32Array(grid.blocked.length);
  let head = 0;
  let tail = 0;
  queue[tail++] = startIndex;
  const offsets = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
    [-1, -1], [1, -1], [-1, 1], [1, 1],
  ] as const;

  while (head < tail && previous[goalIndex] < 0) {
    const current = queue[head++]!;
    const row = Math.floor(current / grid.size);
    const column = current - row * grid.size;
    for (const [dx, dz] of offsets) {
      const nextColumn = column + dx;
      const nextRow = row + dz;
      if (nextColumn < 0 || nextColumn >= grid.size || nextRow < 0 || nextRow >= grid.size) continue;
      const next = nextRow * grid.size + nextColumn;
      if (grid.blocked[next] || previous[next] >= 0) continue;
      if (dx !== 0 && dz !== 0) {
        if (
          grid.blocked[row * grid.size + nextColumn]
          || grid.blocked[nextRow * grid.size + column]
        ) continue;
      }
      previous[next] = current;
      queue[tail++] = next;
    }
  }
  if (previous[goalIndex] < 0) return null;

  const path: number[] = [];
  for (let next = goalIndex; next !== startIndex; next = previous[next]!) {
    path.push(next);
  }
  path.reverse();

  let waypoint: { x: number; z: number } | null = null;
  for (const index of path) {
    const candidate = getGridPoint(index, grid);
    if (isWarRoomSegmentClear(actor, candidate, blockers, radius, floorHeight)) {
      waypoint = candidate;
    }
  }
  return waypoint;
}

export function getWarRoomObstacleWaypoint(
  actor: PursuitActor,
  target: PursuitActor,
  blockers: readonly WarRoomBlocker[],
  radius = 0.35,
) {
  const floorHeight = actor.floorHeight ?? 0;
  const targetFloor = target.floorHeight ?? floorHeight;
  if (Math.abs(floorHeight - targetFloor) > 0.8) return { x: target.x, z: target.z };

  const cached = pursuitWaypoints.get(actor);
  if (cached) {
    const distance = Math.hypot(cached.x - actor.x, cached.z - actor.z);
    const targetStillSimilar = Math.hypot(cached.targetX - target.x, cached.targetZ - target.z) <= 2.5
      && Math.abs(cached.targetFloor - targetFloor) <= 0.8
      && cached.radius === radius;
    const waypointStillReachable = isWarRoomPointClear(
      cached.x,
      cached.z,
      blockers,
      radius,
      floorHeight,
    ) && isWarRoomSegmentClear(actor, cached, blockers, radius, floorHeight);
    if (
      targetStillSimilar
      && waypointStillReachable
      && distance > 0.6
      && distance < cached.lastDistance - 0.005
    ) {
      cached.lastDistance = distance;
      return { x: cached.x, z: cached.z };
    }
    pursuitWaypoints.delete(actor);
  }

  const rememberWaypoint = (point: { x: number; z: number }) => {
    pursuitWaypoints.set(actor, {
      targetX: target.x,
      targetZ: target.z,
      targetFloor,
      radius,
      x: point.x,
      z: point.z,
      lastDistance: Math.hypot(point.x - actor.x, point.z - actor.z),
    });
    return point;
  };

  const startY = floorHeight + 0.9;
  const endY = targetFloor + 0.9;
  const start = { x: actor.x, y: startY, z: actor.z };
  const end = { x: target.x, y: endY, z: target.z };
  let firstBlocker: WarRoomBlocker | null = null;
  let nearestBlockDistance = Number.POSITIVE_INFINITY;

  for (const blocker of blockers) {
    if (blocker.kind === "platform" || isWarRoomSegmentClear(
      actor,
      target,
      [blocker],
      radius,
      floorHeight,
    )) continue;
    const distance = Math.hypot(blocker.x - actor.x, blocker.z - actor.z);
    if (distance < nearestBlockDistance) {
      nearestBlockDistance = distance;
      firstBlocker = blocker;
    }
  }
  if (!firstBlocker) return { x: target.x, z: target.z };

  const routeWaypoint = findWarRoomGridWaypoint(actor, target, blockers, radius);
  if (routeWaypoint) return rememberWaypoint(routeWaypoint);

  const clearance = radius + 0.85;
  let best: { x: number; z: number; score: number } | null = null;
  for (const sideX of [-1, 1]) {
    for (const sideZ of [-1, 1]) {
      const candidate = {
        x: firstBlocker.x + sideX * (firstBlocker.width / 2 + clearance),
        z: firstBlocker.z + sideZ * (firstBlocker.depth / 2 + clearance),
      };
      if (!isWarRoomPointClear(candidate.x, candidate.z, blockers, radius, floorHeight)) continue;
      if (segmentBlockFraction(
        start,
        { ...candidate, y: startY },
        radius,
        blockers,
      ) !== null) continue;

      const remainingBlock = segmentBlockFraction(
        { ...candidate, y: endY },
        end,
        radius,
        blockers,
      );
      if (
        remainingBlock !== null
        && Math.hypot(candidate.x - actor.x, candidate.z - actor.z) < radius + 0.1
      ) continue;
      const score = Math.hypot(candidate.x - actor.x, candidate.z - actor.z)
        + Math.hypot(candidate.x - target.x, candidate.z - target.z)
        + (remainingBlock === null ? 0 : 0.5);
      if (!best || score < best.score) best = { ...candidate, score };
    }
  }
  if (best) return rememberWaypoint({ x: best.x, z: best.z });
  const fallbackWaypoint = findWarRoomGridWaypoint(actor, target, blockers, radius);
  return fallbackWaypoint ? rememberWaypoint(fallbackWaypoint) : { x: target.x, z: target.z };
}

export function getWarRoomLootPursuitPoint(
  enemy: PursuitActor,
  player: PursuitPlayer,
  building: WarRoomBuilding,
) {
  const local = getWarRoomBuildingLocalPoint(building, enemy.x, enemy.z);
  const inside = Math.abs(local.x) < building.width / 2 - 0.55
    && Math.abs(local.z) < building.depth / 2 - 0.55;

  if (!inside) {
    const side = local.x < -1e-6 ? -1 : 1;
    const outsideSideX = side * (building.width / 2 + 0.95);
    const frontApproachZ = -building.depth / 2 - 0.95;
    if (local.z > building.depth / 2 + 0.55) {
      const alreadyAtSide = Math.abs(local.x - outsideSideX) < 0.75;
      return alreadyAtSide
        ? getWarRoomBuildingWorldPoint(building, outsideSideX, frontApproachZ)
        : getWarRoomBuildingWorldPoint(building, outsideSideX, building.depth / 2 + 0.95);
    }
    if (Math.abs(local.x) > building.width / 2 + 0.55) {
      const reachedFront = Math.abs(local.z - frontApproachZ) < 0.75;
      return getWarRoomBuildingWorldPoint(
        building,
        reachedFront ? 0 : outsideSideX,
        frontApproachZ,
      );
    }
    return getWarRoomBuildingWorldPoint(building, 0, -building.depth / 2 + 0.8);
  }

  const enemyFloor = enemy.floorHeight ?? 0;
  if (Math.abs(player.floorHeight - enemyFloor) > building.storyHeight * 0.35) {
    const stairs = getWarRoomStairProfile(building);
    const onStairLane = Math.abs(local.x - stairs.x) <= 1.05
      && local.z >= stairs.startZ - 0.25
      && local.z <= stairs.endZ + 0.25;
    const midpoint = (stairs.startZ + stairs.endZ) / 2;
    const ascending = player.floorHeight > enemyFloor;
    const reachedNextLanding = onStairLane && (
      ascending ? local.z > midpoint : local.z <= midpoint + 1e-6
    );
    return getWarRoomBuildingWorldPoint(
      building,
      stairs.x,
      reachedNextLanding
        ? ascending ? stairs.endZ - 0.25 : stairs.startZ + 0.25
        : ascending ? stairs.startZ + 0.25 : stairs.endZ - 0.25,
    );
  }

  return { x: player.x, z: player.z };
}
