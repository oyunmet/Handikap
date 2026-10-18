import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { WORLD_CHARACTER_REFERENCE_HEIGHT, WORLD_MODEL_OVERSIZE_MULTIPLIER } from "./world-model-sizing.ts";

export type WorldModelCategory = "hazard" | "npc" | "prop";

export type WorldModelDiagnostic = {
  category: WorldModelCategory;
  name: string;
  worldSizeM: [number, number, number];
  worldScale: [number, number, number];
  maxDimension: number;
  oversized: boolean;
};

function readCategory(object: THREE.Object3D): WorldModelCategory | null {
  let current: THREE.Object3D | null = object;
  while (current) {
    const category = current.userData.worldModelCategory;
    if (category === "hazard" || category === "npc" || category === "prop") return category;
    current = current.parent;
  }
  return null;
}

function getEntityLabel(object: THREE.Object3D) {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (typeof current.userData.worldModelLabel === "string") return current.userData.worldModelLabel;
    current = current.parent;
  }
  return object.name || object.type;
}

function toTuple(vector: THREE.Vector3): [number, number, number] {
  return [
    Number(vector.x.toFixed(3)),
    Number(vector.y.toFixed(3)),
    Number(vector.z.toFixed(3)),
  ];
}

function createDiagnostic(
  category: WorldModelCategory,
  name: string,
  bounds: THREE.Box3,
  worldScale: THREE.Vector3,
): WorldModelDiagnostic {
  const size = bounds.getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z);
  return {
    category,
    name,
    worldSizeM: toTuple(size),
    worldScale: toTuple(worldScale),
    maxDimension: Number(maxDimension.toFixed(3)),
    oversized: maxDimension > WORLD_CHARACTER_REFERENCE_HEIGHT * WORLD_MODEL_OVERSIZE_MULTIPLIER,
  };
}

/** Measures loaded hazards, props, and NPCs in actual world coordinates. */
export function inspectWorldModelMeshes(scene: THREE.Scene): WorldModelDiagnostic[] {
  scene.updateMatrixWorld(true);
  const diagnostics: WorldModelDiagnostic[] = [];
  const bounds = new THREE.Box3();
  const size = new THREE.Vector3();
  const worldScale = new THREE.Vector3();
  const instanceMatrix = new THREE.Matrix4();
  const worldMatrix = new THREE.Matrix4();
  const geometryBounds = new THREE.Box3();
  let unnamedIndex = 0;

  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const category = readCategory(object);
    if (!category) return;
    const entityLabel = getEntityLabel(object);
    const meshLabel = object.name || `${object.type}#${unnamedIndex++}`;

    if (object instanceof THREE.InstancedMesh) {
      object.geometry.computeBoundingBox();
      if (!object.geometry.boundingBox) return;
      geometryBounds.copy(object.geometry.boundingBox);
      for (let index = 0; index < object.count; index += 1) {
        object.getMatrixAt(index, instanceMatrix);
        worldMatrix.multiplyMatrices(object.matrixWorld, instanceMatrix);
        bounds.copy(geometryBounds).applyMatrix4(worldMatrix);
        worldMatrix.decompose(new THREE.Vector3(), new THREE.Quaternion(), worldScale);
        const instanceNames = object.userData.worldPropNames as string[] | undefined;
        const instanceName = instanceNames?.[index] ?? `${entityLabel}:${index}`;
        diagnostics.push(createDiagnostic(category, `${instanceName}/${meshLabel}`, bounds, worldScale));
      }
      return;
    }

    if (object instanceof THREE.SkinnedMesh) {
      object.skeleton.update();
      object.computeBoundingBox();
      if (object.boundingBox) bounds.copy(object.boundingBox).applyMatrix4(object.matrixWorld);
      else bounds.setFromObject(object, true);
    } else {
      bounds.setFromObject(object, true);
    }
    object.getWorldScale(worldScale);
    size.copy(bounds.getSize(new THREE.Vector3()));
    if (![size.x, size.y, size.z].every(Number.isFinite)) return;
    diagnostics.push(createDiagnostic(category, `${entityLabel}/${meshLabel}`, bounds, worldScale));
  });

  return diagnostics;
}

export function WorldScaleDiagnostics({ enabled }: { enabled: boolean }) {
  const scene = useThree((state) => state.scene);
  const elapsedRef = useRef(1);
  const reportedRef = useRef(new Set<string>());

  useFrame((_, delta) => {
    if (!enabled) {
      reportedRef.current.clear();
      elapsedRef.current = 1;
      return;
    }
    elapsedRef.current += Math.min(delta, 0.05);
    if (elapsedRef.current < 1) return;
    elapsedRef.current = 0;

    const rows = inspectWorldModelMeshes(scene);
    const freshRows = rows.filter((row) => {
      const key = `${row.category}:${row.name}`;
      if (reportedRef.current.has(key)) return false;
      reportedRef.current.add(key);
      return true;
    });
    if (!freshRows.length) return;

    console.groupCollapsed(`[shafak-world] World model dimensions (${freshRows.length} new meshes/instances)`);
    console.table(freshRows.map(({ category, name, worldSizeM, worldScale }) => ({
      category,
      name,
      worldSizeM: worldSizeM.join(" × "),
      worldScale: worldScale.join(" × "),
    })));
    const oversized = freshRows.filter((row) => row.oversized);
    if (oversized.length) {
      console.warn(
        `[shafak-world] Models wider than ${WORLD_CHARACTER_REFERENCE_HEIGHT * WORLD_MODEL_OVERSIZE_MULTIPLIER}m (3× player height)`,
        oversized,
      );
    }
    console.groupEnd();
  });

  return null;
}
