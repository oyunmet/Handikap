import * as THREE from "three";
import type { CharacterAnimationState } from "./character-animation";

export type PlayerRigBoneName =
  | "Rig_Root"
  | "Rig_Hips"
  | "Rig_Spine"
  | "Rig_Chest"
  | "Rig_Neck"
  | "Rig_Head"
  | "Rig_LeftUpperArm"
  | "Rig_LeftForearm"
  | "Rig_LeftHand"
  | "Rig_RightUpperArm"
  | "Rig_RightForearm"
  | "Rig_RightHand"
  | "Rig_LeftThigh"
  | "Rig_LeftShin"
  | "Rig_LeftFoot"
  | "Rig_RightThigh"
  | "Rig_RightShin"
  | "Rig_RightFoot";

export type PlayerSkeletalRig = {
  bones: Record<PlayerRigBoneName, THREE.Bone>;
  skeleton: THREE.Skeleton;
  mesh: THREE.SkinnedMesh;
  ownedGeometry: THREE.BufferGeometry;
};

type Bounds = {
  min: readonly [number, number, number];
  max: readonly [number, number, number];
};

export type SkinInfluence = {
  bone: Exclude<PlayerRigBoneName, "Rig_Root">;
  weight: number;
};

const smoothstep = (minimum: number, maximum: number, value: number) => {
  const t = THREE.MathUtils.clamp((value - minimum) / (maximum - minimum), 0, 1);
  return t * t * (3 - 2 * t);
};

function blend(
  lowerBone: SkinInfluence["bone"],
  upperBone: SkinInfluence["bone"],
  upperWeight: number,
): SkinInfluence[] {
  const upper = THREE.MathUtils.clamp(upperWeight, 0, 1);
  return [
    { bone: lowerBone, weight: 1 - upper },
    { bone: upperBone, weight: upper },
  ].filter((influence) => influence.weight > 0);
}

/**
 * Gives the unrigged source character a lightweight, deterministic skin map.
 * The source GLB is intentionally unchanged; its vertices are weighted against
 * the same named joints every time it is loaded.
 */
export function getPlayerSkinInfluences(
  x: number,
  y: number,
  bounds: Bounds,
): SkinInfluence[] {
  const height = Math.max(0.001, bounds.max[1] - bounds.min[1]);
  const width = Math.max(0.001, bounds.max[0] - bounds.min[0]);
  const centerX = (bounds.max[0] + bounds.min[0]) / 2;
  const normalizedY = THREE.MathUtils.clamp((y - bounds.min[1]) / height, 0, 1);
  const normalizedX = Math.abs((x - centerX) / width) * 2;
  const side = x < centerX ? "Left" : "Right";

  if (normalizedY < 0.34 && normalizedX > 0.13) {
    const thigh = `Rig_${side}Thigh` as const;
    const shin = `Rig_${side}Shin` as const;
    const foot = `Rig_${side}Foot` as const;
    if (normalizedY < 0.075) {
      return blend(shin, foot, 1 - smoothstep(0.025, 0.09, normalizedY));
    }
    return blend(thigh, shin, 1 - smoothstep(0.14, 0.24, normalizedY));
  }

  if (normalizedY > 0.34 && normalizedY < 0.86 && normalizedX > 0.38) {
    const upperArm = `Rig_${side}UpperArm` as const;
    const forearm = `Rig_${side}Forearm` as const;
    const hand = `Rig_${side}Hand` as const;
    if (normalizedY < 0.39) {
      return blend(forearm, hand, 1 - smoothstep(0.34, 0.39, normalizedY));
    }
    return blend(forearm, upperArm, smoothstep(0.44, 0.54, normalizedY));
  }

  if (normalizedY > 0.79) {
    return blend("Rig_Neck", "Rig_Head", smoothstep(0.78, 0.9, normalizedY));
  }
  if (normalizedY > 0.63) {
    return blend("Rig_Chest", "Rig_Neck", smoothstep(0.62, 0.72, normalizedY));
  }
  if (normalizedY > 0.40) {
    return blend("Rig_Spine", "Rig_Chest", smoothstep(0.37, 0.48, normalizedY));
  }
  return blend("Rig_Hips", "Rig_Spine", smoothstep(0.28, 0.40, normalizedY));
}

function addBone(
  parent: THREE.Bone,
  name: PlayerRigBoneName,
  position: readonly [number, number, number],
  bones: Record<PlayerRigBoneName, THREE.Bone>,
) {
  const bone = new THREE.Bone();
  bone.name = name;
  bone.position.set(...position);
  parent.add(bone);
  bones[name] = bone;
  return bone;
}

function createPlayerBones(model: THREE.Object3D) {
  const bones = {} as Record<PlayerRigBoneName, THREE.Bone>;
  const root = new THREE.Bone();
  root.name = "Rig_Root";
  bones.Rig_Root = root;
  model.add(root);

  const hips = addBone(root, "Rig_Hips", [0, 0.23, 0], bones);
  const spine = addBone(hips, "Rig_Spine", [0, 0.075, 0], bones);
  const chest = addBone(spine, "Rig_Chest", [0, 0.105, 0], bones);
  const neck = addBone(chest, "Rig_Neck", [0, 0.095, 0], bones);
  addBone(neck, "Rig_Head", [0, 0.075, 0], bones);

  for (const side of ["Left", "Right"] as const) {
    const direction = side === "Left" ? -1 : 1;
    const upperArm = addBone(chest, `Rig_${side}UpperArm`, [direction * 0.13, 0.015, 0], bones);
    const forearm = addBone(upperArm, `Rig_${side}Forearm`, [direction * 0.055, -0.09, 0], bones);
    addBone(forearm, `Rig_${side}Hand`, [direction * 0.025, -0.085, 0], bones);

    const thigh = addBone(hips, `Rig_${side}Thigh`, [direction * 0.075, -0.015, 0], bones);
    const shin = addBone(thigh, `Rig_${side}Shin`, [0, -0.115, 0], bones);
    addBone(shin, `Rig_${side}Foot`, [0, -0.075, 0.02], bones);
  }

  return bones;
}

function applySkinWeights(geometry: THREE.BufferGeometry, bones: Record<PlayerRigBoneName, THREE.Bone>) {
  const position = geometry.getAttribute("position");
  if (!position) throw new Error("Player model needs a position attribute before rigging.");
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) throw new Error("Player model bounds could not be computed.");

  const bounds: Bounds = {
    min: [box.min.x, box.min.y, box.min.z],
    max: [box.max.x, box.max.y, box.max.z],
  };
  const boneNames = Object.keys(bones) as PlayerRigBoneName[];
  const boneIndex = new Map(boneNames.map((name, index) => [name, index]));
  const skinIndices = new Uint16Array(position.count * 4);
  const skinWeights = new Float32Array(position.count * 4);

  for (let vertex = 0; vertex < position.count; vertex += 1) {
    const influences = getPlayerSkinInfluences(position.getX(vertex), position.getY(vertex), bounds);
    const total = influences.reduce((sum, influence) => sum + influence.weight, 0);
    influences.forEach((influence, slot) => {
      skinIndices[vertex * 4 + slot] = boneIndex.get(influence.bone) ?? 0;
      skinWeights[vertex * 4 + slot] = influence.weight / total;
    });
  }

  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeights, 4));
}

export function rigPlayerModel(model: THREE.Object3D): PlayerSkeletalRig | null {
  const sourceMeshes: THREE.Mesh[] = [];
  model.traverse((object) => {
    if (object instanceof THREE.Mesh && !(object instanceof THREE.SkinnedMesh)) {
      sourceMeshes.push(object);
    }
  });
  const originalMesh = sourceMeshes[0];
  if (!originalMesh || !originalMesh.parent) return null;

  const bones = createPlayerBones(model);
  const geometry = originalMesh.geometry.clone();
  applySkinWeights(geometry, bones);
  const parent = originalMesh.parent;
  const skinnedMesh = new THREE.SkinnedMesh(geometry, originalMesh.material);
  skinnedMesh.name = originalMesh.name;
  skinnedMesh.position.copy(originalMesh.position);
  skinnedMesh.quaternion.copy(originalMesh.quaternion);
  skinnedMesh.scale.copy(originalMesh.scale);
  skinnedMesh.castShadow = originalMesh.castShadow;
  skinnedMesh.receiveShadow = originalMesh.receiveShadow;
  skinnedMesh.frustumCulled = originalMesh.frustumCulled;
  parent.add(skinnedMesh);
  parent.remove(originalMesh);

  model.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(Object.values(bones));
  skinnedMesh.bind(skeleton, skinnedMesh.matrixWorld);
  skinnedMesh.normalizeSkinWeights();

  return { bones, skeleton, mesh: skinnedMesh, ownedGeometry: geometry };
}

export function posePlayerRig(
  rig: PlayerSkeletalRig,
  speed: number,
  phase: number,
  state: CharacterAnimationState,
  actionProgress: number,
  motionReduced: boolean,
  time: number,
) {
  const reducedScale = motionReduced ? 0.34 : 1;
  const walkWeight = THREE.MathUtils.clamp(speed / 3.2, 0, 1);
  const runWeight = THREE.MathUtils.clamp((speed - 3.2) / 2.6, 0, 1);
  const swing = Math.sin(phase) * walkWeight * THREE.MathUtils.lerp(0.42, 0.64, runWeight) * reducedScale;
  const leftLift = Math.max(0, Math.sin(phase + Math.PI / 2)) * walkWeight;
  const rightLift = Math.max(0, Math.sin(phase - Math.PI / 2)) * walkWeight;
  const { bones } = rig;

  bones.Rig_LeftThigh.rotation.set(-swing, 0, 0);
  bones.Rig_RightThigh.rotation.set(swing, 0, 0);
  bones.Rig_LeftShin.rotation.set(leftLift * 0.46 * reducedScale, 0, 0);
  bones.Rig_RightShin.rotation.set(rightLift * 0.46 * reducedScale, 0, 0);
  bones.Rig_LeftFoot.rotation.set(-bones.Rig_LeftShin.rotation.x * 0.64, 0, 0);
  bones.Rig_RightFoot.rotation.set(-bones.Rig_RightShin.rotation.x * 0.64, 0, 0);
  bones.Rig_LeftUpperArm.rotation.set(swing * 0.58, 0, -0.04 * walkWeight);
  bones.Rig_RightUpperArm.rotation.set(-swing * 0.58, 0, 0.04 * walkWeight);
  bones.Rig_LeftForearm.rotation.set(-leftLift * 0.16 * reducedScale, 0, 0);
  bones.Rig_RightForearm.rotation.set(-rightLift * 0.16 * reducedScale, 0, 0);
  bones.Rig_LeftHand.rotation.set(0, 0, 0);
  bones.Rig_RightHand.rotation.set(0, 0, 0);
  bones.Rig_Spine.rotation.set(0, 0, Math.sin(time * 1.35) * 0.008 * reducedScale);
  bones.Rig_Chest.rotation.set(
    Math.sin(time * 1.35) * 0.012 * reducedScale,
    Math.sin(phase) * 0.035 * walkWeight * reducedScale,
    Math.sin(phase) * 0.018 * walkWeight * reducedScale,
  );
  bones.Rig_Neck.rotation.set(0, 0, 0);
  bones.Rig_Head.rotation.set(-bones.Rig_Chest.rotation.x * 0.35, -bones.Rig_Chest.rotation.y * 0.45, 0);

  const action = Math.sin(actionProgress * Math.PI);
  if (state === "attack" || state === "heavyAttack" || state === "plunge") {
    const power = state === "heavyAttack" || state === "plunge" ? 1.08 : 0.78;
    bones.Rig_RightUpperArm.rotation.set(-0.42 - action * power, 0, -0.24 + action * 0.32);
    bones.Rig_RightForearm.rotation.x = -action * 0.62;
    bones.Rig_Chest.rotation.y += action * 0.12;
  } else if (state === "block") {
    bones.Rig_LeftUpperArm.rotation.set(-0.62, 0, -0.24);
    bones.Rig_RightUpperArm.rotation.set(-0.72, 0, 0.26);
    bones.Rig_LeftForearm.rotation.x = -0.38;
    bones.Rig_RightForearm.rotation.x = -0.42;
  } else if (state === "hit") {
    bones.Rig_LeftUpperArm.rotation.z = 0.24 * action;
    bones.Rig_RightUpperArm.rotation.z = -0.24 * action;
  } else if (state === "dodge" || state === "backflip") {
    bones.Rig_LeftUpperArm.rotation.z = 0.48 * action;
    bones.Rig_RightUpperArm.rotation.z = -0.48 * action;
  } else if (state === "die") {
    bones.Rig_LeftUpperArm.rotation.z = actionProgress * 0.32;
    bones.Rig_RightUpperArm.rotation.z = -actionProgress * 0.32;
  }
}
