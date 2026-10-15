import assert from "node:assert/strict";
import test from "node:test";
import { getWorldChapter } from "./world-content.ts";
import {
  inferWorldProgressFromDefeatedOpponents,
  isWorldChapterCleared,
  limitWorldDistanceAtGate,
  normalizeWorldProgress,
  readWorldProgress,
  saveWorldProgress,
  unlockWorldGate,
  type WorldProgress,
} from "./world-progress.ts";
import { createWorldRouteChoice } from "./route-difficulty.ts";

const initialProgress: WorldProgress = {
  distance: 0,
  depth: 0,
  unlockedThroughChapter: 0,
  routeChoice: null,
};

test("normalizes saved position and keeps already-passed gates open", () => {
  assert.deepEqual(
    normalizeWorldProgress({
      distance: 150,
      depth: 4,
      unlockedThroughChapter: -3,
    }),
    { distance: 150, depth: 1, unlockedThroughChapter: 1, routeChoice: null },
  );
});

test("requires the whole current room to be cleared before unlocking its gate", () => {
  assert.equal(unlockWorldGate(initialProgress, 0, false), initialProgress);
  assert.equal(unlockWorldGate(initialProgress, 1, true), initialProgress);
  assert.deepEqual(unlockWorldGate(initialProgress, 0, true), {
    ...initialProgress,
    unlockedThroughChapter: 1,
  });
});

test("a cleared gate saves the selected hidden route for the next chapter", () => {
  const routeChoice = createWorldRouteChoice("guest:player-1", 1, "right");
  assert.equal(unlockWorldGate(initialProgress, 0, true, { ...routeChoice, chapterId: 2 }), initialProgress);
  assert.deepEqual(unlockWorldGate(initialProgress, 0, true, routeChoice), {
    ...initialProgress,
    unlockedThroughChapter: 1,
    routeChoice,
  });
});

test("does not mistake one victory for clearing the entire chapter", () => {
  const rivals = getWorldChapter(0).rivals;
  assert.equal(isWorldChapterCleared(0, [rivals[0].id]), false);
  assert.equal(isWorldChapterCleared(0, rivals.map((rival) => rival.id)), true);
});

test("stops travel at a locked gate but allows retreat and passage after unlock", () => {
  assert.equal(limitWorldDistanceAtGate(140, 145, 0), 144 - 2.8);
  assert.equal(limitWorldDistanceAtGate(140, 138, 0), 138);
  assert.equal(limitWorldDistanceAtGate(143, 142, 0), 142);
  assert.equal(limitWorldDistanceAtGate(143, 143, 0), 144 - 2.8);
  assert.equal(limitWorldDistanceAtGate(140, 145, 1), 145);
});

test("uses past duel wins to restore a returning player's world position", () => {
  const rival = getWorldChapter(1).rivals[2];
  assert.deepEqual(
    inferWorldProgressFromDefeatedOpponents(initialProgress, [rival.id]),
    {
      distance: rival.distance + 2,
      depth: 0,
      unlockedThroughChapter: 1,
      routeChoice: null,
    },
  );
});

test("saves progress separately for each player", () => {
  const originalStorage = globalThis.localStorage;
  const items = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => items.set(key, value),
    },
  });

  try {
    const saved = { distance: 74.5, depth: -0.35, unlockedThroughChapter: 0, routeChoice: null };
    saveWorldProgress(saved, "player-one");
    assert.deepEqual(readWorldProgress("player-one"), saved);
    assert.deepEqual(readWorldProgress("player-two"), initialProgress);
  } finally {
    if (originalStorage === undefined) delete (globalThis as { localStorage?: Storage }).localStorage;
    else Object.defineProperty(globalThis, "localStorage", { configurable: true, value: originalStorage });
  }
});
