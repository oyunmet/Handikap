import { useCallback, useEffect, useRef, type MutableRefObject, type PointerEvent as ReactPointerEvent } from "react";

type Vector = { x: number; y: number };
export type TravelAction = "sprint" | "jump" | "dash";
type TravelActions = {
  sprint: boolean;
  jumpHeld: boolean;
  jumpPressed: boolean;
  dashPressed: boolean;
};

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
]);

export default function useWorldInput(
  wake: () => void,
  battleActiveRef?: MutableRefObject<boolean>,
  storyDialogueRef?: MutableRefObject<unknown>,
) {
  const heldKeys = useRef(new Set<string>());
  const joystick = useRef<Vector>({ x: 0, y: 0 });
  const actions = useRef<TravelActions>({
    sprint: false,
    jumpHeld: false,
    jumpPressed: false,
    dashPressed: false,
  });
  const tapTimer = useRef<number | undefined>(undefined);
  const setAction = useCallback((action: TravelAction, pressed: boolean) => {
    if (action === "sprint") {
      actions.current.sprint = pressed;
    } else if (action === "jump") {
      if (pressed && !actions.current.jumpHeld) actions.current.jumpPressed = true;
      actions.current.jumpHeld = pressed;
    } else if (pressed) {
      actions.current.dashPressed = true;
    }
  }, []);

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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (event.target instanceof HTMLElement && event.target.closest("button, input, textarea, select")) return;
      if (battleActiveRef?.current || storyDialogueRef?.current != null) return;
      if (event.code === "Space") {
        event.preventDefault();
        setAction("jump", true);
        wake();
        return;
      }
      if (key === "alt" || key === "q") {
        event.preventDefault();
        if (!event.repeat) setAction("dash", true);
        wake();
        return;
      }
      if (!MOVEMENT_KEYS.has(key)) return;
      event.preventDefault();
      heldKeys.current.add(key);
      if (key === "shift") setAction("sprint", true);
      wake();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (event.code === "Space") {
        setAction("jump", false);
        return;
      }
      if (key === "shift") setAction("sprint", false);
      heldKeys.current.delete(key);
    };
    const onBlur = () => {
      heldKeys.current.clear();
      joystick.current = { x: 0, y: 0 };
      actions.current.sprint = false;
      actions.current.jumpHeld = false;
      actions.current.jumpPressed = false;
      actions.current.dashPressed = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [battleActiveRef, setAction, storyDialogueRef, wake]);

  useEffect(() => () => {
    if (tapTimer.current) window.clearTimeout(tapTimer.current);
  }, []);

  return {
    heldKeys,
    joystick,
    actions,
    setAction,
    onStagePointerDown,
    onJoystickPointerDown,
    onJoystickPointerMove: updateJoystick,
    onJoystickPointerUp: releaseJoystick,
    onJoystickPointerCancel: releaseJoystick,
  };
}
