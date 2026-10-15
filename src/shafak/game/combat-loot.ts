import type { CombatBotArchetype, CombatDifficulty } from "./combat-engine.ts";

const LOOT_TABLES: Record<CombatBotArchetype, readonly string[]> = {
  "gate-warden": ["Nöbetçi Tokası", "Kırık Demir Mühür", "Muhafızın Eski Madalyası"],
  "iron-oath": ["Demir Yemin Halkası", "Ağır Zırh Perçini", "Çelik Ant Parçası"],
  "ash-archer": ["Kül Okçusu Tüyü", "İşlenmiş Ok Ucu", "Kızıl Yay İpi"],
  "shadow-knight": ["Gölge Şövalyesi Astarı", "Gece Mührü", "Mor Çelik Kırığı"],
  "storm-lancer": ["Fırtına Mızrak Ucu", "Yıldırım Camı", "Mızrakçı Tokası"],
  "rift-berserker": ["Yarık Dişi", "Berserker Sargısı", "Kızıl Balta Pulu"],
  "ember-alchemist": ["Kor Şişesi", "Simyacı Mührü", "Alev Külü"],
  "venom-assassin": ["Zehir Kesesi", "Sessiz Bıçak Kını", "Yeşil Cam Damlacığı"],
  "frost-hunter": ["Ayaz Pençesi", "Donmuş Ok Başı", "Buzlu Pelerin Tokası"],
  "chapter-boss": ["Bölüm Tacı", "Kül Tahtı Mührü", "Hükümdarın Kırık Zırhı"],
};

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function stableHash(value: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

export function rollCombatLoot(
  archetype: CombatBotArchetype,
  rivalLevel: number,
  seed: number,
  difficulty: CombatDifficulty,
  isElite = false,
): string | null {
  const random = seededRandom((seed ^ stableHash(archetype) ^ Math.imul(Math.max(1, rivalLevel), 0x45d9f3b)) >>> 0);
  const dropChance = archetype === "chapter-boss"
    ? 1
    : Math.min(0.82, 0.38 + Math.max(0, Math.min(100, rivalLevel)) * 0.004 + (isElite ? 0.2 : 0) + (difficulty === "hard" ? 0.08 : 0));
  if (random() >= dropChance) return null;
  const table = LOOT_TABLES[archetype];
  return table[Math.floor(random() * table.length)] ?? null;
}
