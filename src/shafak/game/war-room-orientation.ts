export type WarRoomFacingMode = "HAREKET" | "STRAFE";

export type WarRoomOrientation = {
  yaw: number;
  mode: WarRoomFacingMode;
  joystickAngleDegrees: number | null;
  facingCamera: boolean;
};

export function resolveWarRoomOrientation(
  cameraYaw: number,
  moveX: number,
  moveY: number,
  currentFacingYaw: number,
  strafeActive: boolean,
  movementThreshold = 0.06,
): WarRoomOrientation {
  const strength = Math.hypot(moveX, moveY);
  const moving = strength >= movementThreshold;
  let yaw = currentFacingYaw;

  if (strafeActive) {
    yaw = cameraYaw;
  } else if (moving) {
    const worldX = Math.sin(cameraYaw) * moveY + Math.cos(cameraYaw) * moveX;
    const worldZ = -Math.cos(cameraYaw) * moveY + Math.sin(cameraYaw) * moveX;
    yaw = Math.atan2(worldX, -worldZ);
  }

  const cameraOffset = Math.atan2(Math.sin(yaw - cameraYaw), Math.cos(yaw - cameraYaw));
  const localJoystickAngle = moving ? Math.atan2(moveX, moveY) * 180 / Math.PI : null;

  return {
    yaw,
    mode: strafeActive ? "STRAFE" : "HAREKET",
    joystickAngleDegrees: localJoystickAngle === null
      ? null
      : Math.round(localJoystickAngle * 10) / 10,
    facingCamera: Math.abs(cameraOffset) > Math.PI / 2,
  };
}

export function getWarRoomPostAttackStrafeUntil(now: number, attackDuration = 0) {
  return now + Math.max(0, attackDuration) + 0.8;
}

export function cancelWarRoomPostAttackStrafeOnMovement(
  strafeUntil: number,
  now: number,
  moveX: number,
  moveY: number,
  movementThreshold = 0.06,
) {
  return Math.hypot(moveX, moveY) >= movementThreshold ? now : strafeUntil;
}
