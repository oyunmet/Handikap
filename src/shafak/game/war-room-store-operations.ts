import type { PlayerProfile } from "./profile.ts";
import type { StoreItem } from "./store-types.ts";
import { WAR_ROOM_WEAPON_BY_ID, type WarRoomWeaponId } from "./war-room-data.ts";
import { getWarRoomLoadoutAssignment } from "./war-room-loadout.ts";

function getWarRoomWeaponId(item: StoreItem): WarRoomWeaponId {
  const weaponId = item.warRoomWeaponId;
  if (
    item.kind !== "equipment"
    || !weaponId
    || !WAR_ROOM_WEAPON_BY_ID.has(weaponId as WarRoomWeaponId)
  ) {
    throw new Error("item_not_war_room_weapon");
  }
  return weaponId as WarRoomWeaponId;
}

export function purchaseLocalWarRoomWeapon(
  profile: PlayerProfile,
  item: StoreItem,
): PlayerProfile {
  getWarRoomWeaponId(item);
  if (profile.inventory.ownedItemIds.includes(item.id)) throw new Error("item_already_owned");
  if (profile.inventory.ownedItemIds.length >= 120) throw new Error("inventory_full");
  if (profile.gold < item.price.gold || profile.diamonds < item.price.diamonds) {
    throw new Error("insufficient_funds");
  }

  return {
    ...profile,
    gold: profile.gold - item.price.gold,
    diamonds: profile.diamonds - item.price.diamonds,
    inventory: {
      ...profile.inventory,
      ownedItemIds: [...profile.inventory.ownedItemIds, item.id],
      newItemIds: [...new Set([...profile.inventory.newItemIds, item.id])],
    },
  };
}

export function assignLocalWarRoomWeapon(
  profile: PlayerProfile,
  item: StoreItem,
  slotIndex: 0 | 1,
): PlayerProfile {
  const weaponId = getWarRoomWeaponId(item);
  const assignment = getWarRoomLoadoutAssignment(profile, weaponId, slotIndex);
  return {
    ...profile,
    inventory: {
      ...profile.inventory,
      ...assignment,
      newItemIds: profile.inventory.newItemIds.filter((id) => id !== item.id),
    },
  };
}
