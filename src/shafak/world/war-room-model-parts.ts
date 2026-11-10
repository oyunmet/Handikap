import type * as THREE from "three";

export function getWarRoomWeaponAnimationNode(root: THREE.Object3D, name: string) {
  return root.getObjectByName(name) ?? null;
}
