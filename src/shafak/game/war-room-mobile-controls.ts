import { normalizeWarRoomCameraYaw } from "./war-room-look";

export type WarRoomMobilePointerType = "touch" | "mouse" | "pen";

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
};

export type WarRoomJoystickReading = {
  x: number;
  y: number;
  baseYaw: number;
  cameraYaw: number | null;
};

const JOYSTICK_DEAD_ZONE = 0.1;

export function createWarRoomMobileControlsState(): WarRoomMobileControlsState {
  return { joystick: null, look: null };
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
  state.joystick = {
    pointerId,
    originX,
    originY,
    radius: Math.max(1, radius),
    baseYaw: normalizeWarRoomCameraYaw(cameraYaw),
  };
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
    cameraYaw: normalizeWarRoomCameraYaw(
      gesture.baseYaw + Math.atan2(xAxis, yAxis),
    ),
  };
}

export function beginWarRoomMouseLook(
  state: WarRoomMobileControlsState,
  gesture: WarRoomLookGesture,
) {
  if (state.look) return false;
  state.look = { ...gesture };
  return true;
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
  const delta = {
    dx: x - gesture.x,
    dy: y - gesture.y,
    pointerType: gesture.pointerType,
    button: gesture.button,
  };
  gesture.x = x;
  gesture.y = y;
  return delta;
}

export function endWarRoomMobilePointer(
  state: WarRoomMobileControlsState,
  pointerId: number,
) {
  const endedJoystick = state.joystick?.pointerId === pointerId;
  const endedLook = state.look?.pointerId === pointerId ? state.look : null;
  if (endedJoystick) state.joystick = null;
  if (endedLook) state.look = null;
  return { endedJoystick, endedLook };
}

export function resetWarRoomMobileControls(state: WarRoomMobileControlsState) {
  state.joystick = null;
  state.look = null;
}
