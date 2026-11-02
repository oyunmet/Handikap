import { useFrame } from "@react-three/fiber";
import { useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import type { WarRoomBuilding } from "../game/war-room-data";
import {
  getWarRoomDoorOpenProgress,
  getWarRoomDoorStateKey,
  type WarRoomDoorFloor,
} from "../game/war-room-doors";
import type { WarRoomRuntime } from "../game/war-room-engine";

export default function WarRoomDoor({
  building,
  runtimeRef,
  floor = 0,
}: {
  building: WarRoomBuilding;
  runtimeRef: MutableRefObject<WarRoomRuntime>;
  floor?: WarRoomDoorFloor;
}) {
  const hingeRef = useRef<THREE.Group>(null);
  const leafWidth = Math.max(0.8, building.doorWidth - 0.12);
  const frontZ = -building.depth / 2;
  const floorY = floor === 0 ? 0 : building.storyHeight;
  const stateKey = getWarRoomDoorStateKey(building, floor);

  useFrame(() => {
    const hinge = hingeRef.current;
    if (!hinge) return;
    const state = runtimeRef.current.doorStates[stateKey];
    const progress = getWarRoomDoorOpenProgress(state, runtimeRef.current.player.clockTime);
    hinge.rotation.y = -progress * Math.PI * 0.49;
  });

  return (
    <group
      position={[building.x, 0, building.z]}
      rotation={[0, building.rotationY, 0]}
      name={`war-room-camera-occluder:${stateKey}-entrance-door`}
      userData={{ warRoomCameraOccluderId: `${stateKey}-entrance-door` }}
    >
      <group ref={hingeRef} position={[-leafWidth / 2, floorY, frontZ]}>
        <group position={[leafWidth / 2, 0, 0]}>
          <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[leafWidth, 2.4, 0.12]} />
            <meshStandardMaterial color="#503629" roughness={0.82} metalness={0.04} />
          </mesh>
          <mesh position={[0, 0.19, 0.071]} castShadow>
            <boxGeometry args={[leafWidth * 0.84, 0.1, 0.035]} />
            <meshStandardMaterial color="#76523b" roughness={0.76} />
          </mesh>
          <mesh position={[0, 1.9, 0.071]} castShadow>
            <boxGeometry args={[leafWidth * 0.84, 0.1, 0.035]} />
            <meshStandardMaterial color="#76523b" roughness={0.76} />
          </mesh>
          <mesh position={[leafWidth * 0.32, 1.03, -0.078]} castShadow>
            <sphereGeometry args={[0.075, 8, 6]} />
            <meshStandardMaterial color="#d2a15d" metalness={0.7} roughness={0.28} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
