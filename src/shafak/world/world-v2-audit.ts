import * as THREE from "three";
import { WORLD_V2_CONFIG } from "./world-v2-config";

export type WorldMeshSizeIssue = {
  name: string;
  dimensions: [number, number, number];
  maxDimension: number;
  instanceId?: number;
  error: boolean;
};

const instanceMatrix = new THREE.Matrix4();
const worldMatrix = new THREE.Matrix4();
const localBounds = new THREE.Box3();
const worldBounds = new THREE.Box3();
const size = new THREE.Vector3();

function addIssue(issues: WorldMeshSizeIssue[], object: THREE.Mesh, bounds: THREE.Box3, instanceId?: number) {
  if (object.userData.worldV2RoadGround === true || object.userData.worldV2AuditExempt === true) return;
  bounds.getSize(size);
  const maxDimension = Math.max(size.x, size.y, size.z);
  if (maxDimension <= WORLD_V2_CONFIG.debugWarningLimit) return;
  issues.push({
    name: object.name || object.parent?.name || object.type,
    dimensions: [size.x, size.y, size.z].map((value) => Number(value.toFixed(3))) as [number, number, number],
    maxDimension: Number(maxDimension.toFixed(3)),
    ...(instanceId === undefined ? {} : { instanceId }),
    error: maxDimension > WORLD_V2_CONFIG.meshAuditLimit,
  });
}

/** Audits world-space mesh bounds, including each InstancedMesh matrix scale. */
export function auditWorldMeshSizes(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const issues: WorldMeshSizeIssue[] = [];
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    if (object instanceof THREE.SkinnedMesh) {
      object.skeleton.update();
      object.computeBoundingBox();
      if (!object.boundingBox) return;
      localBounds.copy(object.boundingBox);
    } else {
      object.geometry.computeBoundingBox();
      if (!object.geometry.boundingBox) return;
      localBounds.copy(object.geometry.boundingBox);
    }

    if (object instanceof THREE.InstancedMesh) {
      for (let index = 0; index < object.count; index += 1) {
        object.getMatrixAt(index, instanceMatrix);
        worldMatrix.multiplyMatrices(object.matrixWorld, instanceMatrix);
        worldBounds.copy(localBounds).applyMatrix4(worldMatrix);
        addIssue(issues, object, worldBounds, index);
      }
      return;
    }

    worldBounds.copy(localBounds).applyMatrix4(object.matrixWorld);
    addIssue(issues, object, worldBounds);
  });
  return issues;
}

export function reportWorldMeshSizeIssues(issues: readonly WorldMeshSizeIssue[]) {
  for (const issue of issues) {
    const message = `[world-v2] Mesh exceeds ${issue.error ? "12m limit" : "6m debug warning"}: ${issue.name} (${issue.dimensions.join(" × ")}m)`;
    if (issue.error) console.error(message, issue);
    else console.warn(message, issue);
  }
}
