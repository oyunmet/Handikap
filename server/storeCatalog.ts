import type { PlayerProfileRecord } from "./profileApi";
import type {
  EquipmentSlot,
  EquipmentStatBonuses,
  PlayerCombatModifiers,
  StoreItem,
} from "../src/shafak/game/store-types";
import { getUpgradeBonuses, MAX_UPGRADE_LEVEL } from "../src/shafak/game/store-types";

const item = (
  id: string,
  name: string,
  category: StoreItem["category"],
  slot: EquipmentSlot,
  rarity: StoreItem["rarity"],
  description: string,
  summary: string,
  price: StoreItem["price"],
  stats: Partial<EquipmentStatBonuses>,
  upgradeable: boolean,
  visual: StoreItem["visual"],
): StoreItem => ({
  id,
  name,
  category,
  slot,
  rarity,
  description,
  summary,
  price,
  stats,
  upgradeable,
  visual,
});

export const STORE_CATALOG: readonly StoreItem[] = [
  item("weapon_ash_sword", "Kül Kılıcı", "weapons", "weapon", "common", "Yolcuların kullandığı dengeli, güvenilir kılıç.", "Dengeli · başlangıç silahı", { gold: 0, diamonds: 0 }, {}, true, { weaponStyle: "sword", weaponColor: "#d6dce0" }),
  item("weapon_twin_daggers", "İkiz Hançerler", "weapons", "weapon", "rare", "Hızlı art arda vuruşlar için hafif bir çift hançer.", "Hız +14% · menzil −0,25 m", { gold: 0, diamonds: 3 }, { damage: -0.02, critChance: 0.035, attackSpeed: 0.14, attackRange: -0.25 }, true, { weaponStyle: "daggers", weaponColor: "#9fe5e0" }),
  item("weapon_iron_axe", "Demir Savaş Baltası", "weapons", "weapon", "rare", "Geniş savuruşlu balta; ağır vuruşlar ve kritik darbeler için.", "Hasar +8% · hız −12%", { gold: 0, diamonds: 4 }, { damage: 0.08, critChance: 0.01, attackSpeed: -0.12, attackRange: 0.12 }, true, { weaponStyle: "axe", weaponColor: "#dba56d" }),
  item("weapon_greatsword", "Kale Yıkan", "weapons", "weapon", "epic", "Uzun erişimli, ağır ve kuvvetli iki elli kılıç.", "Hasar +14% · menzil +0,35 m", { gold: 0, diamonds: 7 }, { damage: 0.14, attackSpeed: -0.2, attackRange: 0.35 }, true, { weaponStyle: "greatsword", weaponColor: "#eacb89" }),
  item("weapon_road_spear", "Yol Mızrağı", "weapons", "weapon", "common", "Mesafeyi koruyup güvenli dürtme vuruşları yap.", "Menzil +0,65 m · hasar −3%", { gold: 360, diamonds: 0 }, { damage: -0.03, attackSpeed: 0.04, attackRange: 0.65 }, true, { weaponStyle: "spear", weaponColor: "#91bbb4" }),

  item("armor_ash_guard", "Kül Muhafızı", "armor", "armor", "common", "Kül Yolu'nun eski muhafızlarından kalan sade zırh.", "Başlangıç zırhı", { gold: 0, diamonds: 0 }, {}, true, { armor: "#252832", armorLight: "#41444c", armorDark: "#15171d", trim: "#c99c52", armorStyle: "ash" }),
  item("armor_night_watch", "Gece Nöbetçisi", "armor", "armor", "rare", "Hafif metal katmanlarıyla savunma ve hareket arasında denge kurar.", "Can +7 · savunma +8%", { gold: 0, diamonds: 3 }, { health: 7, defense: 0.08, moveSpeed: -0.025 }, true, { armor: "#233d4b", armorLight: "#547987", armorDark: "#14252f", trim: "#7fcac5", armorStyle: "watch" }),
  item("armor_golden_knight", "Altın Şövalye", "armor", "armor", "epic", "Ağır altın işlemeli plaka zırh; yüksek savunma, daha düşük hız.", "Can +14 · savunma +14% · hız −6%", { gold: 0, diamonds: 8 }, { health: 14, defense: 0.14, moveSpeed: -0.06 }, true, { armor: "#75552c", armorLight: "#c59a4a", armorDark: "#3a2b20", trim: "#f6d68b", armorStyle: "royal" }),
  item("armor_shadow_hunter", "Gölge Avcısı", "armor", "armor", "legendary", "Sessiz hareket eden avcıların koyu, esnek zırhı.", "Savunma +6% · kritik +3% · hız +2%", { gold: 0, diamonds: 12 }, { health: 4, defense: 0.06, critChance: 0.03, moveSpeed: 0.02 }, true, { armor: "#30303c", armorLight: "#66617e", armorDark: "#171722", trim: "#aa86db", armorStyle: "shadow" }),

  item("cape_worn", "Yıpranmış Pelerin", "capes", "cape", "common", "Uzun yolculuklardan kalma, hafif bir pelerin.", "Başlangıç pelerini", { gold: 0, diamonds: 0 }, {}, false, { cape: "#872e36", capeLength: 1.02 }),
  item("cape_ember_cloak", "Kor Pelerini", "capes", "cape", "common", "Rüzgârda kıvılcım gibi parlayan kısa, sıcak tonlu pelerin.", "Işık +1,5 m · hız +2%", { gold: 280, diamonds: 0 }, { lightRadius: 1.5, moveSpeed: 0.02 }, false, { cape: "#bd4d31", capeLength: 0.86, trim: "#f2a05b" }),
  item("cape_night_veil", "Gece Örtüsü", "capes", "cape", "rare", "Koyu kumaşıyla hafifleyen ve hareketi kolaylaştıran pelerin.", "Işık +1 m · hız +5%", { gold: 0, diamonds: 3 }, { lightRadius: 1, moveSpeed: 0.05 }, false, { cape: "#393456", capeLength: 1.18, trim: "#9f91cc" }),
  item("cape_gilded_mantle", "Yaldızlı Manto", "capes", "cape", "epic", "Altın kenar işlemeli uzun şövalye mantosu.", "Işık +3 m · can +3", { gold: 0, diamonds: 7 }, { health: 3, lightRadius: 3 }, false, { cape: "#8b6837", capeLength: 1.25, trim: "#f3d28e" }),

  item("effect_none", "Sade İz", "effects", "effect", "common", "Özel kılıç izi veya aura kullanılmaz.", "Efekt uygulanmıyor", { gold: 0, diamonds: 0 }, {}, false, {}),
  item("effect_ember_trail", "Kor İzi", "effects", "effect", "common", "Hareket ederken ve vuruşlarda sıcak kor rengi bırakır.", "Kor izi · sıcak aura", { gold: 180, diamonds: 0 }, { lightRadius: 0.5 }, false, { trailColor: "#ff7847", dustColor: "#e9874f", auraColor: "#ff9459" }),
  item("effect_frost_trail", "Buz Yayı", "effects", "effect", "rare", "Saldırı izini soğuk mavi ışıkla belirginleştirir.", "Buz izi · serin aura", { gold: 0, diamonds: 2 }, { lightRadius: 0.5 }, false, { trailColor: "#8fe8ff", dustColor: "#90cddd", auraColor: "#83d5fa" }),
  item("effect_venom_trail", "Zehir Sisi", "effects", "effect", "rare", "Hareket sırasında kısa ömürlü yeşil bir iz bırakır.", "Zehir izi · yeşil aura", { gold: 0, diamonds: 3 }, {}, false, { trailColor: "#8beb85", dustColor: "#70ad67", auraColor: "#8bd46d" }),
  item("effect_gilded_trail", "Altın Yörünge", "effects", "effect", "epic", "Vuruş ve adım izlerini parlak altınla çevreler.", "Altın izi · ışık +1 m", { gold: 0, diamonds: 5 }, { lightRadius: 1 }, false, { trailColor: "#ffd37a", dustColor: "#f0c16d", auraColor: "#f1c777" }),
  item("dye_none", "Doğal Renk", "dyes", "dye", "common", "Zırhın ve pelerinin kendi renklerini kullan.", "Boya uygulanmıyor", { gold: 0, diamonds: 0 }, {}, false, {}),
  item("dye_crimson", "Kızıl Boya", "dyes", "dye", "rare", "Zırh ve pelerine koyu kızıl bir renk uygular.", "Zırh/pelerin rengi: kızıl", { gold: 0, diamonds: 2 }, {}, false, { dyeColor: "#a93b42" }),
  item("dye_glacier", "Buz Mavisi Boya", "dyes", "dye", "rare", "Zırh ve pelerine soğuk buz mavisi bir renk uygular.", "Zırh/pelerin rengi: buz mavisi", { gold: 0, diamonds: 2 }, {}, false, { dyeColor: "#4f9eb7" }),
  item("dye_royal_gold", "Kraliyet Altını", "dyes", "dye", "epic", "Zırh ve pelerini yaldızlı altın tonuna boyar.", "Zırh/pelerin rengi: altın", { gold: 0, diamonds: 4 }, {}, false, { dyeColor: "#c99743" }),
] as const;

export const DEFAULT_EQUIPMENT = {
  weaponId: "weapon_ash_sword",
  armorId: "armor_ash_guard",
  capeId: "cape_worn",
  effectId: "effect_none",
  dyeId: "dye_none",
} as const;

export const STARTER_ITEM_IDS = [
  DEFAULT_EQUIPMENT.weaponId,
  DEFAULT_EQUIPMENT.armorId,
  DEFAULT_EQUIPMENT.capeId,
  DEFAULT_EQUIPMENT.effectId,
  "dye_none",
] as const;

export function getStoreItem(itemId: unknown): StoreItem | undefined {
  return typeof itemId === "string" ? STORE_CATALOG.find((entry) => entry.id === itemId) : undefined;
}

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
