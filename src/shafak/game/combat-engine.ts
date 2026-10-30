import type { PlayerCombatModifiers } from "./store-types.ts";
import { DEFAULT_COMBAT_ITEM_COUNTS, isCombatQuickSlotId, type CombatItemCounts, type CombatItemId, type CombatQuickSlots } from "./combat-items.ts";
import { getStoreItem } from "./store-catalog.ts";
import { getWeaponAmmoItemId, getWeaponDefinition } from "./weapons.ts";

export const COMBAT_HZ = 60;
export const MAX_DUEL_TICKS = 5_400;
export const COMBAT_ARENA_CENTER_Z = -0.6;
export const COMBAT_ARENA_RADIUS = 9;
export const COMBAT_ARENA_ACTOR_LIMIT = 7.2;
const DUEL_AIM_LOCK_RANGE = COMBAT_ARENA_ACTOR_LIMIT * 2 + 0.5;
export const COMBAT_DODGE_DURATION_TICKS = Math.round(COMBAT_HZ * 0.25);
export const COMBAT_DODGE_DISTANCE_METERS = 3;
export const DUEL_COVERS = [
  { x: -6.35, z: COMBAT_ARENA_CENTER_Z, halfWidth: 0.38, halfDepth: 0.92 },
  { x: 6.35, z: COMBAT_ARENA_CENTER_Z, halfWidth: 0.38, halfDepth: 0.92 },
] as const;
export const COMBO_CHAIN_WINDOW_TICKS = 78;
export const PERFECT_BLOCK_WINDOW_TICKS = 12;
export const INPUT_BUTTON = {
  attack: 1,
  block: 2,
  dodge: 4,
  skillOne: 8,
  skillTwo: 16,
  quickSlotOne: 32,
  quickSlotTwo: 64,
  quickSlotThree: 128,
  quickSlotFour: 256,
  weaponSwitch: 512,
  aim: 1_024,
  crouch: 2_048,
  jump: 4_096,
} as const;
export const MAX_INPUT_BUTTONS = 8_191;

export type CombatDifficulty = "easy" | "medium" | "hard";
export const COMBAT_BOT_ARCHETYPES = [
  "gate-warden",
  "iron-oath",
  "ash-archer",
  "shadow-knight",
  "storm-lancer",
  "rift-berserker",
  "ember-alchemist",
  "venom-assassin",
  "frost-hunter",
  "chapter-boss",
] as const;
export type CombatBotArchetype = typeof COMBAT_BOT_ARCHETYPES[number];
export type CombatSide = "player" | "bot";

export function isCombatBotArchetype(value: unknown): value is CombatBotArchetype {
  return typeof value === "string" && COMBAT_BOT_ARCHETYPES.some((archetype) => archetype === value);
}
export type CombatAction =
  | "idle"
  | "walk"
  | "attack"
  | "heavyAttack"
  | "windup"
  | "block"
  | "dodge"
  | "backflip"
  | "hit"
  | "skillOne"
  | "skillTwo"
  | "jump"
  | "plunge"
  | "die";
export type CombatAttack = "light" | "heavy" | "skillOne" | "skillTwo";
type CombatWeaponStyle = NonNullable<ReturnType<typeof getStoreItem>>["visual"]["weaponStyle"];

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
  comboChainStep: number;
  comboChainUntilTick: number;
  attackComboStep: number;
  lastDamage: number;
  quickSlotCooldownUntilTick: number[];
  poisonUntilTick: number;
  poisonNextTick: number;
  burnUntilTick: number;
  burnNextTick: number;
  isAiming: boolean;
  isCrouching: boolean;
  jumpStartedTick: number;
  jumpUntilTick: number;
  lastDodgeTick: number;
  lastDodgeWasRetreat: boolean;
  dodgeDirectionX: number;
  dodgeDirectionZ: number;
  attackWeaponId: string | null;
  attackIsRanged: boolean;
  attackWasPlunge: boolean;
};

export type CombatLoadout = {
  quickSlots: CombatQuickSlots;
  itemCounts: CombatItemCounts;
  weaponIds: [string, string | null];
  weaponStats: [PlayerCombatModifiers, PlayerCombatModifiers];
};

export type CombatOpponentTuning = {
  rivalLevel: number;
  progressPercent: number;
  isElite: boolean;
  statMultiplier: number;
};

export type CombatState = {
  tick: number;
  seed: number;
  rngState: number;
  difficulty: CombatDifficulty;
  botArchetype: CombatBotArchetype;
  opponentTuning: CombatOpponentTuning;
  highestDamage: number;
  maxCombo: number;
  playerStats: PlayerCombatModifiers;
  weaponStats: [PlayerCombatModifiers, PlayerCombatModifiers];
  weaponIds: [string, string | null];
  activeWeaponSlot: 0 | 1;
  quickSlotItemIds: CombatQuickSlots;
  combatItemCounts: CombatItemCounts;
  weaponSwapCooldownUntilTick: number;
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
  type: "hit" | "block" | "parry" | "dodge" | "backflip" | "plungeLand" | "skill" | "knockout" | "item" | "poison" | "burn" | "weaponSwitch" | "weaponTrail" | "projectile" | "coverBlock" | "ammoEmpty";
  target: CombatSide;
  attack?: CombatAttack;
  damage?: number;
  critical?: boolean;
  combo?: number;
  itemId?: CombatItemId;
  weaponId?: string;
  from?: CombatSide;
  originX?: number;
  originZ?: number;
  destinationX?: number;
  destinationZ?: number;
  plunge?: boolean;
  edgeRebound?: boolean;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export const DEFAULT_PLAYER_COMBAT_MODIFIERS: PlayerCombatModifiers = {
  maxHealth: 150,
  maxStamina: 100,
  damageMultiplier: 1,
  defenseReduction: 0,
  criticalChance: 0.12,
  criticalDamageMultiplier: 1.5,
  dodgeWindowMultiplier: 1,
  moveSpeedMultiplier: 1,
  attackSpeedMultiplier: 1,
  attackRangeBonus: 0,
};

export function normalizePlayerCombatModifiers(value: unknown): PlayerCombatModifiers {
  const source = value && typeof value === "object" ? value as Partial<PlayerCombatModifiers> : {};
  return {
    maxHealth: clamp(finiteOr(source.maxHealth, 150), 130, 175),
    maxStamina: clamp(finiteOr(source.maxStamina, 100), 80, 130),
  damageMultiplier: clamp(finiteOr(source.damageMultiplier, 1), 0.82, 1.75),
    defenseReduction: clamp(finiteOr(source.defenseReduction, 0), 0, 0.24),
    criticalChance: clamp(finiteOr(source.criticalChance, 0.12), 0.08, 0.28),
    criticalDamageMultiplier: clamp(finiteOr(source.criticalDamageMultiplier, 1.5), 1.5, 2),
    dodgeWindowMultiplier: clamp(finiteOr(source.dodgeWindowMultiplier, 1), 1, 1.25),
    moveSpeedMultiplier: clamp(finiteOr(source.moveSpeedMultiplier, 1), 0.88, 1.14),
    attackSpeedMultiplier: clamp(finiteOr(source.attackSpeedMultiplier, 1), 0.8, 1.22),
    attackRangeBonus: clamp(finiteOr(source.attackRangeBonus, 0), -0.3, 0.8),
  };
}

export function createCombatOpponentTuning(
  rivalLevel: number,
  progressPercent: number,
  isElite = false,
): CombatOpponentTuning {
  const safeLevel = clamp(Math.floor(finiteOr(rivalLevel, 1)), 1, 1_000);
  const safeProgress = clamp(finiteOr(progressPercent, 0), 0, 100);
  const levelSteps = Math.min(10, Math.max(0, safeLevel - 1) / 10);
  const levelFactor = 1 + 0.12 * levelSteps;
  const progressFactor = 1 + 0.05 * (safeProgress / 10);
  return {
    rivalLevel: safeLevel,
    progressPercent: safeProgress,
    isElite,
    statMultiplier: clamp(levelFactor * progressFactor * (isElite ? 1.12 : 1), 1, 2.8),
  };
}

function finiteOr(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
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
    comboChainStep: 0,
    comboChainUntilTick: 0,
    attackComboStep: 0,
    lastDamage: 0,
    quickSlotCooldownUntilTick: [0, 0, 0, 0],
    poisonUntilTick: 0,
    poisonNextTick: 0,
    burnUntilTick: 0,
    burnNextTick: 0,
    isAiming: false,
    isCrouching: false,
    jumpStartedTick: -10_000,
    jumpUntilTick: 0,
    lastDodgeTick: -10_000,
    lastDodgeWasRetreat: false,
    dodgeDirectionX: 0,
    dodgeDirectionZ: 0,
    attackWeaponId: null,
    attackIsRanged: false,
    attackWasPlunge: false,
  };
}

export function createCombatState(
  seed: number,
  difficulty: CombatDifficulty = "easy",
  playerStats: PlayerCombatModifiers = DEFAULT_PLAYER_COMBAT_MODIFIERS,
  loadout?: CombatLoadout,
  botArchetype: CombatBotArchetype = "gate-warden",
  opponentTuning: CombatOpponentTuning = createCombatOpponentTuning(1, 0),
): CombatState {
  const cleanSeed = (Number.isSafeInteger(seed) ? seed : 1) >>> 0 || 1;
  const normalizedStats = normalizePlayerCombatModifiers(playerStats);
  const tuning = createCombatOpponentTuning(
    opponentTuning.rivalLevel,
    opponentTuning.progressPercent,
    opponentTuning.isElite,
  );
  const botBaseHealth = difficulty === "hard" ? 160 : difficulty === "medium" ? 145 : 200;
  const botHealth = Math.round(botBaseHealth * tuning.statMultiplier * (botArchetype === "chapter-boss" ? 1.7 : 1));
  return {
    tick: 0,
    seed: cleanSeed,
    rngState: cleanSeed,
    difficulty,
    botArchetype,
    opponentTuning: tuning,
    highestDamage: 0,
    maxCombo: 0,
    playerStats: normalizedStats,
    weaponStats: loadout?.weaponStats ?? [normalizedStats, normalizedStats],
    weaponIds: loadout?.weaponIds ?? ["weapon_ash_sword", null],
    activeWeaponSlot: 0,
    quickSlotItemIds: loadout?.quickSlots ?? [null, null, null, null],
    combatItemCounts: loadout?.itemCounts ?? { ...DEFAULT_COMBAT_ITEM_COUNTS },
    weaponSwapCooldownUntilTick: 0,
    player: {
      ...makeActor(-3, COMBAT_ARENA_CENTER_Z, normalizedStats.maxHealth),
      stamina: normalizedStats.maxStamina,
      maxStamina: normalizedStats.maxStamina,
    },
    bot: makeActor(3, COMBAT_ARENA_CENTER_Z, botHealth),
    ended: false,
    verdict: null,
    lastImpactTick: -10_000,
    lastImpactStrength: 0,
  };
}

const QUICK_SLOT_BUTTONS = [
  INPUT_BUTTON.quickSlotOne,
  INPUT_BUTTON.quickSlotTwo,
  INPUT_BUTTON.quickSlotThree,
  INPUT_BUTTON.quickSlotFour,
] as const;

function useCombatItem(state: CombatState, slotIndex: number, tick: number, events: CombatEvent[]) {
  const itemId = state.quickSlotItemIds[slotIndex];
  if (!itemId || !isCombatQuickSlotId(itemId) || state.combatItemCounts[itemId] <= 0) return;
  const player = state.player;
  if (tick < player.quickSlotCooldownUntilTick[slotIndex]) return;

  const target = state.bot;
  const gap = distanceBetween(player, target);
  let used = false;
  let eventTarget: CombatSide = "player";
  let damage = 0;

  if (itemId === "health_potion") {
    if (player.hp >= player.maxHp) return;
    player.hp = Math.min(player.maxHp, player.hp + 44);
    used = true;
  } else if (itemId === "stamina_potion") {
    if (player.stamina >= player.maxStamina) return;
    player.stamina = Math.min(player.maxStamina, player.stamina + 45);
    used = true;
  } else if (itemId === "smoke_bomb") {
    player.invulnerableUntilTick = Math.max(player.invulnerableUntilTick, tick + 55);
    used = true;
  } else {
    const maximumRange = itemId === "throwing_knife" ? 6.8 : 5.6;
    if (gap > maximumRange || target.hp <= 0) return;
    eventTarget = "bot";
    used = true;
    if (itemId === "venom_vial") {
      target.poisonUntilTick = Math.max(target.poisonUntilTick, tick + 180);
      target.poisonNextTick = Math.max(target.poisonNextTick, tick + 30);
    } else {
      const rawDamage = itemId === "explosive_flask" ? 19 : 13;
      const blocking = target.action === "block" && tick < target.actionUntilTick && target.stamina > 0;
      if (tick >= target.invulnerableUntilTick && !blocking) {
        damage = rawDamage;
        target.hp = Math.max(0, target.hp - damage);
        target.lastDamage = damage;
        target.staggerUntilTick = tick + 15;
        setAction(target, target.hp === 0 ? "die" : "hit", tick, target.hp === 0 ? 90 : 17);
      } else if (blocking) {
        target.stamina = Math.max(0, target.stamina - 8);
      }
    }
  }

  if (!used) return;
  state.combatItemCounts[itemId] -= 1;
  if (state.combatItemCounts[itemId] <= 0) state.quickSlotItemIds[slotIndex] = null;
  player.quickSlotCooldownUntilTick[slotIndex] = tick + (
    itemId === "health_potion" ? 720
      : itemId === "stamina_potion" ? 600
        : itemId === "venom_vial" ? 1_080
          : itemId === "throwing_knife" ? 480
            : itemId === "explosive_flask" ? 840
              : 960
  );
  events.push({
    id: tick * 100 + 40 + slotIndex,
    type: "item",
    target: eventTarget,
    itemId,
    damage,
  });
}

function stepPoison(actor: CombatActor, side: CombatSide, tick: number, events: CombatEvent[]) {
  if (tick > actor.poisonUntilTick || tick < actor.poisonNextTick || actor.hp <= 0) return;
  actor.poisonNextTick = tick + 30;
  const damage = Math.min(2, actor.hp);
  actor.hp = Math.max(0, actor.hp - damage);
  actor.lastDamage = damage;
  if (actor.hp === 0) setAction(actor, "die", tick, 90);
  events.push({ id: tick * 100 + 90, type: "poison", target: side, damage });
}

function stepBurn(actor: CombatActor, side: CombatSide, tick: number, events: CombatEvent[]) {
  if (tick > actor.burnUntilTick || tick < actor.burnNextTick || actor.hp <= 0) return;
  actor.burnNextTick = tick + 30;
  const damage = Math.min(2, actor.hp);
  actor.hp = Math.max(0, actor.hp - damage);
  actor.lastDamage = damage;
  if (actor.hp === 0) setAction(actor, "die", tick, 90);
  events.push({ id: tick * 100 + 92, type: "burn", target: side, damage });
}

export function isCombatBotEnraged(bot: Pick<CombatActor, "hp" | "maxHp">) {
  return bot.hp > 0 && bot.hp <= bot.maxHp * 0.5;
}

export function getBotAttackWindupTicks(
  difficulty: CombatDifficulty,
  archetype: CombatBotArchetype = "gate-warden",
  enraged = false,
) {
  const baseline = difficulty === "easy" ? 42 : difficulty === "medium" ? 36 : 30;
  const archetypeDelay = archetype === "gate-warden" ? 5
    : archetype === "rift-berserker" || archetype === "chapter-boss" ? 8
      : archetype === "ash-archer" ? -3
        : archetype === "storm-lancer" || archetype === "frost-hunter" ? 2
          : archetype === "venom-assassin" || archetype === "shadow-knight" ? -6 : 0;
  return Math.max(18, baseline + archetypeDelay - (enraged ? 6 : 0));
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

function getWeaponStyle(weaponId: string | null): CombatWeaponStyle {
  return getWeaponDefinition(weaponId)?.visual.weaponStyle
    ?? getStoreItem(weaponId)?.visual.weaponStyle
    ?? "sword";
}

function getBotWeaponStyle(archetype: CombatBotArchetype): CombatWeaponStyle {
  return archetype === "gate-warden" ? "greatsword"
    : archetype === "iron-oath" ? "mace"
      : archetype === "ash-archer" || archetype === "frost-hunter" ? "bow"
        : archetype === "storm-lancer" ? "spear"
          : archetype === "rift-berserker" ? "axe"
            : archetype === "ember-alchemist" ? "mace"
              : archetype === "chapter-boss" ? "greatsword" : "daggers";
}

function getAttackWeaponStyle(state: CombatState, actor: CombatActor): CombatWeaponStyle {
  return actor === state.player
    ? getWeaponStyle(actor.attackWeaponId ?? state.weaponIds[state.activeWeaponSlot])
    : getBotWeaponStyle(state.botArchetype);
}

function segmentCrossesCover(from: CombatActor, to: CombatActor) {
  for (const cover of DUEL_COVERS) {
    const minX = cover.x - cover.halfWidth;
    const maxX = cover.x + cover.halfWidth;
    const minZ = cover.z - cover.halfDepth;
    const maxZ = cover.z + cover.halfDepth;
    let tMin = 0;
    let tMax = 1;
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    for (const [origin, delta, minimum, maximum] of [
      [from.x, dx, minX, maxX],
      [from.z, dz, minZ, maxZ],
    ] as const) {
      if (Math.abs(delta) < 1e-8) {
        if (origin < minimum || origin > maximum) {
          tMin = 2;
          break;
        }
        continue;
      }
      const first = (minimum - origin) / delta;
      const second = (maximum - origin) / delta;
      tMin = Math.max(tMin, Math.min(first, second));
      tMax = Math.min(tMax, Math.max(first, second));
    }
    if (tMin <= tMax && tMax >= 0 && tMin <= 1) return true;
  }
  return false;
}

function resolveActorCoverCollision(actor: CombatActor) {
  const radius = 0.34;
  for (const cover of DUEL_COVERS) {
    const minX = cover.x - cover.halfWidth - radius;
    const maxX = cover.x + cover.halfWidth + radius;
    const minZ = cover.z - cover.halfDepth - radius;
    const maxZ = cover.z + cover.halfDepth + radius;
    if (actor.x <= minX || actor.x >= maxX || actor.z <= minZ || actor.z >= maxZ) continue;
    const distances = [
      { amount: actor.x - minX, apply: () => { actor.x = minX; actor.vx = Math.min(0, actor.vx); } },
      { amount: maxX - actor.x, apply: () => { actor.x = maxX; actor.vx = Math.max(0, actor.vx); } },
      { amount: actor.z - minZ, apply: () => { actor.z = minZ; actor.vz = Math.min(0, actor.vz); } },
      { amount: maxZ - actor.z, apply: () => { actor.z = maxZ; actor.vz = Math.max(0, actor.vz); } },
    ];
    distances.sort((left, right) => left.amount - right.amount);
    distances[0].apply();
  }
}

function distanceBetween(left: CombatActor, right: CombatActor) {
  return Math.hypot(left.x - right.x, left.z - right.z);
}

function resolveCombatActorOverlap(player: CombatActor, rival: CombatActor) {
  const minimumDistance = 1.08;
  const dx = rival.x - player.x;
  const dz = rival.z - player.z;
  const distance = Math.hypot(dx, dz);
  if (distance >= minimumDistance) return;
  const nx = distance > 0.0001 ? dx / distance : 1;
  const nz = distance > 0.0001 ? dz / distance : 0;
  const correction = (minimumDistance - distance) * 0.5;
  player.x -= nx * correction;
  player.z -= nz * correction;
  rival.x += nx * correction;
  rival.z += nz * correction;
}

function startAttack(
  state: CombatState,
  actor: CombatActor,
  attack: CombatAttack,
  tick: number,
  events: CombatEvent[],
  side: CombatSide,
  comboStep = 0,
) {
  if (tick < actor.staggerUntilTick || tick < actor.attackCooldownUntilTick || actor.stamina <= 0) return false;
  const target = side === "player" ? state.bot : state.player;
  const weaponId = side === "player" ? state.weaponIds[state.activeWeaponSlot] : null;
  const weaponDefinition = getWeaponDefinition(weaponId);
  const weaponStyle = side === "player" ? getWeaponStyle(weaponId) : getBotWeaponStyle(state.botArchetype);
  const gap = distanceBetween(actor, target);
  const rangedWeapon = side === "player"
    ? weaponDefinition?.type === "uzak"
    : weaponStyle === "bow";
  const rangedAtCloseRange = rangedWeapon && gap <= 1.85;
  const rangedShot = rangedWeapon
    && !rangedAtCloseRange
    && (attack === "light" || attack === "heavy");
  const ammunitionId = side === "player" ? getWeaponAmmoItemId(weaponId) : null;
  if (rangedShot && side === "player" && !actor.isAiming) return false;
  if (rangedShot && ammunitionId && state.combatItemCounts[ammunitionId] <= 0) {
    events.push({ id: tick * 100 + 41, type: "ammoEmpty", target: "player", weaponId: weaponId ?? undefined });
    return false;
  }
  const closeBowAttack = rangedAtCloseRange && (attack === "light" || attack === "heavy");
  const cost = attack === "light"
    ? closeBowAttack ? 8 : weaponStyle === "daggers" ? 7 : 9
    : attack === "heavy" ? weaponStyle === "axe" ? 27 : 23
      : attack === "skillOne" ? 24 : 30;
  if (actor.stamina < cost) return false;
  actor.stamina = Math.max(0, actor.stamina - cost);
  actor.attackType = attack;
  actor.attackComboStep = comboStep;
  actor.attackStartedTick = tick;
  actor.attackHit = false;
  actor.chargeStartedTick = -1;
  actor.attackWeaponId = weaponId;
  actor.attackIsRanged = rangedShot;
  if (rangedShot && ammunitionId) {
    state.combatItemCounts[ammunitionId] = Math.max(0, state.combatItemCounts[ammunitionId] - 1);
  }
  actor.attackWasPlunge = actor.jumpUntilTick > tick;
  const weaponSpeed = weaponDefinition?.speed ?? (weaponStyle === "daggers" ? 1.28
    : weaponStyle === "axe" || weaponStyle === "mace" ? 0.76
      : weaponStyle === "greatsword" ? 0.82
        : weaponStyle === "bow" ? 0.88
          : weaponStyle === "spear" ? 0.94
            : 1);
  const speed = side === "player" ? state.playerStats.attackSpeedMultiplier * weaponSpeed : 1;
  const botEnraged = side === "bot" && isCombatBotEnraged(actor);
  const botRecoveryBase = state.difficulty === "easy" ? 156 : state.difficulty === "medium" ? 108 : 78;
  const botStyleRecovery = state.botArchetype === "iron-oath" ? 1.12
    : state.botArchetype === "shadow-knight" || state.botArchetype === "venom-assassin" ? 0.74
      : state.botArchetype === "ash-archer" || state.botArchetype === "ember-alchemist" ? 0.92
        : state.botArchetype === "storm-lancer" ? 0.86
          : state.botArchetype === "rift-berserker" || state.botArchetype === "chapter-boss" ? 1.18
            : state.botArchetype === "frost-hunter" ? 1.08 : 1.06;
  const botRecovery = Math.max(38, Math.round(
    botRecoveryBase * botStyleRecovery * (botEnraged ? 0.78 : 1)
      / (1 + Math.min(0.8, Math.max(0, state.opponentTuning.statMultiplier - 1) * 0.45)),
  ));
  actor.attackCooldownUntilTick = tick + Math.max(8, Math.round(
    side === "bot" ? botRecovery : (attack === "light" ? 27 : attack === "heavy" ? 48 : attack === "skillOne" ? 54 : 72) / speed,
  ));
  const duration = Math.max(8, Math.round((rangedShot
    ? 33
    : attack === "light" ? 25 : attack === "heavy" ? 42 : attack === "skillOne" ? 36 : 48) / speed));
  if (side === "bot") {
    setAction(actor, "windup", tick, getBotAttackWindupTicks(state.difficulty, state.botArchetype, botEnraged) + duration);
  } else {
    setAction(actor, actor.attackWasPlunge ? "plunge" : attack === "light" ? "attack" : attack === "heavy" ? "heavyAttack" : attack, tick, duration);
  }
  if (side === "player" && !rangedShot) {
    events.push({
      id: tick * 100 + 38,
      type: "weaponTrail",
      target: side,
      attack,
      weaponId: closeBowAttack ? "weapon_hunting_knife" : weaponId ?? undefined,
      plunge: actor.attackWasPlunge,
      originX: actor.x,
      originZ: actor.z,
      destinationX: (side === "player" ? state.bot : state.player).x,
      destinationZ: (side === "player" ? state.bot : state.player).z,
    });
  }
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
  const enraged = isCombatBotEnraged(bot);
  const archer = state.botArchetype === "ash-archer" || state.botArchetype === "frost-hunter";
  const ironOath = state.botArchetype === "iron-oath";
  const shadowKnight = state.botArchetype === "shadow-knight" || state.botArchetype === "venom-assassin";
  const stormLancer = state.botArchetype === "storm-lancer";
  const berserker = state.botArchetype === "rift-berserker";
  const boss = state.botArchetype === "chapter-boss";
  const baseAttackChance = difficulty === "easy" ? 0.4 : difficulty === "medium" ? 0.66 : 0.88;
  const attackChance = clamp(
    baseAttackChance
      + (archer ? 0.06
        : shadowKnight ? 0.14
          : stormLancer ? 0.04
            : berserker ? 0.12
              : state.botArchetype === "ember-alchemist" ? 0.02
                : boss ? 0.1
                  : ironOath ? -0.08 : 0)
      + (enraged ? 0.16 : 0)
      + Math.min(0.12, Math.max(0, state.opponentTuning.statMultiplier - 1) * 0.12),
    0.2,
    0.98,
  );
  const baseReactionThreshold = difficulty === "easy" ? 0.68 : difficulty === "medium" ? 0.48 : 0.3;
  const reactionThreshold = clamp(
    baseReactionThreshold - (ironOath ? 0.16 : shadowKnight ? 0.1 : boss ? 0.04 : 0) + (enraged ? 0.06 : 0),
    0.12,
    0.82,
  );
  const retreat = berserker ? 0
    : difficulty === "easy" ? 0
      : difficulty === "medium" ? 0.16 : 0.28;
  const attackRange = archer ? 9.25 : stormLancer ? 4.35 : boss ? 3.5 : 2.15;
  const decisionRange = archer ? 9.25 : stormLancer ? 4.45 : boss ? 3.7 : 3.1;
  let move = normalized(player.x - bot.x, player.z - bot.z);
  let buttons = 0;

  if (archer && gap > 1.85 && gap <= attackRange) {
    bot.isAiming = true;
    buttons |= INPUT_BUTTON.aim;
    const desiredRange = state.botArchetype === "frost-hunter" ? 8.1 : 6.4;
    if (gap < desiredRange - 2.1) move = { x: -move.x, y: -move.y };
    else if (gap <= desiredRange + 1.1) move = { x: move.y * 0.28, y: -move.x * 0.28 };
  } else {
    bot.isAiming = false;
  }

  if (stormLancer) {
    if (gap < 2.7) move = { x: -move.x, y: -move.y };
    else if (gap <= 3.65) move = { x: move.y * 0.22, y: -move.x * 0.22 };
  } else if (state.botArchetype === "ember-alchemist" && gap < 1.65) {
    move = { x: -move.x, y: -move.y };
  }

  if (tick < bot.staggerUntilTick || bot.hp <= 0) return { x: 0, y: 0, buttons };

  if (tick >= bot.actionUntilTick && tick >= bot.attackCooldownUntilTick && gap <= decisionRange) {
    const roll = random(state);
    const playerThreat = player.attackType !== null && !player.attackHit
      && tick - player.attackStartedTick >= (player.attackType === "heavy" ? 14 : 8);
    if (playerThreat && roll > reactionThreshold && bot.stamina >= 18) {
      const dodge = shadowKnight
        ? roll > (difficulty === "easy" ? 0.7 : 0.58)
        : boss ? roll > 0.9 && difficulty !== "easy"
          : roll > 0.78 && difficulty !== "easy";
      if (dodge) {
        bot.stamina -= 18;
        bot.invulnerableUntilTick = tick + 15;
        const dodgeDirection = shadowKnight && enraged
          ? { x: player.x - bot.x, y: player.z - bot.z }
          : { x: -move.x, y: -move.y };
        const normalizedDodge = normalized(dodgeDirection.x, dodgeDirection.y);
        const dodgeSpeed = state.botArchetype === "venom-assassin" ? 9.2 : shadowKnight ? 8.6 : 7.5;
        bot.vx = normalizedDodge.x * dodgeSpeed;
        bot.vz = normalizedDodge.y * dodgeSpeed;
        bot.staggerUntilTick = tick + 18;
        setAction(bot, "dodge", tick, 18);
        events.push({ id: tick * 4 + 3, type: "dodge", target: "bot" });
      } else {
        bot.blockStartedTick = tick;
        buttons |= INPUT_BUTTON.block;
        setAction(bot, "block", tick, 30);
      }
    } else if (gap <= attackRange && roll < attackChance) {
      const bossPhaseAttack = boss && enraged && bot.stamina >= 24 && random(state) < 0.3;
      if (bossPhaseAttack && startAttack(state, bot, "skillOne", tick, events, "bot")) {
        return { x: move.x, y: move.y, buttons };
      }
      const heavyChance = state.botArchetype === "gate-warden" ? 0.58
        : ironOath ? 0.42
          : state.botArchetype === "rift-berserker" ? 0.76
            : boss ? 0.68
              : stormLancer ? 0.34
                : shadowKnight ? 0.1 : archer ? 0.24 : 0.2;
      const heavy = (enraged && shadowKnight || difficulty !== "easy")
        && random(state) > 1 - heavyChance
        && bot.stamina >= 25;
      startAttack(state, bot, heavy ? "heavy" : "light", tick, events, "bot");
    }
  }

  if (archer && gap < 3.1) {
    move = { x: -move.x, y: -move.y };
  } else if (stormLancer && gap < 2.7) {
    move = { x: -move.x, y: -move.y };
  } else if (shadowKnight && gap > 2.25 && gap <= 3.2) {
    move = { x: move.x * 0.52, y: move.y * 0.52 };
  } else if (gap < 1.25 && random(state) < retreat) {
    move = { x: -move.x, y: -move.y };
  } else if (!archer && gap <= attackRange * 0.88) {
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
  const playerAttacking = attacker === state.player;
  const weaponDefinition = playerAttacking
    ? getWeaponDefinition(attacker.attackWeaponId ?? state.weaponIds[state.activeWeaponSlot])
    : null;
  const weaponStyle = getAttackWeaponStyle(state, attacker);
  const bowAtCloseRange = weaponDefinition?.type === "uzak" && gap <= 1.85;
  const rangedShot = attacker.attackIsRanged;
  const closeBowAttack = bowAtCloseRange && !rangedShot;
  const botDamageScale = state.botArchetype === "rift-berserker" ? 1.18
    : state.botArchetype === "chapter-boss" ? 1.32
      : state.botArchetype === "iron-oath" || state.botArchetype === "venom-assassin" ? 0.9
        : state.botArchetype === "storm-lancer" ? 1.05 : 1;
  const baseDamage = playerAttacking && weaponDefinition
    ? weaponDefinition.damage * (attack === "light" ? 1 : attack === "heavy" ? 1.55 : attack === "skillOne" ? 1.35 : 1.7)
    : (attack === "light" ? 6 : attack === "heavy" ? 10 : attack === "skillOne" ? 11 : 15)
      * (playerAttacking ? 1 : (state.difficulty === "easy" ? 0.34 : state.difficulty === "medium" ? 0.52 : 0.72) * botDamageScale);
  const styleReach = weaponDefinition?.range ?? (weaponStyle === "daggers" ? 1.95
    : weaponStyle === "axe" || weaponStyle === "mace" ? 2.42
      : weaponStyle === "greatsword" ? 3.12
        : weaponStyle === "spear" ? 4.35
          : weaponStyle === "bow" ? closeBowAttack ? 1.85 : 9.25
            : attack === "light" ? 2.35 : 2.8);
  const reach = rangedShot
    ? weaponDefinition?.range ?? 9.25
    : attack === "skillOne" ? 4.8
      : attack === "skillTwo" ? 3.7
        : styleReach + (attack === "heavy" && weaponStyle !== "spear" ? 0.38 : 0)
    + (playerAttacking ? state.playerStats.attackRangeBonus + (attacker.isAiming && !rangedShot ? 0.18 : 0) : 0);
  if (gap > reach || target.hp <= 0) return;

  if (rangedShot) {
    events.push({
      id: tick * 100 + 36,
      type: "projectile",
      target: targetSide,
      from: playerAttacking ? "player" : "bot",
      attack,
      weaponId: attacker.attackWeaponId ?? undefined,
      originX: attacker.x,
      originZ: attacker.z,
      destinationX: target.x,
      destinationZ: target.z,
    });
    if (segmentCrossesCover(attacker, target)) {
      attacker.attackHit = true;
      attacker.attackType = null;
      events.push({ id: tick * 100 + 37, type: "coverBlock", target: targetSide, from: playerAttacking ? "player" : "bot", attack });
      state.lastImpactTick = tick;
      state.lastImpactStrength = 0.35;
      return;
    }
  }

  if (tick < target.invulnerableUntilTick) {
    if (attacker === state.player) {
      attacker.comboChainStep = 0;
      attacker.comboChainUntilTick = 0;
    }
    events.push({ id: tick * 4 + 2, type: "dodge", target: targetSide, attack });
    return;
  }

  const blocking = target.action === "block" && tick < target.actionUntilTick && target.stamina > 0;
  if (blocking) {
    const parry = tick - target.blockStartedTick <= PERFECT_BLOCK_WINDOW_TICKS;
    target.stamina = Math.max(0, target.stamina - (parry ? 5 : 12));
    attacker.attackHit = true;
    attacker.attackType = null;
    if (attacker === state.player) {
      attacker.comboChainStep = 0;
      attacker.comboChainUntilTick = 0;
    }
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

  const critical = random(state) < (playerAttacking
    ? Math.min(0.75, state.playerStats.criticalChance)
    : 0.12);
  let multiplier = 1;
  if (playerAttacking && attacker.attackComboStep === 2) multiplier *= 1.1;
  if (playerAttacking && attacker.attackComboStep === 3) multiplier *= 1.25;
  if (attack === "light" && targetSide === "bot") {
    attacker.combo = tick <= attacker.comboUntilTick ? Math.min(3, attacker.combo + 1) : 1;
    attacker.comboUntilTick = tick + 75;
    multiplier *= attacker.combo === 2 ? 1.08 : attacker.combo >= 3 ? 1.2 : 1;
  }
  const damageMultiplier = playerAttacking
    ? state.playerStats.damageMultiplier
    : state.opponentTuning.statMultiplier;
  const defenseMultiplier = targetSide === "player"
    ? 1 - state.playerStats.defenseReduction
    : 1 - Math.min(0.24, Math.max(0, state.opponentTuning.statMultiplier - 1) * 0.12);
  const weaponDamage = weaponDefinition ? 1 : weaponStyle === "daggers" ? 0.9
    : weaponStyle === "axe" || weaponStyle === "mace" ? 1.24
      : weaponStyle === "greatsword" ? 1.16
        : weaponStyle === "spear" ? 0.94
          : rangedShot ? 0.96
            : closeBowAttack ? 0.84 : 1;
  const criticalDamage = playerAttacking ? state.playerStats.criticalDamageMultiplier : 1.5;
  const damage = Math.max(1, Math.round(baseDamage * weaponDamage * damageMultiplier * multiplier * (critical ? criticalDamage : 1) * defenseMultiplier));
  target.hp = Math.max(0, target.hp - damage);
  if (playerAttacking) {
    state.highestDamage = Math.max(state.highestDamage, damage);
    state.maxCombo = Math.max(state.maxCombo, attacker.combo);
  }
  target.lastDamage = damage;
  target.staggerUntilTick = tick + (attack === "heavy" ? 21 : attack === "skillTwo" ? 24 : 13);
  if (attack === "skillOne") {
    target.burnUntilTick = Math.max(target.burnUntilTick, tick + 150);
    target.burnNextTick = Math.max(target.burnNextTick, tick + 30);
  }
  if (!playerAttacking && targetSide === "player") {
    if (state.botArchetype === "venom-assassin") {
      target.poisonUntilTick = Math.max(target.poisonUntilTick, tick + 210);
      target.poisonNextTick = Math.max(target.poisonNextTick, tick + 30);
    } else if (state.botArchetype === "ember-alchemist" || state.botArchetype === "chapter-boss" && isCombatBotEnraged(state.bot)) {
      target.burnUntilTick = Math.max(target.burnUntilTick, tick + 150);
      target.burnNextTick = Math.max(target.burnNextTick, tick + 30);
    } else if (state.botArchetype === "frost-hunter") {
      target.stamina = Math.max(0, target.stamina - (attack === "heavy" ? 12 : 7));
    }
  }
  if (targetSide === "player") {
    target.comboChainStep = 0;
    target.comboChainUntilTick = 0;
  }
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
    weaponId: closeBowAttack ? "weapon_hunting_knife" : attacker.attackWeaponId ?? undefined,
    from: playerAttacking ? "player" : "bot",
    originX: attacker.x,
    originZ: attacker.z,
    destinationX: target.x,
    destinationZ: target.z,
    plunge: attacker.attackWasPlunge,
  });
  state.lastImpactTick = tick;
  state.lastImpactStrength = attack === "heavy" || critical ? 1 : 0.7;
}

function moveActor(actor: CombatActor, x: number, y: number, tick: number, blocking: boolean, speedMultiplier = 1) {
  const direction = normalized(x, y);
  const exhausted = actor.stamina <= 1;
  const speed = (exhausted ? 2.1 : blocking ? 2.65 : 4.5) * speedMultiplier;
  const canMove = tick >= actor.staggerUntilTick && actor.hp > 0;
  const targetX = canMove ? direction.x * speed : 0;
  const targetZ = canMove ? direction.y * speed : 0;
  actor.vx += (targetX - actor.vx) * 0.24;
  actor.vz += (targetZ - actor.vz) * 0.24;
  actor.x += actor.vx / COMBAT_HZ;
  actor.z += actor.vz / COMBAT_HZ;
  if (Math.abs(actor.vx) < 0.08) actor.vx = 0;
  if (Math.abs(actor.vz) < 0.08) actor.vz = 0;
}

function constrainActorToArena(actor: CombatActor) {
  const dx = actor.x;
  const dz = actor.z - COMBAT_ARENA_CENTER_Z;
  const distance = Math.hypot(dx, dz);
  if (distance <= COMBAT_ARENA_ACTOR_LIMIT) return;

  const nx = dx / distance;
  const nz = dz / distance;
  actor.x = nx * COMBAT_ARENA_ACTOR_LIMIT;
  actor.z = COMBAT_ARENA_CENTER_Z + nz * COMBAT_ARENA_ACTOR_LIMIT;
  const outwardSpeed = actor.vx * nx + actor.vz * nz;
  if (outwardSpeed > 0) {
    actor.vx -= nx * outwardSpeed;
    actor.vz -= nz * outwardSpeed;
  }
}

export function stepCombat(state: CombatState, input: CombatInput): { state: CombatState; events: CombatEvent[] } {
  if (state.ended) return { state, events: [] };
  const next: CombatState = {
    ...state,
    tick: state.tick + 1,
    player: {
      ...state.player,
      quickSlotCooldownUntilTick: [...state.player.quickSlotCooldownUntilTick],
    },
    bot: { ...state.bot },
    weaponStats: [...state.weaponStats],
    weaponIds: [...state.weaponIds],
    quickSlotItemIds: [...state.quickSlotItemIds],
    combatItemCounts: { ...state.combatItemCounts },
    lastImpactStrength: state.tick - state.lastImpactTick > 9 ? 0 : state.lastImpactStrength,
  };
  const tick = next.tick;
  const events: CombatEvent[] = [];
  const player = next.player;
  const bot = next.bot;
  let playerDashImpulse: { x: number; z: number; speed: number } | null = null;
  const botInput = chooseBotIntent(next, tick, events);
  const buttons = input.buttons & MAX_INPUT_BUTTONS;
  const playerBlockHeld = Boolean(buttons & INPUT_BUTTON.block);
  if (input.pressed & INPUT_BUTTON.aim) player.isAiming = !player.isAiming;
  if (
    player.isAiming
    && (bot.hp <= 0 || distanceBetween(player, bot) > DUEL_AIM_LOCK_RANGE)
  ) {
    player.isAiming = false;
  }
  player.isCrouching = Boolean(buttons & INPUT_BUTTON.crouch);
  bot.isAiming = Boolean(botInput.buttons & INPUT_BUTTON.aim);

  if (
    (input.pressed & INPUT_BUTTON.weaponSwitch) &&
    next.weaponIds[1] &&
    tick >= next.weaponSwapCooldownUntilTick
  ) {
    next.activeWeaponSlot = next.activeWeaponSlot === 0 ? 1 : 0;
    next.playerStats = normalizePlayerCombatModifiers(next.weaponStats[next.activeWeaponSlot]);
    next.weaponSwapCooldownUntilTick = tick + Math.round(COMBAT_HZ * 1.5);
    events.push({
      id: tick * 100 + 39,
      type: "weaponSwitch",
      target: "player",
      weaponId: next.weaponIds[next.activeWeaponSlot] ?? undefined,
    });
  }

  for (let slotIndex = 0; slotIndex < QUICK_SLOT_BUTTONS.length; slotIndex += 1) {
    if (input.pressed & QUICK_SLOT_BUTTONS[slotIndex]) useCombatItem(next, slotIndex, tick, events);
  }

  if (input.pressed & INPUT_BUTTON.attack) player.chargeStartedTick = tick;
  if (buttons & INPUT_BUTTON.attack && player.chargeStartedTick >= 0 && tick - player.chargeStartedTick >= 30) {
    player.action = "heavyAttack";
  }
  if (input.released & INPUT_BUTTON.attack) {
    const charge = player.chargeStartedTick < 0 ? 0 : tick - player.chargeStartedTick;
    const chargedHeavy = charge >= 30;
    const chainStep = tick <= player.comboChainUntilTick ? player.comboChainStep + 1 : 1;
    const attack = chargedHeavy || chainStep === 3 ? "heavy" : "light";
    const attackComboStep = chargedHeavy ? 0 : chainStep;
    if (startAttack(next, player, attack, tick, events, "player", attackComboStep)) {
      if (chargedHeavy || chainStep === 3) {
        player.comboChainStep = 0;
        player.comboChainUntilTick = 0;
      } else {
        player.comboChainStep = chainStep;
        player.comboChainUntilTick = tick + COMBO_CHAIN_WINDOW_TICKS;
      }
    }
  }

  if (
    playerBlockHeld
    && tick >= player.staggerUntilTick
    && player.action !== "attack"
    && player.action !== "heavyAttack"
    && player.action !== "dodge"
    && player.action !== "backflip"
  ) {
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
    const rapidRepeat = tick - player.lastDodgeTick <= 18;
    const directionLength = Math.hypot(direction.x, direction.y);
    const retreatIntent = directionLength < 0.1 || direction.x * away.x + direction.y * away.y >= 0.35;
    const edgeDx = player.x;
    const edgeDz = player.z - COMBAT_ARENA_CENTER_Z;
    const edgeDistance = Math.hypot(edgeDx, edgeDz);
    const edgeRebound = rapidRepeat && COMBAT_ARENA_ACTOR_LIMIT - edgeDistance <= 0.85;
    const backflip = edgeRebound || (rapidRepeat && player.lastDodgeWasRetreat && retreatIntent);
    const inward = normalized(-edgeDx, -edgeDz);
    const impulse = edgeRebound
      ? inward
      : backflip ? away : Math.hypot(direction.x, direction.y) > 0.1 ? direction : away;
    const dashSpeed = COMBAT_DODGE_DISTANCE_METERS * COMBAT_HZ / COMBAT_DODGE_DURATION_TICKS;
    player.lastDodgeTick = tick;
    player.lastDodgeWasRetreat = retreatIntent;
    player.stamina = Math.max(0, player.stamina - (backflip ? 24 : 20));
    player.dodgeDirectionX = impulse.x;
    player.dodgeDirectionZ = impulse.y;
    playerDashImpulse = { x: impulse.x, z: impulse.y, speed: dashSpeed };
    player.invulnerableUntilTick = tick + Math.round(COMBAT_DODGE_DURATION_TICKS * next.playerStats.dodgeWindowMultiplier);
    setAction(player, backflip ? "backflip" : "dodge", tick, COMBAT_DODGE_DURATION_TICKS);
    events.push({
      id: tick * 4 + 1,
      type: backflip ? "backflip" : "dodge",
      target: "player",
      edgeRebound,
    });
  }

  if ((input.pressed & INPUT_BUTTON.jump) && tick >= player.jumpUntilTick && player.stamina >= 12 && tick >= player.staggerUntilTick) {
    player.stamina = Math.max(0, player.stamina - 12);
    player.jumpStartedTick = tick;
    player.jumpUntilTick = tick + 42;
    setAction(player, "jump", tick, 42);
  }

  if ((input.pressed & INPUT_BUTTON.skillOne) && tick >= player.skillOneCooldownUntilTick && player.stamina >= 24) {
    if (startAttack(next, player, "skillOne", tick, events, "player")) player.skillOneCooldownUntilTick = tick + 240;
  }
  if ((input.pressed & INPUT_BUTTON.skillTwo) && tick >= player.skillTwoCooldownUntilTick && player.stamina >= 30) {
    if (startAttack(next, player, "skillTwo", tick, events, "player")) player.skillTwoCooldownUntilTick = tick + 360;
  }

  const stanceSpeed = player.isCrouching ? 0.48 : player.isAiming ? 0.68 : 1;
  if (playerDashImpulse) {
    player.vx = playerDashImpulse.x * playerDashImpulse.speed;
    player.vz = playerDashImpulse.z * playerDashImpulse.speed;
    player.x += player.vx / COMBAT_HZ;
    player.z += player.vz / COMBAT_HZ;
  } else if (
    (player.action === "dodge" || player.action === "backflip")
    && tick < player.actionUntilTick
  ) {
    const speed = COMBAT_DODGE_DISTANCE_METERS * COMBAT_HZ / COMBAT_DODGE_DURATION_TICKS;
    player.vx = player.dodgeDirectionX * speed;
    player.vz = player.dodgeDirectionZ * speed;
    player.x += player.vx / COMBAT_HZ;
    player.z += player.vz / COMBAT_HZ;
  } else {
    moveActor(player, input.x / 100, input.y / 100, tick, playerBlockHeld, next.playerStats.moveSpeedMultiplier * stanceSpeed);
  }
  const botProgressionSpeed = 1 + Math.min(0.3, Math.max(0, next.opponentTuning.statMultiplier - 1) * 0.18);
  moveActor(
    bot,
    botInput.x,
    botInput.y,
    tick,
    Boolean(botInput.buttons & INPUT_BUTTON.block),
    (isCombatBotEnraged(bot) ? 1.16 : 1) * botProgressionSpeed,
  );
  resolveCombatActorOverlap(player, bot);
  resolveActorCoverCollision(player);
  resolveActorCoverCollision(bot);
  constrainActorToArena(player);
  constrainActorToArena(bot);
  player.stamina = Math.min(player.maxStamina, player.stamina + 0.17);
  bot.stamina = Math.min(bot.maxStamina, bot.stamina + 0.14);

  for (const [attacker, target, targetSide] of [
    [player, bot, "bot"],
    [bot, player, "player"],
  ] as const) {
    if (!attacker.attackType || attacker.attackHit) continue;
    const attack = attacker.attackType;
    const baseWindup = attack === "light" ? 8 : attack === "heavy" ? 15 : attack === "skillOne" ? 12 : 18;
    const windup = attacker === bot
      ? getBotAttackWindupTicks(next.difficulty, next.botArchetype, isCombatBotEnraged(attacker))
      : Math.max(4, Math.round(baseWindup / next.playerStats.attackSpeedMultiplier));
    if (tick >= attacker.attackStartedTick + windup) {
      if (attacker === bot && attacker.action === "windup") {
        setAction(attacker, attack === "light" ? "attack" : "heavyAttack", tick, 24);
      }
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
      if (attacker === player && attacker.attackComboStep > 0) {
        attacker.comboChainStep = 0;
        attacker.comboChainUntilTick = 0;
      }
    }
  }

  for (const [actor, side] of [[player, "player"], [bot, "bot"]] as const) {
    if (actor.jumpUntilTick === tick && actor.attackWasPlunge) {
      events.push({
        id: tick * 100 + (side === "player" ? 45 : 46),
        type: "plungeLand",
        target: side,
        originX: actor.x,
        originZ: actor.z,
      });
      next.lastImpactTick = tick;
      next.lastImpactStrength = Math.max(next.lastImpactStrength, 0.82);
    }
  }

  stepPoison(player, "player", tick, events);
  stepPoison(bot, "bot", tick, events);
  stepBurn(player, "player", tick, events);
  stepBurn(bot, "bot", tick, events);

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

  // Reapply the arena clamp after hit knockback and attack resolution so no
  // combat impulse can leave either fighter beyond the visible boundary.
  constrainActorToArena(player);
  constrainActorToArena(bot);

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
  playerStats: PlayerCombatModifiers = DEFAULT_PLAYER_COMBAT_MODIFIERS,
  loadout?: CombatLoadout,
  botArchetype: CombatBotArchetype = "gate-warden",
  opponentTuning: CombatOpponentTuning = createCombatOpponentTuning(1, 0),
) {
  let state = createCombatState(seed, difficulty, playerStats, loadout, botArchetype, opponentTuning);
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
