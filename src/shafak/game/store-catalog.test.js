import assert from "node:assert/strict";
import test from "node:test";
import { STORE_CATALOG as SERVER_CATALOG } from "../../../server/storeCatalog.ts";
import { getDailySpecials, isDailySpecialAvailable, STORE_CATALOG as GAME_CATALOG } from "./store-catalog.ts";
import catalogHandler from "../../../api/store/catalog.ts";

test("guest gameplay and server purchases share the same populated catalog", () => {
  assert.strictEqual(SERVER_CATALOG, GAME_CATALOG);
  const minimums = { weapons: 8, armor: 8, accessories: 10, consumables: 6, materials: 3, specials: 4 };
  for (const [category, minimum] of Object.entries(minimums)) {
    const items = GAME_CATALOG.filter((item) => item.category === category);
    assert.ok(items.length >= minimum, `${category} has ${items.length} items`);
    for (const item of items) {
      assert.ok(item.name && item.description && item.rarity);
      assert.ok(Number.isFinite(item.price.gold) && Number.isFinite(item.price.diamonds));
      assert.ok(item.stats && item.visual);
      assert.ok(["equipment", "consumable", "material"].includes(item.kind));
    }
  }
  assert.ok(GAME_CATALOG.some((item) => item.id === "weapon_hunting_knife" && item.price.gold > 0 && item.upgradeable));
  assert.ok(GAME_CATALOG.some((item) => item.id === "weapon_short_bow" && item.visual.weaponStyle === "bow"));
  assert.ok(GAME_CATALOG.some((item) => item.id === "weapon_road_spear" && item.visual.weaponStyle === "spear"));
  assert.ok(GAME_CATALOG.some((item) => item.slot === "helmet"));
  assert.ok(GAME_CATALOG.some((item) => item.slot === "gloves"));
  assert.ok(GAME_CATALOG.some((item) => item.slot === "boots"));
  assert.ok(GAME_CATALOG.some((item) => item.slot === "ring"));
  assert.ok(GAME_CATALOG.some((item) => item.slot === "offhand" && item.visual.shieldColor));
  assert.ok(GAME_CATALOG.filter((item) => item.category === "consumables" || item.category === "materials")
    .every((item) => item.slot === null && item.reward));
});

test("special offers rotate once per Istanbul day and are identical for all players that day", () => {
  const firstDay = getDailySpecials(new Date("2026-10-14T12:00:00.000Z")).map((item) => item.id);
  const sameDay = getDailySpecials(new Date("2026-10-14T18:00:00.000Z")).map((item) => item.id);
  const nextDay = getDailySpecials(new Date("2026-10-15T12:00:00.000Z")).map((item) => item.id);
  assert.deepEqual(sameDay, firstDay);
  assert.notDeepEqual(nextDay, firstDay);
  assert.ok(firstDay.every((id) => isDailySpecialAvailable(id, new Date("2026-10-14T12:00:00.000Z"))));
  assert.equal(isDailySpecialAvailable("special_ash_reaver", new Date("2026-10-14T12:00:00.000Z")), firstDay.includes("special_ash_reaver"));
});

test("the Vercel catalog handler returns the shared catalog as public JSON", async () => {
  const headers = {};
  let status = 0;
  let body;
  const response = {
    setHeader(name, value) { headers[name] = value; },
    status(code) { status = code; return this; },
    json(value) { body = value; },
    end(value) { body = value; },
  };

  await catalogHandler({ method: "GET" }, response);

  assert.equal(status, 200);
  assert.match(headers["Cache-Control"], /max-age=60/);
  assert.deepEqual(body.items, GAME_CATALOG);
});
