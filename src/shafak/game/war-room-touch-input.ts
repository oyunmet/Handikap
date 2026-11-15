import { WAR_ROOM_CONFIG } from "./war-room-config";

export type WarRoomTouchRole = "joystick" | "look";
export type WarRoomTouchMovementSide = "any" | "left" | "right";

type WarRoomTouchGesture = {
  role: WarRoomTouchRole;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
};

export type WarRoomTouchInputState = {
  roles: Map<number, WarRoomTouchRole>;
  gestures: Map<number, WarRoomTouchGesture>;
  touchstart: number;
  touchmove: number;
  touchend: number;
  touchcancel: number;
  pointercancel: number;
  input: {
    moveX: number;
    moveY: number;
    lookDX: number;
    lookDY: number;
  };
};

export const WAR_ROOM_TOUCH_JOYSTICK_RADIUS = WAR_ROOM_CONFIG.input.touchJoystickRadius;

const DEAD_ZONE = WAR_ROOM_CONFIG.input.touchJoystickDeadZone;
const MAX_LOOK_DELTA = WAR_ROOM_CONFIG.input.touchLookMaxDeltaPixels;

export function createWarRoomTouchInputState(): WarRoomTouchInputState {
  return {
    roles: new Map(),
    gestures: new Map(),
    touchstart: 0,
    touchmove: 0,
    touchend: 0,
    touchcancel: 0,
    pointercancel: 0,
    input: { moveX: 0, moveY: 0, lookDX: 0, lookDY: 0 },
  };
}

export function startWarRoomTouch(
  state: WarRoomTouchInputState,
  identifier: number,
  x: number,
  y: number,
  width: number,
  movementSide: WarRoomTouchMovementSide = "left",
): WarRoomTouchRole | null {
  if (
    !Number.isFinite(identifier)
    || !Number.isFinite(x)
    || !Number.isFinite(y)
    || !Number.isFinite(width)
    || width <= 0
    || x < 0
    || x > width
    || state.roles.has(identifier)
  ) return null;

  const moveOnRight = movementSide === "right";
  const isMovementZone = moveOnRight ? x >= width / 2 : x < width / 2;
  const role: WarRoomTouchRole = isMovementZone ? "joystick" : "look";

  if ([...state.roles.values()].includes(role)) return null;
  state.roles.set(identifier, role);
  state.gestures.set(identifier, { role, startX: x, startY: y, lastX: x, lastY: y });
  return role;
}

export function moveWarRoomTouch(
  state: WarRoomTouchInputState,
  identifier: number,
  x: number,
  y: number,
): ({ role: "joystick"; moveX: number; moveY: number } | { role: "look"; dx: number; dy: number }) | null {
  const gesture = state.gestures.get(identifier);
  if (!gesture || !Number.isFinite(x) || !Number.isFinite(y)) return null;

  if (gesture.role === "joystick") {
    const rawX = (x - gesture.startX) / WAR_ROOM_TOUCH_JOYSTICK_RADIUS;
    const rawY = (gesture.startY - y) / WAR_ROOM_TOUCH_JOYSTICK_RADIUS;
    const length = Math.hypot(rawX, rawY);
    if (length <= DEAD_ZONE) {
      state.input.moveX = 0;
      state.input.moveY = 0;
    } else {
      const cappedLength = Math.min(1, length);
      const strength = (cappedLength - DEAD_ZONE) / (1 - DEAD_ZONE);
      state.input.moveX = (rawX / length) * strength;
      state.input.moveY = (rawY / length) * strength;
    }
    return { role: "joystick", moveX: state.input.moveX, moveY: state.input.moveY };
  }

  const rawDX = x - gesture.lastX;
  const rawDY = y - gesture.lastY;
  gesture.lastX = x;
  gesture.lastY = y;
  const distance = Math.hypot(rawDX, rawDY);
  if (distance < 0.5) return null;
  const scale = Math.min(1, MAX_LOOK_DELTA / distance);
  const dx = rawDX * scale;
  const dy = rawDY * scale;
  state.input.lookDX = dx;
  state.input.lookDY = dy;
  return { role: "look", dx, dy };
}

export function endWarRoomTouch(state: WarRoomTouchInputState, identifier: number) {
  const role = state.roles.get(identifier);
  state.roles.delete(identifier);
  state.gestures.delete(identifier);
  if (role === "joystick") {
    state.input.moveX = 0;
    state.input.moveY = 0;
  }
  return {
    endedJoystick: role === "joystick",
    endedLook: role === "look",
  };
}

export function resetWarRoomTouchInput(state: WarRoomTouchInputState) {
  state.roles.clear();
  state.gestures.clear();
  state.input.moveX = 0;
  state.input.moveY = 0;
  state.input.lookDX = 0;
  state.input.lookDY = 0;
}

export function formatWarRoomTouchDiagnostics(state: WarRoomTouchInputState) {
  return `${state.roles.size} active touch control(s)`;
}
