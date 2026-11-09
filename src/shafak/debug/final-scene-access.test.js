import assert from "node:assert/strict";
import test from "node:test";
import {
  formatStartupErrorDiagnostic,
  isStartupErrorDiagnosticRequest,
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

test("startup diagnostics require the exact hidden parameter and stay off in the Play Store TWA", () => {
  const referrer = "android-app://com.safaksavascilari.game";

  assert.equal(isStartupErrorDiagnosticRequest("?debug=diagnostics"), true);
  assert.equal(isStartupErrorDiagnosticRequest("?debug=final"), false);
  assert.equal(isStartupErrorDiagnosticRequest("?debug=1&scene=diagnostics"), false);
  assert.equal(isStartupErrorDiagnosticRequest("?debug=diagnostics", referrer), false);
});

test("startup diagnostic text redacts likely credentials and stays short", () => {
  const diagnostic = formatStartupErrorDiagnostic(
    new Error("pk_live_abc123 Bearer sensitive token=private"),
  );

  assert.equal(
    diagnostic,
    "Error: [key redacted] Bearer [redacted] token=[redacted]",
  );
  assert.ok(formatStartupErrorDiagnostic(new Error("x".repeat(500))).length <= 320);
});
