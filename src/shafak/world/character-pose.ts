import * as THREE from "three";
import type { CharacterAnimationState } from "./character-animation";

export type CharacterPoseBoneName =
  | "hips"
  | "spine"
  | "chest"
  | "head"
  | "leftUpperArm"
  | "leftForearm"
  | "rightUpperArm"
  | "rightForearm"
  | "leftThigh"
  | "leftShin"
  | "leftFoot"
  | "rightThigh"
  | "rightShin"
  | "rightFoot";

export type CharacterPoseBones = Partial<Record<CharacterPoseBoneName, THREE.Bone>>;

const BONE_ALIASES: Record<CharacterPoseBoneName, readonly string[]> = {
  hips: ["Rig_Hips", "Hips", "DEF-hips"],
  spine: ["Rig_Spine", "Spine", "Spine1", "DEF-spine.001", "Abdomen"],
  chest: ["Rig_Chest", "Spine2", "Torso", "DEF-spine.003"],
  head: ["Rig_Head", "Head", "DEF-head"],
  leftUpperArm: ["Rig_LeftUpperArm", "UpperArm.L", "LeftArm", "UpperArmL", "DEF-upper_arm.L"],
  leftForearm: ["Rig_LeftForearm", "LowerArm.L", "LeftForeArm", "LowerArmL", "DEF-forearm.L"],
  rightUpperArm: ["Rig_RightUpperArm", "UpperArm.R", "RightArm", "UpperArmR", "DEF-upper_arm.R"],
  rightForearm: ["Rig_RightForearm", "LowerArm.R", "RightForeArm", "LowerArmR", "DEF-forearm.R"],
  leftThigh: ["Rig_LeftThigh", "UpperLeg.L", "LeftUpLeg", "UpperLegL", "DEF-thigh.L"],
  leftShin: ["Rig_LeftShin", "LowerLeg.L", "LeftLeg", "LowerLegL", "DEF-shin.L"],
  leftFoot: ["Rig_LeftFoot", "Foot.L", "LeftFoot", "FootL", "DEF-foot.L"],
  rightThigh: ["Rig_RightThigh", "UpperLeg.R", "RightUpLeg", "UpperLegR", "DEF-thigh.R"],
  rightShin: ["Rig_RightShin", "LowerLeg.R", "RightLeg", "LowerLegR", "DEF-shin.R"],
  rightFoot: ["Rig_RightFoot", "Foot.R", "RightFoot", "FootR", "DEF-foot.R"],
};

const normalizeBoneName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
const clamp01 = (value: number) => THREE.MathUtils.clamp(value, 0, 1);

export function findCharacterPoseBones(model: THREE.Object3D): CharacterPoseBones {
  const byName = new Map<string, THREE.Bone>();
  model.traverse((object) => {
    if ((object as THREE.Bone).isBone) byName.set(normalizeBoneName(object.name), object as THREE.Bone);
  });
  const result: CharacterPoseBones = {};
  for (const [poseName, aliases] of Object.entries(BONE_ALIASES) as [CharacterPoseBoneName, readonly string[]][]) {
    const bone = aliases.map((alias) => byName.get(normalizeBoneName(alias))).find(Boolean);
    if (bone) result[poseName] = bone;
  }
  return result;
}

/**
 * Adds a lightweight articulated pose when a character GLB has no matching
 * clip, and bends the rig for crouching without scaling the entire body.
 */
export function poseCharacterWithoutClip(
  bones: CharacterPoseBones,
  state: CharacterAnimationState,
  speed: number,
  phase: number,
  actionProgress: number,
  crouching: boolean,
  motionReduced: boolean,
  time: number,
  hasClip: boolean,
) {
  const motionScale = motionReduced ? 0.34 : 1;
  const walkWeight = clamp01(speed / 3.2);
  const runWeight = clamp01((speed - 3.2) / 2.6);
  const action = Math.sin(clamp01(actionProgress) * Math.PI);
  const rotate = (name: CharacterPoseBoneName, x: number, y = 0, z = 0, add = false) => {
    const bone = bones[name];
    if (!bone) return;
    if (add) bone.rotation.set(bone.rotation.x + x, bone.rotation.y + y, bone.rotation.z + z);
    else bone.rotation.set(x, y, z);
  };

  if (!hasClip) {
    const swing = Math.sin(phase) * walkWeight * THREE.MathUtils.lerp(0.42, 0.64, runWeight) * motionScale;
    const leftLift = Math.max(0, Math.sin(phase + Math.PI / 2)) * walkWeight * motionScale;
    const rightLift = Math.max(0, Math.sin(phase - Math.PI / 2)) * walkWeight * motionScale;
    rotate("leftThigh", -swing);
    rotate("rightThigh", swing);
    rotate("leftShin", leftLift * 0.46);
    rotate("rightShin", rightLift * 0.46);
    rotate("leftFoot", -leftLift * 0.28);
    rotate("rightFoot", -rightLift * 0.28);
    rotate("leftUpperArm", swing * 0.58);
    rotate("rightUpperArm", -swing * 0.58);
    rotate("leftForearm", -leftLift * 0.16);
    rotate("rightForearm", -rightLift * 0.16);
    rotate("spine", Math.sin(time * 1.35) * 0.012 * motionScale);
    rotate("chest", Math.sin(time * 1.35) * 0.014 * motionScale, 0, 0);
    rotate("head", -Math.sin(time * 1.35) * 0.006 * motionScale);
  }

  if (crouching) {
    const crouch = motionScale;
    rotate("leftThigh", 0.48 * crouch, 0, 0, hasClip);
    rotate("rightThigh", 0.48 * crouch, 0, 0, hasClip);
    rotate("leftShin", -0.78 * crouch, 0, 0, hasClip);
    rotate("rightShin", -0.78 * crouch, 0, 0, hasClip);
    rotate("chest", 0.13 * crouch, 0, 0, hasClip);
  }

  if (state === "jump") {
    rotate("leftThigh", -0.42 * motionScale, 0, 0, hasClip);
    rotate("rightThigh", -0.22 * motionScale, 0, 0, hasClip);
    rotate("leftShin", 0.28 * motionScale, 0, 0, hasClip);
    rotate("rightShin", 0.36 * motionScale, 0, 0, hasClip);
    rotate("leftUpperArm", -0.62 * motionScale, 0, -0.2 * motionScale, hasClip);
    rotate("rightUpperArm", -0.62 * motionScale, 0, 0.2 * motionScale, hasClip);
  } else if (state === "block") {
    rotate("leftUpperArm", -0.7 * motionScale, 0, -0.24 * motionScale, hasClip);
    rotate("rightUpperArm", -0.76 * motionScale, 0, 0.24 * motionScale, hasClip);
    rotate("leftForearm", -0.42 * motionScale, 0, 0, hasClip);
    rotate("rightForearm", -0.48 * motionScale, 0, 0, hasClip);
  } else if (!hasClip && (state === "attack" || state === "heavyAttack" || state === "plunge")) {
    const power = state === "heavyAttack" || state === "plunge" ? 1.05 : 0.78;
    rotate("rightUpperArm", -0.42 - action * power, 0, -0.24 + action * 0.32);
    rotate("rightForearm", -action * 0.62);
    rotate("chest", 0, action * 0.12, 0);
  } else if (!hasClip && state === "hit") {
    rotate("leftUpperArm", 0, 0, 0.24 * action);
    rotate("rightUpperArm", 0, 0, -0.24 * action);
    rotate("chest", 0, 0, 0.1 * action);
  } else if (!hasClip && (state === "dodge" || state === "backflip")) {
    rotate("leftUpperArm", 0, 0, 0.48 * action);
    rotate("rightUpperArm", 0, 0, -0.48 * action);
    rotate("leftThigh", -0.2 * action, 0, 0);
    rotate("rightThigh", 0.2 * action, 0, 0);
  } else if (!hasClip && state === "die") {
    rotate("leftUpperArm", 0, 0, 0.32 * actionProgress);
    rotate("rightUpperArm", 0, 0, -0.32 * actionProgress);
    rotate("chest", 0.18 * actionProgress);
  }
}
