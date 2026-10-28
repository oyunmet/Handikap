import * as THREE from "three";
import type { CharacterAnimationState } from "./character-animation";
import type { WorldMovementState } from "./world-movement-machine";

export type CharacterPoseBoneName =
  | "hips"
  | "pelvis"
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
  pelvis: ["Body", "Pelvis", "Rig_Body"],
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
const POSE_LIMITS: Record<CharacterPoseBoneName, number> = {
  hips: 0.62,
  pelvis: 0.62,
  spine: 0.52,
  chest: 0.52,
  head: 0.48,
  leftUpperArm: 1.18,
  leftForearm: 1.24,
  rightUpperArm: 1.18,
  rightForearm: 1.24,
  leftThigh: 1.08,
  leftShin: 1.28,
  leftFoot: 0.76,
  rightThigh: 1.08,
  rightShin: 1.28,
  rightFoot: 0.76,
};

const worldPosePosition = new THREE.Vector3();
export const WORLD_CROUCH_PELVIS_DROP_METERS = 0.22;
export const WORLD_SLIDE_PELVIS_DROP_METERS = 0.14;

export type CharacterPoseBaseline = ReadonlyMap<
  CharacterPoseBoneName,
  { rotation: THREE.Euler; position: THREE.Vector3 }
>;
export type CharacterPoseAngles = Partial<Record<CharacterPoseBoneName, readonly [number, number, number]>>;

export function captureCharacterPoseBaseline(bones: CharacterPoseBones): CharacterPoseBaseline {
  return new Map(
    Object.entries(bones)
      .filter((entry): entry is [CharacterPoseBoneName, THREE.Bone] => Boolean(entry[1]))
      .map(([name, bone]) => [name, { rotation: bone.rotation.clone(), position: bone.position.clone() }]),
  );
}

export function restoreCharacterPoseBaseline(
  bones: CharacterPoseBones,
  baseline: CharacterPoseBaseline,
) {
  for (const [name, transform] of baseline) {
    const bone = bones[name];
    if (!bone) continue;
    bone.rotation.copy(transform.rotation);
    bone.position.copy(transform.position);
  }
}

export function getWorldLocomotionPoseAngles(
  state: WorldMovementState,
  phase: number,
  animationState: CharacterAnimationState = "run",
): CharacterPoseAngles {
  const pose: CharacterPoseAngles = {};
  const set = (name: CharacterPoseBoneName, x: number, y = 0, z = 0) => {
    const limit = POSE_LIMITS[name];
    pose[name] = [
      THREE.MathUtils.clamp(x, -limit, limit),
      THREE.MathUtils.clamp(y, -limit, limit),
      THREE.MathUtils.clamp(z, -limit, limit),
    ];
  };
  const gait = Math.sin(phase);
  const liftLeft = Math.max(0, Math.sin(phase + Math.PI / 2));
  const liftRight = Math.max(0, Math.sin(phase - Math.PI / 2));

  if (state === "KOŞUYOR" || state === "SPRINT") {
    const lean = state === "SPRINT"
      ? THREE.MathUtils.degToRad(20)
      : animationState === "walk" ? 0 : THREE.MathUtils.degToRad(12);
    set("spine", lean * 0.45);
    set("chest", lean * 0.55);
    if (state === "SPRINT") set("head", -0.025);
  } else if (state === "ZIPLAMA_HAZIRLIK") {
    set("leftThigh", 0.25); set("rightThigh", 0.25);
    set("leftShin", -0.42); set("rightShin", -0.42);
    set("leftFoot", 0.14); set("rightFoot", 0.14);
    set("spine", 0.05); set("chest", 0.08); set("head", -0.13);
    set("leftUpperArm", -0.12); set("rightUpperArm", -0.12);
    set("leftForearm", -0.18); set("rightForearm", -0.18);
  } else if (state === "HAVADA_YUKARI") {
    set("leftThigh", -0.3); set("rightThigh", -0.24);
    set("leftShin", 0.32); set("rightShin", 0.36);
    set("leftUpperArm", -0.78, 0, -0.17); set("rightUpperArm", -0.78, 0, 0.17);
    set("leftForearm", -0.12); set("rightForearm", -0.12);
    set("chest", -0.07); set("head", 0.04);
  } else if (state === "HAVADA_AŞAĞI") {
    set("leftThigh", -0.24); set("rightThigh", -0.2);
    set("leftShin", 0.28); set("rightShin", 0.3);
    set("leftUpperArm", -0.92, 0, -0.1); set("rightUpperArm", -0.92, 0, 0.1);
    set("leftForearm", -0.16); set("rightForearm", -0.16);
    set("chest", -0.035); set("head", 0.02);
  } else if (state === "İNİŞ") {
    set("leftThigh", 0.36); set("rightThigh", 0.36);
    set("leftShin", -0.6); set("rightShin", -0.6);
    set("leftFoot", 0.2); set("rightFoot", 0.2);
    set("spine", 0.06); set("chest", 0.11); set("head", -0.17);
    set("leftUpperArm", -0.24); set("rightUpperArm", -0.24);
    set("leftForearm", -0.38); set("rightForearm", -0.38);
  } else if (state === "EĞİLİYOR") {
    set("hips", 0.2);
    set("leftThigh", -0.8); set("rightThigh", -0.8);
    set("leftShin", 1.28); set("rightShin", 1.28);
    set("leftFoot", -0.55); set("rightFoot", -0.55);
    set("spine", 0.3); set("chest", 0.15); set("head", -0.25);
    set("leftUpperArm", -0.23, 0, -0.07); set("rightUpperArm", -0.23, 0, 0.07);
    set("leftForearm", -0.34); set("rightForearm", -0.34);
  } else if (state === "KAYIYOR") {
    set("leftThigh", 0.42); set("rightThigh", 0.12);
    set("leftShin", -0.24); set("rightShin", -0.56);
    set("leftFoot", 0.12); set("rightFoot", 0.18);
    set("spine", -0.055); set("chest", -0.1); set("head", 0.15);
    set("leftUpperArm", -0.18, 0, -0.12); set("rightUpperArm", -0.18, 0, 0.12);
    set("leftForearm", -0.28); set("rightForearm", -0.28);
  }

  if ((state === "KOŞUYOR" && animationState !== "walk") || state === "SPRINT") {
    set("leftThigh", -gait * 0.5); set("rightThigh", gait * 0.5);
    set("leftShin", liftLeft * 0.28); set("rightShin", liftRight * 0.28);
    set("leftUpperArm", gait * 0.32); set("rightUpperArm", -gait * 0.32);
  }
  return pose;
}

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
  aiming = false,
  locomotion?: {
    movementState: WorldMovementState;
    jumpHeight?: number;
    jumpVelocity?: number;
  },
  baseline?: CharacterPoseBaseline,
) {
  const motionScale = motionReduced ? 0.34 : 1;
  const walkWeight = clamp01(speed / 3.2);
  const runWeight = clamp01((speed - 3.2) / 2.6);
  const action = Math.sin(clamp01(actionProgress) * Math.PI);
  const rotate = (name: CharacterPoseBoneName, x: number, y = 0, z = 0, add = false) => {
    const bone = bones[name];
    if (!bone) return;
    const limit = POSE_LIMITS[name];
    const offsetX = THREE.MathUtils.clamp(x, -limit, limit);
    const offsetY = THREE.MathUtils.clamp(y, -limit, limit);
    const offsetZ = THREE.MathUtils.clamp(z, -limit, limit);
    const baselineRotation = baseline?.get(name)?.rotation;
    bone.rotation.set(
      add ? bone.rotation.x + offsetX : (baselineRotation?.x ?? 0) + offsetX,
      add ? bone.rotation.y + offsetY : (baselineRotation?.y ?? 0) + offsetY,
      add ? bone.rotation.z + offsetZ : (baselineRotation?.z ?? 0) + offsetZ,
    );
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

  const applyLocomotionPose = (movementState: WorldMovementState) => {
    const add = hasClip;
    if (movementState === "KOŞUYOR" || movementState === "SPRINT") {
      const lean = movementState === "SPRINT"
        ? THREE.MathUtils.degToRad(20)
        : state === "walk" ? 0 : THREE.MathUtils.degToRad(12);
      const scaledLean = lean * motionScale;
      rotate("spine", scaledLean * 0.45, 0, 0, add);
      rotate("chest", scaledLean * 0.55, 0, 0, add);
      if (movementState === "SPRINT") rotate("head", -0.025 * motionScale, 0, 0, add);
    } else if (movementState === "ZIPLAMA_HAZIRLIK") {
      rotate("leftThigh", 0.25 * motionScale, 0, 0, add);
      rotate("rightThigh", 0.25 * motionScale, 0, 0, add);
      rotate("leftShin", -0.42 * motionScale, 0, 0, add);
      rotate("rightShin", -0.42 * motionScale, 0, 0, add);
      rotate("leftFoot", 0.14 * motionScale, 0, 0, add);
      rotate("rightFoot", 0.14 * motionScale, 0, 0, add);
      rotate("spine", 0.05 * motionScale, 0, 0, add);
      rotate("chest", 0.08 * motionScale, 0, 0, add);
      rotate("head", -0.13 * motionScale, 0, 0, add);
      rotate("leftUpperArm", -0.12 * motionScale, 0, 0, add);
      rotate("rightUpperArm", -0.12 * motionScale, 0, 0, add);
      rotate("leftForearm", -0.18 * motionScale, 0, 0, add);
      rotate("rightForearm", -0.18 * motionScale, 0, 0, add);
    } else if (movementState === "HAVADA_YUKARI" || movementState === "HAVADA_AŞAĞI") {
      const falling = movementState === "HAVADA_AŞAĞI";
      rotate("leftThigh", (falling ? -0.24 : -0.3) * motionScale, 0, 0, add);
      rotate("rightThigh", (falling ? -0.2 : -0.24) * motionScale, 0, 0, add);
      rotate("leftShin", (falling ? 0.28 : 0.32) * motionScale, 0, 0, add);
      rotate("rightShin", (falling ? 0.3 : 0.36) * motionScale, 0, 0, add);
      const armRaise = (falling ? -0.92 : -0.78) * motionScale;
      rotate("leftUpperArm", armRaise, 0, (falling ? -0.1 : -0.17) * motionScale, add);
      rotate("rightUpperArm", armRaise, 0, (falling ? 0.1 : 0.17) * motionScale, add);
      rotate("leftForearm", (falling ? -0.16 : -0.12) * motionScale, 0, 0, add);
      rotate("rightForearm", (falling ? -0.16 : -0.12) * motionScale, 0, 0, add);
      rotate("chest", (falling ? -0.035 : -0.07) * motionScale, 0, 0, add);
      rotate("head", (falling ? 0.02 : 0.04) * motionScale, 0, 0, add);
    } else if (movementState === "İNİŞ") {
      rotate("leftThigh", 0.36 * motionScale, 0, 0, add);
      rotate("rightThigh", 0.36 * motionScale, 0, 0, add);
      rotate("leftShin", -0.6 * motionScale, 0, 0, add);
      rotate("rightShin", -0.6 * motionScale, 0, 0, add);
      rotate("leftFoot", 0.2 * motionScale, 0, 0, add);
      rotate("rightFoot", 0.2 * motionScale, 0, 0, add);
      rotate("spine", 0.06 * motionScale, 0, 0, add);
      rotate("chest", 0.11 * motionScale, 0, 0, add);
      rotate("head", -0.17 * motionScale, 0, 0, add);
      rotate("leftUpperArm", -0.24 * motionScale, 0, 0, add);
      rotate("rightUpperArm", -0.24 * motionScale, 0, 0, add);
      rotate("leftForearm", -0.38 * motionScale, 0, 0, add);
      rotate("rightForearm", -0.38 * motionScale, 0, 0, add);
    } else if (movementState === "EĞİLİYOR") {
      const crouchPose = getWorldLocomotionPoseAngles(movementState, phase, state);
      for (const [name, angles] of Object.entries(crouchPose) as [
        CharacterPoseBoneName,
        readonly [number, number, number],
      ][]) {
        rotate(name, angles[0], angles[1], angles[2], add);
      }
    } else if (movementState === "KAYIYOR") {
      rotate("leftThigh", 0.42 * motionScale, 0, 0, add);
      rotate("rightThigh", 0.12 * motionScale, 0, 0, add);
      rotate("leftShin", -0.24 * motionScale, 0, 0, add);
      rotate("rightShin", -0.56 * motionScale, 0, 0, add);
      rotate("leftFoot", 0.12 * motionScale, 0, 0, add);
      rotate("rightFoot", 0.18 * motionScale, 0, 0, add);
      rotate("spine", -0.055 * motionScale, 0, 0, add);
      rotate("chest", -0.1 * motionScale, 0, 0, add);
      rotate("head", 0.15 * motionScale, 0, 0, add);
      rotate("leftUpperArm", -0.18 * motionScale, 0, -0.12 * motionScale, add);
      rotate("rightUpperArm", -0.18 * motionScale, 0, 0.12 * motionScale, add);
      rotate("leftForearm", -0.28 * motionScale, 0, 0, add);
      rotate("rightForearm", -0.28 * motionScale, 0, 0, add);
    }
  };

  if (locomotion) {
    applyLocomotionPose(locomotion.movementState);
  } else if (crouching) {
    applyLocomotionPose("EĞİLİYOR");
  }

  const lowPoseState = locomotion?.movementState ?? (crouching ? "EĞİLİYOR" : "YERDE_DURUYOR");
  const pelvis = bones.pelvis;
  const pelvisBaseline = baseline?.get("pelvis");
  if (pelvis && pelvisBaseline && (lowPoseState === "EĞİLİYOR" || lowPoseState === "KAYIYOR")) {
    const pelvisDrop = lowPoseState === "KAYIYOR"
      ? WORLD_SLIDE_PELVIS_DROP_METERS
      : WORLD_CROUCH_PELVIS_DROP_METERS;
    const parent = pelvis.parent;
    if (parent) {
      parent.updateWorldMatrix(true, false);
      worldPosePosition.copy(pelvisBaseline.position).applyMatrix4(parent.matrixWorld);
      worldPosePosition.y -= pelvisDrop * (lowPoseState === "EĞİLİYOR" ? 1 : motionScale);
      parent.worldToLocal(worldPosePosition);
      pelvis.position.copy(worldPosePosition);
    } else {
      pelvis.position.copy(pelvisBaseline.position);
      pelvis.position.y -= pelvisDrop * (lowPoseState === "EĞİLİYOR" ? 1 : motionScale);
    }
  }

  if (
    state === "jump"
    && (!locomotion || (
      locomotion.movementState !== "ZIPLAMA_HAZIRLIK"
      && locomotion.movementState !== "HAVADA_YUKARI"
      && locomotion.movementState !== "HAVADA_AŞAĞI"
      && locomotion.movementState !== "İNİŞ"
    ))
  ) {
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

  if (aiming) {
    rotate("leftUpperArm", -0.94 * motionScale, 0, -0.18 * motionScale, hasClip);
    rotate("leftForearm", -0.34 * motionScale, 0, 0, hasClip);
    rotate("rightUpperArm", -0.82 * motionScale, 0, 0.16 * motionScale, hasClip);
    rotate("rightForearm", -0.52 * motionScale, 0, 0, hasClip);
    rotate("chest", -0.025 * motionScale, 0, 0, hasClip);
  }
}
