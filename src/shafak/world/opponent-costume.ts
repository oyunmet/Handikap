import * as THREE from "three";
import type { EquipmentVisual } from "../game/store-types";
import type { OpponentModelConfig } from "./opponent-model-config";

type CapeRecord = {
  geometry: THREE.BufferGeometry;
  basePositions: Float32Array;
};

export type AttachedOpponentCostume = {
  update: (time: number) => void;
  dispose: () => void;
};

export function shouldAttachOpponentCostume(modelConfig: OpponentModelConfig | undefined) {
  return Boolean(modelConfig);
}

export function applyOpponentBasePalette(
  model: THREE.Object3D,
  modelConfig: OpponentModelConfig,
) {
  if (!modelConfig.isDemirTac) return;

  const appearance = modelConfig.appearance;
  const colors = new Map<string, string | undefined>([
    ["hair", modelConfig.materialPalette.hair],
    ["skin", modelConfig.materialPalette.skin],
    ["undershirt", appearance.armorDark ?? modelConfig.materialPalette.clothing],
    ["shirt", appearance.armor ?? modelConfig.materialPalette.clothing],
    ["pants", appearance.armorDark ?? modelConfig.materialPalette.pants],
    ["boots", appearance.armorDark ?? modelConfig.materialPalette.boots],
    ["detail", appearance.trim],
    ["material.006", appearance.cape],
  ]);

  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      const color = colors.get(material.name.toLowerCase());
      const materialColor = (material as THREE.Material & { color?: THREE.Color }).color;
      if (color && materialColor?.isColor) materialColor.set(color);
    }
  });
}

const BONE_NAMES = {
  head: ["Head", "DEF-head", "head", "Rig_Head"],
  torso: ["Spine2", "Spine1", "Torso", "DEF-spine.003", "DEF-spine.002", "Spine", "torso", "Hips"],
  leftShoulder: ["Shoulder.L", "ShoulderL", "LeftShoulder", "DEF-shoulder.L", "Rig_LeftShoulder"],
  rightShoulder: ["Shoulder.R", "ShoulderR", "RightShoulder", "DEF-shoulder.R", "Rig_RightShoulder"],
  leftForearm: ["LowerArm.L", "LowerArmL", "LeftForeArm", "LeftForearm", "DEF-forearm.L", "Rig_LeftForearm"],
  rightForearm: ["LowerArm.R", "LowerArmR", "RightForeArm", "RightForearm", "DEF-forearm.R", "Rig_RightForearm"],
  leftShin: ["LowerLeg.L", "LowerLegL", "LeftLeg", "LeftShin", "DEF-shin.L", "Rig_LeftShin"],
  rightShin: ["LowerLeg.R", "LowerLegR", "RightLeg", "RightShin", "DEF-shin.R", "Rig_RightShin"],
} as const;

function findMount(model: THREE.Object3D, names: readonly string[]) {
  let fallback: THREE.Object3D | null = null;
  model.traverse((object) => {
    if (!names.includes(object.name)) return;
    if (object instanceof THREE.Bone) fallback = object;
    else fallback ??= object;
  });
  return fallback ?? model;
}

function createCapeGeometry(width: number, length: number, columns = 6, rows = 8): CapeRecord {
  const basePositions = new Float32Array((columns + 1) * (rows + 1) * 3);
  const uvs = new Float32Array((columns + 1) * (rows + 1) * 2);
  const indices: number[] = [];
  for (let row = 0; row <= rows; row += 1) {
    for (let column = 0; column <= columns; column += 1) {
      const vertex = row * (columns + 1) + column;
      const u = column / columns;
      const v = row / rows;
      basePositions[vertex * 3] = (u - 0.5) * width * (0.84 + v * 0.16);
      basePositions[vertex * 3 + 1] = -v * length;
      basePositions[vertex * 3 + 2] = -0.13 - Math.sin(v * Math.PI * 0.5) * 0.12;
      uvs[vertex * 2] = u;
      uvs[vertex * 2 + 1] = 1 - v;
      if (row < rows && column < columns) {
        const nextRow = vertex + columns + 1;
        indices.push(vertex, nextRow, vertex + 1, vertex + 1, nextRow, nextRow + 1);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(basePositions.slice(), 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return { geometry, basePositions };
}

function makeMaterial(
  color: string,
  roughness = 0.84,
  metalness = 0.16,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: Math.min(0.3, metalness),
    flatShading: true,
  });
}

/**
 * Adds small archetype-specific gear to each cloned opponent model. Mounted
 * pieces inherit the character rig's animation; cape size is normalized after
 * the source GLB has been fitted to its target height.
 */
export function attachOpponentCostume(
  model: THREE.Object3D,
  modelConfig: OpponentModelConfig,
  appearance: EquipmentVisual | undefined,
): AttachedOpponentCostume {
  const style = modelConfig.costume;
  const trim = appearance?.trim ?? appearance?.armorLight ?? "#b99b70";
  const capeColor = appearance?.cape ?? appearance?.armorDark ?? "#44373a";
  const armorColor = appearance?.armorLight ?? appearance?.armor ?? "#746458";
  const maskColor = appearance?.armorDark ?? "#27262b";
  const bossGearScale = modelConfig.isBoss
    ? Math.min(1, (modelConfig.targetHeight ?? 3.35) / 3.35)
    : 1;
  const ownedMaterials: THREE.Material[] = [];
  const ownedGeometries: THREE.BufferGeometry[] = [];
  const mounts: THREE.Object3D[] = [];
  const capes: CapeRecord[] = [];
  const capeMeshes: THREE.Mesh[] = [];
  const isDemirTac = Boolean(modelConfig.isDemirTac);
  model.updateWorldMatrix(true, true);
  const head = findMount(model, BONE_NAMES.head);
  const torso = findMount(model, BONE_NAMES.torso);

  const mountGroup = (
    parent: THREE.Object3D,
    position: THREE.Vector3,
    gearScale = 1,
  ) => {
    const parentWorldScale = parent.getWorldScale(new THREE.Vector3());
    const inverseWorldScale = new THREE.Vector3(
      1 / Math.max(0.01, Math.abs(parentWorldScale.x)),
      1 / Math.max(0.01, Math.abs(parentWorldScale.y)),
      1 / Math.max(0.01, Math.abs(parentWorldScale.z)),
    );
    const group = new THREE.Group();
    group.scale.copy(inverseWorldScale).multiplyScalar(gearScale);
    group.position.set(
      position.x * inverseWorldScale.x,
      position.y * inverseWorldScale.y,
      position.z * inverseWorldScale.z,
    );
    parent.add(group);
    mounts.push(group);
    return group;
  };

  const mesh = (
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    position?: THREE.Vector3,
    scale?: THREE.Vector3,
  ) => {
    const item = new THREE.Mesh(geometry, material);
    item.castShadow = true;
    item.receiveShadow = true;
    if (position) item.position.copy(position);
    if (scale) item.scale.copy(scale);
    parent.add(item);
    ownedGeometries.push(geometry);
    ownedMaterials.push(material);
    return item;
  };

  const headGear = mountGroup(
    head,
    head === model
      ? new THREE.Vector3(0, modelConfig.targetHeight ? modelConfig.targetHeight * 0.88 : 1.55, 0)
      : new THREE.Vector3(0, 0, 0),
    isDemirTac ? bossGearScale : 1,
  );
  if (modelConfig.isBoss) headGear.name = "demir-tac-head-gear";

  if (style.hood) {
    const hoodMaterial = makeMaterial(capeColor, 0.94, 0.02);
    const hood = mesh(
      headGear,
      new THREE.SphereGeometry(0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.72),
      hoodMaterial,
      new THREE.Vector3(0, 0.025, -0.045),
      new THREE.Vector3(1.05, 1.18, 1.3),
    );
    hood.material.side = THREE.DoubleSide;
  }

  if (style.helmet) {
    const helmet = mesh(
      headGear,
      new THREE.SphereGeometry(modelConfig.isBoss ? 0.235 : 0.205, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.56),
      makeMaterial(modelConfig.isBoss ? "#7d8992" : armorColor, 0.68, 0.3),
      new THREE.Vector3(0, 0.09, -0.015),
      new THREE.Vector3(1.16, 1.12, 1.22),
    );
    if (isDemirTac) helmet.name = "demir-tac-helmet";
    helmet.material.side = THREE.DoubleSide;
    mesh(
      headGear,
      new THREE.BoxGeometry(modelConfig.isBoss ? 0.34 : 0.3, 0.05, 0.075),
      makeMaterial(modelConfig.isBoss ? "#c0c7cb" : trim, 0.68, 0.28),
      new THREE.Vector3(0, 0.035, 0.145),
    );
  }

  if (style.mask) {
    const mask = mesh(
      headGear,
      new THREE.BoxGeometry(0.25, 0.105, 0.055),
      makeMaterial(maskColor, 0.86, 0.1),
      new THREE.Vector3(0, -0.075, 0.16),
    );
    if (isDemirTac) {
      mask.name = "demir-tac-face-plate";
      const visor = mesh(
        headGear,
        new THREE.BoxGeometry(0.2, 0.025, 0.025),
        makeMaterial("#c7463f", 0.48, 0.24),
        new THREE.Vector3(0, -0.065, 0.195),
      );
      visor.name = "demir-tac-red-visor";
    }
  }

  if (style.horns) {
    for (const side of [-1, 1]) {
      const horn = mesh(
        headGear,
        new THREE.ConeGeometry(modelConfig.isBoss ? 0.055 : 0.045, modelConfig.isBoss ? 0.34 : 0.27, 6),
        makeMaterial(trim, 0.8, 0.2),
        new THREE.Vector3(side * 0.16, 0.16, -0.015),
      );
      horn.rotation.z = -side * 0.52;
    }
  }

  if (modelConfig.isBoss) {
    const crownBand = mesh(
      headGear,
      new THREE.TorusGeometry(0.245, 0.038, 8, 24),
      makeMaterial("#d1d9dd", 0.38, 0.3),
      new THREE.Vector3(0, 0.25, -0.015),
      new THREE.Vector3(1.08, 0.84, 1),
    );
    crownBand.name = "demir-tac-crown-band";
    crownBand.rotation.x = Math.PI / 2;

    for (const [index, x] of [-2, -1, 0, 1, 2].entries()) {
      const height = index === 2 ? 0.38 : index % 2 === 0 ? 0.25 : 0.3;
      const spike = mesh(
        headGear,
        new THREE.ConeGeometry(index === 2 ? 0.052 : 0.04, height, 5),
        makeMaterial(index === 2 ? "#df594f" : "#d1d9dd", 0.4, 0.3),
        new THREE.Vector3(x * 0.09, 0.39 + height * 0.42, -0.015),
      );
      spike.name = `demir-tac-crown-spike-${index}`;
      spike.rotation.z = -x * 0.16;
    }

    const crownGem = mesh(
      headGear,
      new THREE.OctahedronGeometry(0.075, 0),
      new THREE.MeshStandardMaterial({
        color: "#df5148",
        emissive: "#a8232c",
        emissiveIntensity: 0.45,
        metalness: 0.32,
        roughness: 0.34,
      }),
      new THREE.Vector3(0, 0.21, 0.255),
    );
    crownGem.name = "demir-tac-crown-gem";

  }

  if (modelConfig.isBoss) {
    const breastplate = mountGroup(
      torso,
      torso === model
        ? new THREE.Vector3(0, (modelConfig.targetHeight ?? 3.35) * 0.59, 0.1)
        : new THREE.Vector3(0, 0, 0.12),
      isDemirTac ? bossGearScale : 1,
    );
    breastplate.name = isDemirTac ? "demir-tac-breastplate" : "opponent-breastplate";
    if (isDemirTac) {
      const plateShape = new THREE.Shape();
      plateShape.moveTo(-0.19, 0.2);
      plateShape.lineTo(0.19, 0.2);
      plateShape.lineTo(0.25, 0.08);
      plateShape.lineTo(0.17, -0.16);
      plateShape.lineTo(0, -0.25);
      plateShape.lineTo(-0.17, -0.16);
      plateShape.lineTo(-0.25, 0.08);
      plateShape.closePath();
      const plateGeometry = new THREE.ExtrudeGeometry(plateShape, {
        depth: 0.045,
        bevelEnabled: true,
        bevelSegments: 1,
        bevelSize: 0.012,
        bevelThickness: 0.012,
      });
      plateGeometry.translate(0, 0, 0.014);
      const chestArmor = mesh(
        breastplate,
        plateGeometry,
        makeMaterial(armorColor, 0.42, 0.56),
        new THREE.Vector3(0, 0.01, 0.035),
      );
      chestArmor.name = "demir-tac-chest-armor";
      const chestRidge = mesh(
        breastplate,
        new THREE.BoxGeometry(0.05, 0.31, 0.035),
        makeMaterial("#bc4142", 0.4, 0.35),
        new THREE.Vector3(0, -0.01, 0.085),
      );
      chestRidge.name = "demir-tac-chest-stripe";
      for (const side of [-1, 1]) {
        mesh(
          breastplate,
          new THREE.BoxGeometry(0.09, 0.23, 0.035),
          makeMaterial("#747e87", 0.45, 0.42),
          new THREE.Vector3(side * 0.18, 0.02, 0.085),
          new THREE.Vector3(1, 1, 0.7),
        ).rotation.z = side * -0.16;
        mesh(
          breastplate,
          new THREE.SphereGeometry(0.025, 6, 4),
          makeMaterial("#d2b8a3", 0.36, 0.52),
          new THREE.Vector3(side * 0.19, -0.11, 0.087),
        ).name = `demir-tac-chest-rivet-${side}`;
      }
      const chestSigil = mesh(
        breastplate,
        new THREE.OctahedronGeometry(0.105, 0),
        new THREE.MeshStandardMaterial({
          color: "#df5148",
          emissive: "#a8232c",
          emissiveIntensity: 0.38,
          metalness: 0.36,
          roughness: 0.32,
        }),
        new THREE.Vector3(0, 0.085, 0.11),
        new THREE.Vector3(0.78, 1.18, 0.42),
      );
      chestSigil.name = "demir-tac-chest-sigil";
    } else {
      mesh(
        breastplate,
        new THREE.CylinderGeometry(0.24, 0.34, 0.48, 6, 1),
        makeMaterial(armorColor, 0.54, 0.28),
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(1, 1, 0.43),
      ).name = "demir-tac-chest-armor";
      mesh(
        breastplate,
        new THREE.BoxGeometry(0.065, 0.35, 0.028),
        makeMaterial("#c7463f", 0.48, 0.24),
        new THREE.Vector3(0, 0, 0.155),
      ).name = "demir-tac-chest-stripe";
      mesh(
        breastplate,
        new THREE.OctahedronGeometry(0.11, 0),
        makeMaterial("#df5148", 0.42, 0.24),
        new THREE.Vector3(0, 0.08, 0.19),
        new THREE.Vector3(0.75, 1.35, 0.35),
      ).name = "demir-tac-chest-sigil";
    }
  }

  if (style.cape) {
    const cloth = createCapeGeometry(
      modelConfig.isBoss ? 0.92 * bossGearScale : 0.76,
      modelConfig.isBoss ? 1.25 * bossGearScale : 0.88,
    );
    const capeMesh = mesh(
      mountGroup(torso, torso === model
        ? new THREE.Vector3(0, (modelConfig.targetHeight ?? 1.8) * 0.62, 0)
        : new THREE.Vector3(0, -0.06, -0.02)),
      cloth.geometry,
      new THREE.MeshStandardMaterial({
        color: capeColor,
        roughness: 0.95,
        metalness: 0.02,
        side: THREE.DoubleSide,
        vertexColors: false,
      }),
    );
    if (modelConfig.isBoss) capeMesh.name = isDemirTac ? "demir-tac-crimson-cape" : "opponent-boss-cape";
    cloth.geometry.computeVertexNormals();
    capes.push(cloth);
    capeMeshes.push(capeMesh);
  }

  for (const [side, names] of [
    [-1, BONE_NAMES.leftShoulder],
    [1, BONE_NAMES.rightShoulder],
  ] as const) {
    const shoulder = findMount(model, names);
    const shoulderGroup = mountGroup(
      shoulder,
      shoulder === model
        ? new THREE.Vector3(side * 0.25, (modelConfig.targetHeight ?? 1.8) * 0.75, 0)
        : new THREE.Vector3(0, -0.045, 0),
      isDemirTac ? bossGearScale : 1,
    );
    const pad = mesh(
      shoulderGroup,
      modelConfig.isBoss
        ? new THREE.DodecahedronGeometry(0.21, 0)
        : new THREE.SphereGeometry(style.shoulders === "fur" ? 0.155 : 0.135, 10, 7),
      makeMaterial(style.shoulders === "fur" ? capeColor : armorColor, style.shoulders === "fur" ? 0.98 : 0.78, style.shoulders === "metal" ? 0.28 : 0.08),
      new THREE.Vector3(0, 0, 0),
      modelConfig.isBoss
        ? new THREE.Vector3(1.65, 1.08, 1.4)
        : new THREE.Vector3(1.45, 0.92, 1.2),
    );
    if (modelConfig.isBoss) {
      pad.name = isDemirTac
        ? `demir-tac-angular-pauldron-${side < 0 ? "left" : "right"}`
        : `opponent-angular-pauldron-${side < 0 ? "left" : "right"}`;
      const pauldronStripe = mesh(
        shoulderGroup,
        new THREE.BoxGeometry(0.17, 0.045, 0.025),
        makeMaterial("#c7463f", 0.48, 0.24),
        new THREE.Vector3(0, -0.035, 0.17),
      );
      pauldronStripe.name = isDemirTac
        ? `demir-tac-pauldron-mark-${side < 0 ? "left" : "right"}`
        : `opponent-pauldron-mark-${side < 0 ? "left" : "right"}`;
    }
    if (style.shoulders === "metal") {
      const spike = mesh(
        shoulderGroup,
        new THREE.ConeGeometry(0.045, 0.18, 5),
        makeMaterial(trim, 0.72, 0.28),
        new THREE.Vector3(side * 0.13, 0.055, 0),
      );
      spike.rotation.z = -side * 0.55;
    } else if (style.shoulders === "fur") {
      for (const offset of [-0.11, 0, 0.11]) {
        mesh(
          shoulderGroup,
          new THREE.ConeGeometry(0.055, 0.17, 5),
          makeMaterial(capeColor, 0.98, 0.01),
          new THREE.Vector3(offset, -0.055, 0),
        ).rotation.z = -0.28;
      }
    }
    // Keep the sphere in the scene tree so it follows the rigged shoulder joint.
    pad.visible = true;
  }

  if (isDemirTac) {
    for (const [side, boneNames] of [
      [-1, BONE_NAMES.leftForearm],
      [1, BONE_NAMES.rightForearm],
      [-1, BONE_NAMES.leftShin],
      [1, BONE_NAMES.rightShin],
    ] as const) {
      const isArm = boneNames === BONE_NAMES.leftForearm || boneNames === BONE_NAMES.rightForearm;
      const limb = findMount(model, boneNames);
      const guard = mountGroup(
        limb,
        limb === model
          ? new THREE.Vector3(side * (isArm ? 0.16 : 0.1), (modelConfig.targetHeight ?? 3.35) * (isArm ? 0.53 : 0.24), 0)
          : new THREE.Vector3(0, -0.04, 0),
        bossGearScale,
      );
      const baseName = isArm ? "vambrace" : "greave";
      const plate = mesh(
        guard,
        new THREE.CylinderGeometry(isArm ? 0.105 : 0.125, isArm ? 0.13 : 0.15, isArm ? 0.23 : 0.29, 7, 1),
        makeMaterial("#707982", 0.46, 0.42),
        new THREE.Vector3(0, -0.035, 0),
        new THREE.Vector3(1, 1, 0.76),
      );
      plate.name = isDemirTac ? `demir-tac-${baseName}-${side < 0 ? "left" : "right"}` : `opponent-${baseName}-${side < 0 ? "left" : "right"}`;
      mesh(
        guard,
        new THREE.BoxGeometry(isArm ? 0.045 : 0.055, isArm ? 0.16 : 0.2, 0.025),
        makeMaterial("#bc4142", 0.42, 0.3),
        new THREE.Vector3(0, -0.035, isArm ? 0.103 : 0.123),
      );
    }
  }

  const update = (time: number) => {
    capes.forEach(({ geometry, basePositions }, capeIndex) => {
      const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
      const vertexCount = positions.count;
      for (let vertex = 0; vertex < vertexCount; vertex += 1) {
        const x = basePositions[vertex * 3];
        const y = basePositions[vertex * 3 + 1];
        const z = basePositions[vertex * 3 + 2];
        const amount = THREE.MathUtils.clamp(-y / 0.88, 0, 1);
        const wave = Math.sin(time * 2.2 + x * 3.2 + amount * 3.5 + capeIndex) * amount * 0.12;
        positions.setXYZ(vertex, x + wave * 0.32, y, z + wave);
      }
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
    });
  };

  const dispose = () => {
    mounts.forEach((group) => group.removeFromParent());
    capeMeshes.length = 0;
    ownedGeometries.forEach((geometry) => geometry.dispose());
    ownedMaterials.forEach((material) => material.dispose());
  };

  return { update, dispose };
}
