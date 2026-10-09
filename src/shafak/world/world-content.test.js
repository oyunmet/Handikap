import assert from "node:assert/strict";
import test from "node:test";
import {
  getWorldChapter,
  pickupRewardTotals,
  resolveWorldObstacleCollision,
  validatePickupIds,
} from "./world-content.ts";

test("seeded chapter content is stable and contains four escalating BOTs", () => {
  const first = getWorldChapter(0);
  assert.deepEqual(getWorldChapter(0), first);
  assert.notDeepEqual(getWorldChapter(1), first);
  assert.equal(first.pickups.length, 13);
  assert.equal(first.rivals.length, 4);
  assert.ok(first.rivals[0].distance >= 51 && first.rivals[0].distance <= 53);
  assert.ok(first.rivals.every((rival) => rival.id.includes(":bot:")));
  assert.ok(first.rivals.every((rival, index) => index === 0 || rival.level > first.rivals[index - 1].level));
  assert.ok(getWorldChapter(2).pickups.some((pickup) => pickup.kind === "seal-fragment"));
});

test("server-side pickup validation accepts only unique IDs from the requested chapter", () => {
  const chapter = getWorldChapter(0);
  const valid = [chapter.pickups[0].id, chapter.pickups[1].id];
  assert.deepEqual(validatePickupIds(0, valid), [chapter.pickups[0], chapter.pickups[1]]);
  assert.equal(validatePickupIds(0, [...valid, valid[0]]), null);
  assert.equal(validatePickupIds(0, ["ash-road:1:pickup:0"]), null);
  assert.equal(validatePickupIds(0, ["x".repeat(91)]), null);
  assert.equal(validatePickupIds(0, Array(15).fill(chapter.pickups[0].id)), null);
});

test("reward totals are derived from seeded pickup kinds and amounts", () => {
  const pickups = getWorldChapter(2).pickups;
  const totals = pickupRewardTotals(pickups);
  assert.equal(
    totals.gold,
    pickups.filter((pickup) => pickup.kind.startsWith("gold")).reduce((sum, pickup) => sum + pickup.amount, 0),
  );
  assert.equal(
    totals.materials.emberCrystals,
    pickups.filter((pickup) => pickup.kind === "ember-crystal").reduce((sum, pickup) => sum + pickup.amount, 0),
  );
  assert.equal(totals.materials.sealFragments, 1);
});

test("rocks and intact barricades stop forward travel unless the player dodges or breaks them", () => {
  const barricade = getWorldChapter(0).obstacles.find((obstacle) => obstacle.kind === "barricade");
  assert.ok(barricade);
  assert.equal(
    resolveWorldObstacleCollision(barricade.distance - 2, barricade.x, barricade.distance + 1, barricade.x, [barricade], new Set()),
    barricade.distance - 1.25,
  );
  assert.equal(
    resolveWorldObstacleCollision(barricade.distance - 2, barricade.x + 2, barricade.distance + 1, barricade.x + 2, [barricade], new Set()),
    barricade.distance + 1,
  );
  assert.equal(
    resolveWorldObstacleCollision(barricade.distance - 2, barricade.x, barricade.distance + 1, barricade.x, [barricade], new Set([barricade.id])),
    barricade.distance + 1,
  );
});
