import test from "node:test";
import assert from "node:assert/strict";
import { createWorldRouteChoice, getDoorDifficulty } from "./route-difficulty.ts";

test("a player always gets one hidden easy and one hidden hard door per chapter", () => {
  for (const chapterId of [1, 2, 10, 999]) {
    const left = getDoorDifficulty("player-1", chapterId, "left");
    const right = getDoorDifficulty("player-1", chapterId, "right");
    assert.notEqual(left, right);
    assert.deepEqual(new Set([left, right]), new Set(["easy", "hard"]));
  }
});

test("the hidden assignment is stable for the same player and differs by player identity", () => {
  const choice = createWorldRouteChoice("player-1", 4, "left");
  assert.deepEqual(createWorldRouteChoice("player-1", 4, "left"), choice);
  assert.equal(getDoorDifficulty("player-1", 4, "left"), choice.difficulty);
});
