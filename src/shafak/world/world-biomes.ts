import { WORLD_GATE_INTERVAL_METERS } from "./movement.ts";

export type WorldBiome = "ash-road" | "frozen-pass" | "red-marsh";
export type WeatherMode = "clear" | "ash" | "ember" | "fog";

export type BiomePalette = {
  label: string;
  skyTint: string;
  horizon: string;
  middle: string;
  zenith: string;
  mountainFar: string;
  mountainMid: string;
  mountainNear: string;
  fog: string;
  ground: string;
  road: string;
  cloud: string;
  coolLight: string;
  particles: string;
  torch: string;
};

export type BiomeTransition = {
  from: WorldBiome;
  to: WorldBiome;
  mix: number;
  biome: WorldBiome;
};

export const WORLD_BIOME_PALETTES: Record<WorldBiome, BiomePalette> = {
  "ash-road": {
    label: "Kül Yolu",
    skyTint: "#fff0dd",
    horizon: "#995b4a",
    middle: "#433247",
    zenith: "#12192d",
    mountainFar: "#292d3b",
    mountainMid: "#39333f",
    mountainNear: "#554149",
    fog: "#69505a",
    ground: "#5a504b",
    road: "#40383b",
    cloud: "#c69d8e",
    coolLight: "#a3c9df",
    particles: "#dfa56e",
    torch: "#f4a45e",
  },
  "frozen-pass": {
    label: "Donmuş Geçit",
    skyTint: "#c8eaff",
    horizon: "#8caabc",
    middle: "#435c72",
    zenith: "#18283f",
    mountainFar: "#304355",
    mountainMid: "#3c596c",
    mountainNear: "#567382",
    fog: "#829ca9",
    ground: "#67777d",
    road: "#3c505c",
    cloud: "#cfdfeb",
    coolLight: "#9deaff",
    particles: "#c9eeff",
    torch: "#89dcfa",
  },
  "red-marsh": {
    label: "Kızıl Bataklık",
    skyTint: "#ffd0ae",
    horizon: "#a75948",
    middle: "#543848",
    zenith: "#22182d",
    mountainFar: "#332a3b",
    mountainMid: "#493241",
    mountainNear: "#654047",
    fog: "#805047",
    ground: "#574543",
    road: "#392f34",
    cloud: "#d38b70",
    coolLight: "#92d7d0",
    particles: "#d5e69b",
    torch: "#efa266",
  },
};

export const WEATHER_MODES: readonly WeatherMode[] = ["clear", "ash", "ember", "fog"];
const BIOME_COUNT = 3;
export const BIOME_CHAPTER_SPAN = 3;
export const BIOME_SPAN_METERS = WORLD_GATE_INTERVAL_METERS * BIOME_CHAPTER_SPAN;
export const BIOME_TRANSITION_METERS = 48;

export function getWorldFogDensity(weather: WeatherMode, biome: WorldBiome, combatActive = false) {
  if (combatActive) return 0.0028;
  const baseDensity = weather === "fog"
    ? 0.006
    : weather === "ember"
      ? 0.0042
      : weather === "ash"
        ? 0.0038
        : 0.0025;
  const biomeMultiplier = biome === "frozen-pass" ? 1.08 : biome === "red-marsh" ? 1.13 : 1;
  return baseDensity * biomeMultiplier;
}

export function getBiomeForDistance(distance: number): WorldBiome {
  const safeDistance = Number.isFinite(distance) ? Math.max(0, distance) : 0;
  const section = Math.floor(safeDistance / BIOME_SPAN_METERS);
  return biomeAtSection(section);
}

export function getBiomeTransition(distance: number): BiomeTransition {
  const safeDistance = Number.isFinite(distance) ? Math.max(0, distance) : 0;
  const section = Math.floor(safeDistance / BIOME_SPAN_METERS);
  const biome = biomeAtSection(section);
  if (section === 0) return { from: biome, to: biome, mix: 0, biome };

  const intoSection = safeDistance - section * BIOME_SPAN_METERS;
  if (intoSection >= BIOME_TRANSITION_METERS) {
    return { from: biome, to: biome, mix: 0, biome };
  }

  const linear = Math.max(0, Math.min(1, intoSection / BIOME_TRANSITION_METERS));
  const mix = linear * linear * (3 - 2 * linear);
  return { from: biomeAtSection(section - 1), to: biome, mix, biome };
}

export function nextWeatherMode(weather: WeatherMode): WeatherMode {
  const index = WEATHER_MODES.indexOf(weather);
  return WEATHER_MODES[(index + 1) % WEATHER_MODES.length];
}

function biomeAtSection(section: number): WorldBiome {
  const cycle = ((section % BIOME_COUNT) + BIOME_COUNT) % BIOME_COUNT;
  if (cycle === 1) return "frozen-pass";
  if (cycle === 2) return "red-marsh";
  return "ash-road";
}
