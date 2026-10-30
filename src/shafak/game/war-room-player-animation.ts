export type WarRoomPlayerAnimationState =
  | "idle"
  | "walk"
  | "run"
  | "crouch"
  | "jump"
  | "attack"
  | "hit"
  | "death";

export type WarRoomPlayerAnimationInput = {
  hp: number;
  damageAge: number;
  shotFeedbackUntil: number;
  meleeUntil: number;
  clockTime: number;
  jumpHeight: number;
  crouched: boolean;
  prone: boolean;
  movement: number;
  sprinting: boolean;
  turnDirection?: "left" | "right" | null;
};

export function resolveWarRoomPlayerAnimationState({
  hp,
  damageAge,
  shotFeedbackUntil,
  meleeUntil,
  clockTime,
  jumpHeight,
  crouched,
  prone,
  movement,
  sprinting,
  turnDirection,
}: WarRoomPlayerAnimationInput): WarRoomPlayerAnimationState {
  if (hp <= 0) return "death";
  if (damageAge >= 0 && damageAge < 0.2) return "hit";
  if (shotFeedbackUntil > clockTime || meleeUntil > clockTime) return "attack";
  if (jumpHeight > 0.12) return "jump";
  if (turnDirection) return turnDirection === "left" ? "turn-left" : "turn-right";
  if (crouched || prone) return "crouch";
  if (movement <= 0.12) return "idle";
  return sprinting || movement >= 0.7 ? "run" : "walk";
}

export function getWarRoomPlayerAnimationPlaybackScale(
  state: WarRoomPlayerAnimationState,
  direction: "forward" | "backward" | "left" | "right" | "idle",
  movementSpeed: number,
) {
  if (state !== "walk" && state !== "run" && state !== "crouch") return 1;
  if (direction === "idle") return 1;

  const baseSpeed = state === "run" ? 8.2 : state === "crouch" ? 3.05 : 6.1;
  const facingScale = direction === "backward" ? -1
    : direction === "left" || direction === "right" ? 0.78
      : 1;
  const speed = Number.isFinite(movementSpeed) ? Math.max(0, movementSpeed) : 0;
  return Math.max(-1.5, Math.min(1.5, speed / baseSpeed * facingScale));
}
