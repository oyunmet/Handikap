import { getBiomeForDistance } from "../world/world-biomes.ts";

export type DuelArenaTheme = {
  background: string;
  fog: string;
  floor: string;
  floorEmissive: string;
  stone: readonly string[];
  wall: readonly string[];
  column: readonly string[];
  accent: string;
  flame: string;
  stain: string;
};

const ARENA_THEMES: Record<ReturnType<typeof getBiomeForDistance>, DuelArenaTheme> = {
  "ash-road": {
    background: "#483a40",
    fog: "#483a40",
    floor: "#514248",
    floorEmissive: "#30242b",
    stone: ["#817075", "#6e5d63", "#887579", "#66565d", "#79676c"],
    wall: ["#67575b", "#796267", "#5f5055"],
    column: ["#77636a", "#65555c", "#886b6d"],
    accent: "#d9a45f",
    flame: "#ffb56d",
    stain: "#795155",
  },
  "frozen-pass": {
    background: "#344653",
    fog: "#344653",
    floor: "#3f5663",
    floorEmissive: "#243a46",
    stone: ["#6e8791", "#58727f", "#79919a", "#526977", "#718891"],
    wall: ["#4f6875", "#607c88", "#465d6b"],
    column: ["#657f8b", "#526c79", "#76909a"],
    accent: "#9deaff",
    flame: "#89dcfa",
    stain: "#587f87",
  },
  "red-marsh": {
    background: "#49363d",
    fog: "#49363d",
    floor: "#594247",
    floorEmissive: "#34262d",
    stone: ["#80635f", "#6c514f", "#8a6a61", "#61494a", "#7a5a54"],
    wall: ["#6d514e", "#805d57", "#60484a"],
    column: ["#765a54", "#654b4a", "#89665d"],
    accent: "#d4dc86",
    flame: "#efa266",
    stain: "#79504a",
  },
};

export function getDuelArenaTheme(distance: number): DuelArenaTheme {
  return ARENA_THEMES[getBiomeForDistance(distance)];
}
