import * as THREE from "three";

type WeaponReadyPoseState = {
  bones: Array<{
    bone: THREE.Bone;
    base: readonly [number, number, number];
    offset: readonly [number, number, number];
  }>;
};

const WEAPON_READY_POSE_KEY = "warRoomRangedWeaponReadyPose";
const WEAPON_READY_ARM_OFFSETS = [
  { names: ["UpperArmR", "UpperArm.R", "RightUpperArm"], offset: [-0.25, 0, -0.25] },
  { names: ["LowerArmR", "LowerArm.R", "RightForeArm"], offset: [-1, 0, 1.25] },
  { names: ["UpperArmL", "UpperArm.L", "LeftUpperArm"], offset: [-1.5, 0, 1.5] },
  { names: ["LowerArmL", "LowerArm.L", "LeftForeArm"], offset: [-0.25, 0, 0.25] },
] as const;

function findBone(model: THREE.Object3D, names: readonly string[]) {
  for (const name of names) {
    const candidate = model.getObjectByName(name);
    if (candidate && (candidate as THREE.Bone).isBone) return candidate as THREE.Bone;
  }
  return null;
}

export function applyWarRoomRangedWeaponReadyPose(
  model: THREE.Object3D,
  rightForearmExtraX = 0,
) {
  const existing = model.userData[WEAPON_READY_POSE_KEY] as WeaponReadyPoseState | undefined;
  const bones = WEAPON_READY_ARM_OFFSETS
    .map(({ names, offset }) => {
      const bone = findBone(model, names);
      if (!bone) return null;
      const saved = existing?.bones.find((pose) => pose.bone === bone);
      return {
        bone,
        base: saved?.base ?? [bone.rotation.x, bone.rotation.y, bone.rotation.z] as const,
        offset,
      };
    })
    .filter((pose): pose is NonNullable<typeof pose> => pose !== null);
  const rightForearm = bones.find((pose) => pose.bone.name === "LowerArmR" || pose.bone.name === "LowerArm.R");
  const state: WeaponReadyPoseState = { bones };
  model.userData[WEAPON_READY_POSE_KEY] = state;

  for (const pose of bones) {
    const [x, y, z] = pose.offset;
    pose.bone.rotation.set(
      pose.base[0] + x + (pose === rightForearm && Number.isFinite(rightForearmExtraX) ? rightForearmExtraX : 0),
      pose.base[1] + y,
      pose.base[2] + z,
    );
  }
  return bones.some((pose) => pose.bone.name === "LowerArmR" || pose.bone.name === "LowerArm.R")
    && bones.some((pose) => pose.bone.name === "UpperArmR" || pose.bone.name === "UpperArm.R");
}

export function restoreWarRoomRangedWeaponReadyPose(model: THREE.Object3D) {
  const state = model.userData[WEAPON_READY_POSE_KEY] as WeaponReadyPoseState | undefined;
  if (!state) return false;
  for (const { bone, base } of state.bones) bone.rotation.set(...base);
  delete model.userData[WEAPON_READY_POSE_KEY];
  return true;
}

export function applyWarRoomWeaponHoldPose(
  model: THREE.Object3D,
  weaponClass: "melee" | "ranged",
) {
  return weaponClass === "melee"
    ? restoreWarRoomRangedWeaponReadyPose(model)
    : applyWarRoomRangedWeaponReadyPose(model);
}
