import { findNearestWarRoomClearPoint } from "./war-room-data";
import {
  WAR_ROOM_BLOCKERS,
  WAR_ROOM_COMMANDER,
  WAR_ROOM_COVER_SPOTS,
  WAR_ROOM_HALF_SIZE,
  WAR_ROOM_WEAPON_BY_ID,
  type WarRoomBlocker,
  type WarRoomLootChest,
  type WarRoomWeaponId,
} from "./war-room-data";
import type { WarRoomFacingMode } from "./war-room-orientation";
import type { WarRoomDoorState } from "./war-room-doors";
import {
  createWarRoomArmorPoints,
  createWarRoomHealingPoints,
  RESTORE_CONFIG,
  type WarRoomArmorPoint,
  type WarRoomHealingPoint,
} from "./war-room-restore";
import { getWarRoomRoom, type WarRoomRoom } from "./war-room-rooms";
import { WAR_ROOM_CONFIG } from "./war-room-config";
import type { WarRoomBossAttack } from "./war-room-boss";
import type { WarRoomAwarenessState } from "./war-room-awareness";
import {
  createWarRoomMissionState,
  getWarRoomAmmoMultiplier,
  getWarRoomEnemyDamageMultiplier,
  getWarRoomEnemyHealthMultiplier,
  getWarRoomEnemySpeedMultiplier,
  type WarRoomMissionOptions,
  type WarRoomMissionState,
} from "./war-room-missions";

export type WarRoomEnemyArchetype =
  | "infantry"
  | "assault"
  | "marksman"
  | "shield"
  | "heavy"
  | "summoner";

const WAR_ROOM_ENEMY_ARCHETYPES: readonly WarRoomEnemyArchetype[] = [
  "infantry",
  "assault",
  "marksman",
  "shield",
  "heavy",
  "summoner",
];

export type WarRoomEnemy = {
  id: string;
  name: string;
  commander: boolean;
  archetype: WarRoomEnemyArchetype;
  speedMultiplier: number;
  weaponId: WarRoomWeaponId;
  color: string;
  x: number;
  z: number;
  floorHeight?: number;
  hp: number;
  maxHp: number;
  damage: number;
  score: number;
  alive: boolean;
  mode: WarRoomAwarenessState | "approach" | "fire" | "cover";
  awareness: number;
  brainAt: number;
  perceptionAt: number;
  lineOfSightBlocked: boolean;
  moveVelocityX: number;
  moveVelocityZ: number;
  movementBlockers: WarRoomBlocker[];
  nextShotAt: number;
  coverX: number;
  coverZ: number;
  hitUntil: number;
  hitFlashUntil: number;
  hitKneeUntil: number;
  hitKnockbackX: number;
  hitKnockbackZ: number;
  doorApproachX: number;
  doorApproachZ: number;
  deathYaw: number;
  bossAttack?: WarRoomBossAttack | null;
  bossAttackStartedAt?: number;
  bossAttackTargetX?: number;
  bossAttackTargetZ?: number;
  bossAttackResolved?: boolean;
  bossAttackPhase?: number;
};

export function getWarRoomCommanderHealth(
  enemies: readonly Pick<WarRoomEnemy, "commander" | "hp" | "maxHp">[],
) {
  const commander = enemies.find((enemy) => enemy.commander);
  return {
    hp: commander && Number.isFinite(commander.hp) ? Math.max(0, commander.hp) : 0,
    maxHp: commander && Number.isFinite(commander.maxHp) ? Math.max(1, commander.maxHp) : 1,
  };
}

export type WarRoomAmmo = { magazine: number; reserve: number };

export type WarRoomRuntime = {
  room: WarRoomRoom;
  mission: WarRoomMissionState;
  doorStates: Record<string, WarRoomDoorState>;
  player: {
    x: number;
    z: number;
    floorHeight: number;
    yaw: number;
    facingYaw: number;
    facingMode: WarRoomFacingMode;
    joystickAngleDegrees: number | null;
    facingCamera: boolean;
    strafeUntil: number;
    pitch: number;
    hp: number;
    maxHp: number;
    armor: number;
    maxArmor: number;
    stamina: number;
    maxStamina: number;
    jumpHeight: number;
    jumpVelocity: number;
    dodgeUntil: number;
    dodgeX: number;
    dodgeZ: number;
    invulnerableUntil: number;
    crouched: boolean;
    prone: boolean;
    sprinting: boolean;
    weaponSlots: [WarRoomWeaponId, WarRoomWeaponId];
    ammo: Partial<Record<WarRoomWeaponId, WarRoomAmmo>>;
    lootChestId: string | null;
    lootStartedAt: number;
    lootProgress: number;
    activeSlot: 0 | 1;
    kills: number;
    headshots: number;
    shots: number;
    hits: number;
    nextShotAt: number;
    reloadUntil: number;
    reloadingWeapon: WarRoomWeaponId | null;
    chargeStartedAt: number;
    shotFlashUntil: number;
    shotFeedbackUntil: number;
    meleeStartedAt: number;
    meleeUntil: number;
    meleeDuration: number;
    meleeHitAt: number;
    meleeHitPending: boolean;
    meleeAttackWeaponId: WarRoomWeaponId | null;
    meleeAttackYaw: number;
    meleeInputStartedAt: number;
    meleeInputPending: boolean;
    meleeComboIndex: number;
    meleeComboCount: number;
    meleeComboLastAttackAt: number;
    meleeAttackComboIndex: number;
    meleeAttackHeavy: boolean;
    meleeAttackDamageMultiplier: number;
    meleeAttackRangeBonus: number;
    meleeAttackHitStopSeconds: number;
    meleeAttackStaggerSeconds: number;
    meleeHitStopUntil: number;
    meleeLastResult: string;
    recoil: number;
    lastDamageAt: number;
    lastCombatAt: number;
    regenerationActive: boolean;
    regenerationWaitSeconds: number;
    damageDirection: number;
    hitMarkerUntil: number;
    hitMarkerHeadshot: boolean;
    lastHitCritical: boolean;
    lastHitSource: "dealt" | "received" | null;
    damageEventId: number;
    lastHitDamage: number;
    lastHitArmorDamage: number;
    hitMessageUntil: number;
    lastHitText: string;
    clockTime: number;
    killFeed: Array<{ id: number; text: string }>;
    targetId: string | null;
    targetName: string | null;
    targetReason: string;
    rngState: number;
    startTime: number;
  };
  enemies: WarRoomEnemy[];
  healingPoints: WarRoomHealingPoint[];
  armorPoints: WarRoomArmorPoint[];
  lootChests: Array<WarRoomLootChest & { opened: boolean }>;
  bossSummonsUsed: number;
};

export type WarRoomInputState = {
  keys: Set<string>;
  moveX: number;
  moveY: number;
  yaw: number;
  cameraTargetYaw: number;
  movementBaseYaw: number | null;
  manualLookActive: boolean;
  lookDeltaX: number;
  lookDeltaY: number;
  lookPointerType: "mouse" | "touch" | "pen";
  pitch: number;
  fireHeld: boolean;
  firePressed: boolean;
  fireReleased: boolean;
  aimHeld: boolean;
  aimAssistEnabled: boolean;
  reloadPressed: boolean;
  swapPressed: boolean;
  jumpPressed: boolean;
  dodgePressed: boolean;
  crouchPressed: boolean;
  sprintLocked: boolean;
  weaponSlotPressed: number | null;
  pronePressed: boolean;
  lootHeld: boolean;
  doorPressed: boolean;
  paused: boolean;
};

export const WAR_ROOM_PLAYER_COLLISION_RADIUS: number = WAR_ROOM_CONFIG.player.collisionRadius;
const WAR_ROOM_COLLISION_STEP_DISTANCE: number = WAR_ROOM_CONFIG.player.collisionStepDistance;

export type WarRoomHudSnapshot = {
  mission: {
    mode: WarRoomMissionState["mode"];
    dailyObjective: WarRoomMissionState["dailyObjective"];
    wave: number;
    score: number;
    timeLimitSeconds: number | null;
    targetChests: number;
    defenseHp: number;
    defenseMaxHp: number;
  };
  player: { x: number; z: number; floorHeight: number; yaw: number; hp: number; maxHp: number; armor: number; maxArmor: number; stamina: number; maxStamina: number };
  orientation: {
    facingYaw: number;
    mode: WarRoomFacingMode;
    joystickAngleDegrees: number | null;
    facingCamera: boolean;
  };
  enemies: Array<{ id: string; x: number; z: number; floorHeight: number; alive: boolean; commander: boolean }>;
  healingPoints: Array<{ id: string; x: number; z: number; floorHeight: number; available: boolean }>;
  armorPoints: Array<{ id: string; x: number; z: number; floorHeight: number; available: boolean }>;
  regenerationActive: boolean;
  regenerationWaitSeconds: number;
  regenerationAtCap: boolean;
  remaining: number;
  bossHp: number;
  bossMaxHp: number;
  bossAttack: { attack: WarRoomBossAttack; telegraphing: boolean } | null;
  kills: number;
  headshots: number;
  shots: number;
  hits: number;
  elapsedSeconds: number;
  weaponId: WarRoomWeaponId;
  weaponSlots: readonly [WarRoomWeaponId, WarRoomWeaponId];
  magazine: number;
  reserve: number;
  reloading: boolean;
  aiming: boolean;
  firing: boolean;
  targetVisible: boolean;
  targetName: string | null;
  targetReason: string;
  hitMarker: boolean;
  headshotMarker: boolean;
  damageNumberCritical: boolean;
  lastHitSource: "dealt" | "received" | null;
  damageEventId: number;
  damageVignette: boolean;
  damageDirection: number;
  lastHitDamage: number;
  lastHitArmorDamage: number;
  hitMessage: string;
  killFeed: Array<{ id: number; text: string }>;
  crouched: boolean;
  meleePhase: "HAZIR" | "HAZIRLIK" | "VURUŞ" | "TOPARLAN";
  meleeComboCount: number;
  meleeLastResult: string;
  nearbyLootChest: { id: string; label: string; contents: string; progress: number } | null;
  lootChestsOpened: number;
  nearbyDoor: { id: string; openProgress: number } | null;
};

export type DamageTarget = { hp: number; maxHp: number; armor?: number };

export function applyWarRoomDamage(target: DamageTarget, baseDamage: number, multiplier = 1) {
  const before = Math.max(0, target.hp);
  let remainingDamage = Math.max(0, Math.round(baseDamage * Math.max(0, multiplier)));
  let armorDamage = 0;
  if (target.armor !== undefined && target.armor > 0) {
    armorDamage = Math.min(target.armor, remainingDamage);
    target.armor -= armorDamage;
    remainingDamage -= armorDamage;
  }
  target.hp = Math.max(0, before - remainingDamage);
  return {
    damage: before - target.hp,
    killed: before > 0 && target.hp <= 0,
    ...(armorDamage > 0 ? { armorDamage } : {}),
  };
}

export function getWarRoomFallDamage(fallDistance: number) {
  if (!Number.isFinite(fallDistance) || fallDistance <= 2.1) return 0;
  return Math.max(0, Math.round((fallDistance - 2.1) * 9));
}

export function shortestAngleDelta(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

export function createWarRoomRuntime(
  weaponIds: readonly [WarRoomWeaponId, WarRoomWeaponId],
  now = 0,
  roomNumber = 1,
  runSeed = 0,
  missionOptions: WarRoomMissionOptions = {
    mode: "raid",
    difficulty: "normal",
    modifiers: [],
    mapId: "stone-courtyard",
  },
): WarRoomRuntime {
  const room = getWarRoomRoom(roomNumber, runSeed, missionOptions.mapId);
  const mission = createWarRoomMissionState(missionOptions, room.playerSpawn);
  room.enemyHpMultiplier *= getWarRoomEnemyHealthMultiplier(mission.difficulty);
  room.enemyDamageMultiplier *= getWarRoomEnemyDamageMultiplier(
    mission.difficulty,
    mission.modifiers,
  );
  const ammoMultiplier = getWarRoomAmmoMultiplier(mission.modifiers);
  const enemySpeedMultiplier = getWarRoomEnemySpeedMultiplier(mission.modifiers);
  const healingPoints = createWarRoomHealingPoints(now);
  const armorPoints = createWarRoomArmorPoints(now).map((point) => {
    const clear = findNearestWarRoomClearPoint(point, room.blockers, {
      radius: 0.4,
      floorHeight: 0,
      reserved: [
        room.playerSpawn,
        ...healingPoints.map(({ x, z }) => ({ x, z })),
      ],
      minimumReservedDistance: 2.2,
      maximumSearchDistance: 8,
    });
    return { ...point, ...clear };
  });
  const enemies: WarRoomEnemy[] = room.enemySpawns
    .slice(0, room.enemyCount - 1)
    .map((spawn, index) => {
    const cover = room.coverSpots[index % room.coverSpots.length];
    const archetype = WAR_ROOM_ENEMY_ARCHETYPES[index % WAR_ROOM_ENEMY_ARCHETYPES.length]!;
    const archetypeHealth = archetype === "heavy" ? 1.55
      : archetype === "shield" ? 1.28
        : archetype === "assault" ? 0.82 : 1;
    const archetypeDamage = archetype === "marksman" ? 1.2
      : archetype === "heavy" ? 1.35
        : archetype === "summoner" ? 0.9 : 1;
    const archetypeSpeed = archetype === "assault" ? 1.4
      : archetype === "heavy" ? 0.72
        : archetype === "shield" ? 0.84
          : archetype === "summoner" ? 0.92 : 1;
    return {
      ...spawn,
      name: room.enemyNames[index % room.enemyNames.length],
      commander: false,
      archetype,
      speedMultiplier: archetypeSpeed * enemySpeedMultiplier,
      weaponId: room.enemyWeapons[index % room.enemyWeapons.length],
      color: room.enemyColor,
      floorHeight: 0,
      hp: 90 * room.enemyHpMultiplier * archetypeHealth,
      maxHp: 90 * room.enemyHpMultiplier * archetypeHealth,
      damage: Math.round(9 * room.enemyDamageMultiplier * archetypeDamage),
      score: 0,
      alive: true,
      mode: "patrol",
      awareness: 0,
      brainAt: 0,
      perceptionAt: Number.NEGATIVE_INFINITY,
      lineOfSightBlocked: false,
      moveVelocityX: 0,
      moveVelocityZ: 0,
      movementBlockers: [],
      nextShotAt: 1.3 + index * 0.19,
      coverX: cover.x,
      coverZ: cover.z,
      hitUntil: 0,
      hitFlashUntil: 0,
      hitKneeUntil: 0,
      hitKnockbackX: 0,
      hitKnockbackZ: 0,
      doorApproachX: 0,
      doorApproachZ: 0,
      deathYaw: 0,
    };
  });
  enemies.push({
    id: WAR_ROOM_COMMANDER.id,
    name: room.commanderName,
    commander: true,
    archetype: "heavy",
    speedMultiplier: 0.76 * enemySpeedMultiplier,
    weaponId: room.commanderWeapon,
    color: room.commanderColor,
    x: room.commanderPosition.x,
    z: room.commanderPosition.z,
    floorHeight: 0,
    hp: WAR_ROOM_COMMANDER.hp * room.enemyHpMultiplier,
    maxHp: WAR_ROOM_COMMANDER.hp * room.enemyHpMultiplier,
    damage: Math.round(WAR_ROOM_COMMANDER.damage * room.enemyDamageMultiplier),
    score: 0,
    alive: true,
    mode: "approach",
    awareness: 1,
    brainAt: 0,
    perceptionAt: Number.NEGATIVE_INFINITY,
    lineOfSightBlocked: false,
    moveVelocityX: 0,
    moveVelocityZ: 0,
    movementBlockers: [],
    nextShotAt: 2.6,
    coverX: 0,
    coverZ: -21,
    hitUntil: 0,
    hitFlashUntil: 0,
    hitKneeUntil: 0,
    hitKnockbackX: 0,
    hitKnockbackZ: 0,
    doorApproachX: 0,
    doorApproachZ: 0,
    deathYaw: 0,
    bossAttack: null,
    bossAttackStartedAt: 0,
    bossAttackTargetX: 0,
    bossAttackTargetZ: 0,
    bossAttackResolved: false,
    bossAttackPhase: 1,
  });

  const ammo: WarRoomRuntime["player"]["ammo"] = {};
  for (const id of new Set(weaponIds)) {
    const weapon = WAR_ROOM_WEAPON_BY_ID.get(id);
    if (weapon && weapon.weaponClass !== "melee") {
      ammo[id] = {
        magazine: Math.max(1, Math.floor(weapon.magazine * Math.min(1, ammoMultiplier + 0.2))),
        reserve: Math.floor(weapon.reserve * ammoMultiplier),
      };
    }
  }

  return {
    room,
    mission,
    doorStates: {},
    lootChests: room.lootChests.map((chest) => ({ ...chest, opened: false })),
    player: {
      x: room.playerSpawn.x,
      z: room.playerSpawn.z,
      floorHeight: 0,
      yaw: 0,
      facingYaw: 0,
      facingMode: "HAREKET",
      joystickAngleDegrees: null,
      facingCamera: false,
      strafeUntil: 0,
      pitch: -0.08,
      hp: 220,
      maxHp: 220,
      armor: 0,
      maxArmor: RESTORE_CONFIG.armorPickup.armorPerPickup * 2,
      stamina: 100,
      maxStamina: 100,
      jumpHeight: 0,
      jumpVelocity: 0,
      dodgeUntil: 0,
      dodgeX: 0,
      dodgeZ: 0,
      invulnerableUntil: 0,
      crouched: false,
      prone: false,
      sprinting: false,
      weaponSlots: [...weaponIds],
      ammo,
      lootChestId: null,
      lootStartedAt: 0,
      lootProgress: 0,
      activeSlot: 0,
      kills: 0,
      headshots: 0,
      shots: 0,
      hits: 0,
      nextShotAt: 0,
      reloadUntil: 0,
      reloadingWeapon: null,
      chargeStartedAt: 0,
      shotFlashUntil: 0,
      shotFeedbackUntil: 0,
      meleeStartedAt: -1,
      meleeUntil: 0,
      meleeDuration: 0,
      meleeHitAt: 0,
      meleeHitPending: false,
      meleeAttackWeaponId: null,
      meleeAttackYaw: 0,
      meleeInputStartedAt: 0,
      meleeInputPending: false,
      meleeComboIndex: 0,
      meleeComboCount: 0,
      meleeComboLastAttackAt: -1,
      meleeAttackComboIndex: 0,
      meleeAttackHeavy: false,
      meleeAttackDamageMultiplier: 1,
      meleeAttackRangeBonus: 0,
      meleeAttackHitStopSeconds: 0.05,
      meleeAttackStaggerSeconds: 0.18,
      meleeHitStopUntil: 0,
      meleeLastResult: "Henüz isabet yok",
      recoil: 0,
      lastDamageAt: 0,
      lastCombatAt: 0,
      regenerationActive: false,
      regenerationWaitSeconds: 0,
      damageDirection: 0,
      hitMarkerUntil: 0,
      hitMarkerHeadshot: false,
      lastHitCritical: false,
      lastHitSource: null,
      damageEventId: 0,
      lastHitDamage: 0,
      lastHitArmorDamage: 0,
      hitMessageUntil: 0,
      lastHitText: "",
      clockTime: now,
      killFeed: [],
      targetId: null,
      targetName: null,
      targetReason: "no-target",
      rngState: 0x6d2b79f5,
      startTime: now,
    },
    enemies,
    healingPoints,
    armorPoints,
    bossSummonsUsed: 0,
  };
}

export function spawnWarRoomBossSummons(
  runtime: WarRoomRuntime,
  commander: WarRoomEnemy,
  now: number,
  requestedCount = 2,
) {
  const remainingBudget = Math.max(0, 4 - runtime.bossSummonsUsed);
  const count = Math.min(
    Math.max(0, Math.floor(requestedCount)),
    remainingBudget,
  );
  const template = runtime.enemies.find((enemy) => !enemy.commander);
  if (!template || count === 0) return [];

  const blockers = runtime.room.blockers;
  const reserved = runtime.enemies
    .filter((enemy) => enemy.alive)
    .map(({ x, z }) => ({ x, z }));
  const summons: WarRoomEnemy[] = [];
  for (let index = 0; index < count; index += 1) {
    const summonNumber = runtime.bossSummonsUsed + index + 1;
    const angle = (index / Math.max(1, count)) * Math.PI * 2 + Math.PI / 4;
    const spawn = findNearestWarRoomClearPoint(
      {
        x: commander.x + Math.cos(angle) * 2.4,
        z: commander.z + Math.sin(angle) * 2.4,
      },
      blockers,
      {
        radius: 0.35,
        floorHeight: commander.floorHeight ?? 0,
        reserved,
        minimumReservedDistance: 1.05,
        maximumSearchDistance: 8,
      },
    );
    const maxHp = Math.max(32, Math.round(template.maxHp * 0.55));
    const summoned: WarRoomEnemy = {
      ...template,
      id: `commander-summon-${summonNumber}`,
      name: "Komutanın Takviyesi",
      commander: false,
      archetype: "assault",
      speedMultiplier: Math.max(1.2, template.speedMultiplier),
      x: spawn.x,
      z: spawn.z,
      floorHeight: commander.floorHeight ?? 0,
      hp: maxHp,
      maxHp,
      damage: Math.max(1, Math.round(template.damage * 0.72)),
      score: 0,
      alive: true,
      mode: "approach",
      awareness: 1,
      brainAt: now,
      perceptionAt: Number.NEGATIVE_INFINITY,
      lineOfSightBlocked: false,
      moveVelocityX: 0,
      moveVelocityZ: 0,
      movementBlockers: [],
      nextShotAt: now + 1.1,
      coverX: spawn.x,
      coverZ: spawn.z,
      hitUntil: 0,
      hitFlashUntil: 0,
      hitKneeUntil: 0,
      hitKnockbackX: 0,
      hitKnockbackZ: 0,
      doorApproachX: 0,
      doorApproachZ: 0,
      deathYaw: 0,
      bossAttack: null,
    };
    runtime.enemies.push(summoned);
    summons.push(summoned);
    reserved.push(spawn);
  }
  runtime.bossSummonsUsed += summons.length;
  return summons;
}

export function advanceWarRoomSurvivalWave(
  previous: WarRoomRuntime,
  next: WarRoomRuntime,
) {
  if (previous.mission.mode !== "survival" || next.mission.mode !== "survival") {
    throw new Error("Only survival runs can advance to another wave.");
  }
  next.mission.wave = previous.mission.wave + 1;
  next.mission.score = previous.player.kills * 100 + previous.player.headshots * 25;
  next.player.hp = Math.min(next.player.maxHp, previous.player.hp);
  next.player.armor = Math.min(next.player.maxArmor, previous.player.armor);
  next.player.stamina = Math.min(next.player.maxStamina, previous.player.stamina);
  next.player.activeSlot = previous.player.activeSlot;
  next.player.ammo = Object.fromEntries(
    Object.entries(previous.player.ammo).map(([id, ammo]) => [id, ammo ? { ...ammo } : ammo]),
  );
  next.player.kills = previous.player.kills;
  next.player.headshots = previous.player.headshots;
  next.player.shots = previous.player.shots;
  next.player.hits = previous.player.hits;
  next.player.startTime = previous.player.startTime;
  next.player.rngState = previous.player.rngState;
  next.player.killFeed = [...previous.player.killFeed.slice(-3)];
  return next;
}

export function createWarRoomTrainingRuntime(
  weaponIds: readonly [WarRoomWeaponId, WarRoomWeaponId],
  now = 0,
): WarRoomRuntime {
  const runtime = createWarRoomRuntime(weaponIds, now);
  const dummyPosition = findNearestWarRoomClearPoint(
    { x: 0, z: 10 },
    runtime.room.blockers,
    {
      radius: 0.65,
      reserved: [{ x: runtime.player.x, z: runtime.player.z }],
      minimumReservedDistance: 4,
    },
  );
  runtime.enemies.splice(0, runtime.enemies.length, {
    id: "training-dummy",
    name: "Eğitim Mankeni",
    commander: false,
    archetype: "infantry",
    speedMultiplier: 0,
    weaponId: "powder_rifle",
    color: "#92715a",
    ...dummyPosition,
    floorHeight: 0,
    hp: 1_000_000,
    maxHp: 1_000_000,
    damage: 0,
    score: 0,
    alive: true,
    mode: "cover",
    awareness: 1,
    brainAt: Number.POSITIVE_INFINITY,
    perceptionAt: Number.POSITIVE_INFINITY,
    lineOfSightBlocked: false,
    moveVelocityX: 0,
    moveVelocityZ: 0,
    movementBlockers: [],
    nextShotAt: Number.POSITIVE_INFINITY,
    coverX: dummyPosition.x,
    coverZ: dummyPosition.z,
    hitUntil: 0,
    hitFlashUntil: 0,
    hitKneeUntil: 0,
    hitKnockbackX: 0,
    hitKnockbackZ: 0,
    doorApproachX: 0,
    doorApproachZ: 0,
    deathYaw: 0,
  });
  runtime.healingPoints.length = 0;
  runtime.armorPoints.length = 0;
  return runtime;
}

function circleHitsBlocker(
  x: number,
  z: number,
  radius: number,
  blocker: WarRoomBlocker,
  floorHeight = 0,
  jumpHeight = 0,
) {
  if (blocker.kind === "platform") return false;
  const baseY = blocker.baseY ?? 0;
  const bodyHeight = 1.8;
  const actorBaseY = floorHeight + jumpHeight;
  if (actorBaseY >= baseY + blocker.height || actorBaseY + bodyHeight <= baseY) return false;
  const closestX = Math.max(blocker.x - blocker.width / 2, Math.min(blocker.x + blocker.width / 2, x));
  const closestZ = Math.max(blocker.z - blocker.depth / 2, Math.min(blocker.z + blocker.depth / 2, z));
  return (x - closestX) ** 2 + (z - closestZ) ** 2 < radius ** 2;
}

export function moveWarRoomEntity(
  x: number,
  z: number,
  dx: number,
  dz: number,
  radius = WAR_ROOM_PLAYER_COLLISION_RADIUS,
  blockers: readonly WarRoomBlocker[] = WAR_ROOM_BLOCKERS,
  floorHeight = 0,
  jumpHeight = 0,
  result?: { x: number; z: number },
) {
  const limit = WAR_ROOM_HALF_SIZE - radius - 1;
  let nextX = x;
  let nextZ = z;
  const distance = Math.hypot(dx, dz);
  const steps = Math.max(1, Math.ceil(distance / WAR_ROOM_COLLISION_STEP_DISTANCE));
  const stepX = dx / steps;
  const stepZ = dz / steps;

  for (let index = 0; index < steps; index += 1) {
    const candidateX = Math.max(-limit, Math.min(limit, nextX + stepX));
    const candidateZ = Math.max(-limit, Math.min(limit, nextZ + stepZ));
    let blockedX = false;
    for (const blocker of blockers) {
      if (circleHitsBlocker(
        candidateX,
        nextZ,
        radius,
        blocker,
        floorHeight,
        jumpHeight,
      )) {
        blockedX = true;
        break;
      }
    }
    if (!blockedX) {
      nextX = candidateX;
    }
    const candidateZAfterX = Math.max(-limit, Math.min(limit, nextZ + stepZ));
    let blockedZ = false;
    for (const blocker of blockers) {
      if (circleHitsBlocker(
        nextX,
        candidateZAfterX,
        radius,
        blocker,
        floorHeight,
        jumpHeight,
      )) {
        blockedZ = true;
        break;
      }
    }
    if (!blockedZ) {
      nextZ = candidateZAfterX;
    }
  }

  if (result) {
    result.x = nextX;
    result.z = nextZ;
    return result;
  }
  return { x: nextX, z: nextZ };
}

export type WarRoomPoint3 = { x: number; y: number; z: number };

export function segmentBlockFraction(
  start: WarRoomPoint3,
  end: WarRoomPoint3,
  padding = 0,
  blockers: readonly WarRoomBlocker[] = WAR_ROOM_BLOCKERS,
) {
  let nearest = Number.POSITIVE_INFINITY;
  for (const blocker of blockers) {
    const bounds = [
      [blocker.x - blocker.width / 2 - padding, blocker.x + blocker.width / 2 + padding],
      [blocker.baseY ?? 0, (blocker.baseY ?? 0) + blocker.height + padding],
      [blocker.z - blocker.depth / 2 - padding, blocker.z + blocker.depth / 2 + padding],
    ] as const;
    const origins = [start.x, start.y, start.z];
    const deltas = [end.x - start.x, end.y - start.y, end.z - start.z];
    let minimum = 0;
    let maximum = 1;
    let intersects = true;
    for (let axis = 0; axis < 3; axis += 1) {
      const [low, high] = bounds[axis];
      const origin = origins[axis];
      const delta = deltas[axis];
      if (Math.abs(delta) < 1e-8) {
        if (origin < low || origin > high) {
          intersects = false;
          break;
        }
        continue;
      }
      const first = (low - origin) / delta;
      const second = (high - origin) / delta;
      minimum = Math.max(minimum, Math.min(first, second));
      maximum = Math.min(maximum, Math.max(first, second));
      if (minimum > maximum) {
        intersects = false;
        break;
      }
    }
    if (intersects && minimum > 0.015 && minimum < nearest) nearest = minimum;
  }
  return Number.isFinite(nearest) ? nearest : null;
}

export function getNearestWarRoomCover(
  x: number,
  z: number,
  coverSpots: readonly { x: number; z: number }[] = WAR_ROOM_COVER_SPOTS,
) {
  return coverSpots
    .map((cover) => ({ ...cover, distance: Math.hypot(cover.x - x, cover.z - z) }))
    .sort((left, right) => left.distance - right.distance)[0];
}

export function getWarRoomRemaining(runtime: WarRoomRuntime) {
  let remaining = 0;
  for (const enemy of runtime.enemies) {
    if (enemy.alive) remaining += 1;
  }
  return remaining;
}

export function getNearbyWarRoomLootChest(
  runtime: WarRoomRuntime,
  maxDistance = 2.35,
) {
  const { player } = runtime;
  const chest = runtime.lootChests
    .filter((candidate) => (
      !candidate.opened
      && Math.abs(candidate.floorHeight - player.floorHeight) <= 0.9
      && Math.hypot(candidate.x - player.x, candidate.z - player.z) <= maxDistance
    ))
    .sort((left, right) => (
      Math.hypot(left.x - player.x, left.z - player.z)
      - Math.hypot(right.x - player.x, right.z - player.z)
    ))[0];
  if (!chest) return null;

  const weapon = WAR_ROOM_WEAPON_BY_ID.get(chest.weaponId);
  return {
    chest,
    label: chest.kind === "weapon" ? "Silah sandığı" : "Cephane sandığı",
    contents: chest.kind === "weapon"
      ? `${weapon?.name ?? "Silah"} · ${chest.ammo} mermi`
      : `+${chest.ammo} mermi · ${WAR_ROOM_WEAPON_BY_ID.get(player.weaponSlots[player.activeSlot])?.name ?? "aktif silah"}`,
  };
}

export function applyWarRoomLootChest(
  player: WarRoomRuntime["player"],
  chest: WarRoomLootChest,
) {
  if (chest.kind === "weapon") {
    const existingSlot = player.weaponSlots.indexOf(chest.weaponId);
    const slot = existingSlot >= 0
      ? existingSlot
      : player.activeSlot === 0 ? 1 : 0;
    player.weaponSlots[slot] = chest.weaponId;
    player.activeSlot = slot as 0 | 1;
    const weapon = WAR_ROOM_WEAPON_BY_ID.get(chest.weaponId)!;
    player.ammo[chest.weaponId] = {
      magazine: weapon.magazine,
      reserve: Math.min(weapon.reserve * 2, chest.ammo),
    };
    return `${weapon.name} alındı · ${chest.ammo} mermi`;
  }

  let slot = player.activeSlot;
  let weaponId = player.weaponSlots[slot];
  let weapon = WAR_ROOM_WEAPON_BY_ID.get(weaponId)!;
  if (weapon.weaponClass === "melee") {
    const otherSlot = slot === 0 ? 1 : 0;
    const otherId = player.weaponSlots[otherSlot];
    const otherWeapon = WAR_ROOM_WEAPON_BY_ID.get(otherId)!;
    if (otherWeapon.weaponClass !== "melee") {
      slot = otherSlot;
      weaponId = otherId;
      weapon = otherWeapon;
    } else {
      slot = otherSlot;
      weaponId = "sidearm";
      weapon = WAR_ROOM_WEAPON_BY_ID.get(weaponId)!;
      player.weaponSlots[slot] = weaponId;
      player.ammo[weaponId] = { magazine: weapon.magazine, reserve: 0 };
    }
    player.activeSlot = slot as 0 | 1;
  }
  const ammo = player.ammo[weaponId] ?? { magazine: weapon.magazine, reserve: 0 };
  const reserve = Math.min(weapon.reserve * 2, ammo.reserve + chest.ammo);
  player.ammo[weaponId] = { ...ammo, reserve };
  return `+${reserve - ammo.reserve} mermi · ${weapon.name}`;
}

export function nextWarRoomRandom(runtime: WarRoomRuntime) {
  let value = (runtime.player.rngState + 0x6d2b79f5) | 0;
  runtime.player.rngState = value;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
}
