import assert from "node:assert/strict";
import test from "node:test";
import {
  getWarRoomViewModelMovementIntent,
  getWarRoomViewModelPose,
  getWarRoomViewModelSwayScale,
  createWarRoomViewModelFrameTimingState,
  createWarRoomViewModelPoseSpringState,
  stepWarRoomViewModelFrameTiming,
  stepWarRoomViewModelMovement,
  stepWarRoomViewModelPoseSpring,
  stepWarRoomViewModelWallProximity,
  WAR_ROOM_VIEWMODEL_FOV,
} from "./war-room-viewmodel.ts";
import { WAR_ROOM_WEAPON_SWAY_DEFAULT } from "./war-room-viewmodel-settings.ts";
import { getWarRoomViewModelWallSafetyRetraction } from "./war-room-camera.ts";

const SAMPLE_RATE = 60;
const DURATION_SECONDS = 5;
const FRAME_COUNT = SAMPLE_RATE * DURATION_SECONDS;
const JITTER_STD_DEV_LIMIT = 0.001;
const SWAY_LEVELS = ["off", "low", "normal"];

function measureFrameChangeStandardDeviation(frames) {
  const frameChanges = frames.slice(1).map((frame, index) =>
    frame.map((value, axis) => value - frames[index][axis]));
  const steadyChanges = frameChanges.slice(SAMPLE_RATE);
  const standardDeviations = steadyChanges[0].map((_, axis) => {
    const values = steadyChanges.map((frame) => frame[axis]);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
  });
  return {
    standardDeviations,
    maxStandardDeviation: Math.max(...standardDeviations),
  };
}

function simulateWarRoomViewModel({ movementIntent, speedAtFrame, wallProximity = 0, swayScale }) {
  const delta = 1 / SAMPLE_RATE;
  let playerX = 0;
  let currentWallProximity = 0;
  let currentWallRetraction = 0;
  const speeds = [];
  let movement = { value: 0, velocity: 0, active: false };
  let walkPhase = 0;
  const frames = [];
  const wallRetractions = [];

  for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
    const speed = speedAtFrame(frame);
    playerX += speed * delta;
    speeds.push(speed);
    currentWallProximity = stepWarRoomViewModelWallProximity(
      currentWallProximity,
      wallProximity,
      delta,
    );
    const targetWallRetraction = getWarRoomViewModelWallSafetyRetraction(
      currentWallProximity,
      0.8,
    );
    currentWallRetraction = stepWarRoomViewModelWallProximity(
      currentWallRetraction,
      targetWallRetraction,
      delta,
      4,
    );
    const intent = getWarRoomViewModelMovementIntent(0, movementIntent);
    movement = stepWarRoomViewModelMovement(movement, intent, true, delta);
    if (movement.value > 0.02) {
      walkPhase = (walkPhase + delta * (7.2 + movement.value * 2.8)) % (Math.PI * 2);
    }

    const pose = getWarRoomViewModelPose({
      time: frame * delta,
      movement: movement.value,
      walkPhase,
      swayScale,
      wallProximity,
      wallTuckEnabled: movementIntent <= 0.05,
      aiming: false,
      recoil: 0,
      reloadProgress: 0,
      chargeProgress: 0,
      meleeProgress: null,
      meleeStyle: "slash",
      comboIndex: 0,
      motionReduced: false,
    });
    frames.push([
      pose.position[0],
      pose.position[1],
      pose.position[2] + currentWallRetraction,
      ...pose.rotation,
    ]);
    wallRetractions.push(currentWallRetraction);
  }

  return {
    frames,
    wallRetractions,
    speeds,
    playerX,
    ...measureFrameChangeStandardDeviation(frames),
  };
}

test("five-second walk, wall-scrape, and sprint viewmodel changes stay below the jitter limit", () => {
  const scenarios = [
    { name: "straight walk", movementIntent: 0.5, speedAtFrame: () => 4.1 },
    {
      name: "wall scrape",
      movementIntent: 0.5,
      speedAtFrame: (frame) => frame % 2 === 0 ? 0 : 4.1,
      wallProximity: 1,
    },
    { name: "sprint", movementIntent: 1, speedAtFrame: () => 8.2 },
  ];
  const measurements = [];
  for (const level of SWAY_LEVELS) {
    for (const scenario of scenarios) {
      const result = simulateWarRoomViewModel({
        ...scenario,
        swayScale: getWarRoomViewModelSwayScale(level),
      });
      assert.equal(result.frames.length, FRAME_COUNT, `${scenario.name} should record every frame for five seconds`);
      measurements.push({
        name: `${scenario.name} · ${level}`,
        maxStandardDeviation: result.maxStandardDeviation,
      });
    }
  }
  assert.ok(
    measurements.every((measurement) => measurement.maxStandardDeviation <= JITTER_STD_DEV_LIMIT),
    `frame-delta standard deviation exceeded ${JITTER_STD_DEV_LIMIT}: ${JSON.stringify(measurements)}`,
  );

  const straightWalk = simulateWarRoomViewModel({
    movementIntent: 0.5,
    speedAtFrame: () => 4.1,
    swayScale: getWarRoomViewModelSwayScale(WAR_ROOM_WEAPON_SWAY_DEFAULT),
  });
  const wallScrape = simulateWarRoomViewModel({
    movementIntent: 0.5,
    speedAtFrame: (frame) => frame % 2 === 0 ? 0 : 4.1,
    wallProximity: 1,
    swayScale: getWarRoomViewModelSwayScale(WAR_ROOM_WEAPON_SWAY_DEFAULT),
  });
  assert.ok(new Set(wallScrape.speeds).size > 1, "wall contact should change physical movement speed");
  assert.notEqual(straightWalk.playerX, wallScrape.playerX, "wall contact should reduce actual distance");
  const getFinalFrameChanges = (result) => {
    const start = result.frames.length - SAMPLE_RATE;
    const frames = result.frames.slice(start).map((frame, index) => frame.map((value, axis) => (
      axis === 2 ? value - result.wallRetractions[start + index] : value
    )));
    return frames.slice(1).map((frame, index) => (
      frame.map((value, axis) => value - frames[index][axis])
    ));
  };
  const straightChanges = getFinalFrameChanges(straightWalk);
  const wallChanges = getFinalFrameChanges(wallScrape);
  let largestCollisionSpeedDelta = 0;
  for (let frame = 0; frame < straightChanges.length; frame += 1) {
    for (let axis = 0; axis < straightChanges[frame].length; axis += 1) {
      largestCollisionSpeedDelta = Math.max(
        largestCollisionSpeedDelta,
        Math.abs(straightChanges[frame][axis] - wallChanges[frame][axis]),
      );
    }
  }
  assert.ok(
    largestCollisionSpeedDelta < 1e-9,
    "constant input intent should keep viewmodel frame changes stable through wall contact",
  );
});

test("movement intent uses hysteresis, ignores airborne bob, and is frame-rate independent", () => {
  let state = { value: 0, velocity: 0, active: false };
  for (let frame = 0; frame < 30; frame += 1) {
    state = stepWarRoomViewModelMovement(state, 0.15, true, 1 / SAMPLE_RATE);
  }
  assert.equal(state.active, false, "movement below the start threshold should stay inactive");
  assert.equal(state.value, 0);

  state = stepWarRoomViewModelMovement(state, 0.16, true, 1 / SAMPLE_RATE);
  assert.equal(state.active, true, "movement above the start threshold should activate bob");
  for (const intent of [0.12, 0.09, 0.11, 0.1]) {
    state = stepWarRoomViewModelMovement(state, intent, true, 1 / SAMPLE_RATE);
    assert.equal(state.active, true, "small input changes should not cross the lower stop threshold");
  }
  state = stepWarRoomViewModelMovement(state, 0.07, true, 1 / SAMPLE_RATE);
  assert.equal(state.active, false, "movement below the stop threshold should deactivate bob");
  state = stepWarRoomViewModelMovement(state, 1, false, 1 / SAMPLE_RATE);
  assert.equal(state.active, false, "airborne input should not animate grounded bob");

  const settle = (deltas) => {
    let movement = { value: 0, velocity: 0, active: false };
    for (const delta of deltas) movement = stepWarRoomViewModelMovement(movement, 0.8, true, delta);
    return movement;
  };
  const fixed = settle(Array.from({ length: 300 }, () => 1 / SAMPLE_RATE));
  const variable = settle(Array.from({ length: 150 }, () => [1 / 120, 1 / 40]).flat());
  assert.ok(Math.abs(fixed.value - variable.value) < 1e-9);
  assert.ok(Math.abs(fixed.velocity - variable.velocity) < 1e-9);
});

test("viewmodel uses the light default, bounded sway, wall pullback, and 60-degree camera", () => {
  assert.equal(WAR_ROOM_WEAPON_SWAY_DEFAULT, "low");
  assert.equal(WAR_ROOM_VIEWMODEL_FOV, 60);
  assert.equal(getWarRoomViewModelSwayScale("off"), 0);
  assert.ok(getWarRoomViewModelSwayScale("normal") > getWarRoomViewModelSwayScale("low"));
  assert.ok(
    getWarRoomViewModelSwayScale("normal") <= 0.6,
    "normal sway must stay within the measured jitter budget",
  );

  const pose = (movement, wallProximity) => {
    const base = getWarRoomViewModelPose({
      time: 1,
      movement,
      walkPhase: 0.4,
      swayScale: getWarRoomViewModelSwayScale("low"),
      wallProximity,
      wallTuckEnabled: true,
      aiming: false,
      recoil: 0,
      reloadProgress: 0,
      chargeProgress: 0,
      meleeProgress: null,
      meleeStyle: "slash",
      comboIndex: 0,
      motionReduced: false,
    });
    return {
      ...base,
      position: [
        base.position[0],
        base.position[1],
        base.position[2] + getWarRoomViewModelWallSafetyRetraction(wallProximity, 0.8),
      ],
    };
  };
  assert.deepEqual(pose(0.5, 0), pose(0.5, 0.2), "safe wall distance should not move a walking weapon");
  assert.ok(
    pose(0.5, 1).position[2] - pose(0.5, 0).position[2] > 0.5,
    "near-wall safety should retract the moving weapon far enough to clear the wall",
  );
  assert.ok(
    pose(0, 1).position[2] > pose(0.5, 1).position[2],
    "stationary wall tuck should remain coupled with the collision safety pullback",
  );
});

test("near-wall safety retraction eases in without a frame-to-frame jump", () => {
  let proximity = 0;
  let retraction = 0;
  const samples = [];
  for (let frame = 0; frame < SAMPLE_RATE; frame += 1) {
    proximity = stepWarRoomViewModelWallProximity(proximity, 1, 1 / SAMPLE_RATE);
    const target = getWarRoomViewModelWallSafetyRetraction(proximity, 0.8);
    retraction = stepWarRoomViewModelWallProximity(retraction, target, 1 / SAMPLE_RATE, 4);
    samples.push(retraction);
  }
  const largestFrameChange = Math.max(...samples.slice(1).map((value, index) => value - samples[index]));
  assert.ok(largestFrameChange < 0.02, `wall retraction jumped ${largestFrameChange} m in one frame`);
  assert.ok(samples.at(-1) > 0.5, "the wall safety clamp should clear the weapon at close range");
});

test("16/16/40/16/16/60 ms frame jitter keeps viewmodel position changes bounded", () => {
  const frameMilliseconds = [16, 16, 40, 16, 16, 60];
  let timing = createWarRoomViewModelFrameTimingState();
  let spring = createWarRoomViewModelPoseSpringState();
  let movement = { value: 0, velocity: 0, active: false };
  let walkPhase = 0;
  let clock = 0;
  const positions = [];
  const swayOnLagFrames = [];

  for (let frame = 0; frame < 120; frame += 1) {
    const rawDelta = frameMilliseconds[frame % frameMilliseconds.length] / 1000;
    timing = stepWarRoomViewModelFrameTiming(timing, rawDelta);
    movement = stepWarRoomViewModelMovement(movement, 0.75, true, timing.delta);
    if (movement.value > 0.02) {
      walkPhase = (walkPhase + timing.delta * (7.2 + movement.value * 2.8)) % (Math.PI * 2);
    }
    clock += Math.min(rawDelta, 0.05);
    const target = getWarRoomViewModelPose({
      time: clock,
      movement: movement.value,
      walkPhase,
      swayScale: getWarRoomViewModelSwayScale("low") * timing.swayScale,
      wallProximity: 0,
      wallTuckEnabled: false,
      aiming: false,
      recoil: 0,
      reloadProgress: 0,
      chargeProgress: 0,
      meleeProgress: null,
      meleeStyle: "slash",
      comboIndex: 0,
      motionReduced: false,
    });
    const stepped = stepWarRoomViewModelPoseSpring(spring, target, rawDelta);
    spring = stepped.state;
    positions.push(stepped.pose.position);
    if (rawDelta > 0.025) swayOnLagFrames.push(timing.swayScale);
  }

  const jumps = positions.slice(1).map((position, index) => Math.hypot(
    position[0] - positions[index][0],
    position[1] - positions[index][1],
    position[2] - positions[index][2],
  ));
  const largestPositionJump = Math.max(...jumps);
  assert.ok(
    largestPositionJump < 0.0015,
    `weapon position jumped ${(largestPositionJump * 1000).toFixed(3)} mm`,
  );
  assert.ok(Math.min(...swayOnLagFrames) < 0.85, "lag frames should attenuate weapon sway");
  assert.ok(Math.max(...swayOnLagFrames) - Math.min(...swayOnLagFrames) < 0.4, "sway should fade smoothly");
});
