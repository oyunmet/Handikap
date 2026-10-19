import assert from "node:assert/strict";
import test from "node:test";
import { createDuelArenaBackdropMountains } from "./duel-arena-backdrop.ts";

test("duel backdrop mountains stay behind the arena and below the sky", () => {
  const mountains = createDuelArenaBackdropMountains(["#554b50", "#81706a"]);

  assert.equal(mountains.length, 9);
  assert.ok(mountains.every((mountain) => mountain.z <= -48));
  assert.ok(mountains.every((mountain) => mountain.sy <= 6.6));
  assert.ok(mountains.every((mountain) => mountain.y + mountain.sy <= 3.4));
  assert.ok(mountains.every((mountain) => mountain.color.startsWith("#")));
});

test("duel backdrop requires a usable theme palette", () => {
  assert.throws(() => createDuelArenaBackdropMountains([]), RangeError);
});
