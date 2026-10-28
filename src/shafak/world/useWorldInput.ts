import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  countWorldTouchPointers,
  endWorldTouchAction,
  isWorldJoystickSprinting,
  isWorldTouchTap,
  startWorldTouchAction,
  syncWorldTouchActionKey,
  toggleWorldTouchActionState,
  type WorldTouchAction,
} from "./world-touch-actions";
import type { WorldActionState } from "./world-movement-machine";

type Vector = { x: number; y: number };

const MOVEMENT_KEYS = new Set([
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
  "w",
  "a",
  "s",
  "d",
  "shift",
  "space",
  "control",
  "c",
]);

export default function useWorldInput(wake: () => void) {
  const heldKeys = useRef(new Set<string>());
  const joystick = useRef<Vector>({ x: 0, y: 0 });
  const joystickPointerId = useRef<number | null>(null);
  const actionPointersRef = useRef(new Map<WorldTouchAction, Set<number>>());
  const actionPointerStartedAtRef = useRef(new Map<number, number>());
  const tapTimer = useRef<number | undefined>(undefined);
  const jumpPressPendingRef = useRef(false);
  const toggledActionsRef = useRef(new Set<"shift" | "c">());
  const [toggledActions, setToggledActions] = useState<ReadonlySet<"shift" | "c">>(() => new Set());
  const [inputRevision, setInputRevision] = useState(0);
  const publishInputChange = useCallback(() => setInputRevision((revision) => revision + 1), []);

  const onStagePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
  if ((event.target as HTMLElement).closest("button, .world-panel, .world-joystick, .world-debug")) return;
    wake();
    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = (event.clientX - bounds.left) / bounds.width;
    joystick.current = { x: relativeX < .32 ? -.38 : relativeX > .68 ? .38 : 0, y: .68 };
    if (tapTimer.current) window.clearTimeout(tapTimer.current);
    tapTimer.current = window.setTimeout(() => {
      joystick.current = { x: 0, y: 0 };
      tapTimer.current = undefined;
    }, 1350);
  }, [wake]);

  const updateJoystick = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (joystickPointerId.current !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const nub = event.currentTarget.querySelector<HTMLElement>(".world-joystick__nub");
    const maxX = (rect.width - (nub?.getBoundingClientRect().width ?? 0)) / 2;
    const maxY = (rect.height - (nub?.getBoundingClientRect().height ?? 0)) / 2;
    const max = Math.max(1, Math.min(maxX, maxY));
    const length = Math.min(Math.hypot(dx, dy), max);
    const scale = length > 0 ? length / Math.hypot(dx, dy) : 0;
    const x = dx * scale;
    const y = dy * scale;
    joystick.current = { x: x / max, y: -y / max };
    nub?.style.setProperty("transform", `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`);
  }, []);

  const onJoystickPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (joystickPointerId.current !== null) return;
    event.preventDefault();
    joystickPointerId.current = event.pointerId;
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Pointer capture is optional. */ }
    wake();
    publishInputChange();
    updateJoystick(event);
  }, [publishInputChange, updateJoystick, wake]);

  const releaseJoystick = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (joystickPointerId.current !== event.pointerId) return;
    joystickPointerId.current = null;
    joystick.current = { x: 0, y: 0 };
    event.currentTarget.querySelector<HTMLElement>(".world-joystick__nub")
      ?.style.setProperty("transform", "translate(-50%,-50%)");
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch { /* A cancelled touch may already have released capture. */ }
    publishInputChange();
  }, [publishInputChange]);

  const triggerAction = useCallback((_key: "space") => {
    jumpPressPendingRef.current = true;
    wake();
    publishInputChange();
  }, [publishInputChange, wake]);

  const onActionPointerDown = useCallback((
    event: ReactPointerEvent<HTMLButtonElement>,
    key: WorldTouchAction,
  ) => {
    event.preventDefault();
    if (!startWorldTouchAction(actionPointersRef.current, key, event.pointerId)) return;
    actionPointerStartedAtRef.current.set(event.pointerId, performance.now());
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Pointer capture is optional. */ }
    if (key === "space") triggerAction(key);
    else syncWorldTouchActionKey(heldKeys.current, actionPointersRef.current, key);
    wake();
    publishInputChange();
  }, [publishInputChange, triggerAction, wake]);
  const finishActionPointer = useCallback((
    event: ReactPointerEvent<HTMLButtonElement>,
    key: WorldTouchAction,
    toggleQuickTap: boolean,
  ) => {
    const startedAt = actionPointerStartedAtRef.current.get(event.pointerId);
    actionPointerStartedAtRef.current.delete(event.pointerId);
    const result = endWorldTouchAction(actionPointersRef.current, key, event.pointerId);
    if (!result.released) return;
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch { /* A cancelled touch may already have released capture. */ }
    if (key !== "space") {
      if (
        toggleQuickTap
        && !result.stillPressed
        && startedAt !== undefined
        && isWorldTouchTap(performance.now() - startedAt)
      ) {
        const next = toggleWorldTouchActionState(toggledActionsRef.current, key);
        toggledActionsRef.current = next;
        setToggledActions(next);
      }
      syncWorldTouchActionKey(
        heldKeys.current,
        actionPointersRef.current,
        key,
        toggledActionsRef.current.has(key),
      );
    }
    publishInputChange();
  }, [publishInputChange]);
  const onActionPointerUp = useCallback((
    event: ReactPointerEvent<HTMLButtonElement>,
    key: WorldTouchAction,
  ) => finishActionPointer(event, key, true), [finishActionPointer]);
  const onActionPointerCancel = useCallback((
    event: ReactPointerEvent<HTMLButtonElement>,
    key: WorldTouchAction,
  ) => finishActionPointer(event, key, false), [finishActionPointer]);

  const toggleAction = useCallback((key: "shift" | "c") => {
    const next = toggleWorldTouchActionState(toggledActionsRef.current, key);
    toggledActionsRef.current = next;
    setToggledActions(next);
    syncWorldTouchActionKey(heldKeys.current, actionPointersRef.current, key, next.has(key));
    wake();
    publishInputChange();
  }, [publishInputChange, wake]);

  const clearActions = useCallback(() => {
    heldKeys.current.clear();
    joystick.current = { x: 0, y: 0 };
    joystickPointerId.current = null;
    actionPointersRef.current.clear();
    actionPointerStartedAtRef.current.clear();
    jumpPressPendingRef.current = false;
    toggledActionsRef.current.clear();
    setToggledActions(new Set());
    publishInputChange();
  }, [publishInputChange]);

  const readActions = useCallback((): WorldActionState => ({
    sprint: heldKeys.current.has("shift") || isWorldJoystickSprinting(joystick.current),
    jumpPressed: jumpPressPendingRef.current,
    crouch: heldKeys.current.has("control") || heldKeys.current.has("c"),
  }), []);

  const consumeJumpPress = useCallback(() => {
    jumpPressPendingRef.current = false;
    publishInputChange();
  }, [publishInputChange]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key === " " ? "space" : event.key.toLowerCase();
      if (!MOVEMENT_KEYS.has(key)) return;
      if (event.target instanceof HTMLElement && event.target.closest("button,input,textarea,select,[contenteditable=true]")) return;
      event.preventDefault();
      if (key === "space" && (event.repeat || heldKeys.current.has(key))) return;
      if (heldKeys.current.has(key)) return;
      heldKeys.current.add(key);
      if (key === "space") jumpPressPendingRef.current = true;
      publishInputChange();
      wake();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key === " " ? "space" : event.key.toLowerCase();
      if ((key === "shift" || key === "c") && toggledActionsRef.current.has(key)) return;
      if (heldKeys.current.delete(key)) publishInputChange();
    };
    const onBlur = clearActions;
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [clearActions, publishInputChange, wake]);

  useEffect(() => () => {
    if (tapTimer.current) window.clearTimeout(tapTimer.current);
  }, []);

  return {
    heldKeys,
    joystick,
    onStagePointerDown,
    onJoystickPointerDown,
    onJoystickPointerMove: updateJoystick,
    onJoystickPointerUp: releaseJoystick,
    onJoystickPointerCancel: releaseJoystick,
    onActionPointerDown,
    onActionPointerUp,
    onActionPointerCancel,
    toggleAction,
    triggerAction,
    readActions,
    consumeJumpPress,
    inputRevision,
    activePointerCount: () => countWorldTouchPointers(actionPointersRef.current)
      + Number(joystickPointerId.current !== null),
    isActionActive: (key: "shift" | "c") =>
      toggledActions.has(key)
      || heldKeys.current.has(key)
      || Boolean(actionPointersRef.current.get(key)?.size),
    clearActions,
  };
}
