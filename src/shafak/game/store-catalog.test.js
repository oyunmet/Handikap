import assert from "node:assert/strict";
import test from "node:test";
import { STORE_CATALOG as SERVER_CATALOG } from "../../../server/storeCatalog.ts";
import { STORE_CATALOG as GAME_CATALOG } from "./store-catalog.ts";
import catalogHandler from "../../../api/store/catalog.ts";

test("guest gameplay and server purchases share the same populated catalog", () => {
  assert.strictEqual(SERVER_CATALOG, GAME_CATALOG);
  const minimums = { weapons: 5, armor: 4, capes: 4, effects: 3, dyes: 4 };
  for (const [category, minimum] of Object.entries(minimums)) {
    const items = GAME_CATALOG.filter((item) => item.category === category);
    assert.ok(items.length >= minimum, `${category} has ${items.length} items`);
    for (const item of items) {
      assert.ok(item.name && item.description && item.rarity);
      assert.ok(Number.isFinite(item.price.gold) && Number.isFinite(item.price.diamonds));
      assert.ok(item.stats && item.visual);
    }
  }
});

test("the Vercel catalog handler returns the shared catalog as public JSON", () => {
  const headers = {};
  let status = 0;
  let body;
  const response = {
    setHeader(name, value) { headers[name] = value; },
    status(code) { status = code; return this; },
    json(value) { body = value; },
    end(value) { body = value; },
  };

  catalogHandler({ method: "GET" }, response);

  assert.equal(status, 200);
  assert.match(headers["Cache-Control"], /max-age=60/);
  assert.deepEqual(body.items, GAME_CATALOG);
});
