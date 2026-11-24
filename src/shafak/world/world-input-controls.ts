import {
  getGameplayJoystickVector,
  getGameplayTouchSide,
} from "../gameplay-touch-controls";

export type WorldPointerControlSide = "movement" | "look";

export function getWorldPointerControlSide(
  clientX: number,
  stageLeft: number,
  stageWidth: number,
): WorldPointerControlSide | null {
  return getGameplayTouchSide(clientX, stageLeft, stageWidth);
}

export function getDynamicJoystickVector(
  deltaX: number,
  deltaY: number,
  radius: number,
  deadZone = 0.12,
) {
  return getGameplayJoystickVector(deltaX, deltaY, radius, deadZone);
}
