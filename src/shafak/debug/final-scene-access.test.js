import assert from "node:assert/strict";
import test from "node:test";
import {
  isPlayStoreTwaReferrer,
  resolveFinalSceneDebugRequest,
} from "./final-scene-access.ts";

test("only the exact final-scene debug parameter requests the preview", () => {
  assert.deepEqual(resolveFinalSceneDebugRequest("?debug=final"), {
    forceFallback: false,
  });
  assert.equal(resolveFinalSceneDebugRequest("?debug=1&scene=menu"), null);
  assert.equal(resolveFinalSceneDebugRequest("?debug=other"), null);
  assert.equal(resolveFinalSceneDebugRequest("?fallback=1"), null);
});

test("fallback mode is enabled only by fallback=1 on the final-scene route", () => {
  assert.deepEqual(
    resolveFinalSceneDebugRequest("?debug=final&fallback=1"),
    { forceFallback: true },
  );
  assert.deepEqual(
    resolveFinalSceneDebugRequest("?debug=final&fallback=true"),
    { forceFallback: false },
  );
});

test("the Play Store TWA ignores the final-scene test route", () => {
  const referrer = "android-app://com.safaksavascilari.game";

  assert.equal(isPlayStoreTwaReferrer(referrer), true);
  assert.equal(isPlayStoreTwaReferrer(`${referrer}/`), true);
  assert.equal(isPlayStoreTwaReferrer("https://example.com/"), false);
  assert.equal(
    resolveFinalSceneDebugRequest(
      "?debug=final&fallback=1",
      referrer,
    ),
    null,
  );
});
