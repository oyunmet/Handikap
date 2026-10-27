import type { WarRoomEnemy } from "./war-room-engine";

export const WAR_ROOM_HEAVY_ATTACK_HOLD_SECONDS = 0.35;
export const WAR_ROOM_MELEE_ASSIST_RADIANS = (65 * Math.PI) / 180;
export const WAR_ROOM_COMBO_RESET_SECONDS = 1.15;
type WarRoomMeleeAssistTarget = Pick<WarRoomEnemy, "x" | "z" | "alive">
  & Partial<Pick<WarRoomEnemy, "commander">>;

export type WarRoomMeleeAttackPlan = {
  heavy: boolean;
  comboIndex: 0 | 1 | 2;
  nextComboIndex: 0 | 1 | 2;
  damageMultiplier: number;
  durationMultiplier: number;
  hitStopSeconds: number;
  lungeMeters: number;
  staminaCost: number;
  staggerSeconds: number;
};

export function getWarRoomMeleeAttackPlan(
  holdSeconds: number,
  comboIndex: number,
  enabled = true,
): WarRoomMeleeAttackPlan {
  const heavy = enabled && holdSeconds >= WAR_ROOM_HEAVY_ATTACK_HOLD_SECONDS;
  const combo = (Math.max(0, Math.floor(comboIndex)) % 3) as 0 | 1 | 2;
  return {
    heavy,
    comboIndex: heavy ? 2 : combo,
    nextComboIndex: heavy ? 0 : ((combo + 1) % 3) as 0 | 1 | 2,
    damageMultiplier: heavy ? 1.12 : 1,
    durationMultiplier: heavy ? 1.2 : 1,
    hitStopSeconds: heavy ? 0.09 : 0.05,
    lungeMeters: heavy ? 0.48 : 0.34,
    staminaCost: heavy ? 7 : 3,
    staggerSeconds: heavy ? 0.24 : 0.18,
  };
}

export function getWarRoomMeleeAssistYaw<T extends WarRoomMeleeAssistTarget>(
  x: number,
  z: number,
  yaw: number,
  enemies: readonly T[],
  range: number,
  isBlocked: (enemy: T) => boolean = () => false,
) {
  const candidates = enemies
    .filter((enemy) => enemy.alive && !isBlocked(enemy))
    .map((enemy) => {
      const centerDistance = Math.hypot(enemy.x - x, enemy.z - z);
      const distance = Math.max(0, centerDistance - (enemy.commander ? 0.38 : 0.3));
      const targetYaw = Math.atan2(enemy.x - x, -(enemy.z - z));
      return { distance, delta: Math.atan2(Math.sin(targetYaw - yaw), Math.cos(targetYaw - yaw)) };
    })
    .filter((candidate) => candidate.distance <= range
      && Math.abs(candidate.delta) <= WAR_ROOM_MELEE_ASSIST_RADIANS)
    .sort((left, right) => left.distance - right.distance);
  const target = candidates[0];
  if (!target) return yaw;
  const correction = Math.max(
    -WAR_ROOM_MELEE_ASSIST_RADIANS,
    Math.min(WAR_ROOM_MELEE_ASSIST_RADIANS, target.delta),
  );
  return yaw + correction;
}
