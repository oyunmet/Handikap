import assert from "node:assert/strict";
import test from "node:test";
import { calculateNpcDialoguePosition } from "./world-dialogue-layout.ts";

test("mobile NPC dialogue stays above the joystick and movement buttons", () => {
  for (const [width, height, joystickSize] of [
    [390, 830, 116],
    [402, 874, 124],
    [360, 740, 116],
  ]) {
    const [x, y] = calculateNpcDialoguePosition(width / 2, height - 20, { width, height });
    const halfHeight = height < 520 ? 42 : 54;
    const controlsTop = height - 126 - joystickSize;
    assert.ok(y + halfHeight <= controlsTop - 11, `${width}x${height} overlaps the joystick`);
    assert.ok(x >= 12, `${width}x${height} clips the dialogue off the left edge`);
    assert.ok(x <= width - 12, `${width}x${height} clips the dialogue off the right edge`);
  }
});

test("desktop dialogue position remains within the scene", () => {
  const [x, y] = calculateNpcDialoguePosition(0, 1200, { width: 1280, height: 800 });
  assert.ok(x >= 147 && x <= 1133);
  assert.ok(y <= 800 - 145 - 76);
});

test("mobile NPC dialogue stays compact and above the controls without sitting in the screen center", () => {
  const [, y] = calculateNpcDialoguePosition(195, 0, { width: 390, height: 844 });
  assert.ok(y >= 180, "dialogue clears the condensed HUD");
  assert.ok(y <= 220, "dialogue can stay in the upper portion of the world view");
});
