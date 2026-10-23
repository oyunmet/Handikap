import * as THREE from "three";
import type { WorldV2AssetTarget } from "./world-v2-config";

const UNIT_SCALE_FACTORS = [100, 0.01] as const;
const UNIT_SCALE_TOLERANCE = 0.02;

function matchesUnitFactor(value: number) {
  return UNIT_SCALE_FACTORS.some((factor) =>
    Math.abs(Math.abs(value) - factor) / factor <= UNIT_SCALE_TOLERANCE);
}

/** Reset only root/armature unit conversion scales; final dimensions are fitted afterward. */
export function normalizeArmatureScales(root: THREE.Object3D) {
  let normalized = 0;
  root.traverse((object) => {
    const scale = object.scale;
    const unitConversion = [scale.x, scale.y, scale.z].some(matchesUnitFactor);
    const rootLike = object === root || /armature|skeleton|(^|[_\s-])root($|[_\s-])/i.test(object.name);
    if (!rootLike || !unitConversion) return;
    scale.set(1, 1, 1);
    normalized += 1;
  });
  return normalized;
}

export function getPreciseWorldBounds(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  bounds.expandByObject(root, true);
  return bounds;
}

export function fitObjectToTarget(
  root: THREE.Object3D,
  target: WorldV2AssetTarget,
) {
  if (target.modelRotation) root.rotation.set(...target.modelRotation);
  normalizeArmatureScales(root);
  root.updateMatrixWorld(true);
  const sourceBounds = getPreciseWorldBounds(root);
  if (sourceBounds.isEmpty()) throw new Error("Loaded world asset has no measurable mesh bounds.");

  const sourceSize = sourceBounds.getSize(new THREE.Vector3());
  const largestSourceDimension = Math.max(sourceSize.x, sourceSize.y, sourceSize.z);
  const heightScale = typeof target.targetHeight === "number"
    ? sourceSize.y > 0 ? target.targetHeight / sourceSize.y : 0
    : largestSourceDimension > 0 ? target.targetMaxDim / largestSourceDimension : 0;
  const maxDimensionScale = target.maxDimension !== undefined
    ? target.maxDimension / largestSourceDimension
    : Number.POSITIVE_INFINITY;
  const targetDimension = Math.min(heightScale, maxDimensionScale);
  if (!Number.isFinite(targetDimension) || targetDimension <= 0) {
    throw new Error("Loaded world asset has invalid target dimensions.");
  }

  const center = sourceBounds.getCenter(new THREE.Vector3());
  root.scale.multiplyScalar(targetDimension);
  root.position.set(
    root.position.x - center.x * targetDimension,
    root.position.y - sourceBounds.min.y * targetDimension,
    root.position.z - center.z * targetDimension,
  );
  root.updateMatrixWorld(true);

  const fittedBounds = getPreciseWorldBounds(root);
  const fittedSize = fittedBounds.getSize(new THREE.Vector3());
  return {
    root,
    bounds: fittedBounds,
    dimensions: { x: fittedSize.x, y: fittedSize.y, z: fittedSize.z },
    scale: targetDimension,
  };
}
