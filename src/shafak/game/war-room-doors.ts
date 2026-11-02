import type { WarRoomBlocker, WarRoomBuilding } from "./war-room-data";
import {
  getWarRoomBuildingLocalPoint,
  getWarRoomBuildingWorldPoint,
  type WarRoomRoom,
} from "./war-room-rooms";

export const WAR_ROOM_DOOR_OPEN_SECONDS = 6;
export const WAR_ROOM_DOOR_ANIMATION_SECONDS = 0.28;
export const WAR_ROOM_DOOR_INTERACTION_DISTANCE = 2.65;
const WAR_ROOM_DOOR_OCCUPANCY_BUFFER = 0.5;
const WAR_ROOM_DOOR_PLAYER_RADIUS = 0.4;
const WAR_ROOM_DOOR_OCCUPANCY_SECONDS = WAR_ROOM_DOOR_OPEN_SECONDS;
const WAR_ROOM_DOOR_THICKNESS = 0.18;
const WAR_ROOM_DOOR_MIN_CLEAR_WIDTH = 1.6;
const WAR_ROOM_DOOR_HEIGHT = 2.4;

export type WarRoomDoorState = {
  openedAt: number;
  openUntil: number;
};

export type WarRoomDoorRuntime = {
  room: Pick<WarRoomRoom, "buildings" | "blockers">;
  doorStates: Record<string, WarRoomDoorState>;
  player: { x: number; z: number; floorHeight: number };
  enemies?: readonly { x: number; z: number; floorHeight?: number; alive: boolean }[];
};

export function getWarRoomDoorBlocker(building: WarRoomBuilding): WarRoomBlocker {
  const front = getWarRoomBuildingWorldPoint(building, 0, -building.depth / 2);
  const quarterTurn = Math.abs(Math.sin(building.rotationY)) > 0.5;
  const clearWidth = Math.max(WAR_ROOM_DOOR_MIN_CLEAR_WIDTH, building.doorWidth);
  return {
    id: `${building.id}-entrance-door-blocker`,
    kind: "wall",
    x: front.x,
    z: front.z,
    width: quarterTurn ? WAR_ROOM_DOOR_THICKNESS : clearWidth,
    depth: quarterTurn ? clearWidth : WAR_ROOM_DOOR_THICKNESS,
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
  lookYaw?: number,
) {
  if (floorHeight > 1.1) return null;
  let nearest: { building: WarRoomBuilding; distance: number } | null = null;
  for (const building of buildings) {
    const local = getWarRoomBuildingLocalPoint(building, x, z);
    const frontZ = -building.depth / 2;
    const dx = local.x;
    const dz = local.z - frontZ;
    const distance = Math.hypot(dx, dz);
    if (Number.isFinite(lookYaw) && distance > 1e-6) {
      const doorPoint = getWarRoomBuildingWorldPoint(building, 0, frontZ);
      const directionX = doorPoint.x - x;
      const directionZ = doorPoint.z - z;
      const directionLength = Math.hypot(directionX, directionZ);
      const facingX = Math.sin(lookYaw!);
      const facingZ = -Math.cos(lookYaw!);
      const facingDoor = (directionX * facingX + directionZ * facingZ) / directionLength;
      if (facingDoor < 0.25) continue;
    }
    if (
      distance > WAR_ROOM_DOOR_INTERACTION_DISTANCE
      || Math.abs(dx) > building.doorWidth / 2 + 0.65
      || Math.abs(dz) > WAR_ROOM_DOOR_INTERACTION_DISTANCE
    ) continue;
    if (!nearest || distance < nearest.distance) nearest = { building, distance };
  }
  return nearest;
}

function isWarRoomDoorwayOccupied(
  building: WarRoomBuilding,
  actor: { x: number; z: number; floorHeight: number },
) {
  if (actor.floorHeight < -WAR_ROOM_DOOR_OCCUPANCY_BUFFER
    || actor.floorHeight > WAR_ROOM_DOOR_HEIGHT + WAR_ROOM_DOOR_OCCUPANCY_BUFFER) return false;
  const local = getWarRoomBuildingLocalPoint(building, actor.x, actor.z);
  const frontZ = -building.depth / 2;
  const halfWidth = building.doorWidth / 2
    + WAR_ROOM_DOOR_PLAYER_RADIUS
    + WAR_ROOM_DOOR_OCCUPANCY_BUFFER;
  const halfDepth = WAR_ROOM_DOOR_THICKNESS / 2
    + WAR_ROOM_DOOR_PLAYER_RADIUS
    + WAR_ROOM_DOOR_OCCUPANCY_BUFFER;
  return Math.abs(local.x) <= halfWidth
    && Math.abs(local.z - frontZ) <= halfDepth;
}

export function updateWarRoomDoors(
  runtime: WarRoomDoorRuntime,
  now: number,
  openRequested: boolean,
  lookYaw?: number,
) {
  const nearest = getNearestWarRoomDoor(
    runtime.room.buildings,
    runtime.player.x,
    runtime.player.z,
    runtime.player.floorHeight,
    lookYaw,
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
    const playerOccupies = isWarRoomDoorwayOccupied(building, runtime.player);
    const enemyOccupies = runtime.enemies?.some((enemy) => enemy.alive
      && isWarRoomDoorwayOccupied(building, {
        x: enemy.x,
        z: enemy.z,
        floorHeight: enemy.floorHeight ?? 0,
      })) ?? false;
    if (playerOccupies || enemyOccupies) {
      state.openUntil = now + WAR_ROOM_DOOR_OCCUPANCY_SECONDS;
    }
  }
  return nearest?.building.id ?? null;
}
