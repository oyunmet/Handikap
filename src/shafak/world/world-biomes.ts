import { WORLD_GATE_INTERVAL_METERS } from "./movement.ts";

export type WorldBiome = "ash-road" | "frozen-pass" | "red-marsh";
export type WeatherMode = "clear" | "rain" | "storm" | "fog";

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
    label: "İleri Hat",
    skyTint: "#c6edff",
    horizon: "#d8f2f5",
    middle: "#75c5ed",
    zenith: "#3f9ed8",
    mountainFar: "#a9c7a6",
    mountainMid: "#82aa78",
    mountainNear: "#668c63",
    fog: "#d7edf0",
    ground: "#83ad68",
    road: "#8a8065",
    cloud: "#fffdf4",
    coolLight: "#96d8ed",
    particles: "#ead8a7",
    torch: "#ffd06f",
  },
  "frozen-pass": {
    label: "Kuzey Geçidi",
    skyTint: "#d8f3ff",
    horizon: "#f1faff",
    middle: "#9bd6f1",
    zenith: "#4c9fd2",
    mountainFar: "#c4dce1",
    mountainMid: "#a5c4d2",
    mountainNear: "#819eae",
    fog: "#e2f0f3",
    ground: "#dce9df",
    road: "#d4e3e7",
    cloud: "#fffefb",
    coolLight: "#9deaff",
    particles: "#d8f4ff",
    torch: "#a6e8ff",
  },
  "red-marsh": {
    label: "Kızıl Liman",
    skyTint: "#ffe4c5",
    horizon: "#fff1d9",
    middle: "#8fcbe8",
    zenith: "#4a92c4",
    mountainFar: "#d1b5a0",
    mountainMid: "#aa8a70",
    mountainNear: "#826b58",
    fog: "#f0e2d6",
    ground: "#d9c29a",
    road: "#ccb38e",
    cloud: "#fff3df",
    coolLight: "#a4e4dc",
    particles: "#e7edb0",
    torch: "#ffd084",
  },
};

const BIOME_COUNT = 3;
export const BIOME_CHAPTER_SPAN = 3;
export const BIOME_SPAN_METERS = WORLD_GATE_INTERVAL_METERS * BIOME_CHAPTER_SPAN;
export const BIOME_TRANSITION_METERS = 48;

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

function biomeAtSection(section: number): WorldBiome {
  const cycle = ((section % BIOME_COUNT) + BIOME_COUNT) % BIOME_COUNT;
  if (cycle === 1) return "frozen-pass";
  if (cycle === 2) return "red-marsh";
  return "ash-road";
}
