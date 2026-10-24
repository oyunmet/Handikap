import assert from "node:assert/strict";
import test from "node:test";
import { getKnightActorLocalPosition } from "./knight-actor-transform.ts";

test("duel model position stays local when the combat actor root owns world position", () => {
  assert.deepEqual(getKnightActorLocalPosition(0.6, 0.8, true), [0, 0, 0]);
});

test("world model position still follows normal travel motion", () => {
  assert.deepEqual(getKnightActorLocalPosition(0.5, 0.8), [2.6, 0.8, 0]);
});
