import type { CombatEvent } from "../game/combat-engine";

export const MAX_ACTIVE_DUEL_VFX = 5;
export const LIGHTNING_BOLT_COUNT = 3;
export const LIGHTNING_SEGMENT_COUNT = 6;
export const DUEL_HIT_SPARK_COUNT = 12;
export const DUEL_ARENA_AMBIENT_PARTICLE_COUNT = 22;
export const MAX_DUEL_BURN_DECALS = 30;
export const MAX_DUEL_VFX_EVENT_PARTICLES = Math.max(
  LIGHTNING_BOLT_COUNT * LIGHTNING_SEGMENT_COUNT,
  DUEL_HIT_SPARK_COUNT,
);
export const DUEL_DEATH_PARTICLE_COUNT = 26;
export const MAX_ACTIVE_DUEL_PARTICLES =
  MAX_ACTIVE_DUEL_VFX * MAX_DUEL_VFX_EVENT_PARTICLES
  + DUEL_DEATH_PARTICLE_COUNT
  + DUEL_ARENA_AMBIENT_PARTICLE_COUNT;

export type DuelVfxKind = "fireball" | "lightning" | "shield" | "afterimage" | "shockwave" | "weaponTrail" | "arrow" | "coverBlock" | "plunge" | "plungeLanding" | "none";

export function getDuelVfxKind(event: Pick<CombatEvent, "type" | "attack" | "plunge">): DuelVfxKind {
  if (event.type === "skill") {
    if (event.attack === "skillOne") return "fireball";
    if (event.attack === "skillTwo") return "lightning";
  }
  if (event.type === "block" || event.type === "parry") return "shield";
  if (event.type === "coverBlock") return "coverBlock";
  if (event.type === "projectile") return "arrow";
  if (event.type === "plungeLand") return "plungeLanding";
  if (event.type === "weaponTrail") return "weaponTrail";
  if (event.type === "dodge" || event.type === "backflip") return "afterimage";
  if (event.type === "hit" && event.plunge) return "plunge";
  if (event.type === "hit" || event.type === "knockout") return "shockwave";
  return "none";
}
