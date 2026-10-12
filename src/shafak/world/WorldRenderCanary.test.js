import assert from "node:assert/strict";
import test from "node:test";
import { readWorldCanaryPixel } from "./WorldRenderCanary.tsx";

function createRendererMock(target, previousTarget, { failRead = false } = {}) {
  const calls = [];
  const info = { render: { frame: 8, calls: 7, triangles: 21, points: 3, lines: 4 } };
  const renderer = {
    calls,
    info,
    getRenderTarget: () => previousTarget,
    getViewport: (value) => value.set(1, 2, 320, 240),
    getScissor: (value) => value.set(3, 4, 100, 80),
    getScissorTest: () => true,
    getContext: () => ({
      readPixels: () => {
        calls.push(["default-read"]);
        throw new Error("The default framebuffer must not be read.");
      },
    }),
    setRenderTarget: (value) => calls.push(["target", value]),
    setViewport: (...value) => calls.push(["viewport", ...value]),
    setScissor: (...value) => calls.push(["scissor", ...value]),
    setScissorTest: (value) => calls.push(["scissor-test", value]),
    clear: (...value) => calls.push(["clear", ...value]),
    render: (scene, camera) => {
      calls.push(["render", scene, camera]);
      info.render.frame += 1;
      info.render.calls += 1;
      info.render.triangles += 2;
    },
    readRenderTargetPixels: (readTarget, x, y, width, height, pixels) => {
      calls.push(["read-target", readTarget, x, y, width, height]);
      if (failRead) throw new Error("mock target read failed");
      pixels.set([255, 0, 0, 255]);
    },
  };
  return renderer;
}

test("the canary renders and reads its own 4×4 target, then restores renderer state", () => {
  const target = { name: "4x4-canary" };
  const previousTarget = { name: "main-target" };
  const scene = { name: "canary-scene" };
  const camera = { name: "canary-camera" };
  const renderer = createRendererMock(target, previousTarget);
  const pixel = new Uint8Array(4);

  const result = readWorldCanaryPixel(
    renderer,
    target,
    scene,
    camera,
    pixel,
  );

  assert.deepEqual(result, [255, 0, 0, 255]);
  assert.deepEqual(
    renderer.calls.filter(([name]) => name).map(([name]) => name),
    ["target", "viewport", "scissor-test", "clear", "render", "read-target", "target", "viewport", "scissor", "scissor-test"],
  );
  assert.equal(renderer.calls.find(([name]) => name === "read-target")[1], target);
  assert.deepEqual(renderer.calls.find(([name]) => name === "read-target").slice(2), [2, 2, 1, 1]);
  assert.deepEqual(renderer.calls.find(([name]) => name === "render").slice(1), [scene, camera]);
  assert.equal(renderer.calls.filter(([name]) => name === "target").at(-1)[1], previousTarget);
  assert.equal(renderer.calls.some(([name]) => name === "default-read"), false);
  assert.deepEqual(renderer.info.render, { frame: 8, calls: 7, triangles: 21, points: 3, lines: 4 });
  assert.deepEqual(
    renderer.calls.filter(([name]) => name === "scissor-test").map(([, value]) => value),
    [false, true],
  );
});

test("renderer state is restored even if the target read fails", () => {
  const target = { name: "4x4-canary" };
  const previousTarget = { name: "main-target" };
  const renderer = createRendererMock(target, previousTarget, { failRead: true });

  assert.throws(
    () => readWorldCanaryPixel(renderer, target, {}, {}, new Uint8Array(4)),
    /mock target read failed/,
  );
  assert.equal(renderer.calls.filter(([name]) => name === "target").at(-1)[1], previousTarget);
  assert.deepEqual(
    renderer.calls.filter(([name]) => name === "scissor-test").map(([, value]) => value),
    [false, true],
  );
});
