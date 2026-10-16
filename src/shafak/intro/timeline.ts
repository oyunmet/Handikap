export const INTRO_EVENT_MS = {
  letter: 260,
  production: 740,
  byline: 1_220,
  shimmer: 1_650,
  impact: 1_900,
  creditsFade: 3_500,
  worldReveal: 3_800,
  lineOne: 4_300,
  lineTwo: 12_500,
  lineThree: 20_700,
  productionCard: 28_100,
  productionCardFade: 30_400,
  title: 31_100,
  prompt: 32_100,
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
    events.lineTwo = events.lineOne + 8_200;
    events.lineThree = events.lineTwo + 8_200;
    events.productionCard = events.lineThree + 7_400;
    events.productionCardFade = events.productionCard + 1_800;
    events.title = events.productionCardFade + 600;
    events.prompt = events.title + 800;
  }

  return events;
}
