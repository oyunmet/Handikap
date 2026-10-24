import * as THREE from "three";
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
  if (state === "backflip" || state === "jump") return "dodge";
  if (state === "plunge") return "attack";
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

export function createUprightTorsoClip(clip: THREE.AnimationClip): THREE.AnimationClip {
  const uprightClip = clip.clone();
  const rotation = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const directionalBones = new Set(["body", "abdomen", "torso", "neck", "head"]);

  for (const track of uprightClip.tracks) {
    const pathSegments = track.name.split(/[.[\]]+/).filter(Boolean);
    if (
      pathSegments.at(-1)?.toLocaleLowerCase() !== "quaternion"
      || !directionalBones.has(pathSegments.at(-2)?.toLocaleLowerCase() ?? "")
    ) continue;

    for (let offset = 0; offset + 3 < track.values.length; offset += 4) {
      rotation.fromArray(track.values, offset);
      euler.setFromQuaternion(rotation, "XYZ");
      euler.y = 0;
      euler.z = 0;
      rotation.setFromEuler(euler).toArray(track.values, offset);
    }
  }

  return uprightClip;
}

export function createPlayerLocomotionClip(clip: THREE.AnimationClip): THREE.AnimationClip {
  const baseName = clip.name.toLocaleLowerCase().split("|").at(-1);
  return baseName === "run" || baseName === "walk"
    ? createUprightTorsoClip(clip)
    : clip;
}

export function prepareWorldActorClips(
  modelPath: string,
  clips: THREE.AnimationClip[],
): THREE.AnimationClip[] {
  return modelPath === KNIGHT_CONFIG.modelPath
    ? clips.map(createPlayerLocomotionClip)
    : clips;
}

function normalizeClipName(name: string) {
  return name.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
}

export function resolveGlbClipName(
  state: ModelAnimationState,
  availableNames: string[],
  animationClips: AnimationClipMap = KNIGHT_CONFIG.animationClips,
): string | null {
  const mapped = resolveMappedGlbClipName(state, availableNames, animationClips);
  if (mapped) return mapped;
  if (state === "walk") return resolveGlbClipName("idle", availableNames, animationClips);
  if (state === "run") return resolveGlbClipName("walk", availableNames, animationClips)
    ?? resolveGlbClipName("idle", availableNames, animationClips);
  if (state !== "idle") return resolveGlbClipName("idle", availableNames, animationClips);
  return null;
}

export function resolveMappedGlbClipName(
  state: ModelAnimationState,
  availableNames: string[],
  animationClips: AnimationClipMap,
): string | null {
  const candidates = animationClips[state] ?? [];
  const byNormalizedName = new Map(availableNames.map((name) => [normalizeClipName(name), name]));
  for (const candidate of candidates) {
    const exact = byNormalizedName.get(normalizeClipName(candidate));
    if (exact) return exact;
  }
  return null;
}
