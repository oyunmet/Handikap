import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { playGameButtonClick } from "./audio-stub";

export type GameButtonIcon =
  | "run"
  | "jump"
  | "crouch"
  | "attack"
  | "shield"
  | "aim"
  | "dodge"
  | "fire"
  | "lightning"
  | "item";

type GameButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label: string;
  icon: GameButtonIcon;
  tone?: "ash" | "copper" | "gold" | "teal" | "sky";
  faceSize?: number;
  hitAreaSize?: number;
  hint?: string;
  badge?: string;
  attention?: boolean;
  pressed?: boolean;
  cooldownPercent?: number;
  children?: ReactNode;
};

const ICON_PATHS: Record<GameButtonIcon, string> = {
  run: "M15.2 4.3a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6ZM12 7l-3.3 3.1 3.1 1.4 2.2 3.4m-5.3-4.8-1.2 4-3.2 3.1m5.1-7.1 1.2-3.2 4.5-.7 3.1 2.1m-7.6-1.4-1.5 3.1",
  jump: "M12 21V4m-6 6 6-6 6 6M4 21h16",
  crouch: "m4 13 5-4 3 3 3-4 5 4M5 18h14m-7-5v5m-5 0v2m10-2v2",
  attack: "M4 4 20 20m-2-1 3-2m-3 3-2 3M20 4 4 20m2-2-3-2m3 3 2 3",
  shield: "M12 3 20 6v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3Z",
  aim: "M12 2v4m0 12v4M2 12h4m12 0h4M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 3v4m-2-2h4",
  dodge: "M3 15c3-6 6-6 9-2s5 4 9-2M5 7 2 10l3 3m14 0 3-3-3-3",
  fire: "M12 3c1 4-3 5-1 8 1-2 3-3 4-5 4 5 4 9 1 12-3 3-9 1-9-4 0-4 3-6 5-11Z",
  lightning: "M13 2 5 13h6l-1 9 9-12h-6l1-8Z",
  item: "M5 8h14v12H5zM8 8V5h8v3m-4 4v5m-2-2 2 2 2-2",
};

export function GameButtonIconMark({
  icon,
  className,
}: {
  icon: GameButtonIcon;
  className?: string;
}) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={ICON_PATHS[icon]} />
    </svg>
  );
}

export default function GameButton({
  label,
  icon,
  tone = "copper",
  faceSize = 80,
  hitAreaSize = 96,
  hint,
  badge,
  attention = false,
  pressed = false,
  cooldownPercent = 0,
  className = "",
  children,
  style,
  ...buttonProps
}: GameButtonProps) {
  const safeCooldown = Math.max(0, Math.min(100, cooldownPercent));
  const buttonStyle = {
    "--game-button-face": `${faceSize}px`,
    "--game-button-cooldown": `${safeCooldown}%`,
    width: `${hitAreaSize}px`,
    height: `${hitAreaSize}px`,
    minWidth: `${hitAreaSize}px`,
    minHeight: `${hitAreaSize}px`,
    ...style,
  } as CSSProperties;

  return (
    <button
      {...buttonProps}
      className={`game-button ${className}`}
      data-tone={tone}
      data-label={label}
      data-pressed={pressed || undefined}
      data-attention={attention || undefined}
      data-cooling={safeCooldown > 0 || undefined}
      style={buttonStyle}
      onPointerDownCapture={(event) => {
        if (event.button === 0 && !buttonProps.disabled && buttonProps["aria-disabled"] !== true) {
          playGameButtonClick();
        }
        buttonProps.onPointerDownCapture?.(event);
      }}
      onKeyDownCapture={(event) => {
        buttonProps.onKeyDownCapture?.(event);
      }}
      onClickCapture={(event) => {
        if (event.detail === 0 && !buttonProps.disabled && buttonProps["aria-disabled"] !== true) {
          playGameButtonClick();
        }
        buttonProps.onClickCapture?.(event);
      }}
    >
      <span className="game-button__bezel" aria-hidden="true" />
      <span className="game-button__sheen" aria-hidden="true" />
      <span className="game-button__cooldown" aria-hidden="true" />
      <span className="game-button__ripple" aria-hidden="true" />
      <span className="game-button__content">
        <GameButtonIconMark icon={icon} className="game-button__icon" />
        <span className="game-button__label">{label}</span>
        {hint && <kbd className="game-button__hint">{hint}</kbd>}
      </span>
      {badge && <span className="game-button__badge">{badge}</span>}
      {children}
    </button>
  );
}
