export type WarRoomBossAttack = "charge" | "summon" | "shockwave";
export type WarRoomBossPhase = 1 | 2 | 3;

export type WarRoomBossTelegraphState = {
  hp: number;
  maxHp: number;
  nextShotAt: number;
  bossAttack?: WarRoomBossAttack | null;
  bossAttackStartedAt?: number;
  bossAttackTargetX?: number;
  bossAttackTargetZ?: number;
  bossAttackResolved?: boolean;
  bossAttackPhase?: number;
};

const MAP_BOSS_ATTACKS: Record<string, readonly [WarRoomBossAttack, WarRoomBossAttack]> = {
  "stone-courtyard": ["charge", "shockwave"],
  "ember-gate": ["summon", "charge"],
  "frost-bastion": ["shockwave", "summon"],
  "black-rampart": ["charge", "summon"],
  "sunken-keep": ["summon", "shockwave"],
  "moonlit-citadel": ["shockwave", "charge"],
};

const TELEGRAPH_SECONDS: Record<WarRoomBossAttack, number> = {
  charge: 1,
  summon: 1.1,
  shockwave: 1.25,
};

const ATTACK_LABELS: Record<WarRoomBossAttack, string> = {
  charge: "HÜCUM",
  summon: "TAKVİYE ÇAĞIRIYOR",
  shockwave: "ŞOK DALGASI",
};

export function getWarRoomBossPhase(hp: number, maxHp: number) {
  if (!Number.isFinite(hp) || !Number.isFinite(maxHp) || maxHp <= 0) return 1 as const;
  const ratio = Math.max(0, Math.min(1, hp / maxHp));
  if (ratio <= 1 / 3) return 3 as const;
  if (ratio <= 2 / 3) return 2 as const;
  return 1 as const;
}

export function updateWarRoomBossTelegraph(
  state: WarRoomBossTelegraphState,
  mapId: string,
  now: number,
  target: { x: number; z: number },
) {
  const phase = getWarRoomBossPhase(state.hp, state.maxHp);
  if (phase >= 2) {
    const plannedAttack = getWarRoomBossAttack(mapId, phase);
    const telegraphSeconds = plannedAttack
      ? getWarRoomBossTelegraphSeconds(plannedAttack)
      : 0;
    if ((state.bossAttackPhase ?? 1) !== phase) {
      state.bossAttackPhase = phase;
      state.bossAttack = null;
      state.bossAttackResolved = false;
      if (plannedAttack) state.nextShotAt = now + telegraphSeconds;
    }
    if (
      plannedAttack
      && !state.bossAttack
      && now >= state.nextShotAt - telegraphSeconds
    ) {
      state.nextShotAt = Math.max(state.nextShotAt, now + telegraphSeconds);
      state.bossAttack = plannedAttack;
      state.bossAttackStartedAt = now;
      state.bossAttackTargetX = target.x;
      state.bossAttackTargetZ = target.z;
      state.bossAttackResolved = false;
    }
  } else {
    state.bossAttackPhase = 1;
    state.bossAttack = null;
    state.bossAttackResolved = false;
  }

  return {
    phase,
    attack: phase >= 2 ? state.bossAttack ?? null : null,
    telegraphing: phase >= 2 && Boolean(state.bossAttack) && now < state.nextShotAt,
  };
}

export function getWarRoomBossAttack(
  mapId: string,
  phase: number,
): WarRoomBossAttack | null {
  if (phase !== 2 && phase !== 3) return null;
  const profile = MAP_BOSS_ATTACKS[mapId] ?? ["charge", "shockwave"];
  return profile[phase - 2] ?? null;
}

export function getWarRoomBossTelegraphSeconds(attack: WarRoomBossAttack) {
  return TELEGRAPH_SECONDS[attack];
}

export function getWarRoomBossAttackLabel(attack: WarRoomBossAttack) {
  return ATTACK_LABELS[attack];
}

export function getWarRoomBossAttackDamage(baseDamage: number, attack: WarRoomBossAttack) {
  const safeDamage = Number.isFinite(baseDamage) ? Math.max(0, baseDamage) : 0;
  const multiplier = attack === "charge" ? 1.3 : attack === "shockwave" ? 1.15 : 0;
  return Math.max(0, Math.round(safeDamage * multiplier));
}

export const WAR_ROOM_BOSS_SHOCKWAVE_RADIUS = 6.2;
export const WAR_ROOM_BOSS_CHARGE_SPEED = 8.4;
export const WAR_ROOM_BOSS_CHARGE_SECONDS = 0.72;
export const WAR_ROOM_BOSS_SUMMON_COUNT = 2;
export const WAR_ROOM_BOSS_ATTACK_COOLDOWN_SECONDS = 3.5;

export function getWarRoomBossChargeStep(deltaSeconds: number) {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return 0;
  return Math.min(0.12, deltaSeconds) * WAR_ROOM_BOSS_CHARGE_SPEED;
}

export function getWarRoomBossShockwaveHits(
  distance: number,
  verticalGap: number,
  jumping: boolean,
) {
  return Number.isFinite(distance)
    && Number.isFinite(verticalGap)
    && distance <= WAR_ROOM_BOSS_SHOCKWAVE_RADIUS
    && verticalGap <= 1.1
    && !jumping;
}
