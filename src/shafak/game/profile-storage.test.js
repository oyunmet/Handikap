import assert from "node:assert/strict";
import test from "node:test";
import { clearLocalProfileCopies } from "./profile.ts";

test("account deletion clears this browser's player profile copies only", () => {
  const original = globalThis.localStorage;
  const values = new Map([
    ["shafak-local-profile-v1:guest", "guest profile"],
    ["shafak-local-profile-v1:user_123", "account profile"],
    ["shafak-settings-v3", "device settings"],
    ["unrelated", "other data"],
  ]);
  globalThis.localStorage = {
    get length() {
      return values.size;
    },
    key(index) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
  };

  try {
    clearLocalProfileCopies();
    assert.deepEqual([...values.keys()].sort(), ["shafak-settings-v3", "unrelated"]);
  } finally {
    if (original === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = original;
  }
});
