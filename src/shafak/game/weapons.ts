import type { EquipmentVisual, ItemRarity } from "./store-types.ts";
import type { CombatItemId } from "./combat-items.ts";

export type WeaponKind = "yakın" | "uzak";
export type WeaponRarity = "Sıradan" | "Nadir" | "Epik" | "Efsanevi";

export type WeaponDefinition = {
  id: string;
  name: string;
  type: WeaponKind;
  subtype: string;
  rarity: WeaponRarity;
  damage: number;
  speed: number;
  range: number;
  durabilityCost: number;
  criticalChance: number;
  price: number;
  icon: string;
  animationId: "slash" | "sweep" | "thrust" | "quick-cut" | "bow-shot" | "crossbow-shot" | "throw";
  effectId: string;
  description: string;
  summary: string;
  storeRarity: ItemRarity;
  stats: {
    damage?: number;
    critChance?: number;
    critDamage?: number;
    attackSpeed?: number;
    attackRange?: number;
  };
  visual: EquipmentVisual;
};

export const DEFAULT_WEAPON_ID = "weapon_ash_sword";

export const WEAPONS: readonly WeaponDefinition[] = [
  {
    id: "weapon_ash_sword", name: "Kül Kılıcı", type: "yakın", subtype: "tek elli kılıç",
    rarity: "Sıradan", damage: 10, speed: 1, range: 2.4, durabilityCost: 4, criticalChance: 0.05,
    price: 0, icon: "⚔", animationId: "slash", effectId: "steel-trail",
    description: "Yolcuların kullandığı dengeli, güvenilir kılıç.", summary: "Dengeli · başlangıç silahı",
    storeRarity: "common", stats: {}, visual: { weaponStyle: "sword", weaponColor: "#d6dce0" },
  },
  {
    id: "weapon_steel_long_sword", name: "Çelik Uzun Kılıç", type: "yakın", subtype: "uzun kılıç",
    rarity: "Nadir", damage: 13, speed: 0.98, range: 2.85, durabilityCost: 5, criticalChance: 0.07,
    price: 480, icon: "⚔", animationId: "slash", effectId: "steel-trail",
    description: "Uzun menzilli, hafif çelik bir şövalye kılıcı.", summary: "Menzil 2,85 m · hasar 13",
    storeRarity: "rare", stats: { damage: 0.06, attackRange: 0.18 },
    visual: { weaponStyle: "sword", weaponColor: "#c6d7de", trailColor: "#c3e4e8" },
  },
  {
    id: "weapon_shadow_sword", name: "Gölge Kılıcı", type: "yakın", subtype: "ince kılıç",
    rarity: "Efsanevi", damage: 13, speed: 1.08, range: 2.5, durabilityCost: 4, criticalChance: 0.13,
    price: 1_200, icon: "⚔", animationId: "quick-cut", effectId: "shadow-trail",
    description: "Karanlıkta parlamayan ince kılıç; kritik darbeleri daha ağır vurur.",
    summary: "Kritik +%8 · kritik hasarı +%15 · hız +%4",
    storeRarity: "legendary", stats: { critChance: 0.08, critDamage: 0.15, attackSpeed: 0.04 },
    visual: { weaponStyle: "sword", weaponColor: "#a793cd", trailColor: "#9277c5", auraColor: "#8e7bc0" },
  },
  {
    id: "weapon_iron_axe", name: "Demir Savaş Baltası", type: "yakın", subtype: "savaş baltası",
    rarity: "Nadir", damage: 16, speed: 0.78, range: 2.8, durabilityCost: 9, criticalChance: 0.07,
    price: 620, icon: "⛏", animationId: "sweep", effectId: "iron-sparks",
    description: "Geniş savuruşlu balta; ağır vuruşlar ve kritik darbeler için.",
    summary: "Hasar 16 · geniş savuruş",
    storeRarity: "rare", stats: { damage: 0.08, critChance: 0.01, attackSpeed: -0.12, attackRange: 0.12 },
    visual: { weaponStyle: "axe", weaponColor: "#dba56d", trailColor: "#e3b877" },
  },
  {
    id: "weapon_road_spear", name: "Yol Mızrağı", type: "yakın", subtype: "mızrak",
    rarity: "Sıradan", damage: 12, speed: 1.02, range: 4.2, durabilityCost: 6, criticalChance: 0.06,
    price: 360, icon: "↗", animationId: "thrust", effectId: "spear-flash",
    description: "Mesafeyi koruyup güvenli dürtme vuruşları yap.",
    summary: "Menzil 4,2 m · saplama",
    storeRarity: "common", stats: { damage: -0.03, attackSpeed: 0.04, attackRange: 0.65 },
    visual: { weaponStyle: "spear", weaponColor: "#91bbb4", trailColor: "#b5ded2" },
  },
  {
    id: "weapon_forged_mace", name: "Demir Gürz", type: "yakın", subtype: "gürz",
    rarity: "Nadir", damage: 15, speed: 0.8, range: 2.55, durabilityCost: 10, criticalChance: 0.06,
    price: 620, icon: "✥", animationId: "sweep", effectId: "iron-sparks",
    description: "Ağır başlı gürz; güçlü, geniş savuruşlu vuruşlar için.",
    summary: "Hasar 15 · ağır vuruş",
    storeRarity: "rare", stats: { damage: 0.12, attackSpeed: -0.14 },
    visual: { weaponStyle: "mace", weaponColor: "#939ca4", trailColor: "#d6bd8d" },
  },
  {
    id: "weapon_hunting_knife", name: "Av Bıçağı", type: "yakın", subtype: "bıçak",
    rarity: "Sıradan", damage: 8, speed: 1.3, range: 1.9, durabilityCost: 3, criticalChance: 0.09,
    price: 180, icon: "⌁", animationId: "quick-cut", effectId: "steel-trail",
    description: "Hafif ve çevik bıçak; hızlı art arda vuruşlar için.",
    summary: "Hızlı · kısa menzil",
    storeRarity: "common", stats: { damage: -0.08, critChance: 0.025, attackSpeed: 0.2, attackRange: -0.28 },
    visual: { weaponStyle: "daggers", weaponColor: "#c6d4d1", trailColor: "#c9ecdf" },
  },
  {
    id: "weapon_venom_dagger", name: "Zehirli Hançer", type: "yakın", subtype: "hançer",
    rarity: "Nadir", damage: 10, speed: 1.24, range: 2, durabilityCost: 3, criticalChance: 0.12,
    price: 330, icon: "⌁", animationId: "quick-cut", effectId: "venom-trail",
    description: "Çift ağızlı hançer; çevik ve ağır kritik darbeler için.",
    summary: "Kritik +%5 · hız +%16",
    storeRarity: "rare", stats: { damage: -0.03, critChance: 0.05, critDamage: 0.1, attackSpeed: 0.16, attackRange: -0.2 },
    visual: { weaponStyle: "daggers", weaponColor: "#81bd90", trailColor: "#83d77d", auraColor: "#527e4e" },
  },
  {
    id: "weapon_twin_daggers", name: "İkiz Hançerler", type: "yakın", subtype: "çift hançer",
    rarity: "Epik", damage: 9, speed: 1.36, range: 1.95, durabilityCost: 4, criticalChance: 0.11,
    price: 500, icon: "⌁", animationId: "quick-cut", effectId: "frost-trail",
    description: "Hızlı art arda vuruşlar için dengeli iki hançer.",
    summary: "Hız 1,36 · çift vuruş",
    storeRarity: "epic", stats: { damage: -0.02, critChance: 0.035, attackSpeed: 0.14, attackRange: -0.25 },
    visual: { weaponStyle: "daggers", weaponColor: "#9fe5e0", trailColor: "#9fe5e0" },
  },
  {
    id: "weapon_short_bow", name: "Kısa Yay", type: "uzak", subtype: "yay",
    rarity: "Nadir", damage: 12, speed: 0.88, range: 9, durabilityCost: 2, criticalChance: 0.09,
    price: 520, icon: "➶", animationId: "bow-shot", effectId: "arrow-flash",
    description: "Nişan alarak güvenli mesafeden ok at; yakın dövüşte bıçak kullan.",
    summary: "Menzil 9 m · ok",
    storeRarity: "rare", stats: { damage: -0.04, attackSpeed: -0.12, attackRange: 0.55 },
    visual: { weaponStyle: "bow", weaponColor: "#b98a54", trailColor: "#f0cf8a" },
  },
  {
    id: "weapon_crossbow", name: "Kül Arbaleti", type: "uzak", subtype: "arbalet",
    rarity: "Epik", damage: 17, speed: 0.68, range: 10, durabilityCost: 3, criticalChance: 0.12,
    price: 840, icon: "⟿", animationId: "crossbow-shot", effectId: "bolt-flash",
    description: "Ağır cıvataları uzak mesafeden güçlü ve isabetli biçimde fırlatır.",
    summary: "Hasar 17 · menzil 10 m · cıvata",
    storeRarity: "epic", stats: { damage: 0.08, attackSpeed: -0.2, attackRange: 0.8 },
    visual: { weaponStyle: "crossbow", weaponColor: "#9b754d", trailColor: "#f0cf8a" },
  },
  {
    id: "weapon_throwing_blade", name: "Fırlatma Bıçağı", type: "uzak", subtype: "fırlatma bıçağı",
    rarity: "Nadir", damage: 10, speed: 1.18, range: 7.5, durabilityCost: 1, criticalChance: 0.1,
    price: 400, icon: "⌁", animationId: "throw", effectId: "steel-trail",
    description: "Nişan kilidiyle hedefe yönelen hafif, tek kullanımlık bıçak.",
    summary: "Menzil 7,5 m · fırlatılır",
    storeRarity: "rare", stats: { damage: 0.02, critChance: 0.03, attackSpeed: 0.08, attackRange: 0.25 },
    visual: { weaponStyle: "throwingKnife", weaponColor: "#c6d4d1", trailColor: "#c9ecdf" },
  },
] as const;

const weaponsById = new Map<string, WeaponDefinition>(WEAPONS.map((weapon) => [weapon.id, weapon]));

export function getWeaponDefinition(id: string | null | undefined) {
  return id ? weaponsById.get(id) ?? null : null;
}

export function getWeaponAmmoItemId(id: string | null | undefined): CombatItemId | null {
  const animationId = getWeaponDefinition(id)?.animationId;
  if (animationId === "bow-shot") return "arrow_ammo";
  if (animationId === "crossbow-shot") return "bolt_ammo";
  if (animationId === "throw") return "throwing_blade_ammo";
  return null;
}

export function isCoreWeapon(id: string | null | undefined): id is string {
  return Boolean(id && weaponsById.has(id));
}

export function getWeaponRarityLabel(rarity: ItemRarity): WeaponRarity {
  return rarity === "common" ? "Sıradan"
    : rarity === "rare" ? "Nadir"
      : rarity === "epic" ? "Epik" : "Efsanevi";
}
