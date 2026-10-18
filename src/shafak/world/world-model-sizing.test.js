import assert from "node:assert/strict";
import test from "node:test";
import {
  getWorldAssetKind,
  getWorldAssetRepresentativeNode,
  getWorldAssetSizeTarget,
  getWorldCharacterFitScale,
  getWorldModelFitScale,
} from "./world-model-sizing.ts";

test("world assets use one shared target table and select one barrel from the multi-prop bundle", () => {
  assert.equal(getWorldAssetKind("/assets/rock-wall.glb"), "rock");
  assert.equal(getWorldAssetKind("/assets/wooden-barrel.glb"), "barrel");
  assert.equal(getWorldAssetRepresentativeNode("/assets/wooden-barrel.glb"), "wooden_barrels_01_barrel01");
  assert.equal(getWorldAssetSizeTarget("/assets/treasure-chest.glb").maxDimension, 1.5);
  assert.equal(getWorldAssetSizeTarget("/assets/ceramic-vase.glb").targetHeight, 0.95);
});

test("rock dimensions are capped by the longest world-space axis, not just source height", () => {
  const fit = getWorldModelFitScale({ x: 0.169, y: 0.144, z: 0.32 }, 1.5, 2);
  assert.equal(fit, 6.25);
  assert.deepEqual(
    [0.169 * fit, 0.144 * fit, 0.32 * fit].map((value) => Number(value.toFixed(3))),
    [1.056, 0.9, 2],
  );
});

test("character fitting keeps the target height unless an asset has an excessive footprint", () => {
  assert.equal(getWorldCharacterFitScale({ x: 0.7, y: 1.8, z: 0.6 }, 1.8), 1);
  assert.equal(getWorldCharacterFitScale({ x: 4.4, y: 1.8, z: 0.6 }, 1.8), 0.6136363636363636);
});
