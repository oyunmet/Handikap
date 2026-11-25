import * as THREE from "three";
import type { EquipmentVisual } from "../game/store-types";

export const FANTASY_KNIGHT_MODEL_PATH = "/models/fantasy_knight.glb";
export const FANTASY_KNIGHT_AXIS_CORRECTION = -Math.PI / 2;

export type FantasyKnightHeadAccessory = "hat" | "glasses" | null;
export type FantasyKnightPartSet = "full" | "arms" | "legs";

export type FantasyKnightModelOptions = {
  appearance?: EquipmentVisual;
  headAccessory?: FantasyKnightHeadAccessory;
  parts?: FantasyKnightPartSet;
  showWeapon?: boolean;
  targetHeight?: number;
  castShadow?: boolean;
};

export type FantasyKnightModelInstance = {
  root: THREE.Group;
  sourceHeight: number;
  materials: Set<THREE.Material>;
  geometries: Set<THREE.BufferGeometry>;
};

const ARM_MESH_NAME = /^(?:pauldron|upper_arm|elbow|forearm|gauntlet)/;
const LEG_MESH_NAME = /^(?:boot|shin|knee|thigh)/;
const SWORD_MESH_NAME = /^sword_/;

function normalizedName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function materialColor(
  name: string,
  appearance: EquipmentVisual,
  fallback: THREE.Color,
) {
  const key = normalizedName(name);
  if (key.includes("hair")) return appearance.hairColor ?? appearance.helmetColor;
  if (key.includes("cape")) return appearance.cape ?? appearance.armor ?? appearance.dyeColor;
  if (key.includes("tabard")) return appearance.armor ?? appearance.dyeColor;
  if (key.includes("swordblade")) return appearance.weaponColor;
  if (key.includes("sword")) return appearance.armorDark ?? appearance.gloveColor;
  if (key.includes("gold") || key.includes("trim") || key.includes("belt") || key.includes("spike")) {
    return appearance.trim ?? appearance.helmetColor;
  }
  if (key.includes("boot")) return appearance.bootColor;
  if (key.includes("gauntlet") || key.includes("forearm") || key.includes("elbow")) {
    return appearance.gloveColor ?? appearance.armorLight ?? appearance.armor;
  }
  if (
    key.includes("torso")
    || key.includes("chest")
    || key.includes("pector")
    || key.includes("pauldron")
    || key.includes("upperarm")
    || key.includes("greave")
    || key.includes("thigh")
    || key.includes("shin")
    || key.includes("knee")
    || key.includes("pelvis")
  ) {
    return appearance.armorLight ?? appearance.armor ?? appearance.dyeColor;
  }
  return fallback.getStyle();
}

function createAccessoryMesh(
  parent: THREE.Group,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number],
  resources: Pick<FantasyKnightModelInstance, "geometries" | "materials">,
  rotation: [number, number, number] = [0, 0, 0],
) {
  resources.geometries.add(geometry);
  resources.materials.add(material);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addHeadAccessory(
  root: THREE.Group,
  accessory: FantasyKnightHeadAccessory,
  appearance: EquipmentVisual,
  yOffset: number,
  resources: Pick<FantasyKnightModelInstance, "geometries" | "materials">,
) {
  if (!accessory) return;
  const color = accessory === "hat"
    ? appearance.helmetColor ?? appearance.armorDark ?? "#765239"
    : appearance.trim ?? appearance.helmetColor ?? "#b18a5e";
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: accessory === "hat" ? 0.84 : 0.56,
    metalness: accessory === "hat" ? 0.04 : 0.24,
    flatShading: true,
  });

  if (accessory === "hat") {
    createAccessoryMesh(
      root,
      new THREE.CylinderGeometry(0.255, 0.255, 0.04, 8),
      material,
      [0, 2.24 + yOffset, 0],
      resources,
    );
    createAccessoryMesh(
      root,
      new THREE.CylinderGeometry(0.15, 0.19, 0.19, 8),
      material.clone(),
      [0, 2.355 + yOffset, 0],
      resources,
    );
    return;
  }

  for (const side of [-1, 1]) {
    createAccessoryMesh(
      root,
      new THREE.TorusGeometry(0.06, 0.01, 6, 12),
      material,
      [side * 0.067, 2.13 + yOffset, 0.137],
      resources,
    );
  }
  createAccessoryMesh(
    root,
    new THREE.BoxGeometry(0.04, 0.014, 0.014),
    material.clone(),
    [0, 2.13 + yOffset, 0.137],
    resources,
  );
}

function addHelmetStyle(
  root: THREE.Group,
  style: EquipmentVisual["helmetStyle"],
  appearance: EquipmentVisual,
  yOffset: number,
  resources: Pick<FantasyKnightModelInstance, "geometries" | "materials">,
) {
  if (style !== "horned" && style !== "crest") return;
  const material = new THREE.MeshStandardMaterial({
    color: appearance.helmetColor ?? appearance.armorLight ?? "#aeb2b5",
    metalness: 0.48,
    roughness: 0.38,
    flatShading: true,
  });
  createAccessoryMesh(
    root,
    new THREE.CylinderGeometry(0.145, 0.18, 0.09, 8),
    material,
    [0, 2.25 + yOffset, 0],
    resources,
  );

  if (style === "horned") {
    for (const side of [-1, 1]) {
      createAccessoryMesh(
        root,
        new THREE.ConeGeometry(0.055, 0.23, 5),
        material.clone(),
        [side * 0.17, 2.35 + yOffset, 0],
        resources,
        [0, 0, side * -0.48],
      );
    }
  } else {
    createAccessoryMesh(
      root,
      new THREE.ConeGeometry(0.065, 0.24, 5),
      material.clone(),
      [0, 2.39 + yOffset, -0.015],
      resources,
    );
  }
}

/** Returns a stable accessory choice so the same opponent looks the same on every visit. */
export function getFantasyKnightHeadAccessory(seed: string): FantasyKnightHeadAccessory {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const choice = (hash >>> 0) % 3;
  return choice === 1 ? "hat" : choice === 2 ? "glasses" : null;
}

/** Clones the single static Z-up knight mesh and applies one character's cosmetic style. */
export function createFantasyKnightModel(
  source: THREE.Object3D,
  options: FantasyKnightModelOptions = {},
): FantasyKnightModelInstance {
  const appearance = options.appearance ?? {};
  const root = new THREE.Group();
  root.name = "fantasy-knight-character";
  const orientedModel = new THREE.Group();
  orientedModel.name = "fantasy-knight-z-up-to-y-up";
  orientedModel.rotation.x = FANTASY_KNIGHT_AXIS_CORRECTION;
  const model = source.clone(true);
  model.name = "fantasy-knight-source-mesh";
  orientedModel.add(model);
  root.add(orientedModel);

  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(orientedModel, true);
  const sourceHeight = bounds.getSize(new THREE.Vector3()).y;
  if (!Number.isFinite(sourceHeight) || sourceHeight <= 0.001) {
    throw new Error("The fantasy knight model has no measurable Y-up height.");
  }
  const targetHeight = Number.isFinite(options.targetHeight)
    ? Math.max(0.1, options.targetHeight ?? 1.7)
    : 1.7;
  const yOffset = -bounds.min.y;
  orientedModel.position.y = yOffset;
  root.scale.setScalar(targetHeight / sourceHeight);

  const resources: FantasyKnightModelInstance = {
    root,
    sourceHeight,
    materials: new Set(),
    geometries: new Set(),
  };
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const meshName = normalizedName(object.name);
    const parts = options.parts ?? "full";
    const partVisible = parts === "full"
      || (parts === "arms" && ARM_MESH_NAME.test(object.name))
      || (parts === "legs" && LEG_MESH_NAME.test(object.name));
    object.visible = partVisible && (options.showWeapon !== false || !SWORD_MESH_NAME.test(object.name));
    object.castShadow = options.castShadow ?? true;
    object.receiveShadow = options.castShadow ?? true;

    const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
    const styledMaterials = sourceMaterials.map((sourceMaterial) => {
      const cloned = sourceMaterial.clone();
      const color = (cloned as THREE.Material & { color?: THREE.Color }).color;
      if (color?.isColor) {
        const replacement = materialColor(object.name, appearance, color);
        if (replacement) color.set(replacement);
      }
      resources.materials.add(cloned);
      return cloned;
    });
    object.material = Array.isArray(object.material) ? styledMaterials : styledMaterials[0];
    if (meshName === "head" || meshName === "neck") object.frustumCulled = false;
  });

  if (options.parts !== "arms" && options.parts !== "legs") {
    // Static anchors preserve weapon placement APIs without introducing a skeleton or animation rig.
    const anchors: Array<[string, [number, number, number]]> = [
      ["RightHand", [-0.53, -0.04, 1.13]],
      ["LeftHand", [0.53, -0.05, 1.13]],
      ["RightArm", [-0.44, -0.005, 1.615]],
      ["RightForeArm", [-0.5, -0.025, 1.3]],
      ["Torso", [0, 0, 1.62]],
      ["Head", [0, -0.005, 2.12]],
    ];
    for (const [name, position] of anchors) {
      const anchor = new THREE.Group();
      anchor.name = name;
      anchor.position.set(...position);
      orientedModel.add(anchor);
    }
    const accessory = options.headAccessory;
    if (accessory) addHeadAccessory(root, accessory, appearance, yOffset, resources);
    else addHelmetStyle(root, appearance.helmetStyle, appearance, yOffset, resources);
  }

  root.updateMatrixWorld(true);
  return resources;
}

export function disposeFantasyKnightModel(instance: FantasyKnightModelInstance) {
  instance.materials.forEach((material) => material.dispose());
  instance.geometries.forEach((geometry) => geometry.dispose());
  instance.materials.clear();
  instance.geometries.clear();
}
