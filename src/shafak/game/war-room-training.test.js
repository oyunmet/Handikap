import assert from "node:assert/strict";
import test from "node:test";
import { createWarRoomTrainingRuntime } from "./war-room-engine.ts";

test("weapon lab runtime uses one stationary, non-lethal training dummy", () => {
  const runtime = createWarRoomTrainingRuntime(["melee_knife", "melee_knife"]);
  assert.equal(runtime.enemies.length, 1);
  assert.equal(runtime.enemies[0].id, "training-dummy");
  assert.equal(runtime.enemies[0].name, "Eğitim Mankeni");
  assert.equal(runtime.enemies[0].damage, 0);
  assert.equal(runtime.enemies[0].hp, runtime.enemies[0].maxHp);
  assert.deepEqual(runtime.healingPoints, []);
});
