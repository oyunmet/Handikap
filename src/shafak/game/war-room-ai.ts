import type { WarRoomBuilding } from "./war-room-data";
import {
  getWarRoomBuildingLocalPoint,
  getWarRoomBuildingWorldPoint,
  getWarRoomStairProfile,
} from "./war-room-rooms";

type PursuitActor = { x: number; z: number; floorHeight?: number };
type PursuitPlayer = { x: number; z: number; floorHeight: number };

export function getWarRoomLootPursuitPoint(
  enemy: PursuitActor,
  player: PursuitPlayer,
  building: WarRoomBuilding,
) {
  const local = getWarRoomBuildingLocalPoint(building, enemy.x, enemy.z);
  const inside = Math.abs(local.x) < building.width / 2 - 0.55
    && Math.abs(local.z) < building.depth / 2 - 0.55;

  if (!inside) {
    const side = local.x < 0 ? -1 : 1;
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

  if (player.floorHeight > building.storyHeight * 0.58
    && (enemy.floorHeight ?? 0) < building.storyHeight * 0.58) {
    const stairs = getWarRoomStairProfile(building);
    const onStairLane = Math.abs(local.x - stairs.x) <= 1.05
      && local.z >= stairs.startZ - 0.25
      && local.z <= stairs.endZ + 0.25;
    const climbing = onStairLane && local.z > (stairs.startZ + stairs.endZ) / 2;
    return getWarRoomBuildingWorldPoint(
      building,
      stairs.x,
      climbing ? stairs.endZ - 0.25 : stairs.startZ + 0.25,
    );
  }

  return { x: player.x, z: player.z };
}
