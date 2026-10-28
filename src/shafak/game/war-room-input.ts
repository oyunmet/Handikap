import type { WarRoomInputState } from "./war-room-engine";

export type WarRoomInputAction =
  | "aim"
  | "fire"
  | "reload"
  | "jump"
  | "crouch"
  | "dodge"
  | "sprint-lock"
  | "swap"
  | "weapon-slot";

export type WarRoomPointerPosition = {
  x: number;
  y: number;
  pointerType: "touch" | "mouse" | "pen";
  button: number;
};

export function beginWarRoomPointer(
  pointers: Map<number, WarRoomPointerPosition>,
  pointerId: number,
  position: WarRoomPointerPosition,
) {
  pointers.set(pointerId, position);
}

export function moveWarRoomPointer(
  pointers: Map<number, WarRoomPointerPosition>,
  pointerId: number,
  x: number,
  y: number,
) {
  const previous = pointers.get(pointerId);
  if (!previous) return null;
  const delta = { dx: x - previous.x, dy: y - previous.y };
  pointers.set(pointerId, { ...previous, x, y });
  return delta;
}

export function endWarRoomPointer(
  pointers: Map<number, WarRoomPointerPosition>,
  pointerId: number,
) {
  return pointers.delete(pointerId);
}

export function pressWarRoomAction(
  input: WarRoomInputState,
  action: WarRoomInputAction,
  weaponSlot?: number,
) {
  switch (action) {
    case "aim":
      input.aimHeld = true;
      break;
    case "fire":
      input.fireHeld = true;
      input.firePressed = true;
      break;
    case "reload":
      input.reloadPressed = true;
      break;
    case "jump":
      input.jumpPressed = true;
      break;
    case "crouch":
      input.crouchPressed = true;
      break;
    case "dodge":
      input.dodgePressed = true;
      break;
    case "sprint-lock":
      input.sprintLocked = !input.sprintLocked;
      break;
    case "swap":
      input.swapPressed = true;
      break;
    case "weapon-slot":
      if (Number.isInteger(weaponSlot) && weaponSlot! >= 0 && weaponSlot! <= 3) {
        input.weaponSlotPressed = weaponSlot!;
      }
      break;
  }
}

export function releaseWarRoomAction(input: WarRoomInputState, action: WarRoomInputAction) {
  if (action === "aim") input.aimHeld = false;
  if (action === "fire") {
    input.fireHeld = false;
    input.fireReleased = true;
  }
}

export function setWarRoomMoveVector(input: WarRoomInputState, x: number, y: number) {
  const safeX = Number.isFinite(x) ? x : 0;
  const safeY = Number.isFinite(y) ? y : 0;
  const length = Math.hypot(safeX, safeY);
  const scale = length > 1 ? 1 / length : 1;
  input.moveX = Math.max(-1, Math.min(1, safeX * scale));
  input.moveY = Math.max(-1, Math.min(1, safeY * scale));
}

export function resolveWarRoomStanceTap(
  lastTapAt: number | null,
  now: number,
  doubleTapWindowMs = 280,
) {
  if (lastTapAt !== null && now >= lastTapAt && now - lastTapAt <= doubleTapWindowMs) {
    return { action: "prone" as const, nextTapAt: null };
  }
  return { action: "crouch" as const, nextTapAt: now };
}
