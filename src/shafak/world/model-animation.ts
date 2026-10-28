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

export function createUprightLocomotionClip(clip: THREE.AnimationClip): THREE.AnimationClip {
  const uprightClip = clip.clone();
  const neutralTrackEnd = Math.max(uprightClip.duration, 1 / 60);
  const rotation = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const uprightBones = new Set(["body", "hips", "abdomen", "torso", "neck", "head"]);
  const animatedBones = new Set<string>();

  for (let trackIndex = 0; trackIndex < uprightClip.tracks.length; trackIndex += 1) {
    const track = uprightClip.tracks[trackIndex];
    const pathSegments = track.name.split(/[.[\]]+/).filter(Boolean);
    const boneName = pathSegments.at(-2)?.toLocaleLowerCase();
    if (
      pathSegments.at(-1)?.toLocaleLowerCase() !== "quaternion"
      || !boneName
      || !uprightBones.has(boneName)
    ) continue;

    animatedBones.add(boneName);
    const angles: THREE.Euler[] = [];
    const angleSines = [0, 0, 0];
    const angleCosines = [0, 0, 0];
    for (let offset = 0; offset + 3 < track.values.length; offset += 4) {
      rotation.fromArray(track.values, offset);
      euler.setFromQuaternion(rotation, "XYZ");
      const anglesAtKey = euler.clone();
      angles.push(anglesAtKey);
      [anglesAtKey.x, anglesAtKey.y, anglesAtKey.z].forEach((angle, axis) => {
        angleSines[axis] += Math.sin(angle);
        angleCosines[axis] += Math.cos(angle);
      });
    }

    const averageAngles = angleSines.map((sine, axis) =>
      Math.atan2(sine, angleCosines[axis]));
    angles.forEach((anglesAtKey, index) => {
      euler.set(
        Math.atan2(Math.sin(anglesAtKey.x - averageAngles[0]), Math.cos(anglesAtKey.x - averageAngles[0])),
        Math.atan2(Math.sin(anglesAtKey.y - averageAngles[1]), Math.cos(anglesAtKey.y - averageAngles[1])),
        Math.atan2(Math.sin(anglesAtKey.z - averageAngles[2]), Math.cos(anglesAtKey.z - averageAngles[2])),
      );
      rotation.setFromEuler(euler).toArray(track.values, index * 4);
    });

    // A one-key track only overrides the source pose at time zero. Keep a
    // neutralized bind-pose rotation active after the mixer restores its
    // baseline on subsequent frames.
    if (track.times.length === 1) {
      const value = [...track.values.slice(0, 4)];
      uprightClip.tracks[trackIndex] = new THREE.QuaternionKeyframeTrack(
        track.name,
        [0, neutralTrackEnd],
        [...value, ...value],
      );
    }
  }

  // The source GLB bakes a forward tilt into several unanimated spine bones,
  // especially Hips. Give those bones neutral locomotion tracks so that the
  // bind-pose lean cannot survive when a clip omits their rotation channels.
  for (const boneName of uprightBones) {
    if (animatedBones.has(boneName)) continue;
    const trackBoneName = boneName[0].toLocaleUpperCase() + boneName.slice(1);
    uprightClip.tracks.push(new THREE.QuaternionKeyframeTrack(
      `${trackBoneName}.quaternion`,
      [0, neutralTrackEnd],
      [0, 0, 0, 1, 0, 0, 0, 1],
    ));
  }

  return uprightClip;
}

export function createPlayerLocomotionClip(clip: THREE.AnimationClip): THREE.AnimationClip {
  const baseName = clip.name.toLocaleLowerCase().split("|").at(-1);
  return baseName === "idle" || baseName === "run" || baseName === "walk"
    ? createUprightLocomotionClip(clip)
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
