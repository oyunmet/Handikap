import { PLAYER_CHARACTER_MODEL_PATH } from "./player-model.ts";

export const PRINCESS_BASE_MODEL_URL = PLAYER_CHARACTER_MODEL_PATH;

export type PrincessAnimationMood = "idle" | "walk" | "wave" | "talk";
export const PRINCESS_ENDING_MOOD_TIMELINE = [
  { mood: "walk", atMs: 0 },
  { mood: "wave", atMs: 1_100 },
  { mood: "talk", atMs: 2_800 },
] as const satisfies readonly { mood: PrincessAnimationMood; atMs: number }[];

export type PrincessCameraFrame = {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
};

export type PrincessHorizontalPoint = {
  x: number;
  z: number;
};

export function getPrincessCameraFrame(viewportWidth: number, viewportHeight: number): PrincessCameraFrame {
  const landscape = viewportWidth > viewportHeight;
  return landscape
    ? { position: [0, 1.08, 3.05], target: [0, 1, 0], fov: 36 }
    : { position: [0, 1.08, 3.25], target: [0, 1, 0], fov: 34 };
}

export function getPrincessFacingYaw(
  modelPosition: PrincessHorizontalPoint,
  cameraPosition: PrincessHorizontalPoint,
) {
  return Math.atan2(
    cameraPosition.x - modelPosition.x,
    cameraPosition.z - modelPosition.z,
  );
}

export function resolvePrincessEndingMood(elapsedMs: number): PrincessAnimationMood {
  let mood: PrincessAnimationMood = "walk";
  for (const step of PRINCESS_ENDING_MOOD_TIMELINE) {
    if (elapsedMs < step.atMs) break;
    mood = step.mood;
  }
  return mood;
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
