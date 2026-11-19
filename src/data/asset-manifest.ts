export const CORE_ASSETS = {
  player: "/models/player-hero.glb",
  ambientSound: "/shafak-ui-chime.ogg",
} as const;

export type CoreAssetId = keyof typeof CORE_ASSETS;
