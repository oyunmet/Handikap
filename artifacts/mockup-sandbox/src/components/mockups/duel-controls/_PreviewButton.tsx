import GameButton, { type GameButtonIcon } from "./extracted/GameButton";

type PreviewButtonProps = {
  label: string;
  icon: GameButtonIcon;
  tone: "copper" | "teal" | "sky";
  className?: string;
  cooldownPercent?: number;
};

export function PreviewButton({
  label,
  icon,
  tone,
  className = "",
  cooldownPercent = 0,
}: PreviewButtonProps) {
  return (
    <GameButton
      type="button"
      aria-label={label}
      className={`duel-control ${className}`}
      label={label}
      icon={icon}
      tone={tone}
      faceSize={66}
      hitAreaSize={76}
      cooldownPercent={cooldownPercent}
    />
  );
}
