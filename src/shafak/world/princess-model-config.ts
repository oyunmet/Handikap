export const PRINCESS_MODEL_URL = "/models/princess.glb";
export const PRINCESS_MODEL_MAX_BYTES = 3 * 1024 * 1024;

export type PrincessAnimationMood = "idle" | "walk" | "wave" | "talk";

const PRINCESS_ANIMATION_ALIASES: Record<PrincessAnimationMood, readonly string[]> = {
  idle: ["idle", "stand", "wait", "breath", "rest"],
  walk: ["walk", "walking", "run"],
  wave: ["wave", "greet", "greeting", "hello"],
  talk: ["talk", "talking", "speak", "speaking", "dialogue"],
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

export function isPrincessModelResponseUsable(
  status: number,
  contentType: string | null,
  contentLength: string | null,
) {
  if (status < 200 || status >= 300 || contentType?.toLowerCase().includes("text/html")) return false;
  if (contentLength === null) return true;
  const size = Number(contentLength);
  return Number.isFinite(size) && size > 0 && size <= PRINCESS_MODEL_MAX_BYTES;
}
