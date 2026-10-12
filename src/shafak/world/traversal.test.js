import assert from "node:assert/strict";
import test from "node:test";
import { createTraversalState, stepTraversal } from "./traversal.ts";

const still = { sprintHeld: false, jumpPressed: false, jumpHeld: false, dashPressed: false, moving: false };

test("jump buffering triggers a jump as soon as the player lands", () => {
  let state = {
    ...createTraversalState(),
    grounded: false,
    jumpHeight: 0.04,
    verticalVelocity: -2,
    jumpsUsed: 2,
    coyoteTime: 0,
  };
  let step = stepTraversal(state, { ...still, jumpPressed: true }, 1 / 60);
  state = step.state;
  assert.equal(state.jumpBuffer > 0, true);
  for (let index = 0; index < 60 && state.grounded === false; index += 1) {
    step = stepTraversal(state, still, 1 / 60);
    state = step.state;
  }
  step = stepTraversal(state, still, 1 / 60);
  assert.equal(step.state.grounded, false);
  assert.equal(step.state.jumpsUsed, 1);
  assert.ok(step.state.verticalVelocity > 5);
});

test("coyote time and one mid-air double jump are available", () => {
  let state = { ...createTraversalState(), grounded: false, coyoteTime: 0.08, jumpHeight: 0.01 };
  let step = stepTraversal(state, { ...still, jumpPressed: true }, 1 / 60);
  assert.equal(step.state.jumpsUsed, 1);
  assert.ok(step.state.verticalVelocity > 5.5);

  state = { ...step.state, jumpBuffer: 0, coyoteTime: 0, verticalVelocity: 1 };
  step = stepTraversal(state, { ...still, jumpPressed: true }, 1 / 60);
  assert.equal(step.state.jumpsUsed, 2);
  assert.ok(step.state.verticalVelocity > 5);
  const third = stepTraversal(step.state, { ...still, jumpPressed: true }, 1 / 60);
  assert.equal(third.state.jumpsUsed, 2);
});

test("sprinting drains stamina, resting restores it, and exhaustion disables sprint", () => {
  let state = createTraversalState();
  let result = stepTraversal(state, { ...still, sprintHeld: true, moving: true }, 0.05);
  state = result.state;
  assert.equal(result.sprintEnabled, true);
  assert.ok(state.stamina < 100);

  state = { ...state, stamina: 0.2 };
  result = stepTraversal(state, { ...still, sprintHeld: true, moving: true }, 0.05);
  assert.equal(result.sprintEnabled, true);
  assert.equal(result.state.stamina, 0);
  result = stepTraversal(result.state, { ...still, sprintHeld: true, moving: true }, 0.05);
  assert.equal(result.sprintEnabled, false);
  assert.equal(result.state.activity, "resting");

  result = stepTraversal({ ...result.state, stamina: 20 }, still, 0.05);
  assert.ok(result.state.stamina > 20);
});

test("dash consumes stamina, is time-limited, and respects its cooldown", () => {
  let result = stepTraversal(createTraversalState(), { ...still, dashPressed: true }, 1 / 60);
  assert.equal(result.dashActive, true);
  assert.equal(result.state.activity, "dashing");
  assert.equal(result.state.stamina, 76);

  result = stepTraversal(result.state, { ...still, dashPressed: true }, 0.05);
  assert.ok(Math.abs(result.state.dashTime - 0.15) < 1e-9);
  assert.equal(result.state.stamina, 76);
});

