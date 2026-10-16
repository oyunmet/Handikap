import assert from "node:assert/strict";
import test from "node:test";
import { DUEL_JUMP_HEIGHT, getDuelCameraPose, getDuelFacingAngle, getDuelJumpHeight, getUprightDuelRotation } from "./duel-camera.ts";
import { getKnightActorRootYaw } from "../world/knight-config.ts";

test("duel camera keeps a stable world heading as fighters move and cross", () => {
  const spawnPlayer = { x: 0, z: 0.75 };
  const spawnOpponent = { x: 0, z: -1.95 };
  const cameraHeading = getDuelFacingAngle(spawnPlayer, spawnOpponent);
  const spawnPose = getDuelCameraPose(spawnPlayer, spawnOpponent, -120, 8.4, 1.2, 0, cameraHeading);
  const movedPose = getDuelCameraPose(
    { x: 3.1, z: -2.4 },
    { x: -2.8, z: 1.9 },
    -120,
    8.4,
    1.2,
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

  assert.ok(spawnPose.position.z > spawnPose.target.z);
  assert.ok(Math.abs(spawnPose.position.x - spawnPose.target.x) < 2);
  assert.ok(movedPose.position.z > movedPose.target.z);
  assert.ok(Math.abs(movedPose.position.x - movedPose.target.x) < 2);
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

test("the camera keeps both fighters in a clear rear three-quarter frame", () => {
  const player = { x: 0, z: 0.75 };
  const opponent = { x: 0, z: -1.95 };
  const pose = getDuelCameraPose(player, opponent, 0, 8.4, 1.2);
  assert.ok(pose.position.z > player.z);
  assert.ok(Math.abs(pose.position.x) < 2, "camera should not move far to the player's side");
  assert.ok(pose.target.z < player.z && pose.target.z > opponent.z);

  const viewX = pose.target.x - pose.position.x;
  const viewZ = pose.target.z - pose.position.z;
  const viewLength = Math.hypot(viewX, viewZ);
  const screenRightX = viewZ / viewLength;
  const screenRightZ = -viewX / viewLength;
  const duelX = opponent.x - player.x;
  const duelZ = opponent.z - player.z;
  const screenSeparation = screenRightX * duelX + screenRightZ * duelZ;
  assert.ok(Math.abs(screenSeparation) < Math.hypot(duelX, duelZ) * 0.35, "fighters should not be forced into a side-on horizontal lineup");
});

test("the mobile camera stays behind the duel instead of crossing to its side", () => {
  const player = { x: 0, z: 0.75 };
  const opponent = { x: 0, z: -1.95 };
  const pose = getDuelCameraPose(player, opponent, 0, 8.4, 1.2);
  const dx = opponent.x - player.x;
  const dz = opponent.z - player.z;
  const cameraHeadingDot = (pose.position.x - player.x) * dx + (pose.position.z - player.z) * dz;
  assert.ok(cameraHeadingDot < 0, "camera must stay on the player's rear side");
  assert.ok(Math.abs(pose.position.x) < 2, "mobile camera should use only a small shoulder offset");
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
  const grounded = getDuelCameraPose(player, opponent, 0, 8.4, 1.2);
  const lifted = getDuelCameraPose(player, opponent, 0, 8.4, 1.2, DUEL_JUMP_HEIGHT);
  assert.ok(lifted.position.y > grounded.position.y);
  assert.ok(lifted.target.y > grounded.target.y);
});
