import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  loadAsset,
} from "./world-v2-assets.ts";
import { WORLD_V2_CONFIG } from "./world-v2-config.ts";

test("timed-out model requests reject and can be retried instead of staying cached forever", async () => {
  let failedLoads = 0;
  await assert.rejects(
    loadAsset("timeout-retry-player.glb", WORLD_V2_CONFIG.player, {
      loadAsync: async () => {
        failedLoads += 1;
        return new Promise(() => {});
      },
    }, 20),
    /Model yükleme zaman aşımına uğradı.*timeout-retry-player\.glb/,
  );
  assert.equal(failedLoads, 1);

  const scene = new THREE.Group();
  scene.add(new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 1.7, 0.45),
    new THREE.MeshBasicMaterial(),
  ));
  const retried = await loadAsset("timeout-retry-player.glb", WORLD_V2_CONFIG.player, {
    loadAsync: async () => ({ scene, animations: [] }),
  }, 100);
  assert.equal(retried.url, "timeout-retry-player.glb");
  assert.ok(Math.abs(retried.dimensions.y - WORLD_V2_CONFIG.player.targetHeight) < 0.01);
});
