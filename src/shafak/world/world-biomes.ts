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
    skyTint: "#ddd8ca",
    horizon: "#a69a83",
    middle: "#809091",
    zenith: "#405663",
    mountainFar: "#888b83",
    mountainMid: "#686e6b",
    mountainNear: "#4d5654",
    fog: "#b9c0b9",
    ground: "#70736b",
    road: "#5b625f",
    cloud: "#c0b8a8",
    coolLight: "#9ab6bc",
    particles: "#a38f70",
    torch: "#d58c55",
  },
  "frozen-pass": {
    label: "Kuzey Geçidi",
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
    label: "Kızıl Liman",
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
