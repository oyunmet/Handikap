import assert from "node:assert/strict";
import test from "node:test";
import { getDuelCameraPose, getDuelFacingAngle } from "./duel-camera.ts";
import { getKnightActorRootYaw } from "../world/knight-config.ts";

test("duel camera stays behind the player and places both fighters side by side", () => {
  for (const [player, opponent] of [
    [{ x: 0, z: 0.75 }, { x: 0, z: -1.95 }],
    [{ x: 0.8, z: 1.2 }, { x: -1.6, z: -1.1 }],
  ]) {
    const pose = getDuelCameraPose(player, opponent, -120);
    const dx = opponent.x - player.x;
    const dz = opponent.z - player.z;
    const length = Math.hypot(dx, dz);
    const cameraFromPlayerX = pose.position.x - player.x;
    const cameraFromPlayerZ = pose.position.z - (-120 + player.z);
    const cameraHeadingDot = (cameraFromPlayerX * dx + cameraFromPlayerZ * dz) / length;
    assert.ok(cameraHeadingDot < 0, "camera must be on the player's rear side");

    const viewX = pose.target.x - pose.position.x;
    const viewZ = pose.target.z - pose.position.z;
    const viewLength = Math.hypot(viewX, viewZ);
    const screenRightX = viewZ / viewLength;
    const screenRightZ = -viewX / viewLength;
    const screenSeparation = screenRightX * dx + screenRightZ * dz;
    assert.ok(screenSeparation < -length * 0.85, "the player must project to the right of the rival");

    const rootYaw = getKnightActorRootYaw(getDuelFacingAngle(player, opponent));
    const playerForwardX = -Math.sin(rootYaw);
    const playerForwardZ = -Math.cos(rootYaw);
    assert.ok(playerForwardX * dx + playerForwardZ * dz > 0);
    assert.ok(pose.target.x > Math.min(player.x, opponent.x) - 1e-9);
    assert.ok(pose.target.x < Math.max(player.x, opponent.x) + 1e-9);
  }
});

test("procedural duel fighters turn their armored fronts toward one another", () => {
  const player = { x: 0, z: 0.75 };
  const opponent = { x: 0, z: -1.95 };
  for (const [actor, rival] of [[player, opponent], [opponent, player]]) {
    const dx = rival.x - actor.x;
    const dz = rival.z - actor.z;
    const yaw = getKnightActorRootYaw(getDuelFacingAngle(actor, rival));
    const frontX = -Math.sin(yaw);
    const frontZ = -Math.cos(yaw);
    assert.ok(frontX * dx + frontZ * dz > 0, "each armored front must point toward the rival");
  }
});

test("the camera shows a side-on face-off while remaining behind the player", () => {
  const player = { x: 0, z: 0.75 };
  const opponent = { x: 0, z: -1.95 };
  const pose = getDuelCameraPose(player, opponent, 0, 3.1, 7.2);
  assert.ok(pose.position.z > player.z);
  assert.ok(pose.position.x > player.x, "camera should expose the player's weapon-side silhouette");
  assert.ok(pose.target.z < player.z && pose.target.z > opponent.z);

  const viewX = pose.target.x - pose.position.x;
  const viewZ = pose.target.z - pose.position.z;
  const viewLength = Math.hypot(viewX, viewZ);
  const screenRightX = viewZ / viewLength;
  const screenRightZ = -viewX / viewLength;
  const duelX = opponent.x - player.x;
  const duelZ = opponent.z - player.z;
  const screenSeparation = screenRightX * duelX + screenRightZ * duelZ;
  assert.ok(Math.abs(screenSeparation) > Math.hypot(duelX, duelZ) * 0.85, "fighters should be separated horizontally on screen");
});

test("the mobile camera keeps the side-on composition with moved fighters", () => {
  const player = { x: 0, z: 0.75 };
  const opponent = { x: 0, z: -1.95 };
  const shoulderOffset = 7.2;
  const pose = getDuelCameraPose(player, opponent, 0, 3.1, shoulderOffset);
  const dx = opponent.x - player.x;
  const dz = opponent.z - player.z;
  const cameraHeadingDot = (pose.position.x - player.x) * dx + (pose.position.z - player.z) * dz;
  assert.ok(cameraHeadingDot < 0, "camera must stay on the player's rear side");
  assert.ok(pose.position.x > 6, "camera should stand far enough to the side to reveal both fighters");
  assert.ok(pose.target.z < player.z && pose.target.z > opponent.z);
});
