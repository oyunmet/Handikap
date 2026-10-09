export type StoreCategory = "weapons" | "armor" | "capes" | "effects" | "dyes";
export type StoreTab = StoreCategory | "inventory";
export type EquipmentSlot = "weapon" | "armor" | "cape" | "effect" | "dye";
export type ItemRarity = "common" | "rare" | "epic" | "legendary";

export type EquipmentStatBonuses = {
  health: number;
  damage: number;
  defense: number;
  critChance: number;
  moveSpeed: number;
  lightRadius: number;
  attackSpeed: number;
  attackRange: number;
};

export type EquipmentVisual = {
  armor?: string;
  armorLight?: string;
  armorDark?: string;
  trim?: string;
  cape?: string;
  capeLength?: number;
  armorStyle?: "ash" | "watch" | "royal" | "shadow";
  weaponStyle?: "sword" | "daggers" | "axe" | "greatsword" | "spear";
  weaponColor?: string;
  auraColor?: string;
  trailColor?: string;
  dustColor?: string;
  dyeColor?: string;
};

export type StoreItem = {
  id: string;
  name: string;
  category: StoreCategory;
  slot: EquipmentSlot;
  rarity: ItemRarity;
  description: string;
  summary: string;
  price: { gold: number; diamonds: number };
  stats: Partial<EquipmentStatBonuses>;
  upgradeable: boolean;
  visual: EquipmentVisual;
};

export type EquipmentLoadout = {
  weaponId: string;
  armorId: string;
  capeId: string;
  effectId: string;
  dyeId: string;
};

export type PlayerInventory = {
  ownedItemIds: string[];
  upgrades: Record<string, number>;
  newItemIds: string[];
};

export type PlayerCombatModifiers = {
  maxHealth: number;
  damageMultiplier: number;
  defenseReduction: number;
  criticalChance: number;
  moveSpeedMultiplier: number;
  attackSpeedMultiplier: number;
  attackRangeBonus: number;
};

export type UpgradeCost = {
  gold: number;
  ironShards: number;
  emberCrystals: number;
  sealFragments: number;
};

export const MAX_UPGRADE_LEVEL = 5;

export function getUpgradeCost(slot: EquipmentSlot, currentLevel: number): UpgradeCost {
  const level = Math.max(0, Math.min(MAX_UPGRADE_LEVEL - 1, Math.floor(currentLevel)));
  return {
    gold: 100 + level * 85,
    ironShards: slot === "weapon" ? 1 + Math.floor(level / 2) : 1,
    emberCrystals: 1 + Math.floor(level / 2),
    sealFragments: level >= 2 ? 1 + Math.floor((level - 2) / 2) : 0,
  };
}

export function getUpgradeBonuses(slot: EquipmentSlot): Partial<EquipmentStatBonuses> {
  if (slot === "weapon") return { damage: 0.018, attackSpeed: 0.006, attackRange: 0.015 };
  if (slot === "armor") return { health: 2, defense: 0.012 };
  return {};
}
