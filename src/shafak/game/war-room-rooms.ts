import {
  WAR_ROOM_BLOCKERS,
  WAR_ROOM_COMMANDER,
  WAR_ROOM_COVER_SPOTS,
  WAR_ROOM_ENEMY_SPAWNS,
  type WarRoomBlocker,
  type WarRoomWeaponId,
} from "./war-room-data";

export type WarRoomRoomTheme = {
  sky: string;
  fog: string;
  fogNear: number;
  fogFar: number;
  skyLight: string;
  groundLight: string;
  ambient: string;
  keyLight: string;
  fillLight: string;
  emberLight: string;
  floorTint: string;
  tiles: readonly [string, string, string, string, string];
};

type WarRoomRoomDefinition = {
  id: string;
  name: string;
  layoutName: string;
  quarterTurns: 0 | 1 | 2 | 3;
  coverOffset: readonly [number, number];
  theme: WarRoomRoomTheme;
  enemyCount: number;
  enemyNames: readonly string[];
  enemyWeapons: readonly WarRoomWeaponId[];
  enemyColor: string;
  commanderName: string;
  commanderTitle: string;
  commanderWeapon: WarRoomWeaponId;
  commanderColor: string;
};

export type WarRoomSpawn = {
  id: string;
  name: string;
  x: number;
  z: number;
};

export type WarRoomRoom = Omit<WarRoomRoomDefinition, "enemyCount"> & {
  number: number;
  cycle: number;
  enemyCount: number;
  enemyHpMultiplier: number;
  blockers: readonly (WarRoomBlocker & { rotationY: number })[];
  coverSpots: readonly { x: number; z: number }[];
  enemySpawns: readonly WarRoomSpawn[];
  commanderPosition: { x: number; z: number };
};

export type WarRoomSavedProgress = {
  highestRoom: number;
  totalRoomRewards: number;
};

export const WAR_ROOM_MAX_ROOM_ENEMIES = 14;

const ROOM_DEFINITIONS: readonly WarRoomRoomDefinition[] = [
  {
    id: "stone-courtyard",
    name: "Taş Avlu",
    layoutName: "Kuzey Surları",
    quarterTurns: 0,
    coverOffset: [0, 0],
    theme: {
      sky: "#eaa989", fog: "#c6c4c1", fogNear: 26, fogFar: 72,
      skyLight: "#ffe2c3", groundLight: "#30252f", ambient: "#ffdbb3",
      keyLight: "#ffd09a", fillLight: "#91cde0", emberLight: "#ff8a48",
      floorTint: "#d9b38e", tiles: ["#8b745e", "#806b55", "#927a61", "#79634f", "#8c775f"],
    },
    enemyCount: 9,
    enemyNames: ["Kale Nöbetçisi", "Barutçu", "Siperci", "Arbaletçi"],
    enemyWeapons: ["powder_rifle", "crossbow"],
    enemyColor: "#92715a",
    commanderName: WAR_ROOM_COMMANDER.name,
    commanderTitle: "Kuşatma Komutanı",
    commanderWeapon: "powder_rifle",
    commanderColor: "#bb5141",
  },
  {
    id: "ember-gate",
    name: "Kor Kapısı",
    layoutName: "Doğu Geçidi",
    quarterTurns: 1,
    coverOffset: [0, 0],
    theme: {
      sky: "#d78365", fog: "#886154", fogNear: 22, fogFar: 68,
      skyLight: "#ffc6a2", groundLight: "#29202b", ambient: "#d78c65",
      keyLight: "#ffab74", fillLight: "#74a9bb", emberLight: "#ff6238",
      floorTint: "#9c654c", tiles: ["#775043", "#865744", "#71483f", "#93614a", "#805443"],
    },
    enemyCount: 10,
    enemyNames: ["Geçit Bekçisi", "Kalkanlı", "Alev Nişancısı", "Kapı Arbaletçisi"],
    enemyWeapons: ["scattergun", "crossbow"],
    enemyColor: "#a15e48",
    commanderName: "Kor Muhafızı",
    commanderTitle: "Doğu Kapısı Komutanı",
    commanderWeapon: "scattergun",
    commanderColor: "#e16a3d",
  },
  {
    id: "frost-bastion",
    name: "Ayaz Burcu",
    layoutName: "Güney Kulesi",
    quarterTurns: 2,
    coverOffset: [0, 0],
    theme: {
      sky: "#90aab7", fog: "#84949a", fogNear: 20, fogFar: 66,
      skyLight: "#d9efff", groundLight: "#25323d", ambient: "#b8d4df",
      keyLight: "#b8d8e8", fillLight: "#d58d6d", emberLight: "#ff9f68",
      floorTint: "#8e9b9d", tiles: ["#727e81", "#829093", "#68777b", "#92999a", "#79868a"],
    },
    enemyCount: 11,
    enemyNames: ["Ayaz Nöbetçisi", "Buz Arbaletçisi", "Burç Gözcüsü", "Donmuş Siperci"],
    enemyWeapons: ["longbow", "crossbow"],
    enemyColor: "#77929a",
    commanderName: "Gümüş Burç Beyi",
    commanderTitle: "Güney Burcu Komutanı",
    commanderWeapon: "longbow",
    commanderColor: "#b5c8cb",
  },
  {
    id: "black-rampart",
    name: "Kara Siper",
    layoutName: "Batı Savunması",
    quarterTurns: 3,
    coverOffset: [0, 0],
    theme: {
      sky: "#6f7689", fog: "#464c5b", fogNear: 17, fogFar: 62,
      skyLight: "#c6c7d5", groundLight: "#1b202c", ambient: "#9da2b6",
      keyLight: "#d1b8a0", fillLight: "#7a93bd", emberLight: "#e67543",
      floorTint: "#686575", tiles: ["#56515e", "#625c68", "#4c4c59", "#6d6570", "#5d5864"],
    },
    enemyCount: 12,
    enemyNames: ["Siyah Siperci", "Kara Nişancı", "Kule Celladı", "Gece Arbaletçisi"],
    enemyWeapons: ["sidearm", "crossbow"],
    enemyColor: "#615a66",
    commanderName: "Kara Sancaktar",
    commanderTitle: "Batı Surları Komutanı",
    commanderWeapon: "sidearm",
    commanderColor: "#8c4852",
  },
  {
    id: "sunken-keep",
    name: "Batık Hisar",
    layoutName: "Yıkık Avlu",
    quarterTurns: 0,
    coverOffset: [-5, 4],
    theme: {
      sky: "#b38b72", fog: "#776b62", fogNear: 18, fogFar: 64,
      skyLight: "#f4d2a5", groundLight: "#332a28", ambient: "#c3a080",
      keyLight: "#e9b475", fillLight: "#9aaba4", emberLight: "#ed7d4e",
      floorTint: "#9c846d", tiles: ["#766451", "#84715c", "#6c5c4e", "#927a62", "#7b6957"],
    },
    enemyCount: 13,
    enemyNames: ["Hisar Yağmacısı", "Yıkıntı Nöbetçisi", "Eski Arbaletçi", "Kum Siperci"],
    enemyWeapons: ["powder_rifle", "longbow"],
    enemyColor: "#8b755e",
    commanderName: "Harabe Celladı",
    commanderTitle: "Batık Hisar Komutanı",
    commanderWeapon: "scattergun",
    commanderColor: "#aa6744",
  },
  {
    id: "moonlit-citadel",
    name: "Ayışığı Kalesi",
    layoutName: "İç Kale",
    quarterTurns: 2,
    coverOffset: [6, -4],
    theme: {
      sky: "#56657e", fog: "#3d4b62", fogNear: 18, fogFar: 64,
      skyLight: "#cadbff", groundLight: "#171e34", ambient: "#8192b4",
      keyLight: "#a5bbf2", fillLight: "#d49a77", emberLight: "#f58e68",
      floorTint: "#62677d", tiles: ["#4d566b", "#5d6377", "#475165", "#6d7080", "#555d71"],
    },
    enemyCount: 14,
    enemyNames: ["Lunaparko Nöbetçisi", "Ay Kalkanlısı", "Yıldız Arbaletçisi", "Gece Sancaktarı"],
    enemyWeapons: ["crossbow", "sidearm"],
    enemyColor: "#667794",
    commanderName: "Ay Tacı",
    commanderTitle: "İç Kale Komutanı",
    commanderWeapon: "longbow",
    commanderColor: "#8c85c7",
  },
];

function rotatePoint(x: number, z: number, quarterTurns: number) {
  switch (quarterTurns % 4) {
    case 1: return { x: z, z: -x };
    case 2: return { x: -x, z: -z };
    case 3: return { x: -z, z: x };
    default: return { x, z };
  }
}

function transformPoint(
  x: number,
  z: number,
  definition: WarRoomRoomDefinition,
  includeCoverOffset = false,
) {
  const rotated = rotatePoint(x, z, definition.quarterTurns);
  const [offsetX, offsetZ] = includeCoverOffset ? definition.coverOffset : [0, 0];
  return { x: rotated.x + offsetX, z: rotated.z + offsetZ };
}

function intersectsBlocker(x: number, z: number, blocker: WarRoomBlocker, radius: number) {
  return Math.abs(x - blocker.x) < blocker.width / 2 + radius
    && Math.abs(z - blocker.z) < blocker.depth / 2 + radius;
}

function getAdditionalSpawnSites() {
  const chosen: Array<{ x: number; z: number }> = WAR_ROOM_ENEMY_SPAWNS.map(({ x, z }) => ({ x, z }));
  const candidates: Array<{ x: number; z: number }> = [];
  for (let z = -31; z <= 31; z += 2) {
    for (let x = -31; x <= 31; x += 2) {
      if (Math.hypot(x, z - 24) < 12 || Math.hypot(x, z + 31) < 9) continue;
      if (WAR_ROOM_BLOCKERS.some((blocker) => intersectsBlocker(x, z, blocker, 1.1))) continue;
      if (chosen.some((point) => Math.hypot(x - point.x, z - point.z) < 7.5)) continue;
      candidates.push({ x, z });
    }
  }
  const extra: Array<{ x: number; z: number }> = [];
  while (extra.length < WAR_ROOM_MAX_ROOM_ENEMIES - 1 - WAR_ROOM_ENEMY_SPAWNS.length) {
    let best: { x: number; z: number } | null = null;
    let bestDistance = -1;
    for (const candidate of candidates) {
      if (extra.some((point) => Math.hypot(candidate.x - point.x, candidate.z - point.z) < 7.5)) continue;
      const nearest = chosen.reduce(
        (distance, point) => Math.min(distance, Math.hypot(candidate.x - point.x, candidate.z - point.z)),
        Number.POSITIVE_INFINITY,
      );
      if (nearest > bestDistance) {
        best = candidate;
        bestDistance = nearest;
      }
    }
    if (!best) throw new Error("War Room could not place all additional room enemies.");
    extra.push(best);
    chosen.push(best);
  }
  return extra;
}

const ADDITIONAL_SPAWN_SITES = getAdditionalSpawnSites();

export function getWarRoomRoom(roomNumber: number): WarRoomRoom {
  const safeNumber = Math.max(1, Math.floor(Number.isFinite(roomNumber) ? roomNumber : 1));
  const cycle = Math.floor((safeNumber - 1) / ROOM_DEFINITIONS.length);
  const definition = ROOM_DEFINITIONS[(safeNumber - 1) % ROOM_DEFINITIONS.length];
  const blockers = WAR_ROOM_BLOCKERS.map((blocker) => {
    const point = transformPoint(
      blocker.x,
      blocker.z,
      definition,
      blocker.kind === "cover",
    );
    const swapDimensions = definition.quarterTurns % 2 === 1;
    return {
      ...blocker,
      x: point.x,
      z: point.z,
      width: swapDimensions ? blocker.depth : blocker.width,
      depth: swapDimensions ? blocker.width : blocker.depth,
      rotationY: definition.quarterTurns * Math.PI / 2,
    };
  });
  const coverSpots = WAR_ROOM_COVER_SPOTS.map((spot) => (
    transformPoint(spot.x, spot.z, definition, true)
  ));
  const baseSpawns: WarRoomSpawn[] = [
    ...WAR_ROOM_ENEMY_SPAWNS,
    ...ADDITIONAL_SPAWN_SITES.map((point, index) => ({
      id: `guard-${String(WAR_ROOM_ENEMY_SPAWNS.length + index + 1).padStart(2, "0")}`,
      name: "",
      ...point,
    })),
  ];
  const enemySpawns = baseSpawns.map((spawn) => ({
    ...spawn,
    ...transformPoint(spawn.x, spawn.z, definition),
  }));
  const commanderPosition = transformPoint(WAR_ROOM_COMMANDER.x, WAR_ROOM_COMMANDER.z, definition);
  const baseEnemyCount = Math.min(
    WAR_ROOM_MAX_ROOM_ENEMIES,
    definition.enemyCount + cycle,
  );
  return {
    ...definition,
    number: safeNumber,
    cycle,
    enemyCount: baseEnemyCount,
    enemyHpMultiplier: 1 + cycle * 0.1,
    blockers,
    coverSpots,
    enemySpawns,
    commanderPosition,
  };
}

export function getWarRoomRoomRewardMultiplier(roomNumber: number) {
  const safeNumber = Math.max(1, Math.floor(Number.isFinite(roomNumber) ? roomNumber : 1));
  return Math.min(2.5, 1 + 0.15 * (safeNumber - 1));
}

export function getWarRoomRoomCarryHp(currentHp: number, maxHp: number) {
  const safeMax = Math.max(0, maxHp);
  return Math.min(safeMax, Math.max(0, currentHp) + safeMax * 0.4);
}

export function addWarRoomRoomReward(
  progress: WarRoomSavedProgress,
  roomNumber: number,
  reward: number,
): WarRoomSavedProgress {
  return {
    highestRoom: Math.max(progress.highestRoom, Math.max(0, Math.floor(roomNumber))),
    totalRoomRewards: progress.totalRoomRewards + Math.max(0, Math.floor(reward)),
  };
}

export function normalizeWarRoomSavedProgress(value: unknown): WarRoomSavedProgress {
  if (!value || typeof value !== "object") return { highestRoom: 0, totalRoomRewards: 0 };
  const record = value as Partial<WarRoomSavedProgress>;
  return {
    highestRoom: Number.isFinite(record.highestRoom) ? Math.max(0, Math.floor(record.highestRoom!)) : 0,
    totalRoomRewards: Number.isFinite(record.totalRoomRewards)
      ? Math.max(0, Math.floor(record.totalRoomRewards!))
      : 0,
  };
}

export function getWarRoomProgressAfterVictory(
  current: WarRoomSavedProgress,
  roomNumber: number,
  reward: number,
) {
  return addWarRoomRoomReward(current, roomNumber, reward);
}
