import assert from "node:assert/strict";
import test from "node:test";
import { shouldOpenWorldV2Gate } from "./world-v2-gate-state.ts";

test("only an unlocked gate opens near the player and closes after they pass", () => {
  assert.equal(shouldOpenWorldV2Gate(8, 2, 2), false, "locked gates stay shut");
  assert.equal(shouldOpenWorldV2Gate(18, 2, 3), false, "gates remain shut until approached");
  assert.equal(shouldOpenWorldV2Gate(12, 2, 3), true, "an unlocked gate starts opening in interaction range");
  assert.equal(shouldOpenWorldV2Gate(0, 2, 3), true, "the gate remains open while the player passes through");
  assert.equal(shouldOpenWorldV2Gate(-2, 2, 3), false, "the door closes behind the player");
  assert.equal(shouldOpenWorldV2Gate(Number.NaN, 2, 3), false, "invalid positions cannot animate doors open");
});
