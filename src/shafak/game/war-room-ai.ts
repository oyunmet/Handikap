import { isWarRoomPointClear, type WarRoomBlocker, type WarRoomBuilding } from "./war-room-data";
import { segmentBlockFraction } from "./war-room-engine";
import {
  getWarRoomBuildingLocalPoint,
  getWarRoomBuildingWorldPoint,
  getWarRoomStairProfile,
} from "./war-room-rooms";

type PursuitActor = { x: number; z: number; floorHeight?: number };
type PursuitPlayer = { x: number; z: number; floorHeight: number };

export function getWarRoomObstacleWaypoint(
  actor: PursuitActor,
  target: PursuitActor,
  blockers: readonly WarRoomBlocker[],
  radius = 0.35,
) {
  const floorHeight = actor.floorHeight ?? 0;
  const targetFloor = target.floorHeight ?? floorHeight;
  if (Math.abs(floorHeight - targetFloor) > 0.8) return { x: target.x, z: target.z };

  const startY = floorHeight + 0.9;
  const endY = targetFloor + 0.9;
  const start = { x: actor.x, y: startY, z: actor.z };
  const end = { x: target.x, y: endY, z: target.z };
  let firstBlocker: WarRoomBlocker | null = null;
  let nearestBlockFraction = Number.POSITIVE_INFINITY;

  for (const blocker of blockers) {
    if (blocker.kind === "platform") continue;
    const fraction = segmentBlockFraction(start, end, 0, [blocker]);
    if (fraction !== null && fraction < nearestBlockFraction) {
      nearestBlockFraction = fraction;
      firstBlocker = blocker;
    }
  }
  if (!firstBlocker) return { x: target.x, z: target.z };

  const clearance = radius + 0.3;
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
      const score = Math.hypot(candidate.x - actor.x, candidate.z - actor.z)
        + Math.hypot(candidate.x - target.x, candidate.z - target.z)
        + (remainingBlock === null ? 0 : 0.5);
      if (!best || score < best.score) best = { ...candidate, score };
    }
  }
  return best ? { x: best.x, z: best.z } : { x: target.x, z: target.z };
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
