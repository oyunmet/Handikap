import assert from "node:assert/strict";
import test from "node:test";
import { getTotalProfileXp } from "./profile.ts";

test("total profile XP includes completed level thresholds and current progress", () => {
  assert.equal(getTotalProfileXp({ level: 1, xp: 34 }), 34);
  assert.equal(getTotalProfileXp({ level: 2, xp: 10 }), 155);
  assert.equal(getTotalProfileXp({ level: 3, xp: 0 }), 335);
});
