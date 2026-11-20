export const GAME_MODES = ["hub", "expedition", "arena", "defense"] as const;

export type GameMode = (typeof GAME_MODES)[number];
export type WarRoomMissionMode = "raid" | "survival" | "treasure" | "defense" | "daily";
export type WarRoomGameMode = Extract<GameMode, "arena" | "defense">;

export type GameSceneId =
  | "hub"
  | "campaign"
  | "war-room"
  | "equipment-preview"
  | "character-preview";

export function gameModeForWarRoomMission(mode: WarRoomMissionMode): WarRoomGameMode {
  return mode === "survival" || mode === "defense" ? "defense" : "arena";
}

export function modeFromLegacyScreen(
  screen: string,
  warRoomMode: WarRoomGameMode = "arena",
): GameMode {
  if (screen === "world") return "expedition";
  if (screen === "war-room") return warRoomMode;
  return "hub";
}
