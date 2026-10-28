import type {
  ButtonHTMLAttributes,
  CSSProperties,
  PointerEventHandler,
} from "react";

export type HudButtonIconKey =
  | "aim"
  | "ammo"
  | "crouch"
  | "dodge"
  | "fire"
  | "grenade"
  | "jump"
  | "knife"
  | "magazine"
  | "melee-heavy"
  | "move"
  | "prone"
  | "reload"
  | "sprint"
  | "swap"
  | "weapon";

type HudButtonNativeProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label" | "children" | "className" | "disabled" | "style" | "onPointerMove"
>;

export type HudButtonProps = HudButtonNativeProps & {
  /** Accessible and visible action name, e.g. "ATEŞ". */
  label: string;
  icon: HudButtonIconKey;
  keyboardHint?: string;
  disabled?: boolean;
  held?: boolean;
  /** Cooldown completion from 0 (empty) to 1 (complete). */
  cooldownProgress?: number;
  className?: string;
  style?: CSSProperties;
  /** Receives the original pointer event, including its pointerId. */
  onPointerMove?: PointerEventHandler<HTMLButtonElement>;
};

function HudGlyph({ icon }: { icon: HudButtonIconKey }) {
  switch (icon) {
    case "aim":
      return (
        <>
          <path d="M8 3.75H5.75a2 2 0 0 0-2 2V8" />
          <path d="M16 3.75h2.25a2 2 0 0 1 2 2V8" />
          <path d="M20.25 16v2.25a2 2 0 0 1-2 2H16" />
          <path d="M8 20.25H5.75a2 2 0 0 1-2-2V16" />
          <circle cx="12" cy="12" r="3.15" />
          <path d="M12 1.75v3M12 19.25v3M1.75 12h3m14.5 0h3" />
        </>
      );
    case "ammo":
      return (
        <>
          <path d="M9 20.5h6M10.2 17.5h3.6V7.3L12 3.5l-1.8 3.8z" />
          <path d="M10.2 9.2h3.6M10.2 13.2h3.6" />
        </>
      );
    case "crouch":
      return (
        <>
          <circle cx="15.7" cy="5.1" r="1.8" />
          <path d="m14.4 8-3.5 3.1 3.7 2.2 2.4 5.5M11 11.1l-4.5 1.2-1.7 4.5M14.6 13.3l-3.4 5.2H6.3" />
        </>
      );
    case "dodge":
      return (
        <>
          <path d="M4 16.8c3.2 0 4.4-1.2 5.7-4.7l1.1-3.2c.45-1.25 1.25-1.9 2.4-1.9 1.25 0 2.15.95 2.15 2.2v1.05h3.9" />
          <path d="m16.6 7.1 2.8 3.15-2.8 3.15" />
          <path d="M4.25 20h6.1M3.2 4.1l3.4 2.1" />
        </>
      );
    case "fire":
      return (
        <>
          <path d="M12 2.7v4.1m0 10.4v4.1M2.7 12h4.1m10.4 0h4.1" />
          <path d="m5.45 5.45 2.9 2.9m7.3 7.3 2.9 2.9m0-13.1-2.9 2.9m-7.3 7.3-2.9 2.9" />
          <path d="m12 7.8 1.15 3.05L16.2 12l-3.05 1.15L12 16.2l-1.15-3.05L7.8 12l3.05-1.15L12 7.8Z" />
        </>
      );
    case "grenade":
      return (
        <>
          <path d="M9 7.3h6a4.7 4.7 0 0 1 4.7 4.7v3.4a5.6 5.6 0 0 1-5.6 5.6h-4.2a5.6 5.6 0 0 1-5.6-5.6V12A4.7 4.7 0 0 1 9 7.3Z" />
          <path d="M10 7.2V4.8h4v2.4M14 4.8l2.4-1.5M9.2 11.2l-2.1 1.5m9.7-1.8 1.5 2.4m-6.3 0v4.2" />
        </>
      );
    case "jump":
      return (
        <>
          <path d="M12 20.5V5.2" />
          <path d="m6.6 10.2 5.4-5.4 5.4 5.4" />
          <path d="M7.3 20.5h9.4" />
          <path d="m4.7 7.4 1.5-1.5m13.1 1.5-1.5-1.5" />
        </>
      );
    case "knife":
      return (
        <>
          <path d="m4 19 2.4 2.4 3.1-3.1-2.4-2.4zM8 16l9.4-9.4a2.2 2.2 0 0 1 3.1 0l.9.9a2.2 2.2 0 0 1 0 3.1L12 20" />
          <path d="m14.3 9.7 3.9 3.9" />
        </>
      );
    case "magazine":
      return (
        <>
          <path d="M7.2 4.2h9.6v15.6H7.2zM9.5 7.2h5m-5 3.2h5m-5 3.2h5m-5 3.2h5" />
          <path d="M9.2 2.2h5.6v2H9.2z" />
        </>
      );
    case "melee-heavy":
      return (
        <>
          <path d="m7 3.5 13.5 13.4-3.6 3.6L3.5 7z" />
          <path d="m11 7.5 4.6-4.3 2.7 2.7-4.3 4.6M5.2 13.2 2.8 15.6l5.6 5.6 2.4-2.4" />
        </>
      );
    case "move":
      return (
        <>
          <circle cx="12" cy="12" r="7.6" />
          <circle cx="12" cy="12" r="2.1" />
          <path d="M12 2.2v2.2m0 15.2v2.2M2.2 12h2.2m15.2 0h2.2" />
          <path d="m7 7 1.55 1.55m6.9 6.9L17 17m0-10-1.55 1.55m-6.9 6.9L7 17" />
        </>
      );
    case "prone":
      return (
        <>
          <circle cx="19" cy="13.3" r="2" />
          <path d="M16.8 14.2H9.7l-3.2 2.7H3.2m8.5-2.7 2.1 3.2h4.1m-10.8-3.2-2-3.8-2.4.5M8 19.5h11.7" />
        </>
      );
    case "reload":
      return (
        <>
          <path d="M19.1 8.35A7.55 7.55 0 0 0 5.3 7.1L4 9" />
          <path d="M4 4.8V9h4.2M4.9 15.65A7.55 7.55 0 0 0 18.7 16.9L20 15" />
          <path d="M20 19.2V15h-4.2" />
        </>
      );
    case "swap":
      return (
        <>
          <path d="M4 8h14.5" />
          <path d="m15.4 4.9 3.1 3.1-3.1 3.1" />
          <path d="M20 16H5.5" />
          <path d="m8.6 12.9-3.1 3.1 3.1 3.1" />
        </>
      );
    case "sprint":
      return (
        <>
          <path d="m12.5 5.2 4.8-2.1m-4.8 2.1-2.9 5.1 4.6 2.3 3.5 4.1M10 10.3l-4.5 1.2-2 4.3m8.6-3.2-3.4 5.7H5.1" />
          <path d="m17.3 7.1 4.2 1.3-2.7 3.5" />
        </>
      );
    case "weapon":
      return (
        <>
          <path d="M6.2 4.2v15.6m11.6-15.6v15.6" />
          <path d="M4.3 7.1h3.8m7.8 0h3.8M4.3 16.9h3.8m7.8 0h3.8" />
          <path d="M10.2 7.4v9.2m3.6-9.2v9.2" />
        </>
      );
  }
}

export function HudIcon({
  icon,
  className,
}: {
  icon: HudButtonIconKey;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      aria-hidden="true"
    >
      <HudGlyph icon={icon} />
    </svg>
  );
}

export function HudButton({
  label,
  icon,
  keyboardHint,
  disabled = false,
  held = false,
  cooldownProgress,
  className = "",
  style,
  onPointerMove,
  type = "button",
  ...buttonProps
}: HudButtonProps) {
  const progress = cooldownProgress == null
    ? undefined
    : Math.min(1, Math.max(0, Number.isFinite(cooldownProgress) ? cooldownProgress : 0));

  const buttonStyle = {
    ...style,
    ...(progress === undefined
      ? {}
      : { "--hud-cooldown-angle": `${progress * 360}deg` }),
  } as CSSProperties;

  const classes = ["shafak-hud-button", className].filter(Boolean).join(" ");

  return (
    <button
      {...buttonProps}
      type={type}
      className={classes}
      style={buttonStyle}
      aria-label={label}
      disabled={disabled}
      data-icon={icon}
      data-held={held ? "true" : undefined}
      data-cooldown={progress === undefined ? undefined : "true"}
      onPointerMove={onPointerMove}
    >
      <span className="shafak-hud-button__glyph" aria-hidden="true">
        <HudIcon icon={icon} />
      </span>
      <span className="shafak-hud-button__label">{label}</span>
      <span className="shafak-hud-button__ripple" aria-hidden="true" />
      {keyboardHint && (
        <kbd className="shafak-hud-button__hint" aria-label={`Keyboard: ${keyboardHint}`}>
          {keyboardHint}
        </kbd>
      )}
    </button>
  );
}
