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
  cameraBack = 3.4,
  shoulderOffset = 8.2,
  jumpLift = 0,
  cameraHeading = Math.PI,
): DuelCameraPose {
  const dx = opponent.x - player.x;
  const dz = opponent.z - player.z;
  const distance = Math.hypot(dx, dz);
  const heading = Number.isFinite(cameraHeading) ? cameraHeading : Math.PI;
  const forwardX = Math.sin(heading);
  const forwardZ = Math.cos(heading);
  const sideX = -forwardZ;
  const sideZ = forwardX;
  const centerX = (player.x + opponent.x) * 0.5;
  const centerZ = (player.z + opponent.z) * 0.5;
  const baseOffsetX = -forwardX * cameraBack + sideX * shoulderOffset;
  const baseOffsetZ = -forwardZ * cameraBack + sideZ * shoulderOffset;
  const baseOffsetLength = Math.max(1e-4, Math.hypot(baseOffsetX, baseOffsetZ));
  const extraFramingDistance = Math.min(8, Math.max(0, distance - 2.7)) * 0.38;
  const offsetScale = (baseOffsetLength + extraFramingDistance) / baseOffsetLength;

  return {
    position: {
      x: centerX + baseOffsetX * offsetScale,
      y: 3.2 + jumpLift * 0.16 + extraFramingDistance * 0.08,
      z: worldOffsetZ + centerZ + baseOffsetZ * offsetScale,
    },
    target: {
      x: centerX,
      y: 1.05 + jumpLift * 0.35,
      z: worldOffsetZ + centerZ,
    },
  };
}
