import { WORLD_GATE_INTERVAL_METERS } from "./movement.ts";

export type WorldBiome = "ash-road" | "frozen-pass" | "red-marsh";
export type WeatherMode = "clear" | "ash" | "rain" | "storm" | "fog";

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
    horizon: "#e9bb91",
    middle: "#86b9dd",
    zenith: "#3c7daf",
    mountainFar: "#a7a5a0",
    mountainMid: "#858784",
    mountainNear: "#686d6c",
    fog: "#b9c9d1",
    ground: "#d6c5aa",
    road: "#dcc9ad",
    cloud: "#ecd4bf",
    coolLight: "#a3c9df",
    particles: "#dfa56e",
    torch: "#f4a45e",
  },
  "frozen-pass": {
    label: "Donmuş Geçit",
    skyTint: "#c8eaff",
    horizon: "#e3d0ad",
    middle: "#a8d2e7",
    zenith: "#568ab9",
    mountainFar: "#a9b8bd",
    mountainMid: "#879ba5",
    mountainNear: "#687985",
    fog: "#c3d1d7",
    ground: "#d5e2de",
    road: "#d1e0e8",
    cloud: "#e1ecf3",
    coolLight: "#9deaff",
    particles: "#c9eeff",
    torch: "#89dcfa",
  },
  "red-marsh": {
    label: "Kızıl Bataklık",
    skyTint: "#ffd0ae",
    horizon: "#eaa989",
    middle: "#8bbbd4",
    zenith: "#477eac",
    mountainFar: "#aa9b93",
    mountainMid: "#857874",
    mountainNear: "#6a6362",
    fog: "#c6c4c1",
    ground: "#dcbba2",
    road: "#dfb9a1",
    cloud: "#efd0ba",
    coolLight: "#92d7d0",
    particles: "#d5e69b",
    torch: "#efa266",
  },
};

export const WEATHER_MODES: readonly WeatherMode[] = ["clear", "ash", "rain", "storm", "fog"];
const BIOME_COUNT = 3;
export const BIOME_CHAPTER_SPAN = 3;
export const BIOME_SPAN_METERS = WORLD_GATE_INTERVAL_METERS * BIOME_CHAPTER_SPAN;
export const BIOME_TRANSITION_METERS = 48;
export const WORLD_DAY_CYCLE_METERS = 2_400;

export function getWorldDaylight(distance: number) {
  const safeDistance = Number.isFinite(distance) ? Math.max(0, distance) : 0;
  const cycleDistance = safeDistance % WORLD_DAY_CYCLE_METERS;
  const cycleAngle = (cycleDistance / WORLD_DAY_CYCLE_METERS) * Math.PI * 2;
  return 0.18 + 0.82 * ((1 + Math.cos(cycleAngle)) / 2);
}

export function getWeatherHandlingMultiplier(weather: WeatherMode) {
  if (weather === "storm") return 0.76;
  if (weather === "rain") return 0.9;
  return 1;
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
