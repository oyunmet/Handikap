import { WAR_ROOM_WEAPON_BY_ID, type WarRoomWeaponId } from "./war-room-data";

export const WAR_ROOM_ENEMY_DEATH_FADE_SECONDS = 1.5;
export const WAR_ROOM_LAST_ENEMY_SLOW_MOTION_SECONDS = 0.8;
export const WAR_ROOM_COMMANDER_TELEGRAPH_SECONDS = 0.45;
export const WAR_ROOM_ENEMY_HIT_FLASH_SECONDS = 0.24;

export function getWarRoomVisualKnockbackDistance(weaponId: WarRoomWeaponId, heavy: boolean) {
  const weapon = WAR_ROOM_WEAPON_BY_ID.get(weaponId);
  if (!weapon || weapon.weaponClass !== "melee") return 0.3;
  const length = weapon.normalizeLength ?? weapon.range;
  const distance = length * 0.48 + (heavy ? 0.12 : 0);
  return Math.max(0.3, Math.min(1, distance));
}

export function getWarRoomCommanderTelegraphProgress(
  commander: boolean,
  now: number,
  nextAttackAt: number,
  duration = WAR_ROOM_COMMANDER_TELEGRAPH_SECONDS,
) {
  const remaining = nextAttackAt - now;
  if (!commander || remaining < 0 || remaining > duration) return null;
  return Math.max(0, Math.min(1, 1 - remaining / duration));
}

export function getWarRoomDeathFadeProgress(now: number, startedAt: number) {
  return Math.max(0, Math.min(1, (now - startedAt) / WAR_ROOM_ENEMY_DEATH_FADE_SECONDS));
}

export function getWarRoomHitRimIntensity(now: number, until: number) {
  const remaining = until - now;
  if (remaining <= 0) return 0;
  return Math.max(0, Math.min(1, remaining / WAR_ROOM_ENEMY_HIT_FLASH_SECONDS));
}
