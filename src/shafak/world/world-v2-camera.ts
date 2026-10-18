import * as THREE from "three";
import { WORLD_V2_CONFIG } from "./world-v2-config";

export function getSafeCameraDistance(
  desiredDistance: number,
  obstructionDistance?: number,
  margin = WORLD_V2_CONFIG.camera.collisionMargin,
) {
  if (!Number.isFinite(desiredDistance) || desiredDistance <= 0) return 0;
  if (
    obstructionDistance === undefined
    || !Number.isFinite(obstructionDistance)
    || obstructionDistance >= desiredDistance
  ) return desiredDistance;
  return Math.max(0, Math.min(desiredDistance, obstructionDistance - Math.max(0, margin)));
}

export function resolveCameraCollision(
  origin: THREE.Vector3,
  desired: THREE.Vector3,
  obstructionDistance?: number,
  margin = WORLD_V2_CONFIG.camera.collisionMargin,
) {
  const direction = desired.clone().sub(origin);
  const desiredDistance = direction.length();
  if (desiredDistance <= 0) return origin.clone();
  direction.normalize();
  return origin.clone().addScaledVector(
    direction,
    getSafeCameraDistance(desiredDistance, obstructionDistance, margin),
  );
}
