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
