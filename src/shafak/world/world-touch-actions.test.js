import assert from "node:assert/strict";
import test from "node:test";
import {
  countWorldTouchPointers,
  endWorldTouchAction,
  isWorldTouchTap,
  startWorldTouchAction,
  syncWorldTouchActionKey,
  toggleWorldTouchActionState,
} from "./world-touch-actions.ts";
import { readWorldActions, readWorldInput } from "./movement.ts";

test("independent touch pointers keep sprint and jump active separately", () => {
  const pointers = new Map();
  assert.equal(startWorldTouchAction(pointers, "shift", 21), true);
  assert.equal(startWorldTouchAction(pointers, "space", 22), true);
  assert.equal(countWorldTouchPointers(pointers), 2);

  assert.deepEqual(endWorldTouchAction(pointers, "shift", 21), {
    released: true,
    stillPressed: false,
  });
  assert.equal(pointers.get("space").has(22), true);
  assert.deepEqual(endWorldTouchAction(pointers, "space", 22), {
    released: true,
    stillPressed: false,
  });
  assert.equal(countWorldTouchPointers(pointers), 0);
});

test("releasing one of two pointers does not cancel the same held action", () => {
  const pointers = new Map();
  assert.equal(startWorldTouchAction(pointers, "c", 31), true);
  assert.equal(startWorldTouchAction(pointers, "c", 32), true);
  assert.equal(startWorldTouchAction(pointers, "c", 32), false);

  assert.deepEqual(endWorldTouchAction(pointers, "c", 31), {
    released: true,
    stillPressed: true,
  });
  assert.equal(pointers.get("c").has(32), true);
  assert.deepEqual(endWorldTouchAction(pointers, "c", 32), {
    released: true,
    stillPressed: false,
  });
  assert.deepEqual(endWorldTouchAction(pointers, "c", 32), {
    released: false,
    stillPressed: false,
  });
});

test("mobile held actions flow into sprint and crouch movement state", () => {
  const pointers = new Map();
  const heldKeys = new Set();
  startWorldTouchAction(pointers, "shift", 41);
  syncWorldTouchActionKey(heldKeys, pointers, "shift");
  assert.equal(readWorldInput(heldKeys, { x: 0, y: 0.9 }).actions.sprint, true);

  startWorldTouchAction(pointers, "c", 42);
  syncWorldTouchActionKey(heldKeys, pointers, "c");
  const input = readWorldInput(heldKeys, { x: 0, y: 0.9 });
  assert.equal(input.actions.sprint, true);
  assert.equal(input.actions.crouch, true);

  endWorldTouchAction(pointers, "shift", 41);
  syncWorldTouchActionKey(heldKeys, pointers, "shift");
  assert.equal(readWorldInput(heldKeys, { x: 0, y: 0.9 }).actions.sprint, false);
  assert.equal(readWorldInput(heldKeys, { x: 0, y: 0.9 }).actions.crouch, true);
});

test("a jump pointer produces one action press without cancelling simultaneous held actions", () => {
  const pointers = new Map();
  const heldKeys = new Set();
  startWorldTouchAction(pointers, "shift", 71);
  startWorldTouchAction(pointers, "space", 72);
  syncWorldTouchActionKey(heldKeys, pointers, "shift");

  const jumpActions = readWorldActions(heldKeys, true);
  assert.deepEqual(jumpActions, { sprint: true, jumpPressed: true, crouch: false });
  endWorldTouchAction(pointers, "space", 72);
  assert.deepEqual(readWorldActions(heldKeys, false), {
    sprint: true,
    jumpPressed: false,
    crouch: false,
  });
});

test("short sprint and crouch presses can be toggled while long holds remain momentary", () => {
  assert.equal(isWorldTouchTap(120), true);
  assert.equal(isWorldTouchTap(220), true);
  assert.equal(isWorldTouchTap(221), false);
  assert.equal(isWorldTouchTap(Number.NaN), false);

  let toggled = toggleWorldTouchActionState(new Set(), "shift");
  assert.equal(toggled.has("shift"), true);
  toggled = toggleWorldTouchActionState(toggled, "shift");
  assert.equal(toggled.has("shift"), false);
});
