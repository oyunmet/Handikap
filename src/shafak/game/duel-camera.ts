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
export const DUEL_CAMERA_ACTOR_EDGE_MARGIN = 1.65;

export function getDuelCameraFramingDistance(
  player: DuelPoint,
  opponent: DuelPoint,
  aspect: number,
  verticalFovDegrees: number,
  minimumDistance = 7.2,
  cameraHeading = DUEL_CAMERA_HEADING,
) {
  const safeAspect = Number.isFinite(aspect) ? Math.max(0.25, Math.min(2.4, aspect)) : 0.46;
  const safeFov = Number.isFinite(verticalFovDegrees)
    ? Math.max(35, Math.min(100, verticalFovDegrees))
    : DUEL_CAMERA_TOUCH_FOV;
  const heading = Number.isFinite(cameraHeading) ? cameraHeading : DUEL_CAMERA_HEADING;
  const sideX = -Math.cos(heading);
  const sideZ = Math.sin(heading);
  const centerX = player.x * DUEL_CAMERA_PLAYER_FRAME_WEIGHT
    + opponent.x * (1 - DUEL_CAMERA_PLAYER_FRAME_WEIGHT);
  const centerZ = (player.z + opponent.z) * 0.5;
  const playerOffset = (player.x - centerX) * sideX + (player.z - centerZ) * sideZ;
  const opponentOffset = (opponent.x - centerX) * sideX + (opponent.z - centerZ) * sideZ;
  const horizontalFov = 2 * Math.atan(Math.tan((safeFov * Math.PI) / 360) * safeAspect);
  const requiredHalfWidth = Math.max(Math.abs(playerOffset), Math.abs(opponentOffset))
    + DUEL_CAMERA_ACTOR_EDGE_MARGIN;
  const requiredDistance = requiredHalfWidth / Math.tan(horizontalFov * 0.5);
  const safeMinimum = Number.isFinite(minimumDistance) ? Math.max(0, minimumDistance) : 7.2;
  return Math.max(safeMinimum, requiredDistance);
}

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

  return {
    position: {
      x: centerX + baseOffsetX,
      y: 2.6 + jumpLift * 0.16,
      z: centerZ + baseOffsetZ,
    },
    target: {
      x: centerX,
      y: 1.05 + jumpLift * 0.35,
      z: centerZ,
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
