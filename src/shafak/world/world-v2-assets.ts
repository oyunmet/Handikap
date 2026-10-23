import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import type { WorldV2AssetTarget } from "./world-v2-config";
import { fitObjectToTarget } from "./world-v2-sizing";
import {
  cloneCharacterResources,
  disposeCharacterResources,
  prepareCharacterSkinnedMeshes,
  type CharacterOwnedResources,
} from "./character-model";

export type LoadedWorldAsset = {
  url: string;
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  dimensions: { x: number; y: number; z: number };
};

const assetCache = new Map<string, Promise<LoadedWorldAsset>>();
const characterResources = new WeakMap<THREE.Object3D, CharacterOwnedResources>();

function prepareFirstAnimationFrame(gltf: GLTF) {
  const firstClip = gltf.animations[0];
  if (!firstClip) return;
  const mixer = new THREE.AnimationMixer(gltf.scene);
  mixer.clipAction(firstClip).play();
  mixer.setTime(0);
  mixer.update(0);
  gltf.scene.updateMatrixWorld(true);
  // Keep the resulting transforms on the source scene. stopAllAction() restores
  // the unanimated TRS values, which would make the subsequent bounds too small
  // for assets whose bind pose differs from animation frame zero.
}

export function prepareWorldAsset(
  url: string,
  gltf: Pick<GLTF, "scene" | "animations">,
  target: WorldV2AssetTarget,
): LoadedWorldAsset {
  prepareFirstAnimationFrame(gltf as GLTF);
  const fitted = fitObjectToTarget(gltf.scene, target);
  return {
    url,
    scene: gltf.scene,
    animations: gltf.animations,
    dimensions: fitted.dimensions,
  };
}

export function cloneWorldCharacter(asset: LoadedWorldAsset, tint?: string) {
  const clone = cloneSkinned(asset.scene) as THREE.Group;
  characterResources.set(clone, cloneCharacterResources(clone));
  prepareCharacterSkinnedMeshes(clone);
  tintWorldMaterials(clone, tint);
  return clone;
}

export function tintWorldMaterials(root: THREE.Object3D, tint?: string) {
  const target = tint ? new THREE.Color(tint) : null;
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      const colored = material as THREE.Material & { color?: THREE.Color };
      if (target && colored.color?.isColor) colored.color.lerp(target, 0.38);
    });
  });
}

export function disposeWorldCharacter(model: THREE.Object3D) {
  const resources = characterResources.get(model);
  if (!resources) return;
  characterResources.delete(model);
  disposeCharacterResources(resources);
}

/**
 * All V2 GLB loads pass through this function so animation-aware sizing,
 * unit normalization, and target fitting cannot diverge between actors.
 */
export function loadAsset(
  url: string,
  target: WorldV2AssetTarget,
  loader: Pick<GLTFLoader, "loadAsync"> = new GLTFLoader(),
): Promise<LoadedWorldAsset> {
  const key = [
    url,
    "targetHeight" in target ? `h${target.targetHeight}` : `d${target.targetMaxDim}`,
    target.maxDimension === undefined ? "" : `m${target.maxDimension}`,
    target.modelRotation?.join(",") ?? "",
  ].join(":");
  const cached = assetCache.get(key);
  if (cached) return cached;

  const loading = loader.loadAsync(url).then((gltf) => {
    return prepareWorldAsset(url, gltf, target);
  }).catch((error: unknown) => {
    assetCache.delete(key);
    throw error;
  });
  assetCache.set(key, loading);
  return loading;
}

export function clearWorldV2AssetCacheForTests() {
  assetCache.clear();
}
