import { WAR_ROOM_WEAPONS } from "./war-room-data";

export type WarRoomLabWeapon = (typeof WAR_ROOM_WEAPONS)[number];

export function getNextWarRoomLabWeaponIndex(index: number) {
  const length = WAR_ROOM_WEAPONS.length;
  const current = ((Math.trunc(index) % length) + length) % length;
  return (current + 1) % length;
}

export function getWarRoomLabWeaponLength(weapon: WarRoomLabWeapon) {
  if (typeof weapon.normalizeLength === "number" && weapon.normalizeLength > 0) {
    return weapon.normalizeLength;
  }
  const dimensions = weapon.sourceBounds ?? weapon.modelSize;
  return dimensions ? Math.max(...dimensions) : weapon.range;
}
