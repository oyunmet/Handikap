import { PLAYER_CHARACTER_MODEL_PATH } from "../shafak/world/player-model";

export const CORE_ASSETS = {
  player: PLAYER_CHARACTER_MODEL_PATH,
  ambientSound: "/shafak-ui-chime.ogg",
} as const;

export type CoreAssetId = keyof typeof CORE_ASSETS;
