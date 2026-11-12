import { moveWarRoomEntity, WAR_ROOM_PLAYER_COLLISION_RADIUS } from "./war-room-engine";
import type { WarRoomBlocker } from "./war-room-data";

export const WAR_ROOM_FIXED_STEP_SECONDS = 1 / 60;
export const WAR_ROOM_MAX_FIXED_STEPS_PER_FRAME = 3;
const WAR_ROOM_TELEPORT_RESET_DISTANCE = 1.25;

export type WarRoomMovementClock = {
  accumulator: number;
  previousX: number;
  previousZ: number;
  currentX: number;
  currentZ: number;
  initialized: boolean;
};

export type WarRoomFixedMovementInput = {
  x: number;
  z: number;
  velocityX: number;
  velocityZ: number;
  delta: number;
  now: number;
  blockers: readonly WarRoomBlocker[];
  radius?: number;
  floorHeight?: number;
  jumpHeight?: number;
  dodge?: { x: number; z: number; until: number };
};

export type WarRoomFixedMovementResult = {
  x: number;
  z: number;
  renderX: number;
  renderZ: number;
  interpolation: number;
  steps: number;
};

export function createWarRoomMovementClock(x = 0, z = 0): WarRoomMovementClock {
  return {
    accumulator: 0,
    previousX: x,
    previousZ: z,
    currentX: x,
    currentZ: z,
    initialized: false,
  };
}

export function advanceWarRoomFixedMovement(
  clock: WarRoomMovementClock,
  input: WarRoomFixedMovementInput,
): WarRoomFixedMovementResult {
  const delta = Number.isFinite(input.delta) ? Math.max(0, Math.min(0.05, input.delta)) : 0;
  const accumulator = Math.min(
    WAR_ROOM_FIXED_STEP_SECONDS * WAR_ROOM_MAX_FIXED_STEPS_PER_FRAME,
    Math.max(0, clock.accumulator) + delta,
  );
  let x = Number.isFinite(input.x) ? input.x : 0;
  let z = Number.isFinite(input.z) ? input.z : 0;
  const teleported = !clock.initialized
    || Math.hypot(x - clock.currentX, z - clock.currentZ) > WAR_ROOM_TELEPORT_RESET_DISTANCE;
  if (teleported) {
    clock.previousX = x;
    clock.previousZ = z;
  }

  let remaining = accumulator;
  let steps = 0;
  while (remaining + 1e-9 >= WAR_ROOM_FIXED_STEP_SECONDS
    && steps < WAR_ROOM_MAX_FIXED_STEPS_PER_FRAME) {
    clock.previousX = x;
    clock.previousZ = z;
    remaining = Math.max(0, remaining - WAR_ROOM_FIXED_STEP_SECONDS);
    const stepEnd = input.now - remaining;
    const stepStart = stepEnd - WAR_ROOM_FIXED_STEP_SECONDS;
    const dodgeSeconds = input.dodge
      ? Math.max(0, Math.min(WAR_ROOM_FIXED_STEP_SECONDS, input.dodge.until - stepStart))
      : 0;
    const next = moveWarRoomEntity(
      x,
      z,
      (Number.isFinite(input.velocityX) ? input.velocityX : 0) * WAR_ROOM_FIXED_STEP_SECONDS
        + (input.dodge?.x ?? 0) * 11 * dodgeSeconds,
      (Number.isFinite(input.velocityZ) ? input.velocityZ : 0) * WAR_ROOM_FIXED_STEP_SECONDS
        + (input.dodge?.z ?? 0) * 11 * dodgeSeconds,
      input.radius ?? WAR_ROOM_PLAYER_COLLISION_RADIUS,
      input.blockers,
      input.floorHeight ?? 0,
      input.jumpHeight ?? 0,
    );
    x = next.x;
    z = next.z;
    steps += 1;
  }

  clock.accumulator = remaining;
  clock.currentX = x;
  clock.currentZ = z;
  clock.initialized = true;
  const interpolation = Math.max(0, Math.min(1, remaining / WAR_ROOM_FIXED_STEP_SECONDS));
  return {
    x,
    z,
    renderX: clock.previousX + (x - clock.previousX) * interpolation,
    renderZ: clock.previousZ + (z - clock.previousZ) * interpolation,
    interpolation,
    steps,
  };
}
