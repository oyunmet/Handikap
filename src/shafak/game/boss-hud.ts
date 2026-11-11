import { getWarRoomBossPhase } from "./war-room-boss";

export type BossHudPhase = 1 | 2 | 3;

export function getBossHudPhase(hp: number, maxHp: number): BossHudPhase {
  return getWarRoomBossPhase(hp, maxHp);
}

export function getBossHudPhaseRoman(phase: BossHudPhase): "I" | "II" | "III" {
  return phase === 3 ? "III" : phase === 2 ? "II" : "I";
}
