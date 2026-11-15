import type { WarRoomWeaponId } from "./war-room-data.ts";

export type WarRoomWeaponReloadOffsets = {
  magazineY: number;
  boltZ: number;
  arrowX: number;
  arrowY: number;
  arrowZ: number;
};

const clamp01 = (value: number) => (
  Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0
);

function smooth(value: number) {
  const amount = clamp01(value);
  return amount * amount * (3 - 2 * amount);
}

export function getWarRoomWeaponReloadOffsets(
  weaponId: WarRoomWeaponId,
  progress: number,
  chargeProgress = 0,
): WarRoomWeaponReloadOffsets {
  const reload = clamp01(progress);
  let magazineY = 0;
  if (reload >= 0.12 && reload < 0.34) {
    magazineY = -0.24 * smooth((reload - 0.12) / 0.22);
  } else if (reload >= 0.34 && reload < 0.58) {
    magazineY = -0.24;
  } else if (reload >= 0.58 && reload < 0.82) {
    magazineY = -0.24 * (1 - smooth((reload - 0.58) / 0.24));
  }

  let boltPull = 0;
  if (reload >= 0.78 && reload < 0.88) {
    boltPull = smooth((reload - 0.78) / 0.1);
  } else if (reload >= 0.88 && reload < 0.97) {
    boltPull = 1 - smooth((reload - 0.88) / 0.09);
  }

  let arrowX = 0;
  let arrowY = 0;
  let arrowZ = weaponId === "longbow" ? clamp01(chargeProgress) * 0.18 : 0;
  if (weaponId === "crossbow" && reload > 0 && reload < 1) {
    const insertion = smooth((reload - 0.25) / 0.5);
    const remaining = 1 - insertion;
    arrowX = 0.32 * remaining;
    arrowY = -0.3 * remaining;
    arrowZ = 0.22 * remaining;
  }

  return {
    magazineY,
    boltZ: boltPull * 0.14,
    arrowX,
    arrowY,
    arrowZ,
  };
}
