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
