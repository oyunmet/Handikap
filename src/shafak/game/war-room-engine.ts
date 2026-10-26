import {
  WAR_ROOM_BLOCKERS,
  WAR_ROOM_COMMANDER,
  WAR_ROOM_COVER_SPOTS,
  WAR_ROOM_ENEMY_SPAWNS,
  WAR_ROOM_HALF_SIZE,
  WAR_ROOM_WEAPON_BY_ID,
  type WarRoomWeaponId,
} from "./war-room-data";

export type WarRoomEnemy = {
  id: string;
  name: string;
  commander: boolean;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  damage: number;
  alive: boolean;
  mode: "approach" | "fire" | "cover";
  brainAt: number;
  nextShotAt: number;
  coverX: number;
  coverZ: number;
  hitUntil: number;
  hitKnockbackX: number;
  hitKnockbackZ: number;
  deathYaw: number;
};

export type WarRoomAmmo = { magazine: number; reserve: number };

export type WarRoomRuntime = {
  player: {
    x: number;
    z: number;
    yaw: number;
    pitch: number;
    hp: number;
    maxHp: number;
    stamina: number;
    maxStamina: number;
    jumpHeight: number;
    jumpVelocity: number;
    dodgeUntil: number;
    dodgeX: number;
    dodgeZ: number;
    invulnerableUntil: number;
    crouched: boolean;
    ammo: Partial<Record<WarRoomWeaponId, WarRoomAmmo>>;
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
    damageDirection: number;
    hitMarkerUntil: number;
    hitMarkerHeadshot: boolean;
    lastHitDamage: number;
    hitMessageUntil: number;
    lastHitText: string;
    clockTime: number;
    killFeed: Array<{ id: number; text: string }>;
    targetId: string | null;
    rngState: number;
    startTime: number;
  };
  enemies: WarRoomEnemy[];
};

export type WarRoomInputState = {
  keys: Set<string>;
  moveX: number;
  moveY: number;
  yaw: number;
  pitch: number;
  fireHeld: boolean;
  firePressed: boolean;
  fireReleased: boolean;
  aimHeld: boolean;
  reloadPressed: boolean;
  swapPressed: boolean;
  jumpPressed: boolean;
  dodgePressed: boolean;
  crouchPressed: boolean;
  paused: boolean;
};

export type WarRoomHudSnapshot = {
  player: { x: number; z: number; yaw: number; hp: number; maxHp: number; stamina: number; maxStamina: number };
  enemies: Array<{ id: string; x: number; z: number; alive: boolean; commander: boolean }>;
  remaining: number;
  bossHp: number;
  bossMaxHp: number;
  kills: number;
  headshots: number;
  shots: number;
  hits: number;
  elapsedSeconds: number;
  weaponId: WarRoomWeaponId;
  magazine: number;
  reserve: number;
  reloading: boolean;
  aiming: boolean;
  firing: boolean;
  targetVisible: boolean;
  hitMarker: boolean;
  headshotMarker: boolean;
  damageVignette: boolean;
  damageDirection: number;
  lastHitDamage: number;
  hitMessage: string;
  killFeed: Array<{ id: number; text: string }>;
  crouched: boolean;
  meleePhase: "HAZIR" | "HAZIRLIK" | "VURUŞ" | "TOPARLAN";
  meleeComboCount: number;
  meleeLastResult: string;
};

export type DamageTarget = { hp: number; maxHp: number };

export function applyWarRoomDamage(target: DamageTarget, baseDamage: number, multiplier = 1) {
  const before = Math.max(0, target.hp);
  const damage = Math.max(0, Math.round(baseDamage * Math.max(0, multiplier)));
  target.hp = Math.max(0, before - damage);
  return { damage: before - target.hp, killed: before > 0 && target.hp <= 0 };
}

export function shortestAngleDelta(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

export function createWarRoomRuntime(
  weaponIds: readonly [WarRoomWeaponId, WarRoomWeaponId],
  now = 0,
): WarRoomRuntime {
  const enemies: WarRoomEnemy[] = WAR_ROOM_ENEMY_SPAWNS.map((spawn, index) => {
    const cover = WAR_ROOM_COVER_SPOTS[index % WAR_ROOM_COVER_SPOTS.length];
    return {
      ...spawn,
      commander: false,
      hp: 90,
      maxHp: 90,
      damage: 9,
      alive: true,
      mode: "approach",
      brainAt: 0,
      nextShotAt: 1.3 + index * 0.19,
      coverX: cover.x,
      coverZ: cover.z,
      hitUntil: 0,
      hitKnockbackX: 0,
      hitKnockbackZ: 0,
      deathYaw: 0,
    };
  });
  enemies.push({
    id: WAR_ROOM_COMMANDER.id,
    name: WAR_ROOM_COMMANDER.name,
    commander: true,
    x: WAR_ROOM_COMMANDER.x,
    z: WAR_ROOM_COMMANDER.z,
    hp: WAR_ROOM_COMMANDER.hp,
    maxHp: WAR_ROOM_COMMANDER.hp,
    damage: WAR_ROOM_COMMANDER.damage,
    alive: true,
    mode: "approach",
    brainAt: 0,
    nextShotAt: 2.6,
    coverX: 0,
    coverZ: -21,
    hitUntil: 0,
    hitKnockbackX: 0,
    hitKnockbackZ: 0,
    deathYaw: 0,
  });

  const ammo: WarRoomRuntime["player"]["ammo"] = {};
  for (const id of new Set(weaponIds)) {
    const weapon = WAR_ROOM_WEAPON_BY_ID.get(id);
    if (weapon && weapon.weaponClass !== "melee") {
      ammo[id] = { magazine: weapon.magazine, reserve: weapon.reserve };
    }
  }

  return {
    player: {
      x: 0,
      z: 24,
      yaw: 0,
      pitch: -0.08,
      hp: 220,
      maxHp: 220,
      stamina: 100,
      maxStamina: 100,
      jumpHeight: 0,
      jumpVelocity: 0,
      dodgeUntil: 0,
      dodgeX: 0,
      dodgeZ: 0,
      invulnerableUntil: 0,
      crouched: false,
      ammo,
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
      damageDirection: 0,
      hitMarkerUntil: 0,
      hitMarkerHeadshot: false,
      lastHitDamage: 0,
      hitMessageUntil: 0,
      lastHitText: "",
      clockTime: now,
      killFeed: [],
      targetId: null,
      rngState: 0x6d2b79f5,
      startTime: now,
    },
    enemies,
  };
}

function circleHitsBlocker(x: number, z: number, radius: number, blocker: typeof WAR_ROOM_BLOCKERS[number]) {
  const closestX = Math.max(blocker.x - blocker.width / 2, Math.min(blocker.x + blocker.width / 2, x));
  const closestZ = Math.max(blocker.z - blocker.depth / 2, Math.min(blocker.z + blocker.depth / 2, z));
  return (x - closestX) ** 2 + (z - closestZ) ** 2 < radius ** 2;
}

export function moveWarRoomEntity(x: number, z: number, dx: number, dz: number, radius = 0.38) {
  const limit = WAR_ROOM_HALF_SIZE - radius - 1;
  let nextX = Math.max(-limit, Math.min(limit, x + dx));
  let nextZ = Math.max(-limit, Math.min(limit, z + dz));
  if (WAR_ROOM_BLOCKERS.some((blocker) => circleHitsBlocker(nextX, z, radius, blocker))) nextX = x;
  if (WAR_ROOM_BLOCKERS.some((blocker) => circleHitsBlocker(nextX, nextZ, radius, blocker))) nextZ = z;
  return { x: nextX, z: nextZ };
}

export type WarRoomPoint3 = { x: number; y: number; z: number };

export function segmentBlockFraction(start: WarRoomPoint3, end: WarRoomPoint3, padding = 0) {
  let nearest = Number.POSITIVE_INFINITY;
  for (const blocker of WAR_ROOM_BLOCKERS) {
    const bounds = [
      [blocker.x - blocker.width / 2 - padding, blocker.x + blocker.width / 2 + padding],
      [0, blocker.height + padding],
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

export function getNearestWarRoomCover(x: number, z: number) {
  return WAR_ROOM_COVER_SPOTS
    .map((cover) => ({ ...cover, distance: Math.hypot(cover.x - x, cover.z - z) }))
    .sort((left, right) => left.distance - right.distance)[0];
}

export function getWarRoomRemaining(runtime: WarRoomRuntime) {
  return runtime.enemies.filter((enemy) => enemy.alive).length;
}

export function nextWarRoomRandom(runtime: WarRoomRuntime) {
  let value = (runtime.player.rngState + 0x6d2b79f5) | 0;
  runtime.player.rngState = value;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
}
