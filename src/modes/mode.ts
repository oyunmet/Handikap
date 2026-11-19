export const GAME_MODES = ["hub", "expedition", "arena", "defense"] as const;

export type GameMode = (typeof GAME_MODES)[number];

export type GameSceneId =
  | "hub"
  | "campaign"
  | "war-room"
  | "equipment-preview"
  | "character-preview";

export function modeFromLegacyScreen(screen: string): GameMode {
  if (screen === "world") return "expedition";
  if (screen === "war-room") return "arena";
  return "hub";
}
