import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

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
  const tapTimer = useRef<number | undefined>(undefined);
  const toggledActionsRef = useRef(new Set<"shift" | "c">());
  const [toggledActions, setToggledActions] = useState<ReadonlySet<"shift" | "c">>(() => new Set());

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
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const max = rect.width * .34;
    const length = Math.min(Math.hypot(dx, dy), max);
    const scale = length > 0 ? length / Math.hypot(dx, dy) : 0;
    const x = dx * scale;
    const y = dy * scale;
    joystick.current = { x: x / max, y: -y / max };
    const nub = event.currentTarget.querySelector<HTMLElement>(".world-joystick__nub");
    nub?.style.setProperty("transform", `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`);
  }, []);

  const onJoystickPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    wake();
    updateJoystick(event);
  }, [updateJoystick, wake]);

  const releaseJoystick = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    joystick.current = { x: 0, y: 0 };
    event.currentTarget.querySelector<HTMLElement>(".world-joystick__nub")
      ?.style.setProperty("transform", "translate(-50%,-50%)");
  }, []);

  const onActionPointerDown = useCallback((
    event: ReactPointerEvent<HTMLButtonElement>,
    key: "shift" | "space" | "c",
  ) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    heldKeys.current.add(key);
    wake();
  }, [wake]);
  const onActionPointerUp = useCallback((
    event: ReactPointerEvent<HTMLButtonElement>,
    key: "shift" | "space" | "c",
  ) => {
    heldKeys.current.delete(key);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const toggleAction = useCallback((key: "shift" | "c") => {
    const next = new Set(toggledActionsRef.current);
    if (next.has(key)) {
      next.delete(key);
      heldKeys.current.delete(key);
    } else {
      next.add(key);
      heldKeys.current.add(key);
    }
    toggledActionsRef.current = next;
    setToggledActions(next);
    wake();
  }, [wake]);

  const clearActions = useCallback(() => {
    heldKeys.current.clear();
    joystick.current = { x: 0, y: 0 };
    toggledActionsRef.current.clear();
    setToggledActions(new Set());
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key === " " ? "space" : event.key.toLowerCase();
      if (!MOVEMENT_KEYS.has(key)) return;
      if (event.target instanceof HTMLElement && /input|textarea|select/i.test(event.target.tagName)) return;
      event.preventDefault();
      heldKeys.current.add(key);
      wake();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      heldKeys.current.delete(event.key === " " ? "space" : event.key.toLowerCase());
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
  }, [clearActions, wake]);

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
    toggleAction,
    isActionToggled: (key: "shift" | "c") => toggledActions.has(key),
    clearActions,
  };
}
