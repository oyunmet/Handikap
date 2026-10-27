export const WAR_ROOM_EFFECT_POOL_SIZE = 72;
export const WAR_ROOM_EFFECT_POOL_LIMIT = 150;
export const WAR_ROOM_DECAL_POOL_SIZE = 30;
export const WAR_ROOM_SLASH_TRAIL_SEGMENTS = 10;
export const WAR_ROOM_CRACK_DECAL_LIFETIME_SECONDS = 2.6;

export type WarRoomImpactSurface = "flesh" | "metal" | "stone";
export type WarRoomMeleeTrailStyle = "slash" | "sweep" | "thrust";

type WarRoomImpactStyle = {
  impactType: string;
  trailStyle?: WarRoomMeleeTrailStyle;
  trailColor: string;
  trailIntensity: number;
  blood: boolean;
  sparkParticles: number;
  dustParticles: number;
  flashParticles: number;
  exitSplashParticles?: number;
  sparkColor: string;
  dustColor: string;
  flashColor: string;
  dustRing?: boolean;
  shockwaveOnHeavy?: boolean;
  crackOnHeavy?: boolean;
};

const WAR_ROOM_WEAPON_IMPACT_STYLES: Record<string, WarRoomImpactStyle> = {
  melee_knife: {
    impactType: "BIÇAK KESİĞİ", trailStyle: "slash", trailColor: "#d6f5ff", trailIntensity: 1,
    blood: true, sparkParticles: 4, dustParticles: 1, flashParticles: 3,
    sparkColor: "#d6f5ff", dustColor: "#b8a997", flashColor: "#ff936e",
  },
  melee_axe: {
    impactType: "AĞIR BALTA KESİĞİ", trailStyle: "slash", trailColor: "#ffc36d", trailIntensity: 0.95,
    blood: true, sparkParticles: 6, dustParticles: 4, flashParticles: 4,
    sparkColor: "#ffc36d", dustColor: "#c5a17b", flashColor: "#ffad69",
    shockwaveOnHeavy: true, crackOnHeavy: true,
  },
  melee_cudgel: {
    impactType: "SOPA EZMESİ", trailStyle: "sweep", trailColor: "#ffe0a0", trailIntensity: 0.72,
    blood: false, sparkParticles: 0, dustParticles: 7, flashParticles: 4,
    sparkColor: "#ffe0a0", dustColor: "#b5a187", flashColor: "#ffd58c",
    dustRing: true, shockwaveOnHeavy: true,
  },
  melee_spear: {
    impactType: "MIZRAK SAPLAMASI", trailStyle: "thrust", trailColor: "#93f5e8", trailIntensity: 1,
    blood: true, sparkParticles: 4, dustParticles: 1, flashParticles: 5, exitSplashParticles: 3,
    sparkColor: "#93f5e8", dustColor: "#a9b5a4", flashColor: "#9bfff0",
  },
  melee_shovel: {
    impactType: "KÜREK TOPRAK DARBESİ", trailStyle: "sweep", trailColor: "#dfc08a", trailIntensity: 0.72,
    blood: false, sparkParticles: 0, dustParticles: 8, flashParticles: 3,
    sparkColor: "#dfc08a", dustColor: "#c59a67", flashColor: "#f2c78c", dustRing: true,
  },
  melee_staff: {
    impactType: "ASA EZMESİ", trailStyle: "sweep", trailColor: "#c0a4ff", trailIntensity: 0.82,
    blood: false, sparkParticles: 0, dustParticles: 6, flashParticles: 5,
    sparkColor: "#c0a4ff", dustColor: "#9b91b5", flashColor: "#d3b3ff",
    dustRing: true, shockwaveOnHeavy: true,
  },
  melee_war_spear: {
    impactType: "SAVAŞ MIZRAĞI SAPLAMASI", trailStyle: "thrust", trailColor: "#73efe4", trailIntensity: 1,
    blood: true, sparkParticles: 5, dustParticles: 1, flashParticles: 5, exitSplashParticles: 3,
    sparkColor: "#73efe4", dustColor: "#a5b8ae", flashColor: "#82fff2",
  },
  melee_pickaxe: {
    impactType: "KAZMA METAL DARBESİ", trailStyle: "slash", trailColor: "#ffe08a", trailIntensity: 0.9,
    blood: true, sparkParticles: 7, dustParticles: 5, flashParticles: 4,
    sparkColor: "#ffe08a", dustColor: "#ad987d", flashColor: "#fff09a",
    shockwaveOnHeavy: true, crackOnHeavy: true,
  },
  powder_rifle: {
    impactType: "TÜFEK İSABETİ", trailColor: "#ffd187", trailIntensity: 1,
    blood: true, sparkParticles: 5, dustParticles: 3, flashParticles: 3,
    sparkColor: "#ffd187", dustColor: "#b8a692", flashColor: "#ffe08a",
  },
  sidearm: {
    impactType: "TABANCA İSABETİ", trailColor: "#ffcf9a", trailIntensity: 1,
    blood: true, sparkParticles: 4, dustParticles: 2, flashParticles: 3,
    sparkColor: "#ffcf9a", dustColor: "#b8a692", flashColor: "#ffe8a8",
  },
  scattergun: {
    impactType: "SAÇMA İSABETİ", trailColor: "#ffd17a", trailIntensity: 1,
    blood: true, sparkParticles: 7, dustParticles: 5, flashParticles: 3,
    sparkColor: "#ffd17a", dustColor: "#c0a98e", flashColor: "#fff0a8",
  },
  longbow: {
    impactType: "YAY İSABETİ", trailColor: "#c7f3c4", trailIntensity: 1,
    blood: true, sparkParticles: 3, dustParticles: 3, flashParticles: 3,
    sparkColor: "#c7f3c4", dustColor: "#acb39a", flashColor: "#cbffbd",
  },
  crossbow: {
    impactType: "ARBALET İSABETİ", trailColor: "#f8d7a1", trailIntensity: 1,
    blood: true, sparkParticles: 5, dustParticles: 3, flashParticles: 3,
    sparkColor: "#f8d7a1", dustColor: "#b3a48e", flashColor: "#ffe5a6",
  },
};

export function getWarRoomImpactFxProfile(
  bloodEnabled: boolean,
  heavy: boolean,
  surface: WarRoomImpactSurface = "flesh",
  weaponId = "melee_knife",
) {
  const style = WAR_ROOM_WEAPON_IMPACT_STYLES[weaponId]
    ?? WAR_ROOM_WEAPON_IMPACT_STYLES.powder_rifle;
  const metalImpact = surface === "metal";
  const stoneImpact = surface === "stone";
  return {
    impactType: style.impactType,
    trailStyle: style.trailStyle ?? "slash",
    trailColor: style.trailColor,
    trailIntensity: style.trailIntensity,
    bloodParticles: bloodEnabled && surface === "flesh" && style.blood ? 2 : 0,
    sparkParticles: stoneImpact
      ? 0
      : metalImpact
        ? Math.max(4, style.sparkParticles + 2)
        : style.sparkParticles > 0
          ? style.sparkParticles + (heavy ? 1 : 0)
          : 0,
    dustParticles: stoneImpact
      ? Math.max(6, style.dustParticles + 2)
      : style.dustParticles + (heavy ? 1 : 0),
    flashParticles: style.flashParticles + (heavy ? 1 : 0),
    exitSplashParticles: style.exitSplashParticles ?? 0,
    sparkColor: metalImpact ? "#ffe3a0" : style.sparkColor,
    dustColor: stoneImpact ? "#bfb6a5" : style.dustColor,
    flashColor: style.flashColor,
    dustRing: Boolean(style.dustRing || stoneImpact),
    shockwave: heavy && Boolean(style.shockwaveOnHeavy),
    crackDecal: heavy && (Boolean(style.crackOnHeavy) || stoneImpact),
  } as const;
}
