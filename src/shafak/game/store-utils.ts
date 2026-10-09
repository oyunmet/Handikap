import type { PlayerProfile } from "./profile";
import { getUpgradeBonuses, MAX_UPGRADE_LEVEL } from "./store-types";
import type {
  EquipmentStatBonuses,
  EquipmentVisual,
  PlayerCombatModifiers,
  StoreItem,
} from "./store-types";

const BASE_STATS: EquipmentStatBonuses = {
  health: 0,
  damage: 0,
  defense: 0,
  critChance: 0,
  moveSpeed: 0,
  lightRadius: 0,
  attackSpeed: 0,
  attackRange: 0,
};

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

export function getPlayerCombatModifiers(profile: PlayerProfile, catalog: readonly StoreItem[]): PlayerCombatModifiers {
  const totals = { ...BASE_STATS };
  const equippedIds = Object.values(profile.equipment);
  for (const itemId of equippedIds) {
    const item = catalog.find((entry) => entry.id === itemId);
    if (!item || !profile.inventory.ownedItemIds.includes(item.id)) continue;
    addBonuses(totals, getItemBonuses(item, profile));
  }
  return {
    maxHealth: clamp(150 + totals.health, 130, 175),
    damageMultiplier: clamp(1 + totals.damage, 0.82, 1.35),
    defenseReduction: clamp(totals.defense, 0, 0.24),
    criticalChance: clamp(0.12 + totals.critChance, 0.08, 0.28),
    moveSpeedMultiplier: clamp(1 + totals.moveSpeed, 0.88, 1.14),
    attackSpeedMultiplier: clamp(1 + totals.attackSpeed, 0.8, 1.22),
    attackRangeBonus: clamp(totals.attackRange, -0.3, 0.8),
  };
}

export function getEquipmentVisual(profile: PlayerProfile, catalog: readonly StoreItem[]): EquipmentVisual {
  const find = (id: string) => catalog.find((entry) => entry.id === id);
  const weapon = find(profile.equipment.weaponId)?.visual ?? { weaponStyle: "sword" as const, weaponColor: "#d6dce0" };
  const armor = find(profile.equipment.armorId)?.visual ?? {};
  const cape = find(profile.equipment.capeId)?.visual ?? {};
  const effect = find(profile.equipment.effectId)?.visual ?? {};
  const dye = find(profile.equipment.dyeId)?.visual;
  const dyedColor = dye?.dyeColor;
  const visual: EquipmentVisual = {
    ...armor,
    ...cape,
    ...weapon,
    ...effect,
  };
  if (dyedColor) {
    visual.dyeColor = dyedColor;
    visual.armor = dyedColor;
    visual.armorLight = tint(dyedColor, 0.28);
    visual.armorDark = tint(dyedColor, -0.34);
    visual.cape = tint(dyedColor, -0.22);
  }
  return visual;
}

export function getEquipmentBonuses(profile: PlayerProfile, catalog: readonly StoreItem[]) {
  const totals = { ...BASE_STATS };
  for (const itemId of Object.values(profile.equipment)) {
    const item = catalog.find((entry) => entry.id === itemId);
    if (!item || !profile.inventory.ownedItemIds.includes(item.id)) continue;
    addBonuses(totals, getItemBonuses(item, profile));
  }
  return totals;
}

export function getItemBonuses(item: StoreItem, profile: PlayerProfile): EquipmentStatBonuses {
  const bonuses = { ...BASE_STATS };
  for (const key of Object.keys(bonuses) as (keyof EquipmentStatBonuses)[]) {
    const value = item.stats[key] ?? 0;
    if (Number.isFinite(value)) bonuses[key] = value;
  }
  const level = Math.max(0, Math.min(MAX_UPGRADE_LEVEL, profile.inventory.upgrades[item.id] ?? 0));
  if (level > 0 && item.upgradeable) {
    const upgrade = getUpgradeBonuses(item.slot);
    for (const [key, value] of Object.entries(upgrade) as [keyof EquipmentStatBonuses, number][]) {
      bonuses[key] += value * level;
    }
  }
  return bonuses;
}

function addBonuses(target: EquipmentStatBonuses, source: EquipmentStatBonuses) {
  for (const key of Object.keys(target) as (keyof EquipmentStatBonuses)[]) {
    target[key] += source[key];
  }
}

function tint(hex: string, amount: number) {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  if (!Number.isFinite(value)) return hex;
  return `#${[16, 8, 0].map((shift) => {
    const channel = (value >> shift) & 255;
    const next = amount >= 0 ? channel + (255 - channel) * amount : channel * (1 + amount);
    return Math.round(clamp(next, 0, 255)).toString(16).padStart(2, "0");
  }).join("")}`;
}
