import type { CityNpcAccessory } from "./opponent-costume";
import type { WorldBotArchetype } from "./world-bot-profiles";

export type CityResident = {
  x: number;
  z: number;
  axis: "x" | "z";
  scale: number;
  accessory: Exclude<CityNpcAccessory, "none">;
  archetype: WorldBotArchetype;
};

export const CITY_RESIDENTS: readonly CityResident[] = [
  { x: -6.4, z: -3.4, axis: "x", scale: 1.02, accessory: "hat", archetype: "gate-warden" },
  { x: 6.4, z: 3.2, axis: "z", scale: 0.91, accessory: "cape", archetype: "iron-oath" },
  { x: -3.2, z: -6.4, axis: "x", scale: 0.97, accessory: "glasses", archetype: "ash-archer" },
  { x: 3.1, z: -6.4, axis: "z", scale: 1.09, accessory: "cane", archetype: "storm-lancer" },
  { x: -6.3, z: 4.3, axis: "z", scale: 1.12, accessory: "wheelchair", archetype: "gate-warden" },
  { x: 6.2, z: -3.5, axis: "x", scale: 0.94, accessory: "hat", archetype: "shadow-knight" },
  { x: -3.1, z: 6.3, axis: "x", scale: 0.89, accessory: "cape", archetype: "rift-berserker" },
  { x: 3.2, z: 6.3, axis: "z", scale: 1.05, accessory: "glasses", archetype: "ember-alchemist" },
];

export const CITY_RESIDENT_TINTS = [
  "#a87860",
  "#738b79",
  "#897497",
  "#b68f59",
  "#6d8d8d",
  "#9b6e67",
  "#778994",
  "#aa865c",
] as const;
