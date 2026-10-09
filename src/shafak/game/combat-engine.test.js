import assert from "node:assert/strict";
import test from "node:test";
import {
  INPUT_BUTTON,
  createCombatState,
  replayCombat,
  stepCombat,
} from "./combat-engine.ts";

test("a recorded sparse input tape replays to the same seeded combat state", () => {
  const seed = 881723;
  let state = createCombatState(seed, "medium");
  const frames = [[0, 0, 0, 0, 0, 0]];
  const events = [];
  let previousButtons = 0;

  for (let tick = 1; tick <= 720 && !state.ended; tick += 1) {
    const cycle = tick % 38;
    const buttons = cycle === 1 ? INPUT_BUTTON.attack : 0;
    const pressed = buttons & ~previousButtons;
    const released = previousButtons & ~buttons;
    if (buttons !== previousButtons) frames.push([tick, 0, 0, buttons, pressed, released]);
    previousButtons = buttons;
    const result = stepCombat(state, { x: 0, y: 0, buttons, pressed, released });
    state = result.state;
    events.push(...result.events);
  }

  const replay = replayCombat(seed, "medium", frames);
  assert.deepEqual(replay.state, state);
  assert.ok(events.some((event) => ["hit", "block", "parry", "dodge"].includes(event.type)));
  assert.equal(replay.consumedFrames, frames.length);
});

test("seeded bots choose the same actions and damage on each replay", () => {
  const run = () => {
    let state = createCombatState(12345, "hard");
    const history = [];
    for (let index = 0; index < 900 && !state.ended; index += 1) {
      const result = stepCombat(state, { x: 0, y: 0, buttons: 0, pressed: 0, released: 0 });
      state = result.state;
      history.push(...result.events);
    }
    return { state, history };
  };
  assert.deepEqual(run(), run());
});
