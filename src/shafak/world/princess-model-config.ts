import { PLAYER_CHARACTER_MODEL_PATH } from "./player-model.ts";

export const PRINCESS_BASE_MODEL_URL = PLAYER_CHARACTER_MODEL_PATH;

export type PrincessAnimationMood = "idle" | "walk" | "wave" | "talk";
export type PrincessCameraFrame = {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
};

export function getPrincessCameraFrame(viewportWidth: number, viewportHeight: number): PrincessCameraFrame {
  const landscape = viewportWidth > viewportHeight;
  return landscape
    ? { position: [0, 1.02, 2.8], target: [0, 0.92, 0], fov: 36 }
    : { position: [0, 1.02, 3.1], target: [0, 0.92, 0], fov: 34 };
}

const PRINCESS_ANIMATION_ALIASES: Record<PrincessAnimationMood, readonly string[]> = {
  idle: ["princessidle", "idle", "stand", "wait", "breath", "rest"],
  walk: ["princesswalk", "walk", "walking", "run"],
  wave: ["princesswave", "wave", "greet", "greeting", "hello"],
  talk: ["princesstalk", "talk", "talking", "speak", "speaking", "dialogue"],
};

function normalizeClipName(value: string) {
  return value.toLocaleLowerCase("en-US").replace(/[^a-z0-9]/g, "");
}

export function resolvePrincessAnimationName(
  availableNames: readonly string[],
  mood: PrincessAnimationMood,
) {
  const aliases = PRINCESS_ANIMATION_ALIASES[mood];
  const preferred = mood === "wave"
    ? [...aliases, ...PRINCESS_ANIMATION_ALIASES.talk]
    : mood === "talk"
      ? [...aliases, ...PRINCESS_ANIMATION_ALIASES.wave]
      : aliases;

  for (const alias of preferred) {
    const normalizedAlias = normalizeClipName(alias);
    const match = availableNames.find((name) => normalizeClipName(name).includes(normalizedAlias));
    if (match) return match;
  }
  return undefined;
}
