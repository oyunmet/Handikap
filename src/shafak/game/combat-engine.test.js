import assert from "node:assert/strict";
import test from "node:test";
import {
  INPUT_BUTTON,
  COMBAT_ARENA_CENTER_Z,
  COMBAT_ARENA_RADIUS,
  COMBO_CHAIN_WINDOW_TICKS,
  MAX_DUEL_TICKS,
  PERFECT_BLOCK_WINDOW_TICKS,
  createCombatState,
  getBotAttackWindupTicks,
  replayCombat,
  stepCombat,
} from "./combat-engine.ts";

const noInput = { x: 0, y: 0, buttons: 0, pressed: 0, released: 0 };

function tapCombatButton(state, button, heldButtons = 0) {
  const pressed = stepCombat(state, {
    ...noInput,
    buttons: heldButtons | button,
    pressed: button,
  });
  const released = stepCombat(pressed.state, {
    ...noInput,
    buttons: heldButtons,
    released: button,
  });
  return { state: released.state, events: [...pressed.events, ...released.events] };
}

function advanceCombat(state, ticks, buttons = 0) {
  const events = [];
  for (let index = 0; index < ticks && !state.ended; index += 1) {
    const result = stepCombat(state, { ...noInput, buttons });
    state = result.state;
    events.push(...result.events);
  }
  return { state, events };
}

test("duel fighters begin facing each other along the arena depth", () => {
  const state = createCombatState(21, "easy");
  assert.equal(state.player.x, state.bot.x);
  assert.ok(state.player.z > state.bot.z);
  assert.ok(Math.abs(state.player.z - state.bot.z) > 2.5);
});

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

test("combatants cannot occupy the same space during a duel", () => {
  const initial = createCombatState(7712, "easy");
  initial.player.x = 0;
  initial.player.z = 0;
  initial.bot.x = 0;
  initial.bot.z = 0;
  const state = stepCombat(initial, { x: 0, y: 0, buttons: 0, pressed: 0, released: 0 }).state;
  assert.ok(Math.hypot(state.player.x - state.bot.x, state.player.z - state.bot.z) >= 1.08 - 1e-9);
});

test("quick attacks form a light-light-heavy combo with rising finisher damage", () => {
  const noInput = { x: 0, y: 0, buttons: 0, pressed: 0, released: 0 };
  let state = createCombatState(2901, "easy");
  state.playerStats.criticalChance = 0;
  state.bot.x = state.player.x;
  state.bot.z = state.player.z - 1.8;
  state.bot.hp = 1_000;
  state.bot.maxHp = 1_000;
  state.bot.staggerUntilTick = 1_000;

  const tapAttack = (current) => {
    const pressed = stepCombat(current, {
      ...noInput,
      buttons: INPUT_BUTTON.attack,
      pressed: INPUT_BUTTON.attack,
    }).state;
    return stepCombat(pressed, {
      ...noInput,
      released: INPUT_BUTTON.attack,
    }).state;
  };
  const advanceToPlayerHit = (current) => {
    const events = [];
    const endTick = current.tick + 30;
    while (!current.player.attackHit && current.tick < endTick) {
      const result = stepCombat(current, noInput);
      current = result.state;
      events.push(...result.events);
    }
    current.bot.staggerUntilTick = 1_000;
    current.bot.actionUntilTick = 1_000;
    return { state: current, events };
  };
  const waitForNextAttack = (current) => {
    while (current.tick + 2 < current.player.attackCooldownUntilTick) {
      current = stepCombat(current, noInput).state;
    }
    return current;
  };

  let result = advanceToPlayerHit(tapAttack(state));
  state = result.state;
  const firstDamage = result.events.find((event) => event.type === "hit" && event.target === "bot")?.damage;
  assert.equal(state.player.comboChainStep, 1);
  assert.equal(state.player.attackComboStep, 1);

  result = advanceToPlayerHit(tapAttack(waitForNextAttack(state)));
  state = result.state;
  const secondDamage = result.events.find((event) => event.type === "hit" && event.target === "bot")?.damage;
  assert.equal(state.player.comboChainStep, 2);
  assert.equal(state.player.attackComboStep, 2);

  state = tapAttack(waitForNextAttack(state));
  assert.equal(state.player.attackType, "heavy");
  assert.equal(state.player.attackComboStep, 3);
  assert.equal(state.player.comboChainStep, 0);
  result = advanceToPlayerHit(state);
  const finisherDamage = result.events.find((event) => event.type === "hit" && event.target === "bot")?.damage;
  assert.ok(firstDamage && secondDamage && finisherDamage);
  assert.ok(secondDamage > firstDamage);
  assert.ok(finisherDamage > secondDamage);
});

test("an expired quick-combo window restarts at the first light hit", () => {
  const initial = createCombatState(2902, "easy");
  initial.tick = COMBO_CHAIN_WINDOW_TICKS + 1;
  initial.player.comboChainStep = 2;
  initial.player.comboChainUntilTick = COMBO_CHAIN_WINDOW_TICKS;
  initial.player.attackCooldownUntilTick = initial.tick;
  initial.bot.staggerUntilTick = initial.tick + 100;

  const pressed = stepCombat(initial, {
    x: 0, y: 0,
    buttons: INPUT_BUTTON.attack,
    pressed: INPUT_BUTTON.attack,
    released: 0,
  }).state;
  const released = stepCombat(pressed, {
    x: 0, y: 0,
    buttons: 0,
    pressed: 0,
    released: INPUT_BUTTON.attack,
  }).state;

  assert.equal(released.player.attackType, "light");
  assert.equal(released.player.attackComboStep, 1);
  assert.equal(released.player.comboChainStep, 1);
});

test("a short bow requires aim, uses a knife at close range, and can fire through clear lanes", () => {
  const unAimed = createCombatState(2903, "easy");
  unAimed.weaponIds[0] = "weapon_short_bow";
  unAimed.bot.staggerUntilTick = 1_000;
  const denied = tapCombatButton(unAimed, INPUT_BUTTON.attack);
  assert.equal(denied.state.player.attackType, null);

  const aimed = createCombatState(2904, "easy");
  aimed.weaponIds[0] = "weapon_short_bow";
  aimed.bot.staggerUntilTick = 1_000;
  const shot = tapCombatButton(aimed, INPUT_BUTTON.attack, INPUT_BUTTON.aim);
  assert.equal(shot.state.player.attackIsRanged, true);
  const resolved = advanceCombat(shot.state, 12, INPUT_BUTTON.aim);
  assert.ok(resolved.events.some((event) => event.type === "projectile" && event.weaponId === "weapon_short_bow"));
  assert.ok(resolved.events.some((event) => event.type === "hit" && event.target === "bot"));

  const close = createCombatState(2905, "easy");
  close.weaponIds[0] = "weapon_short_bow";
  close.bot.x = close.player.x;
  close.bot.z = close.player.z - 1.5;
  close.bot.staggerUntilTick = 1_000;
  const knifeAttack = tapCombatButton(close, INPUT_BUTTON.attack);
  assert.equal(knifeAttack.state.player.attackIsRanged, false);
  assert.ok(knifeAttack.events.some((event) => event.type === "weaponTrail" && event.weaponId === "weapon_hunting_knife"));
  const knifeHit = advanceCombat(knifeAttack.state, 12);
  assert.ok(knifeHit.events.some((event) => event.type === "hit" && event.weaponId === "weapon_hunting_knife"));
});

test("ranged shots are stopped by arena cover rather than damaging the rival", () => {
  const state = createCombatState(2906, "easy");
  state.weaponIds[0] = "weapon_short_bow";
  state.player.x = -4;
  state.player.z = COMBAT_ARENA_CENTER_Z;
  state.bot.x = 4;
  state.bot.z = COMBAT_ARENA_CENTER_Z;
  state.bot.staggerUntilTick = 1_000;
  const attack = tapCombatButton(state, INPUT_BUTTON.attack, INPUT_BUTTON.aim);
  const resolved = advanceCombat(attack.state, 12, INPUT_BUTTON.aim);

  assert.ok(resolved.events.some((event) => event.type === "projectile"));
  assert.ok(resolved.events.some((event) => event.type === "coverBlock"));
  assert.equal(resolved.events.some((event) => event.type === "hit" && event.target === "bot"), false);
  assert.equal(resolved.state.bot.hp, state.bot.hp);
});

test("a jump followed by an attack produces a plunge hit and impact event", () => {
  const state = createCombatState(2907, "easy");
  state.bot.x = state.player.x;
  state.bot.z = state.player.z - 1.5;
  state.bot.staggerUntilTick = 1_000;

  const jump = tapCombatButton(state, INPUT_BUTTON.jump);
  assert.ok(jump.state.player.jumpUntilTick > jump.state.tick);
  const attack = tapCombatButton(jump.state, INPUT_BUTTON.attack);
  assert.equal(attack.state.player.attackWasPlunge, true);
  const resolved = advanceCombat(attack.state, 12);
  assert.ok(resolved.events.some((event) => event.type === "hit" && event.target === "bot" && event.plunge));

  const untilLanding = resolved.state.player.jumpUntilTick - resolved.state.tick;
  const landing = advanceCombat(resolved.state, untilLanding);
  const landingEvent = landing.events.find((event) => event.type === "plungeLand");
  assert.ok(landingEvent);
  assert.equal(landingEvent.target, "player");
  assert.ok(Number.isFinite(landingEvent.originX));
  assert.ok(Number.isFinite(landingEvent.originZ));
});

test("a quick second dash rebounds inward at the arena edge and grants 0.25 seconds of invulnerability", () => {
  const initial = createCombatState(2908, "easy");
  initial.tick = 100;
  initial.player.x = COMBAT_ARENA_RADIUS - 0.25;
  initial.player.z = COMBAT_ARENA_CENTER_Z;
  initial.player.lastDodgeTick = 100;
  initial.player.vx = 0;
  initial.player.vz = 0;
  initial.bot.x = -2;
  initial.bot.z = COMBAT_ARENA_CENTER_Z;
  initial.bot.staggerUntilTick = 1_000;

  const result = stepCombat(initial, {
    x: 1,
    y: 0,
    buttons: INPUT_BUTTON.dodge,
    pressed: INPUT_BUTTON.dodge,
    released: 0,
  });
  const event = result.events.find((candidate) => candidate.type === "backflip");

  assert.ok(event?.edgeRebound);
  assert.equal(result.state.player.action, "backflip");
  assert.equal(result.state.player.invulnerableUntilTick, result.state.tick + 16);
  assert.ok(result.state.player.vx < 0, "the rebound pushes the player back into the arena");
  assert.ok(Math.hypot(
    result.state.player.x,
    result.state.player.z - COMBAT_ARENA_CENTER_Z,
  ) < COMBAT_ARENA_RADIUS - 0.25);
});

test("the perfect-block window lasts 0.2 seconds, then becomes a normal block", () => {
  const resolveAtOffset = (offset) => {
    const state = createCombatState(2908 + offset, "easy");
    state.tick = 98;
    state.player.x = 0;
    state.player.z = 0;
    state.bot.x = 0;
    state.bot.z = -1.8;
    state.bot.action = "block";
    state.bot.actionUntilTick = 500;
    state.bot.blockStartedTick = 108 - offset;

    let current = stepCombat(state, {
      ...noInput,
      buttons: INPUT_BUTTON.attack,
      pressed: INPUT_BUTTON.attack,
    }).state;
    const events = [];
    const released = stepCombat(current, {
      ...noInput,
      released: INPUT_BUTTON.attack,
    });
    current = released.state;
    events.push(...released.events);
    const remaining = advanceCombat(current, 8);
    events.push(...remaining.events);
    return events;
  };

  assert.equal(PERFECT_BLOCK_WINDOW_TICKS, 12);
  assert.ok(resolveAtOffset(PERFECT_BLOCK_WINDOW_TICKS).some((event) => event.type === "parry"));
  assert.ok(resolveAtOffset(PERFECT_BLOCK_WINDOW_TICKS + 1).some((event) => event.type === "block"));
});

test("combat movement can advance toward the opponent along the arena depth axis", () => {
  const initial = createCombatState(8123, "easy");
  const moved = stepCombat(initial, { x: 0, y: -100, buttons: 0, pressed: 0, released: 0 }).state;
  assert.ok(moved.player.z < initial.player.z);
  assert.equal(moved.player.x, initial.player.x);
});

test("both combatants stay inside the circular duel arena while moving diagonally", () => {
  let state = createCombatState(8124, "medium");
  state.bot.x = 3;
  state.bot.z = COMBAT_ARENA_CENTER_Z;
  for (let tick = 0; tick < 240; tick += 1) {
    state = stepCombat(state, { x: 100, y: 100, buttons: 0, pressed: 0, released: 0 }).state;
    for (const actor of [state.player, state.bot]) {
      assert.ok(
        Math.hypot(actor.x, actor.z - COMBAT_ARENA_CENTER_Z) <= COMBAT_ARENA_RADIUS + 1e-9,
      );
    }
  }
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
