export type WorldTouchAction = "shift" | "space" | "c";
export type WorldTouchActionPointers = Map<WorldTouchAction, Set<number>>;

export function syncWorldTouchActionKey(
  heldKeys: Set<string>,
  pointers: WorldTouchActionPointers,
  action: WorldTouchAction,
  toggled = false,
) {
  if (action === "space") return;
  if (toggled || Boolean(pointers.get(action)?.size)) heldKeys.add(action);
  else heldKeys.delete(action);
}

export function startWorldTouchAction(
  pointers: WorldTouchActionPointers,
  action: WorldTouchAction,
  pointerId: number,
) {
  let activePointers = pointers.get(action);
  if (!activePointers) {
    activePointers = new Set<number>();
    pointers.set(action, activePointers);
  }
  if (activePointers.has(pointerId)) return false;
  activePointers.add(pointerId);
  return true;
}

export function endWorldTouchAction(
  pointers: WorldTouchActionPointers,
  action: WorldTouchAction,
  pointerId: number,
) {
  const activePointers = pointers.get(action);
  if (!activePointers || !activePointers.delete(pointerId)) {
    return { released: false, stillPressed: Boolean(activePointers?.size) };
  }
  const stillPressed = activePointers.size > 0;
  if (!stillPressed) pointers.delete(action);
  return { released: true, stillPressed };
}
