import { useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { INPUT_BUTTON } from "./combat-engine";

type DuelControlsProps = {
  disabled?: boolean;
  stamina: number;
  attackCooldownSeconds: number;
  skillOneSeconds: number;
  skillTwoSeconds: number;
  onPress: (button: number) => void;
  onRelease: (button: number) => void;
  onMove: (x: number, y: number) => void;
  onSurrender: () => void;
  onOpenHelp: () => void;
};

function HeldButton({
  button,
  label,
  className,
  onPress,
  onRelease,
  cooldown = 0,
  disabledReason = "",
  onBlocked,
}: {
  button: number;
  label: string;
  className: string;
  onPress: (button: number) => void;
  onRelease: (button: number) => void;
  cooldown?: number;
  disabledReason?: string;
  onBlocked?: (reason: string) => void;
}) {
  const pointerRef = useRef<number | null>(null);
  const pressedRef = useRef(false);
  const press = () => {
    if (pressedRef.current) return;
    if (cooldown > 0 || disabledReason) {
      onBlocked?.(disabledReason || `Hazır olması için ${cooldown.toFixed(1)} saniye bekle.`);
      return;
    }
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
      className={`duel-control ${className}${cooldown > 0 || disabledReason ? " is-unavailable" : ""}`}
      type="button"
      aria-label={label}
      aria-disabled={cooldown > 0 || !!disabledReason}
      style={{ "--duel-cooldown": `${Math.min(100, Math.max(0, cooldown / 6 * 100))}%` } as CSSProperties}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={release}
    >
      <ControlIcon className={className} />
      <span>{label}</span>
      {cooldown > 0 && <small>{cooldown.toFixed(1)}</small>}
    </button>
  );
}

function ControlIcon({ className }: { className: string }) {
  const path = className.includes("attack")
    ? "M5 19 19 5M12 5h7v7M4 20l5-1-4-4-1 5Z"
    : className.includes("block")
      ? "M12 3 20 6v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3Z"
      : className.includes("dodge")
        ? "M4 15c3-6 6-6 9-2s5 4 7-2M5 7l-2 2 2 2M19 15l2-2-2-2"
        : className.includes("fire")
          ? "M12 3c1 4-3 5-1 8 1-2 3-3 4-5 4 5 4 9 1 12-3 3-9 1-9-4 0-4 3-6 5-11Z"
          : "M13 2 5 13h6l-1 9 9-12h-6l1-8Z";
  return (
    <svg className="duel-control__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

export default function DuelControls({
  disabled = false,
  stamina,
  attackCooldownSeconds,
  skillOneSeconds,
  skillTwoSeconds,
  onPress,
  onRelease,
  onMove,
  onSurrender,
  onOpenHelp,
}: DuelControlsProps) {
  const joystickRef = useRef<HTMLDivElement>(null);
  const joystickPointer = useRef<number | null>(null);
  const [blockedHint, setBlockedHint] = useState("");
  const showBlockedHint = (reason: string) => {
    setBlockedHint(reason);
    window.setTimeout(() => setBlockedHint(""), 1900);
  };

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
      <div className="duel-control-hint">WASD HAREKET · J SALDIRI · K KALKAN · L KAÇ · BOŞLUK KOR · Q YILDIRIM</div>
      <button className="duel-help-button" type="button" onClick={onOpenHelp} aria-label="Düello yardımını aç">?</button>
      {blockedHint && <div className="duel-control-toast" role="status" aria-live="polite">{blockedHint}</div>}
      <div className="duel-control-cluster">
        <div className="duel-control-cluster__skills">
          <HeldButton
            button={INPUT_BUTTON.skillOne}
            label="KOR"
            className="is-skill is-fire"
            onPress={onPress}
            onRelease={onRelease}
            cooldown={skillOneSeconds}
            disabledReason={stamina < 24 ? "KOR için 24 dayanıklılık gerekli." : ""}
            onBlocked={showBlockedHint}
          />
          <HeldButton
            button={INPUT_BUTTON.skillTwo}
            label="YILDIRIM"
            className="is-skill is-lightning"
            onPress={onPress}
            onRelease={onRelease}
            cooldown={skillTwoSeconds}
            disabledReason={stamina < 30 ? "YILDIRIM için 30 dayanıklılık gerekli." : ""}
            onBlocked={showBlockedHint}
          />
        </div>
        <div className="duel-control-cluster__actions">
          <HeldButton button={INPUT_BUTTON.dodge} label="KAÇ" className="is-dodge" onPress={onPress} onRelease={onRelease} disabledReason={stamina < 20 ? "KAÇ için 20 dayanıklılık gerekli." : ""} onBlocked={showBlockedHint} />
          <HeldButton button={INPUT_BUTTON.block} label="KALKAN" className="is-block" onPress={onPress} onRelease={onRelease} disabledReason={stamina < 1 ? "Kalkan için dayanıklılık gerekli." : ""} onBlocked={showBlockedHint} />
          <HeldButton button={INPUT_BUTTON.attack} label="SALDIRI" className="is-attack" onPress={onPress} onRelease={onRelease} cooldown={attackCooldownSeconds} disabledReason={stamina < 9 ? "SALDIRI için 9 dayanıklılık gerekli." : ""} onBlocked={showBlockedHint} />
        </div>
      </div>
    </div>
  );
}
