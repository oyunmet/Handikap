import { Suspense, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import type { WarRoomBlocker } from "../game/war-room-data";
import type { WarRoomRoom } from "../game/war-room-rooms";
import { WarRoomAssetBoundary, WarRoomStaticModel } from "./WarRoomModels";
import { createWorldRoadSurfaceTextures } from "./world-road-textures";
import { WAR_ROOM_PLASTER_TEXTURE } from "./war-room-procedural-textures";

const WAR_ROOM_ROAD_TEXTURES = createWorldRoadSurfaceTextures();

export const WAR_ROOM_FLOOR_MATERIAL = new THREE.MeshStandardMaterial({
  color: "#ffffff",
  map: WAR_ROOM_ROAD_TEXTURES.roadVariants[0].color,
  normalMap: WAR_ROOM_ROAD_TEXTURES.roadVariants[0].normal,
  normalScale: new THREE.Vector2(0.27, 0.27),
  roughnessMap: WAR_ROOM_ROAD_TEXTURES.roadVariants[0].roughness,
  roughness: 0.94,
  metalness: 0,
  flatShading: false,
});

export function StaticWarRoomAsset({
  src,
  position,
  targetSize,
  rotation,
  fallback,
}: {
  src: string;
  position: readonly [number, number, number];
  targetSize: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  fallback: ReactNode;
}) {
  const cameraOccluderId = `asset:${src}:${position.join(":")}`;
  return (
    <group
      name={`war-room-camera-occluder:${cameraOccluderId}`}
      userData={{ warRoomCameraOccluderId: cameraOccluderId }}
    >
      <WarRoomAssetBoundary fallback={fallback}>
        <Suspense fallback={fallback}>
          <WarRoomStaticModel src={src} position={position} targetSize={targetSize} rotation={rotation} />
        </Suspense>
      </WarRoomAssetBoundary>
    </group>
  );
}

function BlockerFallback({ blocker }: { blocker: WarRoomBlocker }) {
  return (
    <group>
      <mesh
        position={[blocker.x, (blocker.baseY ?? 0) + blocker.height / 2, blocker.z]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[blocker.width, blocker.height, blocker.depth]} />
        <meshStandardMaterial color={blocker.color} roughness={blocker.kind === "cover" ? 0.9 : 0.78} />
      </mesh>
      {blocker.kind === "tower" && (
        <>
          <mesh position={[blocker.x, blocker.height + 0.5, blocker.z]} castShadow>
            <boxGeometry args={[blocker.width + 0.5, 1, blocker.depth + 0.5]} />
            <meshStandardMaterial color="#88715b" roughness={0.82} />
          </mesh>
          <mesh position={[blocker.x, blocker.height + 1.15, blocker.z]} castShadow>
            <coneGeometry args={[blocker.width * 0.52, 1.7, 4]} />
            <meshStandardMaterial color="#59443d" roughness={0.88} />
          </mesh>
        </>
      )}
    </group>
  );
}

function WarRoomHouse({ blocker }: { blocker: WarRoomBlocker }) {
  const wallHeight = Math.min(blocker.height * 0.62, 6.1);
  const front = -blocker.depth / 2 - 0.08;
  const roofAngle = 0.38;
  const windowMaterial = (
    <meshStandardMaterial
      color="#26303a"
      emissive="#b8753d"
      emissiveIntensity={0.16}
      roughness={0.46}
      metalness={0.08}
    />
  );

  return (
    <group
      position={[blocker.x, 0, blocker.z]}
      rotation={[0, blocker.id === "east-tower" ? Math.PI : 0, 0]}
      userData={{ warRoomCameraOccluderId: blocker.id }}
    >
      <mesh position={[0, wallHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[blocker.width, wallHeight, blocker.depth]} />
        <meshStandardMaterial color="#817568" map={WAR_ROOM_PLASTER_TEXTURE} roughness={0.92} />
      </mesh>
      <mesh position={[0, 2.8, front]} castShadow receiveShadow>
        <boxGeometry args={[blocker.width * 0.83, 5.6, 0.09]} />
        <meshStandardMaterial color="#594b43" roughness={0.86} />
      </mesh>
      <mesh position={[0, wallHeight * 0.48, front - 0.08]} castShadow>
        <boxGeometry args={[0.92, 2.1, 0.12]} />
        <meshStandardMaterial color="#332923" roughness={0.84} />
      </mesh>
      <mesh position={[0.28, wallHeight * 0.48, front - 0.15]}>
        <sphereGeometry args={[0.045, 6, 5]} />
        <meshStandardMaterial color="#d7a454" metalness={0.56} roughness={0.32} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={`house-window-${side}`}>
          <mesh position={[side * blocker.width * 0.25, wallHeight * 0.43, front - 0.1]}>
            <boxGeometry args={[1.12, 0.88, 0.08]} />
            {windowMaterial}
          </mesh>
          <mesh position={[side * blocker.width * 0.25, wallHeight * 0.76, front - 0.1]}>
            <boxGeometry args={[1.02, 0.74, 0.08]} />
            {windowMaterial}
          </mesh>
        </group>
      ))}
      {[-1, 1].map((side) => (
        <mesh
          key={`house-timber-${side}`}
          position={[side * (blocker.width * 0.43), wallHeight / 2, front - 0.12]}
          castShadow
        >
          <boxGeometry args={[0.16, wallHeight, 0.16]} />
          <meshStandardMaterial color="#44352d" roughness={0.84} />
        </mesh>
      ))}
      <mesh position={[0, wallHeight + 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[blocker.width + 0.48, 0.3, blocker.depth + 0.48]} />
        <meshStandardMaterial color="#53443b" roughness={0.9} />
      </mesh>
      <mesh
        position={[0, wallHeight + 0.38, -blocker.depth * 0.22]}
        rotation={[-roofAngle, 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[blocker.width + 0.56, 0.2, blocker.depth * 0.58]} />
        <meshStandardMaterial color="#493833" roughness={0.9} />
      </mesh>
      <mesh
        position={[0, wallHeight + 0.38, blocker.depth * 0.22]}
        rotation={[roofAngle, 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[blocker.width + 0.56, 0.2, blocker.depth * 0.58]} />
        <meshStandardMaterial color="#493833" roughness={0.9} />
      </mesh>
    </group>
  );
}

function WarRoomHideoutCrate({ blocker }: { blocker: WarRoomBlocker }) {
  const { width, height, depth } = blocker;
  return (
    <group
      position={[blocker.x, 0, blocker.z]}
      userData={{ warRoomCameraOccluderId: blocker.id }}
    >
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color="#76543b" roughness={0.92} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, height * 0.28, side * (depth / 2 + 0.015)]} castShadow>
          <boxGeometry args={[width * 0.86, 0.1, 0.04]} />
          <meshStandardMaterial color="#a27a50" roughness={0.88} />
        </mesh>
      ))}
      <mesh position={[0, height * 0.72, depth / 2 + 0.016]} castShadow>
        <boxGeometry args={[width * 0.9, 0.1, 0.04]} />
        <meshStandardMaterial color="#a27a50" roughness={0.88} />
      </mesh>
    </group>
  );
}

export function WarRoomBlockerVisual({ blocker }: { blocker: WarRoomBlocker }) {
  const fallback = <BlockerFallback blocker={blocker} />;
  if (blocker.kind === "wall") {
    return (
      <StaticWarRoomAsset
        src="/models/war-room/wall.glb"
        position={[blocker.x, blocker.baseY ?? 0, blocker.z]}
        targetSize={[blocker.width, blocker.height, blocker.depth]}
        fallback={fallback}
      />
    );
  }
  if (blocker.kind === "cover") {
    if (blocker.id.startsWith("hideout-crate-")) {
      return <WarRoomHideoutCrate blocker={blocker} />;
    }
    return (
      <StaticWarRoomAsset
        src="/models/war-room/rocks-large.glb"
        position={[blocker.x, 0, blocker.z]}
        targetSize={[blocker.width, blocker.height, blocker.depth]}
        fallback={fallback}
      />
    );
  }
  if (blocker.kind === "tower") {
    return <WarRoomHouse blocker={blocker} />;
  }
  if (blocker.kind === "platform") {
    return (
      <mesh
        position={[blocker.x, (blocker.baseY ?? 0) + blocker.height / 2, blocker.z]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[blocker.width, blocker.height, blocker.depth]} />
        <meshStandardMaterial color={blocker.color} roughness={0.92} />
      </mesh>
    );
  }
  return fallback;
}

export function WarRoomGateway({
  id,
  position,
  rotationY,
}: {
  id: string;
  position: readonly [number, number];
  rotationY: number;
}) {
  const pierPositions = [-2.72, 2.72] as const;
  return (
    <group
      position={[position[0], 0, position[1]]}
      rotation={[0, rotationY, 0]}
      name={`war-room-camera-occluder:gateway:${id}`}
      userData={{ warRoomCameraOccluderId: `gateway:${id}` }}
    >
      {pierPositions.map((x) => (
        <StaticWarRoomAsset
          key={`pier-${x}`}
          src="/models/war-room/wall.glb"
          position={[x, 0, 0]}
          targetSize={[0.8, 3.05, 1.05]}
          fallback={
            <mesh position={[x, 1.52, 0]} castShadow>
              <boxGeometry args={[0.8, 3.05, 1.05]} />
              <meshStandardMaterial color="#70564b" roughness={0.86} />
            </mesh>
          }
        />
      ))}
      <StaticWarRoomAsset
        src="/models/war-room/tower-square-top.glb"
        position={[0, 3.05, 0]}
        targetSize={[6.25, 0.72, 1.25]}
        fallback={
          <mesh position={[0, 3.05, 0]} castShadow>
            <boxGeometry args={[6.25, 0.72, 1.25]} />
            <meshStandardMaterial color="#88715b" roughness={0.82} />
          </mesh>
        }
      />
      <StaticWarRoomAsset
        src="/models/war-room/tower-square-roof.glb"
        position={[0, 3.45, 0]}
        targetSize={[6.55, 0.55, 1.45]}
        fallback={
          <mesh position={[0, 3.48, 0]} castShadow>
            <boxGeometry args={[6.55, 0.55, 1.45]} />
            <meshStandardMaterial color="#59443d" roughness={0.88} />
          </mesh>
        }
      />
    </group>
  );
}

export function WarRoomTree({ position }: { position: readonly [number, number, number] }) {
  const cameraOccluderId = `tree:${position[0]}:${position[2]}`;
  return (
    <group
      position={position}
      scale={0.9}
      name={`war-room-camera-occluder:${cameraOccluderId}`}
      userData={{ warRoomCameraOccluderId: cameraOccluderId }}
    >
      <mesh position={[0, 0.95, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.12, 0.2, 1.9, 6]} />
        <meshStandardMaterial color="#46372c" roughness={0.96} />
      </mesh>
      {[0, 1, 2].map((tier) => (
        <mesh key={tier} position={[0, 1.45 + tier * 0.83, 0]} castShadow receiveShadow>
          <coneGeometry args={[1.05 - tier * 0.18, 1.65, 7]} />
          <meshStandardMaterial
            color={tier === 0 ? "#48523d" : tier === 1 ? "#596448" : "#697252"}
            roughness={0.94}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}

export function FloorPaving({ palette }: { palette: WarRoomRoom["theme"]["tiles"] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.PlaneGeometry(7.92, 7.92), []);
  const tiles = useMemo(() => {
    const result: Array<{ x: number; z: number; color: string }> = [];
    for (let row = 0; row < 9; row += 1) {
      for (let column = 0; column < 9; column += 1) {
        result.push({
          x: -32 + column * 8,
          z: -32 + row * 8,
          color: palette[(row * 3 + column * 2) % palette.length],
        });
      }
    }
    return result;
  }, [palette]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const transform = new THREE.Object3D();
    tiles.forEach((tile, index) => {
      transform.position.set(tile.x, -0.11, tile.z);
      transform.rotation.set(-Math.PI / 2, 0, 0);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
      mesh.setColorAt(index, new THREE.Color(tile.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [tiles]);

  return <instancedMesh ref={meshRef} args={[geometry, WAR_ROOM_FLOOR_MATERIAL, tiles.length]} receiveShadow />;
}
