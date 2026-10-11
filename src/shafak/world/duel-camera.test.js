import assert from "node:assert/strict";
import test from "node:test";
import { getDuelCameraFraming } from "./duel-camera.ts";

test("lock-on camera centers both fighters and shows them from a side angle", () => {
  const player = { x: -1.15, z: 0.15, yaw: 0 };
  const bot = { x: 1.15, z: -1.45, yaw: 0 };
  const framing = getDuelCameraFraming({
    player,
    bot,
    aspect: 0.57,
    orbitYaw: 0,
    lockOn: true,
  });
  const fightYaw = Math.atan2(bot.x - player.x, bot.z - player.z);
  const screenWidthShare = Math.abs(Math.sin(fightYaw - framing.yaw));

  assert.equal(framing.targetX, 0);
  assert.equal(framing.targetZ, -0.65);
  assert.ok(screenWidthShare > 0.8, `fighters should not line up behind one another (${screenWidthShare})`);
});

test("portrait framing zooms out as fighters separate and remains bounded", () => {
  const frame = (gap, aspect) => getDuelCameraFraming({
    player: { x: -gap / 2, z: 0 },
    bot: { x: gap / 2, z: 0 },
    aspect,
    orbitYaw: 0,
    lockOn: true,
  });
  const closePortrait = frame(1.2, 0.57);
  const widePortrait = frame(7.7, 0.57);
  const wideLandscape = frame(7.7, 1.7);

  assert.equal(closePortrait.fov, 60);
  assert.ok(widePortrait.distance > closePortrait.distance);
  assert.ok(widePortrait.distance > wideLandscape.distance);
  assert.ok(widePortrait.distance <= 22);
  assert.ok(Number.isFinite(widePortrait.yaw));
});

test("free camera mode preserves the user's orbit direction", () => {
  const framing = getDuelCameraFraming({
    player: { x: -1, z: 0 },
    bot: { x: 1, z: 0 },
    aspect: 1.2,
    orbitYaw: 0.73,
    lockOn: false,
  });

  assert.ok(Math.abs(framing.yaw - 0.73) < 1e-9);
  assert.equal(framing.fov, 46);
});
