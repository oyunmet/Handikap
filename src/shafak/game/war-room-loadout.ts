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

  const primarySaved = getOwnedWarRoomWeapon(profile.inventory.warRoomPrimaryWeaponId, owned);
  const secondarySaved = getOwnedWarRoomWeapon(profile.inventory.warRoomSecondaryWeaponId, owned);
  const primary = primarySaved
    ?? available.find((id) => id !== secondarySaved)
    ?? DEFAULT_WAR_ROOM_LOADOUT[0];
  const secondary = secondarySaved && secondarySaved !== primary
    ? secondarySaved
    : available.find((id) => id !== primary)
    ?? (primary === DEFAULT_WAR_ROOM_LOADOUT[0]
      ? DEFAULT_WAR_ROOM_LOADOUT[1]
      : DEFAULT_WAR_ROOM_LOADOUT[0]);
  return [primary, secondary];
}

function getOwnedWarRoomWeapon(value: string | null | undefined, owned: ReadonlySet<string>) {
  if (!value || !WAR_ROOM_WEAPON_BY_ID.has(value as WarRoomWeaponId)) return null;
  const weaponId = value as WarRoomWeaponId;
  const weapon = WAR_ROOM_WEAPON_BY_ID.get(weaponId);
  return weapon && (!weapon.storeItemId || owned.has(weapon.storeItemId)) ? weaponId : null;
}

export function getWarRoomLoadoutAssignment(
  profile: Pick<PlayerProfile, "equipment" | "inventory">,
  weaponId: WarRoomWeaponId,
  slotIndex: 0 | 1,
) {
  if (!isWarRoomWeaponOwned(weaponId, profile.inventory.ownedItemIds)) {
    throw new Error("war_room_weapon_not_owned");
  }
  const next: [WarRoomWeaponId, WarRoomWeaponId] = [...getWarRoomLoadoutFromProfile(profile)];
  const otherSlot = slotIndex === 0 ? 1 : 0;
  if (next[otherSlot] === weaponId) next[otherSlot] = next[slotIndex];
  next[slotIndex] = weaponId;
  return {
    warRoomPrimaryWeaponId: next[0],
    warRoomSecondaryWeaponId: next[1],
  };
}
