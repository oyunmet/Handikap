import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Component, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

export const WAR_ROOM_MODEL_URLS = [
  "/models/player-hero.glb",
  "/models/human.glb",
  "/models/war-room/wall.glb",
  "/models/war-room/tower-square.glb",
  "/models/war-room/tower-square-top.glb",
  "/models/war-room/tower-square-roof.glb",
  "/models/war-room/flag-pennant.glb",
  "/models/war-room/siege-ballista.glb",
  "/models/war-room/rocks-large.glb",
] as const;

export function preloadWarRoomModels() {
  WAR_ROOM_MODEL_URLS.forEach((url) => useGLTF.preload(url));
}

type AssetBoundaryProps = {
  children?: ReactNode;
  fallback: ReactNode;
};

class WarRoomAssetBoundaryImpl extends Component<
  AssetBoundaryProps,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.warn("[war-room] GLB yüklenemedi; basit yedek geometri kullanılıyor.", error.message);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function WarRoomAssetBoundary(props: AssetBoundaryProps) {
  return <WarRoomAssetBoundaryImpl {...props} />;
}

type TargetSize = readonly [number, number, number];

type StaticModelProps = {
  src: string;
  position: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  targetSize: TargetSize;
};

export function WarRoomStaticModel({
  src,
  position,
  rotation = [0, 0, 0],
  targetSize,
}: StaticModelProps) {
  const { scene } = useGLTF(src) as GLTF;
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
    });
    const bounds = new THREE.Box3().setFromObject(clone);
    const size = bounds.getSize(new THREE.Vector3());
    if (bounds.isEmpty() || size.x < 0.0001 || size.y < 0.0001 || size.z < 0.0001) {
      throw new Error(`Modelin ölçüleri okunamadı: ${src}`);
    }
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = new THREE.Vector3(
      targetSize[0] / size.x,
      targetSize[1] / size.y,
      targetSize[2] / size.z,
    );
    clone.scale.multiply(scale);
    clone.position.set(
      -center.x * scale.x,
      -bounds.min.y * scale.y,
      -center.z * scale.z,
    );
    return clone;
  }, [scene, src, targetSize]);

  return (
    <group position={position} rotation={rotation}>
      <primitive object={model} dispose={null} />
    </group>
  );
}

export type WarRoomAnimationState = "idle" | "run" | "attack" | "hit" | "death";

type AnimatedActorProps = {
  src: string;
  height: number;
  tint?: string;
  state: () => WarRoomAnimationState;
  modelRef?: MutableRefObject<THREE.Group | null>;
};

const CLIP_ALIASES: Record<WarRoomAnimationState, readonly string[]> = {
  idle: ["idle", "attacking_idle", "idle_loop"],
  run: ["run", "sprint_loop", "jog_fwd_loop", "walk"],
  attack: ["dagger_attack", "pistol_shoot", "punch", "armatureaction"],
  hit: ["recievehit", "hit_chest", "hit_head", "armatureaction"],
  death: ["death", "death01"],
};

function clipForState(clips: THREE.AnimationClip[], state: WarRoomAnimationState) {
  const aliases = CLIP_ALIASES[state];
  for (const alias of aliases) {
    const match = clips.find((clip) => clip.name.toLowerCase().split("|").at(-1)?.replace(/[^a-z0-9]/g, "").includes(alias.replace(/[^a-z0-9]/g, "")));
    if (match) return match;
  }
  return clips.find((clip) => clip.name.toLowerCase().includes("idle")) ?? clips[0] ?? null;
}

export function WarRoomAnimatedActor({
  src,
  height,
  tint,
  state,
  modelRef,
}: AnimatedActorProps) {
  const { scene, animations } = useGLTF(src) as GLTF;
  const model = useMemo(() => {
    const clone = cloneSkinned(scene) as THREE.Group;
    if (tint) {
      const tintColor = new THREE.Color(tint);
      clone.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
        const tinted = sourceMaterials.map((source) => {
          const material = source.clone();
          material.userData.warRoomOwnedTint = true;
          const colored = material as THREE.Material & { color?: THREE.Color };
          if (colored.color?.isColor) colored.color.lerp(tintColor, 0.32);
          return material;
        });
        object.material = Array.isArray(object.material) ? tinted : tinted[0];
      });
    }
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = false;
    });
    const bounds = new THREE.Box3().setFromObject(clone);
    const size = bounds.getSize(new THREE.Vector3());
    if (bounds.isEmpty() || size.y < 0.0001) {
      throw new Error(`Karakter modelinin boyu ölçülemedi: ${src}`);
    }
    const scale = height / size.y;
    const center = bounds.getCenter(new THREE.Vector3());
    clone.scale.setScalar(scale);
    clone.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    return clone;
  }, [height, scene, src, tint]);
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model]);
  const activeAction = useRef<THREE.AnimationAction | null>(null);
  const activeState = useRef<WarRoomAnimationState | null>(null);
  const modelRef = useRef<THREE.Group>(model);

  useEffect(() => {
    modelRef.current = model;
    return () => {
      if (modelRef.current === model) modelRef.current = null;
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      activeAction.current = null;
      activeState.current = null;
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          if (material.userData.warRoomOwnedTint) material.dispose();
        });
      });
    };
  }, [mixer, model, modelRef]);

  useFrame((_, delta) => {
    const nextState = state();
    if (nextState !== activeState.current) {
      const clip = clipForState(animations, nextState);
      if (clip) {
        const nextAction = mixer.clipAction(clip);
        nextAction.reset().fadeIn(0.18).play();
        activeAction.current?.fadeOut(0.18);
        activeAction.current = nextAction;
        if (nextState === "death" || nextState === "attack" || nextState === "hit") {
          nextAction.setLoop(THREE.LoopOnce, 1).clampWhenFinished = true;
        }
        else nextAction.setLoop(THREE.LoopRepeat, Infinity);
      }
      activeState.current = nextState;
    }
    mixer.update(Math.min(delta, 0.05));
  });

  return (
    <group rotation={[0, Math.PI, 0]}>
      <primitive object={model} dispose={null} />
    </group>
  );
}
