export type BossHudPhase = 1 | 2 | 3;

export function getBossHudPhase(hp: number, maxHp: number): BossHudPhase {
  if (!Number.isFinite(hp) || !Number.isFinite(maxHp) || maxHp <= 0) return 1;
  const ratio = Math.max(0, Math.min(1, hp / maxHp));
  if (ratio <= 1 / 3) return 3;
  if (ratio <= 2 / 3) return 2;
  return 1;
}

export function getBossHudPhaseRoman(phase: BossHudPhase): "I" | "II" | "III" {
  return phase === 3 ? "III" : phase === 2 ? "II" : "I";
}
