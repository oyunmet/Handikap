import * as THREE from "three";
import type { CharacterAnimationState } from "./character-animation";
import type { EquipmentVisual } from "../game/store-types";
import {
  createFacetedArmorPlateGeometry,
  createFacetedBootGeometry,
  createFacetedProfileGeometry,
  createHumanHeadGeometry,
  createHumanJointGeometry,
  createHumanLimbGeometry,
  createHumanTorsoGeometry,
} from "./human-character-geometry";

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
  leftHand: THREE.Group;
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
  const steel = material(appearance.armorLight ?? "#7c8589", 0.42, 0.46);
  const steelEdge = material(appearance.trim ?? "#c49b5b", 0.36, 0.52);
  const trim = material(appearance.trim ?? "#c49b5b", 0.42, 0.38);
  const leather = material("#543a2e", 0.86, 0.03);
  const leatherLight = material("#75513a", 0.8, 0.04);
  const glove = material(appearance.gloveColor ?? "#443632");
  const boot = material(appearance.bootColor ?? "#49352e");
  const cape = material(appearance.cape ?? "#8f3540", 0.9);
  const skin = material("#c58c68");
  const hair = material(appearance.helmetColor ?? "#624632");
  const faceDetail = material("#332a25", 0.8);
  const eyeWhite = material("#e4d5b9", 0.7);

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
    leftHand: new THREE.Group(),
    rightHand: new THREE.Group(),
    geometries: new Set<THREE.BufferGeometry>(),
    materials,
  } satisfies ProceduralHeroRig;

  rig.torso.name = "Torso";
  rig.torso.position.set(0, 0.14, 0);
  rig.hips.add(rig.torso);
  addMesh(
    rig.hips,
    createFacetedProfileGeometry([
      { y: -0.1, width: 0.12, depth: 0.09 },
      { y: -0.045, width: 0.17, depth: 0.115 },
      { y: 0.05, width: 0.18, depth: 0.12 },
      { y: 0.1, width: 0.13, depth: 0.1 },
    ], 8),
    dark,
    [0, 0, 0],
    rig,
  ).name = "hero-shaped-pelvis";
  addMesh(
    rig.hips,
    createFacetedProfileGeometry([
      { y: 0.005, width: 0.185, depth: 0.12 },
      { y: 0.035, width: 0.19, depth: 0.123 },
      { y: 0.075, width: 0.185, depth: 0.12 },
    ], 12),
    leather,
    [0, 0.04, 0],
    rig,
  );
  addBox(rig.hips, [0.125, 0.11, 0.045], steelEdge, [0, 0.04, 0.128], rig);
  addBox(rig.hips, [0.07, 0.065, 0.018], leather, [0, 0.04, 0.153], rig);
  for (const side of [-1, 1]) {
    const pouch = addBox(rig.hips, [0.105, 0.12, 0.105], leatherLight, [side * 0.22, 0.005, 0.03], rig);
    pouch.rotation.z = -side * 0.12;
    addBox(rig.hips, [0.095, 0.025, 0.02], trim, [side * 0.22, -0.012, 0.087], rig);
  }
  addBox(rig.hips, [0.14, 0.25, 0.055], cloth, [0, -0.17, 0.12], rig);
  addBox(rig.hips, [0.12, 0.025, 0.02], trim, [0, -0.28, 0.152], rig);

  const torso = addMesh(rig.torso, createHumanTorsoGeometry(), cloth, [0, 0.18, 0], rig);
  torso.scale.set(0.215, 0.39, 0.13);
  torso.name = "hero-anatomical-faceted-torso";
  addBox(rig.torso, [0.36, 0.1, 0.265], clothLight, [0, 0.22, 0.01], rig);
  addBox(rig.torso, [0.3, 0.055, 0.27], trim, [0, 0.015, 0.015], rig);
  addBox(rig.torso, [0.075, 0.18, 0.045], leather, [0, 0.17, 0.137], rig);
  const chestPlate = addMesh(
    rig.torso,
    createFacetedArmorPlateGeometry(0.35, 0.34, 0.035),
    steel,
    [0, 0.205, 0.14],
    rig,
  );
  chestPlate.name = "hero-layered-chest-plate";
  addMesh(
    rig.torso,
    new THREE.OctahedronGeometry(0.063, 0),
    steelEdge,
    [0, 0.22, 0.2],
    rig,
  ).name = "hero-chest-badge";
  addBox(rig.torso, [0.018, 0.21, 0.018], trim, [0, 0.195, 0.19], rig);
  for (const side of [-1, 1]) {
    const chestRivet = addSphere(rig.torso, 0.017, steelEdge, [side * 0.14, 0.13, 0.185], rig);
    chestRivet.name = `hero-chest-rivet-${side}`;
    const seam = addBox(rig.torso, [0.012, 0.22, 0.012], leather, [side * 0.16, 0.19, 0.157], rig);
    seam.rotation.z = side * -0.18;
  }
  const harness = addBox(rig.torso, [0.045, 0.38, 0.028], leatherLight, [-0.15, 0.18, 0.135], rig);
  harness.rotation.z = -0.38;

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
  addBox(rig.torso, [0.34, 0.025, 0.018], trim, [0, -0.235, -0.145], rig);
  addSphere(rig.torso, 0.045, steelEdge, [0, 0.34, -0.035], rig, [1.1, 0.8, 0.65]);

  rig.head = group(rig.torso, "Head", [0, 0.48, 0]);
  addMesh(
    rig.head,
    createHumanLimbGeometry("shin"),
    skin,
    [0, -0.12, 0],
    rig,
  ).scale.set(0.052, 0.12, 0.05);
  const head = addMesh(rig.head, createHumanHeadGeometry(), skin, [0, 0.015, 0], rig);
  head.scale.set(0.14, 0.29, 0.13);
  head.name = "hero-faceted-human-head";
  addSphere(rig.head, 0.145, hair, [0, 0.09, -0.014], rig, [0.98, 0.67, 0.98]);
  addSphere(rig.head, 0.07, hair, [0, -0.035, -0.085], rig, [1.6, 1.5, 1.05]);
  addBox(rig.head, [0.16, 0.035, 0.04], hair, [0, 0.102, 0.112], rig);
  for (const side of [-1, 1]) {
    addSphere(rig.head, 0.021, skin, [side * 0.119, -0.005, -0.005], rig, [0.58, 0.85, 0.75]);
    addSphere(rig.head, 0.016, eyeWhite, [side * 0.047, 0.018, 0.118], rig, [1.15, 0.72, 0.45]);
    addSphere(rig.head, 0.008, faceDetail, [side * 0.047, 0.018, 0.126], rig, [1.1, 0.8, 0.5]);
    const brow = addBox(rig.head, [0.048, 0.012, 0.018], hair, [side * 0.047, 0.049, 0.119], rig);
    brow.rotation.z = side * 0.12;
    const lock = addMesh(
      rig.head,
      new THREE.ConeGeometry(0.042, 0.12, 5),
      hair,
      [side * 0.107, -0.02, 0.01],
      rig,
    );
    lock.rotation.z = side * -0.52;
  }
  addMesh(
    rig.head,
    new THREE.ConeGeometry(0.024, 0.075, 5),
    skin,
    [0, -0.025, 0.14],
    rig,
    [Math.PI / 2, 0, 0],
  );

  for (const [side, thigh, knee] of [
    [-1, rig.leftThigh, rig.leftKnee],
    [1, rig.rightThigh, rig.rightKnee],
  ] as const) {
    const sideName = side < 0 ? "left" : "right";
    thigh.name = side < 0 ? "LeftThigh" : "RightThigh";
    thigh.position.set(side * 0.105, -0.08, 0);
    rig.hips.add(thigh);
    const thighMesh = addMesh(
      thigh,
      createHumanLimbGeometry("thigh"),
      dark,
      [0, -0.155, 0],
      rig,
    );
    thighMesh.scale.set(0.083, 0.31, 0.075);
    const kneeCap = addMesh(
      thigh,
      createHumanJointGeometry(),
      leatherLight,
      [0, -0.305, 0.006],
      rig,
    );
    kneeCap.scale.set(0.065, 0.07, 0.052);
    kneeCap.name = `hero-knee-cap-${sideName}`;
    knee.name = side < 0 ? "LeftKnee" : "RightKnee";
    knee.position.y = -0.32;
    thigh.add(knee);
    const shin = addMesh(
      knee,
      createHumanLimbGeometry("shin"),
      dark,
      [0, -0.13, 0],
      rig,
    );
    shin.scale.set(0.066, 0.26, 0.061);
    const bootShaft = addMesh(
      knee,
      createHumanLimbGeometry("shin"),
      boot,
      [0, -0.205, 0.012],
      rig,
    );
    bootShaft.scale.set(0.071, 0.17, 0.068);
    const bootFoot = addMesh(
      knee,
      createFacetedBootGeometry(),
      boot,
      [0, -0.29, 0.065],
      rig,
    );
    bootFoot.scale.set(0.17, 0.1, 0.23);
    const kneeGuard = addMesh(
      knee,
      createFacetedArmorPlateGeometry(0.15, 0.1, 0.035),
      steel,
      [0, -0.015, 0.071],
      rig,
    );
    kneeGuard.name = `hero-articulated-knee-guard-${sideName}`;
    addBox(knee, [0.035, 0.11, 0.025], trim, [0, -0.12, 0.097], rig);
    addBox(knee, [0.18, 0.04, 0.17], leatherLight, [0, -0.28, 0.082], rig);
  }

  for (const [side, arm, elbow] of [
    [-1, rig.leftArm, rig.leftElbow],
    [1, rig.rightArm, rig.rightElbow],
  ] as const) {
    const sideName = side < 0 ? "left" : "right";
    arm.name = side < 0 ? "LeftShoulder" : "RightShoulder";
    arm.position.set(side * 0.27, 0.23, 0);
    rig.torso.add(arm);
    const pauldron = addMesh(
      arm,
      createFacetedArmorPlateGeometry(0.23, 0.18, 0.055),
      steel,
      [side * 0.015, 0.015, 0.045],
      rig,
    );
    pauldron.name = `hero-layered-pauldron-${sideName}`;
    const shoulderMuscle = addMesh(
      arm,
      createHumanJointGeometry(),
      cloth,
      [side * 0.015, -0.09, -0.008],
      rig,
    );
    shoulderMuscle.scale.set(0.06, 0.13, 0.06);
    addSphere(arm, 0.018, steelEdge, [side * 0.07, 0.036, 0.075], rig);
    addSphere(arm, 0.018, steelEdge, [-side * 0.04, 0.036, 0.075], rig);
    const upperArm = addMesh(
      arm,
      createHumanLimbGeometry("upperArm"),
      cloth,
      [0, -0.145, 0],
      rig,
    );
    upperArm.scale.set(0.078, 0.29, 0.068);
    elbow.name = side < 0 ? "LeftElbow" : "RightElbow";
    elbow.position.y = -0.28;
    arm.add(elbow);
    const elbowJoint = addMesh(
      elbow,
      createHumanJointGeometry(),
      leatherLight,
      [0, 0, 0],
      rig,
    );
    elbowJoint.scale.set(0.047, 0.052, 0.042);
    elbowJoint.name = `hero-articulated-elbow-${sideName}`;
    const forearm = addMesh(
      elbow,
      createHumanLimbGeometry("forearm"),
      glove,
      [0, -0.115, 0],
      rig,
    );
    forearm.scale.set(0.066, 0.23, 0.058);
    const bracer = addMesh(
      elbow,
      createHumanLimbGeometry("forearm"),
      steel,
      [0, -0.12, 0.012],
      rig,
    );
    bracer.scale.set(0.071, 0.18, 0.062);
    bracer.name = `hero-forearm-bracer-${sideName}`;
    const bracerStripe = addBox(elbow, [0.022, 0.14, 0.022], trim, [side * -0.015, -0.12, 0.071], rig);
    bracerStripe.rotation.z = side * 0.08;
    const cuff = addMesh(
      elbow,
      new THREE.TorusGeometry(0.065, 0.012, 5, 10),
      steelEdge,
      [0, -0.03, 0.006],
      rig,
    );
    cuff.rotation.x = Math.PI / 2;
    const hand = group(elbow, side < 0 ? "LeftHand" : "RightHand", [0, -0.25, 0]);
    const palm = addMesh(hand, createHumanJointGeometry(), glove, [0, -0.025, 0], rig);
    palm.scale.set(0.056, 0.075, 0.045);
    addMesh(
      hand,
      createFacetedArmorPlateGeometry(0.074, 0.052, 0.018),
      steel,
      [0, 0.007, 0.039],
      rig,
    );
    for (let finger = 0; finger < 4; finger += 1) {
      const fingerOffset = (finger - 1.5) * 0.027;
      const fingerLength = 0.066 - Math.abs(finger - 1.5) * 0.008;
      const fingerGroup = group(hand, `hero-finger-${sideName}-${finger}`, [
        fingerOffset,
        -0.061,
        0.008,
      ]);
      const proximal = addMesh(
        fingerGroup,
        createHumanLimbGeometry("finger", 6),
        glove,
        [0, -fingerLength * 0.26, 0],
        rig,
      );
      proximal.scale.set(0.012, fingerLength * 0.58, 0.012);
      const distal = addMesh(
        fingerGroup,
        createHumanLimbGeometry("finger", 6),
        glove,
        [0, -fingerLength * 0.72, 0.004],
        rig,
      );
      distal.scale.set(0.01, fingerLength * 0.42, 0.01);
    }
    const thumb = group(hand, `hero-thumb-${sideName}`, [side * 0.048, -0.018, 0.014]);
    thumb.rotation.z = -side * 0.64;
    const thumbSegment = addMesh(
      thumb,
      createHumanLimbGeometry("finger", 6),
      glove,
      [0, -0.027, 0],
      rig,
    );
    thumbSegment.scale.set(0.014, 0.065, 0.014);
    if (side < 0) {
      rig.leftHand.position.set(0, -0.025, 0.015);
      hand.add(rig.leftHand);
    } else {
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
