import * as THREE from "three";
import type { CharacterAnimationState } from "./character-animation";
import type { EquipmentVisual } from "../game/store-types";

const HERO_HEIGHT = 1.7;

export type ProceduralHeroRig = {
  root: THREE.Group;
  bodyRoot: THREE.Group;
  height: number;
  hips: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftThigh: THREE.Group;
  rightThigh: THREE.Group;
  leftKnee: THREE.Group;
  rightKnee: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftElbow: THREE.Group;
  rightElbow: THREE.Group;
  rightHand: THREE.Group;
  geometries: Set<THREE.BufferGeometry>;
  materials: Set<THREE.Material>;
};

export type ProceduralHeroPose = {
  phase: number;
  moveWeight: number;
  state: CharacterAnimationState;
  actionProgress: number;
  time: number;
  crouching: boolean;
  motionReduced: boolean;
};

function addMesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number],
  resources: Pick<ProceduralHeroRig, "geometries">,
  rotation: [number, number, number] = [0, 0, 0],
) {
  resources.geometries.add(geometry);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function group(parent: THREE.Object3D, name: string, position: [number, number, number]) {
  const child = new THREE.Group();
  child.name = name;
  child.position.set(...position);
  parent.add(child);
  return child;
}

function addBox(
  parent: THREE.Object3D,
  size: [number, number, number],
  material: THREE.Material,
  position: [number, number, number],
  rig: Pick<ProceduralHeroRig, "geometries">,
  rotation: [number, number, number] = [0, 0, 0],
) {
  return addMesh(parent, new THREE.BoxGeometry(...size), material, position, rig, rotation);
}

function addSphere(
  parent: THREE.Object3D,
  radius: number,
  material: THREE.Material,
  position: [number, number, number],
  rig: Pick<ProceduralHeroRig, "geometries">,
  scale: [number, number, number] = [1, 1, 1],
) {
  const mesh = addMesh(
    parent,
    new THREE.SphereGeometry(radius, 10, 8),
    material,
    position,
    rig,
  );
  mesh.scale.set(...scale);
  return mesh;
}

function makeMaterial(color: string, roughness = 0.78, metalness = 0.04) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: true });
}

export function createProceduralHeroRig(appearance: EquipmentVisual = {}): ProceduralHeroRig {
  const materials = new Set<THREE.Material>();
  const material = (color: string, roughness?: number, metalness?: number) => {
    const instance = makeMaterial(color, roughness, metalness);
    materials.add(instance);
    return instance;
  };
  const cloth = material(appearance.armor ?? appearance.dyeColor ?? "#386b65");
  const clothLight = material(appearance.armorLight ?? "#5a8a7e");
  const dark = material(appearance.armorDark ?? "#302e32");
  const steel = material("#64676d", 0.38, 0.48);
  const trim = material(appearance.trim ?? "#c49b5b", 0.42, 0.38);
  const leather = material("#543a2e");
  const glove = material(appearance.gloveColor ?? "#443632");
  const boot = material(appearance.bootColor ?? "#49352e");
  const cape = material(appearance.cape ?? "#8f3540", 0.9);
  const skin = material("#c58c68");
  const hair = material(appearance.helmetColor ?? "#624632");
  const faceDetail = material("#332a25", 0.8);

  const root = new THREE.Group();
  root.name = "Root";
  const bodyRoot = group(root, "Character", [0, 0, 0]);
  const rig = {
    root,
    bodyRoot,
    height: 0,
    hips: group(bodyRoot, "Hips", [0, 0.82, 0]),
    torso: new THREE.Group(),
    head: new THREE.Group(),
    leftThigh: new THREE.Group(),
    rightThigh: new THREE.Group(),
    leftKnee: new THREE.Group(),
    rightKnee: new THREE.Group(),
    leftArm: new THREE.Group(),
    rightArm: new THREE.Group(),
    leftElbow: new THREE.Group(),
    rightElbow: new THREE.Group(),
    rightHand: new THREE.Group(),
    geometries: new Set<THREE.BufferGeometry>(),
    materials,
  } satisfies ProceduralHeroRig;

  rig.torso.name = "Torso";
  rig.torso.position.set(0, 0.14, 0);
  rig.hips.add(rig.torso);
  addBox(rig.hips, [0.34, 0.2, 0.23], dark, [0, 0, 0], rig);
  addMesh(
    rig.hips,
    new THREE.CylinderGeometry(0.19, 0.19, 0.075, 10),
    leather,
    [0, 0.04, 0],
    rig,
  );
  addBox(rig.hips, [0.12, 0.1, 0.04], trim, [0, 0.04, 0.122], rig);

  addBox(rig.torso, [0.43, 0.38, 0.25], cloth, [0, 0.18, 0], rig);
  addBox(rig.torso, [0.36, 0.1, 0.265], clothLight, [0, 0.22, 0.01], rig);
  addBox(rig.torso, [0.3, 0.055, 0.27], trim, [0, 0.015, 0.015], rig);
  addBox(rig.torso, [0.075, 0.18, 0.045], leather, [0, 0.17, 0.137], rig);

  const capeShape = new THREE.Shape();
  capeShape.moveTo(-0.17, 0.2);
  capeShape.lineTo(0.17, 0.2);
  capeShape.lineTo(0.29, -0.42);
  capeShape.lineTo(-0.29, -0.42);
  capeShape.closePath();
  const capeGeometry = new THREE.ShapeGeometry(capeShape, 1);
  const capeMesh = addMesh(
    rig.torso,
    capeGeometry,
    cape,
    [0, 0.17, -0.135],
    rig,
    [0, 0, 0],
  );
  capeMesh.material = cape.clone();
  (capeMesh.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  materials.add(capeMesh.material as THREE.Material);

  rig.head = group(rig.torso, "Head", [0, 0.48, 0]);
  addSphere(rig.head, 0.14, skin, [0, 0.01, 0], rig, [0.86, 1.08, 0.88]);
  addSphere(rig.head, 0.145, hair, [0, 0.09, -0.014], rig, [0.98, 0.67, 0.98]);
  addSphere(rig.head, 0.07, hair, [0, -0.035, -0.085], rig, [1.6, 1.5, 1.05]);
  addBox(rig.head, [0.16, 0.035, 0.04], hair, [0, 0.102, 0.112], rig);
  for (const side of [-1, 1]) {
    addSphere(rig.head, 0.012, faceDetail, [side * 0.047, 0.01, 0.121], rig);
  }

  for (const [side, thigh, knee] of [
    [-1, rig.leftThigh, rig.leftKnee],
    [1, rig.rightThigh, rig.rightKnee],
  ] as const) {
    thigh.name = side < 0 ? "LeftThigh" : "RightThigh";
    thigh.position.set(side * 0.105, -0.08, 0);
    rig.hips.add(thigh);
    addMesh(
      thigh,
      new THREE.CylinderGeometry(0.075, 0.085, 0.31, 7),
      dark,
      [0, -0.155, 0],
      rig,
    );
    addSphere(thigh, 0.082, steel, [0, -0.305, 0], rig, [1, 0.68, 0.9]);
    knee.name = side < 0 ? "LeftKnee" : "RightKnee";
    knee.position.y = -0.32;
    thigh.add(knee);
    addMesh(
      knee,
      new THREE.CylinderGeometry(0.061, 0.07, 0.27, 7),
      dark,
      [0, -0.13, 0],
      rig,
    );
    addBox(knee, [0.16, 0.09, 0.16], boot, [0, -0.27, 0.045], rig);
    addBox(knee, [0.17, 0.065, 0.2], leather, [0, -0.31, 0.075], rig);
  }

  for (const [side, arm, elbow] of [
    [-1, rig.leftArm, rig.leftElbow],
    [1, rig.rightArm, rig.rightElbow],
  ] as const) {
    arm.name = side < 0 ? "LeftShoulder" : "RightShoulder";
    arm.position.set(side * 0.27, 0.23, 0);
    rig.torso.add(arm);
    addSphere(arm, 0.105, steel, [side * 0.015, 0.005, 0], rig, [1.2, 1.05, 1]);
    addMesh(
      arm,
      new THREE.CylinderGeometry(0.075, 0.065, 0.27, 7),
      cloth,
      [0, -0.145, 0],
      rig,
    );
    elbow.name = side < 0 ? "LeftElbow" : "RightElbow";
    elbow.position.y = -0.28;
    arm.add(elbow);
    addMesh(
      elbow,
      new THREE.CylinderGeometry(0.061, 0.055, 0.23, 7),
      glove,
      [0, -0.115, 0],
      rig,
    );
    const hand = group(elbow, side < 0 ? "LeftHand" : "RightHand", [0, -0.25, 0]);
    addSphere(hand, 0.065, glove, [0, -0.025, 0], rig, [0.88, 0.92, 0.8]);
    if (side > 0) {
      rig.rightHand.position.set(0, -0.025, 0.015);
      hand.add(rig.rightHand);
    }
  }

  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root, true);
  rig.height = bounds.getSize(new THREE.Vector3()).y;
  bodyRoot.position.y -= bounds.min.y;
  root.scale.setScalar(1);
  root.userData.proceduralHeroHeight = rig.height;
  return rig;
}

export function animateProceduralHero(rig: ProceduralHeroRig, pose: ProceduralHeroPose) {
  const reduced = pose.motionReduced ? 0.35 : 1;
  const weight = THREE.MathUtils.clamp(pose.moveWeight, 0, 1);
  const stride = Math.sin(pose.phase);
  const crouch = pose.crouching ? 0.16 : 0;
  const progress = THREE.MathUtils.clamp(pose.actionProgress, 0, 1);
  const accent = Math.sin(progress * Math.PI);
  const idleSway = Math.sin(pose.time * 1.2) * 0.018 * (1 - weight);

  rig.hips.position.y = 0.82 - crouch + Math.abs(stride) * 0.025 * weight * reduced;
  // Keep the spine's local up axis fixed. Locomotion only moves the limbs.
  rig.hips.rotation.set(0, 0, 0);
  rig.torso.rotation.set(0, 0, 0);
  rig.head.rotation.set(0, 0, 0);
  rig.torso.position.y = 0.14 - crouch * 0.2;

  rig.leftThigh.rotation.x = stride * 0.56 * weight * reduced;
  rig.rightThigh.rotation.x = -stride * 0.56 * weight * reduced;
  rig.leftKnee.rotation.x = Math.max(0, -stride) * 0.58 * weight * reduced;
  rig.rightKnee.rotation.x = Math.max(0, stride) * 0.58 * weight * reduced;
  rig.leftArm.rotation.set(-stride * 0.4 * weight * reduced + idleSway, 0, 0);
  rig.rightArm.rotation.set(stride * 0.4 * weight * reduced - idleSway, 0, 0);
  rig.leftElbow.rotation.set(0.06 * weight, 0, 0);
  rig.rightElbow.rotation.set(0.06 * weight, 0, 0);

  if (pose.state === "attack" || pose.state === "heavyAttack" || pose.state === "plunge") {
    rig.rightArm.rotation.x = progress < 0.42
      ? -0.68 * accent
      : 1.05 * accent;
    rig.rightElbow.rotation.x = -0.36 * accent;
    rig.leftArm.rotation.x = -0.22 * accent;
  } else if (pose.state === "block") {
    rig.leftArm.rotation.x = -0.72;
    rig.rightArm.rotation.x = -0.72;
    rig.leftElbow.rotation.x = -0.36;
    rig.rightElbow.rotation.x = -0.36;
  } else if (pose.state === "hit") {
    rig.leftArm.rotation.x = 0.62 * accent;
    rig.rightArm.rotation.x = -0.42 * accent;
  } else if (pose.state === "jump" || pose.state === "backflip" || pose.state === "dodge") {
    rig.leftArm.rotation.x = -0.82 * accent;
    rig.rightArm.rotation.x = -0.82 * accent;
  } else if (pose.state === "die") {
    rig.leftArm.rotation.x = 0.7 * progress;
    rig.rightArm.rotation.x = -0.7 * progress;
  }

  rig.root.updateMatrixWorld(true);
}

export function disposeProceduralHeroRig(rig: ProceduralHeroRig) {
  for (const geometry of rig.geometries) geometry.dispose();
  for (const material of rig.materials) material.dispose();
  rig.geometries.clear();
  rig.materials.clear();
}

export const PROCEDURAL_HERO_HEIGHT = HERO_HEIGHT;
