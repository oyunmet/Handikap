import assert from "node:assert/strict";
import test from "node:test";
import {
  INPUT_BUTTON,
  MAX_DUEL_TICKS,
  createCombatState,
  getBotAttackWindupTicks,
  replayCombat,
  stepCombat,
} from "./combat-engine.ts";

test("a recorded sparse input tape replays to the same seeded combat state", () => {
  const seed = 881723;
  let state = createCombatState(seed, "medium");
  const frames = [[0, 0, 0, 0, 0, 0]];
  const events = [];
  let previousButtons = 0;

  for (let tick = 1; tick <= MAX_DUEL_TICKS && !state.ended; tick += 1) {
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

test("server-owned equipment modifiers set combat stats and keep replays deterministic", () => {
  const stats = {
    maxHealth: 170,
    damageMultiplier: 1.18,
    defenseReduction: 0.12,
    criticalChance: 0.22,
    moveSpeedMultiplier: 1.08,
    attackSpeedMultiplier: 1.1,
    attackRangeBonus: 0.3,
  };
  const state = createCombatState(44112, "medium", stats);
  assert.equal(state.player.maxHp, 170);
  assert.equal(state.playerStats.damageMultiplier, 1.18);
  assert.equal(state.playerStats.defenseReduction, 0.12);
  const frames = [[0, 0, 0, 0, 0, 0]];
  const firstReplay = replayCombat(44112, "medium", frames, stats);
  const secondReplay = replayCombat(44112, "medium", frames, stats);
  assert.equal(firstReplay.state.player.maxHp, 170);
  assert.deepEqual(firstReplay, secondReplay);
});

function simulateEasyDuel(seed, controlled) {
  let state = createCombatState(seed, "easy");
  let heldButtons = 0;
  while (!state.ended && state.tick < 5_400) {
    const player = state.player;
    const bot = state.bot;
    const gap = Math.hypot(player.x - bot.x, player.z - bot.z);
    let x = 0;
    let y = 0;
    let buttons = 0;

    if (controlled) {
      if (gap > 1.8) {
        x = ((bot.x - player.x) / gap) * 100;
        y = ((bot.z - player.z) / gap) * 100;
      }
      if (state.tick % 144 === 0) buttons |= INPUT_BUTTON.attack;
      const windup = getBotAttackWindupTicks(state.difficulty);
      const attackAge = state.tick - bot.attackStartedTick;
      if (bot.attackType && attackAge >= windup - 9 && attackAge < windup + 2) {
        buttons |= INPUT_BUTTON.block;
      }
    }

    const pressed = buttons & ~heldButtons;
    const released = heldButtons & ~buttons;
    state = stepCombat(state, { x, y, buttons, pressed, released }).state;
    heldButtons = buttons;
  }
  return state;
}

test("an idle player survives at least 20 seconds against the easy bot", () => {
  for (let index = 0; index < 40; index += 1) {
    const state = simulateEasyDuel(8_000 + index, false);
    assert.ok(state.tick >= 1_200, `seed ${state.seed} ended at ${state.tick} ticks`);
  }
});

test("a measured player wins at least 80% of easy duels lasting 45–90 seconds", () => {
  const matches = Array.from({ length: 40 }, (_, index) => simulateEasyDuel(9_000 + index, true));
  const wins = matches.filter((state) => state.verdict === "victory").length;
  const averageSeconds = matches.reduce((sum, state) => sum + state.tick, 0) / matches.length / 60;

  assert.ok(wins / matches.length >= 0.8, `win rate was ${wins}/${matches.length}`);
  assert.ok(
    averageSeconds >= 45 && averageSeconds <= 90,
    `average duel duration was ${averageSeconds.toFixed(1)} seconds`,
  );
});

test("bot windup leaves at least half a second to react at every difficulty", () => {
  assert.ok(getBotAttackWindupTicks("easy") >= 42);
  assert.ok(getBotAttackWindupTicks("medium") >= 36);
  assert.ok(getBotAttackWindupTicks("hard") >= 30);
});

test("a block negates bot damage and active dodge frames avoid the hit", () => {
  const prepareIncomingHit = (playerOverrides = {}) => {
    const state = createCombatState(321, "easy");
    const tick = 100;
    return {
      ...state,
      tick,
      player: {
        ...state.player,
        x: 0,
        z: 0,
        ...playerOverrides,
      },
      bot: {
        ...state.bot,
        x: 1,
        z: 0,
        action: "windup",
        actionUntilTick: 200,
        attackType: "light",
        attackStartedTick: tick + 1 - getBotAttackWindupTicks("easy"),
        attackHit: false,
      },
    };
  };
  const noInput = { x: 0, y: 0, buttons: 0, pressed: 0, released: 0 };
  const struck = stepCombat(prepareIncomingHit(), noInput);
  assert.ok(struck.events.some((event) => event.type === "hit" && event.target === "player" && event.damage > 0));
  assert.ok(struck.state.player.hp < 150);

  const blocked = stepCombat(prepareIncomingHit({
    action: "block",
    actionUntilTick: 200,
    blockStartedTick: 0,
  }), { ...noInput, buttons: INPUT_BUTTON.block });
  assert.ok(blocked.events.some((event) => event.type === "block" && event.damage === 0));
  assert.equal(blocked.state.player.hp, 150);

  const dodged = stepCombat(prepareIncomingHit({
    action: "dodge",
    actionUntilTick: 200,
    invulnerableUntilTick: 117,
  }), noInput);
  assert.ok(dodged.events.some((event) => event.type === "dodge" && event.target === "player"));
  assert.equal(dodged.state.player.hp, 150);
});
