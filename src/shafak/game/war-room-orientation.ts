export type WarRoomFacingMode = "KAMERA" | "HAREKET" | "STRAFE";
export type WarRoomFacingSetting = "camera" | "movement";

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
  facingSetting: WarRoomFacingSetting = "camera",
  movementThreshold = 0.06,
): WarRoomOrientation {
  const strength = Math.hypot(moveX, moveY);
  const moving = strength >= movementThreshold;
  let yaw = currentFacingYaw;
  let mode: WarRoomFacingMode = "HAREKET";

  if (strafeActive) {
    yaw = cameraYaw;
    mode = "STRAFE";
  } else if (facingSetting === "camera") {
    yaw = cameraYaw;
    mode = "KAMERA";
  } else if (moving) {
    const worldX = Math.sin(cameraYaw) * moveY + Math.cos(cameraYaw) * moveX;
    const worldZ = -Math.cos(cameraYaw) * moveY + Math.sin(cameraYaw) * moveX;
    yaw = Math.atan2(worldX, -worldZ);
  }

  const cameraOffset = Math.atan2(Math.sin(yaw - cameraYaw), Math.cos(yaw - cameraYaw));
  const localJoystickAngle = moving ? Math.atan2(moveX, moveY) * 180 / Math.PI : null;

  return {
    yaw,
    mode,
    joystickAngleDegrees: localJoystickAngle === null
      ? null
      : Math.round(localJoystickAngle * 10) / 10,
    facingCamera: Math.abs(cameraOffset) > Math.PI / 2,
  };
}

export function resolveWarRoomLocomotion(
  moveX: number,
  moveY: number,
  cameraYaw: number,
  bodyYaw: number,
  movementThreshold = 0.12,
) {
  const worldX = Math.sin(cameraYaw) * moveY + Math.cos(cameraYaw) * moveX;
  const worldZ = -Math.cos(cameraYaw) * moveY + Math.sin(cameraYaw) * moveX;
  const bodyForwardX = Math.sin(bodyYaw);
  const bodyForwardZ = -Math.cos(bodyYaw);
  const bodyRightX = Math.cos(bodyYaw);
  const bodyRightZ = Math.sin(bodyYaw);
  const forward = worldX * bodyForwardX + worldZ * bodyForwardZ;
  const lateral = worldX * bodyRightX + worldZ * bodyRightZ;
  const moving = Math.hypot(moveX, moveY) >= movementThreshold;
  const direction = !moving
    ? "idle"
    : Math.abs(forward) >= Math.abs(lateral)
      ? forward < 0 ? "backward" : "forward"
      : lateral < 0 ? "left" : "right";

  return {
    direction,
    forward,
    lateral,
    playbackScale: direction === "backward" ? -1 : direction === "left" || direction === "right" ? 0.78 : 1,
    leanForward: Math.max(-0.08, Math.min(0.08, -forward * 0.055)),
    leanSide: Math.max(-0.1, Math.min(0.1, -lateral * 0.075)),
  } as const;
}

export function stepWarRoomYaw(from: number, to: number, deltaSeconds: number, speed = 40) {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + delta * (1 - Math.exp(-speed * Math.min(Math.max(0, deltaSeconds), 0.05)));
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
