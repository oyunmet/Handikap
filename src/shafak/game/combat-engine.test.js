import assert from "node:assert/strict";
import test from "node:test";
import {
  DUEL_ARENA_CENTER_Z,
  DUEL_ARENA_RADIUS,
  INPUT_BUTTON,
  MAX_DUEL_TICKS,
  constrainActorToArena,
  createCombatState,
  getBotAttackWindupTicks,
  replayCombat,
  stepCombat,
} from "./combat-engine.ts";
import { normalizeYaw, yawToward } from "./duel-direction.ts";

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

test("directional combat records yaw and lock state in deterministic replays", () => {
  const seed = 54812;
  let state = createCombatState(seed, "medium");
  let buttons = 0;
  const initialYaw = Math.round(state.player.yaw * 1_000);
  const frames = [[0, 0, 0, 0, 0, 0, initialYaw, 1]];
  for (let tick = 1; tick <= MAX_DUEL_TICKS && !state.ended; tick += 1) {
    const lockOn = tick < MAX_DUEL_TICKS / 2;
    const yaw = lockOn ? 0.8 : normalizeYaw(tick < MAX_DUEL_TICKS * 0.75 ? 0.5 : -1.2);
    const nextButtons = tick % 54 === 2 ? INPUT_BUTTON.attack : 0;
    const pressed = nextButtons & ~buttons;
    const released = buttons & ~nextButtons;
    const x = tick >= 210 && tick < 250 ? 18 : 0;
    const y = tick >= 210 && tick < 250 ? 20 : 0;
    const frame = [
      tick,
      x,
      y,
      nextButtons,
      pressed,
      released,
      Math.round(yaw * 1_000),
      lockOn ? 1 : 0,
    ];
    const previous = frames.at(-1);
    if (frame.slice(1).some((value, index) => value !== previous[index + 1])) frames.push(frame);
    const result = stepCombat(state, {
      x,
      y,
      buttons: nextButtons,
      pressed,
      released,
      yaw,
      lockOn,
      directional: true,
    });
    state = result.state;
    buttons = nextButtons;
  }

  const replay = replayCombat(seed, "medium", frames);
  assert.deepEqual(replay.state, state);
  assert.equal(replay.consumedFrames, frames.length);
  assert.equal(frames[0].length, 8);
});

test("a directional attack must enter its facing cone and back attacks gain flank damage", () => {
  const makePlayerAttack = (botX, botZ, playerYaw) => {
    const state = createCombatState(9923, "easy");
    state.tick = 100;
    state.player = {
      ...state.player,
      x: 0,
      z: 0,
      yaw: playerYaw,
      action: "attack",
      actionUntilTick: 180,
      attackType: "light",
      attackStartedTick: 100 - 7,
      attackHit: false,
    };
    state.bot = {
      ...state.bot,
      x: botX,
      z: botZ,
      yaw: Math.PI,
      action: "idle",
      staggerUntilTick: 250,
    };
    return state;
  };
  const input = (yaw) => ({ x: 0, y: 0, buttons: 0, pressed: 0, released: 0, yaw, lockOn: false, directional: true });

  const front = stepCombat(makePlayerAttack(0, 1.4, 0), input(0));
  const frontHit = front.events.find((event) => event.type === "hit" && event.target === "bot");
  assert.equal(frontHit?.directionZone, "front");
  assert.equal(frontHit?.damageMultiplier, 1);

  const rear = stepCombat(makePlayerAttack(0, -1.4, Math.PI), input(Math.PI));
  const rearHit = rear.events.find((event) => event.type === "hit" && event.target === "bot");
  assert.equal(rearHit?.directionZone, "rear");
  assert.equal(rearHit?.damageMultiplier, 1.35);
  assert.ok(rearHit.damage > frontHit.damage);

  const outsideCone = stepCombat(makePlayerAttack(1.4, 0, 0), input(0));
  assert.ok(outsideCone.events.some((event) => event.type === "whiff"));
  assert.equal(outsideCone.state.bot.hp, makePlayerAttack(1.4, 0, 0).bot.hp);
});

test("a shield only blocks from the defender's front arc", () => {
  const incomingHit = (attackerX, attackerZ, playerYaw) => {
    const state = createCombatState(138, "easy");
    state.tick = 100;
    state.player = {
      ...state.player,
      x: 0,
      z: 0,
      yaw: playerYaw,
      action: "block",
      actionUntilTick: 200,
      blockStartedTick: 0,
    };
    const bot = { ...state.bot, x: attackerX, z: attackerZ, action: "windup", actionUntilTick: 200 };
    bot.yaw = yawToward(bot, state.player);
    bot.attackType = "light";
    bot.attackStartedTick = 101 - getBotAttackWindupTicks("easy");
    bot.attackHit = false;
    bot.staggerUntilTick = 250;
    state.bot = bot;
    return stepCombat(state, {
      x: 0,
      y: 0,
      buttons: INPUT_BUTTON.block,
      pressed: 0,
      released: 0,
      yaw: playerYaw,
      lockOn: false,
      directional: true,
    });
  };

  const front = incomingHit(0, 1, 0);
  assert.ok(front.events.some((event) => event.type === "block" && event.damage === 0));
  assert.equal(front.state.player.hp, 150);

  const back = incomingHit(0, -1, 0);
  const backHit = back.events.find((event) => event.type === "hit" && event.target === "player");
  assert.equal(backHit?.directionZone, "rear");
  assert.equal(backHit?.damageMultiplier, 1.35);
  assert.ok(back.state.player.hp < 150);
});

test("the circular duel boundary clamps position and cancels outward velocity", () => {
  const actor = { x: 10, z: 8, vx: 4, vz: 4 };
  constrainActorToArena(actor);
  const radialX = actor.x;
  const radialZ = actor.z - DUEL_ARENA_CENTER_Z;
  assert.ok(Math.hypot(radialX, radialZ) <= DUEL_ARENA_RADIUS + 1e-9);
  assert.ok(actor.vx * radialX + actor.vz * radialZ <= 1e-8);
});
