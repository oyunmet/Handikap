import { WAR_ROOM_CONFIG } from "./war-room-config";

export const WAR_ROOM_TOUCH_JOYSTICK_RADIUS = WAR_ROOM_CONFIG.input.touchJoystickRadius;
export const WAR_ROOM_TOUCH_LOOK_LIMIT = WAR_ROOM_CONFIG.input.touchLookMaxDeltaPixels;
export const WAR_ROOM_TOUCH_DEAD_ZONE = WAR_ROOM_CONFIG.input.touchJoystickDeadZone;

export type WarRoomTouchRole = "joystick" | "look";
export type WarRoomTouchInputState = {
  input: { moveX: number; moveY: number; lookDX: number; lookDY: number };
  joy: { id: number; ox: number; oy: number };
  look: { id: number; lx: number; ly: number };
  roles: Map<number, WarRoomTouchRole>;
  touchstart: number;
  touchmove: number;
  touchend: number;
  touchcancel: number;
  pointercancel: number;
  frames: number;
  yaw: number;
  pitch: number;
  paused: boolean;
  locked: boolean;
  fps: number;
  fpsFrames: number;
  fpsStartedAt: number;
};

export function createWarRoomTouchInputState(): WarRoomTouchInputState {
  return {
    input: { moveX: 0, moveY: 0, lookDX: 0, lookDY: 0 },
    joy: { id: -1, ox: 0, oy: 0 },
    look: { id: -1, lx: 0, ly: 0 },
    roles: new Map(),
    touchstart: 0,
    touchmove: 0,
    touchend: 0,
    touchcancel: 0,
    pointercancel: 0,
    frames: 0,
    yaw: 0,
    pitch: 0,
    paused: false,
    locked: false,
    fps: 0,
    fpsFrames: 0,
    fpsStartedAt: 0,
  };
}

export const warRoomTouchInput = createWarRoomTouchInputState();

export function startWarRoomTouch(
  state: WarRoomTouchInputState,
  identifier: number,
  x: number,
  y: number,
  viewportWidth: number,
) {
  if (![identifier, x, y, viewportWidth].every(Number.isFinite) || viewportWidth <= 0) return null;
  if (x < viewportWidth * 0.5) {
    if (state.joy.id !== -1) state.roles.delete(state.joy.id);
    state.joy.id = identifier;
    state.joy.ox = x;
    state.joy.oy = y;
    state.roles.set(identifier, "joystick");
    state.input.moveX = 0;
    state.input.moveY = 0;
    return "joystick" as const;
  }
  if (state.look.id !== -1) state.roles.delete(state.look.id);
  state.look.id = identifier;
  state.look.lx = x;
  state.look.ly = y;
  state.roles.set(identifier, "look");
  state.input.lookDX = 0;
  state.input.lookDY = 0;
  return "look" as const;
}

export function moveWarRoomTouch(
  state: WarRoomTouchInputState,
  identifier: number,
  x: number,
  y: number,
) {
  if (![identifier, x, y].every(Number.isFinite)) return null;
  if (state.joy.id === identifier) {
    let dx = x - state.joy.ox;
    let dy = y - state.joy.oy;
    const distance = Math.hypot(dx, dy);
    if (distance > WAR_ROOM_TOUCH_JOYSTICK_RADIUS) {
      const scale = WAR_ROOM_TOUCH_JOYSTICK_RADIUS / distance;
      dx *= scale;
      dy *= scale;
    }
    let moveX = dx / WAR_ROOM_TOUCH_JOYSTICK_RADIUS;
    let moveY = -dy / WAR_ROOM_TOUCH_JOYSTICK_RADIUS;
    if (Math.hypot(moveX, moveY) < WAR_ROOM_TOUCH_DEAD_ZONE) {
      moveX = 0;
      moveY = 0;
    }
    state.input.moveX = moveX;
    state.input.moveY = moveY;
    return { role: "joystick" as const, dx, dy, moveX, moveY };
  }
  if (state.look.id === identifier) {
    const dx = Math.max(-WAR_ROOM_TOUCH_LOOK_LIMIT, Math.min(WAR_ROOM_TOUCH_LOOK_LIMIT, x - state.look.lx));
    const dy = Math.max(-WAR_ROOM_TOUCH_LOOK_LIMIT, Math.min(WAR_ROOM_TOUCH_LOOK_LIMIT, y - state.look.ly));
    state.look.lx = x;
    state.look.ly = y;
    state.input.lookDX += dx;
    state.input.lookDY += dy;
    return { role: "look" as const, dx, dy };
  }
  return null;
}

export function endWarRoomTouch(state: WarRoomTouchInputState, identifier: number) {
  const endedJoystick = state.joy.id === identifier;
  const endedLook = state.look.id === identifier;
  if (endedJoystick) {
    state.joy.id = -1;
    state.joy.ox = 0;
    state.joy.oy = 0;
    state.input.moveX = 0;
    state.input.moveY = 0;
  }
  if (endedLook) {
    state.look.id = -1;
    state.look.lx = 0;
    state.look.ly = 0;
  }
  state.roles.delete(identifier);
  return { endedJoystick, endedLook };
}

export function resetWarRoomTouchInput(state: WarRoomTouchInputState) {
  state.joy.id = -1;
  state.joy.ox = 0;
  state.joy.oy = 0;
  state.look.id = -1;
  state.look.lx = 0;
  state.look.ly = 0;
  state.roles.clear();
  state.input.moveX = 0;
  state.input.moveY = 0;
  state.input.lookDX = 0;
  state.input.lookDY = 0;
}

export function recordWarRoomTouchFrame(
  state: WarRoomTouchInputState,
  yaw: number,
  pitch: number,
  paused: boolean,
  locked: boolean,
  now: number,
) {
  state.frames += 1;
  state.yaw = yaw;
  state.pitch = pitch;
  state.paused = paused;
  state.locked = locked;
  if (state.fpsStartedAt === 0) state.fpsStartedAt = now;
  state.fpsFrames += 1;
  const elapsed = now - state.fpsStartedAt;
  if (elapsed >= 500) {
    state.fps = state.fpsFrames * 1000 / elapsed;
    state.fpsFrames = 0;
    state.fpsStartedAt = now;
  }
}

export function formatWarRoomTouchDiagnostics(state: WarRoomTouchInputState) {
  const active = [...state.roles.entries()].map(([id, role]) => `${id}:${role}`).join(" ") || "yok";
  return [
    `touchstart ${state.touchstart} · touchmove ${state.touchmove}`,
    `touchend ${state.touchend} · touchcancel ${state.touchcancel} · pointercancel ${state.pointercancel}`,
    `aktif ${active}`,
    `lookDX ${state.input.lookDX.toFixed(2)} · lookDY ${state.input.lookDY.toFixed(2)}`,
    `moveX ${state.input.moveX.toFixed(2)} · moveY ${state.input.moveY.toFixed(2)}`,
    `frame ${state.frames} · paused ${state.paused} · locked ${state.locked}`,
    `yaw ${state.yaw.toFixed(3)} · pitch ${state.pitch.toFixed(3)} · FPS ${state.fps.toFixed(1)}`,
  ].join("\n");
}
