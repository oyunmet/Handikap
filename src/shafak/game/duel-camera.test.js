import assert from "node:assert/strict";
import test from "node:test";
import {
  DUEL_CAMERA_ARENA_CENTER_Z,
  DUEL_CAMERA_ARENA_RADIUS,
  DUEL_CAMERA_HEADING,
  DUEL_CAMERA_PLAYER_FRAME_WEIGHT,
  DUEL_CAMERA_TOUCH_FOV,
  DUEL_JUMP_HEIGHT,
  getDuelCameraPose,
  getDuelCameraRelativeInput,
  getDuelFacingAngle,
  getDuelJumpHeight,
  getUprightDuelRotation,
} from "./duel-camera.ts";
import { getKnightActorRootYaw } from "../world/knight-config.ts";

test("duel camera keeps a stable world heading as fighters move and cross", () => {
  const spawnPlayer = { x: -3, z: DUEL_CAMERA_ARENA_CENTER_Z };
  const spawnOpponent = { x: 3, z: DUEL_CAMERA_ARENA_CENTER_Z };
  const cameraHeading = DUEL_CAMERA_HEADING;
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
  for (const pose of [spawnPose, movedPose]) {
    assert.ok(Math.hypot(
      pose.position.x,
      pose.position.z - (-120 + DUEL_CAMERA_ARENA_CENTER_Z),
    ) <= DUEL_CAMERA_ARENA_RADIUS - 0.35 + 1e-9);
  }
});

test("procedural duel fighters turn their armored fronts toward one another", () => {
  const player = { x: -3, z: DUEL_CAMERA_ARENA_CENTER_Z };
  const opponent = { x: 3, z: DUEL_CAMERA_ARENA_CENTER_Z };
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
  const player = { x: -3, z: DUEL_CAMERA_ARENA_CENTER_Z };
  const opponent = { x: 3, z: DUEL_CAMERA_ARENA_CENTER_Z };
  const pose = getDuelCameraPose(player, opponent, 0, 8.4, 0.45);
  assert.ok(Math.abs(pose.target.x - (player.x * DUEL_CAMERA_PLAYER_FRAME_WEIGHT
    + opponent.x * (1 - DUEL_CAMERA_PLAYER_FRAME_WEIGHT))) < 1e-9);
  assert.equal(pose.target.z, DUEL_CAMERA_ARENA_CENTER_Z);
  const cameraToPlayerDot = (pose.position.x - player.x) * (opponent.x - player.x)
    + (pose.position.z - player.z) * (opponent.z - player.z);
  assert.ok(cameraToPlayerDot < 0, "camera must stay behind the player's facing direction");

  const viewX = pose.target.x - pose.position.x;
  const viewZ = pose.target.z - pose.position.z;
  const viewLength = Math.hypot(viewX, viewZ);
  const screenRightX = viewZ / viewLength;
  const screenRightZ = -viewX / viewLength;
  const duelX = opponent.x - player.x;
  const duelZ = opponent.z - player.z;
  const screenSeparation = screenRightX * duelX + screenRightZ * duelZ;
  assert.ok(Math.abs(screenSeparation) > Math.hypot(duelX, duelZ) * 0.9, "the fighters should read side-by-side, not as a diagonal line");
});

test("the mobile duel framing keeps both fighters on-screen and nearly level", () => {
  const player = { x: -3, z: DUEL_CAMERA_ARENA_CENTER_Z };
  const opponent = { x: 3, z: DUEL_CAMERA_ARENA_CENTER_Z };
  const pose = getDuelCameraPose(player, opponent, 0, 7.2, 0.32);
  const forward = {
    x: pose.target.x - pose.position.x,
    y: pose.target.y - pose.position.y,
    z: pose.target.z - pose.position.z,
  };
  const forwardLength = Math.hypot(forward.x, forward.y, forward.z);
  forward.x /= forwardLength;
  forward.y /= forwardLength;
  forward.z /= forwardLength;
  const right = { x: -forward.z, y: 0, z: forward.x };
  const rightLength = Math.hypot(right.x, right.z);
  right.x /= rightLength;
  right.z /= rightLength;
  const up = {
    x: right.y * forward.z - right.z * forward.y,
    y: right.z * forward.x - right.x * forward.z,
    z: right.x * forward.y - right.y * forward.x,
  };
  const aspect = 402 / 874;
  const tangent = Math.tan((DUEL_CAMERA_TOUCH_FOV * Math.PI) / 360);
  const project = (actor) => {
    const relative = {
      x: actor.x - pose.position.x,
      y: -pose.position.y,
      z: actor.z - pose.position.z,
    };
    const depth = relative.x * forward.x + relative.y * forward.y + relative.z * forward.z;
    const horizontal = relative.x * right.x + relative.z * right.z;
    const vertical = relative.x * up.x + relative.y * up.y + relative.z * up.z;
    const scale = depth * tangent;
    return {
      x: horizontal / (scale * aspect),
      y: vertical / scale,
      halfWidth: 0.45 * right.x / (scale * aspect),
    };
  };
  const playerScreen = project(player);
  const opponentScreen = project(opponent);
  assert.ok(playerScreen.x - playerScreen.halfWidth > -0.98);
  assert.ok(opponentScreen.x + opponentScreen.halfWidth < 0.98);
  assert.ok(Math.abs(playerScreen.y - opponentScreen.y) < 0.1);
});

test("joystick input follows the same fixed camera heading throughout the duel", () => {
  const forward = getDuelCameraRelativeInput(0, 1);
  assert.ok(Math.abs(forward.x - Math.sin(DUEL_CAMERA_HEADING)) < 1e-9);
  assert.ok(Math.abs(forward.z - Math.cos(DUEL_CAMERA_HEADING)) < 1e-9);
  assert.ok(Math.abs(Math.hypot(forward.x, forward.z) - 1) < 1e-9);
  assert.deepEqual(getDuelCameraRelativeInput(0, 0), { x: 0, z: 0 });
});

test("the mobile camera stays inside the arena while following the fighters near its edge", () => {
  const player = { x: 7.5, z: DUEL_CAMERA_ARENA_CENTER_Z };
  const opponent = { x: 8, z: DUEL_CAMERA_ARENA_CENTER_Z };
  const pose = getDuelCameraPose(player, opponent, 0, 8.4, 0.45);
  const cameraRadius = Math.hypot(
    pose.position.x,
    pose.position.z - DUEL_CAMERA_ARENA_CENTER_Z,
  );
  assert.ok(cameraRadius <= DUEL_CAMERA_ARENA_RADIUS - 0.35 + 1e-9);
  assert.ok(Math.abs(pose.target.x - (
    player.x * DUEL_CAMERA_PLAYER_FRAME_WEIGHT
    + opponent.x * (1 - DUEL_CAMERA_PLAYER_FRAME_WEIGHT)
  )) < 1e-9);
  assert.ok(Math.abs(pose.target.z - (player.z + opponent.z) / 2) < 1e-9);
});

test("the duel camera follows the jump arc and returns to its grounded framing", () => {
  const airborne = { jumpStartedTick: 20, jumpUntilTick: 62 };
  assert.equal(getDuelJumpHeight(airborne, 19), 0);
  assert.equal(getDuelJumpHeight(airborne, 20), 0);
  assert.equal(getDuelJumpHeight(airborne, 41), DUEL_JUMP_HEIGHT);
  assert.equal(getDuelJumpHeight(airborne, 62), 0);

  const player = { x: -3, z: DUEL_CAMERA_ARENA_CENTER_Z };
  const opponent = { x: 3, z: DUEL_CAMERA_ARENA_CENTER_Z };
  const grounded = getDuelCameraPose(player, opponent, 0, 8.4, 1.2);
  const lifted = getDuelCameraPose(player, opponent, 0, 8.4, 1.2, DUEL_JUMP_HEIGHT);
  assert.ok(lifted.position.y > grounded.position.y);
  assert.ok(lifted.target.y > grounded.target.y);
});
