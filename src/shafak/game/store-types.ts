import type { CombatItemCounts, CombatItemId, CombatQuickSlots } from "./combat-items.ts";

export type StoreCategory = "weapons" | "armor" | "accessories" | "consumables" | "materials" | "specials";
export type StoreTab = StoreCategory | "inventory";
export type EquipmentSlot = "weapon" | "offhand" | "helmet" | "armor" | "gloves" | "boots" | "cape" | "ring" | "effect" | "dye";
export type ItemRarity = "common" | "rare" | "epic" | "legendary";
export type EquipmentLoadoutKey = keyof EquipmentLoadout;
export type StoreItemReward =
  | { type: "combat-item"; itemId: CombatItemId; amount: number }
  | { type: "material"; material: "ironShards" | "emberCrystals" | "sealFragments"; amount: number };

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
  helmetColor?: string;
  helmetStyle?: "open" | "horned" | "crest";
  gloveColor?: string;
  bootColor?: string;
  shieldColor?: string;
  shieldStyle?: "round" | "tower";
  ringColor?: string;
  trim?: string;
  cape?: string;
  capeLength?: number;
  armorStyle?: "ash" | "watch" | "royal" | "shadow";
  weaponStyle?: "sword" | "daggers" | "axe" | "greatsword" | "spear" | "bow" | "mace" | "staff";
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
  kind: "equipment" | "consumable" | "material";
  slot: EquipmentSlot | null;
  rarity: ItemRarity;
  description: string;
  summary: string;
  price: { gold: number; diamonds: number };
  stats: Partial<EquipmentStatBonuses>;
  upgradeable: boolean;
  visual: EquipmentVisual;
  requiredLevel?: number;
  setId?: string;
  dropOnly?: boolean;
  reward?: StoreItemReward;
  icon?: string;
  sellValue?: { gold: number; diamonds: number };
};

export function isStoreItemUnlocked(item: Pick<StoreItem, "requiredLevel">, playerLevel: number) {
  const requiredLevel = item.requiredLevel ?? 1;
  return Number.isFinite(playerLevel) && Math.floor(playerLevel) >= requiredLevel;
}

export type EquipmentLoadout = {
  weaponId: string;
  offhandId: string | null;
  helmetId: string | null;
  armorId: string;
  glovesId: string | null;
  bootsId: string | null;
  capeId: string;
  ringOneId: string | null;
  ringTwoId: string | null;
  effectId: string;
  dyeId: string;
};

export const EQUIPMENT_LOADOUT_KEYS = [
  "weaponId",
  "offhandId",
  "helmetId",
  "armorId",
  "glovesId",
  "bootsId",
  "capeId",
  "ringOneId",
  "ringTwoId",
  "effectId",
  "dyeId",
] as const satisfies readonly EquipmentLoadoutKey[];

export function getEquipmentLoadoutKey(
  slot: EquipmentSlot,
  ringKey: "ringOneId" | "ringTwoId" = "ringOneId",
): EquipmentLoadoutKey {
  if (slot === "ring") return ringKey;
  if (slot === "weapon") return "weaponId";
  if (slot === "offhand") return "offhandId";
  if (slot === "helmet") return "helmetId";
  if (slot === "armor") return "armorId";
  if (slot === "gloves") return "glovesId";
  if (slot === "boots") return "bootsId";
  if (slot === "cape") return "capeId";
  if (slot === "effect") return "effectId";
  return "dyeId";
}

export const EQUIPMENT_SLOT_LABELS: Record<EquipmentLoadoutKey, string> = {
  weaponId: "Silah",
  offhandId: "Yan el / kalkan",
  helmetId: "Miğfer",
  armorId: "Zırh",
  glovesId: "Eldiven",
  bootsId: "Çizme",
  capeId: "Pelerin",
  ringOneId: "Yüzük I",
  ringTwoId: "Yüzük II",
  effectId: "İz / tılsım",
  dyeId: "Boya",
};

export type PlayerInventory = {
  ownedItemIds: string[];
  upgrades: Record<string, number>;
  newItemIds: string[];
  combatItemCounts: CombatItemCounts;
  quickSlots: CombatQuickSlots;
  secondaryWeaponId: string | null;
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

export const MAX_UPGRADE_LEVEL = 10;

export function getUpgradeCost(slot: EquipmentSlot, currentLevel: number): UpgradeCost {
  const level = Math.max(0, Math.min(MAX_UPGRADE_LEVEL - 1, Math.floor(currentLevel)));
  return {
    gold: 100 + level * 85 + (slot === "weapon" || slot === "offhand" ? 0 : 25),
    ironShards: slot === "weapon" || slot === "offhand" ? 1 + Math.floor(level / 2) : 1,
    emberCrystals: 1 + Math.floor(level / 2),
    sealFragments: level >= 2 ? 1 + Math.floor((level - 2) / 2) : 0,
  };
}

export function getUpgradeBonuses(slot: EquipmentSlot): Partial<EquipmentStatBonuses> {
  if (slot === "weapon") return { damage: 0.018, attackSpeed: 0.006, attackRange: 0.015 };
  if (slot === "offhand" || slot === "armor" || slot === "helmet" || slot === "gloves" || slot === "boots") {
    return { health: 1, defense: 0.008 };
  }
  return { health: 1, critChance: 0.002, moveSpeed: 0.002 };
}

export function getUpgradeSuccessChance(currentLevel: number) {
  if (currentLevel < 6) return 100;
  return [85, 70, 60, 50][Math.min(3, currentLevel - 6)];
}

export function rollUpgradeSuccess(idempotencyKey: string, currentLevel: number) {
  const chance = getUpgradeSuccessChance(currentLevel);
  if (chance >= 100) return true;
  let hash = 2_166_136_261;
  for (let index = 0; index < idempotencyKey.length; index += 1) {
    hash ^= idempotencyKey.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0) % 100 < chance;
}

export function getItemSellValue(item: StoreItem) {
  if (item.sellValue) return item.sellValue;
  return {
    gold: Math.floor(item.price.gold * 0.4),
    diamonds: Math.floor(item.price.diamonds * 0.4),
  };
}

export function getSalvageYield(item: StoreItem, upgradeLevel = 0) {
  const rarityValue = { common: 1, rare: 2, epic: 3, legendary: 4 }[item.rarity];
  const level = Math.max(0, Math.min(MAX_UPGRADE_LEVEL, Math.floor(upgradeLevel)));
  return {
    ironShards: 1 + Math.floor(level / 3) + Number(rarityValue >= 3),
    emberCrystals: Math.max(0, Math.floor((rarityValue - 1) / 2) + Math.floor(level / 4)),
    sealFragments: level >= 7 || rarityValue === 4 ? 1 : 0,
  };
}
