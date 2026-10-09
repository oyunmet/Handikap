export const COMBAT_HZ = 60;
export const MAX_DUEL_TICKS = 5_400;
export const INPUT_BUTTON = {
  attack: 1,
  block: 2,
  dodge: 4,
  skillOne: 8,
  skillTwo: 16,
} as const;
export const MAX_INPUT_BUTTONS = 31;

export type CombatDifficulty = "easy" | "medium" | "hard";
export type CombatSide = "player" | "bot";
export type CombatAction =
  | "idle"
  | "walk"
  | "attack"
  | "heavyAttack"
  | "block"
  | "dodge"
  | "hit"
  | "skillOne"
  | "skillTwo"
  | "die";
export type CombatAttack = "light" | "heavy" | "skillOne" | "skillTwo";

export type CombatActor = {
  x: number;
  z: number;
  vx: number;
  vz: number;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  action: CombatAction;
  actionUntilTick: number;
  staggerUntilTick: number;
  invulnerableUntilTick: number;
  blockStartedTick: number;
  attackType: CombatAttack | null;
  attackStartedTick: number;
  attackHit: boolean;
  attackCooldownUntilTick: number;
  chargeStartedTick: number;
  skillOneCooldownUntilTick: number;
  skillTwoCooldownUntilTick: number;
  combo: number;
  comboUntilTick: number;
  lastDamage: number;
};

export type CombatState = {
  tick: number;
  seed: number;
  rngState: number;
  difficulty: CombatDifficulty;
  player: CombatActor;
  bot: CombatActor;
  ended: boolean;
  verdict: "victory" | "defeat" | "draw" | null;
  lastImpactTick: number;
  lastImpactStrength: number;
};

export type CombatInput = {
  x: number;
  y: number;
  buttons: number;
  pressed: number;
  released: number;
};

export type CombatInputFrame = readonly [
  tick: number,
  x: number,
  y: number,
  buttons: number,
  pressed: number,
  released: number,
];

export type CombatEvent = {
  id: number;
  type: "hit" | "block" | "parry" | "dodge" | "skill" | "knockout";
  target: CombatSide;
  attack?: CombatAttack;
  damage?: number;
  critical?: boolean;
  combo?: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const normalized = (x: number, y: number) => {
  const length = Math.hypot(x, y);
  return length > 1 ? { x: x / length, y: y / length } : { x, y };
};

function makeActor(x: number, z: number, hp: number): CombatActor {
  return {
    x,
    z,
    vx: 0,
    vz: 0,
    hp,
    maxHp: hp,
    stamina: 100,
    maxStamina: 100,
    action: "idle",
    actionUntilTick: 0,
    staggerUntilTick: 0,
    invulnerableUntilTick: 0,
    blockStartedTick: -10_000,
    attackType: null,
    attackStartedTick: -10_000,
    attackHit: false,
    attackCooldownUntilTick: 0,
    chargeStartedTick: -1,
    skillOneCooldownUntilTick: 0,
    skillTwoCooldownUntilTick: 0,
    combo: 0,
    comboUntilTick: 0,
    lastDamage: 0,
  };
}

export function createCombatState(seed: number, difficulty: CombatDifficulty = "easy"): CombatState {
  const cleanSeed = (Number.isSafeInteger(seed) ? seed : 1) >>> 0 || 1;
  return {
    tick: 0,
    seed: cleanSeed,
    rngState: cleanSeed,
    difficulty,
    player: makeActor(-1.15, 0.15, 150),
    bot: makeActor(1.15, -1.45, difficulty === "hard" ? 160 : difficulty === "medium" ? 145 : 130),
    ended: false,
    verdict: null,
    lastImpactTick: -10_000,
    lastImpactStrength: 0,
  };
}

function random(state: CombatState) {
  state.rngState = (state.rngState + 0x6d2b79f5) | 0;
  let mixed = state.rngState;
  mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
  return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
}

function setAction(actor: CombatActor, action: CombatAction, tick: number, duration: number) {
  actor.action = action;
  actor.actionUntilTick = tick + duration;
}

function distanceBetween(left: CombatActor, right: CombatActor) {
  return Math.hypot(left.x - right.x, left.z - right.z);
}

function startAttack(
  state: CombatState,
  actor: CombatActor,
  attack: CombatAttack,
  tick: number,
  events: CombatEvent[],
  side: CombatSide,
) {
  if (tick < actor.staggerUntilTick || tick < actor.attackCooldownUntilTick || actor.stamina <= 0) return false;
  const cost = attack === "light" ? 9 : attack === "heavy" ? 23 : attack === "skillOne" ? 24 : 30;
  if (actor.stamina < cost) return false;
  actor.stamina = Math.max(0, actor.stamina - cost);
  actor.attackType = attack;
  actor.attackStartedTick = tick;
  actor.attackHit = false;
  actor.chargeStartedTick = -1;
  actor.attackCooldownUntilTick = tick + (attack === "light" ? 27 : attack === "heavy" ? 48 : attack === "skillOne" ? 54 : 72);
  const duration = attack === "light" ? 25 : attack === "heavy" ? 42 : attack === "skillOne" ? 36 : 48;
  setAction(actor, attack === "light" ? "attack" : attack === "heavy" ? "heavyAttack" : attack, tick, duration);
  if (attack === "skillOne" || attack === "skillTwo") {
    events.push({ id: tick * 4 + (side === "player" ? 1 : 2), type: "skill", target: side, attack });
  }
  return true;
}

function chooseBotIntent(state: CombatState, tick: number, events: CombatEvent[]) {
  const bot = state.bot;
  const player = state.player;
  const gap = distanceBetween(bot, player);
  const difficulty = state.difficulty;
  const accuracy = difficulty === "easy" ? 0.58 : difficulty === "medium" ? 0.78 : 0.92;
  const retreat = difficulty === "easy" ? 0 : difficulty === "medium" ? 0.18 : 0.3;
  const attackRange = 2.15;
  let move = normalized(player.x - bot.x, player.z - bot.z);
  let buttons = 0;

  if (tick < bot.staggerUntilTick || bot.hp <= 0) return { x: 0, y: 0, buttons };

  if (tick >= bot.actionUntilTick && tick >= bot.attackCooldownUntilTick && gap <= 3.1) {
    const roll = random(state);
    const playerThreat = player.attackType !== null && !player.attackHit
      && tick - player.attackStartedTick >= (player.attackType === "heavy" ? 14 : 8);
    if (playerThreat && roll > accuracy - 0.34 && bot.stamina >= 18) {
      const dodge = roll > 0.78 && difficulty !== "easy";
      if (dodge) {
        bot.stamina -= 18;
        bot.invulnerableUntilTick = tick + 15;
        bot.vx = -move.x * 7.5;
        bot.vz = -move.y * 7.5;
        bot.staggerUntilTick = tick + 18;
        setAction(bot, "dodge", tick, 18);
        events.push({ id: tick * 4 + 3, type: "dodge", target: "bot" });
      } else {
        bot.blockStartedTick = tick;
        buttons |= INPUT_BUTTON.block;
        setAction(bot, "block", tick, 30);
      }
    } else if (gap <= attackRange && roll < accuracy) {
      const heavy = difficulty !== "easy" && random(state) > 0.72 && bot.stamina >= 25;
      startAttack(state, bot, heavy ? "heavy" : "light", tick, events, "bot");
    }
  }

  if (gap < 1.25 && random(state) < retreat) {
    move = { x: -move.x, y: -move.y };
  } else if (gap <= attackRange * 0.88) {
    move = { x: 0, y: 0 };
  }
  return { x: move.x, y: move.y, buttons };
}

function applyDamage(
  state: CombatState,
  attacker: CombatActor,
  target: CombatActor,
  targetSide: CombatSide,
  attack: CombatAttack,
  tick: number,
  events: CombatEvent[],
) {
  const gap = distanceBetween(attacker, target);
  const baseDamage = attack === "light" ? 17 : attack === "heavy" ? 29 : attack === "skillOne" ? 28 : 36;
  const reach = attack === "light" ? 2.35 : attack === "heavy" ? 2.8 : attack === "skillOne" ? 4.8 : 3.7;
  if (gap > reach || target.hp <= 0) return;

  if (tick < target.invulnerableUntilTick) {
    events.push({ id: tick * 4 + 2, type: "dodge", target: targetSide, attack });
    return;
  }

  const blocking = target.action === "block" && tick < target.actionUntilTick && target.stamina > 0;
  if (blocking) {
    const parry = tick - target.blockStartedTick <= 10;
    target.stamina = Math.max(0, target.stamina - (parry ? 5 : 12));
    attacker.attackHit = true;
    attacker.attackType = null;
    if (parry) {
      attacker.staggerUntilTick = tick + 39;
      setAction(attacker, "hit", tick, 18);
      events.push({ id: tick * 4 + 1, type: "parry", target: targetSide, attack });
      state.lastImpactStrength = 1;
    } else {
      events.push({ id: tick * 4 + 1, type: "block", target: targetSide, attack, damage: 0 });
      state.lastImpactStrength = 0.55;
    }
    state.lastImpactTick = tick;
    return;
  }

  const critical = random(state) < 0.12;
  let multiplier = 1;
  if (attack === "light" && targetSide === "bot") {
    attacker.combo = tick <= attacker.comboUntilTick ? Math.min(3, attacker.combo + 1) : 1;
    attacker.comboUntilTick = tick + 75;
    multiplier = attacker.combo === 2 ? 1.08 : attacker.combo >= 3 ? 1.2 : 1;
  }
  const damage = Math.max(1, Math.round(baseDamage * multiplier * (critical ? 1.5 : 1)));
  target.hp = Math.max(0, target.hp - damage);
  target.lastDamage = damage;
  target.staggerUntilTick = tick + (attack === "heavy" ? 21 : 13);
  setAction(target, target.hp === 0 ? "die" : "hit", tick, target.hp === 0 ? 90 : 17);
  attacker.attackHit = true;
  attacker.attackType = null;
  events.push({
    id: tick * 4 + (targetSide === "player" ? 1 : 2),
    type: target.hp === 0 ? "knockout" : "hit",
    target: targetSide,
    attack,
    damage,
    critical,
    combo: targetSide === "bot" ? attacker.combo : undefined,
  });
  state.lastImpactTick = tick;
  state.lastImpactStrength = attack === "heavy" || critical ? 1 : 0.7;
}

function moveActor(actor: CombatActor, x: number, y: number, tick: number, blocking: boolean) {
  const direction = normalized(x, y);
  const exhausted = actor.stamina <= 1;
  const speed = exhausted ? 2.1 : blocking ? 2.65 : 4.5;
  const canMove = tick >= actor.staggerUntilTick && actor.hp > 0;
  const targetX = canMove ? direction.x * speed : 0;
  const targetZ = canMove ? direction.y * speed : 0;
  actor.vx += (targetX - actor.vx) * 0.24;
  actor.vz += (targetZ - actor.vz) * 0.24;
  actor.x = clamp(actor.x + actor.vx / COMBAT_HZ, -3.45, 3.45);
  actor.z = clamp(actor.z + actor.vz / COMBAT_HZ, -2.15, 2.15);
  if (Math.abs(actor.vx) < 0.08) actor.vx = 0;
  if (Math.abs(actor.vz) < 0.08) actor.vz = 0;
}

export function stepCombat(state: CombatState, input: CombatInput): { state: CombatState; events: CombatEvent[] } {
  if (state.ended) return { state, events: [] };
  const next: CombatState = {
    ...state,
    tick: state.tick + 1,
    player: { ...state.player },
    bot: { ...state.bot },
    lastImpactStrength: state.tick - state.lastImpactTick > 9 ? 0 : state.lastImpactStrength,
  };
  const tick = next.tick;
  const events: CombatEvent[] = [];
  const player = next.player;
  const bot = next.bot;
  const botInput = chooseBotIntent(next, tick, events);
  const buttons = input.buttons & MAX_INPUT_BUTTONS;
  const playerBlockHeld = Boolean(buttons & INPUT_BUTTON.block);

  if (input.pressed & INPUT_BUTTON.attack) player.chargeStartedTick = tick;
  if (buttons & INPUT_BUTTON.attack && player.chargeStartedTick >= 0 && tick - player.chargeStartedTick >= 30) {
    player.action = "heavyAttack";
  }
  if (input.released & INPUT_BUTTON.attack) {
    const charge = player.chargeStartedTick < 0 ? 0 : tick - player.chargeStartedTick;
    startAttack(next, player, charge >= 30 ? "heavy" : "light", tick, events, "player");
  }

  if (playerBlockHeld && tick >= player.staggerUntilTick && player.action !== "attack" && player.action !== "heavyAttack") {
    if (!(state.player.action === "block" && state.tick < state.player.actionUntilTick)) player.blockStartedTick = tick;
    player.action = "block";
    player.actionUntilTick = tick + 2;
    player.stamina = Math.max(0, player.stamina - 0.075);
  }
  if ((input.released & INPUT_BUTTON.block) && player.action === "block") {
    player.action = "idle";
    player.actionUntilTick = tick;
  }

  if (input.pressed & INPUT_BUTTON.dodge && tick >= player.staggerUntilTick && player.stamina >= 20) {
    const direction = normalized(input.x, input.y);
    const away = distanceBetween(player, bot) < 0.001
      ? { x: -1, y: 0 }
      : normalized(player.x - bot.x, player.z - bot.z);
    const impulse = Math.hypot(direction.x, direction.y) > 0.1 ? direction : away;
    player.stamina = Math.max(0, player.stamina - 20);
    player.vx = impulse.x * 8.2;
    player.vz = impulse.y * 8.2;
    player.invulnerableUntilTick = tick + 16;
    setAction(player, "dodge", tick, 18);
    events.push({ id: tick * 4 + 1, type: "dodge", target: "player" });
  }

  if ((input.pressed & INPUT_BUTTON.skillOne) && tick >= player.skillOneCooldownUntilTick && player.stamina >= 24) {
    if (startAttack(next, player, "skillOne", tick, events, "player")) player.skillOneCooldownUntilTick = tick + 240;
  }
  if ((input.pressed & INPUT_BUTTON.skillTwo) && tick >= player.skillTwoCooldownUntilTick && player.stamina >= 30) {
    if (startAttack(next, player, "skillTwo", tick, events, "player")) player.skillTwoCooldownUntilTick = tick + 360;
  }

  moveActor(player, input.x / 100, input.y / 100, tick, playerBlockHeld);
  moveActor(bot, botInput.x, botInput.y, tick, Boolean(botInput.buttons & INPUT_BUTTON.block));
  player.stamina = Math.min(player.maxStamina, player.stamina + 0.17);
  bot.stamina = Math.min(bot.maxStamina, bot.stamina + 0.14);

  for (const [attacker, target, targetSide] of [
    [player, bot, "bot"],
    [bot, player, "player"],
  ] as const) {
    if (!attacker.attackType || attacker.attackHit) continue;
    const attack = attacker.attackType;
    const windup = attack === "light" ? 8 : attack === "heavy" ? 15 : attack === "skillOne" ? 12 : 18;
    if (tick >= attacker.attackStartedTick + windup) {
      if (attack === "skillTwo") {
        const targetGap = distanceBetween(attacker, target);
        if (targetGap <= 3.7) {
          applyDamage(next, attacker, target, targetSide, attack, tick, events);
        } else {
          attacker.attackHit = true;
          attacker.attackType = null;
        }
      } else {
        applyDamage(next, attacker, target, targetSide, attack, tick, events);
      }
    }
    if (attacker.attackType && tick > attacker.attackStartedTick + windup + 9) {
      attacker.attackHit = true;
      attacker.attackType = null;
    }
  }

  for (const actor of [player, bot]) {
    if (actor.hp <= 0) {
      actor.action = "die";
      continue;
    }
    if (actor.action === "block" && tick >= actor.actionUntilTick) {
      actor.action = "idle";
    } else if (tick >= actor.actionUntilTick) {
      actor.action = Math.hypot(actor.vx, actor.vz) > 0.28 ? "walk" : "idle";
    }
    if (actor.stamina < actor.maxStamina && actor.action !== "block") {
      actor.stamina = Math.min(actor.maxStamina, actor.stamina + 0.08);
    }
  }

  if (player.hp <= 0 || bot.hp <= 0) {
    next.ended = true;
    next.verdict = player.hp <= 0 && bot.hp <= 0 ? "draw" : bot.hp <= 0 ? "victory" : "defeat";
    events.push({ id: tick * 4 + 3, type: "knockout", target: bot.hp <= 0 ? "bot" : "player" });
  } else if (tick >= MAX_DUEL_TICKS) {
    next.ended = true;
    next.verdict = "draw";
  }
  return { state: next, events };
}

export function replayCombat(
  seed: number,
  difficulty: CombatDifficulty,
  inputLog: readonly CombatInputFrame[],
) {
  let state = createCombatState(seed, difficulty);
  let frameIndex = 0;
  let held: CombatInput = { x: 0, y: 0, buttons: 0, pressed: 0, released: 0 };
  if (inputLog[0]?.[0] === 0) {
    const initial = inputLog[0];
    held = { x: initial[1], y: initial[2], buttons: initial[3], pressed: 0, released: 0 };
    frameIndex = 1;
  }
  while (!state.ended && state.tick < MAX_DUEL_TICKS) {
    const nextTick = state.tick + 1;
    let pressed = 0;
    let released = 0;
    while (frameIndex < inputLog.length && inputLog[frameIndex][0] === nextTick) {
      const frame = inputLog[frameIndex];
      held = { x: frame[1], y: frame[2], buttons: frame[3], pressed: frame[4], released: frame[5] };
      pressed |= frame[4];
      released |= frame[5];
      frameIndex += 1;
    }
    const result = stepCombat(state, { ...held, pressed, released });
    state = result.state;
  }
  return { state, consumedFrames: frameIndex };
}
