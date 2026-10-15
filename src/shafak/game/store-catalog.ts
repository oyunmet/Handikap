import type { EquipmentSlot, StoreItem } from "./store-types.ts";

const item = (
  id: string,
  name: string,
  category: StoreItem["category"],
  slot: EquipmentSlot,
  rarity: StoreItem["rarity"],
  description: string,
  summary: string,
  price: StoreItem["price"],
  stats: StoreItem["stats"],
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

const lootItem = (
  id: string,
  name: string,
  category: StoreItem["category"],
  slot: EquipmentSlot,
  rarity: StoreItem["rarity"],
  description: string,
  summary: string,
  requiredLevel: number,
  stats: StoreItem["stats"],
  visual: StoreItem["visual"],
  setId?: string,
): StoreItem => ({
  ...item(id, name, category, slot, rarity, description, summary, { gold: 0, diamonds: 0 }, stats, slot === "weapon" || slot === "armor", visual),
  requiredLevel,
  dropOnly: true,
  ...(setId ? { setId } : {}),
});

export const EQUIPMENT_SETS = {
  "ash-guardian": {
    name: "Kül Muhafızı",
    twoPiece: { defense: 0.04, damage: 0.035 },
    fourPiece: { health: 8, lightRadius: 1.25 },
  },
} as const;

export const STORE_CATALOG: readonly StoreItem[] = [
  item("weapon_ash_sword", "Kül Kılıcı", "weapons", "weapon", "common", "Yolcuların kullandığı dengeli, güvenilir kılıç.", "Dengeli · başlangıç silahı", { gold: 0, diamonds: 0 }, {}, true, { weaponStyle: "sword", weaponColor: "#d6dce0" }),
  item("weapon_hunting_knife", "Av Bıçağı", "weapons", "weapon", "common", "Yakın mesafede hızlı ve çevik karşı vuruşlar için hafif bir bıçak.", "Hızlı · yakın menzil · hasar −%8", { gold: 180, diamonds: 0 }, { damage: -0.08, critChance: 0.025, attackSpeed: 0.2, attackRange: -0.28 }, true, { weaponStyle: "daggers", weaponColor: "#c6d4d1", trailColor: "#c9ecdf" }),
  item("weapon_venom_dagger", "Zehirli Hançer", "weapons", "weapon", "rare", "Çift ağızlı hançer; çevik darbeler ve kritik vuruşlar için.", "Kritik +%5 · hız +%16", { gold: 330, diamonds: 0 }, { damage: -0.03, critChance: 0.05, attackSpeed: 0.16, attackRange: -0.2 }, true, { weaponStyle: "daggers", weaponColor: "#81bd90", trailColor: "#83d77d", auraColor: "#527e4e" }),
  item("weapon_twin_daggers", "İkiz Hançerler", "weapons", "weapon", "rare", "Hızlı art arda vuruşlar için hafif bir çift hançer.", "Hız +14% · menzil −0,25 m", { gold: 0, diamonds: 3 }, { damage: -0.02, critChance: 0.035, attackSpeed: 0.14, attackRange: -0.25 }, true, { weaponStyle: "daggers", weaponColor: "#9fe5e0" }),
  item("weapon_iron_axe", "Demir Savaş Baltası", "weapons", "weapon", "rare", "Geniş savuruşlu balta; ağır vuruşlar ve kritik darbeler için.", "Hasar +8% · hız −12%", { gold: 0, diamonds: 4 }, { damage: 0.08, critChance: 0.01, attackSpeed: -0.12, attackRange: 0.12 }, true, { weaponStyle: "axe", weaponColor: "#dba56d" }),
  item("weapon_greatsword", "Kale Yıkan", "weapons", "weapon", "epic", "Uzun erişimli, ağır ve kuvvetli iki elli kılıç.", "Hasar +14% · menzil +0,35 m", { gold: 0, diamonds: 7 }, { damage: 0.14, attackSpeed: -0.2, attackRange: 0.35 }, true, { weaponStyle: "greatsword", weaponColor: "#eacb89" }),
  item("weapon_road_spear", "Yol Mızrağı", "weapons", "weapon", "common", "Mesafeyi koruyup güvenli dürtme vuruşları yap.", "Menzil +0,65 m · hasar −3%", { gold: 360, diamonds: 0 }, { damage: -0.03, attackSpeed: 0.04, attackRange: 0.65 }, true, { weaponStyle: "spear", weaponColor: "#91bbb4" }),
  item("weapon_short_bow", "Kısa Yay", "weapons", "weapon", "rare", "Nişan alarak sipere yakın güvenli mesafeden ok at. Rakip çok yaklaşırsa Av Bıçağına geç.", "Menzil 9 m · nişan alarak atış", { gold: 520, diamonds: 0 }, { damage: -0.04, attackSpeed: -0.12, attackRange: 0.55 }, true, { weaponStyle: "bow", weaponColor: "#b98a54", trailColor: "#f0cf8a" }),
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
  lootItem("loot_gate_sword", "Nöbetçi Kılıcı", "weapons", "weapon", "rare", "Kapı nöbetçilerinin dengeli, sağlam kılıcı.", "Hasar +%7 · Kül Muhafızı seti", 2, { damage: 0.07 }, { weaponStyle: "sword", weaponColor: "#b7b2a3" }, "ash-guardian"),
  lootItem("loot_gate_armor", "Nöbetçi Zırhı", "armor", "armor", "rare", "Kül Yolu kapılarında nöbet tutanların katmanlı zırhı.", "Can +6 · savunma +%6", 2, { health: 6, defense: 0.06 }, { armor: "#343a3e", armorLight: "#85816f", armorDark: "#191e24", trim: "#c0a46b", armorStyle: "watch" }),
  lootItem("loot_iron_mace", "Demir Ant Gürzü", "weapons", "weapon", "rare", "Demir yemini taşıyan muhafızların ağır gürzü.", "Hasar +%10 · saldırı hızı −%4", 4, { damage: 0.1, attackSpeed: -0.04 }, { weaponStyle: "mace", weaponColor: "#89919a" }),
  lootItem("loot_iron_plate", "Ant Zırhı", "armor", "armor", "epic", "Demir antla güçlendirilmiş, ağır plaka zırh.", "Can +10 · savunma +%11 · Kül Muhafızı seti", 4, { health: 10, defense: 0.11 }, { armor: "#393b3b", armorLight: "#aaa38f", armorDark: "#1d2226", trim: "#d3b56f", armorStyle: "royal" }, "ash-guardian"),
  lootItem("loot_ash_bow", "Küllü Yay", "weapons", "weapon", "rare", "Kül Avcılarının uzak menzilden ateş eden yayı.", "Kritik +%4 · menzil +0,35 m", 3, { critChance: 0.04, attackRange: 0.35 }, { weaponStyle: "bow", weaponColor: "#b17e50", trailColor: "#e3b06b" }),
  lootItem("loot_ash_cape", "Avcı Pelerini", "capes", "cape", "rare", "Hafif kumaşı kül fırtınasında yön bulmaya yardım eder.", "Işık +1,2 m · hız +%2 · Kül Muhafızı seti", 3, { lightRadius: 1.2, moveSpeed: 0.02 }, { cape: "#8f493c", capeLength: 0.9, trim: "#d49a63" }, "ash-guardian"),
  lootItem("loot_shadow_blade", "Gece Dişleri", "weapons", "weapon", "epic", "Gölge şövalyelerinin seri karşı vuruşlarına uygun çift hançer.", "Hasar +%7 · kritik +%7 · hız +%5", 6, { damage: 0.07, critChance: 0.07, attackSpeed: 0.05 }, { weaponStyle: "daggers", weaponColor: "#9f8bcc", trailColor: "#a989df" }),
  lootItem("loot_shadow_veil", "Gölge Örtüsü", "capes", "cape", "epic", "Karanlıkta silueti yutan, hafif bir pelerin.", "Işık +1 m · hız +%4", 6, { lightRadius: 1, moveSpeed: 0.04 }, { cape: "#353142", capeLength: 1.2, trim: "#a18dc3", armorStyle: "shadow" }),
  lootItem("loot_storm_spear", "Yıldırım Mızrağı", "weapons", "weapon", "epic", "Fırtına mızrakçılarının uzun erişimli silahı.", "Hasar +%6 · menzil +0,55 m", 7, { damage: 0.06, attackRange: 0.55 }, { weaponStyle: "spear", weaponColor: "#7bc6d1", trailColor: "#a1e9ef" }),
  lootItem("loot_storm_trail", "Fırtına İzi", "effects", "effect", "rare", "Her vuruşta mavi bir kıvılcım izi bırakır.", "Kritik +%2 · mavi aura", 7, { critChance: 0.02, lightRadius: 0.6 }, { trailColor: "#73d9f0", dustColor: "#7ebfce", auraColor: "#78d7eb" }),
  lootItem("loot_rift_axe", "Yarık Baltası", "weapons", "weapon", "epic", "Yarık enerjisiyle ağırlaşmış, kuvvetli bir savaş baltası.", "Hasar +%14 · saldırı hızı −%10", 8, { damage: 0.14, attackSpeed: -0.1 }, { weaponStyle: "axe", weaponColor: "#cf755b", trailColor: "#f18265" }),
  lootItem("loot_rift_armor", "Berserker Plakası", "armor", "armor", "epic", "Yarık savaşçılarının darbeye dayanıklı koyu zırhı.", "Can +12 · savunma +%8", 8, { health: 12, defense: 0.08 }, { armor: "#492d31", armorLight: "#9a5951", armorDark: "#241d24", trim: "#e18d69", armorStyle: "shadow" }),
  lootItem("loot_ember_mace", "Kor Döküm Asası", "weapons", "weapon", "rare", "Alev simyacılarının yakın dövüşte kullandığı kor döküm asa.", "Hasar +%8 · kor rengi iz", 5, { damage: 0.08, attackRange: 0.12 }, { weaponStyle: "mace", weaponColor: "#e18d52", trailColor: "#ff9050" }),
  lootItem("loot_ember_cape", "Kor Simyacısı Pelerini", "capes", "cape", "epic", "Sıcak korlarla işlenmiş, ışığı genişleten pelerin.", "Can +4 · ışık +2 m", 5, { health: 4, lightRadius: 2 }, { cape: "#a34930", capeLength: 0.98, trim: "#f2b15f" }),
  lootItem("loot_venom_dagger", "Sessiz Zehir", "weapons", "weapon", "epic", "Zehirli suikastçıların hızlı ve keskin hançeri.", "Kritik +%8 · saldırı hızı +%8", 8, { critChance: 0.08, attackSpeed: 0.08 }, { weaponStyle: "daggers", weaponColor: "#75ba82", trailColor: "#8ce889", auraColor: "#68ad67" }),
  lootItem("loot_venom_dye", "Zümrüt Zehir Boyası", "dyes", "dye", "epic", "Zırh ve pelerine suikastçıların yeşil tonunu verir.", "Zırh/pelerin rengi: zehir yeşili", 8, {}, { dyeColor: "#51875c" }),
  lootItem("loot_frost_bow", "Ayaz Yayı", "weapons", "weapon", "rare", "Donmuş kirişleri uzak mesafeden sessizce fırlatır.", "Kritik +%6 · menzil +0,2 m", 6, { critChance: 0.06, attackRange: 0.2 }, { weaponStyle: "bow", weaponColor: "#9adbe7", trailColor: "#a6eaff" }),
  lootItem("loot_frost_armor", "Ayaz Avcısı Zırhı", "armor", "armor", "epic", "Buz avcılarının soğuğa dayanıklı, hafif plaka zırhı.", "Can +10 · savunma +%7", 6, { health: 10, defense: 0.07 }, { armor: "#3f6573", armorLight: "#9bc8cf", armorDark: "#203541", trim: "#d5f0ed", armorStyle: "watch" }),
  lootItem("loot_boss_greatsword", "Kül Tahtı Yıkan", "weapons", "weapon", "legendary", "Bölüm hükümdarının ağır, efsanevi büyük kılıcı.", "Hasar +%18 · menzil +0,2 m", 10, { damage: 0.18, attackSpeed: -0.1, attackRange: 0.2 }, { weaponStyle: "greatsword", weaponColor: "#f0ca78", trailColor: "#ffd778" }),
  lootItem("loot_boss_armor", "Hükümdar Zırhı", "armor", "armor", "legendary", "Kül Tahtı hükümdarının yüksek savunmalı zırhı.", "Can +16 · savunma +%16", 10, { health: 16, defense: 0.16 }, { armor: "#60482e", armorLight: "#d4aa58", armorDark: "#2c2525", trim: "#ffe09a", armorStyle: "royal" }),
  lootItem("loot_boss_cape", "Kül Tahtı Pelerini", "capes", "cape", "legendary", "Bölüm sonu hükümdarının uzun, altın işlemeli pelerini.", "Can +4 · ışık +3 m", 10, { health: 4, lightRadius: 3 }, { cape: "#6f2937", capeLength: 1.3, trim: "#ffd986" }),
  lootItem("loot_boss_emblem", "Kül Muhafızı Mührü", "effects", "effect", "legendary", "Kül Muhafızı setinin tamamlayıcı mührü; zırhı koruyucu bir aura ile sarar.", "Işık +1,25 m · Kül Muhafızı seti", 10, { lightRadius: 1.25 }, { auraColor: "#f1c777", trailColor: "#eac879", dustColor: "#d3aa63" }, "ash-guardian"),
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
  DEFAULT_EQUIPMENT.dyeId,
] as const;

export function getStoreItem(itemId: unknown): StoreItem | undefined {
  return typeof itemId === "string" ? STORE_CATALOG.find((entry) => entry.id === itemId) : undefined;
}
