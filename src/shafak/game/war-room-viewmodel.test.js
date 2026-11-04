import test from "node:test";
import assert from "node:assert/strict";
import {
  getWarRoomViewModelConfig,
  getWarRoomViewModelGripPoints,
  getWarRoomViewModelHorizontalFactor,
  getWarRoomViewModelPose,
  getWarRoomViewModelScaleFactor,
  stepWarRoomViewModelWallProximity,
} from "./war-room-viewmodel.ts";

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

test("portrait view keeps the weapon inside a narrower camera frame", () => {
  const state = {
    time: 0, movement: 0, aiming: false, recoil: 0, reloadProgress: 0, chargeProgress: 0,
    meleeProgress: null, meleeStyle: "slash", comboIndex: 0, motionReduced: false,
  };
  const landscape = getWarRoomViewModelPose(state, 1.75);
  const portrait = getWarRoomViewModelPose(state, 0.46);
  assert.ok(portrait.position[0] < landscape.position[0] * 0.3);
  assert.ok(portrait.position[0] < 0.1);
  assert.ok(portrait.position[1] > -0.1);
  assert.ok(getWarRoomViewModelHorizontalFactor(0.46) < 0.3);
  assert.ok(getWarRoomViewModelScaleFactor(0.46) < getWarRoomViewModelScaleFactor(1.75));
  assert.equal(getWarRoomViewModelHorizontalFactor(1.75), 1);
});

test("reduced motion removes idle, locomotion, and firing sway", () => {
  const pose = getWarRoomViewModelPose({
    time: 1.2, movement: 1, aiming: false, recoil: 1, reloadProgress: 0, chargeProgress: 0,
    meleeProgress: null, meleeStyle: "slash", comboIndex: 0, motionReduced: true,
  });
  assert.deepEqual(pose.position, [0.28, -0.08, -0.58]);
  assert.deepEqual(pose.rotation, [0.04, -0.06, -0.045]);
});

test("walking sway is limited to a small side swing with no forward, vertical, or pitch pumping", () => {
  const state = {
    time: 0,
    movement: 1,
    aiming: false,
    recoil: 0,
    reloadProgress: 0,
    chargeProgress: 0,
    meleeProgress: null,
    meleeStyle: "slash",
    comboIndex: 0,
    motionReduced: false,
  };
  const phases = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]
    .map((walkPhase) => getWarRoomViewModelPose({ ...state, walkPhase }));
  const sidePositions = phases.map((pose) => pose.position[0]);
  assert.ok(Math.max(...sidePositions) - Math.min(...sidePositions) >= 0.027);

  for (const pose of phases) {
    assert.equal(pose.position[1], -0.08);
    assert.equal(pose.position[2], -0.58);
    assert.equal(pose.rotation[0], 0.04);
  }
  assert.ok(Math.max(...phases.map((pose) => Math.abs(pose.rotation[1] + 0.06))) <= 0.00401);
  assert.ok(Math.max(...phases.map((pose) => Math.abs(pose.rotation[2] + 0.045))) <= 0.01201);

  const stopped = getWarRoomViewModelPose({ ...state, movement: 0, walkPhase: Math.PI / 2 });
  assert.equal(stopped.position[0], 0.28);
  assert.equal(stopped.position[1], -0.08);
  assert.equal(stopped.position[2], -0.58);
  assert.equal(stopped.rotation[1], -0.06);
  assert.equal(stopped.rotation[2], -0.045);
});

test("wall proximity eases in and out instead of snapping the weapon", () => {
  const approaching = stepWarRoomViewModelWallProximity(0, 1, 1 / 60);
  const closer = stepWarRoomViewModelWallProximity(approaching, 1, 1 / 60);
  const retreating = stepWarRoomViewModelWallProximity(closer, 0, 1 / 60);

  assert.ok(approaching > 0 && approaching < 1);
  assert.ok(closer > approaching && closer < 1);
  assert.ok(retreating > 0 && retreating < closer);
  assert.equal(stepWarRoomViewModelWallProximity(closer, 0, 0), closer);
});

test("stationary wall tuck stays small instead of zooming the weapon toward the camera", () => {
  const state = {
    time: 0,
    movement: 0,
    aiming: false,
    recoil: 0,
    reloadProgress: 0,
    chargeProgress: 0,
    meleeProgress: null,
    meleeStyle: "slash",
    comboIndex: 0,
    motionReduced: false,
  };
  const clear = getWarRoomViewModelPose({ ...state, wallProximity: 0 });
  const close = getWarRoomViewModelPose({ ...state, wallProximity: 1 });

  assert.ok(clear.position[2] < close.position[2]);
  assert.ok(close.position[2] - clear.position[2] <= 0.080001);
  assert.ok(clear.position[1] - close.position[1] <= 0.035001);
});

test("wall proximity cannot push the weapon forward or back while moving", () => {
  const state = {
    time: 0,
    movement: 1,
    aiming: false,
    recoil: 0,
    reloadProgress: 0,
    chargeProgress: 0,
    meleeProgress: null,
    meleeStyle: "slash",
    comboIndex: 0,
    motionReduced: false,
  };
  const clear = getWarRoomViewModelPose({ ...state, wallProximity: 0 });
  const nearWall = getWarRoomViewModelPose({ ...state, wallProximity: 1 });

  assert.deepEqual(nearWall.position, clear.position);
  assert.deepEqual(nearWall.rotation, clear.rotation);
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
  assert.equal(getWarRoomViewModelScaleFactor(1.75), 0.6);
});

test("weapon switching stays animated without adding a sprint push-in", () => {
  const base = {
    time: 0,
    movement: 0.4,
    aiming: false,
    recoil: 0,
    reloadProgress: 0,
    chargeProgress: 0,
    meleeProgress: null,
    meleeStyle: "slash",
    comboIndex: 0,
    motionReduced: false,
  };
  const walking = getWarRoomViewModelPose(base);
  const running = getWarRoomViewModelPose({ ...base, movement: 1 });
  const lowering = getWarRoomViewModelPose({ ...base, switchProgress: 0 });
  const raised = getWarRoomViewModelPose({ ...base, switchProgress: 1 });

  assert.equal(running.position[1], walking.position[1]);
  assert.equal(running.position[2], walking.position[2]);
  assert.equal(running.rotation[0], walking.rotation[0]);
  assert.ok(lowering.position[1] < raised.position[1]);
  assert.ok(lowering.position[1] > raised.position[1] - 0.31);
});

test("each modeled War Room weapon carries its own view-model transform", () => {
  const rifle = getWarRoomViewModelConfig("powder_rifle", false);
  const sidearm = getWarRoomViewModelConfig("sidearm", false);
  assert.notDeepEqual(rifle.position, sidearm.position);
  assert.notDeepEqual(rifle.rotation, sidearm.rotation);
});

test("the four primary ranged weapons define distinct right and support-hand grips", () => {
  for (const weaponId of ["powder_rifle", "sidearm", "crossbow", "longbow"]) {
    const { gripR, gripL } = getWarRoomViewModelGripPoints(weaponId);
    assert.equal(gripR.length, 3);
    assert.equal(gripL.length, 3);
    assert.notDeepEqual(gripR, gripL);
    assert.ok([...gripR, ...gripL].every(Number.isFinite));
  }
  assert.notDeepEqual(
    getWarRoomViewModelGripPoints("crossbow"),
    getWarRoomViewModelGripPoints("longbow"),
  );
});
