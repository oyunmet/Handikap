import type { WarRoomBlocker, WarRoomBuilding } from "./war-room-data";
import {
  getWarRoomBuildingLocalPoint,
  getWarRoomBuildingWorldPoint,
  type WarRoomRoom,
} from "./war-room-rooms";
import { WAR_ROOM_CONFIG } from "./war-room-config";

export const WAR_ROOM_DOOR_ANIMATION_SECONDS = WAR_ROOM_CONFIG.doors.animationSeconds;
export const WAR_ROOM_DOOR_INTERACTION_DISTANCE = WAR_ROOM_CONFIG.doors.interactionDistance;
export const WAR_ROOM_DOOR_AUTO_OPEN_DISTANCE = WAR_ROOM_CONFIG.doors.autoOpenDistance;
export const WAR_ROOM_DOOR_CLEAR_PROGRESS = WAR_ROOM_CONFIG.doors.clearProgress;
const WAR_ROOM_DOOR_OCCUPANCY_BUFFER = WAR_ROOM_CONFIG.doors.occupancyBuffer;
const WAR_ROOM_DOOR_PLAYER_RADIUS = WAR_ROOM_CONFIG.doors.playerRadius;
const WAR_ROOM_DOOR_THICKNESS = WAR_ROOM_CONFIG.doors.thickness;
const WAR_ROOM_DOOR_MIN_CLEAR_WIDTH = WAR_ROOM_CONFIG.doors.minimumClearWidth;
const WAR_ROOM_DOOR_HEIGHT = WAR_ROOM_CONFIG.doors.height;

export type WarRoomDoorFloor = 0 | 1;

export type WarRoomDoorState = {
  openedAt: number;
  closingAt: number | null;
  closingProgress: number;
};

export type WarRoomDoorRuntime = {
  room: Pick<WarRoomRoom, "buildings" | "blockers">;
  doorStates: Record<string, WarRoomDoorState>;
  player: { x: number; z: number; floorHeight: number };
  enemies?: readonly {
    x: number;
    z: number;
    floorHeight?: number;
    doorApproachX?: number;
    doorApproachZ?: number;
    alive: boolean;
  }[];
};

export function getWarRoomDoorStateKey(building: WarRoomBuilding, floor: WarRoomDoorFloor) {
  return floor === 0 ? building.id : `${building.id}-upper`;
}

export function getWarRoomDoorBlocker(
  building: WarRoomBuilding,
  floor: WarRoomDoorFloor = 0,
): WarRoomBlocker {
  const front = getWarRoomBuildingWorldPoint(building, 0, -building.depth / 2);
  const quarterTurn = Math.abs(Math.sin(building.rotationY)) > 0.5;
  const clearWidth = Math.max(WAR_ROOM_DOOR_MIN_CLEAR_WIDTH, building.doorWidth);
  return {
    id: `${building.id}-floor-${floor}-entrance-door-blocker`,
    kind: "wall",
    x: front.x,
    z: front.z,
    width: quarterTurn ? WAR_ROOM_DOOR_THICKNESS : clearWidth,
    depth: quarterTurn ? clearWidth : WAR_ROOM_DOOR_THICKNESS,
    height: WAR_ROOM_DOOR_HEIGHT,
    baseY: floor === 0 ? 0 : building.storyHeight,
    color: "#543a2c",
  };
}

export function getWarRoomDoorOpenProgress(
  state: WarRoomDoorState | undefined,
  now: number,
) {
  if (!state) return 0;
  if (state.closingAt === null) {
    return Math.max(0, Math.min(1, (now - state.openedAt) / WAR_ROOM_DOOR_ANIMATION_SECONDS));
  }
  const closeProgress = Math.max(
    0,
    Math.min(1, 1 - (now - state.closingAt) / WAR_ROOM_DOOR_ANIMATION_SECONDS),
  );
  return Math.max(0, Math.min(1, state.closingProgress * closeProgress));
}

export function isWarRoomDoorOpen(state: WarRoomDoorState | undefined, now: number) {
  return getWarRoomDoorOpenProgress(state, now) >= WAR_ROOM_DOOR_CLEAR_PROGRESS;
}

export function getWarRoomActiveBlockers(
  runtime: WarRoomDoorRuntime,
  now: number,
): readonly WarRoomBlocker[] {
  const closedDoors = runtime.room.buildings.flatMap((building) => (
    ([0, 1] as const)
      .filter((floor) => !isWarRoomDoorOpen(
        runtime.doorStates[getWarRoomDoorStateKey(building, floor)],
        now,
      ))
      .map((floor) => getWarRoomDoorBlocker(building, floor))
  ));
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
  let nearest: {
    building: WarRoomBuilding;
    floor: WarRoomDoorFloor;
    key: string;
    distance: number;
  } | null = null;
  for (const building of buildings) {
    const floor: WarRoomDoorFloor = Math.abs(floorHeight - building.storyHeight) < Math.abs(floorHeight)
      ? 1
      : 0;
    const doorFloorHeight = floor === 0 ? 0 : building.storyHeight;
    if (Math.abs(floorHeight - doorFloorHeight) > 1.1) continue;
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
      if (facingDoor < -0.1) continue;
    }
    if (
      distance > WAR_ROOM_DOOR_INTERACTION_DISTANCE
      || Math.abs(dx) > building.doorWidth / 2 + 0.65
      || Math.abs(dz) > WAR_ROOM_DOOR_INTERACTION_DISTANCE
    ) continue;
    if (!nearest || distance < nearest.distance) {
      nearest = {
        building,
        floor,
        key: getWarRoomDoorStateKey(building, floor),
        distance,
      };
    }
  }
  return nearest;
}

function isWarRoomDoorwayOccupied(
  building: WarRoomBuilding,
  floor: WarRoomDoorFloor,
  actor: { x: number; z: number; floorHeight: number },
  actorRadius: number = WAR_ROOM_DOOR_PLAYER_RADIUS,
) {
  const doorFloorHeight = floor === 0 ? 0 : building.storyHeight;
  if (
    actor.floorHeight < doorFloorHeight - WAR_ROOM_DOOR_OCCUPANCY_BUFFER
    || actor.floorHeight > doorFloorHeight + WAR_ROOM_DOOR_HEIGHT + WAR_ROOM_DOOR_OCCUPANCY_BUFFER
  ) return false;
  const local = getWarRoomBuildingLocalPoint(building, actor.x, actor.z);
  const frontZ = -building.depth / 2;
  const halfWidth = building.doorWidth / 2
    + actorRadius
    + WAR_ROOM_DOOR_OCCUPANCY_BUFFER;
  const halfDepth = WAR_ROOM_DOOR_THICKNESS / 2
    + actorRadius
    + WAR_ROOM_DOOR_OCCUPANCY_BUFFER;
  return Math.abs(local.x) <= halfWidth
    && Math.abs(local.z - frontZ) <= halfDepth;
}

function isWarRoomActorApproachingDoor(
  building: WarRoomBuilding,
  floor: WarRoomDoorFloor,
  actor: { x: number; z: number; floorHeight: number },
  movement: { x: number; z: number },
  actorRadius: number = WAR_ROOM_DOOR_PLAYER_RADIUS,
) {
  const doorFloorHeight = floor === 0 ? 0 : building.storyHeight;
  if (Math.abs(actor.floorHeight - doorFloorHeight) > 1.1) return false;
  const movementLength = Math.hypot(movement.x, movement.z);
  if (movementLength < 0.05) return false;
  const local = getWarRoomBuildingLocalPoint(building, actor.x, actor.z);
  const cosine = Math.cos(building.rotationY);
  const sine = Math.sin(building.rotationY);
  const localMoveX = (cosine * movement.x - sine * movement.z) / movementLength;
  const localMoveZ = (sine * movement.x + cosine * movement.z) / movementLength;
  const frontZ = -building.depth / 2;
  if (Math.abs(localMoveZ) < 0.05) return false;
  const distanceAlongPath = (frontZ - local.z) / localMoveZ;
  if (distanceAlongPath < 0 || distanceAlongPath > WAR_ROOM_DOOR_AUTO_OPEN_DISTANCE) return false;
  const crossingX = local.x + localMoveX * distanceAlongPath;
  return Math.abs(crossingX) <= building.doorWidth / 2 + actorRadius;
}

function startWarRoomDoorOpening(
  doorStates: Record<string, WarRoomDoorState>,
  key: string,
  now: number,
) {
  const state = doorStates[key];
  if (!state) {
    doorStates[key] = { openedAt: now, closingAt: null, closingProgress: 0 };
    return;
  }
  if (state.closingAt !== null) {
    const progress = getWarRoomDoorOpenProgress(state, now);
    state.openedAt = now - progress * WAR_ROOM_DOOR_ANIMATION_SECONDS;
    state.closingAt = null;
    state.closingProgress = 0;
  }
}

export function updateWarRoomDoors(
  runtime: WarRoomDoorRuntime,
  now: number,
  openRequested: boolean,
  lookYaw?: number,
  playerMovement: { x: number; z: number } = { x: 0, z: 0 },
) {
  const nearest = getNearestWarRoomDoor(
    runtime.room.buildings,
    runtime.player.x,
    runtime.player.z,
    runtime.player.floorHeight,
    lookYaw,
  );
  for (const building of runtime.room.buildings) {
    for (const floor of [0, 1] as const) {
      const key = getWarRoomDoorStateKey(building, floor);
      const manuallyOpened = openRequested && nearest?.key === key;
      const playerApproaching = isWarRoomActorApproachingDoor(
        building,
        floor,
        runtime.player,
        playerMovement,
      );
      const playerOccupies = isWarRoomDoorwayOccupied(building, floor, runtime.player);
      const enemyApproaches = runtime.enemies?.some((enemy) => enemy.alive
        && isWarRoomActorApproachingDoor(
          building,
          floor,
          { x: enemy.x, z: enemy.z, floorHeight: enemy.floorHeight ?? 0 },
          { x: enemy.doorApproachX ?? 0, z: enemy.doorApproachZ ?? 0 },
          0.35,
        )) ?? false;
      const enemyOccupies = runtime.enemies?.some((enemy) => enemy.alive
        && isWarRoomDoorwayOccupied(building, floor, {
          x: enemy.x,
          z: enemy.z,
          floorHeight: enemy.floorHeight ?? 0,
        }, 0.35)) ?? false;
      const shouldRemainOpen = manuallyOpened
        || playerApproaching
        || enemyApproaches
        || playerOccupies
        || enemyOccupies;
      const state = runtime.doorStates[key];
      if (shouldRemainOpen) {
        startWarRoomDoorOpening(runtime.doorStates, key, now);
      } else if (state) {
        if (state.closingAt === null) {
          state.closingProgress = getWarRoomDoorOpenProgress(state, now);
          state.closingAt = now;
        }
        if (getWarRoomDoorOpenProgress(state, now) <= 0) {
          delete runtime.doorStates[key];
        }
      }
    }
  }
  return nearest?.key ?? null;
}
