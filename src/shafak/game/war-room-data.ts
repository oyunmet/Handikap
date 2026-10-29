export type BlasterWeaponClass = "rifle" | "pistol" | "shotgun" | "light" | "heavy";
export type WarRoomWeaponClass = BlasterWeaponClass | "melee";
export type WarRoomMeleeStyle = "slash" | "thrust";
export type WarRoomWeaponId =
  | "powder_rifle" | "sidearm" | "scattergun" | "crossbow" | "longbow"
  | "melee_knife" | "melee_axe" | "melee_cudgel" | "melee_spear" | "melee_shovel"
  | "melee_staff" | "melee_war_spear" | "melee_pickaxe"
  | `blaster_${"a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m" | "n" | "o" | "p" | "q" | "r"}`;

export type WarRoomWeaponMount = {
  position: readonly [number, number, number];
  rotation: readonly [number, number, number];
  scale: number;
  gripRatio?: number;
  muzzle?: readonly [number, number, number];
  muzzleEnd?: -1 | 1;
  muzzleOffsetZ?: number;
};

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
  modelFile: string | null;
  modelSize?: readonly [number, number, number];
  normalizeLength?: number;
  minimumVisualThickness?: number;
  sourceBounds?: readonly [number, number, number];
  storeItemId?: string;
  priceGold?: number;
  rarity?: "Sıradan" | "Nadir" | "Epik" | "Efsanevi";
  weaponClass?: WarRoomWeaponClass;
  meleeStyle?: WarRoomMeleeStyle;
  meleeDuration?: number;
  mount?: WarRoomWeaponMount;
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
    modelFile: null,
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
    modelFile: null,
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
    modelFile: null,
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
    modelFile: null,
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
    modelFile: null,
    modelSize: [0.24, 1.5, 0.2],
    charge: true,
    color: "#b7d9ff",
  },
  {
    id: "melee_knife", name: "Bıçak", icon: "⚔", className: "Yakın dövüş · Hızlı",
    damage: 24, fireInterval: 0.42, magazine: 0, reserve: 0, reloadSeconds: 0, recoil: 0, spread: 0, headshotMultiplier: 1, range: 1.8,
    modelFile: "knife.glb", normalizeLength: 0.3, minimumVisualThickness: 0.028, weaponClass: "melee", meleeStyle: "slash", meleeDuration: 0.38, color: "#c6d4d1",
    mount: { position: [0.018, -0.012, -0.018], rotation: [0, 0, 0], scale: 1, gripRatio: 0.18 },
  },
  {
    id: "melee_axe", name: "Balta", icon: "🪓", className: "Yakın dövüş · Ağır",
    damage: 68, fireInterval: 0.92, magazine: 0, reserve: 0, reloadSeconds: 0, recoil: 0, spread: 0, headshotMultiplier: 1, range: 2,
    modelFile: "axe.glb", normalizeLength: 0.75, minimumVisualThickness: 0.03, weaponClass: "melee", meleeStyle: "slash", meleeDuration: 0.7, color: "#c8935d",
    mount: { position: [0.012, -0.018, -0.025], rotation: [0, 0, 0], scale: 1, gripRatio: 0.16 },
  },
  {
    id: "melee_cudgel", name: "Sopa", icon: "▰", className: "Yakın dövüş · Dengeli",
    damage: 43, fireInterval: 0.64, magazine: 0, reserve: 0, reloadSeconds: 0, recoil: 0, spread: 0, headshotMultiplier: 1, range: 2,
    modelFile: "cudgel.glb", normalizeLength: 0.9, weaponClass: "melee", meleeStyle: "slash", meleeDuration: 0.54, color: "#966d48",
    mount: { position: [0.015, -0.012, -0.022], rotation: [0, 0, 0], scale: 1, gripRatio: 0.15 },
  },
  {
    id: "melee_spear", name: "Mızrak", icon: "↗", className: "Yakın dövüş · Uzun menzil",
    damage: 45, fireInterval: 0.68, magazine: 0, reserve: 0, reloadSeconds: 0, recoil: 0, spread: 0, headshotMultiplier: 1, range: 2.6,
    modelFile: "spear.glb", normalizeLength: 1.9, minimumVisualThickness: 0.04, weaponClass: "melee", meleeStyle: "thrust", meleeDuration: 0.58, color: "#91bbb4",
    mount: { position: [0.012, -0.012, -0.025], rotation: [-Math.PI / 2 + 0.08, 0, 0], scale: 1, gripRatio: 0.24 },
  },
  {
    id: "melee_shovel", name: "Kürek", icon: "⛏", className: "Yakın dövüş · Ağır",
    damage: 62, fireInterval: 0.88, magazine: 0, reserve: 0, reloadSeconds: 0, recoil: 0, spread: 0, headshotMultiplier: 1, range: 2,
    modelFile: null, modelSize: [0.18, 1.2, 0.13], normalizeLength: 1.2, weaponClass: "melee", meleeStyle: "slash", meleeDuration: 0.68, color: "#a98967",
    mount: { position: [0.014, -0.018, -0.024], rotation: [0, 0, 0], scale: 1, gripRatio: 0.16 },
  },
  {
    id: "melee_staff", name: "Kül Asası", icon: "ϟ", className: "Yakın dövüş · Geniş savuruş",
    storeItemId: "war_room_melee_staff", priceGold: 620, rarity: "Nadir",
    damage: 39, fireInterval: 0.66, magazine: 0, reserve: 0, reloadSeconds: 0, recoil: 0, spread: 0, headshotMultiplier: 1, range: 2.3,
    modelFile: "war-room-staff.glb", normalizeLength: 1.5, sourceBounds: [0.235, 1.6, 0.193],
    weaponClass: "melee", meleeStyle: "slash", meleeDuration: 0.54, color: "#c18fe0",
    mount: { position: [0.01, -0.014, -0.025], rotation: [-Math.PI / 2 + 0.08, 0, 0], scale: 1, gripRatio: 0.22 },
  },
  {
    id: "melee_war_spear", name: "Surlu Mızrağı", icon: "↗", className: "Yakın dövüş · Uzun saplama",
    storeItemId: "war_room_melee_spear", priceGold: 780, rarity: "Epik",
    damage: 48, fireInterval: 0.74, magazine: 0, reserve: 0, reloadSeconds: 0, recoil: 0, spread: 0, headshotMultiplier: 1, range: 3.05,
    modelFile: "war-room-spear.glb", normalizeLength: 1.9, sourceBounds: [0.15, 0.7, 0.112],
    weaponClass: "melee", meleeStyle: "thrust", meleeDuration: 0.6, color: "#91bbb2",
    mount: { position: [0.012, -0.014, -0.034], rotation: [-Math.PI / 2 + 0.08, 0, 0], scale: 1, gripRatio: 0.24 },
  },
  {
    id: "melee_pickaxe", name: "Surlu Kazması", icon: "⛏", className: "Yakın dövüş · Ağır darbe",
    storeItemId: "war_room_melee_pickaxe", priceGold: 820, rarity: "Epik",
    damage: 70, fireInterval: 1.02, magazine: 0, reserve: 0, reloadSeconds: 0, recoil: 0, spread: 0, headshotMultiplier: 1, range: 2.05,
    modelFile: "war-room-pickaxe.glb", normalizeLength: 1, sourceBounds: [0.667, 0.9, 0.172],
    weaponClass: "melee", meleeStyle: "slash", meleeDuration: 0.76, color: "#c8965d",
    mount: { position: [0.014, -0.018, -0.03], rotation: [0, 0, 0], scale: 1, gripRatio: 0.24 },
  },
  {
    id: "blaster_a", name: "Kül Nöbetçisi", icon: "⌁", className: "Tüfek", weaponClass: "rifle",
    rarity: "Sıradan", storeItemId: "war_room_blaster_a", priceGold: 320,
    damage: 18, fireInterval: 0.115, magazine: 30, reserve: 90, reloadSeconds: 1.95, recoil: 0.024, spread: 0.009, headshotMultiplier: 1.8, range: 58,
    modelFile: "blaster-a.glb", sourceBounds: [0.1838, 0.4559, 0.8], normalizeLength: 1,
    automatic: true, color: "#83a7ae", mount: { position: [0.02, -0.02, -0.05], rotation: [0, 0, 0], scale: 1, muzzleEnd: -1 },
  },
  {
    id: "blaster_b", name: "Kül Kıvılcımı", icon: "⌖", className: "Tabanca", weaponClass: "pistol",
    rarity: "Sıradan", storeItemId: "war_room_blaster_b", priceGold: 240,
    damage: 25, fireInterval: 0.31, magazine: 12, reserve: 60, reloadSeconds: 1.45, recoil: 0.043, spread: 0.015, headshotMultiplier: 2, range: 38,
    modelFile: "blaster-b.glb", sourceBounds: [0.155, 0.3105, 0.4201], normalizeLength: 0.25,
    color: "#c38d59", mount: { position: [0.015, -0.012, -0.035], rotation: [0, 0, 0], scale: 1, muzzleEnd: -1 },
  },
  {
    id: "blaster_c", name: "Kırıktaş Yarması", icon: "✣", className: "Pompalı", weaponClass: "shotgun",
    rarity: "Nadir", storeItemId: "war_room_blaster_c", priceGold: 690,
    damage: 8, fireInterval: 0.78, magazine: 7, reserve: 35, reloadSeconds: 2.1, recoil: 0.086, spread: 0.072, headshotMultiplier: 1.65, range: 22,
    modelFile: "blaster-c.glb", sourceBounds: [0.165, 0.3379, 0.4754], normalizeLength: 0.62,
    pellets: 8, color: "#cc8b52", mount: { position: [0.02, -0.025, -0.055], rotation: [0, 0, 0], scale: 1, muzzleEnd: -1 },
  },
  {
    id: "blaster_d", name: "Demir Hat Tüfeği", icon: "⌁", className: "Tüfek", weaponClass: "rifle",
    rarity: "Nadir", storeItemId: "war_room_blaster_d", priceGold: 740,
    damage: 20, fireInterval: 0.13, magazine: 28, reserve: 84, reloadSeconds: 2, recoil: 0.029, spread: 0.008, headshotMultiplier: 1.85, range: 62,
    modelFile: "blaster-d.glb", sourceBounds: [0.165, 0.3719, 0.9079], normalizeLength: 1,
    automatic: true, color: "#a5b3b6", mount: { position: [0.02, -0.02, -0.05], rotation: [0, 0, 0], scale: 1, muzzleEnd: -1 },
  },
  {
    id: "blaster_e", name: "Uzun Kül Tüfeği", icon: "⌁", className: "Tüfek", weaponClass: "rifle",
    rarity: "Epik", storeItemId: "war_room_blaster_e", priceGold: 1180,
    damage: 25, fireInterval: 0.24, magazine: 18, reserve: 72, reloadSeconds: 2.3, recoil: 0.044, spread: 0.006, headshotMultiplier: 2.05, range: 82,
    modelFile: "blaster-e.glb", sourceBounds: [0.1664, 0.405, 1.39], normalizeLength: 1,
    color: "#c5a778", mount: { position: [0.02, -0.025, -0.06], rotation: [0, 0, 0], scale: 1, muzzleEnd: -1 },
  },
  {
    id: "blaster_f", name: "Kızıl Barutçu", icon: "⌁", className: "Tüfek", weaponClass: "rifle",
    rarity: "Efsanevi", storeItemId: "war_room_blaster_f", priceGold: 1780,
    damage: 27, fireInterval: 0.26, magazine: 20, reserve: 80, reloadSeconds: 2.35, recoil: 0.048, spread: 0.006, headshotMultiplier: 2.1, range: 86,
    modelFile: "blaster-f.glb", sourceBounds: [0.17, 0.445, 1.31], normalizeLength: 1,
    color: "#d9775e", mount: { position: [0.02, -0.025, -0.06], rotation: [0, 0, 0], scale: 1, muzzleEnd: -1 },
  },
  {
    id: "blaster_g", name: "Yolcu Tüfeği", icon: "⌁", className: "Hafif tüfek", weaponClass: "rifle",
    rarity: "Sıradan", storeItemId: "war_room_blaster_g", priceGold: 360,
    damage: 16, fireInterval: 0.1, magazine: 34, reserve: 102, reloadSeconds: 1.8, recoil: 0.022, spread: 0.011, headshotMultiplier: 1.75, range: 54,
    modelFile: "blaster-g.glb", sourceBounds: [0.2, 0.3579, 0.7859], normalizeLength: 1,
    automatic: true, color: "#78ad9a", mount: { position: [0.02, -0.02, -0.05], rotation: [0, 0, 0], scale: 1, muzzleEnd: -1 },
  },
  {
    id: "blaster_h", name: "İzci Hafifliği", icon: "⌁", className: "Hafif tüfek", weaponClass: "light",
    rarity: "Nadir", storeItemId: "war_room_blaster_h", priceGold: 580,
    damage: 15, fireInterval: 0.095, magazine: 32, reserve: 96, reloadSeconds: 1.7, recoil: 0.019, spread: 0.012, headshotMultiplier: 1.75, range: 48,
    modelFile: "blaster-h.glb", sourceBounds: [0.165, 0.2745, 0.648], normalizeLength: 0.78,
    automatic: true, color: "#79b8aa", mount: { position: [0.018, -0.018, -0.045], rotation: [0, 0, 0], scale: 1, muzzleEnd: -1 },
  },
  {
    id: "blaster_i", name: "Sis Kısa Tüfeği", icon: "⌁", className: "Hafif tüfek", weaponClass: "light",
    rarity: "Sıradan", storeItemId: "war_room_blaster_i", priceGold: 390,
    damage: 14, fireInterval: 0.09, magazine: 36, reserve: 108, reloadSeconds: 1.65, recoil: 0.018, spread: 0.014, headshotMultiplier: 1.7, range: 44,
    modelFile: "blaster-i.glb", sourceBounds: [0.165, 0.32, 0.52], normalizeLength: 0.72,
    automatic: true, color: "#84a9a2", mount: { position: [0.018, -0.018, -0.045], rotation: [0, 0, 0], scale: 1, muzzleEnd: -1 },
  },
  {
    id: "blaster_j", name: "Demir Namlulu", icon: "⌁", className: "Ağır tüfek", weaponClass: "heavy",
    rarity: "Nadir", storeItemId: "war_room_blaster_j", priceGold: 720,
    damage: 23, fireInterval: 0.21, magazine: 16, reserve: 64, reloadSeconds: 2.1, recoil: 0.042, spread: 0.007, headshotMultiplier: 1.95, range: 68,
    modelFile: "blaster-j.glb", sourceBounds: [0.155, 0.3619, 0.61], normalizeLength: 0.82,
    color: "#aa9c83", mount: { position: [0.02, -0.022, -0.05], rotation: [0, 0, 0], scale: 1, muzzleEnd: -1 },
  },
  {
    id: "blaster_k", name: "Kül Cep Tabancası", icon: "⌖", className: "Tabanca", weaponClass: "pistol",
    rarity: "Sıradan", storeItemId: "war_room_blaster_k", priceGold: 260,
    damage: 23, fireInterval: 0.28, magazine: 14, reserve: 70, reloadSeconds: 1.4, recoil: 0.04, spread: 0.016, headshotMultiplier: 1.95, range: 35,
    modelFile: "blaster-k.glb", sourceBounds: [0.155, 0.3338, 0.4604], normalizeLength: 0.25,
    color: "#ba9164", mount: { position: [0.015, -0.012, -0.035], rotation: [0, 0, 0], scale: 1, muzzleEnd: -1 },
  },
  {
    id: "blaster_l", name: "Mühürlü Hafif Tüfek", icon: "⌁", className: "Hafif tüfek", weaponClass: "light",
    rarity: "Epik", storeItemId: "war_room_blaster_l", priceGold: 1120,
    damage: 17, fireInterval: 0.085, magazine: 38, reserve: 114, reloadSeconds: 1.75, recoil: 0.02, spread: 0.009, headshotMultiplier: 1.85, range: 56,
    modelFile: "blaster-l.glb", sourceBounds: [0.2438, 0.3279, 0.5504], normalizeLength: 0.8,
    automatic: true, color: "#87b5bd", mount: { position: [0.018, -0.018, -0.045], rotation: [0, 0, 0], scale: 1, muzzleEnd: -1 },
  },
  {
    id: "blaster_m", name: "Kızıl Ağır Tüfek", icon: "⌁", className: "Ağır tüfek", weaponClass: "heavy",
    rarity: "Epik", storeItemId: "war_room_blaster_m", priceGold: 1240,
    damage: 24, fireInterval: 0.23, magazine: 17, reserve: 68, reloadSeconds: 2.15, recoil: 0.046, spread: 0.006, headshotMultiplier: 2, range: 73,
    modelFile: "blaster-m.glb", sourceBounds: [0.165, 0.3374, 0.6201], normalizeLength: 0.86,
    color: "#c06c61", mount: { position: [0.02, -0.022, -0.05], rotation: [0, 0, 0], scale: 1, muzzleEnd: -1 },
  },
  {
    id: "blaster_n", name: "Yol Hafifliği", icon: "⌁", className: "Hafif tüfek", weaponClass: "light",
    rarity: "Sıradan", storeItemId: "war_room_blaster_n", priceGold: 410,
    damage: 15, fireInterval: 0.1, magazine: 30, reserve: 90, reloadSeconds: 1.7, recoil: 0.021, spread: 0.012, headshotMultiplier: 1.75, range: 49,
    modelFile: "blaster-n.glb", sourceBounds: [0.17, 0.33, 0.6401], normalizeLength: 0.76,
    automatic: true, color: "#85aa91", mount: { position: [0.018, -0.018, -0.045], rotation: [0, 0, 0], scale: 1, muzzleEnd: -1 },
  },
  {
    id: "blaster_o", name: "Kale Yaranı", icon: "✣", className: "Pompalı", weaponClass: "shotgun",
    rarity: "Efsanevi", storeItemId: "war_room_blaster_o", priceGold: 1820,
    damage: 10, fireInterval: 0.9, magazine: 5, reserve: 30, reloadSeconds: 2.3, recoil: 0.1, spread: 0.08, headshotMultiplier: 1.7, range: 25,
    modelFile: "blaster-o.glb", sourceBounds: [0.245, 0.3338, 0.48], normalizeLength: 0.68,
    pellets: 9, color: "#d39653", mount: { position: [0.02, -0.025, -0.055], rotation: [0, 0, 0], scale: 1, muzzleEnd: -1 },
  },
  {
    id: "blaster_p", name: "Surlu Muhafız Tüfeği", icon: "⌁", className: "Tüfek", weaponClass: "rifle",
    rarity: "Nadir", storeItemId: "war_room_blaster_p", priceGold: 780,
    damage: 19, fireInterval: 0.12, magazine: 30, reserve: 90, reloadSeconds: 1.95, recoil: 0.027, spread: 0.008, headshotMultiplier: 1.85, range: 61,
    modelFile: "blaster-p.glb", sourceBounds: [0.16, 0.3709, 0.8621], normalizeLength: 1,
    automatic: true, color: "#9eb2ae", mount: { position: [0.02, -0.02, -0.05], rotation: [0, 0, 0], scale: 1, muzzleEnd: -1 },
  },
  {
    id: "blaster_q", name: "Kor Ağır Atıcısı", icon: "⌁", className: "Ağır tüfek", weaponClass: "heavy",
    rarity: "Epik", storeItemId: "war_room_blaster_q", priceGold: 1280,
    damage: 26, fireInterval: 0.3, magazine: 14, reserve: 56, reloadSeconds: 2.25, recoil: 0.052, spread: 0.005, headshotMultiplier: 2.1, range: 79,
    modelFile: "blaster-q.glb", sourceBounds: [0.17, 0.3238, 0.7104], normalizeLength: 0.92,
    color: "#c68e54", mount: { position: [0.02, -0.022, -0.05], rotation: [0, 0, 0], scale: 1, muzzleEnd: -1 },
  },
  {
    id: "blaster_r", name: "Gece Nöbetçisi", icon: "⌁", className: "Tüfek", weaponClass: "rifle",
    rarity: "Efsanevi", storeItemId: "war_room_blaster_r", priceGold: 1900,
    damage: 26, fireInterval: 0.22, magazine: 24, reserve: 96, reloadSeconds: 2.05, recoil: 0.036, spread: 0.005, headshotMultiplier: 2.15, range: 82,
    modelFile: "blaster-r.glb", sourceBounds: [0.18, 0.4009, 0.6834], normalizeLength: 0.92,
    automatic: true, color: "#8faeaa", mount: { position: [0.02, -0.02, -0.05], rotation: [0, 0, 0], scale: 1, muzzleEnd: -1 },
  },
] as const;

export const WAR_ROOM_WEAPON_BY_ID = new Map(
  WAR_ROOM_WEAPONS.map((weapon) => [weapon.id, weapon]),
);

const legacyWeaponMounts = {
  powder_rifle: { position: [0.02, -0.025, -0.06], rotation: [0, 0, 0], scale: 0.58, muzzle: [0, 0.03, -1.23] },
  sidearm: { position: [0.015, -0.01, -0.035], rotation: [0, 0, 0], scale: 0.58, muzzle: [0, 0.03, -0.63] },
  scattergun: { position: [0.02, -0.035, -0.08], rotation: [0, 0, 0], scale: 0.5, muzzle: [0, 0.03, -1.11] },
  crossbow: { position: [0, -0.02, -0.06], rotation: [0, 0, 0], scale: 0.52, muzzle: [0, 0.05, -0.8] },
  longbow: { position: [0, -0.01, -0.045], rotation: [0, 0, 0], scale: 0.56, muzzle: [0, 0.02, -0.68] },
} as const;

export const WAR_ROOM_WEAPON_MOUNTS = {
  ...legacyWeaponMounts,
  ...Object.fromEntries(
    WAR_ROOM_WEAPONS
      .filter((weapon) => weapon.mount)
      .map((weapon) => [weapon.id, weapon.mount]),
  ),
} as Record<WarRoomWeaponId, WarRoomWeaponMount>;

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

export type WarRoomBuilding = {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  wallHeight: number;
  doorWidth: number;
  rotationY: number;
};

export const WAR_ROOM_HALF_SIZE = 36;

export const WAR_ROOM_BUILDINGS: readonly WarRoomBuilding[] = [
  {
    id: "west-barracks",
    x: -26,
    z: -25,
    width: 8,
    depth: 8,
    wallHeight: 4.6,
    doorWidth: 2.4,
    rotationY: 0,
  },
  {
    id: "east-guardhouse",
    x: 27,
    z: 20,
    width: 7,
    depth: 8,
    wallHeight: 4.5,
    doorWidth: 2.2,
    rotationY: 0,
  },
];

function createBuildingWallBlockers(building: WarRoomBuilding): WarRoomBlocker[] {
  const thickness = 0.42;
  const frontSegmentWidth = (building.width - building.doorWidth) / 2;
  const frontOffset = building.doorWidth / 2 + frontSegmentWidth / 2;
  const frontZ = building.z - building.depth / 2;
  const backZ = building.z + building.depth / 2;
  const walls = [
    {
      id: `${building.id}-front-left`,
      x: building.x - frontOffset,
      z: frontZ,
      width: frontSegmentWidth,
      depth: thickness,
    },
    {
      id: `${building.id}-front-right`,
      x: building.x + frontOffset,
      z: frontZ,
      width: frontSegmentWidth,
      depth: thickness,
    },
    {
      id: `${building.id}-back`,
      x: building.x,
      z: backZ,
      width: building.width,
      depth: thickness,
    },
    {
      id: `${building.id}-west`,
      x: building.x - building.width / 2,
      z: building.z,
      width: thickness,
      depth: building.depth,
    },
    {
      id: `${building.id}-east`,
      x: building.x + building.width / 2,
      z: building.z,
      width: thickness,
      depth: building.depth,
    },
  ];
  return walls.map((wall) => ({
    ...wall,
    kind: "wall",
    height: building.wallHeight,
    color: "#897968",
  }));
}

export const WAR_ROOM_BLOCKERS: readonly WarRoomBlocker[] = [
  { id: "outer-west", kind: "wall", x: -35, z: 0, width: 2, depth: 70, height: 5.5, color: "#665047" },
  { id: "outer-east", kind: "wall", x: 35, z: 0, width: 2, depth: 70, height: 5.5, color: "#665047" },
  { id: "outer-north", kind: "wall", x: 0, z: -35, width: 70, depth: 2, height: 5.5, color: "#715648" },
  { id: "outer-south", kind: "wall", x: 0, z: 35, width: 70, depth: 2, height: 5.5, color: "#715648" },
  ...WAR_ROOM_BUILDINGS.flatMap(createBuildingWallBlockers),
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
  { id: "hideout-crate-west-one", kind: "cover", x: -27.5, z: -25.2, width: 1.2, depth: 1.35, height: 1.55, color: "#76543b" },
  { id: "hideout-crate-west-two", kind: "cover", x: -24.5, z: -23.8, width: 1.2, depth: 1.35, height: 1.55, color: "#76543b" },
  { id: "hideout-crate-east-one", kind: "cover", x: 25.55, z: 20, width: 1.2, depth: 1.35, height: 1.55, color: "#76543b" },
  { id: "hideout-crate-east-two", kind: "cover", x: 28.45, z: 21.4, width: 1.2, depth: 1.35, height: 1.55, color: "#76543b" },
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
  { id: "guard-05", name: "Kule Gözcüsü", x: 31, z: 31 },
  { id: "guard-06", name: "Sancaktar", x: 27, z: -7 },
  { id: "guard-07", name: "Kılıçlı", x: -25, z: -3 },
  { id: "guard-08", name: "Öncü", x: -31, z: 31 },
] as const;

export const WAR_ROOM_COMMANDER = {
  id: "commander",
  name: "Kızıl Komutan",
  x: 0,
  z: -31,
  hp: 360,
  damage: 13,
} as const;
