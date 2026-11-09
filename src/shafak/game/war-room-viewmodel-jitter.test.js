import assert from "node:assert/strict";
import test from "node:test";
import { getWarRoomViewModelPose } from "./war-room-viewmodel.ts";

const SAMPLE_RATE = 60;
const DURATION_SECONDS = 5;
const FRAME_COUNT = SAMPLE_RATE * DURATION_SECONDS;
const JITTER_STD_DEV_LIMIT = 0.001;

function simulateCurrentViewModel(speedAtFrame) {
  const delta = 1 / SAMPLE_RATE;
  let playerX = 0;
  let previousPlayerX = null;
  let filteredMovement = 0;
  let movementActive = false;
  let walkPhase = 0;
  const frames = [];

  for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
    playerX += speedAtFrame(frame) * delta;
    const measuredSpeed = previousPlayerX === null
      ? 0
      : Math.abs(playerX - previousPlayerX) / delta;
    previousPlayerX = playerX;

    const normalizedSpeed = Math.min(1, measuredSpeed / 8.2);
    if (!movementActive && normalizedSpeed >= 0.2) movementActive = true;
    else if (movementActive && normalizedSpeed <= 0.1) movementActive = false;
    const movementTarget = movementActive ? normalizedSpeed : 0;
    filteredMovement += (movementTarget - filteredMovement) * (1 - Math.exp(-delta * 12));
    if (filteredMovement > 0.02) {
      walkPhase = (walkPhase + delta * (7.2 + filteredMovement * 2.8)) % (Math.PI * 2);
    }

    const pose = getWarRoomViewModelPose({
      time: frame * delta,
      movement: filteredMovement,
      walkPhase,
      swayScale: 0.75,
      aiming: false,
      recoil: 0,
      reloadProgress: 0,
      chargeProgress: 0,
      meleeProgress: null,
      meleeStyle: "slash",
      comboIndex: 0,
      motionReduced: false,
    });
    frames.push([...pose.position, ...pose.rotation]);
  }

  const frameChanges = frames.slice(1).map((frame, index) =>
    frame.map((value, axis) => value - frames[index][axis]));
  const steadyChanges = frameChanges.slice(SAMPLE_RATE);
  const standardDeviations = steadyChanges[0].map((_, axis) => {
    const values = steadyChanges.map((frame) => frame[axis]);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
  });
  return { frames, standardDeviations, maxStandardDeviation: Math.max(...standardDeviations) };
}

test("five-second straight, wall-scrape, and sprint viewmodel changes stay below the jitter limit", () => {
  const scenarios = [
    ["straight walk", () => 4.1],
    ["wall scrape", (frame) => frame % 2 === 0 ? 0 : 4.1],
    ["sprint", () => 8.2],
  ];
  const measurements = scenarios.map(([name, speedAtFrame]) => {
    const result = simulateCurrentViewModel(speedAtFrame);
    assert.equal(result.frames.length, FRAME_COUNT, `${name} should record every frame for five seconds`);
    return { name, maxStandardDeviation: result.maxStandardDeviation };
  });

  assert.ok(
    measurements.every((measurement) => measurement.maxStandardDeviation <= JITTER_STD_DEV_LIMIT),
    `frame-delta standard deviation exceeded ${JITTER_STD_DEV_LIMIT}: ${JSON.stringify(measurements)}`,
  );
});
