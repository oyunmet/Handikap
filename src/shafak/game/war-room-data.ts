export type WarRoomWeaponId = "powder_rifle" | "sidearm" | "scattergun" | "crossbow" | "longbow";

export const WAR_ROOM_CHARACTER_HEIGHT = 1.92;
export const WAR_ROOM_COMMANDER_SCALE = 1.3;
export const WAR_ROOM_HEADSHOT_HEIGHT_RATIO = 0.8;

export type WarRoomWeapon = {
  id: WarRoomWeaponId;
  name: string;
  icon: string;
  className: string;
  damage: number;
  fireInterval: number;
  magazine: number;
  reserve: number;
  reloadSeconds: number;
  recoil: number;
  spread: number;
  headshotMultiplier: number;
  range: number;
  modelFile: string;
  modelSize: readonly [number, number, number];
  automatic?: boolean;
  pellets?: number;
  charge?: boolean;
  color: string;
};

export const WAR_ROOM_WEAPONS: readonly WarRoomWeapon[] = [
  {
    id: "powder_rifle",
    name: "Kara Barut Tüfeği",
    icon: "⌁",
    className: "Otomatik tüfek",
    damage: 19,
    fireInterval: 0.105,
    magazine: 30,
    reserve: 90,
    reloadSeconds: 2.05,
    recoil: 0.026,
    spread: 0.008,
    headshotMultiplier: 1.8,
    range: 62,
    modelFile: "rifle.glb",
    modelSize: [0.25, 0.25, 1.72],
    automatic: true,
    color: "#f3c77b",
  },
  {
    id: "sidearm",
    name: "Kıvılcım Tabancası",
    icon: "⌖",
    className: "Yarı otomatik",
    damage: 27,
    fireInterval: 0.32,
    magazine: 12,
    reserve: 60,
    reloadSeconds: 1.55,
    recoil: 0.045,
    spread: 0.014,
    headshotMultiplier: 2,
    range: 42,
    modelFile: "pistol.glb",
    modelSize: [0.21, 0.18, 0.43],
    color: "#e4b582",
  },
  {
    id: "scattergun",
    name: "Kırıktaş Pompalı",
    icon: "✣",
    className: "Yakın menzil",
    damage: 9,
    fireInterval: 0.82,
    magazine: 6,
    reserve: 36,
    reloadSeconds: 2.15,
    recoil: 0.09,
    spread: 0.075,
    headshotMultiplier: 1.65,
    range: 21,
    modelFile: "shotgun.glb",
    modelSize: [0.28, 0.27, 1.8],
    pellets: 7,
    color: "#ffbf76",
  },
  {
    id: "crossbow",
    name: "Kül Arbaleti",
    icon: "⟿",
    className: "Sessiz · ağır",
    damage: 74,
    fireInterval: 1.12,
    magazine: 1,
    reserve: 18,
    reloadSeconds: 1.65,
    recoil: 0.035,
    spread: 0.0025,
    headshotMultiplier: 2.25,
    range: 58,
    modelFile: "crossbow.glb",
    modelSize: [1.3, 0.3, 1.54],
    color: "#b7e7d1",
  },
  {
    id: "longbow",
    name: "Alacakaranlık Yayı",
    icon: "➶",
    className: "Çekmeli · güçlü",
    damage: 38,
    fireInterval: 0.62,
    magazine: 1,
    reserve: 24,
    reloadSeconds: 1.1,
    recoil: 0.018,
    spread: 0.012,
    headshotMultiplier: 2.1,
    range: 52,
    modelFile: "bow.glb",
    modelSize: [0.24, 1.5, 0.2],
    charge: true,
    color: "#b7d9ff",
  },
] as const;

export const WAR_ROOM_WEAPON_BY_ID = new Map(
  WAR_ROOM_WEAPONS.map((weapon) => [weapon.id, weapon]),
);

export const WAR_ROOM_WEAPON_MOUNTS = {
  powder_rifle: { position: [0.02, -0.025, -0.06], rotation: [0, 0, 0], scale: 0.58, muzzle: [0, 0.03, -1.23] },
  sidearm: { position: [0.015, -0.01, -0.035], rotation: [0, 0, 0], scale: 0.58, muzzle: [0, 0.03, -0.63] },
  scattergun: { position: [0.02, -0.035, -0.08], rotation: [0, 0, 0], scale: 0.5, muzzle: [0, 0.03, -1.11] },
  crossbow: { position: [0, -0.02, -0.06], rotation: [0, 0, 0], scale: 0.52, muzzle: [0, 0.05, -0.8] },
  longbow: { position: [0, -0.01, -0.045], rotation: [0, 0, 0], scale: 0.56, muzzle: [0, 0.02, -0.68] },
} as const satisfies Record<
  WarRoomWeaponId,
  { position: readonly [number, number, number]; rotation: readonly [number, number, number]; scale: number; muzzle: readonly [number, number, number] }
>;

export type WarRoomBlockerKind = "wall" | "cover" | "tower" | "platform";

export type WarRoomBlocker = {
  id: string;
  kind: WarRoomBlockerKind;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: string;
};

export const WAR_ROOM_HALF_SIZE = 36;

export const WAR_ROOM_BLOCKERS: readonly WarRoomBlocker[] = [
  { id: "outer-west", kind: "wall", x: -35, z: 0, width: 2, depth: 70, height: 5.5, color: "#665047" },
  { id: "outer-east", kind: "wall", x: 35, z: 0, width: 2, depth: 70, height: 5.5, color: "#665047" },
  { id: "outer-north", kind: "wall", x: 0, z: -35, width: 70, depth: 2, height: 5.5, color: "#715648" },
  { id: "outer-south", kind: "wall", x: 0, z: 35, width: 70, depth: 2, height: 5.5, color: "#715648" },
  { id: "west-tower", kind: "tower", x: -26, z: -25, width: 8, depth: 8, height: 10, color: "#65504a" },
  { id: "east-tower", kind: "tower", x: 27, z: 20, width: 7, depth: 8, height: 8, color: "#765746" },
  { id: "north-barricade-left", kind: "wall", x: -16, z: -23, width: 12, depth: 1.4, height: 4.2, color: "#776050" },
  { id: "north-barricade-right", kind: "wall", x: 15, z: -24, width: 13, depth: 1.4, height: 4.2, color: "#776050" },
  { id: "central-wall-west", kind: "wall", x: -7, z: -8, width: 1.4, depth: 12, height: 4.4, color: "#69534a" },
  { id: "central-wall-east", kind: "wall", x: 8, z: -8, width: 1.4, depth: 12, height: 4.4, color: "#69534a" },
  { id: "passage-west", kind: "wall", x: -3.2, z: 13, width: 1.25, depth: 18, height: 3.8, color: "#70564b" },
  { id: "passage-east", kind: "wall", x: 3.2, z: 13, width: 1.25, depth: 18, height: 3.8, color: "#70564b" },
  { id: "cover-west-north", kind: "cover", x: -15, z: -14, width: 7, depth: 1.5, height: 1.35, color: "#6e5745" },
  { id: "cover-east-north", kind: "cover", x: 15, z: -14, width: 7, depth: 1.5, height: 1.35, color: "#6e5745" },
  { id: "cover-center", kind: "cover", x: 1, z: -1, width: 6.5, depth: 1.5, height: 1.3, color: "#785a43" },
  { id: "cover-west-south", kind: "cover", x: -16, z: 9, width: 6, depth: 1.4, height: 1.25, color: "#795840" },
  { id: "cover-east-south", kind: "cover", x: 16, z: 7, width: 6.5, depth: 1.5, height: 1.3, color: "#795840" },
  { id: "cover-east-side", kind: "cover", x: 25, z: -3, width: 1.5, depth: 6, height: 1.35, color: "#705542" },
  { id: "cover-west-side", kind: "cover", x: -25, z: 4, width: 1.5, depth: 6.5, height: 1.35, color: "#705542" },
  { id: "raised-platform", kind: "platform", x: 22, z: -17, width: 8, depth: 5, height: 1.05, color: "#80644f" },
  { id: "crate-row-one", kind: "cover", x: -8, z: 21, width: 3.1, depth: 2.4, height: 1.65, color: "#79573b" },
  { id: "crate-row-two", kind: "cover", x: 9, z: 24, width: 3.1, depth: 2.4, height: 1.65, color: "#79573b" },
  { id: "barrel-west", kind: "cover", x: -21, z: 20, width: 1.35, depth: 1.35, height: 1.45, color: "#76543b" },
  { id: "barrel-east", kind: "cover", x: 21, z: 13, width: 1.35, depth: 1.35, height: 1.45, color: "#76543b" },
];

export const WAR_ROOM_COVER_SPOTS = [
  { x: -15, z: -11 },
  { x: 15, z: -11 },
  { x: -16, z: 12 },
  { x: 16, z: 10 },
  { x: -24, z: 4 },
  { x: 24, z: -1 },
  { x: -9, z: -1 },
  { x: 10, z: -1 },
] as const;

export const WAR_ROOM_ENEMY_SPAWNS = [
  { id: "guard-01", name: "Kale Nöbetçisi", x: -26, z: -15 },
  { id: "guard-02", name: "Barutçu", x: -17, z: -29 },
  { id: "guard-03", name: "Siperci", x: -7, z: -27 },
  { id: "guard-04", name: "Arbaletçi", x: 9, z: -28 },
  { id: "guard-05", name: "Kule Gözcüsü", x: 25, z: -20 },
  { id: "guard-06", name: "Sancaktar", x: 27, z: -7 },
  { id: "guard-07", name: "Kılıçlı", x: -25, z: -3 },
  { id: "guard-08", name: "Öncü", x: 19, z: 2 },
] as const;

export const WAR_ROOM_COMMANDER = {
  id: "commander",
  name: "Kızıl Komutan",
  x: 0,
  z: -31,
  hp: 360,
  damage: 13,
} as const;
