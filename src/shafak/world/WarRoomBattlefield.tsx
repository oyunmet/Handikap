import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import type { WarRoomRoom } from "../game/war-room-rooms";
import type { WarRoomRuntime } from "../game/war-room-engine";
import { WarRoomBuildingShell, WarRoomStaircase } from "./WarRoomArchitecture";
import { WarRoomHouseInterior } from "./WarRoomInteriors";
import WarRoomDoor from "./WarRoomDoor";
import {
  FloorPaving,
  StaticWarRoomAsset,
  WAR_ROOM_FLOOR_MATERIAL,
  WarRoomBlockerVisual,
  WarRoomGateway,
  WarRoomTree,
} from "./WarRoomEnvironment";

function WarRoomLootChestField({ runtime }: { runtime: WarRoomRuntime }) {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const lidRef = useRef<THREE.InstancedMesh>(null);
  const latchRef = useRef<THREE.InstancedMesh>(null);
  const transform = useMemo(() => new THREE.Object3D(), []);
  const scratchColor = useMemo(() => new THREE.Color(), []);
  const previousOpenedRef = useRef<boolean[]>([]);
  const bodyGeometry = useMemo(() => new THREE.BoxGeometry(0.82, 0.36, 0.58), []);
  const lidGeometry = useMemo(() => new THREE.BoxGeometry(0.84, 0.11, 0.6), []);
  const latchGeometry = useMemo(() => new THREE.BoxGeometry(0.11, 0.14, 0.07), []);
  const bodyMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9 }),
    [],
  );
  const lidMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.84 }),
    [],
  );
  const latchMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#d2a35a", metalness: 0.62, roughness: 0.32 }),
    [],
  );

  useLayoutEffect(() => {
    const body = bodyRef.current;
    const lid = lidRef.current;
    const latch = latchRef.current;
    if (!body || !lid || !latch) return;

    runtime.lootChests.forEach((chest, index) => {
      const bodyColor = chest.kind === "weapon" ? "#76553a" : "#674a34";
      const lidColor = chest.kind === "weapon" ? "#a47a48" : "#8a6643";
      body.setColorAt(index, scratchColor.set(bodyColor));
      lid.setColorAt(index, scratchColor.set(lidColor));

      transform.position.set(chest.x, chest.floorHeight + 0.2, chest.z);
      transform.rotation.set(0, 0, 0);
      transform.updateMatrix();
      body.setMatrixAt(index, transform.matrix);

      transform.position.set(chest.x, chest.floorHeight + 0.435, chest.z);
      transform.rotation.set(chest.opened ? -0.82 : 0, 0, 0);
      transform.updateMatrix();
      lid.setMatrixAt(index, transform.matrix);

      transform.position.set(chest.x, chest.floorHeight + 0.24, chest.z - 0.3);
      transform.rotation.set(0, 0, 0);
      transform.scale.setScalar(chest.opened ? 0 : 1);
      transform.updateMatrix();
      latch.setMatrixAt(index, transform.matrix);
      transform.scale.setScalar(1);
      previousOpenedRef.current[index] = chest.opened;
    });
    body.instanceMatrix.needsUpdate = true;
    lid.instanceMatrix.needsUpdate = true;
    latch.instanceMatrix.needsUpdate = true;
    if (body.instanceColor) body.instanceColor.needsUpdate = true;
    if (lid.instanceColor) lid.instanceColor.needsUpdate = true;
  }, [runtime, scratchColor, transform]);

  useFrame(() => {
    const lid = lidRef.current;
    const latch = latchRef.current;
    if (!lid || !latch) return;
    let lidChanged = false;
    let latchChanged = false;
    runtime.lootChests.forEach((chest, index) => {
      if (previousOpenedRef.current[index] === chest.opened) return;
      transform.position.set(chest.x, chest.floorHeight + 0.435, chest.z);
      transform.rotation.set(chest.opened ? -0.82 : 0, 0, 0);
      transform.updateMatrix();
      lid.setMatrixAt(index, transform.matrix);
      lidChanged = true;

      transform.position.set(chest.x, chest.floorHeight + 0.24, chest.z - 0.3);
      transform.rotation.set(0, 0, 0);
      transform.scale.setScalar(chest.opened ? 0 : 1);
      transform.updateMatrix();
      latch.setMatrixAt(index, transform.matrix);
      transform.scale.setScalar(1);
      latchChanged = true;
      previousOpenedRef.current[index] = chest.opened;
    });
    if (lidChanged) lid.instanceMatrix.needsUpdate = true;
    if (latchChanged) latch.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh
        ref={bodyRef}
        args={[bodyGeometry, bodyMaterial, runtime.lootChests.length]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={lidRef}
        args={[lidGeometry, lidMaterial, runtime.lootChests.length]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={latchRef}
        args={[latchGeometry, latchMaterial, runtime.lootChests.length]}
        castShadow
      />
    </>
  );
}

function WallDetails({ blockers }: { blockers: readonly WarRoomRoom["blockers"][number][] }) {
  const openingsRef = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#392e28", roughness: 0.93, metalness: 0 }),
    [],
  );
  const openings = useMemo(() => blockers.flatMap((blocker) => {
    if (blocker.kind !== "wall" || blocker.height < 3) return [];
    const alongX = blocker.width >= blocker.depth;
    const length = alongX ? blocker.width : blocker.depth;
    const count = Math.min(14, Math.max(2, Math.floor(length / 5)));
    return Array.from({ length: count }, (_, index) => {
      const positionAlong = -length / 2 + ((index + 1) / (count + 1)) * length;
      const centerY = (blocker.baseY ?? 0) + Math.min(blocker.height * 0.55, 2.55);
      return [-1, 1].map((face) => ({
        x: blocker.x + (alongX ? positionAlong : face * (blocker.width / 2 + 0.035)),
        y: centerY,
        z: blocker.z + (alongX ? face * (blocker.depth / 2 + 0.035) : positionAlong),
        rotationY: alongX ? 0 : Math.PI / 2,
      }));
    }).flat();
  }), [blockers]);

  useLayoutEffect(() => {
    const mesh = openingsRef.current;
    if (!mesh) return;
    const transform = new THREE.Object3D();
    openings.forEach((opening, index) => {
      transform.position.set(opening.x, opening.y, opening.z);
      transform.rotation.set(0, opening.rotationY, 0);
      transform.scale.set(0.58, 1.22, 0.075);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [openings]);

  return (
    <instancedMesh ref={openingsRef} args={[geometry, material, openings.length]} castShadow />
  );
}

function rotateWarRoomScenePoint(x: number, z: number, quarterTurns: number) {
  switch (quarterTurns % 4) {
    case 1: return { x: z, z: -x };
    case 2: return { x: -x, z: -z };
    case 3: return { x: -z, z: x };
    default: return { x, z };
  }
}

export default function WarRoomBattlefield({
  runtime,
  runtimeRef,
}: {
  runtime: WarRoomRuntime;
  runtimeRef: MutableRefObject<WarRoomRuntime>;
}) {
  const { room } = runtime;
  const { theme } = room;
  const quarterRotation = room.quarterTurns * Math.PI / 2;
  const visualBlockers = room.blockers.filter((blocker) => (
    !room.buildings.some((building) => blocker.id.startsWith(`${building.id}-`))
    || blocker.id.includes("partition")
  ));
  useLayoutEffect(() => {
    WAR_ROOM_FLOOR_MATERIAL.color.set(theme.floorTint);
  }, [theme.floorTint]);

  return (
    <>
      <color attach="background" args={[theme.sky]} />
      <fog attach="fog" args={[theme.fog, theme.fogNear, theme.fogFar]} />
      <hemisphereLight args={[theme.skyLight, theme.groundLight, 2.2]} />
      <ambientLight color={theme.ambient} intensity={1.4} />
      <directionalLight
        position={[-8, 14, 8]}
        color={theme.keyLight}
        intensity={2.4}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-38}
        shadow-camera-right={38}
        shadow-camera-top={38}
        shadow-camera-bottom={-38}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[9, 8, -7]} color={theme.fillLight} intensity={0.72} />
      <pointLight position={[-26, 3, -21]} color={theme.emberLight} intensity={8} distance={15} />
      <pointLight position={[27, 3, 18]} color={theme.emberLight} intensity={6} distance={13} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]} receiveShadow>
        <planeGeometry args={[72, 72, 1, 1]} />
        <primitive object={WAR_ROOM_FLOOR_MATERIAL} attach="material" />
      </mesh>
      <FloorPaving palette={theme.tiles} />
      {visualBlockers.map((blocker) => (
        <WarRoomBlockerVisual key={blocker.id} blocker={blocker} />
      ))}
      <WallDetails blockers={visualBlockers} />
      {room.buildings.map((building) => (
        <group key={building.id}>
          <WarRoomBuildingShell building={building} />
          <WarRoomStaircase building={building} />
          <WarRoomHouseInterior building={building} />
          <WarRoomDoor building={building} runtimeRef={runtimeRef} />
          <WarRoomDoor building={building} runtimeRef={runtimeRef} floor={1} />
        </group>
      ))}
      <WarRoomLootChestField runtime={runtime} />
      {[4.8, 21.2].map((z, index) => {
        const point = rotateWarRoomScenePoint(0, z, room.quarterTurns);
        return (
          <WarRoomGateway
            key={`gateway-${index}`}
            id={`room-${room.number}-${index}`}
            position={[point.x, point.z]}
            rotationY={quarterRotation}
          />
        );
      })}
      {[
        [-30, 0, -5],
        [31, 0, -10],
        [-30, 0, 22],
        [31, 0, -27],
      ].map((position, index) => (
        (() => {
          const point = rotateWarRoomScenePoint(position[0], position[2], room.quarterTurns);
          return (
            <WarRoomTree
              key={`tree-fallback-${index}`}
              position={[point.x, position[1], point.z]}
            />
          );
        })()
      ))}
      {[
        [-32, 0, -32],
        [32, 0, -32],
        [-32, 0, 32],
        [32, 0, 32],
      ].map((position, index) => {
        const point = rotateWarRoomScenePoint(position[0], position[2], room.quarterTurns);
        const transformedPosition: [number, number, number] = [point.x, position[1], point.z];
        return (
          <StaticWarRoomAsset
            key={`war-room-flag-${index}`}
            src="/models/war-room/flag-pennant.glb"
            position={transformedPosition}
            rotation={[0, quarterRotation, 0]}
            targetSize={[0.85, 3.8, 0.85]}
            fallback={
              <group position={transformedPosition} rotation={[0, quarterRotation, 0]}>
                <mesh position={[0, 1.9, 0]} castShadow>
                  <cylinderGeometry args={[0.055, 0.075, 3.8, 6]} />
                  <meshStandardMaterial color="#47352d" />
                </mesh>
              </group>
            }
          />
        );
      })}
      {[
        { position: [-19, 0, 16] as [number, number, number], rotation: [0, Math.PI / 4, 0] as [number, number, number] },
        { position: [19, 0, -16] as [number, number, number], rotation: [0, -Math.PI / 3, 0] as [number, number, number] },
      ].map((siege, index) => {
        const point = rotateWarRoomScenePoint(
          siege.position[0],
          siege.position[2],
          room.quarterTurns,
        );
        const position: [number, number, number] = [point.x, siege.position[1], point.z];
        const rotation: [number, number, number] = [
          siege.rotation[0],
          siege.rotation[1] + quarterRotation,
          siege.rotation[2],
        ];
        return (
          <StaticWarRoomAsset
            key={`war-room-ballista-${index}`}
            src="/models/war-room/siege-ballista.glb"
            position={position}
            rotation={rotation}
            targetSize={[2.8, 1.65, 2.1]}
            fallback={
              <group position={position} rotation={rotation}>
                <mesh position={[0, 0.7, 0]} castShadow>
                  <boxGeometry args={[0.35, 1.3, 1.4]} />
                  <meshStandardMaterial color="#664b35" />
                </mesh>
              </group>
            }
          />
        );
      })}
      {Array.from({ length: 8 }, (_, index) => {
        const angle = index * Math.PI / 4;
        const x = Math.cos(angle) * 32;
        const z = Math.sin(angle) * 32;
        return (
          <group key={`torch-${index}`} position={[x, 3.2, z]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.13, 0.19, 1.1, 7]} />
              <meshStandardMaterial color="#4a3329" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.66, 0]}>
              <coneGeometry args={[0.22, 0.58, 6]} />
              <meshBasicMaterial color="#ffad58" toneMapped={false} />
            </mesh>
            <pointLight position={[0, 0.72, 0]} color="#ff8c42" intensity={3} distance={7} />
          </group>
        );
      })}
    </>
  );
}
