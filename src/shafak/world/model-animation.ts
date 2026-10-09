import type { CharacterAnimationState } from "./character-animation";
import { KNIGHT_CONFIG } from "./knight-config";

function normalizeClipName(name: string) {
  return name.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
}

export function resolveGlbClipName(
  state: CharacterAnimationState,
  availableNames: string[],
): string | null {
  const candidates = KNIGHT_CONFIG.animationClips[state];
  const byNormalizedName = new Map(availableNames.map((name) => [normalizeClipName(name), name]));
  for (const candidate of candidates) {
    const exact = byNormalizedName.get(normalizeClipName(candidate));
    if (exact) return exact;
  }
  if (state === "walk") return resolveGlbClipName("idle", availableNames);
  if (state === "run") {
    return resolveGlbClipName("walk", availableNames) ?? resolveGlbClipName("idle", availableNames);
  }
  return null;
}
