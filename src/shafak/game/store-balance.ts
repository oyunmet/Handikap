import type {
  EquipmentSlot,
  EquipmentStatBonuses,
  PlayerCombatModifiers,
  StoreItem,
  UpgradeCost,
} from "./store-types.ts";

export const STORE_BALANCE_CONFIG = {
  maxUpgradeLevel: 10,
  sellReturnRate: 0.4,
  equipmentSets: {
    "ash-guardian": {
      twoPiece: { defense: 0.04, damage: 0.035 },
      fourPiece: { health: 8, lightRadius: 1.25 },
    },
  },
  upgrade: {
    gold: {
      base: 100,
      perLevel: 85,
      nonWeaponSurcharge: 25,
    },
    ironShards: {
      base: 1,
      perTwoLevels: 1,
      otherSlotBase: 1,
    },
    emberCrystals: {
      base: 1,
      perTwoLevels: 1,
    },
    sealFragments: {
      firstLevel: 2,
      base: 1,
      perTwoLevels: 1,
    },
    successChanceByLevel: [100, 100, 100, 100, 100, 100, 85, 70, 60, 50],
    bonusesBySlot: {
      weapon: { damage: 0.018, attackSpeed: 0.006, attackRange: 0.015 },
      offhand: { health: 1, defense: 0.008 },
      helmet: { health: 1, defense: 0.008 },
      armor: { health: 1, defense: 0.008 },
      gloves: { health: 1, defense: 0.008 },
      boots: { health: 1, defense: 0.008 },
      cape: { health: 1, critChance: 0.002, moveSpeed: 0.002 },
      ring: { health: 1, critChance: 0.002, moveSpeed: 0.002 },
      effect: { health: 1, critChance: 0.002, moveSpeed: 0.002 },
      dye: { health: 1, critChance: 0.002, moveSpeed: 0.002 },
    } satisfies Record<EquipmentSlot, Partial<EquipmentStatBonuses>>,
  },
  salvage: {
    rarityWeight: { common: 1, rare: 2, epic: 3, legendary: 4 },
    ironShards: {
      base: 1,
      everyUpgradeLevels: 3,
      perUpgradeTier: 1,
      rarityThreshold: 3,
      highRarityBonus: 1,
    },
    emberCrystals: {
      rarityStep: 2,
      upgradeStep: 4,
    },
    sealFragments: {
      minimumUpgradeLevel: 7,
      rarity: "legendary",
      amount: 1,
    },
  },
  playerCombat: {
    maxHealth: { base: 150, min: 130, max: 175 },
    damageMultiplier: { base: 1, min: 0.82, max: 1.35 },
    defenseReduction: { min: 0, max: 0.24 },
    criticalChance: { base: 0.12, min: 0.08, max: 0.28 },
    moveSpeedMultiplier: { base: 1, min: 0.88, max: 1.14 },
    attackSpeedMultiplier: { base: 1, min: 0.8, max: 1.22 },
    attackRangeBonus: { min: -0.3, max: 0.8 },
  },
} as const;

export const MAX_UPGRADE_LEVEL = STORE_BALANCE_CONFIG.maxUpgradeLevel;

export function getUpgradeCost(slot: EquipmentSlot, currentLevel: number): UpgradeCost {
  const level = Math.max(0, Math.min(MAX_UPGRADE_LEVEL - 1, Math.floor(currentLevel)));
  const weaponOrOffhand = slot === "weapon" || slot === "offhand";
  const balance = STORE_BALANCE_CONFIG.upgrade;
  return {
    gold: balance.gold.base
      + level * balance.gold.perLevel
      + (weaponOrOffhand ? 0 : balance.gold.nonWeaponSurcharge),
    ironShards: weaponOrOffhand
      ? balance.ironShards.base + Math.floor(level / 2) * balance.ironShards.perTwoLevels
      : balance.ironShards.otherSlotBase,
    emberCrystals: balance.emberCrystals.base
      + Math.floor(level / 2) * balance.emberCrystals.perTwoLevels,
    sealFragments: level >= balance.sealFragments.firstLevel
      ? balance.sealFragments.base
        + Math.floor((level - balance.sealFragments.firstLevel) / 2) * balance.sealFragments.perTwoLevels
      : 0,
  };
}

export function getUpgradeBonuses(slot: EquipmentSlot): Partial<EquipmentStatBonuses> {
  return STORE_BALANCE_CONFIG.upgrade.bonusesBySlot[slot];
}

export function getUpgradeSuccessChance(currentLevel: number) {
  const index = Math.max(0, Math.min(
    MAX_UPGRADE_LEVEL - 1,
    Number.isFinite(currentLevel) ? Math.floor(currentLevel) : 0,
  ));
  return STORE_BALANCE_CONFIG.upgrade.successChanceByLevel[index] ?? 100;
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
    gold: Math.floor(item.price.gold * STORE_BALANCE_CONFIG.sellReturnRate),
    diamonds: Math.floor(item.price.diamonds * STORE_BALANCE_CONFIG.sellReturnRate),
  };
}

export function getSalvageYield(item: StoreItem, upgradeLevel = 0) {
  const salvage = STORE_BALANCE_CONFIG.salvage;
  const rarityValue = salvage.rarityWeight[item.rarity];
  const level = Math.max(0, Math.min(MAX_UPGRADE_LEVEL, Math.floor(upgradeLevel)));
  return {
    ironShards: salvage.ironShards.base
      + Math.floor(level / salvage.ironShards.everyUpgradeLevels) * salvage.ironShards.perUpgradeTier
      + Number(rarityValue >= salvage.ironShards.rarityThreshold) * salvage.ironShards.highRarityBonus,
    emberCrystals: Math.max(
      0,
      Math.floor((rarityValue - 1) / salvage.emberCrystals.rarityStep)
        + Math.floor(level / salvage.emberCrystals.upgradeStep),
    ),
    sealFragments: level >= salvage.sealFragments.minimumUpgradeLevel
      || item.rarity === salvage.sealFragments.rarity
      ? salvage.sealFragments.amount
      : 0,
  };
}

export function getPlayerCombatModifiersFromBonuses(
  bonuses: EquipmentStatBonuses,
): PlayerCombatModifiers {
  const balance = STORE_BALANCE_CONFIG.playerCombat;
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
  return {
    maxHealth: clamp(balance.maxHealth.base + bonuses.health, balance.maxHealth.min, balance.maxHealth.max),
    damageMultiplier: clamp(balance.damageMultiplier.base + bonuses.damage, balance.damageMultiplier.min, balance.damageMultiplier.max),
    defenseReduction: clamp(bonuses.defense, balance.defenseReduction.min, balance.defenseReduction.max),
    criticalChance: clamp(balance.criticalChance.base + bonuses.critChance, balance.criticalChance.min, balance.criticalChance.max),
    moveSpeedMultiplier: clamp(balance.moveSpeedMultiplier.base + bonuses.moveSpeed, balance.moveSpeedMultiplier.min, balance.moveSpeedMultiplier.max),
    attackSpeedMultiplier: clamp(balance.attackSpeedMultiplier.base + bonuses.attackSpeed, balance.attackSpeedMultiplier.min, balance.attackSpeedMultiplier.max),
    attackRangeBonus: clamp(bonuses.attackRange, balance.attackRangeBonus.min, balance.attackRangeBonus.max),
  };
}
