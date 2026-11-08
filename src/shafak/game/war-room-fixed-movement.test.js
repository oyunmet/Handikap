import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceWarRoomFixedMovement,
  createWarRoomMovementClock,
  WAR_ROOM_FIXED_STEP_SECONDS,
} from "./war-room-fixed-movement.ts";

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
