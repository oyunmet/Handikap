import test from "node:test";
import assert from "node:assert/strict";
import { getWarRoomViewModelConfig, getWarRoomViewModelPose } from "./war-room-viewmodel.ts";

test("first-person view model moves to the sight line while aiming", () => {
  const relaxed = getWarRoomViewModelPose({
    time: 0, movement: 0, aiming: false, recoil: 0, reloadProgress: 0, chargeProgress: 0,
    meleeProgress: null, meleeStyle: "slash", comboIndex: 0, motionReduced: false,
  });
  const aimed = getWarRoomViewModelPose({
    time: 0, movement: 0, aiming: true, recoil: 0, reloadProgress: 0, chargeProgress: 0,
    meleeProgress: null, meleeStyle: "slash", comboIndex: 0, motionReduced: false,
  });
  assert.ok(Math.abs(aimed.position[0]) < Math.abs(relaxed.position[0]));
  assert.ok(aimed.position[1] > relaxed.position[1]);
});

test("reduced motion removes idle, locomotion, and firing sway", () => {
  const pose = getWarRoomViewModelPose({
    time: 1.2, movement: 1, aiming: false, recoil: 1, reloadProgress: 0, chargeProgress: 0,
    meleeProgress: null, meleeStyle: "slash", comboIndex: 0, motionReduced: true,
  });
  assert.deepEqual(pose.position, [0.42, -0.31, -0.58]);
  assert.deepEqual(pose.rotation, [0.04, -0.06, -0.045]);
});

test("melee attacks get distinct sweep and thrust view-model arcs", () => {
  const shared = {
    time: 0.5, movement: 0, aiming: false, recoil: 0, reloadProgress: 0, chargeProgress: 0,
    meleeProgress: 0.56, comboIndex: 0, motionReduced: false,
  };
  const slash = getWarRoomViewModelPose({ ...shared, meleeStyle: "slash" });
  const thrust = getWarRoomViewModelPose({ ...shared, meleeStyle: "thrust" });
  assert.notDeepEqual(slash.rotation, thrust.rotation);
  assert.ok(slash.position[0] > 0);
  assert.ok(thrust.position[2] < slash.position[2]);
});

test("first-person weapon scale keeps oversized bows and crossbows controlled", () => {
  assert.ok(getWarRoomViewModelConfig("crossbow", false).scale < getWarRoomViewModelConfig("powder_rifle", false).scale);
  assert.ok(getWarRoomViewModelConfig("longbow", false).scale < 0.7);
  assert.equal(getWarRoomViewModelConfig("sidearm", false).scale, 0.72);
});

test("each modeled War Room weapon carries its own view-model transform", () => {
  const rifle = getWarRoomViewModelConfig("powder_rifle", false);
  const sidearm = getWarRoomViewModelConfig("sidearm", false);
  assert.notDeepEqual(rifle.position, sidearm.position);
  assert.notDeepEqual(rifle.rotation, sidearm.rotation);
});
