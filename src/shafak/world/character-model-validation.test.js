import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { fitCharacterModel, validateCharacterModel } from "./character-model.ts";

test("character fitting puts the feet pivot on the ground at a consistent target height", () => {
  const model = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.4, 0.55), new THREE.MeshBasicMaterial());
  body.position.set(0.2, 0.7, -0.1);
  model.add(body);

  fitCharacterModel(model, 2.2);
  const result = validateCharacterModel(model, 2.2);
  assert.equal(result.valid, true);
  assert.ok(Math.abs(result.bounds.min.y) < 1e-8);
  assert.ok(Math.abs(result.bounds.max.y - result.bounds.min.y - 2.2) < 1e-8);
});

test("character diagnostics flag a floating model and unexpected dimensions", () => {
  const model = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1, 4.5), new THREE.MeshBasicMaterial());
  body.position.y = 2;
  model.add(body);

  const result = validateCharacterModel(model, 1.8);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.includes("feet pivot")));
  assert.ok(result.issues.some((issue) => issue.includes("height")));
  assert.ok(result.issues.some((issue) => issue.includes("unusually wide")));
});
