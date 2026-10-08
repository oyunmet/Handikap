import assert from "node:assert/strict";
import test from "node:test";
import { readWorldDebugConfig } from "./world-debug.ts";

test("world debug preview is available only in development", () => {
  assert.deepEqual(
    readWorldDebugConfig("?worldDebug=1&worldDistance=20", false),
    { enabled: false, startDistance: 0 },
  );
  assert.deepEqual(
    readWorldDebugConfig("?worldDebug=1&worldDistance=20", true),
    { enabled: true, startDistance: 20 },
  );
});

test("world debug distance is safely bounded", () => {
  assert.equal(readWorldDebugConfig("?worldDebug=1&worldDistance=999", true).startDistance, 143);
  assert.equal(readWorldDebugConfig("?worldDebug=1&worldDistance=oops", true).startDistance, 0);
});
