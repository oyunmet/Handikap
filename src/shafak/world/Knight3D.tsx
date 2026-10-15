import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  getProceduralAttackPose,
  getSpeakingGesturePose,
  type CharacterAnimationState,
} from "./character-animation";
import { solveTwoBoneLeg } from "./leg-ik";
import type { WorldMotion } from "./movement";
import { getKnightActorRootYaw, KNIGHT_CONFIG } from "./knight-config";
import type { EquipmentVisual } from "../game/store-types";

type Knight3DProps = {
  motionRef: MutableRefObject<WorldMotion>;
  state: CharacterAnimationState;
  motionReduced: boolean;
  animationTimeScale?: number;
  facingAngle?: number;
  talking?: boolean;
  footSlipRef?: MutableRefObject<number>;
  castShadow?: boolean;
  appearance?: EquipmentVisual;
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));

function createArmorMaps() {
  const size = 64;
  const colorData = new Uint8Array(size * size * 4);
  const roughnessData = new Uint8Array(size * size * 4);
  const normalData = new Uint8Array(size * size * 4);
  const height = new Float32Array(size * size);
  const hash = (x: number, y: number) => {
    const value = Math.sin(x * 91.7 + y * 247.3) * 13927.17;
    return value - Math.floor(value);
  };
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x;
      const noise = hash(x, y);
      const seam = x % 32 < 1 || y % 32 < 1;
      const scratch = (x + y * 3) % 47 < 1 && noise > 0.52;
      height[index] = (noise - 0.5) * 0.1 - (seam ? 0.12 : 0) + (scratch ? 0.08 : 0);
      const pixel = index * 4;
      const base = seam ? 137 : 222 + Math.round((noise - 0.5) * 19) - (scratch ? 18 : 0);
      colorData[pixel] = base;
      colorData[pixel + 1] = Math.max(0, base - (seam ? 2 : 4));
      colorData[pixel + 2] = Math.max(0, base - (seam ? 4 : 8));
      colorData[pixel + 3] = 255;
      roughnessData[pixel] = scratch ? 232 : seam ? 194 : 160 + Math.round(noise * 40);
      roughnessData[pixel + 1] = roughnessData[pixel];
      roughnessData[pixel + 2] = roughnessData[pixel];
      roughnessData[pixel + 3] = 255;
    }
  }
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const left = height[y * size + Math.max(0, x - 1)];
      const right = height[y * size + Math.min(size - 1, x + 1)];
      const above = height[Math.max(0, y - 1) * size + x];
      const below = height[Math.min(size - 1, y + 1) * size + x];
      const nx = -(right - left) * 4;
      const ny = -(below - above) * 4;
      const length = Math.hypot(nx, ny, 1);
      const pixel = (y * size + x) * 4;
      normalData[pixel] = Math.round((nx / length * 0.5 + 0.5) * 255);
      normalData[pixel + 1] = Math.round((ny / length * 0.5 + 0.5) * 255);
      normalData[pixel + 2] = Math.round((1 / length * 0.5 + 0.5) * 255);
      normalData[pixel + 3] = 255;
    }
  }
  const texture = (data: Uint8Array, colorSpace: THREE.ColorSpace = THREE.NoColorSpace) => {
    const result = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    result.wrapS = result.wrapT = THREE.RepeatWrapping;
    result.repeat.set(2, 2);
    result.colorSpace = colorSpace;
    result.generateMipmaps = true;
    result.minFilter = THREE.LinearMipmapLinearFilter;
    result.magFilter = THREE.LinearFilter;
    result.anisotropy = 4;
    result.needsUpdate = true;
    return result;
  };
  return {
    color: texture(colorData, THREE.SRGBColorSpace),
    normal: texture(normalData),
    roughness: texture(roughnessData),
  };
}

const ARMOR_MAPS = createArmorMaps();
const ARMOR_MAP_PROPS: THREE.MeshStandardMaterialParameters = {
  map: ARMOR_MAPS.color,
  normalMap: ARMOR_MAPS.normal,
  normalScale: new THREE.Vector2(0.17, 0.17),
  roughnessMap: ARMOR_MAPS.roughness,
};

function Cape({ motionRef, motionReduced, appearance }: Pick<Knight3DProps, "motionRef" | "motionReduced" | "appearance">) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => {
    const columns = 5;
    const rows = 7;
    const positions = new Float32Array((columns + 1) * (rows + 1) * 3);
    const uvs = new Float32Array((columns + 1) * (rows + 1) * 2);
    const indices: number[] = [];
    for (let row = 0; row <= rows; row += 1) {
      for (let column = 0; column <= columns; column += 1) {
        const vertex = row * (columns + 1) + column;
        uvs[vertex * 2] = column / columns;
        uvs[vertex * 2 + 1] = row / rows;
        if (row < rows && column < columns) {
          const nextRow = vertex + columns + 1;
          indices.push(vertex, nextRow, vertex + 1, vertex + 1, nextRow, nextRow + 1);
        }
      }
    }
    const result = new THREE.BufferGeometry();
    result.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    result.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    result.setIndex(indices);
    return result;
  }, []);
  const springs = useMemo(() => Array.from({ length: 8 }, () => ({ x: 0, z: 0, vx: 0, vz: 0 })), []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: appearance?.cape ?? KNIGHT_CONFIG.colors.cape,
    roughness: 0.82,
    metalness: 0.02,
    side: THREE.DoubleSide,
    flatShading: true,
  }), [appearance?.cape]);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const motion = motionRef.current;
    const time = state.clock.elapsedTime;
    const speed = Math.hypot(motion.velocityX, motion.velocityY);
    const wind = motionReduced ? 0 : Math.sin(time * 1.6) * 0.045;
    const targetPull = motionReduced ? 0.04 : clamp(0.07 + speed * 0.07, 0.07, 0.48);
    const timestep = Math.min(delta, 1 / 30);

    springs[0].x = 0;
    springs[0].z = 0;
    for (let row = 1; row < springs.length; row += 1) {
      const spring = springs[row];
      const previous = springs[row - 1];
      const targetX = Math.sin(time * 1.1 - row * 0.38) * wind * row;
      const targetZ = targetPull * row * 0.12 + Math.sin(time * 1.8 - row * 0.56) * wind * row;
      const stiffness = KNIGHT_CONFIG.animation.capeSpring / (1 + row * 0.14);
      spring.vx += ((targetX + previous.x * 0.12 - spring.x) * stiffness - spring.vx * KNIGHT_CONFIG.animation.capeDamping) * timestep;
      spring.vz += ((targetZ + previous.z * 0.16 - spring.z) * stiffness - spring.vz * KNIGHT_CONFIG.animation.capeDamping) * timestep;
      spring.x += spring.vx * timestep;
      spring.z += spring.vz * timestep;
    }

    const attribute = geometry.getAttribute("position") as THREE.BufferAttribute;
    const columns = 5;
    const rows = 7;
    const width = KNIGHT_CONFIG.proportions.capeWidth;
    const length = KNIGHT_CONFIG.proportions.capeLength * (appearance?.capeLength ?? 1);
    for (let row = 0; row <= rows; row += 1) {
      const t = row / rows;
      const spring = springs[row];
      const flare = 0.72 + t * 0.42;
      for (let column = 0; column <= columns; column += 1) {
        const across = column / columns - 0.5;
        const vertex = row * (columns + 1) + column;
        const edgeWave = Math.sin(time * 1.5 - row * 0.55 + column * 0.7) * wind * t * 0.18;
        attribute.setXYZ(
          vertex,
          across * width * flare + spring.x + edgeWave,
          -t * length,
          0.12 + spring.z + Math.abs(across) * t * 0.08,
        );
      }
    }
    attribute.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  return <mesh ref={meshRef} geometry={geometry} position={[0, 1.72, 0.12]} material={material} frustumCulled={false} />;
}

function ShoulderPad({ side }: { side: -1 | 1 }) {
  const localX = -side * 0.11;
  return (
    <>
      <mesh position={[localX, 0.06, 0]}>
        <sphereGeometry args={[0.225, 8, 6]} />
        <meshStandardMaterial {...ARMOR_MAP_PROPS} color={KNIGHT_CONFIG.colors.armor} roughness={0.43} metalness={0.78} flatShading />
      </mesh>
      <mesh position={[localX, 0.07, -0.038]} scale={[0.8, 0.18, 0.3]}>
        <boxGeometry args={[0.4, 0.1, 0.08]} />
        <meshStandardMaterial color={KNIGHT_CONFIG.colors.gold} roughness={0.34} metalness={0.7} />
      </mesh>
    </>
  );
}

export default function Knight3D({
  motionRef,
  state,
  motionReduced,
  animationTimeScale = 1,
  facingAngle,
  talking = false,
  footSlipRef,
  castShadow = true,
  appearance,
}: Knight3DProps) {
  const rootRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const mouthRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftElbowRef = useRef<THREE.Group>(null);
  const rightElbowRef = useRef<THREE.Group>(null);
  const rightWristRef = useRef<THREE.Group>(null);
  const leftHipRef = useRef<THREE.Group>(null);
  const rightHipRef = useRef<THREE.Group>(null);
  const leftKneeRef = useRef<THREE.Group>(null);
  const rightKneeRef = useRef<THREE.Group>(null);
  const leftAnkleRef = useRef<THREE.Group>(null);
  const rightAnkleRef = useRef<THREE.Group>(null);
  const shadowMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: "#08090d",
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  }), []);
  const previousState = useRef(state);
  const actionElapsed = useRef(0);
  const footLocks = useMemo(() => [
    { cycle: Number.NaN, distance: 0, depth: 0 },
    { cycle: Number.NaN, distance: 0, depth: 0 },
  ], []);

  useEffect(() => () => shadowMaterial.dispose(), [shadowMaterial]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const colorByOriginal = new Map<string, string | undefined>([
      [new THREE.Color(KNIGHT_CONFIG.colors.armor).getHexString(), appearance?.armor],
      [new THREE.Color(KNIGHT_CONFIG.colors.armorLight).getHexString(), appearance?.armorLight],
      [new THREE.Color(KNIGHT_CONFIG.colors.armorDark).getHexString(), appearance?.armorDark],
      [new THREE.Color(KNIGHT_CONFIG.colors.gold).getHexString(), appearance?.trim],
      [new THREE.Color(KNIGHT_CONFIG.colors.goldLight).getHexString(), appearance?.trim],
      [new THREE.Color(KNIGHT_CONFIG.colors.steel).getHexString(), appearance?.weaponColor],
    ]);
    root.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (!("color" in material) || !(material.color instanceof THREE.Color)) continue;
        const base = String(material.userData.equipmentBaseColor ?? material.color.getHexString());
        material.userData.equipmentBaseColor = base;
        const mapped = colorByOriginal.get(base);
        if (mapped) material.color.set(mapped);
        else if (colorByOriginal.has(base)) material.color.set(`#${base}`);
      }
    });
  }, [appearance]);

  useFrame((frame, delta) => {
    const root = rootRef.current;
    const torso = torsoRef.current;
    if (!root || !torso) return;
    const motion = motionRef.current;
    const time = frame.clock.elapsedTime;
    const dt = Math.min(delta, 1 / 30) * animationTimeScale;
    const speed = Math.hypot(motion.velocityX, motion.velocityY);
    const moving = speed > 0.14;
    const running = speed > 4.9;
    const strideAmplitude = moving
      ? (running ? KNIGHT_CONFIG.animation.runLegSwing : KNIGHT_CONFIG.animation.walkLegSwing)
      : 0;
    const reducedScale = motionReduced ? 0.42 : 1;
    const phase = motion.stepPhase;

    if (previousState.current !== state) {
      previousState.current = state;
      actionElapsed.current = 0;
    } else {
      actionElapsed.current += dt;
    }
    const weaponStyle = appearance?.weaponStyle ?? "sword";
    const attackTempo = weaponStyle === "daggers" ? 1.14
      : weaponStyle === "axe" ? 0.88
        : weaponStyle === "greatsword" ? 0.8
          : weaponStyle === "spear" ? 1.04
            : 1;
    const actionDuration = state === "die"
      ? 1.3
      : state === "jump" ? 0.7
        : state === "backflip" ? 0.48
          : state === "plunge" ? 0.62
            : (state === "heavyAttack" ? 0.52 : 0.36) / attackTempo;
    const actionProgress = clamp(actionElapsed.current / actionDuration, 0, 1);
    const combatPose = state === "attack" || state === "heavyAttack" || state === "plunge"
      ? getProceduralAttackPose(
          actionProgress,
          weaponStyle,
          state === "heavyAttack" || state === "plunge",
        )
      : null;
    const idle = state === "idle" || state === "walk" || state === "run";
    const actionSwing = Math.sin(actionProgress * Math.PI);
    const lateralPosition = motion.depth * 5.2;
    const idleWeightShift = !moving && !motionReduced ? Math.sin(time * 0.72) * 0.028 : 0;
    root.position.x += (lateralPosition + idleWeightShift - root.position.x) * (1 - Math.exp(-dt * 8));
    const bob = moving && !motionReduced ? Math.abs(Math.sin(phase * 2)) * (running ? 0.055 : 0.032) : 0;
    const deathDrop = state === "die" ? actionProgress * 0.08 : 0;
    root.position.y += (motion.jumpHeight + bob - deathDrop - root.position.y) * (1 - Math.exp(-dt * 14));
    const crouchScale = motion.crouching ? 0.72 : 1;
    root.scale.y += (crouchScale - root.scale.y) * (1 - Math.exp(-dt * 12));

    let targetYaw = facingAngle === undefined
      ? Math.atan2(-motion.velocityX, Math.max(0.01, Math.abs(motion.velocityY)))
      : getKnightActorRootYaw(facingAngle);
    if (facingAngle === undefined && motion.velocityY < -0.25) targetYaw = Math.PI + Math.atan2(motion.velocityX, Math.abs(motion.velocityY));
    if (facingAngle === undefined && (!moving || state === "die")) targetYaw = 0;
    root.rotation.y = THREE.MathUtils.damp(root.rotation.y, targetYaw, 7, dt);
    const backflipRotation = state === "backflip" ? actionProgress * Math.PI * 2 : 0;
    root.rotation.x = THREE.MathUtils.damp(root.rotation.x, backflipRotation, 14, dt);
    const fall = state === "die" ? actionProgress * Math.PI * 0.47 : 0;
    root.rotation.z = THREE.MathUtils.damp(root.rotation.z, fall, 5, dt);

    const idleBreath = motionReduced ? 0 : Math.sin(time * 1.45) * 0.014;
    const strideTwist = moving && !motionReduced ? Math.sin(phase) * 0.065 : idleBreath;
    torso.position.y = idleBreath;
    torso.rotation.y = strideTwist;
    torso.rotation.x = moving ? (running ? -0.045 : -0.018) : 0;
    if (combatPose) {
      torso.rotation.x = combatPose.bodyLean;
      torso.rotation.y = strideTwist + combatPose.bodyTwist;
    }
    if (state === "hit") torso.rotation.x = -0.18 * actionSwing;
    if (state === "jump") torso.rotation.x = -0.12;
    if (state === "plunge") torso.rotation.x = -0.32 * actionSwing;
    if (state === "dodge") {
      const facing = facingAngle ?? root.rotation.y;
      const forwardX = Math.sin(facing);
      const forwardZ = Math.cos(facing);
      const sideX = Math.cos(facing);
      const sideZ = -Math.sin(facing);
      const forwardMotion = motion.velocityX * forwardX + motion.velocityY * forwardZ;
      const sideMotion = motion.velocityX * sideX + motion.velocityY * sideZ;
      const rollWeight = Math.sin(actionProgress * Math.PI);
      torso.rotation.x = -Math.sign(forwardMotion || -1) * rollWeight * 0.34;
      torso.rotation.z = -Math.sign(sideMotion) * rollWeight * 0.72;
    }
    if (state === "backflip") torso.rotation.z = Math.sin(actionProgress * Math.PI * 2) * 0.24;
    if (state === "die") torso.rotation.x = actionProgress * 0.25;
    if (headRef.current) {
      headRef.current.rotation.x = -torso.rotation.x * 0.45;
      headRef.current.rotation.y = -torso.rotation.y * 0.65;
    }

    const strideMeters = KNIGHT_CONFIG.animation.walkStrideMeters * (running ? 1.14 : 1);
    const stanceFraction = running ? 0.48 : 0.62;
    let maximumFootSlip = 0;
    const solveFoot = (
      legPhase: number,
      plantedSide: -1 | 1,
      lockIndex: 0 | 1,
      hip: THREE.Group | null,
      knee: THREE.Group | null,
      ankle: THREE.Group | null,
    ) => {
      if (!hip || !knee || !ankle) return;
      const localPhase = ((legPhase / (Math.PI * 2)) % 1 + 1) % 1;
      let lift = 0;
      let strideZ = plantedSide * 0.14;
      if (moving && idle) {
        const cycleIndex = Math.floor(legPhase / (Math.PI * 2));
        const lock = footLocks[lockIndex];
        if (localPhase < stanceFraction) {
          if (lock.cycle !== cycleIndex) {
            lock.cycle = cycleIndex;
            lock.distance = motion.distance;
            lock.depth = root.position.x;
          }
          strideZ = motion.distance - lock.distance + plantedSide * 0.14;
          const footWorldZ = -motion.distance + strideZ;
          const plantedWorldZ = -lock.distance + plantedSide * 0.14;
          const plantedWorldX = lock.depth + plantedSide * 0.17;
          const targetWorldX = root.position.x + plantedSide * 0.17;
          maximumFootSlip = Math.max(
            maximumFootSlip,
            Math.hypot(targetWorldX - plantedWorldX, footWorldZ - plantedWorldZ),
          );
        } else {
          const swing = (localPhase - stanceFraction) / (1 - stanceFraction);
          strideZ = plantedSide * 0.14 - Math.sin(swing * Math.PI) * strideMeters * 0.2;
          lift = Math.sin(swing * Math.PI) * (running ? 0.2 : 0.13);
        }
      }
      const targetY = -0.84 + lift;
      const solve = solveTwoBoneLeg(targetY, strideZ, KNIGHT_CONFIG.proportions.thigh, KNIGHT_CONFIG.proportions.shin);
      const actionLeg = state === "dodge" || state === "backflip"
        ? Math.sin(actionProgress * Math.PI) * 0.32
        : state === "jump" ? Math.sin(actionProgress * Math.PI) * 0.5
          : state === "plunge" ? 0.18 : 0;
      hip.rotation.x = solve.hip * (moving && idle ? 1 : 0.12) * reducedScale - actionLeg;
      knee.rotation.x = (moving && idle ? solve.knee : 0.08) * reducedScale
        + (state === "dodge" || state === "backflip" ? 0.55 : state === "jump" ? 0.72 : 0);
      ankle.rotation.x = solve.ankle * (moving && idle ? 1 : 0.15) * reducedScale;
    };
    solveFoot(phase, 1, 0, leftHipRef.current, leftKneeRef.current, leftAnkleRef.current);
    solveFoot(phase + Math.PI, -1, 1, rightHipRef.current, rightKneeRef.current, rightAnkleRef.current);
    if (footSlipRef) footSlipRef.current = maximumFootSlip;

    const walkArm = Math.sin(phase + Math.PI) * strideAmplitude * reducedScale;
    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = walkArm * 0.76;
      leftArmRef.current.rotation.z = -0.06;
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.x = -walkArm * 0.76;
      rightArmRef.current.rotation.z = 0.08;
    }
    if (combatPose) {
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = combatPose.rightShoulderX;
        rightArmRef.current.rotation.z = combatPose.rightShoulderZ;
      }
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = combatPose.leftShoulderX;
        leftArmRef.current.rotation.z = combatPose.leftShoulderZ;
      }
      if (rightWristRef.current) {
        rightWristRef.current.rotation.set(combatPose.wristX, 0, combatPose.wristZ);
      }
    } else if (state === "block") {
      if (leftArmRef.current) leftArmRef.current.rotation.x = 0.58;
      if (rightArmRef.current) rightArmRef.current.rotation.x = 0.62;
    } else if (state === "jump") {
      if (leftArmRef.current) leftArmRef.current.rotation.x = -1.05;
      if (rightArmRef.current) rightArmRef.current.rotation.x = -1.12;
    } else if (state === "hit" && rightArmRef.current) {
      rightArmRef.current.rotation.x = 0.8 * actionSwing;
    }
    if (leftElbowRef.current) {
      leftElbowRef.current.rotation.x = combatPose?.leftElbowX ?? (moving ? Math.max(0, -walkArm) * 0.28 : 0.04);
    }
    if (rightElbowRef.current) {
      rightElbowRef.current.rotation.x = combatPose?.rightElbowX ?? (moving ? Math.max(0, walkArm) * 0.28 : 0.04);
    }
    if (rightWristRef.current && !combatPose) rightWristRef.current.rotation.set(0, 0, -0.2);
    if (state === "block") {
      if (leftElbowRef.current) leftElbowRef.current.rotation.x = 0.35;
      if (rightElbowRef.current) rightElbowRef.current.rotation.x = 0.32;
    }
    if (combatPose) {
      const drive = combatPose.strike;
      if (leftHipRef.current) {
        leftHipRef.current.rotation.x += -0.08 + drive * 0.12;
        leftHipRef.current.rotation.y = -0.08 + combatPose.bodyTwist * 0.42;
      }
      if (rightHipRef.current) {
        rightHipRef.current.rotation.x += 0.1 - drive * 0.16;
        rightHipRef.current.rotation.y = 0.08 - combatPose.bodyTwist * 0.42;
      }
      if (leftKneeRef.current) leftKneeRef.current.rotation.x += 0.18 + drive * 0.14;
      if (rightKneeRef.current) rightKneeRef.current.rotation.x += 0.12 + drive * 0.22;
      if (leftAnkleRef.current) leftAnkleRef.current.rotation.x -= 0.08 + drive * 0.06;
      if (rightAnkleRef.current) rightAnkleRef.current.rotation.x -= 0.06 + drive * 0.08;
    }
    if (state === "die") {
      if (leftArmRef.current) leftArmRef.current.rotation.x = actionProgress * 0.45;
      if (rightArmRef.current) rightArmRef.current.rotation.x = actionProgress * 0.6;
    }
    if (mouthRef.current) {
      mouthRef.current.scale.y = talking ? 0.62 + Math.abs(Math.sin(time * 10.5)) * 0.92 : 1;
    }
    if (talking) {
      const gesture = getSpeakingGesturePose(time);
      torso.rotation.y = strideTwist + gesture.bodyTwist;
      torso.rotation.z = Math.sin(time * 5.6) * 0.018;
      if (headRef.current) {
        headRef.current.rotation.x = 0.035 + Math.sin(time * 4.2) * 0.035;
        headRef.current.rotation.y = Math.sin(time * 3.1) * 0.035;
      }
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = gesture.leftShoulderX;
        leftArmRef.current.rotation.z = gesture.leftShoulderZ;
      }
      if (leftElbowRef.current) leftElbowRef.current.rotation.x = gesture.leftElbowX;
      if (rightElbowRef.current) rightElbowRef.current.rotation.x = 0.12 + Math.max(0, Math.sin(time * 5.2)) * 0.08;
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = -0.08 + Math.sin(time * 5.2) * 0.06;
        rightArmRef.current.rotation.z = 0.08;
      }
    }

    const shadow = root.children[0];
    if (shadow && shadow instanceof THREE.Mesh) {
      const shadowScale = clamp(1 + speed * 0.035, 1, 1.22);
      shadow.scale.set(shadowScale, 1, shadowScale * 1.35);
    }
  });

  useEffect(() => {
    const root = rootRef.current;
    root?.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || object.material === shadowMaterial) return;
      object.castShadow = castShadow;
    });
  }, [shadowMaterial, castShadow]);

  return (
    <group ref={rootRef} position={[0, 0, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} scale={[0.72, 1.02, 1]} material={shadowMaterial}>
        <circleGeometry args={[1, 24]} />
      </mesh>
      <Cape motionRef={motionRef} motionReduced={motionReduced} appearance={appearance} />
      <group ref={torsoRef} position={[0, 0, 0]}>
        <mesh position={[0, 1.26, 0]} scale={[0.31, 0.36, 0.2]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial {...ARMOR_MAP_PROPS} color={KNIGHT_CONFIG.colors.armor} roughness={0.48} metalness={0.72} flatShading />
        </mesh>
        <mesh position={[0, 1.28, -0.174]} scale={[0.235, 0.25, 0.055]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial {...ARMOR_MAP_PROPS} color={KNIGHT_CONFIG.colors.armorLight} roughness={0.42} metalness={0.78} flatShading />
        </mesh>
        <mesh position={[0, 1.08, -0.208]} scale={[0.13, 0.025, 0.025]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={KNIGHT_CONFIG.colors.gold} metalness={0.7} roughness={0.32} />
        </mesh>
        <mesh position={[0, 1.49, 0]}>
          <cylinderGeometry args={[0.17, 0.19, 0.15, 8]} />
          <meshStandardMaterial color={KNIGHT_CONFIG.colors.gold} roughness={0.35} metalness={0.68} />
        </mesh>
        <mesh position={[0, 1.65, 0]}>
          <cylinderGeometry args={[0.12, 0.15, 0.2, 7]} />
          <meshStandardMaterial color={KNIGHT_CONFIG.colors.armorDark} roughness={0.48} metalness={0.68} flatShading />
        </mesh>
        <mesh position={[0, 0.91, 0]}>
          <boxGeometry args={[0.52, 0.16, 0.34]} />
          <meshStandardMaterial color={KNIGHT_CONFIG.colors.armorDark} roughness={0.62} metalness={0.52} />
        </mesh>
        <group ref={headRef} position={[0, 1.76, 0]}>
          <mesh position={[0, 0.08, 0]} scale={[0.21, 0.25, 0.19]}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshStandardMaterial {...ARMOR_MAP_PROPS} color={KNIGHT_CONFIG.colors.armorDark} roughness={0.36} metalness={0.78} flatShading />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <coneGeometry args={[0.205, 0.2, 6]} />
            <meshStandardMaterial {...ARMOR_MAP_PROPS} color={KNIGHT_CONFIG.colors.armorLight} roughness={0.4} metalness={0.7} flatShading />
          </mesh>
          <mesh position={[0, 0.025, -0.176]} scale={[0.16, 0.055, 0.03]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#080a10" roughness={0.27} metalness={0.32} />
          </mesh>
          <mesh position={[0, 0.03, -0.202]} scale={[0.12, 0.012, 0.006]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color={appearance?.auraColor ?? KNIGHT_CONFIG.colors.visor}
              emissive={appearance?.auraColor ?? KNIGHT_CONFIG.colors.visor}
              emissiveIntensity={appearance?.armorStyle === "shadow" ? 0.8 : 0.52}
            />
          </mesh>
          <mesh ref={mouthRef} position={[0, -0.09, -0.215]}>
            <boxGeometry args={[0.16, 0.035, 0.016]} />
            <meshBasicMaterial color="#100f12" />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.12, 0.31, 0.02]} rotation={[0, 0, -side * 0.28]}>
              <coneGeometry args={[0.055, 0.22, 5]} />
              <meshStandardMaterial color={KNIGHT_CONFIG.colors.gold} metalness={0.62} roughness={0.36} flatShading />
            </mesh>
          ))}
          {appearance?.helmetColor && (
            <group position={[0, 0.19, 0]}>
              <mesh position={[0, 0.02, 0]}>
                <cylinderGeometry args={[0.12, 0.19, 0.18, 6]} />
                <meshStandardMaterial color={appearance.helmetColor} metalness={0.66} roughness={0.35} flatShading />
              </mesh>
              {appearance.helmetStyle === "horned" ? [-1, 1].map((side) => (
                <mesh key={side} position={[side * 0.17, 0.11, 0]} rotation={[0, 0, -side * 0.72]}>
                  <coneGeometry args={[0.055, 0.27, 5]} />
                  <meshStandardMaterial color={appearance.trim ?? appearance.helmetColor} metalness={0.7} roughness={0.3} flatShading />
                </mesh>
              )) : (
                <mesh position={[0, 0.15, -0.02]} rotation={[0, 0, Math.PI]}>
                  <coneGeometry args={[0.07, 0.19, 4]} />
                  <meshStandardMaterial color={appearance.trim ?? appearance.helmetColor} metalness={0.64} roughness={0.32} flatShading />
                </mesh>
              )}
            </group>
          )}
        </group>

        <group ref={leftArmRef} position={[-0.46, 1.48, 0]}>
          <ShoulderPad side={-1} />
          <mesh position={[0, -KNIGHT_CONFIG.proportions.upperArm / 2, 0]}>
            <cylinderGeometry args={[0.12, 0.145, KNIGHT_CONFIG.proportions.upperArm, 7]} />
            <meshStandardMaterial {...ARMOR_MAP_PROPS} color={KNIGHT_CONFIG.colors.armor} roughness={0.43} metalness={0.75} flatShading />
          </mesh>
          <group ref={leftElbowRef} position={[0, -0.43, 0]}>
            <mesh position={[0, 0, -0.01]}>
              <sphereGeometry args={[0.13, 7, 5]} />
              <meshStandardMaterial color={KNIGHT_CONFIG.colors.gold} roughness={0.35} metalness={0.72} />
            </mesh>
            <mesh position={[0, -KNIGHT_CONFIG.proportions.forearm / 2, 0]}>
              <cylinderGeometry args={[0.095, 0.13, KNIGHT_CONFIG.proportions.forearm, 7]} />
              <meshStandardMaterial {...ARMOR_MAP_PROPS} color={KNIGHT_CONFIG.colors.armorLight} roughness={0.4} metalness={0.78} flatShading />
            </mesh>
            <mesh position={[0, -0.37, -0.02]}>
              <boxGeometry args={[0.16, 0.15, 0.17]} />
              <meshStandardMaterial color={appearance?.gloveColor ?? KNIGHT_CONFIG.colors.armorDark} metalness={0.62} roughness={0.46} />
            </mesh>
            <mesh position={[0, -0.47, -0.01]} scale={[0.82, 0.75, 0.9]}>
              <dodecahedronGeometry args={[0.11, 0]} />
              <meshStandardMaterial color={KNIGHT_CONFIG.colors.leather} roughness={0.76} metalness={0.16} flatShading />
            </mesh>
              {appearance?.shieldColor && (
                <group position={[-0.25, -0.38, -0.16]} rotation={[0.1, 0, 0.1]}>
                  <mesh scale={appearance.shieldStyle === "tower" ? [0.82, 1.45, 0.3] : [0.9, 0.9, 0.3]}>
                    <dodecahedronGeometry args={[0.22, 0]} />
                    <meshStandardMaterial color={appearance.shieldColor} metalness={0.42} roughness={0.52} flatShading />
                  </mesh>
                  <mesh position={[0, 0, -0.07]}>
                    <boxGeometry args={[0.055, 0.32, 0.035]} />
                    <meshStandardMaterial color={appearance.trim ?? "#c99c52"} metalness={0.72} roughness={0.32} />
                  </mesh>
                </group>
              )}
              {appearance?.ringColor && (
                <mesh position={[0.09, -0.405, -0.105]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.045, 0.014, 4, 8]} />
                  <meshStandardMaterial color={appearance.ringColor} emissive={appearance.ringColor} emissiveIntensity={0.28} metalness={0.8} roughness={0.24} />
                </mesh>
              )}
          </group>
        </group>

        <group ref={rightArmRef} position={[0.46, 1.48, 0]}>
          <ShoulderPad side={1} />
          <mesh position={[0, -KNIGHT_CONFIG.proportions.upperArm / 2, 0]}>
            <cylinderGeometry args={[0.12, 0.145, KNIGHT_CONFIG.proportions.upperArm, 7]} />
            <meshStandardMaterial {...ARMOR_MAP_PROPS} color={KNIGHT_CONFIG.colors.armor} roughness={0.43} metalness={0.75} flatShading />
          </mesh>
          <group ref={rightElbowRef} position={[0, -0.43, 0]}>
            <mesh position={[0, 0, -0.01]}>
              <sphereGeometry args={[0.13, 7, 5]} />
              <meshStandardMaterial color={KNIGHT_CONFIG.colors.gold} roughness={0.35} metalness={0.72} />
            </mesh>
            <mesh position={[0, -KNIGHT_CONFIG.proportions.forearm / 2, 0]}>
              <cylinderGeometry args={[0.095, 0.13, KNIGHT_CONFIG.proportions.forearm, 7]} />
              <meshStandardMaterial {...ARMOR_MAP_PROPS} color={KNIGHT_CONFIG.colors.armorLight} roughness={0.4} metalness={0.78} flatShading />
            </mesh>
            <mesh position={[0, -0.37, -0.02]}>
              <boxGeometry args={[0.16, 0.15, 0.17]} />
              <meshStandardMaterial color={KNIGHT_CONFIG.colors.armorDark} metalness={0.62} roughness={0.46} />
            </mesh>
            <mesh position={[0, -0.47, -0.01]} scale={[0.82, 0.75, 0.9]}>
              <dodecahedronGeometry args={[0.11, 0]} />
              <meshStandardMaterial color={KNIGHT_CONFIG.colors.leather} roughness={0.76} metalness={0.16} flatShading />
            </mesh>
            <group ref={rightWristRef} position={[0.13, -0.4, -0.12]} rotation={[0, 0, -0.2]}>
              {(appearance?.weaponStyle ?? "sword") === "daggers" ? (
                [-1, 1].map((side) => (
                  <group key={side} position={[side * 0.055, 0.27, 0]} rotation={[0, 0, side * 0.14]}>
                    <mesh position={[0, 0.02, 0]}>
                      <cylinderGeometry args={[0.026, 0.036, 0.12, 6]} />
                      <meshStandardMaterial color={KNIGHT_CONFIG.colors.leather} roughness={0.74} />
                    </mesh>
                    <mesh position={[0, 0.28, 0]}>
                      <boxGeometry args={[0.078, 0.47, 0.032]} />
                      <meshStandardMaterial color={appearance?.weaponColor ?? KNIGHT_CONFIG.colors.steel} roughness={0.29} metalness={0.84} />
                    </mesh>
                    <mesh position={[0, 0.51, 0]} rotation={[0, 0, Math.PI]}>
                      <coneGeometry args={[0.031, 0.08, 4]} />
                      <meshStandardMaterial color={appearance?.weaponColor ?? KNIGHT_CONFIG.colors.steel} roughness={0.23} metalness={0.86} flatShading />
                    </mesh>
                  </group>
                ))
              ) : appearance?.weaponStyle === "axe" ? (
                <>
                  <mesh position={[0, 0.4, 0]}>
                    <cylinderGeometry args={[0.035, 0.045, 0.76, 6]} />
                    <meshStandardMaterial color={KNIGHT_CONFIG.colors.leather} roughness={0.74} />
                  </mesh>
                  <mesh position={[0.13, 0.66, 0]}>
                    <boxGeometry args={[0.25, 0.3, 0.055]} />
                    <meshStandardMaterial color={appearance.weaponColor ?? KNIGHT_CONFIG.colors.steel} roughness={0.29} metalness={0.84} />
                  </mesh>
                  <mesh position={[0.13, 0.66, -0.025]}>
                    <coneGeometry args={[0.15, 0.3, 4]} />
                    <meshStandardMaterial color={appearance.weaponColor ?? KNIGHT_CONFIG.colors.steel} roughness={0.23} metalness={0.86} flatShading />
                  </mesh>
                </>
              ) : appearance?.weaponStyle === "greatsword" ? (
                <>
                  <mesh position={[0, 0.03, 0]}>
                    <cylinderGeometry args={[0.035, 0.045, 0.17, 6]} />
                    <meshStandardMaterial color={KNIGHT_CONFIG.colors.leather} roughness={0.74} />
                  </mesh>
                  <mesh position={[0, 0.16, 0]}>
                    <boxGeometry args={[0.34, 0.065, 0.075]} />
                    <meshStandardMaterial color={appearance.weaponColor ?? KNIGHT_CONFIG.colors.steel} roughness={0.32} metalness={0.78} />
                  </mesh>
                  <mesh position={[0, 0.55, 0]}>
                    <boxGeometry args={[0.17, 0.82, 0.06]} />
                    <meshStandardMaterial color={appearance.weaponColor ?? KNIGHT_CONFIG.colors.steel} roughness={0.29} metalness={0.84} />
                  </mesh>
                  <mesh position={[0, 0.99, 0]} rotation={[0, 0, Math.PI]}>
                    <coneGeometry args={[0.085, 0.17, 4]} />
                    <meshStandardMaterial color={appearance.weaponColor ?? KNIGHT_CONFIG.colors.steel} roughness={0.23} metalness={0.86} flatShading />
                  </mesh>
                </>
              ) : appearance?.weaponStyle === "spear" ? (
                <>
                  <mesh position={[0, 0.42, 0]}>
                    <cylinderGeometry args={[0.024, 0.035, 1.15, 6]} />
                    <meshStandardMaterial color={KNIGHT_CONFIG.colors.leather} roughness={0.74} />
                  </mesh>
                  <mesh position={[0, 1.04, 0]} rotation={[0, 0, Math.PI]}>
                    <coneGeometry args={[0.085, 0.32, 5]} />
                    <meshStandardMaterial color={appearance.weaponColor ?? KNIGHT_CONFIG.colors.steel} roughness={0.23} metalness={0.86} flatShading />
                  </mesh>
                </>
              ) : appearance?.weaponStyle === "bow" ? (
                <>
                  <mesh position={[0, 0.47, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <torusGeometry args={[0.3, 0.034, 5, 12, Math.PI * 1.55]} />
                    <meshStandardMaterial color={appearance.weaponColor ?? "#c8905a"} roughness={0.6} metalness={0.12} />
                  </mesh>
                  <mesh position={[0, 0.48, -0.012]}>
                    <cylinderGeometry args={[0.009, 0.009, 0.56, 4]} />
                    <meshStandardMaterial color="#e0d2b8" roughness={0.65} />
                  </mesh>
                  <mesh position={[0.035, 0.47, -0.018]}>
                    <boxGeometry args={[0.012, 0.34, 0.008]} />
                    <meshStandardMaterial color="#ffe0a1" emissive="#ff9b48" emissiveIntensity={0.24} />
                  </mesh>
                </>
              ) : appearance?.weaponStyle === "staff" ? (
                <>
                  <mesh position={[0, 0.43, 0]}>
                    <cylinderGeometry args={[0.038, 0.05, 0.95, 6]} />
                    <meshStandardMaterial color={KNIGHT_CONFIG.colors.leather} roughness={0.72} />
                  </mesh>
                  <mesh position={[0, 0.95, 0]}>
                    <dodecahedronGeometry args={[0.13, 0]} />
                    <meshStandardMaterial color={appearance.weaponColor ?? "#c06b43"} emissive={appearance.auraColor ?? "#c06b43"} emissiveIntensity={0.5} flatShading />
                  </mesh>
                  <mesh position={[0, 0.7, 0]}>
                    <torusGeometry args={[0.085, 0.018, 4, 8]} />
                    <meshStandardMaterial color={appearance.weaponColor ?? "#c06b43"} metalness={0.68} roughness={0.28} />
                  </mesh>
                </>
              ) : appearance?.weaponStyle === "mace" ? (
                <>
                  <mesh position={[0, 0.38, 0]}>
                    <cylinderGeometry args={[0.045, 0.052, 0.72, 6]} />
                    <meshStandardMaterial color={KNIGHT_CONFIG.colors.leather} roughness={0.74} />
                  </mesh>
                  <mesh position={[0.02, 0.8, 0]}>
                    <dodecahedronGeometry args={[0.19, 0]} />
                    <meshStandardMaterial color={appearance.weaponColor ?? KNIGHT_CONFIG.colors.steel} metalness={0.74} roughness={0.28} flatShading />
                  </mesh>
                  {[-1, 1].map((side) => (
                    <mesh key={side} position={[side * 0.19, 0.8, 0]} rotation={[0, 0, -side * Math.PI / 2]}>
                      <coneGeometry args={[0.07, 0.2, 4]} />
                      <meshStandardMaterial color={appearance?.trim ?? "#bd9a5d"} metalness={0.58} roughness={0.34} />
                    </mesh>
                  ))}
                </>
              ) : (
                <>
                  <mesh position={[0, 0.02, 0]}>
                    <cylinderGeometry args={[0.035, 0.045, 0.17, 6]} />
                    <meshStandardMaterial color={KNIGHT_CONFIG.colors.leather} roughness={0.74} />
                  </mesh>
                  <mesh position={[0, 0.13, 0]}>
                    <boxGeometry args={[0.24, 0.055, 0.07]} />
                    <meshStandardMaterial color={appearance?.trim ?? KNIGHT_CONFIG.colors.gold} roughness={0.32} metalness={0.76} />
                  </mesh>
                  <mesh position={[0, 0.47, 0]}>
                    <boxGeometry args={[0.13, 0.68, 0.05]} />
                    <meshStandardMaterial
                      color={appearance?.weaponColor ?? KNIGHT_CONFIG.colors.steel}
                      emissive={appearance?.weaponColor ?? KNIGHT_CONFIG.colors.steel}
                      emissiveIntensity={0.12}
                      roughness={0.29}
                      metalness={0.84}
                    />
                  </mesh>
                  <mesh position={[0, 0.47, -0.026]}>
                    <boxGeometry args={[0.02, 0.38, 0.01]} />
                    <meshStandardMaterial
                      color={appearance?.auraColor ?? "#f5c175"}
                      emissive={appearance?.auraColor ?? "#f5c175"}
                      emissiveIntensity={0.72}
                      toneMapped={false}
                    />
                  </mesh>
                  <mesh position={[0, 0.81, 0]} rotation={[0, 0, Math.PI]}>
                    <coneGeometry args={[0.052, 0.16, 4]} />
                    <meshStandardMaterial color={appearance?.weaponColor ?? "#dce0e3"} roughness={0.23} metalness={0.86} flatShading />
                  </mesh>
                </>
              )}
            </group>
          </group>
        </group>

        <group ref={leftHipRef} position={[-0.17, 0.9, 0]}>
          <mesh position={[0, -KNIGHT_CONFIG.proportions.thigh / 2, 0]}>
            <cylinderGeometry args={[0.15, 0.13, KNIGHT_CONFIG.proportions.thigh, 7]} />
            <meshStandardMaterial color={KNIGHT_CONFIG.colors.armorDark} roughness={0.62} metalness={0.48} flatShading />
          </mesh>
          <mesh position={[0, -0.27, -0.13]}>
            <boxGeometry args={[0.25, 0.32, 0.08]} />
            <meshStandardMaterial color={KNIGHT_CONFIG.colors.armor} roughness={0.48} metalness={0.7} />
          </mesh>
          <group ref={leftKneeRef} position={[0, -KNIGHT_CONFIG.proportions.thigh, 0]}>
            <mesh position={[0, -0.035, -0.045]} scale={[1, 1, 0.48]}>
              <sphereGeometry args={[0.15, 7, 5]} />
              <meshStandardMaterial color={KNIGHT_CONFIG.colors.gold} metalness={0.67} roughness={0.35} flatShading />
            </mesh>
            <group ref={leftAnkleRef}>
              <mesh position={[0, -KNIGHT_CONFIG.proportions.shin / 2, 0]}>
                <cylinderGeometry args={[0.105, 0.135, KNIGHT_CONFIG.proportions.shin, 7]} />
                <meshStandardMaterial color={KNIGHT_CONFIG.colors.armorLight} roughness={0.42} metalness={0.74} flatShading />
              </mesh>
              <mesh position={[0, -0.35, -0.04]}>
                <boxGeometry args={[0.2, 0.18, 0.08]} />
                <meshStandardMaterial color={appearance?.bootColor ?? KNIGHT_CONFIG.colors.gold} metalness={0.64} roughness={0.36} />
              </mesh>
              <mesh position={[0, -KNIGHT_CONFIG.proportions.shin - 0.035, -0.105]}>
                <boxGeometry args={[0.24, 0.14, KNIGHT_CONFIG.proportions.foot]} />
                <meshStandardMaterial color={appearance?.bootColor ?? KNIGHT_CONFIG.colors.armorDark} roughness={0.5} metalness={0.65} />
              </mesh>
            </group>
          </group>
        </group>

        <group ref={rightHipRef} position={[0.17, 0.9, 0]}>
          <mesh position={[0, -KNIGHT_CONFIG.proportions.thigh / 2, 0]}>
            <cylinderGeometry args={[0.15, 0.13, KNIGHT_CONFIG.proportions.thigh, 7]} />
            <meshStandardMaterial color={KNIGHT_CONFIG.colors.armorDark} roughness={0.62} metalness={0.48} flatShading />
          </mesh>
          <mesh position={[0, -0.27, -0.13]}>
            <boxGeometry args={[0.25, 0.32, 0.08]} />
            <meshStandardMaterial color={KNIGHT_CONFIG.colors.armor} roughness={0.48} metalness={0.7} />
          </mesh>
          <group ref={rightKneeRef} position={[0, -KNIGHT_CONFIG.proportions.thigh, 0]}>
            <mesh position={[0, -0.035, -0.045]} scale={[1, 1, 0.48]}>
              <sphereGeometry args={[0.15, 7, 5]} />
              <meshStandardMaterial color={KNIGHT_CONFIG.colors.gold} metalness={0.67} roughness={0.35} flatShading />
            </mesh>
            <group ref={rightAnkleRef}>
              <mesh position={[0, -KNIGHT_CONFIG.proportions.shin / 2, 0]}>
                <cylinderGeometry args={[0.105, 0.135, KNIGHT_CONFIG.proportions.shin, 7]} />
                <meshStandardMaterial color={KNIGHT_CONFIG.colors.armorLight} roughness={0.42} metalness={0.74} flatShading />
              </mesh>
              <mesh position={[0, -0.35, -0.04]}>
                <boxGeometry args={[0.2, 0.18, 0.08]} />
                <meshStandardMaterial color={KNIGHT_CONFIG.colors.gold} metalness={0.64} roughness={0.36} />
              </mesh>
              <mesh position={[0, -KNIGHT_CONFIG.proportions.shin - 0.035, -0.105]}>
                <boxGeometry args={[0.24, 0.14, KNIGHT_CONFIG.proportions.foot]} />
                <meshStandardMaterial color={KNIGHT_CONFIG.colors.armorDark} roughness={0.5} metalness={0.65} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
