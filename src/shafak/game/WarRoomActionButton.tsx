import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { playGameButtonClick } from "../audio/howler";
import { isWarRoomMuted } from "./war-room-audio";
import { HudButton, type HudButtonIconKey } from "./HudButton";

type Props = {
  label: string;
  hint?: string;
  className?: string;
  showHint?: boolean;
  vibrationEnabled?: boolean;
  style?: CSSProperties;
  icon?: HudButtonIconKey;
  title?: string;
  onDown?: () => void;
  onUp?: () => void;
  onClick?: () => void;
  onPointerStart?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerMove?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerEnd?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
};

export default function WarRoomActionButton({
  label,
  hint,
  className = "",
  showHint = false,
  vibrationEnabled = false,
  style,
  icon,
  title,
  onDown,
  onUp,
  onClick,
  onPointerStart,
  onPointerMove,
  onPointerEnd,
}: Props) {
  const pointer = useRef<number | null>(null);
  const [held, setHeld] = useState(false);
  const actionIcon: HudButtonIconKey = icon ?? (
    className.includes("fire") ? "fire"
      : className.includes("aim") ? "aim"
        : className.includes("melee-heavy") ? "melee-heavy"
          : className.includes("melee-light") ? "knife"
            : className.includes("reload") ? "reload"
              : className.includes("jump") ? "jump"
                : className.includes("dodge") ? "crouch"
                  : className.includes("sprint") ? "sprint"
                    : className.includes("swap") ? "swap"
                      : "weapon"
  );
  const playFeedback = () => {
    if (!isWarRoomMuted()) playGameButtonClick();
    if (vibrationEnabled && typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(8); } catch { /* Haptics are optional. */ }
    }
  };

  return (
    <HudButton
      type="button"
      icon={actionIcon}
      label={label}
      title={title}
      keyboardHint={showHint ? hint : undefined}
      held={held}
      className={`war-room-control${showHint && hint ? " has-keyboard-hint" : ""} ${className}`}
      style={style}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        pointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        setHeld(true);
        onPointerStart?.(event);
        onDown?.();
        playFeedback();
      }}
      onPointerMove={(event) => {
        if (pointer.current === event.pointerId) onPointerMove?.(event);
      }}
      onPointerUp={(event) => {
        if (pointer.current !== event.pointerId) return;
        pointer.current = null;
        setHeld(false);
        onPointerEnd?.(event);
        onUp?.();
        onClick?.();
      }}
      onPointerCancel={(event) => {
        if (pointer.current !== event.pointerId) return;
        pointer.current = null;
        setHeld(false);
        onPointerEnd?.(event);
        onUp?.();
      }}
      onLostPointerCapture={(event) => {
        if (pointer.current !== event.pointerId) return;
        pointer.current = null;
        setHeld(false);
        onPointerEnd?.(event);
        onUp?.();
      }}
      onClick={(event) => {
        event.stopPropagation();
        if (event.detail === 0) {
          onClick?.();
          playFeedback();
        }
      }}
    />
  );
}
