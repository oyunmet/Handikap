import assert from "node:assert/strict";
import test from "node:test";
import { isWorldWatchdogEnabled } from "./world-watchdog-mode.ts";

test("the world watchdog is opt-in and an explicit off value stays disabled", () => {
  assert.equal(isWorldWatchdogEnabled(""), false);
  assert.equal(isWorldWatchdogEnabled("?debug=1"), false);
  assert.equal(isWorldWatchdogEnabled("?watchdog=on"), true);
  assert.equal(isWorldWatchdogEnabled("?debug=1&watchdog=on"), true);
  assert.equal(isWorldWatchdogEnabled("?watchdog=off"), false);
  assert.equal(isWorldWatchdogEnabled("?watchdog=ON"), false);
});
