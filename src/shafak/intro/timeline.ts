export const INTRO_EVENT_MS = {
  letter: 320,
  production: 1_000,
  byline: 1_760,
  shimmer: 2_260,
  impact: 2_620,
  creditsFade: 4_600,
  worldReveal: 5_200,
  lineOne: 6_600,
  lineTwo: 9_100,
  lineThree: 11_600,
  lineFour: 14_100,
  lineFive: 16_600,
  productionCard: 19_100,
  productionCardFade: 23_300,
  title: 24_000,
  prompt: 25_400,
} as const;

export function getInitialScreen(search = typeof window === "undefined" ? "" : window.location.search) {
  const query = new URLSearchParams(search);
  return query.get("debug") === "1" && query.get("scene") === "world" ? "world" : "intro";
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
