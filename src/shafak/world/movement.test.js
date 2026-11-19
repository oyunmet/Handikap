import assert from "node:assert/strict";
import test from "node:test";
import {
  createWorldMotion,
  getWorldOriginDistance,
  interpolateWorldMotion,
  readWorldActions,
  readWorldInput,
  stepWorldMotion,
  WORLD_PLAYER_DEPTH_LIMIT,
  WORLD_PLAYER_LATERAL_LIMIT_METERS,
  WORLD_ORIGIN_REBASE_INTERVAL_METERS,
  WORLD_CAMERA_TURN_SPEED,
} from "./movement.ts";
import {
  getWorldV2CameraOffset,
  getWorldV2Heading,
  WORLD_V2_CONFIG,
} from "./world-v2-config.ts";

test("keyboard movement uses camera-relative strafing and forward travel", () => {
  const diagonal = readWorldInput(new Set(["w", "d"]), { x: 0, y: 0 });
  const north = readWorldInput(new Set(["arrowup"]), { x: 0, y: 0 });
  const strafeRight = readWorldInput(new Set(["arrowright"]), { x: 0, y: 0 });
  const turnCameraRight = readWorldInput(new Set(["e"]), { x: 0, y: 0 });

  assert.ok(Math.abs(Math.hypot(diagonal.strafe, diagonal.forward) - 1) < 1e-10);
  assert.ok(Math.abs(diagonal.strafe - Math.SQRT1_2) < 1e-12);
  assert.ok(Math.abs(diagonal.forward - Math.SQRT1_2) < 1e-12);
  assert.deepEqual([north.strafe, north.forward], [0, 1]);
  assert.deepEqual([strafeRight.turn, strafeRight.strafe, strafeRight.forward], [0, 1, 0]);
  assert.equal(turnCameraRight.turn, 1);
});

test("left joystick strafes and moves while preserving analog speed", () => {
  const straight = readWorldInput(new Set(), { x: -0.1, y: 0.9 });
  const diagonal = readWorldInput(new Set(), { x: 0.25, y: 0.9 });
  const overRange = readWorldInput(new Set(), { x: 1, y: 1 });

  assert.deepEqual([straight.strafe, straight.forward], [0, (0.9 - 0.12) / 0.88]);
  assert.ok(diagonal.strafe > 0.1);
  assert.ok(diagonal.forward > 0.8);
  assert.ok(Math.abs(Math.hypot(overRange.strafe, overRange.forward) - 1) < 1e-10);
});

test("forward running with horizontal deadzone drift keeps the player facing down the road", () => {
  const input = readWorldInput(new Set(), { x: -0.1, y: 0.9 });
  let motion = createWorldMotion();
  for (let frame = 0; frame < 120; frame += 1) {
    motion = stepWorldMotion(motion, input, 1 / 60);
  }

  assert.equal(input.turn, 0);
  assert.equal(motion.velocityX, 0);
  assert.ok(Math.abs(motion.cameraHeading) < 1e-8);
  const worldModelYaw = motion.cameraHeading + WORLD_V2_CONFIG.modelFacing;
  assert.ok(Math.abs(Math.cos(worldModelYaw) + 1) < 1e-8);
});

test("mobile action keys map to jump, crouch, and sprint", () => {
  const keys = new Set(["c", "shift"]);
  const input = readWorldInput(keys, { x: 0, y: 1 }, readWorldActions(keys, true));
  assert.deepEqual(input.actions, { sprint: true, jumpPressed: true, crouch: true });
});

test("sprint accelerates faster than walking and jump/crouch change motion", () => {
  const walking = readWorldInput(new Set(["w"]), { x: 0, y: 0 });
  const running = readWorldInput(new Set(["w", "shift"]), { x: 0, y: 0 });
  const walkFrame = stepWorldMotion(createWorldMotion(), walking, 1 / 30);
  const runFrame = stepWorldMotion(createWorldMotion(), running, 1 / 30);
  let jumpFrame = stepWorldMotion(
    createWorldMotion(),
    readWorldInput(new Set(), { x: 0, y: 0 }, readWorldActions(new Set(), true)),
    1 / 60,
  );
  for (let index = 0; index < 5; index += 1) {
    jumpFrame = stepWorldMotion(
      jumpFrame,
      readWorldInput(new Set(), { x: 0, y: 0 }),
      1 / 60,
    );
  }
  const crouchFrame = stepWorldMotion(
    createWorldMotion(),
    readWorldInput(new Set(["c", "w"]), { x: 0, y: 0 }),
    1 / 60,
  );

  assert.ok(runFrame.speed > walkFrame.speed);
  assert.ok(jumpFrame.jumpHeight > 0);
  assert.equal(crouchFrame.crouching, true);
});

test("joystick input preserves analog magnitude for walk-to-run speed", () => {
  const quarter = readWorldInput(new Set(), { x: 0, y: 0.25 });
  const pushed = readWorldInput(new Set(), { x: 0, y: 0.9 });
  let slow = createWorldMotion();
  let fast = createWorldMotion();
  for (let index = 0; index < 45; index += 1) {
    slow = stepWorldMotion(slow, quarter, 1 / 60);
    fast = stepWorldMotion(fast, pushed, 1 / 60);
  }

  assert.ok(fast.speed > slow.speed * 2);
  assert.equal(fast.motion, "running");
});

test("joystick forward input advances measured distance and the camera", () => {
  const input = readWorldInput(new Set(), { x: 0, y: 0.9 });
  let state = createWorldMotion();
  for (let index = 0; index < 90; index += 1) {
    state = stepWorldMotion(state, input, 1 / 60);
  }
  assert.ok(state.distance > 6);
  assert.ok(state.cameraX > 1);
  assert.equal(state.motion, "running");
});

test("W/S advances and A/D moves laterally without rotating the camera", () => {
  const forward = readWorldInput(new Set(["w"]), { x: 0, y: 0 });
  const strafeRight = readWorldInput(new Set(["d"]), { x: 0, y: 0 });
  let state = createWorldMotion();
  for (let index = 0; index < 90; index += 1) {
    state = stepWorldMotion(state, forward, 1 / 60);
  }
  assert.ok(state.distance > 4);
  assert.ok(state.stepCount >= 3);
  assert.ok(state.zoom < 1 && state.zoom > 0.96);

  let strafeState = createWorldMotion();
  for (let index = 0; index < 90; index += 1) {
    strafeState = stepWorldMotion(strafeState, strafeRight, 1 / 60);
  }
  assert.equal(strafeState.distance, 0);
  assert.ok(strafeState.depth > 0.1);
  assert.equal(strafeState.cameraHeading, 0);
});

test("weather handling slows steering response without changing the normal default", () => {
  const right = readWorldInput(new Set(["e"]), { x: 0, y: 0 });
  const normal = stepWorldMotion(createWorldMotion(), right, 1 / 60);
  const stormy = stepWorldMotion(createWorldMotion(), right, 1 / 60, 1, undefined, 0.76);

  assert.ok(Math.abs(stormy.cameraHeading) < Math.abs(normal.cameraHeading));
  assert.equal(stepWorldMotion(createWorldMotion(), right, 1 / 60, 1, undefined, 1).velocityX, normal.velocityX);
});

test("releasing input decelerates rather than stopping immediately", () => {
  const moving = stepWorldMotion(
    createWorldMotion(),
    readWorldInput(new Set(["w"]), { x: 0, y: 0 }),
    0.05,
  );
  const released = stepWorldMotion(moving, readWorldInput(new Set(), { x: 0, y: 0 }), 1 / 60);

  assert.ok(released.speed > 0);
  assert.ok(released.speed < moving.speed);
  assert.ok(released.speed > moving.speed * 0.8);
});

test("forward travel accumulates without rotating the player away from the rear camera", () => {
  let state = createWorldMotion();
  const forward = readWorldInput(new Set(["w"]), { x: 0, y: 0 });
  for (let index = 0; index < 180; index += 1) {
    state = stepWorldMotion(state, forward, 1 / 60);
  }

  assert.equal(state.facing, 1);
  assert.ok(state.distance > 8);
  assert.ok(state.cameraX > 0);
  assert.equal(state.cameraHeading, 0);
});

test("invalid delta time does not inject movement", () => {
  const result = stepWorldMotion(
    createWorldMotion(),
    readWorldInput(new Set(["w"]), { x: 0, y: 0 }),
    Number.NaN,
  );
  assert.equal(result.speed, 0);
  assert.equal(result.distance, 0);
});

test("fixed-step render interpolation fills the gap without replacing simulation state", () => {
  const previous = createWorldMotion(12, -0.4);
  const current = stepWorldMotion(
    previous,
    readWorldInput(new Set(["w", "d"]), { x: 0, y: 0 }),
    1 / 60,
  );
  const target = createWorldMotion();
  interpolateWorldMotion(previous, current, 0.5, target);

  assert.equal(target.distance, (previous.distance + current.distance) / 2);
  assert.equal(target.depth, (previous.depth + current.depth) / 2);
  assert.equal(
    target.cameraHeading,
    previous.cameraHeading + (current.cameraHeading - previous.cameraHeading) * 0.5,
  );
  assert.equal(
    target.cameraPitch,
    previous.cameraPitch + (current.cameraPitch - previous.cameraPitch) * 0.5,
  );
  assert.equal(target.stepCount, current.stepCount);
  assert.equal(target.hasMoved, current.hasMoved);
  assert.equal(previous.distance, 12);
});

test("keyboard camera turn rotates in place independently of movement input", () => {
  let state = createWorldMotion(10);
  const turnRight = readWorldInput(new Set(["e"]), { x: 0, y: 0 });
  const frames = Math.round((Math.PI * 2 / WORLD_CAMERA_TURN_SPEED) * 60);
  for (let index = 0; index < frames; index += 1) {
    state = stepWorldMotion(state, turnRight, 1 / 60);
  }

  const wrappedHeading = Math.atan2(Math.sin(state.cameraHeading), Math.cos(state.cameraHeading));
  assert.ok(Math.abs(wrappedHeading) < 0.04);
  assert.equal(state.distance, 10);
  assert.equal(state.depth, 0);
  assert.equal(state.speed, 0);
});

test("camera drag changes its orbit while movement follows the new view direction", () => {
  let state = createWorldMotion(12);
  const orbitRight = readWorldInput(new Set(), { x: 0, y: 1 }, undefined, { yaw: 0.5, pitch: 0.1 });
  state = stepWorldMotion(state, orbitRight, 1 / 60);
  assert.ok(state.cameraHeading < 0);
  assert.ok(state.cameraPitch > 0.3);
  assert.ok(state.distance > 12);
  const frontYaw = getWorldV2Heading(state.velocityX, state.velocityY) + WORLD_V2_CONFIG.modelFacing;
  const heroFront = { x: Math.sin(frontYaw), z: Math.cos(frontYaw) };
  const cameraOffset = getWorldV2CameraOffset(state.cameraHeading, WORLD_V2_CONFIG.camera.distanceBehind);
  assert.ok(heroFront.x * cameraOffset.x + heroFront.z * cameraOffset.z < -3);
});

test("strafe turns the hero toward travel without rotating the follow camera", () => {
  let state = createWorldMotion();
  const right = readWorldInput(new Set(), { x: 1, y: 0 });
  for (let index = 0; index < 20; index += 1) {
    state = stepWorldMotion(state, right, 1 / 60);
  }
  const actorYaw = getWorldV2Heading(state.velocityX, state.velocityY);
  const frontYaw = actorYaw + WORLD_V2_CONFIG.modelFacing;
  assert.ok(Math.sin(frontYaw) > 0.99);
  assert.equal(state.cameraHeading, 0);
});

test("the player stays 0.6 m inside the road edge and gets a small inward push", () => {
  assert.ok(Math.abs(WORLD_PLAYER_LATERAL_LIMIT_METERS - 4) < 1e-12);
  const atEdge = createWorldMotion(0, WORLD_PLAYER_DEPTH_LIMIT);
  let state = atEdge;
  const right = readWorldInput(new Set(), { x: 1, y: 0 });
  for (let index = 0; index < 300; index += 1) state = stepWorldMotion(state, right, 1 / 60);
  assert.ok(state.depth <= WORLD_PLAYER_DEPTH_LIMIT);
  assert.ok(state.depth >= -WORLD_PLAYER_DEPTH_LIMIT);
  assert.ok(state.velocityX <= 0, "the right road wall should push inward");

  const outsideStart = createWorldMotion(0, 1);
  assert.equal(outsideStart.depth, WORLD_PLAYER_DEPTH_LIMIT);
});

test("floating origin keeps render coordinates bounded while preserving absolute distance", () => {
  const threshold = WORLD_ORIGIN_REBASE_INTERVAL_METERS;
  let state = createWorldMotion(threshold - 0.01);
  assert.equal(state.originDistance, 0);

  state = stepWorldMotion(state, readWorldInput(new Set(["w"]), { x: 0, y: 0 }), 0.05);
  assert.ok(state.distance > threshold);
  assert.equal(state.originDistance, threshold);
  assert.ok(state.distance - state.originDistance < 1);
  assert.equal(getWorldOriginDistance(threshold * 10 + 3), threshold * 10);
  assert.equal(getWorldOriginDistance(-threshold), 0);

  const interpolated = createWorldMotion();
  interpolateWorldMotion(state, state, 0.5, interpolated);
  assert.equal(interpolated.distance, state.distance);
  assert.equal(interpolated.originDistance, state.originDistance);
});
