export type DuelPoint = { x: number; z: number };

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

export function getDuelCameraPose(
  player: DuelPoint,
  opponent: DuelPoint,
  worldOffsetZ: number,
  cameraBack = 3.4,
  shoulderOffset = 8.2,
  jumpLift = 0,
): DuelCameraPose {
  const dx = opponent.x - player.x;
  const dz = opponent.z - player.z;
  const distance = Math.hypot(dx, dz);
  const forwardX = distance > 1e-4 ? dx / distance : 0;
  const forwardZ = distance > 1e-4 ? dz / distance : 1;
  const sideX = -forwardZ;
  const sideZ = forwardX;

  return {
    position: {
      x: player.x - forwardX * cameraBack + sideX * shoulderOffset,
      y: 3.2 + jumpLift * 0.16,
      z: worldOffsetZ + player.z - forwardZ * cameraBack + sideZ * shoulderOffset,
    },
    target: {
      x: (player.x + opponent.x) * 0.5,
      y: 1.05 + jumpLift * 0.35,
      z: worldOffsetZ + (player.z + opponent.z) * 0.5,
    },
  };
}
