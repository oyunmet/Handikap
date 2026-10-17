import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { configureWorldGLTFLoader } from "./WorldModel";

const normalizedCharacterLogs = new Set<string>();

/** Shared GLTF loader setup for every player, rival, and boss model. */
export function loadCharacter(loader: GLTFLoader) {
  loader.setMeshoptDecoder(MeshoptDecoder);
  configureWorldGLTFLoader(loader);
}

/** Measures visible mesh bounds, including the current deformed vertices of skinned meshes. */
export function getCharacterBounds(model: THREE.Object3D) {
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;

    if (object instanceof THREE.SkinnedMesh) {
      object.skeleton.update();
      object.computeBoundingBox();
      if (object.boundingBox) {
        bounds.union(object.boundingBox.clone().applyMatrix4(object.matrixWorld));
      }
      return;
    }

    object.geometry.computeBoundingBox();
    bounds.union(new THREE.Box3().setFromObject(object, true));
  });

  if (bounds.isEmpty()) bounds.setFromObject(model, true);
  return bounds;
}

/** Fits a loaded model to a world-space height and puts its lowest point on y=0. */
export function fitCharacterModel(model: THREE.Object3D, targetHeight: number, diagnosticLabel?: string) {
  const heightTarget = Number.isFinite(targetHeight) ? Math.max(0.1, targetHeight) : 1.8;
  model.scale.set(1, 1, 1);
  model.position.set(0, 0, 0);
  model.updateMatrixWorld(true);
  const bounds = getCharacterBounds(model);
  const sourceHeight = bounds.max.y - bounds.min.y;
  if (!Number.isFinite(sourceHeight) || sourceHeight <= 0.001) {
    throw new Error("Character model has no measurable height.");
  }

  const scale = heightTarget / sourceHeight;
  const center = bounds.getCenter(new THREE.Vector3());
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
  model.updateMatrixWorld(true);

  if (diagnosticLabel) {
    const afterBounds = getCharacterBounds(model);
    const normalizedHeight = afterBounds.max.y - afterBounds.min.y;
    const logKey = `${diagnosticLabel}:${heightTarget}`;
    if (!normalizedCharacterLogs.has(logKey)) {
      normalizedCharacterLogs.add(logKey);
      console.info("[shafak-model] Character normalized", {
        model: diagnosticLabel,
        heightBefore: Number(sourceHeight.toFixed(3)),
        heightAfter: Number(normalizedHeight.toFixed(3)),
        targetHeight: heightTarget,
        appliedScale: Number(scale.toFixed(6)),
      });
    }
  }

  return scale;
}

/** Returns the visible character's projected viewport coverage as fractions from 0 to 1. */
export function getCharacterScreenCoverage(
  model: THREE.Object3D,
  camera: THREE.Camera,
  viewportWidth: number,
  viewportHeight: number,
) {
  if (!(viewportWidth > 0) || !(viewportHeight > 0)) {
    return { height: 0, area: 0 };
  }

  const bounds = getCharacterBounds(model);
  camera.updateMatrixWorld(true);
  const projectedCorners = [
    new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.min.z),
    new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.max.z),
    new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.min.z),
    new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.max.z),
    new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.min.z),
    new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.max.z),
    new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.min.z),
    new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.max.z),
  ].map((corner) => corner.project(camera));

  const minX = Math.min(...projectedCorners.map((point) => point.x));
  const maxX = Math.max(...projectedCorners.map((point) => point.x));
  const minY = Math.min(...projectedCorners.map((point) => point.y));
  const maxY = Math.max(...projectedCorners.map((point) => point.y));
  const width = THREE.MathUtils.clamp((Math.min(1, maxX) - Math.max(-1, minX)) / 2, 0, 1);
  const height = THREE.MathUtils.clamp((Math.min(1, maxY) - Math.max(-1, minY)) / 2, 0, 1);
  return { height, area: width * height };
}
