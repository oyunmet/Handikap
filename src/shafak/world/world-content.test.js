import assert from "node:assert/strict";
import test from "node:test";
import {
  getWorldChapter,
  buildWorldCollisionGrid,
  pickupRewardTotals,
  resolveWorldObstacleCollision,
  resolveWorldPathCollision,
  validatePickupIds,
} from "./world-content.ts";
import { WORLD_BOT_PROFILES } from "./world-bot-profiles.ts";
import { nextGateDistance } from "./world-generation.ts";

test("seeded chapter content is stable and contains four escalating rivals", () => {
  const first = getWorldChapter(0);
  assert.deepEqual(getWorldChapter(0), first);
  assert.notDeepEqual(getWorldChapter(1), first);
  assert.equal(first.pickups.length, 13);
  assert.equal(first.rivals.length, 4);
  assert.deepEqual(first.rivals.map((rival) => rival.name), [
    "Kapı Muhafızı",
    "Demir Yemin",
    "Kül Okçusu",
    "Gölge Şövalyesi",
  ]);
  assert.deepEqual(first.rivals.map((rival) => rival.archetype), WORLD_BOT_PROFILES.map((profile) => profile.archetype));
  assert.deepEqual(first.rivals.map((rival) => rival.weapon), ["greatsword", "mace", "bow", "spear"]);
  assert.deepEqual(WORLD_BOT_PROFILES.map((profile) => profile.appearance.weaponStyle), [
    "greatsword",
    "mace",
    "bow",
    "daggers",
  ]);
  assert.equal(new Set(first.rivals.map((rival) => rival.armorTint)).size, 4);
  assert.equal(new Set(first.rivals.map((rival) => rival.name)).size, 4);
  assert.ok(first.rivals[0].distance >= 51 && first.rivals[0].distance <= 53);
  assert.ok(first.rivals.every((rival) => rival.id.includes(":rival:")));
  assert.ok(first.rivals.every((rival, index) => index === 0 || rival.level > first.rivals[index - 1].level));
  assert.ok(getWorldChapter(2).pickups.some((pickup) => pickup.kind === "seal-fragment"));
});

test("chapters retain the rock, spike, and breakable barricade plus the next gate", () => {
  const chapter = getWorldChapter(0);
  assert.deepEqual(
    chapter.obstacles.map((obstacle) => obstacle.kind),
    ["rock", "spike-trap", "barricade"],
  );
  assert.deepEqual(
    chapter.obstacles.map((obstacle) => obstacle.distance),
    [42, 77, 116],
  );
  assert.equal(nextGateDistance(78), 144);
});

test("rival identities are stable and distinct across at least 48 encounters", () => {
  const encounters = Array.from({ length: 12 }, (_, chapterId) => getWorldChapter(chapterId).rivals).flat();
  assert.equal(new Set(encounters.map((rival) => rival.name)).size, 48);
  assert.equal(new Set(encounters.map((rival) => rival.id)).size, 48);
  for (const rival of encounters) {
    const chapter = getWorldChapter(rival.chapterId);
    assert.equal(chapter.rivals.find((candidate) => candidate.id === rival.id)?.title, rival.title);
    assert.ok(!rival.id.toLowerCase().includes("bot"));
  }
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
  assert.equal(
    totals.diamonds,
    pickups.filter((pickup) => pickup.kind === "diamond-small").reduce((sum, pickup) => sum + pickup.amount, 0),
  );
  assert.equal(
    totals.materials.ironShards,
    pickups.filter((pickup) => pickup.kind === "iron-shard").reduce((sum, pickup) => sum + pickup.amount, 0),
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

test("spatial collision grid blocks props, permits lateral sliding, and enforces the road edge", () => {
  const chapter = getWorldChapter(0);
  const grid = buildWorldCollisionGrid([chapter]);
  const barricade = chapter.obstacles.find((obstacle) => obstacle.kind === "barricade");
  assert.ok(barricade);

  const stopped = resolveWorldPathCollision(
    barricade.x, barricade.distance - 2,
    barricade.x, barricade.distance + 1,
    grid, new Set(),
  );
  assert.ok(stopped.distance < barricade.distance);

  const slid = resolveWorldPathCollision(
    barricade.x - 3, barricade.distance - 1,
    barricade.x + 4, barricade.distance + 1,
    grid, new Set(),
  );
  assert.ok(slid.x > barricade.x - 2);
  assert.ok(
    Math.abs(slid.x - barricade.x) >= barricade.width / 2 + 0.42
    || Math.abs(slid.distance - barricade.distance) >= 0.72,
  );

  const broken = resolveWorldPathCollision(
    barricade.x, barricade.distance - 2,
    barricade.x, barricade.distance + 1,
    grid, new Set([barricade.id]),
  );
  assert.ok(Math.abs(broken.distance - (barricade.distance + 1)) < 1e-9);

  const edge = resolveWorldPathCollision(4.9, 0, 8, 0, grid, new Set());
  assert.ok(edge.x <= 5.05);
  for (const row of grid.values()) {
    for (const cell of row.values()) {
      assert.ok(cell.every((collider) => !collider.id.includes("pickup")));
    }
  }
});
