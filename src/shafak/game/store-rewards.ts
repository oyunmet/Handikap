import { getStoreItem } from "./store-catalog.ts";
import type { PlayerInventory } from "./store-types.ts";

type LootReceiver = {
  items: string[];
  inventory: PlayerInventory;
  materials: {
    ironShards: number;
    emberCrystals: number;
    sealFragments: number;
  };
};

export function grantLootItem<T extends LootReceiver>(profile: T, itemId: string) {
  const storeItem = getStoreItem(itemId);
  if (!storeItem) {
    const alreadyOwned = profile.items.includes(itemId);
    const nextProfile = alreadyOwned
      ? profile
      : { ...profile, items: [...profile.items, itemId].slice(-30) };
    return {
      profile: nextProfile,
      displayName: itemId,
      itemId: null,
      salvaged: false,
    };
  }

  const alreadyOwned = profile.inventory.ownedItemIds.includes(storeItem.id);
  const atCapacity = profile.inventory.ownedItemIds.length >= 120;
  if (alreadyOwned || atCapacity) {
    return {
      profile: {
        ...profile,
        materials: { ...profile.materials, ironShards: Math.min(1_000_000_000, profile.materials.ironShards + 1) },
      },
      displayName: `${storeItem.name} · +1 Demir Kırığı`,
      itemId: storeItem.id,
      salvaged: true,
    };
  }

  return {
    profile: {
      ...profile,
      inventory: {
        ...profile.inventory,
        ownedItemIds: [...profile.inventory.ownedItemIds, storeItem.id],
        newItemIds: [...new Set([...profile.inventory.newItemIds, storeItem.id])].slice(-120),
      },
    },
    displayName: storeItem.name,
    itemId: storeItem.id,
    salvaged: false,
  };
}
