import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { INPUT_BUTTON } from "./combat-engine";
import GameButton, { type GameButtonIcon } from "./GameButton";

type DuelControlsProps = {
  disabled?: boolean;
  stamina: number;
  attackCooldownSeconds: number;
  skillOneSeconds: number;
  skillTwoSeconds: number;
  onPress: (button: number) => void;
  onRelease: (button: number) => void;
  onMove: (x: number, y: number) => void;
};

function HeldButton({
  button,
  label,
  className,
  tone,
  icon,
  hint,
  cooldown = 0,
  cooldownDuration = 6,
  disabled,
  disabledReason = "",
  onPress,
  onRelease,
  onBlocked,
  accessibleLabel,
}: {
  button: number;
  label: string;
  className: string;
  tone: "copper" | "gold" | "teal" | "sky";
  icon: GameButtonIcon;
  hint?: string;
  cooldown?: number;
  cooldownDuration?: number;
  disabled: boolean;
  disabledReason?: string;
  onPress: (button: number) => void;
  onRelease: (button: number) => void;
  onBlocked: (reason: string) => void;
  accessibleLabel: string;
}) {
  const pointerRef = useRef<number | null>(null);
  const pressedRef = useRef(false);
  const onReleaseRef = useRef(onRelease);
  const [pressed, setPressed] = useState(false);
  onReleaseRef.current = onRelease;

  const release = () => {
    if (!pressedRef.current) return;
    pressedRef.current = false;
    setPressed(false);
    onReleaseRef.current(button);
  };
  const releaseRef = useRef(release);
  releaseRef.current = release;

  const press = () => {
    if (pressedRef.current) return;
    if (disabled) return;
    if (cooldown > 0 || disabledReason) {
      onBlocked(disabledReason || `Hazır olması için ${cooldown.toFixed(1)} saniye bekle.`);
      return;
    }
    pressedRef.current = true;
    setPressed(true);
    onPress(button);
  };

  useEffect(() => {
    const finishPointer = (event: PointerEvent) => {
      if (pointerRef.current !== event.pointerId) return;
      pointerRef.current = null;
      releaseRef.current();
    };
    window.addEventListener("pointerup", finishPointer);
    window.addEventListener("pointercancel", finishPointer);
    return () => {
      window.removeEventListener("pointerup", finishPointer);
      window.removeEventListener("pointercancel", finishPointer);
      pointerRef.current = null;
      if (pressedRef.current) {
        pressedRef.current = false;
        onReleaseRef.current(button);
      }
    };
  }, [button]);

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    pointerRef.current = event.pointerId;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Window-level pointer listeners still release the held action.
    }
    press();
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (pointerRef.current !== event.pointerId) return;
    pointerRef.current = null;
    release();
  };
  const onPointerCancel = (event: ReactPointerEvent<HTMLButtonElement>) => {
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
  const cooldownPercent = cooldownDuration > 0
    ? Math.min(100, Math.max(0, cooldown / cooldownDuration * 100))
    : 0;

  return (
    <GameButton
      className={`duel-control ${className}${cooldown > 0 || disabledReason ? " is-unavailable" : ""}`}
      type="button"
      aria-label={accessibleLabel}
      aria-disabled={disabled || cooldown > 0 || Boolean(disabledReason)}
      label={label}
      icon={icon}
      hint={hint}
      tone={tone}
      faceSize={64}
      hitAreaSize={76}
      pressed={pressed}
      cooldownPercent={cooldownPercent}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={onPointerCancel}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={release}
    />
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
}: DuelControlsProps) {
  const joystickRef = useRef<HTMLDivElement>(null);
  const joystickPointer = useRef<number | null>(null);
  const onMoveRef = useRef(onMove);
  const blockedHintTimeout = useRef<number | null>(null);
  const [blockedHint, setBlockedHint] = useState("");
  onMoveRef.current = onMove;

  const showBlockedHint = (reason: string) => {
    setBlockedHint(reason);
    if (blockedHintTimeout.current !== null) {
      window.clearTimeout(blockedHintTimeout.current);
    }
    blockedHintTimeout.current = window.setTimeout(() => {
      blockedHintTimeout.current = null;
      setBlockedHint("");
    }, 1800);
  };

  const resetJoystick = () => {
    joystickRef.current?.style.setProperty("--stick-x", "0px");
    joystickRef.current?.style.setProperty("--stick-y", "0px");
    onMoveRef.current(0, 0);
  };

  const readJoystick = (event: ReactPointerEvent<HTMLDivElement>) => {
    const element = joystickRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const nub = element.querySelector<HTMLElement>("span");
    const radius = Math.max(1, Math.min(
      (rect.width - (nub?.getBoundingClientRect().width ?? 0)) / 2,
      (rect.height - (nub?.getBoundingClientRect().height ?? 0)) / 2,
    ));
    const dx = (event.clientX - (rect.left + rect.width / 2)) / radius;
    const dy = ((rect.top + rect.height / 2) - event.clientY) / radius;
    const length = Math.hypot(dx, dy);
    const scale = length > 1 ? 1 / length : 1;
    const x = Math.max(-1, Math.min(1, dx * scale));
    const y = Math.max(-1, Math.min(1, dy * scale));
    element.style.setProperty("--stick-x", `${x * radius}px`);
    element.style.setProperty("--stick-y", `${-y * radius}px`);
    onMoveRef.current(x, y);
  };

  const onJoystickDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || joystickPointer.current !== null) return;
    event.preventDefault();
    joystickPointer.current = event.pointerId;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Window-level pointer listeners still reset movement on release.
    }
    readJoystick(event);
  };
  const onJoystickMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (joystickPointer.current === event.pointerId) readJoystick(event);
  };
  const onJoystickRelease = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (joystickPointer.current !== event.pointerId) return;
    joystickPointer.current = null;
    resetJoystick();
  };

  useEffect(() => {
    const finishJoystickPointer = (event: PointerEvent) => {
      if (joystickPointer.current !== event.pointerId) return;
      joystickPointer.current = null;
      resetJoystick();
    };
    const clearJoystick = () => {
      const pointerId = joystickPointer.current;
      if (pointerId === null) return;
      joystickPointer.current = null;
      if (joystickRef.current?.hasPointerCapture(pointerId)) {
        try {
          joystickRef.current.releasePointerCapture(pointerId);
        } catch {
          // The browser may already have released this pointer.
        }
      }
      resetJoystick();
    };
    window.addEventListener("pointerup", finishJoystickPointer);
    window.addEventListener("pointercancel", finishJoystickPointer);
    window.addEventListener("orientationchange", clearJoystick);
    window.addEventListener("blur", clearJoystick);
    document.addEventListener("visibilitychange", clearJoystick);
    return () => {
      window.removeEventListener("pointerup", finishJoystickPointer);
      window.removeEventListener("pointercancel", finishJoystickPointer);
      window.removeEventListener("orientationchange", clearJoystick);
      window.removeEventListener("blur", clearJoystick);
      document.removeEventListener("visibilitychange", clearJoystick);
      if (joystickPointer.current !== null) {
        joystickPointer.current = null;
        onMoveRef.current(0, 0);
      }
      if (blockedHintTimeout.current !== null) {
        window.clearTimeout(blockedHintTimeout.current);
      }
    };
  }, []);

  return (
    <div
      className={`duel-controls duel-controls--field${disabled ? " is-disabled" : ""}`}
      role="group"
      aria-label="Düello kontrolleri"
    >
      <div
        ref={joystickRef}
        className="duel-stick"
        role="application"
        aria-label="Hareket joystick'i"
        onPointerDown={onJoystickDown}
        onPointerMove={onJoystickMove}
        onPointerUp={onJoystickRelease}
        onPointerCancel={onJoystickRelease}
        onLostPointerCapture={onJoystickRelease}
      >
        <span aria-hidden="true" />
      </div>
      {blockedHint && <div className="duel-control-toast" role="status" aria-live="polite">{blockedHint}</div>}
      <div className="duel-control-cluster" role="group" aria-label="Düello hareketleri ve becerileri">
        <div className="duel-control-cluster__actions">
          <HeldButton
            button={INPUT_BUTTON.attack}
            label="SALDIRI"
            className="is-attack"
            tone="gold"
            icon="attack"
            hint="TUT: AĞIR"
            cooldown={attackCooldownSeconds}
            cooldownDuration={0.9}
            disabled={disabled}
            disabledReason={stamina < 7 ? "Saldırı için dayanıklılık gerekli." : ""}
            onPress={onPress}
            onRelease={onRelease}
            onBlocked={showBlockedHint}
            accessibleLabel="Saldır; basılı tutunca ağır saldırı yap"
          />
          <HeldButton
            button={INPUT_BUTTON.skillTwo}
            label="YILDIRIM"
            className="is-skill is-lightning"
            tone="sky"
            icon="lightning"
            cooldown={skillTwoSeconds}
            cooldownDuration={6}
            disabled={disabled}
            disabledReason={stamina < 30 ? "Yıldırım için 30 dayanıklılık gerekli." : ""}
            onPress={onPress}
            onRelease={onRelease}
            onBlocked={showBlockedHint}
            accessibleLabel="Yıldırım yeteneğini kullan"
          />
          <HeldButton
            button={INPUT_BUTTON.skillOne}
            label="ATEŞ"
            className="is-skill is-fire"
            tone="copper"
            icon="fire"
            cooldown={skillOneSeconds}
            cooldownDuration={4}
            disabled={disabled}
            disabledReason={stamina < 24 ? "Ateş için 24 dayanıklılık gerekli." : ""}
            onPress={onPress}
            onRelease={onRelease}
            onBlocked={showBlockedHint}
            accessibleLabel="Ateş yeteneğini kullan"
          />
          <HeldButton
            button={INPUT_BUTTON.block}
            label="KALKAN"
            className="is-block"
            tone="teal"
            icon="shield"
            disabled={disabled}
            disabledReason={stamina < 1 ? "Kalkan için dayanıklılık gerekli." : ""}
            onPress={onPress}
            onRelease={onRelease}
            onBlocked={showBlockedHint}
            accessibleLabel="Kalkanla savun"
          />
        </div>
      </div>
    </div>
  );
}
