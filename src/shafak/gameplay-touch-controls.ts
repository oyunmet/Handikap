export type GameplayTouchSide = "movement" | "look";

export function getGameplayTouchSide(
  clientX: number,
  stageLeft: number,
  stageWidth: number,
  moveOnRight = false,
): GameplayTouchSide | null {
  if (![clientX, stageLeft, stageWidth].every(Number.isFinite) || stageWidth <= 0) return null;
  const rightSide = clientX >= stageLeft + stageWidth / 2;
  return rightSide === moveOnRight ? "movement" : "look";
}

export function getGameplayJoystickVector(
  deltaX: number,
  deltaY: number,
  radius: number,
  deadZone = 0.12,
) {
  if (![deltaX, deltaY, radius, deadZone].every(Number.isFinite) || radius <= 0) {
    return { x: 0, y: 0 };
  }
  const rawX = deltaX / radius;
  const rawY = -deltaY / radius;
  const length = Math.hypot(rawX, rawY);
  if (length <= deadZone) return { x: 0, y: 0 };
  const strength = (Math.min(1, length) - deadZone) / (1 - deadZone);
  return {
    x: (rawX / length) * strength,
    y: (rawY / length) * strength,
  };
}

export function getGameplayCameraRelativeVector(
  strafe: number,
  forward: number,
  cameraYaw: number,
) {
  if (![strafe, forward, cameraYaw].every(Number.isFinite)) return { x: 0, z: 0 };
  let safeStrafe = Math.max(-1, Math.min(1, strafe));
  let safeForward = Math.max(-1, Math.min(1, forward));
  const magnitude = Math.hypot(safeStrafe, safeForward);
  if (magnitude > 1) {
    safeStrafe /= magnitude;
    safeForward /= magnitude;
  }

  const forwardX = Math.sin(cameraYaw);
  const forwardZ = -Math.cos(cameraYaw);
  const rightX = Math.cos(cameraYaw);
  const rightZ = Math.sin(cameraYaw);
  return {
    x: rightX * safeStrafe + forwardX * safeForward,
    z: rightZ * safeStrafe + forwardZ * safeForward,
  };
}
