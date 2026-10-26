import type { EquipmentSlot, StoreItem } from "./store-types.ts";
import { STORE_BALANCE_CONFIG } from "./store-balance.ts";
import { WEAPONS } from "./weapons.ts";
import { WAR_ROOM_WEAPONS } from "./war-room-data.ts";

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
  kind: "equipment",
  slot,
  rarity,
  description,
  summary,
  price,
  sellValue: {
    gold: Math.floor(price.gold * STORE_BALANCE_CONFIG.sellReturnRate),
    diamonds: Math.floor(price.diamonds * STORE_BALANCE_CONFIG.sellReturnRate),
  },
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
  ...item(id, name, category, slot, rarity, description, summary, { gold: 0, diamonds: 0 }, stats, ["weapon", "offhand", "helmet", "armor", "gloves", "boots", "ring"].includes(slot), visual),
  requiredLevel,
  dropOnly: true,
  sellValue: {
    gold: Math.floor((20 + requiredLevel * 16) * ({ common: 1, rare: 1.7, epic: 2.8, legendary: 4 }[rarity]) * 0.5),
    diamonds: 0,
  },
  ...(setId ? { setId } : {}),
});

const supplyItem = (
  id: string,
  name: string,
  category: "consumables" | "materials",
  rarity: StoreItem["rarity"],
  description: string,
  summary: string,
  gold: number,
  reward: NonNullable<StoreItem["reward"]>,
  icon: string,
): StoreItem => ({
  id,
  name,
  category,
  kind: category === "consumables" ? "consumable" : "material",
  slot: null,
  rarity,
  description,
  summary,
  price: { gold, diamonds: 0 },
  stats: {},
  upgradeable: false,
  visual: {},
  reward,
  icon,
});

export const EQUIPMENT_SETS = {
  "ash-guardian": {
    name: "Kül Muhafızı",
    twoPiece: STORE_BALANCE_CONFIG.equipmentSets["ash-guardian"].twoPiece,
    fourPiece: STORE_BALANCE_CONFIG.equipmentSets["ash-guardian"].fourPiece,
    pieceSlots: ["weapon", "helmet", "armor", "cape", "ring"],
  },
} as const;

const coreWeaponItems: StoreItem[] = WEAPONS.map((weapon) => ({
  id: weapon.id,
  name: weapon.name,
  category: "weapons",
  kind: "equipment",
  slot: "weapon",
  rarity: weapon.storeRarity,
  description: weapon.description,
  summary: weapon.summary,
  price: { gold: weapon.price, diamonds: 0 },
  sellValue: { gold: Math.floor(weapon.price * 0.5), diamonds: 0 },
  stats: { ...weapon.stats, critChance: weapon.criticalChance },
  upgradeable: true,
  visual: weapon.visual,
  icon: weapon.icon,
}));

const warRoomWeaponItems: StoreItem[] = WAR_ROOM_WEAPONS
  .filter((weapon) => weapon.storeItemId && weapon.weaponClass && weapon.rarity && weapon.priceGold !== undefined)
  .map((weapon) => ({
    id: weapon.storeItemId!,
    warRoomWeaponId: weapon.id,
    name: weapon.name,
    category: "weapons",
    kind: "equipment",
    slot: null,
    rarity: weapon.rarity === "Sıradan" ? "common"
      : weapon.rarity === "Nadir" ? "rare"
        : weapon.rarity === "Epik" ? "epic" : "legendary",
    description: `Savaş Odası için ${weapon.className.toLocaleLowerCase("tr-TR")}. Hazırlık ekranında iki silah yuvasından birine seçilebilir.`,
    summary: `${weapon.className} · ${weapon.magazine} mermi · menzil ${weapon.range} m`,
    price: { gold: weapon.priceGold!, diamonds: 0 },
    sellValue: { gold: Math.floor(weapon.priceGold! * STORE_BALANCE_CONFIG.sellReturnRate), diamonds: 0 },
    stats: {},
    upgradeable: false,
    visual: { weaponColor: weapon.color },
    icon: weapon.icon,
  }));

export const STORE_CATALOG: readonly StoreItem[] = [
  ...coreWeaponItems,
  ...warRoomWeaponItems,
  item("armor_ash_guard", "Kül Muhafızı", "armor", "armor", "common", "Kül Yolu'nun eski muhafızlarından kalan sade zırh.", "Başlangıç zırhı", { gold: 0, diamonds: 0 }, {}, true, { armor: "#252832", armorLight: "#41444c", armorDark: "#15171d", trim: "#c99c52", armorStyle: "ash" }),
  item("shield_wooden", "Tahta Kalkan", "armor", "offhand", "common", "Hafif bir tahta kalkan; ilk darbeleri karşılamak için.", "Savunma +%3 · başlangıç yan eli", { gold: 160, diamonds: 0 }, { defense: 0.03, health: 2 }, true, { shieldColor: "#8a603e", shieldStyle: "round", trim: "#b99363" }),
  item("shield_iron", "Demir Kalkan", "armor", "offhand", "rare", "Metal kenarlı, sağlam demir kalkan.", "Savunma +%7 · can +4", { gold: 420, diamonds: 0 }, { defense: 0.07, health: 4, moveSpeed: -0.015 }, true, { shieldColor: "#65717a", shieldStyle: "round", trim: "#d2bd87" }),
  item("shield_tower", "Kule Kalkanı", "armor", "offhand", "epic", "Büyük gövdeyi örten kule kalkanı; ağır ama güvenilir.", "Savunma +%12 · can +8 · hız −%4", { gold: 0, diamonds: 6 }, { defense: 0.12, health: 8, moveSpeed: -0.04 }, true, { shieldColor: "#4b5660", shieldStyle: "tower", trim: "#c9a85f" }),
  item("helmet_ash_crest", "Kül Miğferi", "armor", "helmet", "common", "Kül Muhafızlarının sade miğferi.", "Can +3 · savunma +%2", { gold: 190, diamonds: 0 }, { health: 3, defense: 0.02 }, true, { helmetColor: "#5b626c", helmetStyle: "crest", trim: "#d0a85f" }),
  item("helmet_night_horns", "Gece Boynuzlu Miğfer", "armor", "helmet", "epic", "Gölge şövalyelerinin boynuzlu, koyu miğferi.", "Savunma +%7 · kritik +%2", { gold: 0, diamonds: 5 }, { defense: 0.07, critChance: 0.02 }, true, { helmetColor: "#393344", helmetStyle: "horned", trim: "#ac92d5" }),
  item("armor_night_watch", "Gece Nöbetçisi", "armor", "armor", "rare", "Hafif metal katmanlarıyla savunma ve hareket arasında denge kurar.", "Can +7 · savunma +8%", { gold: 0, diamonds: 3 }, { health: 7, defense: 0.08, moveSpeed: -0.025 }, true, { armor: "#233d4b", armorLight: "#547987", armorDark: "#14252f", trim: "#7fcac5", armorStyle: "watch" }),
  item("armor_golden_knight", "Altın Şövalye", "armor", "armor", "epic", "Ağır altın işlemeli plaka zırh; yüksek savunma, daha düşük hız.", "Can +14 · savunma +14% · hız −6%", { gold: 0, diamonds: 8 }, { health: 14, defense: 0.14, moveSpeed: -0.06 }, true, { armor: "#75552c", armorLight: "#c59a4a", armorDark: "#3a2b20", trim: "#f6d68b", armorStyle: "royal" }),
  item("armor_shadow_hunter", "Gölge Avcısı", "armor", "armor", "legendary", "Sessiz hareket eden avcıların koyu, esnek zırhı.", "Savunma +6% · kritik +3% · hız +2%", { gold: 0, diamonds: 12 }, { health: 4, defense: 0.06, critChance: 0.03, moveSpeed: 0.02 }, true, { armor: "#30303c", armorLight: "#66617e", armorDark: "#171722", trim: "#aa86db", armorStyle: "shadow" }),
  item("gloves_iron_grip", "Demir Eldiven", "armor", "gloves", "common", "Eklemli demir eldivenler darbeleri daha iyi karşılar.", "Savunma +%3 · hasar +%2", { gold: 210, diamonds: 0 }, { defense: 0.03, damage: 0.02 }, true, { gloveColor: "#9ca5ab" }),
  item("boots_ash_runner", "Kül Koşucusu Çizmeleri", "armor", "boots", "rare", "Hafif tabanları kül yolunda çevik adımlar ve daha uzun kaçınmalar sağlar.", "Hız +%4 · kaçınma +%4 · dayanıklılık +12", { gold: 340, diamonds: 0 }, { moveSpeed: 0.04, defense: 0.02, dodge: 0.04, stamina: 12 }, true, { bootColor: "#7d6553", trim: "#d0a85f" }),
  item("ring_ember", "Kor Yüzüğü", "accessories", "ring", "rare", "Kor kristalli yüzük; saldırı gücüne küçük bir katkı sağlar.", "Hasar +%3 · can +2", { gold: 0, diamonds: 3 }, { damage: 0.03, health: 2 }, true, { ringColor: "#ed9052", auraColor: "#ed9052" }),
  item("ring_storm", "Fırtına Tılsımı", "accessories", "ring", "epic", "Mavi kristalli tılsım; kritik darbeleri ve kaçınma süresini artırır.", "Kritik +%4 · kritik hasarı +%8 · hız +%2", { gold: 0, diamonds: 5 }, { critChance: 0.04, critDamage: 0.08, moveSpeed: 0.02, dodge: 0.025 }, true, { ringColor: "#78c6d2", auraColor: "#78c6d2" }),
  item("cape_worn", "Yıpranmış Pelerin", "accessories", "cape", "common", "Uzun yolculuklardan kalma, hafif bir pelerin.", "Başlangıç pelerini", { gold: 0, diamonds: 0 }, {}, false, { cape: "#872e36", capeLength: 1.02 }),
  item("cape_ember_cloak", "Kor Pelerini", "accessories", "cape", "common", "Rüzgârda kıvılcım gibi parlayan kısa, sıcak tonlu pelerin.", "Işık +1,5 m · hız +2%", { gold: 280, diamonds: 0 }, { lightRadius: 1.5, moveSpeed: 0.02 }, false, { cape: "#bd4d31", capeLength: 0.86, trim: "#f2a05b" }),
  item("cape_night_veil", "Gece Örtüsü", "accessories", "cape", "rare", "Koyu kumaşıyla hafifleyen ve hareketi kolaylaştıran pelerin.", "Işık +1 m · hız +5%", { gold: 0, diamonds: 3 }, { lightRadius: 1, moveSpeed: 0.05 }, false, { cape: "#393456", capeLength: 1.18, trim: "#9f91cc" }),
  item("cape_gilded_mantle", "Yaldızlı Manto", "accessories", "cape", "epic", "Altın kenar işlemeli uzun şövalye mantosu.", "Işık +3 m · can +3", { gold: 0, diamonds: 7 }, { health: 3, lightRadius: 3 }, false, { cape: "#8b6837", capeLength: 1.25, trim: "#f3d28e" }),
  item("effect_none", "Sade İz", "accessories", "effect", "common", "Özel kılıç izi veya aura kullanılmaz.", "Efekt uygulanmıyor", { gold: 0, diamonds: 0 }, {}, false, {}),
  item("effect_ember_trail", "Kor İzi", "accessories", "effect", "common", "Hareket ederken ve vuruşlarda sıcak kor rengi bırakır.", "Kor izi · sıcak aura", { gold: 180, diamonds: 0 }, { lightRadius: 0.5 }, false, { trailColor: "#ff7847", dustColor: "#e9874f", auraColor: "#ff9459" }),
  item("effect_frost_trail", "Buz Yayı", "accessories", "effect", "rare", "Saldırı izini soğuk mavi ışıkla belirginleştirir.", "Buz izi · serin aura", { gold: 0, diamonds: 2 }, { lightRadius: 0.5 }, false, { trailColor: "#8fe8ff", dustColor: "#90cddd", auraColor: "#83d5fa" }),
  item("effect_venom_trail", "Zehir Sisi", "accessories", "effect", "rare", "Hareket sırasında kısa ömürlü yeşil bir iz bırakır.", "Zehir izi · yeşil aura", { gold: 0, diamonds: 3 }, {}, false, { trailColor: "#8beb85", dustColor: "#70ad67", auraColor: "#8bd46d" }),
  item("effect_gilded_trail", "Altın Yörünge", "accessories", "effect", "epic", "Vuruş ve adım izlerini parlak altınla çevreler.", "Altın izi · ışık +1 m", { gold: 0, diamonds: 5 }, { lightRadius: 1 }, false, { trailColor: "#ffd37a", dustColor: "#f0c16d", auraColor: "#f1c777" }),
  item("dye_none", "Doğal Renk", "accessories", "dye", "common", "Zırhın ve pelerinin kendi renklerini kullan.", "Boya uygulanmıyor", { gold: 0, diamonds: 0 }, {}, false, {}),
  item("dye_crimson", "Kızıl Boya", "accessories", "dye", "rare", "Zırh ve pelerine koyu kızıl bir renk uygular.", "Zırh/pelerin rengi: kızıl", { gold: 0, diamonds: 2 }, {}, false, { dyeColor: "#a93b42" }),
  item("dye_glacier", "Buz Mavisi Boya", "accessories", "dye", "rare", "Zırh ve pelerine soğuk buz mavisi bir renk uygular.", "Zırh/pelerin rengi: buz mavisi", { gold: 0, diamonds: 2 }, {}, false, { dyeColor: "#4f9eb7" }),
  item("dye_royal_gold", "Kraliyet Altını", "accessories", "dye", "epic", "Zırh ve pelerini yaldızlı altın tonuna boyar.", "Zırh/pelerin rengi: altın", { gold: 0, diamonds: 4 }, {}, false, { dyeColor: "#c99743" }),
  item("special_ash_reaver", "Kül Yarıcı", "specials", "weapon", "legendary", "Demircinin bugünkü özel teklifi: ağır, uzun menzilli iki elli silah.", "Günlük özel · hasar +%16 · menzil +0,2 m", { gold: 0, diamonds: 9 }, { damage: 0.16, attackSpeed: -0.12, attackRange: 0.2 }, true, { weaponStyle: "greatsword", weaponColor: "#d8a966", trailColor: "#f3bd67" }),
  item("special_ember_crown", "Kor Tacı", "specials", "helmet", "epic", "Kül ocaklarında dövülmüş boynuzlu miğfer; günün sınırlı teklifi.", "Günlük özel · can +6 · kor boynuzları", { gold: 0, diamonds: 6 }, { health: 6, defense: 0.035 }, true, { helmetColor: "#a94e38", helmetStyle: "horned", trim: "#f0bd70" }),
  item("special_tower_ward", "Kül Nöbeti Kalkanı", "specials", "offhand", "legendary", "Kapı muhafızlarının ağır kalkanı; savunma için özel günlük teklif.", "Günlük özel · savunma +%10", { gold: 0, diamonds: 8 }, { defense: 0.1, health: 4 }, true, { shieldColor: "#6b7885", shieldStyle: "tower", trim: "#d2a95b" }),
  item("special_moon_ring", "Ay Mührü", "specials", "ring", "epic", "Parıltısı kritik vuruşlarda belirginleşen nadir yüzük.", "Günlük özel · kritik +%5 · ışık +1 m", { gold: 0, diamonds: 5 }, { critChance: 0.05, lightRadius: 1 }, true, { ringColor: "#9bc8ef", auraColor: "#9bc8ef" }),
  supplyItem("supply_health_potion", "Can İksiri", "consumables", "common", "Düelloda 44 can yeniler. Heybende en fazla 999 adet tutulabilir.", "Savaş eşyası · 1 adet", 55, { type: "combat-item", itemId: "health_potion", amount: 1 }, "✚"),
  supplyItem("supply_stamina_potion", "Dayanıklılık İksiri", "consumables", "common", "Düelloda 45 dayanıklılık yeniler.", "Savaş eşyası · 1 adet", 45, { type: "combat-item", itemId: "stamina_potion", amount: 1 }, "↯"),
  supplyItem("supply_venom_vial", "Zehir Şişesi", "consumables", "rare", "Yakındaki rakibi zehirlemek için savaş çantana eklenir.", "Savaş eşyası · 1 adet", 95, { type: "combat-item", itemId: "venom_vial", amount: 1 }, "☠"),
  supplyItem("supply_throwing_knife", "Fırlatma Bıçağı", "consumables", "common", "Uzak rakibe hasar verir; savaş çantana 1 adet eklenir.", "Savaş eşyası · 1 adet", 65, { type: "combat-item", itemId: "throwing_knife", amount: 1 }, "⌁"),
  supplyItem("supply_explosive_flask", "Patlayıcı Şişe", "consumables", "rare", "Yakın rakibe alan hasarı verir; savaş çantana 1 adet eklenir.", "Savaş eşyası · 1 adet", 90, { type: "combat-item", itemId: "explosive_flask", amount: 1 }, "✹"),
  supplyItem("supply_smoke_bomb", "Sis Bombası", "consumables", "rare", "Kısa süreli koruma sağlar; savaş çantana 1 adet eklenir.", "Savaş eşyası · 1 adet", 85, { type: "combat-item", itemId: "smoke_bomb", amount: 1 }, "◌"),
  supplyItem("supply_arrows", "Ok Paketi", "consumables", "common", "Yay cephanesi; 20 ok.", "Cephane · 20 ok", 100, { type: "combat-item", itemId: "arrow_ammo", amount: 20 }, "➶"),
  supplyItem("supply_bolts", "Arbalet Cıvatası", "consumables", "common", "Arbalet cephanesi; 20 cıvata.", "Cephane · 20 cıvata", 130, { type: "combat-item", itemId: "bolt_ammo", amount: 20 }, "⟿"),
  supplyItem("supply_throwing_blades", "Fırlatma Bıçağı Paketi", "consumables", "common", "Fırlatma silahları için 20 bıçak.", "Cephane · 20 bıçak", 110, { type: "combat-item", itemId: "throwing_blade_ammo", amount: 20 }, "⌁"),
  supplyItem("material_iron_shard", "Demir Kırığı", "materials", "common", "Demirci geliştirmelerinde kullanılan işlenebilir metal.", "Geliştirme malzemesi · 1 adet", 50, { type: "material", material: "ironShards", amount: 1 }, "⬟"),
  supplyItem("material_ember_crystal", "Kor Kristali", "materials", "rare", "Ekipman geliştirmelerinde kullanılan sıcak kristal.", "Geliştirme malzemesi · 1 adet", 90, { type: "material", material: "emberCrystals", amount: 1 }, "◆"),
  supplyItem("material_seal_fragment", "Mühür Parçası", "materials", "epic", "Üst seviye geliştirmeleri için gereken nadir parça.", "Geliştirme malzemesi · 1 adet", 160, { type: "material", material: "sealFragments", amount: 1 }, "✦"),
  lootItem("loot_gate_sword", "Nöbetçi Kılıcı", "weapons", "weapon", "rare", "Kapı nöbetçilerinin dengeli, sağlam kılıcı.", "Hasar +%7 · Kül Muhafızı seti", 2, { damage: 0.07 }, { weaponStyle: "sword", weaponColor: "#b7b2a3" }, "ash-guardian"),
  lootItem("loot_gate_armor", "Nöbetçi Zırhı", "armor", "armor", "rare", "Kül Yolu kapılarında nöbet tutanların katmanlı zırhı.", "Can +6 · savunma +%6", 2, { health: 6, defense: 0.06 }, { armor: "#343a3e", armorLight: "#85816f", armorDark: "#191e24", trim: "#c0a46b", armorStyle: "watch" }),
  lootItem("loot_iron_mace", "Demir Ant Gürzü", "weapons", "weapon", "rare", "Demir yemini taşıyan muhafızların ağır gürzü.", "Hasar +%10 · saldırı hızı −%4", 4, { damage: 0.1, attackSpeed: -0.04 }, { weaponStyle: "mace", weaponColor: "#89919a" }),
  lootItem("loot_iron_plate", "Ant Zırhı", "armor", "armor", "epic", "Demir antla güçlendirilmiş, ağır plaka zırh.", "Can +10 · savunma +%11 · Kül Muhafızı seti", 4, { health: 10, defense: 0.11 }, { armor: "#393b3b", armorLight: "#aaa38f", armorDark: "#1d2226", trim: "#d3b56f", armorStyle: "royal" }, "ash-guardian"),
  lootItem("loot_ash_bow", "Küllü Yay", "weapons", "weapon", "rare", "Kül Avcılarının uzak menzilden ateş eden yayı.", "Kritik +%4 · menzil +0,35 m", 3, { critChance: 0.04, attackRange: 0.35 }, { weaponStyle: "bow", weaponColor: "#b17e50", trailColor: "#e3b06b" }),
  lootItem("loot_ash_cape", "Avcı Pelerini", "accessories", "cape", "rare", "Hafif kumaşı kül fırtınasında yön bulmaya yardım eder.", "Işık +1,2 m · hız +%2 · Kül Muhafızı seti", 3, { lightRadius: 1.2, moveSpeed: 0.02 }, { cape: "#8f493c", capeLength: 0.9, trim: "#d49a63" }, "ash-guardian"),
  lootItem("loot_shadow_blade", "Gece Dişleri", "weapons", "weapon", "epic", "Gölge şövalyelerinin seri karşı vuruşlarına uygun çift hançer.", "Hasar +%7 · kritik +%7 · hız +%5", 6, { damage: 0.07, critChance: 0.07, attackSpeed: 0.05 }, { weaponStyle: "daggers", weaponColor: "#9f8bcc", trailColor: "#a989df" }),
  lootItem("loot_shadow_veil", "Gölge Örtüsü", "accessories", "cape", "epic", "Karanlıkta silueti yutan, hafif bir pelerin.", "Işık +1 m · hız +%4", 6, { lightRadius: 1, moveSpeed: 0.04 }, { cape: "#353142", capeLength: 1.2, trim: "#a18dc3", armorStyle: "shadow" }),
  lootItem("loot_storm_spear", "Yıldırım Mızrağı", "weapons", "weapon", "epic", "Fırtına mızrakçılarının uzun erişimli silahı.", "Hasar +%6 · menzil +0,55 m", 7, { damage: 0.06, attackRange: 0.55 }, { weaponStyle: "spear", weaponColor: "#7bc6d1", trailColor: "#a1e9ef" }),
  lootItem("loot_storm_trail", "Fırtına İzi", "accessories", "effect", "rare", "Her vuruşta mavi bir kıvılcım izi bırakır.", "Kritik +%2 · mavi aura", 7, { critChance: 0.02, lightRadius: 0.6 }, { trailColor: "#73d9f0", dustColor: "#7ebfce", auraColor: "#78d7eb" }),
  lootItem("loot_rift_axe", "Yarık Baltası", "weapons", "weapon", "epic", "Yarık enerjisiyle ağırlaşmış, kuvvetli bir savaş baltası.", "Hasar +%14 · saldırı hızı −%10", 8, { damage: 0.14, attackSpeed: -0.1 }, { weaponStyle: "axe", weaponColor: "#cf755b", trailColor: "#f18265" }),
  lootItem("loot_rift_armor", "Berserker Plakası", "armor", "armor", "epic", "Yarık savaşçılarının darbeye dayanıklı koyu zırhı.", "Can +12 · savunma +%8", 8, { health: 12, defense: 0.08 }, { armor: "#492d31", armorLight: "#9a5951", armorDark: "#241d24", trim: "#e18d69", armorStyle: "shadow" }),
  lootItem("loot_ember_mace", "Kor Döküm Asası", "weapons", "weapon", "rare", "Alev simyacılarının yakın dövüşte kullandığı kor döküm asa.", "Hasar +%8 · kor rengi iz", 5, { damage: 0.08, attackRange: 0.12 }, { weaponStyle: "mace", weaponColor: "#e18d52", trailColor: "#ff9050" }),
  lootItem("loot_ember_cape", "Kor Simyacısı Pelerini", "accessories", "cape", "epic", "Sıcak korlarla işlenmiş, ışığı genişleten pelerin.", "Can +4 · ışık +2 m", 5, { health: 4, lightRadius: 2 }, { cape: "#a34930", capeLength: 0.98, trim: "#f2b15f" }),
  lootItem("loot_venom_dagger", "Sessiz Zehir", "weapons", "weapon", "epic", "Zehirli suikastçıların hızlı ve keskin hançeri.", "Kritik +%8 · saldırı hızı +%8", 8, { critChance: 0.08, attackSpeed: 0.08 }, { weaponStyle: "daggers", weaponColor: "#75ba82", trailColor: "#8ce889", auraColor: "#68ad67" }),
  lootItem("loot_venom_dye", "Zümrüt Zehir Boyası", "accessories", "dye", "epic", "Zırh ve pelerine suikastçıların yeşil tonunu verir.", "Zırh/pelerin rengi: zehir yeşili", 8, {}, { dyeColor: "#51875c" }),
  lootItem("loot_frost_bow", "Ayaz Yayı", "weapons", "weapon", "rare", "Donmuş kirişleri uzak mesafeden sessizce fırlatır.", "Kritik +%6 · menzil +0,2 m", 6, { critChance: 0.06, attackRange: 0.2 }, { weaponStyle: "bow", weaponColor: "#9adbe7", trailColor: "#a6eaff" }),
  lootItem("loot_frost_armor", "Ayaz Avcısı Zırhı", "armor", "armor", "epic", "Buz avcılarının soğuğa dayanıklı, hafif plaka zırhı.", "Can +10 · savunma +%7", 6, { health: 10, defense: 0.07 }, { armor: "#3f6573", armorLight: "#9bc8cf", armorDark: "#203541", trim: "#d5f0ed", armorStyle: "watch" }),
  lootItem("loot_boss_greatsword", "Kül Tahtı Yıkan", "weapons", "weapon", "legendary", "Bölüm hükümdarının ağır, efsanevi büyük kılıcı.", "Hasar +%18 · menzil +0,2 m", 10, { damage: 0.18, attackSpeed: -0.1, attackRange: 0.2 }, { weaponStyle: "greatsword", weaponColor: "#f0ca78", trailColor: "#ffd778" }),
  lootItem("loot_boss_armor", "Hükümdar Zırhı", "armor", "armor", "legendary", "Kül Tahtı hükümdarının yüksek savunmalı zırhı.", "Can +16 · savunma +%16", 10, { health: 16, defense: 0.16 }, { armor: "#60482e", armorLight: "#d4aa58", armorDark: "#2c2525", trim: "#ffe09a", armorStyle: "royal" }),
  lootItem("loot_boss_cape", "Kül Tahtı Pelerini", "accessories", "cape", "legendary", "Bölüm sonu hükümdarının uzun, altın işlemeli pelerini.", "Can +4 · ışık +3 m", 10, { health: 4, lightRadius: 3 }, { cape: "#6f2937", capeLength: 1.3, trim: "#ffd986" }),
  lootItem("loot_boss_emblem", "Kül Muhafızı Mührü", "accessories", "effect", "legendary", "Kül Muhafızı setinin tamamlayıcı mührü; zırhı koruyucu bir aura ile sarar.", "Işık +1,25 m · Kül Muhafızı seti", 10, { lightRadius: 1.25 }, { auraColor: "#f1c777", trailColor: "#eac879", dustColor: "#d3aa63" }, "ash-guardian"),
] as const;

export const DEFAULT_EQUIPMENT = {
  weaponId: "weapon_ash_sword",
  offhandId: null,
  helmetId: null,
  armorId: "armor_ash_guard",
  glovesId: null,
  bootsId: null,
  capeId: "cape_worn",
  ringOneId: null,
  ringTwoId: null,
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

export function getDailySpecials(date = new Date()): readonly StoreItem[] {
  const offers = STORE_CATALOG.filter((entry) => entry.category === "specials");
  if (offers.length === 0) return [];
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((entry) => entry.type === type)?.value);
  const dayIndex = Math.floor(Date.UTC(part("year"), part("month") - 1, part("day")) / 86_400_000);
  const start = ((dayIndex % offers.length) + offers.length) % offers.length;
  return Array.from({ length: Math.min(2, offers.length) }, (_, index) => offers[(start + index) % offers.length]);
}

export function isDailySpecialAvailable(itemId: string, date = new Date()) {
  const item = getStoreItem(itemId);
  return !item || item.category !== "specials" || getDailySpecials(date).some((offer) => offer.id === itemId);
}
