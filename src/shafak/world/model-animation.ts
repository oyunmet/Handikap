import type { CharacterAnimationState } from "./character-animation";
import type { CombatAction } from "../game/combat-engine";
import { KNIGHT_CONFIG } from "./knight-config";
import type { OpponentModelAnimationState } from "./opponent-model-config";

export type ModelAnimationState = CharacterAnimationState | OpponentModelAnimationState;
type AnimationClipMap = Partial<Record<ModelAnimationState, readonly string[]>>;
export type OpponentAnimationPlayback = "loop" | "returnToIdle" | "holdLastFrame";

export function mapOpponentAnimationState(
  state: CharacterAnimationState,
  action?: CombatAction,
): OpponentModelAnimationState {
  if (action === "skillOne") return "castFire";
  if (action === "skillTwo") return "castLightning";
  if (state === "walk") return "walk";
  if (state === "run") return "run";
  if (state === "heavyAttack") return "attack";
  if (state === "die") return "death";
  return state;
}

export function getOpponentAnimationPlayback(state: ModelAnimationState): OpponentAnimationPlayback {
  if (state === "idle" || state === "walk" || state === "run") return "loop";
  if (state === "block" || state === "die" || state === "death" || state === "victory") return "holdLastFrame";
  return "returnToIdle";
}

export function isRootTranslationTrack(trackName: string, rootBoneName: string): boolean {
  const pathSegments = trackName.split(/[.[\]]+/).filter(Boolean);
  return pathSegments.at(-1)?.toLocaleLowerCase() === "position"
    && pathSegments.at(-2)?.toLocaleLowerCase() === rootBoneName.toLocaleLowerCase();
}

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
