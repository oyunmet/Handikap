import test from "node:test";
import assert from "node:assert/strict";
import { shouldStartInWorld, worldVersionFromSearch } from "./world-version.ts";

test("the rebuilt renderer is the only default world version", () => {
  assert.equal(worldVersionFromSearch(""), "v2");
  assert.equal(worldVersionFromSearch("?world=v1"), "v2");
  assert.equal(worldVersionFromSearch("?world=v2"), "v2");
});

test("world selection ignores unrelated query parameters", () => {
  assert.equal(worldVersionFromSearch("?debug=1&world=v2"), "v2");
  assert.equal(worldVersionFromSearch("?world=V2"), "v2");
});

test("the v2 and existing diagnostic URLs open the world directly", () => {
  assert.equal(shouldStartInWorld("?world=v2"), true);
  assert.equal(shouldStartInWorld("?world=legacy"), false);
  assert.equal(shouldStartInWorld("?selftest=1"), true);
  assert.equal(shouldStartInWorld("?debug=1&scene=world"), true);
  assert.equal(shouldStartInWorld("?debug=1"), false);
});
