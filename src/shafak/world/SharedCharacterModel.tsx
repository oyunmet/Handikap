import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import type { EquipmentVisual } from "../game/store-types";
import type { WorldMotion } from "./movement";
import type { CharacterAnimationState } from "./character-animation";
import {
  cloneCharacterResources,
  disposeCharacterResources,
  loadCharacter,
  prepareCharacterSkinnedMeshes,
  type CharacterOwnedResources,
} from "./character-model";
import { resolveWorldActorClip } from "./world-v2-clip-selection";
import {
  PLAYER_CHARACTER_ANIMATION_CLIPS,
  PLAYER_CHARACTER_MODEL_PATH,
  PLAYER_CHARACTER_TARGET_HEIGHT,
} from "./player-model";
import type { FantasyKnightHeadAccessory } from "./fantasy-knight-model";
import { fitObjectToTarget } from "./world-v2-sizing";

type SharedCharacterSource = {
  scene: THREE.Object3D;
  animations: readonly THREE.AnimationClip[];
};

export type SharedCharacterModelProps = {
  appearance?: EquipmentVisual;
  headAccessory?: FantasyKnightHeadAccessory;
  showWeapon?: boolean;
  targetHeight?: number;
  modelPath?: string;
  rootRef?: MutableRefObject<THREE.Group | null>;
  castShadow?: boolean;
  state?: CharacterAnimationState;
  stateRef?: MutableRefObject<CharacterAnimationState>;
  motionRef?: MutableRefObject<WorldMotion>;
  animationTimeScale?: number;
  animationPaused?: boolean | (() => boolean);
  source?: SharedCharacterSource;
};

type SharedCharacterInstanceProps = SharedCharacterModelProps & {
  source: SharedCharacterSource;
};

type SharedCharacterInstance = {
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  clips: THREE.AnimationClip[];
  resources: CharacterOwnedResources;
};

function getMotionAnimationState(motionRef?: MutableRefObject<WorldMotion>) {
  if (!motionRef) return "idle" satisfies CharacterAnimationState;
  const motion = motionRef.current;
  if (motion.jumpHeight > 0.12) return "jump" satisfies CharacterAnimationState;
  if (motion.crouching) return "walk" satisfies CharacterAnimationState;
  const speed = Math.hypot(motion.velocityX, motion.velocityY);
  if (motion.movementState === "SPRINT" || speed > 3.2) return "run" satisfies CharacterAnimationState;
  if (motion.hasMoved && speed > 0.12) return "walk" satisfies CharacterAnimationState;
  return "idle" satisfies CharacterAnimationState;
}

function colorForMaterial(name: string, appearance: EquipmentVisual) {
  switch (name.toLowerCase()) {
    case "hair":
      return appearance.hairColor ?? appearance.helmetColor;
    case "undershirt":
      return appearance.armorDark ?? appearance.armor;
    case "shirt":
      return appearance.armor ?? appearance.dyeColor;
    case "pants":
      return appearance.armorDark;
    case "boots":
      return appearance.bootColor ?? appearance.armorDark;
    case "detail":
      return appearance.trim ?? appearance.armorLight;
    case "material.006":
      return appearance.cape ?? appearance.armorLight ?? appearance.armor;
    default:
      return undefined;
  }
}

function addAccessory(
  root: THREE.Group,
  accessory: FantasyKnightHeadAccessory | "helmet",
  appearance: EquipmentVisual,
  resources: CharacterOwnedResources,
) {
  if (!accessory) return;
  const head = root.getObjectByName("Head");
  if (!head) return;

  root.updateMatrixWorld(true);
  const headScale = head.getWorldScale(new THREE.Vector3());
  const anchor = new THREE.Group();
  anchor.name = `shared-character-${accessory}`;
  anchor.scale.set(
    1 / Math.max(0.001, headScale.x),
    1 / Math.max(0.001, headScale.y),
    1 / Math.max(0.001, headScale.z),
  );
  head.add(anchor);

  const material = new THREE.MeshStandardMaterial({
    color: accessory === "hat" || accessory === "helmet"
      ? appearance.helmetColor ?? appearance.trim ?? "#b9904a"
      : appearance.gloveColor ?? "#342b2a",
    roughness: 0.72,
    metalness: accessory === "hat" || accessory === "helmet" ? 0.18 : 0.05,
  });
  resources.materials.push(material);

  if (accessory === "helmet") {
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.145, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), material);
    helmet.position.y = 0.075;
    helmet.castShadow = true;
    anchor.add(helmet);
    resources.geometries.push(helmet.geometry);
    return;
  }

  if (accessory === "hat") {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.025, 12), material);
    brim.position.y = 0.095;
    brim.castShadow = true;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.12, 0.12, 10), material);
    crown.position.y = 0.16;
    crown.castShadow = true;
    anchor.add(brim, crown);
    resources.geometries.push(brim.geometry, crown.geometry);
    return;
  }

  const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.052, 0.014), material);
  const frameRight = frameLeft.clone();
  frameLeft.position.set(-0.055, 0.015, 0.12);
  frameRight.position.set(0.055, 0.015, 0.12);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.012, 0.012), material);
  bridge.position.set(0, 0.015, 0.12);
  anchor.add(frameLeft, frameRight, bridge);
  resources.geometries.push(frameLeft.geometry, frameRight.geometry, bridge.geometry);
}

function createSharedCharacterInstance(
  source: SharedCharacterSource,
  {
    appearance = {},
    headAccessory = null,
    targetHeight = PLAYER_CHARACTER_TARGET_HEIGHT,
    castShadow = true,
  }: SharedCharacterModelProps,
): SharedCharacterInstance {
  const rig = cloneSkinned(source.scene) as THREE.Group;
  const resources = cloneCharacterResources(rig, { cloneTextures: false });
  prepareCharacterSkinnedMeshes(rig);
  rig.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = castShadow;
    object.receiveShadow = castShadow;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      const color = colorForMaterial(material.name, appearance);
      const materialColor = (material as THREE.Material & { color?: THREE.Color }).color;
      if (color && materialColor?.isColor) materialColor.set(color);
    });
  });

  const root = new THREE.Group();
  root.name = "shared-player-hero-rig";
  root.userData.worldCharacterModel = true;
  root.userData.worldModelSource = PLAYER_CHARACTER_MODEL_PATH;
  root.add(rig);
  fitObjectToTarget(root, { targetHeight });
  addAccessory(
    root,
    headAccessory ?? (appearance.helmetStyle ? "helmet" : null),
    appearance,
    resources,
  );
  root.updateMatrixWorld(true);

  const mixer = new THREE.AnimationMixer(root);
  const clips = source.animations.map((clip) => {
    if (!clip.tracks.some((track) => /Hips\.position$/i.test(track.name))) return clip;
    const inPlace = clip.clone();
    inPlace.tracks = inPlace.tracks.filter(
      (track) => !/Hips\.position$/i.test(track.name),
    );
    return inPlace;
  });

  return { root, mixer, clips, resources };
}

function AnimatedCharacterInstance({
  source,
  appearance,
  headAccessory,
  targetHeight,
  rootRef,
  castShadow,
  state,
  stateRef,
  motionRef,
  animationTimeScale = 1,
  animationPaused = false,
}: SharedCharacterInstanceProps) {
  const instance = useMemo(
    () => createSharedCharacterInstance(source, { appearance, headAccessory, targetHeight, castShadow }),
    [
      source.scene,
      source.animations,
      JSON.stringify(appearance ?? {}),
      headAccessory,
      targetHeight,
      castShadow,
    ],
  );
  const activeStateRef = useRef<CharacterAnimationState | null>(null);
  const activeClipRef = useRef<string | null>(null);
  const activeActionRef = useRef<THREE.AnimationAction | null>(null);
  const stateValueRef = useRef(state);
  const stateRefValueRef = useRef(stateRef);
  const motionRefValueRef = useRef(motionRef);
  const pausedValueRef = useRef(animationPaused);
  const timeScaleValueRef = useRef(animationTimeScale);
  stateValueRef.current = state;
  stateRefValueRef.current = stateRef;
  motionRefValueRef.current = motionRef;
  pausedValueRef.current = animationPaused;
  timeScaleValueRef.current = animationTimeScale;

  useEffect(() => {
    if (rootRef) rootRef.current = instance.root;
    return () => {
      if (rootRef?.current === instance.root) rootRef.current = null;
      instance.mixer.stopAllAction();
      instance.mixer.uncacheRoot(instance.root);
      disposeCharacterResources(instance.resources);
    };
  }, [instance, rootRef]);

  useFrame((_, delta) => {
    const nextState = stateRefValueRef.current?.current
      ?? stateValueRef.current
      ?? getMotionAnimationState(motionRefValueRef.current);
    if (activeStateRef.current !== nextState) {
      activeStateRef.current = nextState;
      const clip = resolveWorldActorClip(
        instance.clips,
        nextState,
        PLAYER_CHARACTER_ANIMATION_CLIPS,
      );
      if (clip && clip.name !== activeClipRef.current) {
        const isLooping = nextState === "idle" || nextState === "walk" || nextState === "run" || nextState === "block";
        const nextAction = instance.mixer.clipAction(clip);
        nextAction.reset();
        nextAction.enabled = true;
        nextAction.setLoop(isLooping ? THREE.LoopRepeat : THREE.LoopOnce, isLooping ? Infinity : 1);
        nextAction.clampWhenFinished = !isLooping;
        nextAction.timeScale = Number.isFinite(timeScaleValueRef.current)
          ? Math.max(0.1, Math.min(2, timeScaleValueRef.current))
          : 1;
        const previousAction = activeActionRef.current;
        nextAction.play();
        if (previousAction) nextAction.crossFadeFrom(previousAction, 0.16, true);
        else nextAction.fadeIn(0.16);
        activeActionRef.current = nextAction;
        activeClipRef.current = clip.name;
      }
    }

    const paused = typeof pausedValueRef.current === "function"
      ? pausedValueRef.current()
      : pausedValueRef.current;
    const timeScale = Number.isFinite(timeScaleValueRef.current)
      ? Math.max(0, Math.min(2, timeScaleValueRef.current))
      : 1;
    instance.mixer.update(paused ? 0 : Math.min(0.05, Math.max(0, delta)) * timeScale);
  });

  return <primitive object={instance.root} dispose={null} />;
}

function LoadedAnimatedCharacter(props: Omit<SharedCharacterModelProps, "source">) {
  const gltf = useLoader(
    GLTFLoader,
    props.modelPath ?? PLAYER_CHARACTER_MODEL_PATH,
    loadCharacter,
  ) as GLTF;

  return (
    <AnimatedCharacterInstance
      {...props}
      source={{ scene: gltf.scene, animations: gltf.animations }}
    />
  );
}

export default function SharedCharacterModel(props: SharedCharacterModelProps) {
  if (props.source) return <AnimatedCharacterInstance {...props} source={props.source} />;
  return <LoadedAnimatedCharacter {...props} />;
}
