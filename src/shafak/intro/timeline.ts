export const INTRO_EVENT_MS = {
  letter: 220,
  production: 600,
  byline: 1_000,
  shimmer: 1_400,
  impact: 1_650,
  creditsFade: 2_600,
  worldReveal: 3_000,
  lineOne: 3_500,
  lineTwo: 6_100,
  lineThree: 8_700,
  productionCard: 9_800,
  productionCardFade: 11_100,
  title: 11_700,
  prompt: 12_300,
} as const;

type IntroEventTimes = {
  -readonly [Event in keyof typeof INTRO_EVENT_MS]: number;
};

export function getInitialScreen(search = typeof window === "undefined" ? "" : window.location.search) {
  const query = new URLSearchParams(search);
  return query.get("debug") === "1" && query.get("scene") === "world" ? "world" : "intro";
}

export function getIntroEventTimes(reducedMotion = false) {
  const scale = reducedMotion ? 0.58 : 1;
  const events = Object.fromEntries(
    Object.entries(INTRO_EVENT_MS).map(([event, milliseconds]) => [
      event,
      Math.round(milliseconds * scale),
    ]),
  ) as IntroEventTimes;

  if (reducedMotion) {
    events.lineTwo = events.lineOne + 2_600;
    events.lineThree = events.lineTwo + 2_600;
    events.productionCard = events.lineThree + 1_100;
    events.productionCardFade = events.productionCard + 1_000;
    events.title = events.productionCardFade + 500;
    events.prompt = events.title + 600;
  }

  return events;
}
