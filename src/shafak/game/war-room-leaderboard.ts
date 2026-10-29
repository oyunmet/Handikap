export type WarRoomLeaderboardEntry = {
  id: string;
  name: string;
  role: "OYUNCU" | "KOMUTAN" | "MUHAFIZ";
  score: number;
  status: "ZAFER" | "YENİLDİ" | "HAYATTA" | "ELENDİ";
  rank: number;
};

type LeaderboardEnemy = {
  id: string;
  name: string;
  commander: boolean;
  alive: boolean;
  score: number;
};

export function createWarRoomLeaderboard(
  playerName: string,
  result: "victory" | "defeat",
  kills: number,
  headshots: number,
  enemies: readonly LeaderboardEnemy[],
): WarRoomLeaderboardEntry[] {
  const entries = [
    {
      id: "player",
      name: playerName.trim() || "Savaşçı",
      role: "OYUNCU" as const,
      score: Math.max(0, kills) * 100 + Math.max(0, headshots) * 25,
      status: result === "victory" ? "ZAFER" as const : "YENİLDİ" as const,
    },
    ...enemies.map((enemy) => ({
      id: enemy.id,
      name: enemy.name.trim() || (enemy.commander ? "Komutan" : "Muhafız"),
      role: enemy.commander ? "KOMUTAN" as const : "MUHAFIZ" as const,
      score: Math.max(0, enemy.score),
      status: enemy.alive ? "HAYATTA" as const : "ELENDİ" as const,
    })),
  ];

  const counts = new Map<string, number>();
  for (const entry of entries) {
    const key = entry.name.toLocaleLowerCase("tr-TR");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const occurrence = new Map<string, number>();
  const uniqueEntries = entries.map((entry) => {
    const key = entry.name.toLocaleLowerCase("tr-TR");
    const count = counts.get(key) ?? 0;
    if (count < 2) return entry;
    const ordinal = (occurrence.get(key) ?? 0) + 1;
    occurrence.set(key, ordinal);
    return { ...entry, name: `${entry.name} · ${ordinal}` };
  });

  return uniqueEntries
    .map((entry, index) => ({ ...entry, originalOrder: index }))
    .sort((left, right) => right.score - left.score || left.originalOrder - right.originalOrder)
    .map(({ originalOrder: _originalOrder, ...entry }, index) => ({ ...entry, rank: index + 1 }));
}
