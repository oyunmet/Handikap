import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CharacterAnimationState } from "./character-animation";
import type { EquipmentVisual } from "../game/store-types";
import type { WorldMotion } from "./movement";
import {
  animateProceduralHero,
  createProceduralHeroRig,
  disposeProceduralHeroRig,
  PROCEDURAL_HERO_HEIGHT,
} from "./procedural-hero";
import {
  createDuelWeapon,
  disposeDuelWeapon,
  normalizeDuelWeaponWorldSize,
} from "./duel-weapon";

type Props = {
  motionRef: MutableRefObject<WorldMotion>;
  state: CharacterAnimationState;
  motionReduced?: boolean;
  animationTimeScale?: number;
  animationPaused?: boolean;
  appearance?: EquipmentVisual;
  showWeapon?: boolean;
  targetHeight?: number;
  rootRef?: MutableRefObject<THREE.Group | null>;
  castShadow?: boolean;
};

function weaponTargetSize(style: EquipmentVisual["weaponStyle"]) {
  if (style === "daggers") return 0.42;
  if (style === "spear" || style === "staff") return 1.15;
  if (style === "axe" || style === "mace" || style === "bow") return 0.8;
  return 1;
}

export default function ProceduralHero({
  motionRef,
  state,
  motionReduced = false,
  animationTimeScale = 1,
  animationPaused = false,
  appearance,
  showWeapon = false,
  targetHeight = PROCEDURAL_HERO_HEIGHT,
  rootRef,
  castShadow = true,
}: Props) {
  const appearanceKey = JSON.stringify(appearance ?? {});
  const rig = useMemo(() => {
    const nextRig = createProceduralHeroRig(appearance);
    nextRig.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = castShadow;
      object.receiveShadow = castShadow;
    });
    return nextRig;
  }, [appearanceKey, castShadow]);
  const previousState = useRef(state);
  const actionElapsed = useRef(0);
  const equippedWeapon = useMemo(
    () => showWeapon ? createDuelWeapon(appearance) : null,
    [
      showWeapon,
      appearanceKey,
    ],
  );

  useEffect(() => () => {
    disposeProceduralHeroRig(rig);
  }, [rig]);

  useEffect(() => {
    if (!equippedWeapon) return undefined;
    rig.rightHand.add(equippedWeapon);
    normalizeDuelWeaponWorldSize(
      equippedWeapon,
      weaponTargetSize(appearance?.weaponStyle),
    );
    return () => {
      rig.rightHand.remove(equippedWeapon);
      disposeDuelWeapon(equippedWeapon);
    };
  }, [appearance?.weaponStyle, equippedWeapon, rig]);

  useFrame((frame, delta) => {
    if (animationPaused) return;
    const dt = Math.min(delta, 0.05) * Math.max(0, animationTimeScale);
    if (previousState.current !== state) {
      previousState.current = state;
      actionElapsed.current = 0;
    } else {
      actionElapsed.current += dt;
    }
    const motion = motionRef.current;
    const speed = Math.hypot(motion.velocityX, motion.velocityY);
    animateProceduralHero(rig, {
      phase: motion.stepPhase,
      moveWeight: THREE.MathUtils.clamp(speed / 3.8, 0, 1),
      state,
      actionProgress: THREE.MathUtils.clamp(actionElapsed.current / 0.42, 0, 1),
      time: frame.clock.elapsedTime,
      crouching: motion.crouching,
      motionReduced,
    });
  });

  return (
    <primitive
      ref={rootRef}
      object={rig.root}
      scale={targetHeight / rig.height}
      dispose={null}
    />
  );
}
