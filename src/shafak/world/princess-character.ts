import * as THREE from "three";
import { clone as cloneSkinnedModel } from "three/addons/utils/SkeletonUtils.js";
import { getCharacterBounds } from "./character-model.ts";
import { isRootTranslationTrack, prepareWorldActorClips } from "./model-animation.ts";
import { PLAYER_CHARACTER_MODEL_PATH, PLAYER_CHARACTER_ROOT_BONE } from "./player-model.ts";
import { getWorldModelFit } from "./world-model-sizing.ts";

const PRINCESS_HEIGHT = 1.7;
const PRINCESS_MAX_DIMENSION = 2.7;

const PRINCESS_PALETTE: Record<string, { color: string; metalness?: number; roughness?: number }> = {
  hair: { color: "#49262a", roughness: 0.78 },
  skin: { color: "#d7ad8f", roughness: 0.82 },
  undershirt: { color: "#4b1929", roughness: 0.72 },
  shirt: { color: "#76263a", roughness: 0.66 },
  pants: { color: "#4a1d32", roughness: 0.8 },
  detail: { color: "#b48a4d", metalness: 0.48, roughness: 0.42 },
  boots: { color: "#34242a", roughness: 0.8 },
  "material.006": { color: "#c39a53", metalness: 0.62, roughness: 0.36 },
};

const GOLD = "#c99d54";
const DARK_GOLD = "#80582e";
const WINE = "#681e35";

export type PrincessCharacter = {
  model: THREE.Object3D;
  animations: THREE.AnimationClip[];
  fitScale: number;
  ownedGeometries: THREE.BufferGeometry[];
  ownedMaterials: THREE.Material[];
};

function normalizeName(value: string) {
  return value.toLocaleLowerCase("en-US").replace(/[^a-z0-9.]/g, "");
}

function applyPrincessPalette(
  model: THREE.Object3D,
  ownedMaterials: THREE.Material[],
) {
  const clonedMaterials = new Map<THREE.Material, THREE.Material>();
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const originals = Array.isArray(object.material) ? object.material : [object.material];
    const materials = originals.map((original) => {
      const cached = clonedMaterials.get(original);
      if (cached) return cached;
      const clone = original.clone();
      {
        const palette = PRINCESS_PALETTE[normalizeName(original.name)];
        const color = (clone as THREE.Material & { color?: THREE.Color }).color;
        if (palette && color?.isColor) {
          color.set(palette.color);
          if (clone instanceof THREE.MeshStandardMaterial) {
            clone.metalness = palette.metalness ?? Math.min(clone.metalness, 0.18);
            clone.roughness = palette.roughness ?? Math.max(clone.roughness, 0.68);
          }
          clone.needsUpdate = true;
        }
      }
      clonedMaterials.set(original, clone);
      ownedMaterials.push(clone);
      return clone;
    });
    object.material = Array.isArray(object.material) ? materials : materials[0];
    if (object instanceof THREE.SkinnedMesh) object.frustumCulled = false;
  });
}

function addAccessoryMesh(
  parent: THREE.Object3D,
  name: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  ownedGeometries: THREE.BufferGeometry[],
  ownedMaterials: THREE.Material[],
) {
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  ownedGeometries.push(geometry);
  ownedMaterials.push(material);
  return mesh;
}

function createTrimMaterial(color = GOLD) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.68,
    roughness: 0.36,
  });
}

function addHairAndCrown(
  model: THREE.Object3D,
  ownedGeometries: THREE.BufferGeometry[],
  ownedMaterials: THREE.Material[],
) {
  const head = model.getObjectByName("Head");
  if (!(head instanceof THREE.Bone)) throw new Error("Player rig is missing its Head bone.");

  const headWorldScale = head.getWorldScale(new THREE.Vector3());
  if (headWorldScale.x <= 0 || headWorldScale.y <= 0 || headWorldScale.z <= 0) {
    throw new Error("Player rig Head bone has an invalid world scale.");
  }
  const adornment = new THREE.Group();
  adornment.name = "PrincessHeadAdornment";
  adornment.scale.set(
    1 / headWorldScale.x,
    1 / headWorldScale.y,
    1 / headWorldScale.z,
  );
  head.add(adornment);

  const hair = new THREE.Group();
  hair.name = "PrincessHairFlow";
  adornment.add(hair);
  const hairMaterial = new THREE.MeshStandardMaterial({
    color: "#4a2427",
    roughness: 0.78,
    metalness: 0.02,
  });
  const goldThread = createTrimMaterial("#a87b43");
  addAccessoryMesh(
    hair,
    "PrincessLongHairBack",
    new THREE.SphereGeometry(1, 12, 10),
    hairMaterial,
    ownedGeometries,
    ownedMaterials,
  ).scale.set(0.12, 0.28, 0.055);
  hair.children[0].position.set(0, -0.2, -0.07);

  for (const side of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.075, 0.09, 0.035),
      new THREE.Vector3(side * 0.11, -0.06, 0.055),
      new THREE.Vector3(side * 0.105, -0.27, 0.015),
      new THREE.Vector3(side * 0.07, -0.43, -0.015),
    ]);
    addAccessoryMesh(
      hair,
      `PrincessLongHairLock${side < 0 ? "R" : "L"}`,
      new THREE.TubeGeometry(curve, 16, 0.033, 6, false),
      hairMaterial.clone(),
      ownedGeometries,
      ownedMaterials,
    );
    const ribbonCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.075, -0.17, 0.026),
      new THREE.Vector3(side * 0.09, -0.28, 0.012),
      new THREE.Vector3(side * 0.07, -0.39, -0.004),
    ]);
    addAccessoryMesh(
      hair,
      `PrincessHairGoldThread${side < 0 ? "R" : "L"}`,
      new THREE.TubeGeometry(ribbonCurve, 10, 0.004, 4, false),
      goldThread.clone(),
      ownedGeometries,
      ownedMaterials,
    );
  }

  const crown = new THREE.Group();
  crown.name = "PrincessCrown";
  crown.position.set(0, 0.17, 0.005);
  adornment.add(crown);
  const goldBand = createTrimMaterial();
  addAccessoryMesh(
    crown,
    "PrincessCrownBand",
    new THREE.CylinderGeometry(0.083, 0.09, 0.038, 14, 1),
    goldBand,
    ownedGeometries,
    ownedMaterials,
  );
  for (let index = 0; index < 5; index += 1) {
    const x = (index - 2) * 0.037;
    const spike = addAccessoryMesh(
      crown,
      `PrincessCrownPoint${index + 1}`,
      new THREE.ConeGeometry(index === 2 ? 0.023 : 0.018, index === 2 ? 0.12 : 0.087, 5),
      goldBand.clone(),
      ownedGeometries,
      ownedMaterials,
    );
    spike.position.set(x, 0.057 + (index === 2 ? 0.016 : 0), 0);
  }
  const jewel = addAccessoryMesh(
    crown,
    "PrincessCrownGarnet",
    new THREE.OctahedronGeometry(0.024, 0),
    new THREE.MeshStandardMaterial({
      color: "#7e2035",
      metalness: 0.28,
      roughness: 0.28,
      emissive: "#270914",
    }),
    ownedGeometries,
    ownedMaterials,
  );
  jewel.position.set(0, 0.012, 0.088);
}

function createSkirtGeometry() {
  const geometry = new THREE.CylinderGeometry(0.145, 0.34, 0.6, 18, 6, true);
  geometry.translate(0, -0.27, 0);
  return geometry;
}

function addDress(
  model: THREE.Object3D,
  ownedGeometries: THREE.BufferGeometry[],
  ownedMaterials: THREE.Material[],
) {
  const hips = model.getObjectByName("Hips");
  if (!(hips instanceof THREE.Bone)) throw new Error("Player rig is missing its Hips bone.");
  const hipsWorldScale = hips.getWorldScale(new THREE.Vector3());
  if (hipsWorldScale.x <= 0 || hipsWorldScale.y <= 0 || hipsWorldScale.z <= 0) {
    throw new Error("Player rig Hips bone has an invalid world scale.");
  }
  const skirtPivot = new THREE.Group();
  skirtPivot.name = "PrincessSkirtPivot";
  skirtPivot.position.y = 0.075 / hipsWorldScale.y;
  skirtPivot.scale.set(
    1 / hipsWorldScale.x,
    1 / hipsWorldScale.y,
    1 / hipsWorldScale.z,
  );
  hips.add(skirtPivot);

  const skirt = addAccessoryMesh(
    skirtPivot,
    "PrincessDressSkirt",
    createSkirtGeometry(),
    new THREE.MeshStandardMaterial({
      color: WINE,
      metalness: 0.08,
      roughness: 0.74,
      side: THREE.DoubleSide,
    }),
    ownedGeometries,
    ownedMaterials,
  );
  skirt.position.y = -0.04;

  const waist = addAccessoryMesh(
    skirtPivot,
    "PrincessGoldWaistBand",
    new THREE.TorusGeometry(0.145, 0.012, 5, 20),
    createTrimMaterial(),
    ownedGeometries,
    ownedMaterials,
  );
  waist.rotation.x = Math.PI / 2;
  waist.position.y = -0.015;

  const hem = addAccessoryMesh(
    skirtPivot,
    "PrincessGoldHem",
    new THREE.TorusGeometry(0.333, 0.012, 5, 22),
    createTrimMaterial(DARK_GOLD),
    ownedGeometries,
    ownedMaterials,
  );
  hem.rotation.x = Math.PI / 2;
  hem.position.y = -0.62;

  const frontTrim = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.005, 0.146),
    new THREE.Vector3(0, -0.3, 0.234),
    new THREE.Vector3(0, -0.56, 0.323),
  ]);
  addAccessoryMesh(
    skirtPivot,
    "PrincessGoldDressTrim",
    new THREE.TubeGeometry(frontTrim, 16, 0.006, 4, false),
    createTrimMaterial(),
    ownedGeometries,
    ownedMaterials,
  );

  return { skirtPivot };
}

function quaternionTrack(
  objectName: string,
  base: THREE.Quaternion,
  axis: THREE.Vector3,
  times: readonly number[],
  angles: readonly number[],
) {
  const values: number[] = [];
  times.forEach((_, index) => {
    values.push(...base.clone().multiply(
      new THREE.Quaternion().setFromAxisAngle(axis, angles[index] ?? 0),
    ).toArray());
  });
  return new THREE.QuaternionKeyframeTrack(`${objectName}.quaternion`, [...times], values);
}

function accessoryTrack(objectName: string, times: readonly number[], zAngles: readonly number[]) {
  return quaternionTrack(
    objectName,
    new THREE.Quaternion(),
    new THREE.Vector3(0, 0, 1),
    times,
    zAngles,
  );
}

function getBaseAnimationClip(
  clips: readonly THREE.AnimationClip[],
  name: "Idle" | "Walk",
) {
  return clips.find((clip) => clip.name === name)
    ?? clips.find((clip) => clip.name.endsWith(`|${name}`));
}

function prepareBaseClip(
  source: THREE.AnimationClip,
  name: string,
  skirtSway: number,
  hairSway: number,
) {
  const clip = source.clone();
  clip.name = name;
  clip.tracks = clip.tracks.filter(
    (track) => !isRootTranslationTrack(track.name, PLAYER_CHARACTER_ROOT_BONE),
  );
  const duration = Math.max(clip.duration, 1 / 30);
  const middle = duration / 2;
  clip.tracks.push(
    accessoryTrack("PrincessSkirtPivot", [0, middle, duration], [0, skirtSway, 0]),
    accessoryTrack("PrincessHairFlow", [0, middle, duration], [0, hairSway, 0]),
  );
  return clip;
}

function createGestureClips(model: THREE.Object3D) {
  const upperArmL = model.getObjectByName("UpperArmL");
  const lowerArmL = model.getObjectByName("LowerArmL");
  const fistL = model.getObjectByName("FistL");
  const upperArmR = model.getObjectByName("UpperArmR");
  const lowerArmR = model.getObjectByName("LowerArmR");
  const head = model.getObjectByName("Head");
  if (
    !(upperArmL instanceof THREE.Bone)
    || !(lowerArmL instanceof THREE.Bone)
    || !(fistL instanceof THREE.Bone)
    || !(upperArmR instanceof THREE.Bone)
    || !(lowerArmR instanceof THREE.Bone)
    || !(head instanceof THREE.Bone)
  ) throw new Error("Player rig is missing bones required for princess gestures.");

  const waveTimes = [0, 0.28, 0.5, 0.72, 0.94, 1.16, 1.4];
  const talkTimes = [0, 0.34, 0.72, 1.1, 1.48];
  const wave = new THREE.AnimationClip("PrincessWave", 1.4, [
    quaternionTrack(
      upperArmL.name,
      upperArmL.quaternion,
      new THREE.Vector3(1, 0, 0),
      waveTimes,
      [0, 1.8, 2.2, 2.2, 2.2, 1.8, 0],
    ),
    quaternionTrack(
      lowerArmL.name,
      lowerArmL.quaternion,
      new THREE.Vector3(0, 0, 1),
      waveTimes,
      [0, 0.1, -0.18, 0.16, -0.18, 0.1, 0],
    ),
    quaternionTrack(
      fistL.name,
      fistL.quaternion,
      new THREE.Vector3(0, 1, 0),
      waveTimes,
      [0, -0.08, 0.14, -0.14, 0.14, -0.08, 0],
    ),
    accessoryTrack("PrincessSkirtPivot", waveTimes, [0, 0.035, -0.025, 0.025, -0.02, 0.02, 0]),
    accessoryTrack("PrincessHairFlow", waveTimes, [0, -0.035, 0.025, -0.02, 0.025, -0.015, 0]),
  ]);

  const talk = new THREE.AnimationClip("PrincessTalk", 1.48, [
    quaternionTrack(
      head.name,
      head.quaternion,
      new THREE.Vector3(1, 0, 0),
      talkTimes,
      [0, 0.06, -0.04, 0.055, 0],
    ),
    quaternionTrack(
      upperArmR.name,
      upperArmR.quaternion,
      new THREE.Vector3(1, 0, 0),
      talkTimes,
      [0, -0.12, -0.22, -0.1, 0],
    ),
    quaternionTrack(
      lowerArmR.name,
      lowerArmR.quaternion,
      new THREE.Vector3(0, 0, 1),
      talkTimes,
      [0, 0.12, 0.2, 0.08, 0],
    ),
    accessoryTrack("PrincessSkirtPivot", talkTimes, [0, 0.018, -0.02, 0.014, 0]),
    accessoryTrack("PrincessHairFlow", talkTimes, [0, 0.02, -0.022, 0.015, 0]),
  ]);

  return [wave, talk];
}

export function createPrincessCharacter(
  sourceScene: THREE.Group,
  sourceAnimations: readonly THREE.AnimationClip[],
): PrincessCharacter {
  const idleSource = getBaseAnimationClip(sourceAnimations, "Idle");
  const walkSource = getBaseAnimationClip(sourceAnimations, "Walk");
  if (!idleSource || !walkSource) {
    throw new Error("Player GLB must provide Idle and Walk clips for the princess rig.");
  }

  const model = cloneSkinnedModel(sourceScene);
  const poseMixer = new THREE.AnimationMixer(model);
  poseMixer.clipAction(idleSource).play();
  poseMixer.setTime(0);
  poseMixer.update(0);
  model.updateMatrixWorld(true);

  const sourceBounds = getCharacterBounds(model);
  const sourceSize = sourceBounds.getSize(new THREE.Vector3());
  const sourceCenter = sourceBounds.getCenter(new THREE.Vector3());
  const fit = getWorldModelFit(sourceSize, {
    targetHeight: PRINCESS_HEIGHT,
    maxDimension: PRINCESS_MAX_DIMENSION,
  });
  if (!Number.isFinite(fit.scale) || fit.scale <= 0) {
    throw new Error("Player GLB did not produce valid princess dimensions.");
  }
  model.scale.setScalar(fit.scale);
  model.position.set(
    -sourceCenter.x * fit.scale,
    -sourceBounds.min.y * fit.scale,
    -sourceCenter.z * fit.scale,
  );
  model.updateMatrixWorld(true);

  const ownedMaterials: THREE.Material[] = [];
  const ownedGeometries: THREE.BufferGeometry[] = [];
  applyPrincessPalette(model, ownedMaterials);
  addHairAndCrown(model, ownedGeometries, ownedMaterials);
  addDress(model, ownedGeometries, ownedMaterials);
  model.updateMatrixWorld(true);

  const baseClips = prepareWorldActorClips(
    PLAYER_CHARACTER_MODEL_PATH,
    [idleSource, walkSource],
  ).map((clip) => clip.clone());
  const animations = [
    prepareBaseClip(baseClips[0], "PrincessIdle", 0.018, 0.012),
    prepareBaseClip(baseClips[1], "PrincessWalk", 0.09, 0.05),
    ...createGestureClips(model),
  ];

  return {
    model,
    animations,
    fitScale: fit.scale,
    ownedGeometries,
    ownedMaterials,
  };
}

export function disposePrincessCharacter(character: PrincessCharacter) {
  character.ownedGeometries.forEach((geometry) => geometry.dispose());
  character.ownedMaterials.forEach((material) => material.dispose());
  character.model.traverse((object) => {
    if (object instanceof THREE.SkinnedMesh) object.skeleton.dispose();
  });
}

export function getPrincessCharacterHeight(character: PrincessCharacter) {
  const bounds = getCharacterBounds(character.model);
  return bounds.getSize(new THREE.Vector3()).y;
}
