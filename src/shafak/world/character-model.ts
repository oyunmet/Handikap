import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { configureWorldGLTFLoader } from "./WorldModel";
import {
  getWorldCharacterFitScale,
  WORLD_CHARACTER_REFERENCE_HEIGHT,
} from "./world-model-sizing.ts";

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

export type CharacterObjectDiagnostic = {
  name: string;
  type: string;
  parent: string;
  geometry: string;
  worldSizeM: { x: number; y: number; z: number };
  materialColors: string[];
  visible: boolean;
  visibleInHierarchy: boolean;
  isMesh: boolean;
  source: string;
};

function objectWorldBounds(object: THREE.Object3D) {
  const bounds = new THREE.Box3();
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    if (child instanceof THREE.SkinnedMesh) {
      child.skeleton.update();
      child.computeBoundingBox();
      if (child.boundingBox) bounds.union(child.boundingBox.clone().applyMatrix4(child.matrixWorld));
      return;
    }
    child.geometry.computeBoundingBox();
    bounds.union(new THREE.Box3().setFromObject(child, true));
  });
  return bounds;
}

/** Gathers world-space diagnostics for every object in the rendered player tree. */
export function inspectCharacterSceneGraph(
  root: THREE.Object3D,
  model: THREE.Object3D,
  modelPath: string,
): CharacterObjectDiagnostic[] {
  root.updateMatrixWorld(true);
  const diagnostics: CharacterObjectDiagnostic[] = [];

  root.traverse((object) => {
    const worldBounds = objectWorldBounds(object);
    const dimensions = worldBounds.getSize(new THREE.Vector3());
    const materialColors = object instanceof THREE.Mesh
      ? (Array.isArray(object.material) ? object.material : [object.material]).map((material) => {
        const color = (material as THREE.Material & { color?: THREE.Color }).color;
        return color?.isColor ? `#${color.getHexString()}` : "—";
      })
      : [];

    let visibleInHierarchy = true;
    let current: THREE.Object3D | null = object;
    while (current) {
      visibleInHierarchy &&= current.visible;
      current = current.parent;
    }

    let source = "KnightActor.tsx: attached player effect";
    let ancestor: THREE.Object3D | null = object;
    while (ancestor) {
      if (ancestor.name === "equipped-duel-weapon") {
        source = "duel-weapon.ts: createDuelWeapon()";
        break;
      }
      if (ancestor === model) {
        source = `${modelPath}: prepareModel()`;
        break;
      }
      if (ancestor.name === "player-contact-shadow") {
        source = "KnightActor.tsx: GLB_CONTACT_SHADOW_GEOMETRY";
        break;
      }
      ancestor = ancestor.parent;
    }

    diagnostics.push({
      name: object.name || "(unnamed)",
      type: object instanceof THREE.SkinnedMesh
        ? "SkinnedMesh"
        : object instanceof THREE.Mesh
          ? "Mesh"
          : object instanceof THREE.Bone
            ? "Bone"
            : object.type,
      parent: object.parent
        ? object.parent.name || `(unnamed ${object.parent.type})`
        : "(none)",
      geometry: (object as THREE.Mesh).geometry?.type ?? "—",
      worldSizeM: {
        x: Number(dimensions.x.toFixed(3)),
        y: Number(dimensions.y.toFixed(3)),
        z: Number(dimensions.z.toFixed(3)),
      },
      materialColors,
      visible: object.visible,
      visibleInHierarchy,
      isMesh: object instanceof THREE.Mesh,
      source,
    });
  });

  return diagnostics;
}

/** Prevents animated character meshes from being culled using stale bind-pose bounds. */
export function prepareCharacterSkinnedMeshes(model: THREE.Object3D) {
  let count = 0;
  model.traverse((object) => {
    if (!(object instanceof THREE.SkinnedMesh)) return;
    object.frustumCulled = false;
    object.skeleton.update();
    object.computeBoundingBox();
    object.computeBoundingSphere();
    count += 1;
  });
  return count;
}

/** Fits a loaded model to a world-space height and puts its lowest point on y=0. */
export function fitCharacterModel(model: THREE.Object3D, targetHeight: number, diagnosticLabel?: string) {
  const heightTarget = Number.isFinite(targetHeight)
    ? Math.max(0.1, targetHeight)
    : WORLD_CHARACTER_REFERENCE_HEIGHT;
  model.scale.set(1, 1, 1);
  model.position.set(0, 0, 0);
  model.updateMatrixWorld(true);
  const bounds = getCharacterBounds(model);
  const sourceHeight = bounds.max.y - bounds.min.y;
  if (!Number.isFinite(sourceHeight) || sourceHeight <= 0.001) {
    throw new Error("Character model has no measurable height.");
  }

  const scale = getWorldCharacterFitScale(bounds.getSize(new THREE.Vector3()), heightTarget);
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

export function validateCharacterModel(model: THREE.Object3D, targetHeight: number) {
  const bounds = getCharacterBounds(model);
  const size = bounds.getSize(new THREE.Vector3());
  const heightTolerance = 0.08;
  const issues: string[] = [];
  if (bounds.isEmpty()) issues.push("no visible geometry");
  if (Math.abs(bounds.min.y) > 0.08) {
    issues.push(`feet pivot is ${bounds.min.y.toFixed(3)}m from ground`);
  }
  if (Math.abs(size.y - targetHeight) > heightTolerance) {
    issues.push(`height ${size.y.toFixed(3)}m differs from target ${targetHeight.toFixed(3)}m`);
  }
  if (size.x > Math.max(3.5, targetHeight * 1.75) || size.z > Math.max(3.5, targetHeight * 1.75)) {
    issues.push(`model bounds are unusually wide (${size.x.toFixed(2)} × ${size.z.toFixed(2)}m)`);
  }
  return { valid: issues.length === 0, issues, bounds };
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
