import { normalizeWarRoomCameraYaw } from "./war-room-look";
import { WAR_ROOM_CONFIG } from "./war-room-config";

export type WarRoomMobilePointerType = "touch" | "mouse" | "pen";
export type WarRoomTouchControlSide = "movement" | "look";
export type WarRoomPointerRole = "look" | "joystick" | "button";

export type WarRoomJoystickGesture = {
  pointerId: number;
  originX: number;
  originY: number;
  radius: number;
  baseYaw: number;
};

export type WarRoomLookGesture = {
  pointerId: number;
  x: number;
  y: number;
  pointerType: WarRoomMobilePointerType;
  button: number;
};

export type WarRoomMobileControlsState = {
  joystick: WarRoomJoystickGesture | null;
  look: WarRoomLookGesture | null;
  roles: Map<number, WarRoomPointerRole>;
};

export type WarRoomJoystickReading = {
  x: number;
  y: number;
  baseYaw: number;
  cameraYaw: number | null;
};

const JOYSTICK_DEAD_ZONE = WAR_ROOM_CONFIG.input.pointerJoystickDeadZone;
export const WAR_ROOM_MAX_LOOK_DELTA_PIXELS = WAR_ROOM_CONFIG.input.pointerLookMaxDeltaPixels;

export function getWarRoomAutoFollowYaw(
  baseYaw: number,
  moveX: number,
  moveY: number,
) {
  if (![baseYaw, moveX, moveY].every(Number.isFinite) || Math.hypot(moveX, moveY) <= 0.1) {
    return null;
  }
  return normalizeWarRoomCameraYaw(baseYaw + Math.atan2(moveX, moveY));
}

export function getWarRoomTouchControlSide(
  clientX: number,
  stageLeft: number,
  stageWidth: number,
): WarRoomTouchControlSide | null {
  if (![clientX, stageLeft, stageWidth].every(Number.isFinite) || stageWidth <= 0) return null;
  return clientX < stageLeft + stageWidth / 2 ? "movement" : "look";
}

export function createWarRoomMobileControlsState(): WarRoomMobileControlsState {
  return { joystick: null, look: null, roles: new Map() };
}

export function beginWarRoomJoystick(
  state: WarRoomMobileControlsState,
  pointerId: number,
  originX: number,
  originY: number,
  radius: number,
  cameraYaw: number,
) {
  if (state.joystick || ![originX, originY, radius, cameraYaw].every(Number.isFinite)) return false;
  if (state.roles.has(pointerId)) return false;
  state.joystick = {
    pointerId,
    originX,
    originY,
    radius: Math.max(1, radius),
    baseYaw: normalizeWarRoomCameraYaw(cameraYaw),
  };
  state.roles.set(pointerId, "joystick");
  return true;
}

export function readWarRoomJoystick(
  state: WarRoomMobileControlsState,
  pointerId: number,
  x: number,
  y: number,
): WarRoomJoystickReading | null {
  const gesture = state.joystick;
  if (
    !gesture
    || gesture.pointerId !== pointerId
    || !Number.isFinite(x)
    || !Number.isFinite(y)
  ) return null;

  const rawX = (x - gesture.originX) / gesture.radius;
  const rawY = (gesture.originY - y) / gesture.radius;
  const rawLength = Math.hypot(rawX, rawY);
  if (rawLength <= JOYSTICK_DEAD_ZONE) {
    return { x: 0, y: 0, baseYaw: gesture.baseYaw, cameraYaw: null };
  }

  const cappedLength = Math.min(1, rawLength);
  const strength = (cappedLength - JOYSTICK_DEAD_ZONE) / (1 - JOYSTICK_DEAD_ZONE);
  const xAxis = (rawX / rawLength) * strength;
  const yAxis = (rawY / rawLength) * strength;
  return {
    x: xAxis,
    y: yAxis,
    baseYaw: gesture.baseYaw,
    cameraYaw: getWarRoomAutoFollowYaw(gesture.baseYaw, xAxis, yAxis),
  };
}

export function rebaseWarRoomJoystick(
  state: WarRoomMobileControlsState,
  cameraYaw: number,
) {
  if (!state.joystick || !Number.isFinite(cameraYaw)) return null;
  state.joystick.baseYaw = normalizeWarRoomCameraYaw(cameraYaw);
  return state.joystick.baseYaw;
}

export function beginWarRoomLook(
  state: WarRoomMobileControlsState,
  gesture: WarRoomLookGesture,
) {
  if (state.look || state.roles.has(gesture.pointerId)) return false;
  state.look = { ...gesture };
  state.roles.set(gesture.pointerId, "look");
  return true;
}

export function isWarRoomLookDeltaValid(dx: number, dy: number) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return false;
  const distance = Math.hypot(dx, dy);
  return distance >= 0.5 && distance <= WAR_ROOM_MAX_LOOK_DELTA_PIXELS;
}

export function clampWarRoomLookDelta(dx: number, dy: number) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null;
  const distance = Math.hypot(dx, dy);
  if (distance < 0.5) return null;
  const scale = Math.min(1, WAR_ROOM_MAX_LOOK_DELTA_PIXELS / distance);
  return { dx: dx * scale, dy: dy * scale };
}

export function readWarRoomMouseLook(
  state: WarRoomMobileControlsState,
  pointerId: number,
  x: number,
  y: number,
) {
  const gesture = state.look;
  if (
    !gesture
    || gesture.pointerId !== pointerId
    || !Number.isFinite(x)
    || !Number.isFinite(y)
  ) return null;
  const delta = clampWarRoomLookDelta(x - gesture.x, y - gesture.y);
  gesture.x = x;
  gesture.y = y;
  if (!delta) return null;
  return {
    ...delta,
    pointerType: gesture.pointerType,
    button: gesture.button,
  };
}

export function endWarRoomMobilePointer(
  state: WarRoomMobileControlsState,
  pointerId: number,
) {
  const endedJoystick = state.joystick?.pointerId === pointerId;
  const endedLook = state.look?.pointerId === pointerId ? state.look : null;
  if (endedJoystick) state.joystick = null;
  if (endedLook) state.look = null;
  state.roles.delete(pointerId);
  return { endedJoystick, endedLook };
}

export function resetWarRoomMobileControls(state: WarRoomMobileControlsState) {
  state.joystick = null;
  state.look = null;
  state.roles.clear();
}

export function beginWarRoomButtonPointer(state: WarRoomMobileControlsState, pointerId: number) {
  if (state.roles.has(pointerId)) return false;
  state.roles.set(pointerId, "button");
  return true;
}
