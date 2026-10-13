import test from "node:test";
import assert from "node:assert/strict";
import { isIOSDevice } from "./renderer-settings.ts";

test("detects iPhone and iPad browsers, including iPad desktop mode", () => {
  assert.equal(isIOSDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)", "iPhone"), true);
  assert.equal(isIOSDevice("Mozilla/5.0 (iPad; CPU OS 18_0)", "iPad"), true);
  assert.equal(isIOSDevice("Mozilla/5.0 (Macintosh)", "MacIntel", 5), true);
});

test("keeps desktop and Android devices on the 3D renderer", () => {
  assert.equal(isIOSDevice("Mozilla/5.0 (Macintosh)", "MacIntel", 0), false);
  assert.equal(isIOSDevice("Mozilla/5.0 (Linux; Android 15)", "Linux armv8l", 5), false);
});
