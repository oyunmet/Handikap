import { WAR_ROOM_WEAPONS } from "./war-room-data";

export type WarRoomLabWeapon = (typeof WAR_ROOM_WEAPONS)[number];

export function getNextWarRoomLabWeaponIndex(index: number) {
  return (Math.trunc(index) + 1 + WAR_ROOM_WEAPONS.length) % WAR_ROOM_WEAPONS.length;
}

export function getWarRoomLabWeaponLength(weapon: WarRoomLabWeapon) {
  if (typeof weapon.normalizeLength === "number" && weapon.normalizeLength > 0) {
    return weapon.normalizeLength;
  }
  const dimensions = weapon.sourceBounds ?? weapon.modelSize;
  return dimensions ? Math.max(...dimensions) : weapon.range;
}
