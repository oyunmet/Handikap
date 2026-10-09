import type { PlayerProfileRecord } from "./profileApi";
import type {
  EquipmentStatBonuses,
  PlayerCombatModifiers,
} from "../src/shafak/game/store-types";
import { getUpgradeBonuses, MAX_UPGRADE_LEVEL } from "../src/shafak/game/store-types";
import {
  DEFAULT_EQUIPMENT,
  getStoreItem,
  STARTER_ITEM_IDS,
  STORE_CATALOG,
} from "../src/shafak/game/store-catalog";

export { DEFAULT_EQUIPMENT, getStoreItem, STARTER_ITEM_IDS, STORE_CATALOG };

export function calculatePlayerCombatModifiers(profile: PlayerProfileRecord): PlayerCombatModifiers {
  const bonuses: EquipmentStatBonuses = {
    health: 0,
    damage: 0,
    defense: 0,
    critChance: 0,
    moveSpeed: 0,
    lightRadius: 0,
    attackSpeed: 0,
    attackRange: 0,
  };
  const equipped = [
    profile.equipment.weaponId,
    profile.equipment.armorId,
    profile.equipment.capeId,
    profile.equipment.effectId,
    profile.equipment.dyeId,
  ];
  for (const itemId of equipped) {
    const equippedItem = getStoreItem(itemId);
    if (!equippedItem || !profile.inventory.ownedItemIds.includes(equippedItem.id)) continue;
    addBonuses(bonuses, equippedItem.stats);
    const level = Math.min(MAX_UPGRADE_LEVEL, profile.inventory.upgrades[equippedItem.id] ?? 0);
    if (level > 0 && equippedItem.upgradeable) {
      const step = getUpgradeBonuses(equippedItem.slot);
      for (const [key, value] of Object.entries(step) as [keyof EquipmentStatBonuses, number][]) {
        bonuses[key] += value * level;
      }
    }
  }
  return {
    maxHealth: Math.max(130, Math.min(175, 150 + bonuses.health)),
    damageMultiplier: Math.max(0.82, Math.min(1.35, 1 + bonuses.damage)),
    defenseReduction: Math.max(0, Math.min(0.24, bonuses.defense)),
    criticalChance: Math.max(0.08, Math.min(0.28, 0.12 + bonuses.critChance)),
    moveSpeedMultiplier: Math.max(0.88, Math.min(1.14, 1 + bonuses.moveSpeed)),
    attackSpeedMultiplier: Math.max(0.8, Math.min(1.22, 1 + bonuses.attackSpeed)),
    attackRangeBonus: Math.max(-0.3, Math.min(0.8, bonuses.attackRange)),
  };
}

function addBonuses(target: EquipmentStatBonuses, source: Partial<EquipmentStatBonuses>) {
  for (const [key, value] of Object.entries(source) as [keyof EquipmentStatBonuses, number][]) {
    if (Number.isFinite(value)) target[key] += value;
  }
}
