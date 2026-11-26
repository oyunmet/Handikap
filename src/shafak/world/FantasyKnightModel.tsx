import { useEffect, useMemo } from "react";
import type { MutableRefObject } from "react";
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import type { EquipmentVisual } from "../game/store-types";
import {
  createFantasyKnightModel,
  disposeFantasyKnightModel,
  FANTASY_KNIGHT_MODEL_PATH,
  type FantasyKnightHeadAccessory,
  type FantasyKnightPartSet,
} from "./fantasy-knight-model";

export type FantasyKnightModelProps = {
  appearance?: EquipmentVisual;
  headAccessory?: FantasyKnightHeadAccessory;
  parts?: FantasyKnightPartSet;
  showWeapon?: boolean;
  targetHeight?: number;
  rootRef?: MutableRefObject<THREE.Group | null>;
  castShadow?: boolean;
};

export default function FantasyKnightModel({
  appearance,
  headAccessory,
  parts = "full",
  showWeapon = true,
  targetHeight = 1.7,
  rootRef,
  castShadow = true,
}: FantasyKnightModelProps) {
  const gltf = useLoader(GLTFLoader, FANTASY_KNIGHT_MODEL_PATH) as GLTF;
  const styleKey = JSON.stringify({
    appearance: appearance ?? {},
    headAccessory,
    parts,
    showWeapon,
    targetHeight,
    castShadow,
  });
  const instance = useMemo(
    () => createFantasyKnightModel(gltf.scene, {
      appearance,
      headAccessory,
      parts,
      showWeapon,
      targetHeight,
      castShadow,
    }),
    [gltf.scene, styleKey],
  );

  useEffect(() => () => disposeFantasyKnightModel(instance), [instance]);

  return (
    <primitive
      ref={rootRef}
      object={instance.root}
      dispose={null}
    />
  );
}
