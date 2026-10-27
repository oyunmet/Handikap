export const WAR_ROOM_EFFECT_POOL_SIZE = 72;
export const WAR_ROOM_EFFECT_POOL_LIMIT = 150;
export const WAR_ROOM_DECAL_POOL_SIZE = 30;
export const WAR_ROOM_SLASH_TRAIL_SEGMENTS = 10;
export const WAR_ROOM_CRACK_DECAL_LIFETIME_SECONDS = 2.6;

export type WarRoomImpactSurface = "flesh" | "metal" | "stone";

type WarRoomImpactStyle = {
  impactType: string;
  sparkParticles: number;
  dustParticles: number;
  sparkColor: string;
  dustColor: string;
  flashColor: string;
};

const WAR_ROOM_WEAPON_IMPACT_STYLES: Record<string, WarRoomImpactStyle> = {
  melee_knife: { impactType: "KESİK", sparkParticles: 4, dustParticles: 2, sparkColor: "#d6f5ff", dustColor: "#b8a997", flashColor: "#ff936e" },
  melee_axe: { impactType: "BALTA", sparkParticles: 6, dustParticles: 5, sparkColor: "#ffc36d", dustColor: "#c5a17b", flashColor: "#ffad69" },
  melee_cudgel: { impactType: "EZME", sparkParticles: 3, dustParticles: 7, sparkColor: "#ffe0a0", dustColor: "#b5a187", flashColor: "#ffd58c" },
  melee_spear: { impactType: "DELİŞ", sparkParticles: 5, dustParticles: 2, sparkColor: "#93f5e8", dustColor: "#a9b5a4", flashColor: "#9bfff0" },
  melee_shovel: { impactType: "TOPRAK", sparkParticles: 3, dustParticles: 8, sparkColor: "#dfc08a", dustColor: "#c59a67", flashColor: "#f2c78c" },
  melee_staff: { impactType: "ENERJİ", sparkParticles: 6, dustParticles: 3, sparkColor: "#c0a4ff", dustColor: "#9b91b5", flashColor: "#d3b3ff" },
  melee_war_spear: { impactType: "SAVAŞ MIZRAĞI", sparkParticles: 7, dustParticles: 3, sparkColor: "#73efe4", dustColor: "#a5b8ae", flashColor: "#82fff2" },
  melee_pickaxe: { impactType: "MADEN", sparkParticles: 8, dustParticles: 5, sparkColor: "#ffe08a", dustColor: "#ad987d", flashColor: "#fff09a" },
  powder_rifle: { impactType: "TÜFEK", sparkParticles: 5, dustParticles: 3, sparkColor: "#ffd187", dustColor: "#b8a692", flashColor: "#ffe08a" },
  sidearm: { impactType: "TABANCA", sparkParticles: 4, dustParticles: 2, sparkColor: "#ffcf9a", dustColor: "#b8a692", flashColor: "#ffe8a8" },
  scattergun: { impactType: "SAÇMA", sparkParticles: 7, dustParticles: 5, sparkColor: "#ffd17a", dustColor: "#c0a98e", flashColor: "#fff0a8" },
  longbow: { impactType: "YAY", sparkParticles: 3, dustParticles: 3, sparkColor: "#c7f3c4", dustColor: "#acb39a", flashColor: "#cbffbd" },
  crossbow: { impactType: "ARBALet", sparkParticles: 5, dustParticles: 3, sparkColor: "#f8d7a1", dustColor: "#b3a48e", flashColor: "#ffe5a6" },
};

export function getWarRoomImpactFxProfile(
  bloodEnabled: boolean,
  heavy: boolean,
  surface: WarRoomImpactSurface = "flesh",
  weaponId = "melee_knife",
) {
  const style = WAR_ROOM_WEAPON_IMPACT_STYLES[weaponId] ?? WAR_ROOM_WEAPON_IMPACT_STYLES.powder_rifle;
  return {
    impactType: style.impactType,
    bloodParticles: bloodEnabled && surface === "flesh" ? 2 : 0,
    sparkParticles: style.sparkParticles + (surface === "metal" ? 2 : 0) + (heavy ? 1 : 0),
    dustParticles: style.dustParticles + (surface === "stone" ? 2 : 0) + (heavy ? 1 : 0),
    sparkColor: surface === "metal" ? "#ffe3a0" : style.sparkColor,
    dustColor: surface === "stone" ? "#bfb6a5" : style.dustColor,
    flashColor: style.flashColor,
    shockwave: heavy,
    crackDecal: heavy,
  } as const;
}
