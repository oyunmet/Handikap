import { useEffect, useMemo, useRef } from "react";
import type { KnightActorProps } from "./KnightActor";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type Props = Pick<
  KnightActorProps,
  | "motionRef"
  | "state"
  | "motionReduced"
  | "animationTimeScale"
  | "animationPaused"
  | "facingAngle"
  | "debugUpright"
  | "footSlipRef"
  | "modelAnimationState"
>;

const IRON = "#30363d";
const IRON_LIGHT = "#727c84";
const IRON_DARK = "#191d23";
const RED = "#a62f39";
const RED_LIGHT = "#e2534e";
const GOLD = "#bd9659";

export default function IronCrownActor({
  motionRef,
  state,
  motionReduced,
  animationTimeScale = 1,
  animationPaused = false,
  facingAngle,
  debugUpright = false,
  footSlipRef,
  modelAnimationState,
}: Props) {
  const rootRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const previousActionRef = useRef("");
  const actionElapsedRef = useRef(0);
  const warnedTiltRef = useRef(false);
  const idleMaterials = useMemo(() => ({
    iron: new THREE.MeshStandardMaterial({ color: IRON, metalness: 0.66, roughness: 0.56, flatShading: true }),
    ironLight: new THREE.MeshStandardMaterial({ color: IRON_LIGHT, metalness: 0.72, roughness: 0.42, flatShading: true }),
    ironDark: new THREE.MeshStandardMaterial({ color: IRON_DARK, metalness: 0.48, roughness: 0.7, flatShading: true }),
    red: new THREE.MeshStandardMaterial({ color: RED, metalness: 0.5, roughness: 0.46, flatShading: true }),
    redLight: new THREE.MeshStandardMaterial({ color: RED_LIGHT, emissive: RED, emissiveIntensity: 0.3, metalness: 0.46, roughness: 0.4 }),
    gold: new THREE.MeshStandardMaterial({ color: GOLD, metalness: 0.7, roughness: 0.38, flatShading: true }),
    blade: new THREE.MeshStandardMaterial({ color: "#b9bec1", metalness: 0.84, roughness: 0.28, flatShading: true }),
  }), []);

  useEffect(() => () => {
    Object.values(idleMaterials).forEach((material) => material.dispose());
  }, [idleMaterials]);

  useFrame((frame, delta) => {
    const root = rootRef.current;
    if (!root) return;
    const motion = motionRef.current;
    const dt = Math.min(delta, 0.05);
    const speed = Math.hypot(motion.velocityX, motion.velocityY);
    const action = modelAnimationState ?? state;
    const actionKey = action === "attack" || action === "heavyAttack" || action === "plunge"
      || action === "castFire" || action === "castLightning"
      ? action
      : "";
    if (actionKey !== previousActionRef.current) {
      previousActionRef.current = actionKey;
      actionElapsedRef.current = 0;
    } else if (!animationPaused) {
      actionElapsedRef.current += dt * animationTimeScale;
    }

    root.position.set(motion.depth * 5.2, motion.jumpHeight, 0);
    const targetYaw = facingAngle === undefined
      ? motion.velocityY < -0.25
        ? Math.PI + Math.atan2(motion.velocityX, Math.abs(motion.velocityY))
        : Math.atan2(-motion.velocityX, Math.max(0.01, Math.abs(motion.velocityY)))
      : facingAngle;
    const yawDelta = Math.atan2(
      Math.sin(targetYaw - root.rotation.y),
      Math.cos(targetYaw - root.rotation.y),
    );
    root.rotation.y += yawDelta * (1 - Math.exp(-dt * (facingAngle === undefined ? 12 : 10)));
    root.rotation.x = 0;
    root.rotation.z = 0;

    if (debugUpright) {
      const tilted = Math.abs(root.rotation.x) > 0.05 || Math.abs(root.rotation.z) > 0.05;
      if (tilted && !warnedTiltRef.current) {
        console.warn("[shafak-model] Demir Taç root tilt exceeded 0.05 radians.", {
          x: root.rotation.x,
          z: root.rotation.z,
          state,
        });
      }
      warnedTiltRef.current = tilted;
    }
    if (footSlipRef) footSlipRef.current = 0;
    if (animationPaused) return;

    const reducedScale = motionReduced ? 0.32 : 1;
    const walkWeight = THREE.MathUtils.clamp(speed / 3.5, 0, 1);
    const phase = motion.stepPhase;
    const breathing = Math.sin(frame.clock.elapsedTime * 1.35) * 0.018 * reducedScale;
    const attackProgress = THREE.MathUtils.clamp(actionElapsedRef.current / 0.56, 0, 1);
    const attackSwing = actionKey ? Math.sin(attackProgress * Math.PI) : 0;
    const runSwing = Math.sin(phase) * walkWeight * 0.3 * reducedScale;

    if (torsoRef.current) {
      torsoRef.current.position.y = breathing;
      torsoRef.current.rotation.x = actionKey ? -attackSwing * 0.09 : 0;
    }
    if (headRef.current) headRef.current.rotation.z = Math.sin(frame.clock.elapsedTime * 0.7) * 0.012 * reducedScale;
    if (leftArmRef.current) {
      leftArmRef.current.rotation.set(0.12 + runSwing * 0.7, 0, 0.08);
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.set(-0.28 - attackSwing * 1.05 - runSwing * 0.7, 0, -0.12);
    }
    if (leftLegRef.current) leftLegRef.current.rotation.x = Math.sin(phase) * walkWeight * 0.34 * reducedScale;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -Math.sin(phase) * walkWeight * 0.34 * reducedScale;
  });

  return (
    <group ref={rootRef} name="character-actor-root iron-crown-root">
      <mesh name="iron-crown-contact-shadow" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} scale={[0.82, 0.6, 1]}>
        <circleGeometry args={[1, 28]} />
        <meshBasicMaterial color="#08090d" transparent opacity={0.48} depthWrite={false} />
      </mesh>
      <group ref={torsoRef} name="iron-crown-torso">
        <group name="iron-crown-pelvis" position={[0, 0.91, 0]}>
          <mesh material={idleMaterials.ironDark} position={[0, 0, 0]} scale={[0.37, 0.23, 0.27]}>
            <dodecahedronGeometry args={[1, 0]} />
          </mesh>
          <mesh material={idleMaterials.red} position={[0, -0.03, 0.285]} scale={[0.34, 0.07, 0.035]}>
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
          <mesh material={idleMaterials.gold} position={[0, 0, 0.32]} scale={[0.1, 0.11, 0.05]}>
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
        </group>
        <group name="iron-crown-chest" position={[0, 1.31, 0]}>
          <mesh material={idleMaterials.iron} scale={[0.43, 0.48, 0.31]}>
            <capsuleGeometry args={[0.36, 0.42, 4, 8]} />
          </mesh>
          <mesh material={idleMaterials.ironLight} position={[0, 0.03, 0.268]} scale={[0.29, 0.27, 0.045]}>
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
          <mesh material={idleMaterials.red} position={[0, 0.015, 0.314]} scale={[0.08, 0.29, 0.018]}>
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
          <mesh material={idleMaterials.gold} position={[0, -0.23, 0.31]} scale={[0.22, 0.035, 0.035]}>
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
        </group>
        {[-1, 1].map((side) => (
          <group key={side} name={`iron-crown-pauldron-${side}`} position={[side * 0.49, 1.59, 0]}>
            <mesh material={idleMaterials.ironLight} scale={[0.32, 0.25, 0.31]}>
              <dodecahedronGeometry args={[1, 0]} />
            </mesh>
            <mesh material={idleMaterials.red} position={[side * 0.04, -0.04, 0.266]} scale={[0.16, 0.08, 0.025]}>
              <boxGeometry args={[1, 1, 1]} />
            </mesh>
          </group>
        ))}
        <group ref={headRef} name="iron-crown-helmet" position={[0, 1.88, 0]}>
          <mesh material={idleMaterials.ironDark} scale={[0.26, 0.29, 0.24]}>
            <sphereGeometry args={[1, 12, 9]} />
          </mesh>
          <mesh material={idleMaterials.ironLight} position={[0, -0.08, 0.177]} scale={[0.21, 0.11, 0.08]}>
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
          <mesh material={idleMaterials.iron} position={[0, -0.16, 0.17]} scale={[0.2, 0.06, 0.08]}>
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
          <mesh material={idleMaterials.redLight} position={[0, -0.08, 0.262]} scale={[0.048, 0.045, 0.026]}>
            <octahedronGeometry args={[1, 0]} />
          </mesh>
          <mesh material={idleMaterials.gold} position={[0, 0.23, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.29, 0.29, 0.035]}>
            <torusGeometry args={[0.75, 0.12, 6, 12]} />
          </mesh>
          {[-0.22, 0, 0.22].map((x, index) => (
            <mesh
              key={x}
              material={index === 1 ? idleMaterials.red : idleMaterials.ironLight}
              position={[x, 0.39 - Math.abs(x) * 0.14, 0]}
              rotation={[0, 0, x * -1.2]}
              scale={[0.08, index === 1 ? 0.32 : 0.24, 0.075]}
            >
              <coneGeometry args={[0.46, 1, 5]} />
            </mesh>
          ))}
        </group>
      </group>

      <group ref={leftLegRef} name="iron-crown-left-leg" position={[-0.2, 0.8, 0]}>
        <mesh material={idleMaterials.ironDark} position={[0, -0.18, 0]} scale={[0.22, 0.33, 0.23]}>
          <capsuleGeometry args={[0.16, 0.31, 3, 7]} />
        </mesh>
        <mesh material={idleMaterials.ironLight} position={[0, -0.49, 0.025]} scale={[0.19, 0.32, 0.22]}>
          <capsuleGeometry args={[0.14, 0.3, 3, 7]} />
        </mesh>
        <mesh material={idleMaterials.iron} position={[0, -0.77, 0.11]} scale={[0.23, 0.1, 0.34]}>
          <boxGeometry args={[1, 1, 1]} />
        </mesh>
        <mesh material={idleMaterials.red} position={[0, -0.48, 0.226]} scale={[0.1, 0.04, 0.025]}>
          <boxGeometry args={[1, 1, 1]} />
        </mesh>
      </group>
      <group ref={rightLegRef} name="iron-crown-right-leg" position={[0.2, 0.8, 0]}>
        <mesh material={idleMaterials.ironDark} position={[0, -0.18, 0]} scale={[0.22, 0.33, 0.23]}>
          <capsuleGeometry args={[0.16, 0.31, 3, 7]} />
        </mesh>
        <mesh material={idleMaterials.ironLight} position={[0, -0.49, 0.025]} scale={[0.19, 0.32, 0.22]}>
          <capsuleGeometry args={[0.14, 0.3, 3, 7]} />
        </mesh>
        <mesh material={idleMaterials.iron} position={[0, -0.77, 0.11]} scale={[0.23, 0.1, 0.34]}>
          <boxGeometry args={[1, 1, 1]} />
        </mesh>
        <mesh material={idleMaterials.red} position={[0, -0.48, 0.226]} scale={[0.1, 0.04, 0.025]}>
          <boxGeometry args={[1, 1, 1]} />
        </mesh>
      </group>

      <group ref={leftArmRef} name="iron-crown-left-arm" position={[-0.53, 1.5, 0]}>
        <mesh material={idleMaterials.iron} position={[0, -0.2, 0]} scale={[0.18, 0.31, 0.19]}>
          <capsuleGeometry args={[0.14, 0.29, 3, 7]} />
        </mesh>
        <mesh material={idleMaterials.ironLight} position={[0, -0.49, 0]} scale={[0.16, 0.3, 0.17]}>
          <capsuleGeometry args={[0.12, 0.27, 3, 7]} />
        </mesh>
        <mesh material={idleMaterials.ironDark} position={[0, -0.69, 0.045]} scale={[0.16, 0.13, 0.18]}>
          <dodecahedronGeometry args={[1, 0]} />
        </mesh>
        <mesh material={idleMaterials.red} position={[0, -0.39, 0.16]} scale={[0.09, 0.04, 0.02]}>
          <boxGeometry args={[1, 1, 1]} />
        </mesh>
      </group>
      <group ref={rightArmRef} name="iron-crown-sword-arm" position={[0.53, 1.5, 0]}>
        <mesh material={idleMaterials.iron} position={[0, -0.2, 0]} scale={[0.18, 0.31, 0.19]}>
          <capsuleGeometry args={[0.14, 0.29, 3, 7]} />
        </mesh>
        <mesh material={idleMaterials.ironLight} position={[0, -0.49, 0]} scale={[0.16, 0.3, 0.17]}>
          <capsuleGeometry args={[0.12, 0.27, 3, 7]} />
        </mesh>
        <mesh material={idleMaterials.ironDark} position={[0, -0.69, 0.045]} scale={[0.16, 0.13, 0.18]}>
          <dodecahedronGeometry args={[1, 0]} />
        </mesh>
        <group name="iron-crown-held-sword" position={[0.02, -0.69, 0.16]}>
          <mesh material={idleMaterials.ironDark} position={[0, 0.1, 0]} scale={[0.06, 0.2, 0.06]}>
            <cylinderGeometry args={[0.8, 0.8, 1, 8]} />
          </mesh>
          <mesh material={idleMaterials.gold} position={[0, 0.22, 0]} scale={[0.21, 0.035, 0.06]}>
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
          <mesh material={idleMaterials.blade} position={[0, 0.72, 0]} scale={[0.15, 0.86, 0.045]}>
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
          <mesh material={idleMaterials.ironLight} position={[0, 0.72, 0.028]} scale={[0.036, 0.68, 0.012]}>
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
          <mesh material={idleMaterials.red} position={[0, 0.3, 0]} scale={[0.11, 0.09, 0.08]}>
            <octahedronGeometry args={[1, 0]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
