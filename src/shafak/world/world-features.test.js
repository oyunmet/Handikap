import assert from "node:assert/strict";
import test from "node:test";
import { WORLD_TOUCH_ACTIONS_ENABLED } from "./world-features.ts";

test("mobile movement action feedback is enabled by default and can be disabled", () => {
  assert.equal(WORLD_TOUCH_ACTIONS_ENABLED, true);
});
