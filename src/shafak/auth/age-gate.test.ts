import assert from "node:assert/strict";
import test from "node:test";
import {
  AGE_GATE_STORAGE_KEY,
  parseAgeGateChoice,
  readAgeGateChoice,
  writeAgeGateChoice,
} from "./age-gate.ts";

test("age gate requires an explicit adult confirmation", () => {
  assert.equal(parseAgeGateChoice(null), "unknown");
  assert.equal(parseAgeGateChoice("adult"), "adult");
  assert.equal(parseAgeGateChoice("underage"), "underage");
  assert.equal(parseAgeGateChoice("13"), "unknown");
});

test("age decision storage handles blocked storage safely", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
  writeAgeGateChoice(storage, "adult");
  assert.equal(values.get(AGE_GATE_STORAGE_KEY), "adult");
  assert.equal(readAgeGateChoice(storage), "adult");
  assert.equal(readAgeGateChoice({
    getItem() { throw new Error("blocked"); },
  }), "unknown");
});
