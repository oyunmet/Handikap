import type { WarRoomBlocker, WarRoomBuilding } from "./war-room-data";
import {
  getWarRoomBuildingLocalPoint,
  getWarRoomBuildingWorldPoint,
  type WarRoomRoom,
} from "./war-room-rooms";

export const WAR_ROOM_DOOR_OPEN_SECONDS = 5;
export const WAR_ROOM_DOOR_ANIMATION_SECONDS = 0.28;
export const WAR_ROOM_DOOR_INTERACTION_DISTANCE = 2.65;
const WAR_ROOM_DOOR_OCCUPANCY_DISTANCE = 1.35;
const WAR_ROOM_DOOR_THICKNESS = 0.18;
const WAR_ROOM_DOOR_HEIGHT = 2.18;

export type WarRoomDoorState = {
  openedAt: number;
  openUntil: number;
};

export type WarRoomDoorRuntime = {
  room: Pick<WarRoomRoom, "buildings" | "blockers">;
  doorStates: Record<string, WarRoomDoorState>;
  player: { x: number; z: number; floorHeight: number };
};

export function getWarRoomDoorBlocker(building: WarRoomBuilding): WarRoomBlocker {
  const front = getWarRoomBuildingWorldPoint(building, 0, -building.depth / 2);
  const quarterTurn = Math.abs(Math.sin(building.rotationY)) > 0.5;
  return {
    id: `${building.id}-entrance-door-blocker`,
    kind: "wall",
    x: front.x,
    z: front.z,
    width: quarterTurn ? WAR_ROOM_DOOR_THICKNESS : building.doorWidth,
    depth: quarterTurn ? building.doorWidth : WAR_ROOM_DOOR_THICKNESS,
    height: WAR_ROOM_DOOR_HEIGHT,
    color: "#543a2c",
  };
}

export function getWarRoomDoorOpenProgress(
  state: WarRoomDoorState | undefined,
  now: number,
) {
  if (!state || state.openUntil <= 0) return 0;
  if (now <= state.openUntil) {
    return Math.max(0, Math.min(1, (now - state.openedAt) / WAR_ROOM_DOOR_ANIMATION_SECONDS));
  }
  return Math.max(0, Math.min(1, 1 - (now - state.openUntil) / WAR_ROOM_DOOR_ANIMATION_SECONDS));
}

export function isWarRoomDoorOpen(state: WarRoomDoorState | undefined, now: number) {
  return getWarRoomDoorOpenProgress(state, now) >= 0.75;
}

export function getWarRoomActiveBlockers(
  runtime: WarRoomDoorRuntime,
  now: number,
): readonly WarRoomBlocker[] {
  const closedDoors = runtime.room.buildings
    .filter((building) => !isWarRoomDoorOpen(runtime.doorStates[building.id], now))
    .map(getWarRoomDoorBlocker);
  return closedDoors.length > 0
    ? [...runtime.room.blockers, ...closedDoors]
    : runtime.room.blockers;
}

export function getNearestWarRoomDoor(
  buildings: readonly WarRoomBuilding[],
  x: number,
  z: number,
  floorHeight: number,
) {
  if (floorHeight > 1.1) return null;
  let nearest: { building: WarRoomBuilding; distance: number } | null = null;
  for (const building of buildings) {
    const local = getWarRoomBuildingLocalPoint(building, x, z);
    const frontZ = -building.depth / 2;
    const dx = local.x;
    const dz = local.z - frontZ;
    const distance = Math.hypot(dx, dz);
    if (
      distance > WAR_ROOM_DOOR_INTERACTION_DISTANCE
      || Math.abs(dx) > building.doorWidth / 2 + 0.65
      || Math.abs(dz) > WAR_ROOM_DOOR_INTERACTION_DISTANCE
    ) continue;
    if (!nearest || distance < nearest.distance) nearest = { building, distance };
  }
  return nearest;
}

export function updateWarRoomDoors(
  runtime: WarRoomDoorRuntime,
  now: number,
  openRequested: boolean,
) {
  const nearest = getNearestWarRoomDoor(
    runtime.room.buildings,
    runtime.player.x,
    runtime.player.z,
    runtime.player.floorHeight,
  );
  if (openRequested && nearest) {
    runtime.doorStates[nearest.building.id] = {
      openedAt: now,
      openUntil: now + WAR_ROOM_DOOR_OPEN_SECONDS,
    };
  }

  for (const building of runtime.room.buildings) {
    const state = runtime.doorStates[building.id];
    if (!state || state.openUntil > now) continue;
    const local = getWarRoomBuildingLocalPoint(building, runtime.player.x, runtime.player.z);
    const distance = Math.hypot(local.x, local.z + building.depth / 2);
    const occupyingDoorway = Math.abs(local.x) <= building.doorWidth / 2 + 0.35
      && distance <= WAR_ROOM_DOOR_OCCUPANCY_DISTANCE
      && runtime.player.floorHeight <= 1.1;
    if (occupyingDoorway) state.openUntil = now + 0.32;
  }
  return nearest?.building.id ?? null;
}
