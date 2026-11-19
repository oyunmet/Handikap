import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  advanceWarRoomFixedMovement,
  advanceWarRoomFixedMovementFromFrame,
  createWarRoomMovementClock,
  WAR_ROOM_FIXED_STEP_SECONDS,
  WAR_ROOM_MAX_FIXED_STEPS_PER_FRAME,
} from "./war-room-fixed-movement.ts";
import { FixedStepLoop } from "../../core/fixed-step-loop.ts";

test("War Room player movement consumes the shared runtime's fixed-step frame", () => {
  const sceneSource = readFileSync(new URL("../world/WarRoomScene3D.tsx", import.meta.url), "utf8");

  assert.ok(sceneSource.includes("sharedGameRuntime.registerFrame"), "War Room should subscribe to the core frame");
  assert.ok(sceneSource.includes("runtimeFrame.steps * GAME_RUNTIME_DEFAULTS.stepSeconds"), "simulation delta should use core steps");
  assert.ok(
    /advanceWarRoomFixedMovementFromFrame\([\s\S]*?runtimeFrame,\s*cinematicTimeScale\)/.test(sceneSource),
    "player movement should use the core frame and preserve cinematic slow motion",
  );
  assert.ok(
    /input\.paused\)\s*\{[\s\S]*?runtimeAlpha = runtimeFrame\.alpha[\s\S]*?accumulator = 0/.test(sceneSource),
    "pausing should clear movement time without catching up on resume",
  );
});

test("fixed-step movement stays consistent at 30, 60, and 120 update rates", () => {
  const simulate = (hz) => {
    const clock = createWarRoomMovementClock();
    let result;
    for (let frame = 1; frame <= hz; frame += 1) {
      result = advanceWarRoomFixedMovement(clock, {
        x: result?.x ?? 0,
        z: result?.z ?? 0,
        velocityX: 2,
        velocityZ: -3,
        delta: 1 / hz,
        now: frame / hz,
        blockers: [],
      });
    }
    return result;
  };
  const at30 = simulate(30);
  const at60 = simulate(60);
  const at120 = simulate(120);
  assert.ok(Math.abs(at30.x - 2) < 1e-8);
  assert.ok(Math.abs(at30.z + 3) < 1e-8);
  assert.ok(Math.abs(at30.x - at120.x) < 1e-8);
  assert.ok(Math.abs(at30.z - at120.z) < 1e-8);
  assert.ok(Math.abs(at60.x - at120.x) < 1e-8);
  assert.ok(Math.abs(at60.z - at120.z) < 1e-8);
});

test("shared GameRuntime frame steps preserve War Room movement across render rates", () => {
  const simulate = (renderHz) => {
    const clock = createWarRoomMovementClock();
    const gameClock = new FixedStepLoop();
    let result = { x: 0, z: 0 };
    for (let frame = 1; frame <= renderHz; frame += 1) {
      const runtimeFrame = gameClock.advance(1 / renderHz, () => undefined);
      result = advanceWarRoomFixedMovementFromFrame(clock, {
        x: result.x,
        z: result.z,
        velocityX: 2,
        velocityZ: -3,
        now: frame / renderHz,
        blockers: [],
      }, runtimeFrame);
    }
    return result;
  };
  const at30 = simulate(30);
  const at60 = simulate(60);
  const at120 = simulate(120);

  assert.ok(Math.abs(at30.x - 2) < 1e-8);
  assert.ok(Math.abs(at30.z + 3) < 1e-8);
  assert.ok(Math.abs(at30.renderX - at120.renderX) < 1e-8);
  assert.ok(Math.abs(at30.renderZ - at120.renderZ) < 1e-8);
  assert.ok(Math.abs(at60.x - at120.x) < 1e-8);
  assert.ok(Math.abs(at60.z - at120.z) < 1e-8);
});

test("shared runtime catch-up keeps War Room movement within its three-step limit", () => {
  const clock = createWarRoomMovementClock();
  const result = advanceWarRoomFixedMovementFromFrame(clock, {
    x: 0,
    z: 0,
    velocityX: 1,
    velocityZ: 0,
    now: 0.1,
    blockers: [],
  }, { steps: 6, alpha: 0.2, droppedSeconds: 0 });

  assert.equal(result.steps, WAR_ROOM_MAX_FIXED_STEPS_PER_FRAME);
  assert.ok(result.interpolation < 1e-8);
  assert.ok(Math.abs(result.x - WAR_ROOM_FIXED_STEP_SECONDS * 3) < 1e-8);
});

test("shared runtime time scaling preserves War Room slow motion", () => {
  const clock = createWarRoomMovementClock();
  const gameClock = new FixedStepLoop();
  let result = { x: 0, z: 0 };
  for (let frame = 1; frame <= 60; frame += 1) {
    const runtimeFrame = gameClock.advance(1 / 60, () => undefined);
    result = advanceWarRoomFixedMovementFromFrame(clock, {
      x: result.x,
      z: result.z,
      velocityX: 1,
      velocityZ: 0,
      now: frame / 60,
      blockers: [],
    }, runtimeFrame, 0.25);
  }

  assert.ok(Math.abs(result.x - 0.25) < 1e-8);
  assert.ok(clock.accumulator < 1e-8);
});

test("render interpolation remains bounded between collision-resolved fixed states", () => {
  const clock = createWarRoomMovementClock();
  const halfStep = WAR_ROOM_FIXED_STEP_SECONDS / 2;
  const first = advanceWarRoomFixedMovement(clock, {
    x: 0, z: 0, velocityX: 1, velocityZ: 0, delta: halfStep, now: halfStep, blockers: [],
  });
  const second = advanceWarRoomFixedMovement(clock, {
    x: first.x, z: first.z, velocityX: 1, velocityZ: 0, delta: halfStep, now: halfStep * 2, blockers: [],
  });
  const third = advanceWarRoomFixedMovement(clock, {
    x: second.x, z: second.z, velocityX: 1, velocityZ: 0, delta: halfStep, now: halfStep * 3, blockers: [],
  });
  assert.equal(first.steps, 0);
  assert.equal(second.steps, 1);
  assert.equal(third.steps, 0);
  assert.ok(third.renderX > second.renderX && third.renderX < third.x);
  assert.ok(third.interpolation > 0 && third.interpolation < 1);
});

test("fixed movement slides along a wall without crossing its rounded corner", () => {
  const wall = {
    id: "test-wall",
    kind: "wall",
    x: 1,
    z: 0,
    width: 0.5,
    depth: 10,
    height: 4,
    color: "#555",
  };
  const clock = createWarRoomMovementClock(0, -2);
  let result = { x: 0, z: -2 };
  for (let frame = 1; frame <= 30; frame += 1) {
    result = advanceWarRoomFixedMovement(clock, {
      ...result,
      velocityX: 6,
      velocityZ: 6,
      delta: 1 / 30,
      now: frame / 30,
      blockers: [wall],
    });
  }
  assert.ok(result.x < 0.6, `player crossed the wall: x=${result.x}`);
  assert.ok(result.z > 0, `player did not slide along the wall: z=${result.z}`);
});

test("teleports reset render history instead of interpolating across the room", () => {
  const clock = createWarRoomMovementClock();
  advanceWarRoomFixedMovement(clock, {
    x: 0, z: 0, velocityX: 0, velocityZ: 0, delta: WAR_ROOM_FIXED_STEP_SECONDS, now: 0.02, blockers: [],
  });
  const teleported = advanceWarRoomFixedMovement(clock, {
    x: 10, z: 8, velocityX: 0, velocityZ: 0, delta: 0, now: 0.02, blockers: [],
  });
  assert.equal(teleported.renderX, 10);
  assert.equal(teleported.renderZ, 8);
});

test("fixed movement clamps long frames to fifty milliseconds and at most three steps", () => {
  const clock = createWarRoomMovementClock();
  const result = advanceWarRoomFixedMovement(clock, {
    x: 0,
    z: 0,
    velocityX: 1,
    velocityZ: 0,
    delta: 1,
    now: 1,
    blockers: [],
  });

  assert.equal(WAR_ROOM_MAX_FIXED_STEPS_PER_FRAME, 3);
  assert.equal(result.steps, 3);
  assert.ok(Math.abs(result.x - WAR_ROOM_FIXED_STEP_SECONDS * 3) < 1e-8);
  assert.ok(clock.accumulator < 1e-8);
});
