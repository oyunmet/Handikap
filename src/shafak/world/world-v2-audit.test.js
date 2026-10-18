import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { auditWorldMeshSizes } from "./world-v2-audit.ts";
import { createWorldV2Environment } from "./world-v2-geometry.ts";

test("new environment meshes remain within the 12m world limit", () => {
  const environment = createWorldV2Environment();
  try {
    const issues = auditWorldMeshSizes(environment.root);
    assert.ok(issues.some((issue) => issue.maxDimension > 6.5), "tower meshes should be measured in world units");
    assert.deepEqual(issues.filter((issue) => issue.error), []);
  } finally {
    environment.dispose();
  }
});

test("world-size audit checks each InstancedMesh scale", () => {
  const root = new THREE.Group();
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial();
  const instances = new THREE.InstancedMesh(geometry, material, 1);
  const matrix = new THREE.Matrix4().makeScale(13, 1, 1);
  instances.setMatrixAt(0, matrix);
  root.add(instances);

  const issues = auditWorldMeshSizes(root);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].instanceId, 0);
  assert.equal(issues[0].error, true);
  assert.equal(issues[0].maxDimension, 13);
  geometry.dispose();
  material.dispose();
});
