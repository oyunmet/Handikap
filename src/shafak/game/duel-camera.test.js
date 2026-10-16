import assert from "node:assert/strict";
import test from "node:test";
import { DUEL_JUMP_HEIGHT, getDuelCameraPose, getDuelFacingAngle, getDuelJumpHeight, getUprightDuelRotation } from "./duel-camera.ts";
import { getKnightActorRootYaw } from "../world/knight-config.ts";

test("duel camera keeps a stable world heading as fighters move and cross", () => {
  const spawnPlayer = { x: 0, z: 0.75 };
  const spawnOpponent = { x: 0, z: -1.95 };
  const cameraHeading = getDuelFacingAngle(spawnPlayer, spawnOpponent);
  const spawnPose = getDuelCameraPose(spawnPlayer, spawnOpponent, -120, 3.1, 7.2, 0, cameraHeading);
  const movedPose = getDuelCameraPose(
    { x: 3.1, z: -2.4 },
    { x: -2.8, z: 1.9 },
    -120,
    3.1,
    7.2,
    0,
    cameraHeading,
  );
  const headingFromTarget = (pose) => Math.atan2(
    pose.position.x - pose.target.x,
    pose.position.z - pose.target.z,
  );
  assert.ok(Math.abs(headingFromTarget(spawnPose) - headingFromTarget(movedPose)) < 1e-9);
  assert.ok(Number.isFinite(movedPose.position.x) && Number.isFinite(movedPose.position.z));
  assert.ok(Math.abs(movedPose.target.x - 0.15) < 1e-9);
  assert.ok(Math.abs(movedPose.target.z - (-120 - 0.25)) < 1e-9);

  const dx = spawnOpponent.x - spawnPlayer.x;
  const dz = spawnOpponent.z - spawnPlayer.z;
  const viewX = spawnPose.target.x - spawnPose.position.x;
  const viewZ = spawnPose.target.z - spawnPose.position.z;
  const viewLength = Math.hypot(viewX, viewZ);
  const screenRightX = viewZ / viewLength;
  const screenRightZ = -viewX / viewLength;
  const screenSeparation = screenRightX * dx + screenRightZ * dz;
  assert.ok(screenSeparation < -Math.hypot(dx, dz) * 0.85);
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

test("duel root rotations keep pitch and roll pinned to zero", () => {
  assert.deepEqual(getUprightDuelRotation(1.2), [0, 1.2, 0]);
  assert.deepEqual(getUprightDuelRotation(Number.NaN), [0, 0, 0]);
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

test("the duel camera follows the jump arc and returns to its grounded framing", () => {
  const airborne = { jumpStartedTick: 20, jumpUntilTick: 62 };
  assert.equal(getDuelJumpHeight(airborne, 19), 0);
  assert.equal(getDuelJumpHeight(airborne, 20), 0);
  assert.equal(getDuelJumpHeight(airborne, 41), DUEL_JUMP_HEIGHT);
  assert.equal(getDuelJumpHeight(airborne, 62), 0);

  const player = { x: 0, z: 0.75 };
  const opponent = { x: 0, z: -1.95 };
  const grounded = getDuelCameraPose(player, opponent, 0, 3.1, 7.2);
  const lifted = getDuelCameraPose(player, opponent, 0, 3.1, 7.2, DUEL_JUMP_HEIGHT);
  assert.ok(lifted.position.y > grounded.position.y);
  assert.ok(lifted.target.y > grounded.target.y);
});
