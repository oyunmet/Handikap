import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { configureWorldGLTFLoader } from "./WorldModel";

/** Shared GLTF loader setup for every player, rival, and boss model. */
export function loadCharacter(loader: GLTFLoader) {
  loader.setMeshoptDecoder(MeshoptDecoder);
  configureWorldGLTFLoader(loader);
}

/** Fits a loaded model to a world-space height and puts its lowest point on y=0. */
export function fitCharacterModel(model: THREE.Object3D, targetHeight: number) {
  const heightTarget = Number.isFinite(targetHeight) ? Math.max(0.1, targetHeight) : 1.8;
  model.position.set(0, 0, 0);
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model, true);
  const sourceHeight = bounds.max.y - bounds.min.y;
  if (!Number.isFinite(sourceHeight) || sourceHeight <= 0.001) {
    throw new Error("Character model has no measurable height.");
  }

  const scale = heightTarget / sourceHeight;
  model.scale.multiplyScalar(scale);
  model.position.y = -bounds.min.y * scale;
  model.updateMatrixWorld(true);
  return scale;
}
