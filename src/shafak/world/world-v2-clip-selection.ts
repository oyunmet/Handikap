import type { AnimationClip } from "three";
import type { CharacterAnimationState } from "./character-animation";

type ClipAliases = Readonly<Partial<Record<string, readonly string[]>>>;

function clipToken(clip: AnimationClip) {
  return clip.name.split("|").at(-1)?.trim().toLowerCase() ?? clip.name.toLowerCase();
}

function findIdleClip(animations: readonly AnimationClip[]) {
  return animations.find((clip) => /^idle(?:_|$)/i.test(clipToken(clip))) ?? null;
}

export function resolveWorldActorClip(
  animations: readonly AnimationClip[],
  state: CharacterAnimationState,
  aliases?: ClipAliases,
  fallbackAliases?: ClipAliases,
): AnimationClip | null {
  const configuredAliases = aliases?.[state] ?? fallbackAliases?.[state] ?? [];
  const normalizedAliases = configuredAliases.map((name) => name.toLowerCase());
  const configuredClip = animations.find((clip) =>
    normalizedAliases.includes(clip.name.toLowerCase()));
  if (configuredClip) return configuredClip;

  const normalizedState = state.toLowerCase();
  const matchingState = animations.find((clip) => {
    const token = clipToken(clip);
    return token === normalizedState || token.startsWith(`${normalizedState}_`);
  });
  if (matchingState) return matchingState;

  return findIdleClip(animations);
}
