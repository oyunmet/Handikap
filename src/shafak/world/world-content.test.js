import assert from "node:assert/strict";
import test from "node:test";
import {
  getWorldChapter,
  buildWorldCollisionGrid,
  pickupRewardTotals,
  resolveWorldObstacleCollision,
  resolveWorldPathCollision,
  validatePickupIds,
  WORLD_JUMP_CLEARANCE_METERS,
} from "./world-content.ts";
import { WORLD_BOT_PROFILES } from "./world-bot-profiles.ts";

test("seeded chapter content is stable and contains four rivals plus a gate boss", () => {
  const first = getWorldChapter(0);
  assert.deepEqual(getWorldChapter(0), first);
  assert.notDeepEqual(getWorldChapter(1), first);
  assert.equal(first.pickups.length, 16);
  assert.equal(first.rivals.length, 5);
  assert.deepEqual(first.rivals.slice(0, 4).map((rival) => rival.name), [
    "Kapı Muhafızı",
    "Demir Yemin",
    "Kül Okçusu",
    "Gölge Şövalyesi",
  ]);
  assert.deepEqual(first.rivals.slice(0, 4).map((rival) => rival.archetype), WORLD_BOT_PROFILES.slice(0, 4).map((profile) => profile.archetype));
  assert.deepEqual(first.rivals.map((rival) => rival.weapon), ["greatsword", "mace", "bow", "spear", "greatsword"]);
  assert.deepEqual(WORLD_BOT_PROFILES.slice(0, 4).map((profile) => profile.appearance.weaponStyle), [
    "greatsword",
    "mace",
    "bow",
    "daggers",
  ]);
  assert.equal(new Set(first.rivals.map((rival) => rival.armorTint)).size, 5);
  assert.equal(new Set(first.rivals.map((rival) => rival.name)).size, 5);
  assert.equal(first.rivals[4].isBoss, true);
  assert.equal(first.rivals[4].archetype, "chapter-boss");
  assert.equal(first.rivals[3].isElite, true);
  assert.equal(first.rivals[4].isElite, false);
  assert.ok(first.rivals[4].distance < 140);
  assert.ok(first.rivals.slice(0, 4).every((rival) => rival.isBoss === false));
  assert.ok(first.rivals[0].distance >= 51 && first.rivals[0].distance <= 53);
  assert.ok(first.rivals.every((rival) => rival.id.includes(":rival:")));
  assert.ok(first.rivals.every((rival, index) => index === 0 || rival.level > first.rivals[index - 1].level));
  assert.ok(getWorldChapter(2).pickups.some((pickup) => pickup.kind === "seal-fragment"));
});

test("rival levels scale with player level and chapter progress while difficulty remains selectable", () => {
  const starter = getWorldChapter(0);
  const advanced = getWorldChapter(0, undefined, 30, "hard");
  assert.ok(advanced.rivals[0].level > starter.rivals[0].level);
  assert.ok(advanced.rivals.every((rival) => rival.difficulty === "hard"));
  assert.ok(advanced.rivals.every((rival) => rival.progressPercent >= 0 && rival.progressPercent <= 100));
  assert.ok(advanced.rivals.every((rival, index) =>
    index === 0 || rival.progressPercent > advanced.rivals[index - 1].progressPercent,
  ));
});

test("road rewards stay within reach and each chapter includes visible hazards", () => {
  const chapter = getWorldChapter(0);
  const cachePickup = chapter.pickups.find((pickup) => pickup.kind === "treasure-cache");
  assert.ok(cachePickup);
  assert.equal(cachePickup.x, 0);
  assert.ok(chapter.pickups.every((pickup) => Math.abs(pickup.x) <= 3.2));
  for (const kind of ["rock", "spike-trap", "low-bar", "barrel", "vase", "barricade", "treasure-chest"]) {
    assert.ok(chapter.obstacles.some((obstacle) => obstacle.kind === kind), `missing ${kind}`);
  }
  const treasureObstacle = chapter.obstacles.find((obstacle) => obstacle.kind === "treasure-chest");
  const chestReward = chapter.pickups.find((pickup) => pickup.kind === "treasure-cache");
  assert.ok(treasureObstacle);
  assert.ok(chestReward);
  assert.equal(treasureObstacle.dropPickupId, chestReward.id);
  assert.equal(chestReward.sourceObstacleId, treasureObstacle.id);
  for (const kind of ["barrel", "vase"]) {
    const obstacle = chapter.obstacles.find((candidate) => candidate.kind === kind);
    const drop = chapter.pickups.find((pickup) => pickup.id === obstacle?.dropPickupId);
    assert.ok(obstacle?.health === 1);
    assert.ok(drop);
    assert.equal(drop.kind, "gold-small");
    assert.equal(drop.sourceObstacleId, obstacle.id);
    assert.equal(drop.x, obstacle.x);
    assert.equal(drop.distance, obstacle.distance);
  }
});

test("all five new rival types and chapter bosses appear in stable chapter content", () => {
  const chapters = Array.from({ length: 3 }, (_, chapterId) => getWorldChapter(chapterId));
  const standardArchetypes = chapters.flatMap((chapter) => chapter.rivals.filter((rival) => !rival.isBoss).map((rival) => rival.archetype));
  assert.equal(new Set(standardArchetypes).size, 9);
  assert.deepEqual(
    chapters.map((chapter) => chapter.rivals.at(-1)?.title),
    ["BÖLÜM BOSSU", "BÖLÜM BOSSU", "BÖLÜM BOSSU"],
  );
  assert.equal(WORLD_BOT_PROFILES.length, 9);
});

test("rival identities are stable and distinct across 60 encounters", () => {
  const encounters = Array.from({ length: 12 }, (_, chapterId) => getWorldChapter(chapterId).rivals).flat();
  assert.equal(new Set(encounters.map((rival) => rival.name)).size, 60);
  assert.equal(new Set(encounters.map((rival) => rival.id)).size, 60);
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
  assert.equal(validatePickupIds(0, chapter.pickups.map((pickup) => pickup.id))?.length, 16);
  assert.equal(validatePickupIds(0, Array.from({ length: 17 }, (_, index) => `unknown-${index}`)), null);
});

test("reward totals are derived from seeded pickup kinds and amounts", () => {
  const pickups = getWorldChapter(2).pickups;
  const totals = pickupRewardTotals(pickups);
  assert.equal(
    totals.gold,
    pickups.filter((pickup) => pickup.kind.startsWith("gold") || pickup.kind === "treasure-cache").reduce((sum, pickup) => sum + pickup.amount, 0),
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

test("only visible gameplay obstacles add collision shapes; roadside scenery stays decorative", () => {
  const chapter = getWorldChapter(0);
  const grid = buildWorldCollisionGrid([chapter]);
  const colliderIds = [...grid.values()]
    .flatMap((row) => [...row.values()].flat())
    .map((collider) => collider.id);
  const expectedIds = chapter.obstacles
    .filter((obstacle) => obstacle.kind !== "spike-trap")
    .map((obstacle) => obstacle.id);

  assert.deepEqual(new Set(colliderIds), new Set(expectedIds));
  assert.equal(colliderIds.length, expectedIds.length);
});

test("crouching clears a low bar while standing remains blocked", () => {
  const collider = {
    id: "low-bar",
    x: 0,
    distance: 10,
    shape: "box",
    radius: 0,
    halfWidth: 1,
    halfDepth: 0.38,
    requiredAction: "crouch",
  };
  const grid = new Map([[0, new Map([[0, [collider]]])]]);
  const standing = resolveWorldPathCollision(0, 7, 0, 13, grid, new Set());
  const crouching = resolveWorldPathCollision(
    0, 7, 0, 13, grid, new Set(), { x: 0, distance: 0 }, { crouching: true },
  );

  assert.ok(standing.distance < 13);
  assert.ok(Math.abs(crouching.distance - 13) < 1e-8);
});

test("jumping clears a rock collider only after reaching jump clearance", () => {
  const collider = {
    id: "jumpable-rock",
    x: 0,
    distance: 10,
    shape: "circle",
    radius: 1,
    halfWidth: 1,
    halfDepth: 1,
    requiredAction: "jump",
  };
  const grid = new Map([[0, new Map([[0, [collider]]])]]);
  const blocked = resolveWorldPathCollision(0, 7, 0, 13, grid, new Set());
  const cleared = resolveWorldPathCollision(
    0, 7, 0, 13, grid, new Set(), { x: 0, distance: 0 }, { jumpHeight: WORLD_JUMP_CLEARANCE_METERS },
  );

  assert.ok(blocked.distance < 13);
  assert.ok(Math.abs(cleared.distance - 13) < 1e-8);
});
