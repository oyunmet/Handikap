import * as THREE from "three";

/** The fallback sky is only a backdrop; it must never occlude the 3D world. */
export const SKY_BACKGROUND_DEPTH_STATE = {
  depthTest: false,
  depthWrite: false,
} as const;

/** Keep procedural sky shells at infinity when the camera translates. */
export function syncSkyShellPositions(
  camera: THREE.Camera,
  center: THREE.Vector3,
  sky: THREE.Object3D | null,
  firstCloud: THREE.Object3D | null,
  secondCloud: THREE.Object3D | null,
) {
  camera.getWorldPosition(center);
  sky?.position.copy(center);
  firstCloud?.position.copy(center);
  secondCloud?.position.copy(center);
}
