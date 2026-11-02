import type { WarRoomBuilding } from "./war-room-data";
import {
  getWarRoomBuildingLocalPoint,
  getWarRoomStairProgress,
} from "./war-room-rooms";

export type WarRoomFloorPresentation = {
  buildingId: string;
  floor: 0 | 1;
  floorHeight: number;
  label: "ALT KAT" | "ÜST KAT" | "MERDİVEN";
};

export function getWarRoomFloorPresentation(
  buildings: readonly WarRoomBuilding[],
  x: number,
  z: number,
  floorHeight: number,
): WarRoomFloorPresentation | null {
  if (![x, z, floorHeight].every(Number.isFinite)) return null;

  const building = buildings.find((candidate) => {
    const local = getWarRoomBuildingLocalPoint(candidate, x, z);
    return Math.abs(local.x) < candidate.width / 2 - 0.28
      && Math.abs(local.z) < candidate.depth / 2 - 0.28;
  });
  if (!building) return null;

  const floorProgress = Math.max(0, Math.min(1, floorHeight / building.storyHeight));
  const floor: 0 | 1 = floorProgress >= 0.78 ? 1 : 0;
  const stairProgress = getWarRoomStairProgress(building, x, z);
  const onStairs = stairProgress !== null
    && stairProgress > 0.04
    && stairProgress < 0.96
    && floorProgress > 0.04
    && floorProgress < 0.96;

  return {
    buildingId: building.id,
    floor,
    floorHeight: floor === 1 ? building.storyHeight : 0,
    label: onStairs ? "MERDİVEN" : floor === 1 ? "ÜST KAT" : "ALT KAT",
  };
}

/** Convert the Three.js yaw to the opposite SVG rotation direction. */
export function getWarRoomMinimapPlayerRotation(yaw: number) {
  if (!Number.isFinite(yaw) || yaw === 0) return 0;
  return -(yaw * 180) / Math.PI;
}
