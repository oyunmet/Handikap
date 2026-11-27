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
import {
  getDynamicJoystickVector,
  getWorldPointerControlSide,
} from "./world-input-controls";

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
  "q",
  "e",
  "shift",
  "space",
  "control",
  "c",
]);

export default function useWorldInput(
  wake: () => void,
  { allowMovement = true }: { allowMovement?: boolean } = {},
) {
  const heldKeys = useRef(new Set<string>());
  const joystick = useRef<Vector>({ x: 0, y: 0 });
  const allowMovementRef = useRef(allowMovement);
  allowMovementRef.current = allowMovement;
  const joystickPointerId = useRef<number | null>(null);
  const joystickOrigin = useRef<{ x: number; y: number; radius: number } | null>(null);
  const [joystickAnchor, setJoystickAnchor] = useState<{ x: number; y: number } | null>(null);
  const joystickVisualRef = useRef<HTMLDivElement>(null);
  const lookPointerId = useRef<number | null>(null);
  const lookPointerX = useRef(0);
  const lookPointerY = useRef(0);
  const cameraLookDelta = useRef({ yaw: 0, pitch: 0 });
  const actionPointersRef = useRef(new Map<WorldTouchAction, Set<number>>());
  const actionPointerStartedAtRef = useRef(new Map<number, number>());
  const jumpPressPendingRef = useRef(false);
  const toggledActionsRef = useRef(new Set<"shift" | "c">());
  const [toggledActions, setToggledActions] = useState<ReadonlySet<"shift" | "c">>(() => new Set());
  const [inputRevision, setInputRevision] = useState(0);
  const publishInputChange = useCallback(() => setInputRevision((revision) => revision + 1), []);

  const updateJoystick = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (joystickPointerId.current !== event.pointerId) return;
    const origin = joystickOrigin.current;
    if (!origin) return;
    joystick.current = getDynamicJoystickVector(
      event.clientX - origin.x,
      event.clientY - origin.y,
      origin.radius,
    );
    const nub = joystickVisualRef.current?.querySelector<HTMLElement>(".world-joystick__nub");
    nub?.style.setProperty(
      "transform",
      `translate(calc(-50% + ${joystick.current.x * 34}px), calc(-50% - ${joystick.current.y * 34}px))`,
    );
  }, []);

  const onStagePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button, a, [role='button'], .world-panel, .world-joystick, .duel-stick, .world-debug")) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const controlSide = getWorldPointerControlSide(
      event.clientX,
      bounds.left,
      bounds.width,
    );
    if (controlSide === "movement" && joystickPointerId.current === null) {
      if (!allowMovementRef.current) return;
      event.preventDefault();
      joystickPointerId.current = event.pointerId;
      const radius = 54;
      joystickOrigin.current = {
        x: event.clientX,
        y: event.clientY,
        radius,
      };
      setJoystickAnchor({
        x: Math.max(58, Math.min(bounds.width - 58, event.clientX - bounds.left)),
        y: Math.max(58, Math.min(bounds.height - 58, event.clientY - bounds.top)),
      });
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Pointer capture is optional. */ }
      updateJoystick(event);
    } else if (controlSide === "look" && lookPointerId.current === null) {
      event.preventDefault();
      lookPointerId.current = event.pointerId;
      lookPointerX.current = event.clientX;
      lookPointerY.current = event.clientY;
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Pointer capture is optional. */ }
    }
    wake();
  }, [updateJoystick, wake]);

  useEffect(() => {
    if (allowMovement) return;
    joystickPointerId.current = null;
    joystickOrigin.current = null;
    joystick.current = { x: 0, y: 0 };
    setJoystickAnchor(null);
    joystickVisualRef.current?.querySelector<HTMLElement>(".world-joystick__nub")
      ?.style.setProperty("transform", "translate(-50%,-50%)");
    publishInputChange();
  }, [allowMovement, publishInputChange]);

  const onStagePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (joystickPointerId.current === event.pointerId) {
      updateJoystick(event);
      return;
    }
    if (lookPointerId.current !== event.pointerId) return;
    const deltaX = event.clientX - lookPointerX.current;
    const deltaY = event.clientY - lookPointerY.current;
    lookPointerX.current = event.clientX;
    lookPointerY.current = event.clientY;
    cameraLookDelta.current.yaw = Math.max(
      -0.9,
      Math.min(0.9, cameraLookDelta.current.yaw + deltaX * 0.006),
    );
    cameraLookDelta.current.pitch = Math.max(
      -0.45,
      Math.min(0.45, cameraLookDelta.current.pitch - deltaY * 0.004),
    );
    publishInputChange();
  }, [publishInputChange, updateJoystick]);

  const finishStagePointer = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (joystickPointerId.current === event.pointerId) {
      joystickPointerId.current = null;
      joystickOrigin.current = null;
      joystick.current = { x: 0, y: 0 };
      setJoystickAnchor(null);
      joystickVisualRef.current?.querySelector<HTMLElement>(".world-joystick__nub")
        ?.style.setProperty("transform", "translate(-50%,-50%)");
      publishInputChange();
    }
    if (lookPointerId.current === event.pointerId) lookPointerId.current = null;
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch { /* A cancelled touch may already have released capture. */ }
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
    joystickOrigin.current = null;
    setJoystickAnchor(null);
    joystickVisualRef.current?.querySelector<HTMLElement>(".world-joystick__nub")
      ?.style.setProperty("transform", "translate(-50%,-50%)");
    lookPointerId.current = null;
    lookPointerX.current = 0;
    lookPointerY.current = 0;
    cameraLookDelta.current = { yaw: 0, pitch: 0 };
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

  const consumeCameraLookDelta = useCallback(() => {
    const delta = cameraLookDelta.current;
    cameraLookDelta.current = { yaw: 0, pitch: 0 };
    return { ...delta };
  }, []);

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

  return {
    heldKeys,
    joystick,
    onStagePointerDown,
    onStagePointerMove,
    onStagePointerUp: finishStagePointer,
    onStagePointerCancel: finishStagePointer,
    joystickAnchor,
    joystickVisualRef,
    onActionPointerDown,
    onActionPointerUp,
    onActionPointerCancel,
    toggleAction,
    triggerAction,
    readActions,
    consumeJumpPress,
    consumeCameraLookDelta,
    inputRevision,
    activePointerCount: () => countWorldTouchPointers(actionPointersRef.current)
      + Number(joystickPointerId.current !== null)
      + Number(lookPointerId.current !== null),
    isActionActive: (key: "shift" | "c") =>
      toggledActions.has(key)
      || heldKeys.current.has(key)
      || Boolean(actionPointersRef.current.get(key)?.size),
    clearActions,
  };
}
