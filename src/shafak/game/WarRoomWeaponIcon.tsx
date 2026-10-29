import type { WarRoomWeaponId } from "./war-room-data";
import { getWarRoomWeaponIconDataUrl } from "./war-room-weapon-icons";

export function WarRoomWeaponIcon({
  weaponId,
  className,
}: {
  weaponId: WarRoomWeaponId;
  className: string;
}) {
  return <img className={className} src={getWarRoomWeaponIconDataUrl(weaponId)} alt="" aria-hidden="true" />;
}
