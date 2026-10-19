export type DuelPoint = { x: number; z: number };
export type UprightDuelRotation = readonly [x: 0, y: number, z: 0];

export type DuelCameraPose = {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
};

export type DuelJumpState = {
  jumpStartedTick: number;
  jumpUntilTick: number;
};

export const DUEL_JUMP_HEIGHT = 1.12;
export const DUEL_CAMERA_HEADING = Math.PI * 7 / 8;
export const DUEL_CAMERA_TOUCH_FOV = 80;
export const DUEL_CAMERA_PLAYER_FRAME_WEIGHT = 0.58;
export const DUEL_CAMERA_ARENA_CENTER_Z = -0.6;

export function getDuelJumpHeight(actor: DuelJumpState, tick: number) {
  const duration = actor.jumpUntilTick - actor.jumpStartedTick;
  if (
    !Number.isFinite(tick)
    || !Number.isFinite(duration)
    || duration <= 0
    || tick < actor.jumpStartedTick
    || tick >= actor.jumpUntilTick
  ) return 0;
  const progress = Math.max(0, Math.min(1, (tick - actor.jumpStartedTick) / duration));
  return Math.sin(progress * Math.PI) * DUEL_JUMP_HEIGHT;
}

export function getDuelFacingAngle(actor: DuelPoint, opponent: DuelPoint) {
  return Math.atan2(opponent.x - actor.x, opponent.z - actor.z);
}

export function getUprightDuelRotation(yaw: number): UprightDuelRotation {
  return [0, Number.isFinite(yaw) ? yaw : 0, 0];
}

export function getDuelCameraPose(
  player: DuelPoint,
  opponent: DuelPoint,
  worldOffsetZ: number,
  cameraBack = 7.2,
  shoulderOffset = 0.45,
  jumpLift = 0,
  cameraHeading = DUEL_CAMERA_HEADING,
): DuelCameraPose {
  const dx = opponent.x - player.x;
  const dz = opponent.z - player.z;
  const distance = Math.hypot(dx, dz);
  const heading = Number.isFinite(cameraHeading) ? cameraHeading : Math.PI;
  const forwardX = Math.sin(heading);
  const forwardZ = Math.cos(heading);
  const sideX = -forwardZ;
  const sideZ = forwardX;
  const centerX = player.x * DUEL_CAMERA_PLAYER_FRAME_WEIGHT
    + opponent.x * (1 - DUEL_CAMERA_PLAYER_FRAME_WEIGHT);
  const centerZ = (player.z + opponent.z) * 0.5;
  const baseOffsetX = -forwardX * cameraBack + sideX * shoulderOffset;
  const baseOffsetZ = -forwardZ * cameraBack + sideZ * shoulderOffset;
  const baseOffsetLength = Math.max(1e-4, Math.hypot(baseOffsetX, baseOffsetZ));
  const extraFramingDistance = Math.min(8, Math.max(0, distance)) * 0.48;
  const offsetScale = (baseOffsetLength + extraFramingDistance) / baseOffsetLength;
  const offsetX = baseOffsetX * offsetScale;
  const offsetZ = baseOffsetZ * offsetScale;

  return {
    position: {
      x: centerX + offsetX,
      y: 2.6 + jumpLift * 0.16 + extraFramingDistance * 0.08,
      z: worldOffsetZ + centerZ + offsetZ,
    },
    target: {
      x: centerX,
      y: 1.05 + jumpLift * 0.35,
      z: worldOffsetZ + centerZ,
    },
  };
}

export function getDuelCameraRelativeInput(x: number, y: number, cameraHeading = DUEL_CAMERA_HEADING) {
  const heading = Number.isFinite(cameraHeading) ? cameraHeading : DUEL_CAMERA_HEADING;
  const forwardX = Math.sin(heading);
  const forwardZ = Math.cos(heading);
  const sideX = -forwardZ;
  const sideZ = forwardX;
  const worldX = sideX * x + forwardX * y;
  const worldZ = sideZ * x + forwardZ * y;
  const length = Math.hypot(worldX, worldZ);
  const scale = length > 1 ? 1 / length : 1;
  return { x: worldX * scale, z: worldZ * scale };
}
