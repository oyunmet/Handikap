import type { PlayerProfile } from "./profile";
import { getUpgradeBonuses, MAX_UPGRADE_LEVEL } from "./store-types";
import type {
  EquipmentLoadoutKey,
  EquipmentStatBonuses,
  EquipmentVisual,
  PlayerCombatModifiers,
  StoreItem,
} from "./store-types";
import { EQUIPMENT_LOADOUT_KEYS, getEquipmentLoadoutKey } from "./store-types.ts";
import { EQUIPMENT_SETS } from "./store-catalog.ts";

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
  const totals = getEquipmentBonuses(profile, catalog);
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
  const offhand = profile.equipment.offhandId ? find(profile.equipment.offhandId)?.visual ?? {} : {};
  const helmet = profile.equipment.helmetId ? find(profile.equipment.helmetId)?.visual ?? {} : {};
  const gloves = profile.equipment.glovesId ? find(profile.equipment.glovesId)?.visual ?? {} : {};
  const boots = profile.equipment.bootsId ? find(profile.equipment.bootsId)?.visual ?? {} : {};
  const ring = profile.equipment.ringOneId
    ? find(profile.equipment.ringOneId)?.visual ?? {}
    : profile.equipment.ringTwoId ? find(profile.equipment.ringTwoId)?.visual ?? {} : {};
  const dyedColor = dye?.dyeColor;
  const visual: EquipmentVisual = {
    ...armor,
    ...cape,
    ...weapon,
    ...effect,
    ...offhand,
    ...helmet,
    ...gloves,
    ...boots,
    ...ring,
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
  const setCounts = new Map<string, number>();
  const counted = new Set<string>();
  for (const key of EQUIPMENT_LOADOUT_KEYS) {
    const itemId = profile.equipment[key];
    if (!itemId || counted.has(itemId)) continue;
    const item = catalog.find((entry) => entry.id === itemId);
    const itemSlot = item?.slot;
    if (!item || !itemSlot || !slotAcceptsLoadoutKey(itemSlot, key) || !profile.inventory.ownedItemIds.includes(item.id)) continue;
    counted.add(itemId);
    addBonuses(totals, getItemBonuses(item, profile));
    if (item.setId) setCounts.set(item.setId, (setCounts.get(item.setId) ?? 0) + 1);
  }
  for (const [setId, count] of setCounts) {
    const set = EQUIPMENT_SETS[setId as keyof typeof EQUIPMENT_SETS];
    if (!set) continue;
    if (count >= 2) addBonuses(totals, set.twoPiece);
    if (count >= 4) addBonuses(totals, set.fourPiece);
  }
  return totals;
}

function slotAcceptsLoadoutKey(slot: NonNullable<StoreItem["slot"]>, key: EquipmentLoadoutKey) {
  return getEquipmentLoadoutKey(slot, key === "ringTwoId" ? "ringTwoId" : "ringOneId") === key;
}

export function getItemBonuses(item: StoreItem, profile: PlayerProfile): EquipmentStatBonuses {
  const bonuses = { ...BASE_STATS };
  for (const key of Object.keys(bonuses) as (keyof EquipmentStatBonuses)[]) {
    const value = item.stats[key] ?? 0;
    if (Number.isFinite(value)) bonuses[key] = value;
  }
  const level = Math.max(0, Math.min(MAX_UPGRADE_LEVEL, profile.inventory.upgrades[item.id] ?? 0));
  if (level > 0 && item.upgradeable && item.slot) {
    const upgrade = getUpgradeBonuses(item.slot);
    for (const [key, value] of Object.entries(upgrade) as [keyof EquipmentStatBonuses, number][]) {
      bonuses[key] += value * level;
    }
  }
  return bonuses;
}

function addBonuses(target: EquipmentStatBonuses, source: Partial<EquipmentStatBonuses>) {
  for (const key of Object.keys(target) as (keyof EquipmentStatBonuses)[]) {
    target[key] += source[key] ?? 0;
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
