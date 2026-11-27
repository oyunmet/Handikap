import * as THREE from "three";
import type { EquipmentVisual } from "../game/store-types";
import {
  createFacetedArmorPlateGeometry,
  createHumanLimbGeometry,
} from "./human-character-geometry";

type DetailPalette = Pick<
  EquipmentVisual,
  "armor" | "armorLight" | "armorDark" | "trim"
>;

export type HumanCharacterDetailOptions = {
  palette?: DetailPalette;
  pattern?: EquipmentVisual["armorStyle"];
  /** The source model's visible front faces +Z when positive and -Z when negative. */
  frontSign?: 1 | -1;
  include?: Partial<Record<"chest" | "belt" | "shoulders" | "arms" | "legs", boolean>>;
};

export type AttachedHumanCharacterDetails = {
  dispose: () => void;
};

const BONE_ALIASES = {
  torso: ["Torso", "Spine2", "Spine1", "DEF-spine.003", "DEF-spine.002", "Rig_Spine", "Spine", "Body", "Hips"],
  hips: ["Hips", "Rig_Hips", "DEF-hips", "mixamorigHips"],
  leftShoulder: ["Shoulder.L", "ShoulderL", "LeftShoulder", "DEF-shoulder.L", "Rig_LeftShoulder"],
  rightShoulder: ["Shoulder.R", "ShoulderR", "RightShoulder", "DEF-shoulder.R", "Rig_RightShoulder"],
  leftForearm: ["LowerArm.L", "LowerArmL", "LeftForeArm", "LeftForearm", "DEF-forearm.L", "Rig_LeftForearm"],
  rightForearm: ["LowerArm.R", "LowerArmR", "RightForeArm", "RightForearm", "DEF-forearm.R", "Rig_RightForearm"],
  leftShin: ["LowerLeg.L", "LowerLegL", "LeftLeg", "LeftShin", "DEF-shin.L", "mixamorigLeftLeg", "Rig_LeftLowerLeg", "Rig_LeftShin"],
  rightShin: ["LowerLeg.R", "LowerLegR", "RightLeg", "RightShin", "DEF-shin.R", "mixamorigRightLeg", "Rig_RightLowerLeg", "Rig_RightShin"],
} as const;

function findMount(model: THREE.Object3D, aliases: readonly string[]) {
  const pending: THREE.Object3D[] = [model];
  while (pending.length) {
    const object = pending.pop();
    if (!object) continue;
    if (object instanceof THREE.Bone && aliases.includes(object.name)) return object;
    pending.push(...object.children);
  }
  return null;
}

function makeMaterial(color: string, metalness: number, roughness: number) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness,
    flatShading: true,
  });
}

/**
 * Adds a small set of fitted armor panels to an animated human rig. Every panel
 * is mounted to the bone that drives its body part, so elbows, shoulders, hips,
 * and knees continue to follow the source animation.
 */
export function attachHumanCharacterDetails(
  model: THREE.Object3D,
  options: HumanCharacterDetailOptions = {},
): AttachedHumanCharacterDetails {
  const frontSign = options.frontSign ?? 1;
  const palette = options.palette ?? {};
  const armor = palette.armor ?? "#554943";
  const metal = palette.armorLight ?? "#a69a84";
  const dark = palette.armorDark ?? "#302d30";
  const trim = palette.trim ?? "#c49b5b";
  const include = {
    chest: true,
    belt: true,
    shoulders: true,
    arms: true,
    legs: true,
    ...options.include,
  };
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const mounts: THREE.Group[] = [];
  const modelMaterials = {
    armor: makeMaterial(armor, 0.22, 0.78),
    metal: makeMaterial(metal, 0.48, 0.46),
    dark: makeMaterial(dark, 0.08, 0.88),
    trim: makeMaterial(trim, 0.38, 0.48),
  };
  materials.push(...Object.values(modelMaterials));

  model.updateMatrixWorld(true);
  const makeMount = (
    aliases: readonly string[],
    offset: [number, number, number],
    name: string,
    frontFacing = false,
  ) => {
    const parent = findMount(model, aliases);
    if (!parent) return null;
    parent.updateWorldMatrix(true, false);
    const scale = parent.getWorldScale(new THREE.Vector3());
    const inverseScale = new THREE.Vector3(
      1 / Math.max(0.01, Math.abs(scale.x)),
      1 / Math.max(0.01, Math.abs(scale.y)),
      1 / Math.max(0.01, Math.abs(scale.z)),
    );
    const group = new THREE.Group();
    group.name = name;
    group.position.set(
      offset[0] * inverseScale.x,
      offset[1] * inverseScale.y,
      offset[2] * inverseScale.z,
    );
    group.scale.copy(inverseScale);
    if (frontFacing && frontSign < 0) group.rotation.y = Math.PI;
    parent.add(group);
    mounts.push(group);
    return group;
  };
  const addMesh = (
    parent: THREE.Object3D,
    name: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    position: [number, number, number] = [0, 0, 0],
    scale?: [number, number, number],
  ) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(...position);
    if (scale) mesh.scale.set(...scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    geometries.push(geometry);
    return mesh;
  };

  if (include.chest) {
    const torso = makeMount(BONE_ALIASES.torso, [0, 0.035, frontSign * 0.055], "human-detail-chest-mount", true);
    if (torso) {
      addMesh(
        torso,
        "human-detail-tapered-chest-plate",
        createFacetedArmorPlateGeometry(0.38, 0.4, 0.045),
        modelMaterials.metal,
      );
      if (options.pattern) {
        const pattern = new THREE.Group();
        pattern.name = `human-detail-chest-pattern-${options.pattern}`;
        pattern.position.set(0, 0.015, 0.052);
        torso.add(pattern);
        mounts.push(pattern);

        const addPatternMark = (
          name: string,
          width: number,
          height: number,
          x: number,
          y: number,
          rotation = 0,
        ) => {
          const mark = addMesh(
            pattern,
            name,
            new THREE.BoxGeometry(width, height, 0.009),
            modelMaterials.trim,
            [x, y, 0],
          );
          mark.rotation.z = rotation;
        };

        if (options.pattern === "royal") {
          const diamond = new THREE.Shape();
          diamond.moveTo(0, 0.075);
          diamond.lineTo(0.048, 0);
          diamond.lineTo(0, -0.075);
          diamond.lineTo(-0.048, 0);
          diamond.closePath();
          addMesh(
            pattern,
            "human-detail-chest-pattern-royal-diamond",
            new THREE.ShapeGeometry(diamond),
            modelMaterials.trim,
          );
        } else if (options.pattern === "watch") {
          [-0.028, 0, 0.028].forEach((x, index) => {
            addPatternMark(
              `human-detail-chest-pattern-watch-stripe-${index}`,
              0.012,
              0.12,
              x,
              0,
            );
          });
        } else if (options.pattern === "shadow") {
          addPatternMark("human-detail-chest-pattern-shadow-slash-left", 0.016, 0.13, -0.02, 0, -0.28);
          addPatternMark("human-detail-chest-pattern-shadow-slash-right", 0.016, 0.13, 0.02, 0, 0.28);
        } else {
          addPatternMark("human-detail-chest-pattern-ash-crossbar", 0.095, 0.016, 0, -0.01);
          addPatternMark("human-detail-chest-pattern-ash-spine", 0.016, 0.13, 0, 0.01);
        }
      }
    }
  }

  if (include.belt) {
    const hips = makeMount(BONE_ALIASES.hips, [0, 0, frontSign * 0.045], "human-detail-belt-mount", true);
    if (hips) {
      const beltGeometry = new THREE.BoxGeometry(0.38, 0.07, 0.055, 2, 1, 1);
      addMesh(hips, "human-detail-reinforced-belt", beltGeometry, modelMaterials.dark);
      const buckleGeometry = new THREE.OctahedronGeometry(0.045, 0);
      addMesh(
        hips,
        "human-detail-belt-buckle",
        buckleGeometry,
        modelMaterials.trim,
        [0, 0, frontSign * 0.032],
        [1, 1.1, 0.55],
      );
    }
  }

  if (include.shoulders) {
    for (const [side, aliases] of [
      [-1, BONE_ALIASES.leftShoulder],
      [1, BONE_ALIASES.rightShoulder],
    ] as const) {
      const shoulder = makeMount(
        aliases,
        [side * 0.015, -0.008, frontSign * 0.02],
        `human-detail-shoulder-mount-${side}`,
        true,
      );
      if (shoulder) {
        addMesh(
          shoulder,
          `human-detail-faceted-pauldron-${side}`,
          createFacetedArmorPlateGeometry(0.25, 0.19, 0.04),
          side < 0 ? modelMaterials.armor : modelMaterials.metal,
          [side * 0.025, 0, 0],
          [1.08, 0.82, 1],
        );
      }
    }
  }

  if (include.arms) {
    for (const [side, aliases] of [
      [-1, BONE_ALIASES.leftForearm],
      [1, BONE_ALIASES.rightForearm],
    ] as const) {
      const forearm = makeMount(
        aliases,
        [0, -0.045, frontSign * 0.025],
        `human-detail-forearm-mount-${side}`,
        true,
      );
      if (forearm) {
        const bracer = addMesh(
          forearm,
          `human-detail-articulated-bracer-${side}`,
          createHumanLimbGeometry("forearm", 8),
          modelMaterials.metal,
          [0, -0.065, 0],
        );
        bracer.scale.set(0.075, 0.25, 0.062);
      }
    }
  }

  if (include.legs) {
    for (const [side, aliases] of [
      [-1, BONE_ALIASES.leftShin],
      [1, BONE_ALIASES.rightShin],
    ] as const) {
      const shin = makeMount(
        aliases,
        [0, -0.035, frontSign * 0.035],
        `human-detail-shin-mount-${side}`,
        true,
      );
      if (shin) {
        addMesh(
          shin,
          `human-detail-knee-and-shin-guard-${side}`,
          createFacetedArmorPlateGeometry(0.19, 0.32, 0.035),
          modelMaterials.armor,
          [0, -0.075, 0],
          [0.78, 1, 0.82],
        );
      }
    }
  }

  return {
    dispose: () => {
      mounts.forEach((mount) => mount.removeFromParent());
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
    },
  };
}
