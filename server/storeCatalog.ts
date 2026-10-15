import type { PlayerProfileRecord } from "./profileApi.ts";
import type {
  EquipmentStatBonuses,
  PlayerCombatModifiers,
} from "../src/shafak/game/store-types.ts";
import { getPlayerCombatModifiersFromBonuses } from "../src/shafak/game/store-balance.ts";
import { getUpgradeBonuses, MAX_UPGRADE_LEVEL } from "../src/shafak/game/store-types.ts";
import {
  DEFAULT_EQUIPMENT,
  getDailySpecials,
  getStoreItem,
  isDailySpecialAvailable,
  STARTER_ITEM_IDS,
  STORE_CATALOG,
} from "../src/shafak/game/store-catalog.ts";

export { DEFAULT_EQUIPMENT, getDailySpecials, getStoreItem, isDailySpecialAvailable, STARTER_ITEM_IDS, STORE_CATALOG };

export function calculatePlayerCombatModifiers(profile: PlayerProfileRecord, weaponOverride?: string): PlayerCombatModifiers {
  const bonuses: EquipmentStatBonuses = {
    health: 0,
    damage: 0,
    defense: 0,
    critChance: 0,
    critDamage: 0,
    dodge: 0,
    stamina: 0,
    moveSpeed: 0,
    lightRadius: 0,
    attackSpeed: 0,
    attackRange: 0,
  };
  const equipped = new Set([
    weaponOverride ?? profile.equipment.weaponId,
    profile.equipment.offhandId,
    profile.equipment.helmetId,
    profile.equipment.armorId,
    profile.equipment.glovesId,
    profile.equipment.bootsId,
    profile.equipment.capeId,
    profile.equipment.ringOneId,
    profile.equipment.ringTwoId,
    profile.equipment.effectId,
    profile.equipment.dyeId,
  ].filter((itemId): itemId is string => Boolean(itemId)));
  for (const itemId of equipped) {
    const equippedItem = getStoreItem(itemId);
    if (!equippedItem?.slot || !profile.inventory.ownedItemIds.includes(equippedItem.id)) continue;
    addBonuses(bonuses, equippedItem.stats);
    const level = Math.min(MAX_UPGRADE_LEVEL, profile.inventory.upgrades[equippedItem.id] ?? 0);
    if (level > 0 && equippedItem.upgradeable) {
      const step = getUpgradeBonuses(equippedItem.slot);
      for (const [key, value] of Object.entries(step) as [keyof EquipmentStatBonuses, number][]) {
        bonuses[key] += value * level;
      }
    }
  }
  return getPlayerCombatModifiersFromBonuses(bonuses);
}

function addBonuses(target: EquipmentStatBonuses, source: Partial<EquipmentStatBonuses>) {
  for (const [key, value] of Object.entries(source) as [keyof EquipmentStatBonuses, number][]) {
    if (Number.isFinite(value)) target[key] += value;
  }
}
