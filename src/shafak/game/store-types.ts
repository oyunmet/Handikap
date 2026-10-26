import type { CombatItemCounts, CombatItemId, CombatQuickSlots } from "./combat-items.ts";

export type StoreCategory = "weapons" | "armor" | "accessories" | "consumables" | "materials" | "specials";
export type StoreTab = StoreCategory | "inventory" | "smithy";
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
  critDamage: number;
  dodge: number;
  stamina: number;
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
  weaponStyle?: "sword" | "daggers" | "axe" | "greatsword" | "spear" | "bow" | "mace" | "staff" | "crossbow" | "throwingKnife";
  weaponColor?: string;
  auraColor?: string;
  trailColor?: string;
  dustColor?: string;
  dyeColor?: string;
};

export type StoreItem = {
  id: string;
  warRoomWeaponId?: string;
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
  maxStamina: number;
  damageMultiplier: number;
  defenseReduction: number;
  criticalChance: number;
  criticalDamageMultiplier: number;
  dodgeWindowMultiplier: number;
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

export {
  getItemSellValue,
  getPlayerCombatModifiersFromBonuses,
  getSalvageYield,
  getUpgradeBonuses,
  getUpgradeCost,
  getUpgradeSuccessChance,
  MAX_UPGRADE_LEVEL,
  rollUpgradeSuccess,
} from "./store-balance.ts";
