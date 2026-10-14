export const COMBAT_ITEMS = [
  {
    id: "health_potion",
    name: "Can İksiri",
    icon: "✚",
    shortName: "CAN",
    description: "44 can yeniler.",
    cooldownTicks: 720,
    effect: "health",
    amount: 44,
  },
  {
    id: "stamina_potion",
    name: "Dayanıklılık İksiri",
    icon: "↯",
    shortName: "GÜÇ",
    description: "45 dayanıklılık yeniler.",
    cooldownTicks: 600,
    effect: "stamina",
    amount: 45,
  },
  {
    id: "venom_vial",
    name: "Zehir Şişesi",
    icon: "☠",
    shortName: "ZEHİR",
    description: "Yakındaki rakibi 3 saniye zehirler.",
    cooldownTicks: 1_080,
    effect: "poison",
    amount: 2,
  },
  {
    id: "throwing_knife",
    name: "Fırlatma Bıçağı",
    icon: "⌁",
    shortName: "BIÇAK",
    description: "Uzak rakibe 13 hasar verir.",
    cooldownTicks: 480,
    effect: "damage",
    amount: 13,
  },
  {
    id: "explosive_flask",
    name: "Patlayıcı Şişe",
    icon: "✹",
    shortName: "PATLA",
    description: "Yakın rakibe 19 hasar verir.",
    cooldownTicks: 840,
    effect: "damage",
    amount: 19,
  },
  {
    id: "smoke_bomb",
    name: "Sis Bombası",
    icon: "◌",
    shortName: "SİS",
    description: "1 saniyeye yakın hasar almanı önler.",
    cooldownTicks: 960,
    effect: "smoke",
    amount: 55,
  },
] as const;

export type CombatItemId = (typeof COMBAT_ITEMS)[number]["id"];
export type CombatItem = (typeof COMBAT_ITEMS)[number];
export type CombatItemCounts = Record<CombatItemId, number>;
export type CombatQuickSlots = [CombatItemId | null, CombatItemId | null, CombatItemId | null, CombatItemId | null];

export const DEFAULT_COMBAT_ITEM_COUNTS: CombatItemCounts = {
  health_potion: 2,
  stamina_potion: 2,
  venom_vial: 1,
  throwing_knife: 2,
  explosive_flask: 1,
  smoke_bomb: 1,
};

export const DEFAULT_COMBAT_QUICK_SLOTS: CombatQuickSlots = [
  "health_potion",
  "stamina_potion",
  "throwing_knife",
  "smoke_bomb",
];

const COMBAT_ITEM_IDS = new Set<string>(COMBAT_ITEMS.map((item) => item.id));

export function getCombatItem(itemId: unknown): CombatItem | undefined {
  return typeof itemId === "string" ? COMBAT_ITEMS.find((item) => item.id === itemId) : undefined;
}

export function isCombatItemId(value: unknown): value is CombatItemId {
  return typeof value === "string" && COMBAT_ITEM_IDS.has(value);
}

export function normalizeCombatItemCounts(value: unknown): CombatItemCounts {
  if (value === undefined || value === null) return { ...DEFAULT_COMBAT_ITEM_COUNTS };
  const source = typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return Object.fromEntries(COMBAT_ITEMS.map(({ id }) => {
    const count = source[id];
    return [id, typeof count === "number" && Number.isSafeInteger(count) && count >= 0
      ? Math.min(999, count)
      : 0];
  })) as CombatItemCounts;
}

export function normalizeCombatQuickSlots(value: unknown, counts: CombatItemCounts): CombatQuickSlots {
  const source = Array.isArray(value) && value.length === 4 ? value : DEFAULT_COMBAT_QUICK_SLOTS;
  return source.map((itemId) => (
    isCombatItemId(itemId) && counts[itemId] > 0 ? itemId : null
  )) as CombatQuickSlots;
}
