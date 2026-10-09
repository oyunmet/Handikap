import type { CharacterAnimationState } from "./character-animation";
import { KNIGHT_CONFIG } from "./knight-config";
import type { OpponentModelAnimationState } from "./opponent-model-config";

export type ModelAnimationState = CharacterAnimationState | OpponentModelAnimationState;
type AnimationClipMap = Partial<Record<ModelAnimationState, readonly string[]>>;

function normalizeClipName(name: string) {
  return name.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
}

export function resolveGlbClipName(
  state: ModelAnimationState,
  availableNames: string[],
  animationClips: AnimationClipMap = KNIGHT_CONFIG.animationClips,
): string | null {
  const candidates = animationClips[state] ?? [];
  const byNormalizedName = new Map(availableNames.map((name) => [normalizeClipName(name), name]));
  for (const candidate of candidates) {
    const exact = byNormalizedName.get(normalizeClipName(candidate));
    if (exact) return exact;
  }
  if (state === "walk") return resolveGlbClipName("idle", availableNames, animationClips);
  if (state === "run") return resolveGlbClipName("walk", availableNames, animationClips)
    ?? resolveGlbClipName("idle", availableNames, animationClips);
  return null;
}
