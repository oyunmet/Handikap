import * as THREE from "three";

export function getEquipmentPreviewSubject(
  focusItemOnly: boolean,
  characterSubject: THREE.Object3D | null,
  itemSubject: THREE.Object3D | null,
): THREE.Object3D | null {
  return focusItemOnly ? itemSubject : characterSubject;
}

export function getEquipmentPreviewBounds(subject: THREE.Object3D): THREE.Box3 {
  subject.updateWorldMatrix(true, true);
  return new THREE.Box3().setFromObject(subject, true);
}
