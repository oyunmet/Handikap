import type { MutableRefObject } from "react";
import type { WarRoomWeaponId } from "../game/war-room-data.ts";
import FantasyKnightModel from "./FantasyKnightModel";

type Props = {
  animationRef: MutableRefObject<WarRoomArmsAnimation>;
  weaponScale: number;
  visible: boolean;
};

export type WarRoomArmsAnimation = {
  weaponId: WarRoomWeaponId;
  aiming: boolean;
  reloadProgress: number;
  chargeProgress: number;
  recoil: number;
  loaded: boolean;
};

const WAR_ROOM_PLAYER_APPEARANCE = {
  armor: "#2f765d",
  armorLight: "#aeb2b5",
  armorDark: "#493a31",
  gloveColor: "#554033",
  bootColor: "#49352e",
  trim: "#d0b680",
};

export function WarRoomFirstPersonArms({
  weaponScale,
  visible,
}: Props) {
  return (
    <group
      name="fantasy-knight-first-person-arms"
      visible={visible}
      position={[0, -1.55, -0.48]}
      rotation={[0, Math.PI, 0]}
      scale={weaponScale}
    >
      <FantasyKnightModel
        appearance={WAR_ROOM_PLAYER_APPEARANCE}
        parts="arms"
        showWeapon={false}
        targetHeight={2.335}
        castShadow={false}
      />
    </group>
  );
}
