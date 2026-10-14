import assert from "node:assert/strict";
import test from "node:test";
import { getDuelCameraPose, getDuelFacingAngle } from "./duel-camera.ts";
import { getKnightActorRootYaw } from "../world/knight-config.ts";

test("duel camera stays behind the player while aiming at the opponent", () => {
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

test("the camera stays almost directly behind the player for a straight face-off", () => {
  const player = { x: 0, z: 0.75 };
  const opponent = { x: 0, z: -1.95 };
  const pose = getDuelCameraPose(player, opponent, 0, 8.2, 0.55);
  assert.ok(pose.position.z > player.z);
  assert.ok(Math.abs(pose.position.x - player.x) < 1);
  assert.ok(pose.target.z < player.z && pose.target.z > opponent.z);
});

test("a wider mobile shoulder view remains behind the player and exposes the rival", () => {
  const player = { x: 0, z: 0.75 };
  const opponent = { x: 0, z: -1.95 };
  const shoulderOffset = 1.65;
  const pose = getDuelCameraPose(player, opponent, 0, 10.1, shoulderOffset);
  const dx = opponent.x - player.x;
  const dz = opponent.z - player.z;
  const cameraHeadingDot = (pose.position.x - player.x) * dx + (pose.position.z - player.z) * dz;
  assert.ok(cameraHeadingDot < 0, "camera must stay on the player's rear side");
  assert.equal(pose.position.x, shoulderOffset);
  assert.ok(pose.target.z < player.z && pose.target.z > opponent.z);
});
