import assert from "node:assert/strict";
import test from "node:test";
import {
  endWorldTouchAction,
  startWorldTouchAction,
  syncWorldTouchActionKey,
} from "./world-touch-actions.ts";
import { readWorldInput } from "./movement.ts";

test("independent touch pointers keep sprint and jump active separately", () => {
  const pointers = new Map();
  assert.equal(startWorldTouchAction(pointers, "shift", 21), true);
  assert.equal(startWorldTouchAction(pointers, "space", 22), true);

  assert.deepEqual(endWorldTouchAction(pointers, "shift", 21), {
    released: true,
    stillPressed: false,
  });
  assert.equal(pointers.get("space").has(22), true);
  assert.deepEqual(endWorldTouchAction(pointers, "space", 22), {
    released: true,
    stillPressed: false,
  });
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
  assert.equal(readWorldInput(heldKeys, { x: 0, y: 0.9 }).sprint, true);

  startWorldTouchAction(pointers, "c", 42);
  syncWorldTouchActionKey(heldKeys, pointers, "c");
  const input = readWorldInput(heldKeys, { x: 0, y: 0.9 });
  assert.equal(input.sprint, true);
  assert.equal(input.crouch, true);

  endWorldTouchAction(pointers, "shift", 41);
  syncWorldTouchActionKey(heldKeys, pointers, "shift");
  assert.equal(readWorldInput(heldKeys, { x: 0, y: 0.9 }).sprint, false);
  assert.equal(readWorldInput(heldKeys, { x: 0, y: 0.9 }).crouch, true);
});
