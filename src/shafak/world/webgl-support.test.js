import assert from "node:assert/strict";
import test from "node:test";
import { hasWebGLApi } from "./webgl-support.ts";

test("WebGL support preflight accepts either browser context API without creating a context", () => {
  class WebGL2RenderingContext {}
  class WebGLRenderingContext {}

  assert.equal(hasWebGLApi(WebGL2RenderingContext, undefined), true);
  assert.equal(hasWebGLApi(undefined, WebGLRenderingContext), true);
  assert.equal(hasWebGLApi(undefined, undefined), false);
});
