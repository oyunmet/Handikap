import { useRef, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { INPUT_BUTTON } from "./combat-engine";

type DuelControlsProps = {
  disabled?: boolean;
  skillOneSeconds: number;
  skillTwoSeconds: number;
  onPress: (button: number) => void;
  onRelease: (button: number) => void;
  onMove: (x: number, y: number) => void;
  onSurrender: () => void;
};

function HeldButton({
  button,
  label,
  className,
  onPress,
  onRelease,
  cooldown = 0,
}: {
  button: number;
  label: string;
  className: string;
  onPress: (button: number) => void;
  onRelease: (button: number) => void;
  cooldown?: number;
}) {
  const pointerRef = useRef<number | null>(null);
  const pressedRef = useRef(false);
  const press = () => {
    if (pressedRef.current) return;
    pressedRef.current = true;
    onPress(button);
  };
  const release = () => {
    if (!pressedRef.current) return;
    pressedRef.current = false;
    onRelease(button);
  };
  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    pointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    press();
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (pointerRef.current !== event.pointerId) return;
    pointerRef.current = null;
    release();
  };
  const onKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    if (!event.repeat) press();
  };
  const onKeyUp = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === " " || event.key === "Enter") release();
  };

  return (
    <button
      className={`duel-control ${className}`}
      type="button"
      aria-label={label}
      aria-disabled={cooldown > 0}
      style={{ "--duel-cooldown": `${Math.min(100, Math.max(0, cooldown / 6 * 100))}%` } as CSSProperties}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={release}
    >
      <span>{label}</span>
      {cooldown > 0 && <small>{cooldown.toFixed(1)}</small>}
    </button>
  );
}

export default function DuelControls({
  disabled = false,
  skillOneSeconds,
  skillTwoSeconds,
  onPress,
  onRelease,
  onMove,
  onSurrender,
}: DuelControlsProps) {
  const joystickRef = useRef<HTMLDivElement>(null);
  const joystickPointer = useRef<number | null>(null);

  const readJoystick = (event: ReactPointerEvent<HTMLDivElement>) => {
    const element = joystickRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const radius = Math.min(rect.width, rect.height) * 0.37;
    const dx = (event.clientX - (rect.left + rect.width / 2)) / radius;
    const dy = ((rect.top + rect.height / 2) - event.clientY) / radius;
    const length = Math.hypot(dx, dy);
    const scale = length > 1 ? 1 / length : 1;
    const x = Math.max(-1, Math.min(1, dx * scale));
    const y = Math.max(-1, Math.min(1, dy * scale));
    element.style.setProperty("--stick-x", `${x * radius}px`);
    element.style.setProperty("--stick-y", `${-y * radius}px`);
    onMove(x, y);
  };
  const onJoystickDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    joystickPointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    readJoystick(event);
  };
  const onJoystickMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (joystickPointer.current === event.pointerId) readJoystick(event);
  };
  const onJoystickRelease = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (joystickPointer.current !== event.pointerId) return;
    joystickPointer.current = null;
    joystickRef.current?.style.setProperty("--stick-x", "0px");
    joystickRef.current?.style.setProperty("--stick-y", "0px");
    onMove(0, 0);
  };

  return (
    <div className={`duel-controls${disabled ? " is-disabled" : ""}`} aria-label="Düello kontrolleri">
      <button className="duel-forfeit" type="button" onClick={onSurrender} disabled={disabled}>PES ET</button>
      <div
        ref={joystickRef}
        className="duel-stick"
        role="application"
        aria-label="Hareket joystick'i"
        onPointerDown={onJoystickDown}
        onPointerMove={onJoystickMove}
        onPointerUp={onJoystickRelease}
        onPointerCancel={onJoystickRelease}
      >
        <span aria-hidden="true" />
      </div>
      <div className="duel-control-hint">WASD · J saldırı · K kalkan · L atılma · Boşluk / Q yetenek</div>
      <div className="duel-control-cluster">
        <div className="duel-control-cluster__skills">
          <HeldButton
            button={INPUT_BUTTON.skillOne}
            label="KOR"
            className="is-skill is-fire"
            onPress={onPress}
            onRelease={onRelease}
            cooldown={skillOneSeconds}
          />
          <HeldButton
            button={INPUT_BUTTON.skillTwo}
            label="YILDIRIM"
            className="is-skill is-lightning"
            onPress={onPress}
            onRelease={onRelease}
            cooldown={skillTwoSeconds}
          />
        </div>
        <div className="duel-control-cluster__actions">
          <HeldButton button={INPUT_BUTTON.dodge} label="ATILMA" className="is-dodge" onPress={onPress} onRelease={onRelease} />
          <HeldButton button={INPUT_BUTTON.block} label="KALKAN" className="is-block" onPress={onPress} onRelease={onRelease} />
          <HeldButton button={INPUT_BUTTON.attack} label="SALDIRI" className="is-attack" onPress={onPress} onRelease={onRelease} />
        </div>
      </div>
    </div>
  );
}
