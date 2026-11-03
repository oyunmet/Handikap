import assert from "node:assert/strict";
import test from "node:test";
import {
  getWarRoomFirstPersonLegPose,
  shouldShowWarRoomFirstPersonLegs,
} from "./war-room-first-person-legs.ts";

test("first-person lower body only appears when the camera looks down", () => {
  assert.equal(shouldShowWarRoomFirstPersonLegs(0), false);
  assert.equal(shouldShowWarRoomFirstPersonLegs(-0.2), false);
  assert.equal(shouldShowWarRoomFirstPersonLegs(-0.3), true);
});

test("legs stay on the current floor and alternate their articulated stride", () => {
  const state = {
    x: 3,
    z: -2,
    floorHeight: 3.05,
    jumpHeight: 0.2,
    yaw: 0,
    movement: 1,
    walkPhase: Math.PI / 2,
    crouched: false,
    prone: false,
  };
  const left = getWarRoomFirstPersonLegPose(state, -1);
  const right = getWarRoomFirstPersonLegPose(state, 1);

  assert.equal(left.ankle.y, 3.37);
  assert.equal(right.ankle.y, 3.37);
  assert.ok(Math.abs(left.ankle.z - right.ankle.z) > 0.4);
  assert.notDeepEqual(left.knee, right.knee);
  assert.ok(Math.hypot(left.toe.x - left.ankle.x, left.toe.z - left.ankle.z) > 0.3);
  const stepping = getWarRoomFirstPersonLegPose({ ...state, walkPhase: 0 }, 1);
  const planted = getWarRoomFirstPersonLegPose({ ...state, walkPhase: 0 }, -1);
  assert.ok(stepping.ankle.y > planted.ankle.y);
  assert.ok([left, right].flatMap((pose) => Object.values(pose).flatMap(Object.values))
    .every(Number.isFinite));
});
