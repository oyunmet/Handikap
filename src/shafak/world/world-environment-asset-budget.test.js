import assert from "node:assert/strict";
import { statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const environmentModels = [
  "rock-wall.glb",
  "wooden-barrel.glb",
  "treasure-chest.glb",
  "ceramic-vase.glb",
];
const maxEnvironmentAssetBytes = 6 * 1024 * 1024;

test("road environment models stay within the 6 MiB asset budget", () => {
  const sizes = environmentModels.map((name) => ({
    name,
    bytes: statSync(join(process.cwd(), "public", "assets", name)).size,
  }));
  const totalBytes = sizes.reduce((total, asset) => total + asset.bytes, 0);

  assert.ok(
    totalBytes < maxEnvironmentAssetBytes,
    `Environment models exceed 6 MiB: ${sizes.map((asset) => `${asset.name}=${asset.bytes}`).join(", ")}`,
  );
});
