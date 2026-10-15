export const INTRO_STORAGE_KEY = "introSeen";

export const INTRO_EVENT_MS = {
  letter: 320,
  production: 1_000,
  byline: 1_760,
  shimmer: 2_260,
  impact: 2_620,
  creditsFade: 3_180,
  worldReveal: 4_000,
  lineOne: 6_000,
  lineTwo: 8_500,
  lineThree: 11_000,
  lineFour: 13_500,
  lineFive: 16_000,
  productionCard: 18_500,
  productionCardFade: 21_400,
  title: 22_100,
  prompt: 23_500,
} as const;

export type IntroStorage = Pick<Storage, "getItem" | "setItem">;

function browserStorage(): IntroStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function hasSeenIntro(storage: IntroStorage | null = browserStorage()) {
  try {
    return storage?.getItem(INTRO_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function markIntroSeen(storage: IntroStorage | null = browserStorage()) {
  try {
    storage?.setItem(INTRO_STORAGE_KEY, "true");
  } catch {
    // The intro still completes for this session when browser storage is unavailable.
  }
}

export function getIntroEventTimes(reducedMotion = false) {
  const scale = reducedMotion ? 0.58 : 1;
  return Object.fromEntries(
    Object.entries(INTRO_EVENT_MS).map(([event, milliseconds]) => [
      event,
      Math.round(milliseconds * scale),
    ]),
  ) as { [Event in keyof typeof INTRO_EVENT_MS]: number };
}
