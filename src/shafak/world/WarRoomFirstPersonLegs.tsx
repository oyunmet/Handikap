import { useFrame } from "@react-three/fiber";
import { useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import {
  shouldShowWarRoomFirstPersonLegs,
} from "../game/war-room-first-person-legs.ts";
import type { WarRoomRuntime } from "../game/war-room-engine.ts";
import FantasyKnightModel from "./FantasyKnightModel";

type Props = {
  runtimeRef: MutableRefObject<WarRoomRuntime>;
  parentRef: MutableRefObject<THREE.Group | null>;
  cameraPositionRef: MutableRefObject<THREE.Vector3>;
  cameraQuaternionRef: MutableRefObject<THREE.Quaternion>;
  cameraForwardRef: MutableRefObject<THREE.Vector3>;
  movementRef: MutableRefObject<number>;
  walkPhaseRef: MutableRefObject<number>;
  active: boolean;
};

const WAR_ROOM_PLAYER_APPEARANCE = {
  armor: "#2f765d",
  armorLight: "#aeb2b5",
  armorDark: "#493a31",
  bootColor: "#49352e",
  trim: "#d0b680",
};

export default function WarRoomFirstPersonLegs({
  cameraForwardRef,
  active,
}: Props) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.visible = active
        && shouldShowWarRoomFirstPersonLegs(cameraForwardRef.current.y);
    }
  });

  return (
    <group
      ref={groupRef}
      name="fantasy-knight-first-person-legs"
      position={[0, -1.35, -0.24]}
      rotation={[0, Math.PI, 0]}
    >
      <FantasyKnightModel
        appearance={WAR_ROOM_PLAYER_APPEARANCE}
        parts="legs"
        showWeapon={false}
        targetHeight={2.335}
        castShadow={false}
      />
    </group>
  );
}
