export type WorldTouchAction = "shift" | "space" | "c";

export type WorldTouchPointers = Map<WorldTouchAction, Set<number>>;

export const WORLD_TOUCH_TAP_TOGGLE_LIMIT_MS = 220;
export const WORLD_JOYSTICK_SPRINT_THRESHOLD = 0.9;

export function isWorldJoystickSprinting(joystick: { x: number; y: number }) {
  const x = Number.isFinite(joystick.x) ? joystick.x : 0;
  const y = Number.isFinite(joystick.y) ? joystick.y : 0;
  return Math.hypot(x, y) >= WORLD_JOYSTICK_SPRINT_THRESHOLD;
}

export function isWorldTouchTap(durationMs: number) {
  return Number.isFinite(durationMs)
    && durationMs >= 0
    && durationMs <= WORLD_TOUCH_TAP_TOGGLE_LIMIT_MS;
}

export function toggleWorldTouchActionState(
  toggled: ReadonlySet<"shift" | "c">,
  action: "shift" | "c",
) {
  const next = new Set(toggled);
  if (next.has(action)) next.delete(action);
  else next.add(action);
  return next;
}

export function startWorldTouchAction(
  pointers: WorldTouchPointers,
  action: WorldTouchAction,
  pointerId: number,
) {
  let actionPointers = pointers.get(action);
  if (!actionPointers) {
    actionPointers = new Set();
    pointers.set(action, actionPointers);
  }
  if (actionPointers.has(pointerId)) return false;
  actionPointers.add(pointerId);
  return true;
}

export function endWorldTouchAction(
  pointers: WorldTouchPointers,
  action: WorldTouchAction,
  pointerId: number,
) {
  const actionPointers = pointers.get(action);
  if (!actionPointers?.delete(pointerId)) {
    return { released: false, stillPressed: Boolean(actionPointers?.size) };
  }
  const stillPressed = actionPointers.size > 0;
  if (!stillPressed) pointers.delete(action);
  return { released: true, stillPressed };
}

export function syncWorldTouchActionKey(
  keys: Set<string>,
  pointers: WorldTouchPointers,
  action: WorldTouchAction,
  toggled = false,
) {
  if (toggled || Boolean(pointers.get(action)?.size)) keys.add(action);
  else keys.delete(action);
}

export function countWorldTouchPointers(pointers: WorldTouchPointers) {
  let count = 0;
  for (const actionPointers of pointers.values()) count += actionPointers.size;
  return count;
}
