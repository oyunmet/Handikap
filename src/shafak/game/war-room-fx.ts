export const WAR_ROOM_EFFECT_POOL_SIZE = 72;
export const WAR_ROOM_EFFECT_POOL_LIMIT = 150;
export const WAR_ROOM_DECAL_POOL_SIZE = 30;
export const WAR_ROOM_SLASH_TRAIL_SEGMENTS = 10;

export function getWarRoomImpactFxProfile(bloodEnabled: boolean, heavy: boolean) {
  return {
    bloodParticles: bloodEnabled ? 2 : 0,
    sparkParticles: bloodEnabled ? 3 : 5,
    dustParticles: 3,
    shockwave: heavy,
    crackDecal: heavy,
  } as const;
}
