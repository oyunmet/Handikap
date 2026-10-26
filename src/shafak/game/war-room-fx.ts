export const WAR_ROOM_EFFECT_POOL_SIZE = 72;
export const WAR_ROOM_EFFECT_POOL_LIMIT = 150;
export const WAR_ROOM_DECAL_POOL_SIZE = 30;
export const WAR_ROOM_SLASH_TRAIL_SEGMENTS = 10;
export const WAR_ROOM_CRACK_DECAL_LIFETIME_SECONDS = 2.6;

export type WarRoomImpactSurface = "flesh" | "metal" | "stone";

export function getWarRoomImpactFxProfile(
  bloodEnabled: boolean,
  heavy: boolean,
  surface: WarRoomImpactSurface = "flesh",
) {
  const fleshBlood = bloodEnabled && surface === "flesh";
  return {
    bloodParticles: fleshBlood ? 2 : 0,
    sparkParticles: surface === "metal" || !fleshBlood ? 5 : 3,
    dustParticles: surface === "stone" ? 5 : 3,
    shockwave: heavy,
    crackDecal: heavy,
  } as const;
}
