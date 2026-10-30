export type WarRoomHealingPointConfig = {
  id: string;
  x: number;
  z: number;
};

export type WarRoomRestoreConfig = {
  enabled: boolean;
  passive: {
    delaySeconds: number;
    hpPerSecond: number;
    maxHealthRatio: number;
  };
  kill: {
    normalHealthRatio: number;
    minimumHp: number;
    commanderHealthRatio: number;
  };
  pickup: {
    healthRatio: number;
    radiusMeters: number;
    respawnSeconds: number;
  };
  healingPoints: readonly WarRoomHealingPointConfig[];
};

export const RESTORE_CONFIG: WarRoomRestoreConfig = {
  enabled: true,
  passive: {
    delaySeconds: 6,
    hpPerSecond: 2,
    maxHealthRatio: 0.6,
  },
  kill: {
    normalHealthRatio: 0.05,
    minimumHp: 6,
    commanderHealthRatio: 0.15,
  },
  pickup: {
    healthRatio: 0.25,
    radiusMeters: 1.4,
    respawnSeconds: 45,
  },
  healingPoints: [
    { id: "heal-west", x: -20, z: -5 },
    { id: "heal-east", x: 21.5, z: -5 },
    { id: "heal-south-west", x: -11, z: 17 },
    { id: "heal-south-east", x: 11, z: 17 },
  ],
};

export type WarRoomHealingPoint = WarRoomHealingPointConfig & {
  availableAt: number;
};

export type WarRoomRestorablePlayer = {
  hp: number;
  maxHp: number;
  lastDamageAt: number;
  lastCombatAt: number;
};

export function createWarRoomHealingPoints(
  now = 0,
  config: WarRoomRestoreConfig = RESTORE_CONFIG,
): WarRoomHealingPoint[] {
  return config.healingPoints.map((point) => ({ ...point, availableAt: now }));
}

export function advanceWarRoomPassiveRegen(
  player: WarRoomRestorablePlayer,
  now: number,
  deltaSeconds: number,
  config: WarRoomRestoreConfig = RESTORE_CONFIG,
) {
  if (!config.enabled) return { active: false, secondsUntilReady: 0 };
  const cap = player.maxHp * config.passive.maxHealthRatio;
  if (player.hp >= cap) return { active: false, secondsUntilReady: 0 };

  const readyAt = Math.max(player.lastDamageAt, player.lastCombatAt) + config.passive.delaySeconds;
  const secondsUntilReady = Math.max(0, readyAt - now);
  if (secondsUntilReady > 0) return { active: false, secondsUntilReady };

  const before = player.hp;
  player.hp = Math.min(
    cap,
    player.hp + config.passive.hpPerSecond * Math.max(0, deltaSeconds),
  );
  return { active: player.hp > before, secondsUntilReady: 0 };
}

export function healWarRoomPlayer(
  player: Pick<WarRoomRestorablePlayer, "hp" | "maxHp">,
  requestedHp: number,
) {
  const before = player.hp;
  player.hp = Math.min(player.maxHp, player.hp + Math.max(0, requestedHp));
  return player.hp - before;
}

export function applyWarRoomKillHeal(
  player: Pick<WarRoomRestorablePlayer, "hp" | "maxHp">,
  commander: boolean,
  config: WarRoomRestoreConfig = RESTORE_CONFIG,
) {
  if (!config.enabled) return 0;
  const requestedHp = commander
    ? player.maxHp * config.kill.commanderHealthRatio
    : Math.max(
      config.kill.minimumHp,
      player.maxHp * config.kill.normalHealthRatio,
    );
  return healWarRoomPlayer(player, requestedHp);
}

export function collectWarRoomHealingPoint(
  points: WarRoomHealingPoint[],
  player: Pick<WarRoomRestorablePlayer, "hp" | "maxHp">,
  playerX: number,
  playerZ: number,
  now: number,
  config: WarRoomRestoreConfig = RESTORE_CONFIG,
) {
  if (!config.enabled) return { point: null, healed: 0 };
  const point = points.find((candidate) => (
    candidate.availableAt <= now
    && Math.hypot(candidate.x - playerX, candidate.z - playerZ) <= config.pickup.radiusMeters
  ));
  if (!point) return { point: null, healed: 0 };

  const healed = healWarRoomPlayer(player, player.maxHp * config.pickup.healthRatio);
  if (healed <= 0) return { point: null, healed: 0 };
  point.availableAt = now + config.pickup.respawnSeconds;
  return { point, healed };
}
