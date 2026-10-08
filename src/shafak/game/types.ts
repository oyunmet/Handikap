export type Opponent = {
  id: string;
  name: string;
  level: number;
  winRate: number;
  loot: number;
  taunt: string;
  difficulty: "easy" | "medium" | "hard";
};

export type DuelSummary = {
  verdict: "victory" | "defeat" | "draw";
  opponentId: string;
  playerScore: number;
  opponentScore: number;
  playerCombo: number;
  opponentCombo: number;
  loot: number;
};

export type BattleRewards = {
  gold: number;
  xp: number;
  item: string | null;
  lostStake: number;
};

export type SubmittedMove = {
  first: number;
  second: number;
};
