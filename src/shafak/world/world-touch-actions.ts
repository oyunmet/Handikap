export type WorldTouchAction = "shift" | "space" | "c";

export type WorldTouchPointers = Map<WorldTouchAction, Set<number>>;

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
