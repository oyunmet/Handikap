import { FANTASY_KNIGHT_MODEL_PATH } from "../shafak/world/fantasy-knight-model";

export const CORE_ASSETS = {
  player: FANTASY_KNIGHT_MODEL_PATH,
  ambientSound: "/shafak-ui-chime.ogg",
} as const;

export type CoreAssetId = keyof typeof CORE_ASSETS;
