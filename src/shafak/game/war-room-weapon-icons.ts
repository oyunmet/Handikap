import { WAR_ROOM_WEAPON_BY_ID, type WarRoomWeaponId } from "./war-room-data";

const weaponIconCache = new Map<WarRoomWeaponId, string>();

const meleeShapes: Partial<Record<WarRoomWeaponId, string>> = {
  melee_knife: '<path d="M19 46 43 14 39 39 23 50Z"/><path d="m14 42 10 8"/>',
  melee_axe: '<path d="M31 51 34 19"/><path d="M32 26 14 16 11 28 27 32 39 20 51 25 48 11 34 13Z"/>',
  melee_cudgel: '<path d="M13 46 47 14"/><path d="m38 14 9-4 5 5-4 9"/>',
  melee_spear: '<path d="M17 51 43 14"/><path d="m37 17 12-10-1 16Z"/>',
  melee_shovel: '<path d="M30 50 35 22"/><path d="M23 10 47 14 40 30 27 28Z"/>',
  melee_staff: '<path d="M20 49 42 14"/><circle cx="45" cy="11" r="5"/><path d="m17 52 5-2"/>',
  melee_war_spear: '<path d="M15 53 43 12"/><path d="m38 15 14-11-2 18Z"/><path d="m12 56 5-4"/>',
  melee_pickaxe: '<path d="M30 52 34 23"/><path d="M13 17 35 11 52 18 48 25 34 20 18 27Z"/>',
};

function getRangedShape(id: WarRoomWeaponId) {
  if (id === "blaster_b" || id === "blaster_k" || id === "sidearm") {
    return '<path d="M11 22h29l8 6-4 7H29l-2 13H18l1-14-8-4Z"/><path d="M16 25v-7h18v7"/>';
  }
  if (id === "blaster_c" || id === "blaster_o" || id === "scattergun") {
    return '<path d="M8 24h38l9 5-2 6H18l-4 8H8l3-9Z"/><path d="M40 23v-6h12v6"/>';
  }
  if (id === "longbow") {
    return '<path d="M18 8q-18 24 0 48"/><path d="M18 8 45 32 18 56"/><path d="M15 32h38l-8-6m8 6-8 6"/>';
  }
  if (id === "crossbow") {
    return '<path d="M10 31h44M31 12v40"/><path d="M19 12q-15 19 0 40M31 29h23l-7-5m7 5-7 5"/>';
  }
  return '<path d="M7 24h39l11 5v6H22l-4 8h-9l4-10Z"/><path d="M15 25v-7h21v7"/><path d="M46 28h8"/>';
}

export function getWarRoomWeaponIconDataUrl(weaponId: WarRoomWeaponId) {
  const cached = weaponIconCache.get(weaponId);
  if (cached) return cached;
  const weapon = WAR_ROOM_WEAPON_BY_ID.get(weaponId);
  const color = weapon?.color ?? "#d9bd8b";
  const shape = meleeShapes[weaponId] ?? getRangedShape(weaponId);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><g fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${shape}</g></svg>`;
  const dataUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  weaponIconCache.set(weaponId, dataUrl);
  return dataUrl;
}
