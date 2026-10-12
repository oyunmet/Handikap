import assert from "node:assert/strict";
import test from "node:test";
import { getDuelCameraPose, getDuelFacingAngle } from "./duel-camera.ts";

test("duel camera stays behind the player while aiming at the opponent", () => {
  for (const [player, opponent] of [
    [{ x: -1.25, z: -0.6 }, { x: 1.25, z: -0.6 }],
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

    const angle = getDuelFacingAngle(player, opponent);
    const playerForwardX = Math.sin(angle);
    const playerForwardZ = Math.cos(angle);
    assert.ok(playerForwardX * dx + playerForwardZ * dz > 0);
    assert.ok(pose.target.x > Math.min(player.x, opponent.x) - 1e-9);
    assert.ok(pose.target.x < Math.max(player.x, opponent.x) + 1e-9);
  }
});
