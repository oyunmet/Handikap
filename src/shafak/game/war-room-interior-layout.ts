export type WarRoomInteriorStyle = {
  name: string;
  wood: string;
  upholstery: string;
  cushion: string;
  rug: string;
  rugAccent: string;
  bedding: string;
  blanket: string;
  metal: string;
  accessory: "chest" | "bookcase" | "writing-desk" | "wardrobe";
  sofaShift: number;
  sofaAngle: number;
  bedAngle: number;
  screenSeed: number;
};

export type WarRoomInteriorFurniture = {
  id: "bench" | "table" | "hearth" | "storage" | "barrel" | "front-barrel" | "bed" | "nightstand";
  floor: 0 | 1;
  x: number;
  z: number;
  y: number;
  width: number;
  depth: number;
  height: number;
};

export function getWarRoomInteriorFurnitureLayout(building: {
  width: number;
  depth: number;
  storyHeight: number;
  stairSide: -1 | 1;
  style?: number;
}): WarRoomInteriorFurniture[] {
  const livingSide = -building.stairSide;
  const edge = building.width / 2;
  const frontZ = -building.depth / 2;
  const rearZ = building.depth / 2;
  const layoutVariants = [
    { bench: 0, table: 0, hearth: 0, bed: 0, nightstand: 0 },
    { bench: 0.45, table: -0.35, hearth: -0.25, bed: 0.55, nightstand: -0.3 },
    { bench: -0.35, table: 0.45, hearth: 0.35, bed: -0.45, nightstand: 0.3 },
    { bench: 0.6, table: 0.35, hearth: -0.45, bed: -0.6, nightstand: 0.45 },
  ] as const;
  const style = Number.isFinite(building.style) ? Math.trunc(building.style!) : 0;
  const variantIndex = ((style % layoutVariants.length) + layoutVariants.length) % layoutVariants.length;
  const layout = layoutVariants[variantIndex];
  const groundFloorFurnishings: Omit<WarRoomInteriorFurniture, "floor" | "y">[] = [
    {
      id: "bench",
      x: livingSide * (edge - 1.35) + livingSide * layout.bench * 0.18,
      z: frontZ + 1.65 + layout.bench,
      width: 2.3,
      depth: 0.82,
      height: 0.92,
    },
    {
      id: "table",
      x: livingSide * (edge - 2.5) + livingSide * layout.table * 0.2,
      z: frontZ + 4.05 + layout.table,
      width: 1.5,
      depth: 1.12,
      height: 1.05,
    },
    {
      id: "hearth",
      x: livingSide * (edge - 1.15),
      z: rearZ - 0.92 + layout.hearth,
      width: 1.22,
      depth: 1.15,
      height: 1.3,
    },
    {
      id: "storage",
      x: building.stairSide * (edge - 0.82),
      z: frontZ + 1.12,
      width: 1.08,
      depth: 0.86,
      height: 1.42,
    },
    {
      id: "barrel",
      x: building.stairSide * (edge - 0.45),
      z: rearZ - 0.82,
      width: 0.78,
      depth: 0.78,
      height: 0.86,
    },
    {
      id: "front-barrel",
      x: building.stairSide * (edge - 0.82),
      z: frontZ + 3.55,
      width: 0.78,
      depth: 0.78,
      height: 0.86,
    },
  ];
  const upperFloorFurnishings: Omit<WarRoomInteriorFurniture, "floor" | "y">[] = [
    {
      id: "bed",
      x: livingSide * (edge - 1.45),
      z: rearZ - 3.2 + layout.bed,
      width: 2.2,
      depth: 2.65,
      height: 1.22,
    },
    {
      id: "nightstand",
      x: livingSide * (edge - 3.2) + livingSide * layout.nightstand * 0.2,
      z: rearZ - 1.7,
      width: 0.76,
      depth: 0.72,
      height: 0.9,
    },
    {
      id: "storage",
      x: building.stairSide * (edge - 0.82),
      z: frontZ + 1.12,
      width: 1.08,
      depth: 0.86,
      height: 1.42,
    },
    {
      id: "barrel",
      x: building.stairSide * (edge - 0.45),
      z: rearZ - 0.82,
      width: 0.78,
      depth: 0.78,
      height: 0.86,
    },
    {
      id: "front-barrel",
      x: building.stairSide * (edge - 0.82),
      z: frontZ + 3.55,
      width: 0.78,
      depth: 0.78,
      height: 0.86,
    },
  ];
  return [
    ...groundFloorFurnishings.map((piece) => ({ ...piece, floor: 0 as const, y: 0 })),
    ...upperFloorFurnishings.map((piece) => ({
      ...piece,
      floor: 1 as const,
      y: building.storyHeight,
    })),
  ];
}

export const WAR_ROOM_INTERIOR_STYLES: readonly WarRoomInteriorStyle[] = [
  {
    name: "barracks",
    wood: "#654936",
    upholstery: "#66514a",
    cushion: "#a78468",
    rug: "#9b4036",
    rugAccent: "#d7ad70",
    bedding: "#b8b2a0",
    blanket: "#7d8793",
    metal: "#a17c50",
    accessory: "chest",
    sofaShift: -0.15,
    sofaAngle: -0.035,
    bedAngle: 0,
    screenSeed: 0.15,
  },
  {
    name: "keep",
    wood: "#594d3d",
    upholstery: "#536d65",
    cushion: "#829486",
    rug: "#425c59",
    rugAccent: "#c4a47a",
    bedding: "#d0c3a5",
    blanket: "#8c6e58",
    metal: "#b18a54",
    accessory: "bookcase",
    sofaShift: 0.22,
    sofaAngle: 0.025,
    bedAngle: Math.PI / 2,
    screenSeed: 0.31,
  },
  {
    name: "storehouse",
    wood: "#70523a",
    upholstery: "#775340",
    cushion: "#a97952",
    rug: "#59463b",
    rugAccent: "#d39a56",
    bedding: "#d0c2a2",
    blanket: "#a06644",
    metal: "#9a7652",
    accessory: "writing-desk",
    sofaShift: -0.28,
    sofaAngle: 0.035,
    bedAngle: 0,
    screenSeed: 0.48,
  },
  {
    name: "guardhouse",
    wood: "#57483b",
    upholstery: "#505a72",
    cushion: "#7b879d",
    rug: "#3f4d69",
    rugAccent: "#c3a77e",
    bedding: "#d3d0c3",
    blanket: "#7a8498",
    metal: "#9a8e70",
    accessory: "wardrobe",
    sofaShift: 0.16,
    sofaAngle: -0.02,
    bedAngle: Math.PI / 2,
    screenSeed: 0.64,
  },
  {
    name: "barracks-west",
    wood: "#695344",
    upholstery: "#73534b",
    cushion: "#b18470",
    rug: "#864943",
    rugAccent: "#dfbd82",
    bedding: "#d6cdb7",
    blanket: "#8f6358",
    metal: "#aa865c",
    accessory: "bookcase",
    sofaShift: -0.2,
    sofaAngle: 0.045,
    bedAngle: 0,
    screenSeed: 0.79,
  },
  {
    name: "armory",
    wood: "#514b43",
    upholstery: "#596c67",
    cushion: "#8b9c8f",
    rug: "#435e58",
    rugAccent: "#cba36e",
    bedding: "#c5c0b2",
    blanket: "#71877f",
    metal: "#b49b6d",
    accessory: "chest",
    sofaShift: 0.25,
    sofaAngle: -0.045,
    bedAngle: Math.PI / 2,
    screenSeed: 0.92,
  },
  {
    name: "watch",
    wood: "#62503e",
    upholstery: "#776548",
    cushion: "#a18a65",
    rug: "#7c6143",
    rugAccent: "#e0c488",
    bedding: "#dbceb0",
    blanket: "#92754b",
    metal: "#b9955f",
    accessory: "writing-desk",
    sofaShift: -0.1,
    sofaAngle: 0.02,
    bedAngle: 0,
    screenSeed: 1.08,
  },
  {
    name: "storehouse-south",
    wood: "#5b4738",
    upholstery: "#66596a",
    cushion: "#948398",
    rug: "#58475d",
    rugAccent: "#d4b07c",
    bedding: "#c8c3bb",
    blanket: "#7b697e",
    metal: "#ae956a",
    accessory: "wardrobe",
    sofaShift: 0.08,
    sofaAngle: -0.03,
    bedAngle: Math.PI / 2,
    screenSeed: 1.24,
  },
] as const;

export function getWarRoomInteriorStyle(style: number): WarRoomInteriorStyle {
  const index = ((Math.trunc(style) % WAR_ROOM_INTERIOR_STYLES.length)
    + WAR_ROOM_INTERIOR_STYLES.length) % WAR_ROOM_INTERIOR_STYLES.length;
  return WAR_ROOM_INTERIOR_STYLES[index];
}
