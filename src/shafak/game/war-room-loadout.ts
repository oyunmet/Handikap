import { getStoreItem } from "./store-catalog";
import type { PlayerProfile } from "./profile";
import { getWeaponDefinition } from "./weapons";
import { WAR_ROOM_WEAPON_BY_ID, type WarRoomWeaponId } from "./war-room-data";

export const DEFAULT_WAR_ROOM_LOADOUT: readonly [WarRoomWeaponId, WarRoomWeaponId] = [
  "powder_rifle",
  "crossbow",
];

export function isWarRoomWeaponOwned(weaponId: WarRoomWeaponId, ownedItemIds: readonly string[]) {
  const weapon = WAR_ROOM_WEAPON_BY_ID.get(weaponId);
  return Boolean(weapon && (!weapon.storeItemId || ownedItemIds.includes(weapon.storeItemId)));
}

function getWarRoomWeaponId(itemId: string): WarRoomWeaponId | null {
  const roomWeaponId = getStoreItem(itemId)?.warRoomWeaponId;
  if (roomWeaponId && WAR_ROOM_WEAPON_BY_ID.has(roomWeaponId as WarRoomWeaponId)) {
    return roomWeaponId as WarRoomWeaponId;
  }
  const definition = getWeaponDefinition(itemId);
  if (definition?.animationId === "bow-shot") return "longbow";
  if (definition?.animationId === "crossbow-shot") return "crossbow";

  const style = getStoreItem(itemId)?.visual.weaponStyle;
  if (style === "bow") return "longbow";
  if (style === "crossbow") return "crossbow";
  return null;
}

export function getWarRoomLoadoutFromProfile(
  profile: Pick<PlayerProfile, "equipment" | "inventory">,
): [WarRoomWeaponId, WarRoomWeaponId] {
  const owned = new Set(profile.inventory.ownedItemIds);
  const candidates = [
    profile.equipment.weaponId,
    profile.inventory.secondaryWeaponId,
    ...profile.inventory.ownedItemIds,
  ].filter((id): id is string => Boolean(id && owned.has(id)));
  const available = [...new Set(candidates
    .map(getWarRoomWeaponId)
    .filter((id): id is WarRoomWeaponId => id !== null))];

  if (available.length === 0) return [...DEFAULT_WAR_ROOM_LOADOUT];
  const primary = available[0];
  const secondary = available.find((id) => id !== primary)
    ?? (primary === DEFAULT_WAR_ROOM_LOADOUT[0]
      ? DEFAULT_WAR_ROOM_LOADOUT[1]
      : DEFAULT_WAR_ROOM_LOADOUT[0]);
  return [primary, secondary];
}
