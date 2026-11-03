export type WarRoomContractKind = "headshots" | "loot";

export type WarRoomContract = {
  kind: WarRoomContractKind;
  title: string;
  description: string;
  target: number;
  bonusGold: number;
};

export type WarRoomContractProgressSource = {
  headshots: number;
  lootChestsOpened: number;
};

export function getWarRoomContractProgress(
  contract: WarRoomContract,
  source: WarRoomContractProgressSource,
) {
  const value = contract.kind === "headshots" ? source.headshots : source.lootChestsOpened;
  return Math.min(contract.target, Math.max(0, Math.floor(Number.isFinite(value) ? value : 0)));
}

export function isWarRoomContractComplete(contract: WarRoomContract, progress: number) {
  return Number.isFinite(progress) && progress >= contract.target;
}

export function getWarRoomContractReward(contract: WarRoomContract, progress: number) {
  return isWarRoomContractComplete(contract, progress) ? contract.bonusGold : 0;
}
