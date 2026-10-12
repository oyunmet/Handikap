import { normalizeYaw, signedYawDifference } from "../game/duel-direction";

export function resolveCharacterTargetYaw(
  facingAngle: number | undefined,
  velocityX: number,
  velocityY: number,
  moving: boolean,
  defeated: boolean,
) {
  if (typeof facingAngle === "number" && Number.isFinite(facingAngle)) {
    return facingAngle;
  }
  if (!moving || defeated) return 0;
  if (velocityY < -0.25) {
    return Math.PI + Math.atan2(velocityX, Math.abs(velocityY));
  }
  return Math.atan2(-velocityX, Math.max(0.01, Math.abs(velocityY)));
}

export function getCharacterRootYawForModel(
  worldFacingYaw: number,
  modelForwardOffset: number,
) {
  return normalizeYaw(worldFacingYaw - modelForwardOffset);
}

export function dampCharacterYaw(
  currentYaw: number,
  targetYaw: number,
  lambda: number,
  deltaSeconds: number,
) {
  if (![currentYaw, targetYaw, lambda, deltaSeconds].every(Number.isFinite)) {
    return Number.isFinite(currentYaw) ? normalizeYaw(currentYaw) : 0;
  }
  const blend = 1 - Math.exp(-Math.max(0, lambda) * Math.max(0, deltaSeconds));
  return normalizeYaw(currentYaw + signedYawDifference(currentYaw, targetYaw) * blend);
}
