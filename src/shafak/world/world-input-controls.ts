export type WorldPointerControlSide = "movement" | "look";

export function getWorldPointerControlSide(
  clientX: number,
  stageLeft: number,
  stageWidth: number,
): WorldPointerControlSide | null {
  if (![clientX, stageLeft, stageWidth].every(Number.isFinite) || stageWidth <= 0) return null;
  return clientX < stageLeft + stageWidth / 2 ? "movement" : "look";
}

export function getDynamicJoystickVector(
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
