import * as THREE from "three";
import type { EquipmentVisual } from "../game/store-types.ts";

function addMesh(
  root: THREE.Group,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: readonly [number, number, number],
  rotation: readonly [number, number, number] = [0, 0, 0],
) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  root.add(mesh);
  return mesh;
}

export function createDuelWeapon(appearance: EquipmentVisual = {}) {
  const root = new THREE.Group();
  root.name = "equipped-duel-weapon";
  const style = appearance.weaponStyle ?? "sword";
  const steel = new THREE.MeshStandardMaterial({
    color: appearance.weaponColor ?? "#d6dce0",
    roughness: 0.24,
    metalness: 0.86,
    emissive: appearance.weaponColor ?? "#8c9aa4",
    emissiveIntensity: 0.12,
  });
  const leather = new THREE.MeshStandardMaterial({ color: "#4a3028", roughness: 0.82 });
  const trim = new THREE.MeshStandardMaterial({
    color: appearance.trim ?? "#d0a45f",
    roughness: 0.3,
    metalness: 0.76,
  });
  const crystal = new THREE.MeshStandardMaterial({
    color: appearance.auraColor ?? appearance.weaponColor ?? "#e6bd76",
    emissive: appearance.auraColor ?? appearance.weaponColor ?? "#e6bd76",
    emissiveIntensity: 0.82,
    toneMapped: false,
  });
  const add = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    position: readonly [number, number, number],
    rotation?: readonly [number, number, number],
  ) => addMesh(root, geometry, material, position, rotation);
  const handle = (length: number, y = 0) => {
    add(new THREE.CylinderGeometry(0.035, 0.045, length, 7), leather, [0, y, 0]);
    add(new THREE.CylinderGeometry(0.047, 0.047, 0.035, 8), trim, [0, y - length * 0.42, 0]);
  };
  const blade = (length: number, width: number, y: number) => {
    add(new THREE.BoxGeometry(width, length, 0.045), steel, [0, y, 0]);
    add(
      new THREE.ConeGeometry(width * 0.48, Math.max(0.1, length * 0.2), 4),
      steel,
      [0, y + length * 0.59, 0],
    );
  };

  root.scale.setScalar(style === "greatsword" ? 0.58 : style === "spear" || style === "staff" ? 0.54 : 0.56);
  root.rotation.z = 0.12;

  if (style === "daggers") {
    for (const side of [-1, 1]) {
      const dagger = new THREE.Group();
      dagger.position.x = side * 0.09;
      dagger.rotation.z = side * -0.12;
      root.add(dagger);
      addMesh(dagger, new THREE.CylinderGeometry(0.025, 0.03, 0.15, 6), leather, [0, 0.01, 0]);
      addMesh(dagger, new THREE.BoxGeometry(0.055, 0.34, 0.03), steel, [0, 0.26, 0]);
      addMesh(dagger, new THREE.ConeGeometry(0.03, 0.12, 4), steel, [0, 0.49, 0]);
      addMesh(dagger, new THREE.BoxGeometry(0.17, 0.035, 0.055), trim, [0, 0.12, 0]);
    }
  } else if (style === "spear") {
    handle(1.12, 0.43);
    add(new THREE.ConeGeometry(0.11, 0.34, 5), steel, [0, 1.15, 0]);
    add(new THREE.CylinderGeometry(0.045, 0.055, 0.055, 7), trim, [0, 0.88, 0]);
  } else if (style === "bow") {
    add(new THREE.TorusGeometry(0.33, 0.035, 6, 20, Math.PI * 1.55), leather, [0, 0.42, 0], [0, 0, Math.PI / 2]);
    add(new THREE.CylinderGeometry(0.012, 0.012, 0.62, 5), trim, [0, 0.42, 0]);
    add(new THREE.BoxGeometry(0.025, 0.42, 0.022), steel, [0.04, 0.42, 0]);
  } else if (style === "staff") {
    handle(1.02, 0.39);
    add(new THREE.CylinderGeometry(0.09, 0.11, 0.055, 7), trim, [0, 0.82, 0]);
    add(new THREE.IcosahedronGeometry(0.14, 1), crystal, [0, 0.96, 0]);
    add(new THREE.TorusGeometry(0.14, 0.018, 5, 10), trim, [0, 0.96, 0], [Math.PI / 2, 0.2, 0]);
  } else if (style === "axe") {
    handle(0.84, 0.32);
    add(new THREE.BoxGeometry(0.34, 0.34, 0.075), steel, [0.17, 0.58, 0]);
    add(new THREE.ConeGeometry(0.18, 0.38, 4), steel, [0.35, 0.58, 0], [0, 0, -Math.PI / 2]);
    add(new THREE.BoxGeometry(0.25, 0.055, 0.09), trim, [0.14, 0.42, 0]);
  } else if (style === "mace") {
    handle(0.76, 0.28);
    add(new THREE.IcosahedronGeometry(0.19, 0), steel, [0, 0.74, 0]);
    for (const side of [-1, 1]) {
      add(new THREE.ConeGeometry(0.055, 0.18, 4), trim, [side * 0.18, 0.74, 0], [0, 0, -side * Math.PI / 2]);
    }
  } else if (style === "greatsword") {
    handle(0.28, 0.01);
    add(new THREE.BoxGeometry(0.29, 0.07, 0.08), trim, [0, 0.17, 0]);
    blade(0.92, 0.19, 0.66);
  } else {
    handle(0.22, 0.03);
    add(new THREE.BoxGeometry(0.25, 0.06, 0.08), trim, [0, 0.16, 0]);
    blade(0.64, 0.12, 0.51);
    add(new THREE.BoxGeometry(0.025, 0.38, 0.014), crystal, [0, 0.51, 0.03]);
  }

  return root;
}

/** Fits an attached weapon to its final world-space size after character normalization. */
export function normalizeDuelWeaponWorldSize(root: THREE.Group, targetMaxDimension: number) {
  root.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(root, true);
  const size = bounds.getSize(new THREE.Vector3());
  const currentMaxDimension = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(currentMaxDimension) || currentMaxDimension <= 0.001) {
    throw new Error("Duel weapon has no measurable world-space size.");
  }

  const target = Number.isFinite(targetMaxDimension)
    ? THREE.MathUtils.clamp(targetMaxDimension, 0.1, 1.5)
    : 1;
  root.scale.multiplyScalar(target / currentMaxDimension);
  root.updateWorldMatrix(true, true);
  return target;
}

export function disposeDuelWeapon(root: THREE.Group) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) material.dispose();
  });
}
