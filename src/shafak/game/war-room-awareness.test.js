import assert from "node:assert/strict";
import test from "node:test";
import { updateWarRoomAwareness } from "./war-room-awareness.ts";

test("guards move from patrol to an audible alert and then engage a visible player", () => {
  const patrol = updateWarRoomAwareness(0, 1 / 60, { visible: false, heardSound: false });
  assert.equal(patrol.state, "patrol");
  assert.equal(patrol.awareness, 0);

  const heard = updateWarRoomAwareness(patrol.awareness, 1 / 60, {
    visible: false,
    heardSound: true,
  });
  assert.equal(heard.state, "alert");

  let awareness = heard.awareness;
  let state = heard.state;
  for (let frame = 0; frame < 40 && state !== "engaged"; frame += 1) {
    ({ awareness, state } = updateWarRoomAwareness(awareness, 1 / 60, {
      visible: true,
      heardSound: false,
    }));
  }
  assert.equal(state, "engaged");
  assert.ok(awareness >= 0.85);
});

test("guards lose awareness and return to patrol after the player leaves", () => {
  let awareness = 1;
  let state = "engaged";
  for (let frame = 0; frame < 100 && state !== "patrol"; frame += 1) {
    ({ awareness, state } = updateWarRoomAwareness(awareness, 0.1, {
      visible: false,
      heardSound: false,
    }));
  }
  assert.equal(state, "patrol");
  assert.ok(awareness < 0.22);
});
