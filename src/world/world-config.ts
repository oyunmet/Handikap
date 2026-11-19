import { GAME_RUNTIME_DEFAULTS } from "../core/game-runtime";

export const WORLD_RUNTIME_DEFAULTS = {
  ...GAME_RUNTIME_DEFAULTS,
  cameraFollowSmoothing: 9,
} as const;
