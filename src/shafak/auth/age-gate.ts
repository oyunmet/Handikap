export type AgeGateChoice = "unknown" | "adult" | "underage";

export const AGE_GATE_STORAGE_KEY = "safak-age-gate-v1";

export function parseAgeGateChoice(value: string | null | undefined): AgeGateChoice {
  return value === "adult" || value === "underage" ? value : "unknown";
}

export function readAgeGateChoice(storage: Pick<Storage, "getItem"> | null | undefined): AgeGateChoice {
  try {
    return parseAgeGateChoice(storage?.getItem(AGE_GATE_STORAGE_KEY));
  } catch {
    return "unknown";
  }
}

export function writeAgeGateChoice(
  storage: Pick<Storage, "setItem"> | null | undefined,
  choice: Exclude<AgeGateChoice, "unknown">,
): void {
  try {
    storage?.setItem(AGE_GATE_STORAGE_KEY, choice);
  } catch {
    // The decision remains in memory for this page when storage is blocked.
  }
}
