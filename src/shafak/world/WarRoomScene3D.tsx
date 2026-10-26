import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useMemo, useRef, type MutableRefObject } from "react";
import type { ReactNode } from "react";
import * as THREE from "three";
import {
  WAR_ROOM_BLOCKERS,
  WAR_ROOM_CHARACTER_HEIGHT,
  WAR_ROOM_COMMANDER_SCALE,
  WAR_ROOM_WEAPON_BY_ID,
  WAR_ROOM_WEAPON_MOUNTS,
  type WarRoomBlocker,
  type WarRoomWeaponMount,
  type WarRoomWeaponId,
} from "../game/war-room-data";
import { traceWarRoomRay } from "../game/war-room-aim";
import { createWorldRoadSurfaceTextures } from "./world-road-textures";
import {
  applyWarRoomDamage,
  getNearestWarRoomCover,
  getWarRoomRemaining,
  moveWarRoomEntity,
  nextWarRoomRandom,
  segmentBlockFraction,
  shortestAngleDelta,
  type WarRoomEnemy,
  type WarRoomHudSnapshot,
  type WarRoomInputState,
  type WarRoomRuntime,
} from "../game/war-room-engine";
import { playWarRoomSound, type WarRoomShotStyle } from "../game/war-room-audio";
import {
  WarRoomAnimatedActor,
  WarRoomAssetBoundary,
  WarRoomStaticModel,
  type WarRoomAnimationState,
} from "./WarRoomModels";

type Props = {
  runtimeRef: MutableRefObject<WarRoomRuntime>;
  inputRef: MutableRefObject<WarRoomInputState>;
  weaponIds: readonly [WarRoomWeaponId, WarRoomWeaponId];
  weaponMountOverrides?: Partial<Record<WarRoomWeaponId, WarRoomWeaponMount>>;
  onHudUpdate: (snapshot: WarRoomHudSnapshot) => void;
  onFinish: (result: "victory" | "defeat", snapshot: WarRoomHudSnapshot) => void;
};

const WAR_ROOM_ROAD_TEXTURES = createWorldRoadSurfaceTextures();
const WAR_ROOM_FLOOR_MATERIAL = new THREE.MeshStandardMaterial({
  color: "#ffffff",
  map: WAR_ROOM_ROAD_TEXTURES.roadVariants[0].color,
  normalMap: WAR_ROOM_ROAD_TEXTURES.roadVariants[0].normal,
  normalScale: new THREE.Vector2(0.27, 0.27),
  roughnessMap: WAR_ROOM_ROAD_TEXTURES.roadVariants[0].roughness,
  roughness: 0.94,
  metalness: 0,
  flatShading: false,
});
const WAR_ROOM_EFFECT_POOL_SIZE = 72;
const WAR_ROOM_TRACER_POOL_SIZE = 24;
const WAR_ROOM_PROJECTILE_POOL_SIZE = 12;
const WAR_ROOM_DECAL_POOL_SIZE = 30;

type WarRoomParticle = {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  born: number; lifetime: number; size: number;
  bounce: boolean;
};

type WarRoomProjectile = {
  start: THREE.Vector3;
  end: THREE.Vector3;
  born: number;
  lifetime: number;
  color: string;
};

function shortestLerp(from: number, to: number, speed: number, delta: number) {
  return from + shortestAngleDelta(from, to) * (1 - Math.exp(-speed * Math.min(delta, 0.05)));
}

function boxSegment(start: THREE.Vector3, end: THREE.Vector3) {
  return segmentBlockFraction(
    { x: start.x, y: start.y, z: start.z },
    { x: end.x, y: end.y, z: end.z },
  );
}

function StaticWarRoomAsset({
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
  return (
    <WarRoomAssetBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <WarRoomStaticModel src={src} position={position} targetSize={targetSize} rotation={rotation} />
      </Suspense>
    </WarRoomAssetBoundary>
  );
}

function BlockerFallback({ blocker }: { blocker: WarRoomBlocker }) {
  return (
    <group>
      <mesh position={[blocker.x, blocker.height / 2, blocker.z]} castShadow receiveShadow>
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

function WarRoomBlockerVisual({ blocker }: { blocker: WarRoomBlocker }) {
  const fallback = <BlockerFallback blocker={blocker} />;
  if (blocker.kind === "wall") {
    return (
      <StaticWarRoomAsset
        src="/models/war-room/wall.glb"
        position={[blocker.x, 0, blocker.z]}
        targetSize={[blocker.width, blocker.height, blocker.depth]}
        fallback={fallback}
      />
    );
  }
  if (blocker.kind === "cover") {
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
    return (
      <>
        <StaticWarRoomAsset
          src="/models/war-room/tower-square.glb"
          position={[blocker.x, 0, blocker.z]}
          targetSize={[blocker.width, blocker.height, blocker.depth]}
          fallback={fallback}
        />
        <StaticWarRoomAsset
          src="/models/war-room/tower-square-top.glb"
          position={[blocker.x, blocker.height - 0.15, blocker.z]}
          targetSize={[blocker.width, 0.55, blocker.depth]}
          fallback={
            <mesh position={[blocker.x, blocker.height - 0.15, blocker.z]} castShadow>
              <boxGeometry args={[blocker.width, 0.55, blocker.depth]} />
              <meshStandardMaterial color="#88715b" roughness={0.82} />
            </mesh>
          }
        />
        <StaticWarRoomAsset
          src="/models/war-room/tower-square-roof.glb"
          position={[blocker.x, blocker.height + 0.4, blocker.z]}
          targetSize={[blocker.width * 1.18, 1.3, blocker.depth * 1.18]}
          fallback={
            <mesh position={[blocker.x, blocker.height + 1.05, blocker.z]} castShadow>
              <coneGeometry args={[blocker.width * 0.72, 1.3, 4]} />
              <meshStandardMaterial color="#59443d" roughness={0.88} />
            </mesh>
          }
        />
      </>
    );
  }
  if (blocker.kind === "platform") {
    return (
      <StaticWarRoomAsset
        src="/models/war-room/wall.glb"
        position={[blocker.x, 0, blocker.z]}
        targetSize={[blocker.width, blocker.height, blocker.depth]}
        fallback={fallback}
      />
    );
  }
  return fallback;
}

function WarRoomGateway({ z }: { z: number }) {
  const pierPositions = [-2.72, 2.72] as const;
  return (
    <group name={`war-room-gateway:${z}`}>
      {pierPositions.map((x) => (
        <StaticWarRoomAsset
          key={`pier-${x}`}
          src="/models/war-room/wall.glb"
          position={[x, 0, z]}
          targetSize={[0.8, 3.05, 1.05]}
          fallback={
            <mesh position={[x, 1.52, z]} castShadow>
              <boxGeometry args={[0.8, 3.05, 1.05]} />
              <meshStandardMaterial color="#70564b" roughness={0.86} />
            </mesh>
          }
        />
      ))}
      <StaticWarRoomAsset
        src="/models/war-room/tower-square-top.glb"
        position={[0, 3.05, z]}
        targetSize={[6.25, 0.72, 1.25]}
        fallback={
          <mesh position={[0, 3.05, z]} castShadow>
            <boxGeometry args={[6.25, 0.72, 1.25]} />
            <meshStandardMaterial color="#88715b" roughness={0.82} />
          </mesh>
        }
      />
      <StaticWarRoomAsset
        src="/models/war-room/tower-square-roof.glb"
        position={[0, 3.45, z]}
        targetSize={[6.55, 0.55, 1.45]}
        fallback={
          <mesh position={[0, 3.48, z]} castShadow>
            <boxGeometry args={[6.55, 0.55, 1.45]} />
            <meshStandardMaterial color="#59443d" roughness={0.88} />
          </mesh>
        }
      />
    </group>
  );
}

function WarRoomTree({ position }: { position: readonly [number, number, number] }) {
  return (
    <group position={position} scale={0.9} name="war-room-procedural-tree-fallback">
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

function FloorPaving() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.PlaneGeometry(7.92, 7.92), []);
  const tiles = useMemo(() => {
    const result: Array<{ x: number; z: number; color: string }> = [];
    const palette = ["#7e6b58", "#796550", "#836f5b", "#75624f", "#81705d"];
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
  }, []);

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

function WallDetails() {
  const openingsRef = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#392e28", roughness: 0.93, metalness: 0 }),
    [],
  );
  const openings = useMemo(() => WAR_ROOM_BLOCKERS.flatMap((blocker) => {
    if (blocker.kind !== "wall" || blocker.height < 3) return [];
    const alongX = blocker.width >= blocker.depth;
    const length = alongX ? blocker.width : blocker.depth;
    const count = Math.min(14, Math.max(2, Math.floor(length / 5)));
    return Array.from({ length: count }, (_, index) => {
      const positionAlong = -length / 2 + ((index + 1) / (count + 1)) * length;
      const centerY = Math.min(blocker.height * 0.55, 2.55);
      return [-1, 1].map((face) => ({
        x: blocker.x + (alongX ? positionAlong : face * (blocker.width / 2 + 0.035)),
        y: centerY,
        z: blocker.z + (alongX ? face * (blocker.depth / 2 + 0.035) : positionAlong),
        rotationY: alongX ? 0 : Math.PI / 2,
      }));
    }).flat();
  }), []);

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

function Battlefield() {
  return (
    <>
      <color attach="background" args={["#eaa989"]} />
      <fog attach="fog" args={["#c6c4c1", 26, 72]} />
      <hemisphereLight args={["#ffe2c3", "#30252f", 2.2]} />
      <ambientLight color="#ffdbb3" intensity={1.4} />
      <directionalLight
        position={[-8, 14, 8]}
        color="#ffd09a"
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
      <directionalLight position={[9, 8, -7]} color="#91cde0" intensity={0.72} />
      <pointLight position={[-26, 3, -21]} color="#ff8a48" intensity={8} distance={15} />
      <pointLight position={[27, 3, 18]} color="#ff9b4f" intensity={6} distance={13} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]} receiveShadow>
        <planeGeometry args={[72, 72, 1, 1]} />
        <primitive object={WAR_ROOM_FLOOR_MATERIAL} attach="material" />
      </mesh>
      <FloorPaving />
      {WAR_ROOM_BLOCKERS.map((blocker) => (
        <WarRoomBlockerVisual key={blocker.id} blocker={blocker} />
      ))}
      {[4.8, 21.2].map((z) => <WarRoomGateway key={`gateway-${z}`} z={z} />)}
      {[
        [-30, 0, -5],
        [31, 0, -10],
        [-30, 0, 22],
        [31, 0, -27],
      ].map((position, index) => (
        <WarRoomTree
          key={`tree-fallback-${index}`}
          position={position as [number, number, number]}
        />
      ))}
      {[
        [-32, 0, -32],
        [32, 0, -32],
        [-32, 0, 32],
        [32, 0, 32],
      ].map((position, index) => (
        <StaticWarRoomAsset
          key={`war-room-flag-${index}`}
          src="/models/war-room/flag-pennant.glb"
          position={position as [number, number, number]}
          targetSize={[0.85, 3.8, 0.85]}
          fallback={
            <group position={[position[0], 0, position[2]]}>
              <mesh position={[0, 1.9, 0]} castShadow>
                <cylinderGeometry args={[0.055, 0.075, 3.8, 6]} />
                <meshStandardMaterial color="#47352d" />
              </mesh>
            </group>
          }
        />
      ))}
      {[
        { position: [-19, 0, 16] as [number, number, number], rotation: [0, Math.PI / 4, 0] as [number, number, number] },
        { position: [19, 0, -16] as [number, number, number], rotation: [0, -Math.PI / 3, 0] as [number, number, number] },
      ].map((siege, index) => (
        <StaticWarRoomAsset
          key={`war-room-ballista-${index}`}
          src="/models/war-room/siege-ballista.glb"
          position={siege.position}
          rotation={siege.rotation}
          targetSize={[2.8, 1.65, 2.1]}
          fallback={
            <group position={siege.position} rotation={siege.rotation}>
              <mesh position={[0, 0.7, 0]} castShadow>
                <boxGeometry args={[0.35, 1.3, 1.4]} />
                <meshStandardMaterial color="#664b35" />
              </mesh>
            </group>
          }
        />
      ))}
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

function WeaponModel({
  weaponId,
  mount,
  muzzleAnchorRef,
  muzzleFlashRef,
}: {
  weaponId: WarRoomWeaponId;
  mount: WarRoomWeaponMount;
  muzzleAnchorRef?: MutableRefObject<THREE.Group | null>;
  muzzleFlashRef?: MutableRefObject<THREE.Group | null>;
}) {
  const weapon = WAR_ROOM_WEAPON_BY_ID.get(weaponId)!;
  const crossbow = weaponId === "crossbow";
  const bow = weaponId === "longbow";
  const sidearm = weaponId === "sidearm" || weapon.weaponClass === "pistol";
  const shotgun = weaponId === "scattergun" || weapon.weaponClass === "shotgun";
  const muzzle = mount.muzzle ?? [0, 0.02, -(weapon.normalizeLength ?? weapon.modelSize?.[2] ?? 0.6) / 2] as const;
  const barrelLength = Math.max(0.08, Math.abs(muzzle[2] + 0.25));
  const bodyWidth = crossbow ? 0.72 : bow ? 0.15 : sidearm ? 0.25 : 0.3;
  const proceduralFallback = (
    <group>
      {bow ? (
        <>
          <mesh position={[0, 0.02, -0.3]} rotation={[0.06, 0, 0]} castShadow>
            <torusGeometry args={[0.38, 0.045, 7, 16, Math.PI]} />
            <meshStandardMaterial color="#9a653b" roughness={0.75} />
          </mesh>
          <mesh position={[0, 0.02, -0.3]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.76, 5]} />
            <meshStandardMaterial color="#e7d2a6" roughness={0.45} />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[0, 0, -0.23]} castShadow>
            <boxGeometry args={[bodyWidth, 0.18, sidearm ? 0.36 : 0.6]} />
            <meshStandardMaterial color={crossbow ? "#8b6844" : "#806449"} roughness={0.62} metalness={0.24} />
          </mesh>
          <mesh position={[0, 0.098, -0.24]} castShadow>
            <boxGeometry args={[Math.max(0.1, bodyWidth * 0.66), 0.025, sidearm ? 0.2 : 0.42]} />
            <meshStandardMaterial color={weapon.color} roughness={0.4} metalness={0.44} />
          </mesh>
          {!sidearm && (
            <mesh position={[0, -0.14, -0.04]} rotation={[0.22, 0, 0]} castShadow>
              <boxGeometry args={[0.12, 0.36, 0.17]} />
              <meshStandardMaterial color="#4b3529" roughness={0.8} />
            </mesh>
          )}
          {crossbow && (
            <mesh position={[0, 0.05, -0.13]} castShadow>
              <boxGeometry args={[0.9, 0.045, 0.085]} />
              <meshStandardMaterial color="#a88558" roughness={0.68} />
            </mesh>
          )}
          {shotgun && (
            <mesh position={[0, -0.08, -0.48]} castShadow>
              <boxGeometry args={[0.2, 0.12, 0.42]} />
              <meshStandardMaterial color="#8f6540" roughness={0.8} />
            </mesh>
          )}
          <mesh position={[0, 0.03, (-0.25 + muzzle[2]) / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[sidearm ? 0.035 : 0.055, sidearm ? 0.045 : 0.075, barrelLength, 8]} />
            <meshStandardMaterial color="#64645c" metalness={0.68} roughness={0.34} />
          </mesh>
        </>
      )}
    </group>
  );
  return (
    <group name={`war-room-weapon:${weapon.id}`} position={[0, 0, 0]}>
      {weapon.modelFile ? (
        <WarRoomAssetBoundary fallback={proceduralFallback}>
          <Suspense fallback={proceduralFallback}>
            <WarRoomStaticModel
              src={`/models/weapons/${weapon.modelFile}`}
              position={[0, 0, 0]}
              targetSize={weapon.modelSize ?? [1, 1, 1]}
              uniformFitLength={weapon.normalizeLength}
              muzzleEnd={mount.muzzleEnd}
              muzzleOffsetZ={mount.muzzleOffsetZ}
              fallbackColor={weapon.color}
              muzzleAnchorRef={muzzleAnchorRef}
            />
          </Suspense>
        </WarRoomAssetBoundary>
      ) : proceduralFallback}
      <group ref={muzzleAnchorRef} name="war-room-muzzle-anchor" position={muzzle}>
        <group ref={muzzleFlashRef} name="war-room-muzzle-flash" visible={false}>
          <mesh>
            <planeGeometry args={[0.34, 0.34]} />
            <meshBasicMaterial color="#ff8b32" transparent opacity={0.92} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
          <mesh scale={[0.52, 0.52, 1]} rotation={[0, 0, Math.PI / 4]}>
            <planeGeometry args={[0.34, 0.34]} />
            <meshBasicMaterial color="#fff0a3" transparent opacity={0.96} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function ProceduralPlayerFallback() {
  return (
    <group>
      <mesh position={[0, 0.2, 0]} castShadow>
        <capsuleGeometry args={[0.28, 0.9, 3, 7]} />
        <meshStandardMaterial color="#47575a" metalness={0.42} roughness={0.55} />
      </mesh>
      <mesh position={[0, 1.46, 0]} castShadow>
        <sphereGeometry args={[0.25, 10, 8]} />
        <meshStandardMaterial color="#85715e" roughness={0.88} />
      </mesh>
      <mesh position={[0, 1.06, 0.2]} castShadow>
        <boxGeometry args={[0.38, 0.66, 0.08]} />
        <meshStandardMaterial color="#963c35" roughness={0.85} />
      </mesh>
    </group>
  );
}

function PlayerActor({
  runtimeRef,
  inputRef,
  weaponId,
  weaponMountOverrides,
  rootRef,
  muzzleRef,
  muzzleLightRef,
}: {
  runtimeRef: MutableRefObject<WarRoomRuntime>;
  inputRef: MutableRefObject<WarRoomInputState>;
  weaponId: WarRoomWeaponId;
  weaponMountOverrides?: Partial<Record<WarRoomWeaponId, WarRoomWeaponMount>>;
  rootRef: MutableRefObject<THREE.Group | null>;
  muzzleRef: MutableRefObject<THREE.Group | null>;
  muzzleLightRef: MutableRefObject<THREE.PointLight | null>;
}) {
  const recoilRef = useRef<THREE.Group>(null);
  const muzzleFlashRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const reloadMagazineRef = useRef<THREE.Mesh>(null);
  const mount = weaponMountOverrides?.[weaponId] ?? WAR_ROOM_WEAPON_MOUNTS[weaponId];
  useFrame((_, delta) => {
    const player = runtimeRef.current.player;
    const root = rootRef.current;
    if (root) {
      root.position.set(player.x, player.jumpHeight, player.z);
      root.rotation.y = shortestLerp(root.rotation.y, player.yaw, 13, delta);
      root.scale.y = player.crouched ? 0.78 : 1;
    }
    const hand = modelRef.current && [
      "Rig_RightHand", "mixamorigRightHand", "FistR", "Fist.R", "RightHand", "RightHandBone",
    ].map((name) => modelRef.current?.getObjectByName(name)).find(Boolean);
    const leftHand = modelRef.current && [
      "Rig_LeftHand", "mixamorigLeftHand", "FistL", "Fist.L", "LeftHand", "LeftHandBone",
    ].map((name) => modelRef.current?.getObjectByName(name)).find(Boolean);
    const rightArm = modelRef.current && [
      "mixamorigRightForeArm", "RightForeArm", "Rig_RightForeArm", "RightArm", "mixamorigRightArm",
    ].map((name) => modelRef.current?.getObjectByName(name)).find(Boolean);
    const torso = modelRef.current && [
      "mixamorigSpine", "Spine", "Rig_Spine", "spine",
    ].map((name) => modelRef.current?.getObjectByName(name)).find(Boolean);
    modelRef.current?.updateMatrixWorld(true);
    const mountParent = hand ?? root;
    const weaponMount = recoilRef.current;
    if (mountParent && weaponMount && weaponMount.parent !== mountParent) {
      weaponMount.parent?.remove(weaponMount);
      mountParent.add(weaponMount);
    }
    if (weaponMount) {
      const aiming = inputRef.current.aimHeld;
      const weapon = WAR_ROOM_WEAPON_BY_ID.get(weaponId)!;
      const shotAge = Math.max(0, 0.2 - (player.shotFeedbackUntil - player.clockTime));
      const recoilEnvelope = shotAge <= 0.06
        ? Math.min(1, shotAge / 0.06)
        : Math.max(0, 1 - Math.pow((shotAge - 0.06) / 0.12, 2));
      const recoilStrength = player.shotFeedbackUntil > player.clockTime
        ? Math.min(1, player.recoil / Math.max(0.02, weapon.recoil)) * recoilEnvelope
        : 0;
      const reloadProgress = player.reloadingWeapon === weaponId
        ? Math.max(0, Math.min(1, 1 - (player.reloadUntil - player.clockTime) / weapon.reloadSeconds))
        : 0;
      const reloadDrop = Math.sin(Math.PI * reloadProgress);
      const chargeProgress = weapon.charge && player.chargeStartedAt > 0
        ? Math.max(0, Math.min(1, (player.clockTime - player.chargeStartedAt) / 0.95))
        : 0;
      if (hand) {
        const handScale = hand.getWorldScale(new THREE.Vector3());
        weaponMount.position.set(
          mount.position[0] / Math.max(0.01, Math.abs(handScale.x)),
          (mount.position[1] + (aiming ? 0.055 : 0)) / Math.max(0.01, Math.abs(handScale.y)),
          (mount.position[2] - (aiming ? 0.045 : 0)) / Math.max(0.01, Math.abs(handScale.z)),
        );
        weaponMount.scale.set(
          mount.scale / Math.max(0.01, Math.abs(handScale.x)),
          mount.scale / Math.max(0.01, Math.abs(handScale.y)),
          mount.scale / Math.max(0.01, Math.abs(handScale.z)),
        );
      } else {
        weaponMount.position.set(0.7, 1.24 + (aiming ? 0.055 : 0), -0.36 - (aiming ? 0.045 : 0));
        weaponMount.scale.setScalar(1.32);
      }
      weaponMount.position.y -= reloadDrop * 0.14 + chargeProgress * 0.035;
      weaponMount.position.z += recoilStrength * 0.08 + chargeProgress * 0.1;
      weaponMount.rotation.set(...mount.rotation);
      weaponMount.rotation.x -= recoilStrength * 0.052 + reloadDrop * 0.48 + chargeProgress * 0.16;
      weaponMount.rotation.z += recoilStrength * 0.018;
      if (reloadMagazineRef.current) {
        const magazineVisible = reloadProgress > 0.2 && reloadProgress < 0.78;
        reloadMagazineRef.current.visible = magazineVisible;
        reloadMagazineRef.current.position.y = -0.2 - (magazineVisible
          ? Math.sin((reloadProgress - 0.2) / 0.58 * Math.PI) * 0.16
          : 0);
      }
      if (weaponId !== "sidearm" && leftHand?.parent) {
        weaponMount.updateMatrixWorld(true);
        const gripWorld = weaponMount.localToWorld(new THREE.Vector3(-0.08, 0, -0.52));
        const gripLocal = leftHand.parent.worldToLocal(gripWorld);
        leftHand.position.lerp(gripLocal, Math.min(1, delta * 12));
      }
      const applyBoneKick = (bone: THREE.Object3D | undefined | null, amount: number) => {
        if (!bone) return;
        const base = bone.userData.warRoomBaseRotation as [number, number, number] | undefined;
        if (!base) bone.userData.warRoomBaseRotation = [bone.rotation.x, bone.rotation.y, bone.rotation.z];
        const original = (bone.userData.warRoomBaseRotation ?? [0, 0, 0]) as [number, number, number];
        bone.rotation.set(original[0] + amount, original[1], original[2]);
      };
      applyBoneKick(rightArm, recoilStrength * 0.11 + reloadDrop * 0.14 + chargeProgress * 0.2);
      applyBoneKick(torso, -recoilStrength * 0.025);
    }
    if (muzzleFlashRef.current && muzzleFlashRef.current.userData.warRoomExpiresAt <= player.clockTime) {
      muzzleFlashRef.current.visible = false;
    }
    if (muzzleLightRef.current && muzzleLightRef.current.userData.warRoomExpiresAt <= player.clockTime) {
      muzzleLightRef.current.visible = false;
      muzzleLightRef.current.intensity = 0;
    }
  });
  const playerAnimation = () => {
    const player = runtimeRef.current.player;
    const input = inputRef.current;
    if (player.hp <= 0) return "death";
    if (player.clockTime - player.lastDamageAt < 0.2) return "hit";
    if (player.shotFeedbackUntil > player.clockTime) return "attack";
    const movement = Math.hypot(input.moveX, input.moveY);
    if (input.keys.size > 0 || movement > 0.12) {
      return player.crouched || movement < 0.72 ? "walk" : "run";
    }
    return "idle";
  };
  return (
    <group ref={rootRef} name="war-room-player">
      <WarRoomAssetBoundary fallback={<ProceduralPlayerFallback />}>
        <Suspense fallback={<ProceduralPlayerFallback />}>
          <WarRoomAnimatedActor
            src="/models/player-hero.glb"
            height={WAR_ROOM_CHARACTER_HEIGHT}
            state={playerAnimation}
            modelRef={modelRef}
          />
        </Suspense>
      </WarRoomAssetBoundary>
      <group ref={recoilRef} name="war-room-weapon-mount" position={[0.7, 1.24, -0.36]}>
        <mesh position={[0, 0, -0.04]}>
          <sphereGeometry args={[0.11, 8, 6]} />
          <meshStandardMaterial color="#94775d" roughness={0.88} />
        </mesh>
        <group position={[0, 0.03, -0.08]}>
          <WeaponModel
            weaponId={weaponId}
            mount={mount}
            muzzleAnchorRef={muzzleRef}
            muzzleFlashRef={muzzleFlashRef}
          />
          <mesh ref={reloadMagazineRef} position={[0, -0.2, -0.22]} visible={false}>
            <boxGeometry args={[0.085, 0.18, 0.1]} />
            <meshStandardMaterial color="#4a4945" roughness={0.38} metalness={0.72} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function ProceduralEnemyFallback({ commander }: { commander: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.76, 0]} castShadow>
        <capsuleGeometry args={[commander ? 0.27 : 0.24, commander ? 0.75 : 0.58, 3, 7]} />
        <meshStandardMaterial color={commander ? "#843630" : "#504847"} metalness={0.3} roughness={0.75} />
      </mesh>
      <mesh position={[0, 1.53, 0]} castShadow>
        <sphereGeometry args={[commander ? 0.24 : 0.2, 10, 8]} />
        <meshStandardMaterial color={commander ? "#9f4c3d" : "#90735d"} roughness={0.88} />
      </mesh>
      <mesh position={[0, 1.12, -0.18]} castShadow>
        <boxGeometry args={commander ? [0.42, 0.5, 0.06] : [0.32, 0.42, 0.045]} />
        <meshStandardMaterial color={commander ? "#c13d34" : "#866044"} roughness={0.86} />
      </mesh>
      <group position={[0.34, 1.0, -0.28]}>
        <mesh position={[0, 0, -0.26]} castShadow>
          <boxGeometry args={[0.2, 0.13, 0.54]} />
          <meshStandardMaterial color="#49372e" metalness={0.32} roughness={0.65} />
        </mesh>
        <mesh position={[0, 0.02, -0.6]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.038, 0.052, 0.54, 7]} />
          <meshStandardMaterial color="#343739" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

function EnemyActor({
  enemy,
  index,
  groupRefs,
  muzzleLightRef,
}: {
  enemy: WarRoomEnemy;
  index: number;
  groupRefs: MutableRefObject<Array<THREE.Group | null>>;
  muzzleLightRef: MutableRefObject<THREE.PointLight | null>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const weaponMountRef = useRef<THREE.Group>(null);
  const muzzleAnchorRef = useRef<THREE.Group>(null);
  const muzzleFlashRef = useRef<THREE.Group>(null);
  useFrame((frame, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const runtime = group.parent?.userData.runtime as WarRoomRuntime | undefined;
    const player = runtime?.player;
    const gameNow = runtime?.player.clockTime ?? frame.clock.elapsedTime;
    if (player) {
      const targetYaw = Math.atan2(player.x - enemy.x, -(player.z - enemy.z));
      group.rotation.y = shortestLerp(group.rotation.y, targetYaw, 7, delta);
    }
    group.position.set(enemy.x, 0, enemy.z);
    const hitKick = enemy.hitUntil > gameNow ? (enemy.hitUntil - gameNow) / 0.14 : 0;
    group.position.y = hitKick * 0.035;
    group.rotation.x = -hitKick * 0.035;
    const hand = modelRef.current && [
      "Rig_RightHand", "mixamorigRightHand", "FistR", "Fist.R", "RightHand", "RightHandBone",
    ].map((name) => modelRef.current?.getObjectByName(name)).find(Boolean);
    const weaponMount = weaponMountRef.current;
    if (hand && weaponMount) {
      if (weaponMount.parent !== hand) {
        weaponMount.parent?.remove(weaponMount);
        hand.add(weaponMount);
      }
      weaponMount.visible = true;
      const mount = WAR_ROOM_WEAPON_MOUNTS.powder_rifle;
      const handScale = hand.getWorldScale(new THREE.Vector3());
      weaponMount.position.set(
        mount.position[0] / Math.max(0.01, Math.abs(handScale.x)),
        mount.position[1] / Math.max(0.01, Math.abs(handScale.y)),
        mount.position[2] / Math.max(0.01, Math.abs(handScale.z)),
      );
      weaponMount.rotation.set(...WAR_ROOM_WEAPON_MOUNTS.powder_rifle.rotation);
      weaponMount.scale.set(
        mount.scale / Math.max(0.01, Math.abs(handScale.x)),
        mount.scale / Math.max(0.01, Math.abs(handScale.y)),
        mount.scale / Math.max(0.01, Math.abs(handScale.z)),
      );
    } else if (weaponMount) {
      weaponMount.visible = false;
    }
    if (muzzleFlashRef.current && Number(muzzleFlashRef.current.userData.warRoomExpiresAt ?? 0) <= gameNow) {
      muzzleFlashRef.current.visible = false;
    }
    if (muzzleLightRef.current && Number(muzzleLightRef.current.userData.warRoomExpiresAt ?? 0) <= gameNow) {
      muzzleLightRef.current.visible = false;
      muzzleLightRef.current.intensity = 0;
    }
    if (enemy.alive) {
      delete group.userData.warRoomDeathStartedAt;
      group.visible = true;
      group.scale.y = 1;
    } else {
      const deathAt = Number(group.userData.warRoomDeathStartedAt ?? gameNow);
      group.userData.warRoomDeathStartedAt = deathAt;
      const deathProgress = Math.min(1, (gameNow - deathAt) / 2);
      group.visible = deathProgress < 1;
      group.scale.y = Math.max(0.025, 1 - deathProgress);
    }
    if (modelRef.current && !modelRef.current.userData.warRoomOwnedMaterials) {
      modelRef.current.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.material = Array.isArray(object.material)
          ? object.material.map((material) => material.clone())
          : object.material.clone();
      });
      modelRef.current.userData.warRoomOwnedMaterials = true;
    }
    if (modelRef.current) {
      const hit = enemy.hitUntil > gameNow;
      const deathAt = Number(group.userData.warRoomDeathStartedAt ?? gameNow);
      const alpha = enemy.alive ? 1 : Math.max(0, 1 - (gameNow - deathAt) / 2);
      modelRef.current.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          const emissive = material as THREE.Material & { emissive?: THREE.Color; emissiveIntensity?: number };
          material.transparent = alpha < 1;
          material.opacity = alpha;
          if (emissive.emissive?.isColor) {
            emissive.emissive.set(hit ? "#ff3028" : enemy.commander ? "#7b231d" : "#51382c");
            emissive.emissiveIntensity = hit ? 0.82 : enemy.commander ? 0.18 : 0.04;
          }
        });
      });
    }
  });
  const enemyAnimation = (): WarRoomAnimationState => {
    const runtime = groupRef.current?.parent?.userData.runtime as WarRoomRuntime | undefined;
    const gameNow = runtime?.player.clockTime ?? 0;
    if (!enemy.alive) return "death";
    if (enemy.hitUntil > gameNow) return "hit";
    if (enemy.mode === "approach") return "run";
    if (enemy.mode === "fire") return "attack";
    return "idle";
  };
  const tint = enemy.commander
    ? "#a4212e"
    : ["#9f3430", "#8c292c", "#b74638", "#752a32"][index % 4];
  const characterHeight = WAR_ROOM_CHARACTER_HEIGHT * (enemy.commander ? WAR_ROOM_COMMANDER_SCALE : 1);
  const fallback = <ProceduralEnemyFallback commander={enemy.commander} />;
  return (
    <group
      ref={(node) => {
        groupRef.current = node;
        groupRefs.current[index] = node;
      }}
      name={`war-room-enemy:${enemy.id}`}
      userData={{ enemyIndex: index }}
    >
      <WarRoomAssetBoundary fallback={fallback}>
        <Suspense fallback={fallback}>
          <WarRoomAnimatedActor
            src="/models/player-hero.glb"
            height={characterHeight}
            tint={tint}
            commander={enemy.commander}
            state={enemyAnimation}
            modelRef={modelRef}
          />
        </Suspense>
      </WarRoomAssetBoundary>
      <group ref={weaponMountRef} name={`enemy-weapon:${enemy.id}`} visible={false}>
        <WeaponModel
          weaponId="powder_rifle"
          mount={WAR_ROOM_WEAPON_MOUNTS.powder_rifle}
          muzzleAnchorRef={muzzleAnchorRef}
          muzzleFlashRef={muzzleFlashRef}
        />
      </group>
      {enemy.commander && (
        <mesh position={[0, 2.12, 0]}>
          <coneGeometry args={[0.2, 0.36, 5]} />
          <meshBasicMaterial color="#ff433a" toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

function buildHudSnapshot(runtime: WarRoomRuntime, now: number, weaponIds: readonly [WarRoomWeaponId, WarRoomWeaponId], input: WarRoomInputState): WarRoomHudSnapshot {
  const player = runtime.player;
  const weaponId = weaponIds[player.activeSlot];
  const ammo = player.ammo[weaponId];
  const boss = runtime.enemies.find((enemy) => enemy.commander)!;
  return {
    player: {
      x: player.x,
      z: player.z,
      yaw: player.yaw,
      hp: player.hp,
      maxHp: player.maxHp,
      stamina: player.stamina,
      maxStamina: player.maxStamina,
    },
    enemies: runtime.enemies.map(({ id, x, z, alive, commander }) => ({ id, x, z, alive, commander })),
    remaining: getWarRoomRemaining(runtime),
    bossHp: boss.hp,
    bossMaxHp: boss.maxHp,
    kills: player.kills,
    headshots: player.headshots,
    shots: player.shots,
    hits: player.hits,
    elapsedSeconds: Math.max(0, now - player.startTime),
    weaponId,
    magazine: ammo?.magazine ?? 0,
    reserve: ammo?.reserve ?? 0,
    reloading: player.reloadingWeapon === weaponId,
    aiming: input.aimHeld,
    targetVisible: Boolean(player.targetId),
    hitMarker: player.hitMarkerUntil > now,
    headshotMarker: player.hitMarkerUntil > now && player.hitMarkerHeadshot,
    firing: player.shotFeedbackUntil > now,
    damageVignette: player.lastDamageAt > 0 && now - player.lastDamageAt < 0.72,
    damageDirection: player.damageDirection,
    lastHitDamage: player.lastHitDamage,
    hitMessage: player.hitMessageUntil > now ? player.lastHitText : "",
    killFeed: player.killFeed,
    crouched: player.crouched,
  };
}

function WarRoomRuntimeScene({
  runtimeRef,
  inputRef,
  weaponIds,
  weaponMountOverrides,
  onHudUpdate,
  onFinish,
}: Props) {
  const { camera, scene } = useThree();
  const perspective = camera as THREE.PerspectiveCamera;
  const enemyGroupRefs = useRef<Array<THREE.Group | null>>([]);
  const muzzleLightRef = useRef<THREE.PointLight>(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const cameraStart = useMemo(() => new THREE.Vector3(), []);
  const cameraDesired = useMemo(() => new THREE.Vector3(), []);
  const cameraLook = useMemo(() => new THREE.Vector3(), []);
  const playerRootRef = useRef<THREE.Group | null>(null);
  const playerMuzzleRef = useRef<THREE.Group | null>(null);
  const lastHudAtRef = useRef(0);
  const finishedRef = useRef(false);
  const cameraKickRef = useRef(0);
  const cameraSideKickRef = useRef(0);
  const particles = useMemo<WarRoomParticle[]>(
    () => Array.from({ length: WAR_ROOM_EFFECT_POOL_SIZE }, () => ({
      x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, born: -1, lifetime: 0, size: 0, bounce: false,
    })),
    [],
  );
  const particleCursor = useRef(0);
  const particleMesh = useMemo(() => {
    const mesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 6, 5),
      new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.92, depthWrite: false }),
      WAR_ROOM_EFFECT_POOL_SIZE,
    );
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    return mesh;
  }, []);
  const particleTransform = useMemo(() => new THREE.Object3D(), []);
  const decalMesh = useMemo(() => {
    const mesh = new THREE.InstancedMesh(
      new THREE.CircleGeometry(0.11, 8),
      new THREE.MeshBasicMaterial({
        color: "#46382e",
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        side: THREE.DoubleSide,
      }),
      WAR_ROOM_DECAL_POOL_SIZE,
    );
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const hidden = new THREE.Object3D();
    hidden.scale.setScalar(0);
    hidden.updateMatrix();
    for (let index = 0; index < WAR_ROOM_DECAL_POOL_SIZE; index += 1) mesh.setMatrixAt(index, hidden.matrix);
    mesh.frustumCulled = false;
    return mesh;
  }, []);
  const decalCursor = useRef(0);
  const decalTransform = useMemo(() => new THREE.Object3D(), []);
  const decalNormal = useMemo(() => new THREE.Vector3(), []);
  const decalForward = useMemo(() => new THREE.Vector3(0, 0, 1), []);
  const tracerState = useMemo(() => ({
    geometry: new THREE.BufferGeometry(),
    positions: new Float32Array(WAR_ROOM_TRACER_POOL_SIZE * 6),
    colors: new Float32Array(WAR_ROOM_TRACER_POOL_SIZE * 6),
    expires: new Float64Array(WAR_ROOM_TRACER_POOL_SIZE),
    cursor: 0,
  }), []);
  const tracerLines = useMemo(() => {
    tracerState.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(tracerState.positions, 3).setUsage(THREE.DynamicDrawUsage),
    );
    tracerState.geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(tracerState.colors, 3).setUsage(THREE.DynamicDrawUsage),
    );
    const lines = new THREE.LineSegments(
      tracerState.geometry,
      new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.88, depthWrite: false }),
    );
    lines.frustumCulled = false;
    return lines;
  }, [tracerState]);
  const projectiles = useMemo<WarRoomProjectile[]>(
    () => Array.from({ length: WAR_ROOM_PROJECTILE_POOL_SIZE }, () => ({
      start: new THREE.Vector3(),
      end: new THREE.Vector3(),
      born: -1,
      lifetime: 0,
      color: "#ffffff",
    })),
    [],
  );
  const projectileCursor = useRef(0);
  const projectileUp = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const projectileDirection = useMemo(() => new THREE.Vector3(), []);
  const projectileTip = useMemo(() => new THREE.Vector3(), []);
  const projectileTransform = useMemo(() => new THREE.Object3D(), []);
  const projectileShafts = useMemo(() => {
    const mesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.48, 5),
      new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: 0.32, roughness: 0.5 }),
      WAR_ROOM_PROJECTILE_POOL_SIZE,
    );
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    return mesh;
  }, []);
  const projectileHeads = useMemo(() => {
    const mesh = new THREE.InstancedMesh(
      new THREE.ConeGeometry(0.036, 0.15, 5),
      new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: 0.22, roughness: 0.48 }),
      WAR_ROOM_PROJECTILE_POOL_SIZE,
    );
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    return mesh;
  }, []);

  const spawnImpact = (
    position: THREE.Vector3,
    color: string,
    now: number,
    count = 6,
    size = 0.045,
    bias?: THREE.Vector3,
  ) => {
    for (let index = 0; index < count; index += 1) {
      const slot = particleCursor.current++ % WAR_ROOM_EFFECT_POOL_SIZE;
      const particle = particles[slot];
      const seed = now * 997 + slot * 31 + index * 17;
      const jitterX = Math.sin(seed * 12.9898);
      const jitterY = (Math.sin(seed * 7.233 + 1.3) + 1) * 0.75;
      const jitterZ = Math.sin(seed * 5.341 + 2.7);
      particle.x = position.x;
      particle.y = position.y;
      particle.z = position.z;
      particle.vx = (bias?.x ?? 0) + jitterX * 1.4;
      particle.vy = (bias?.y ?? 0.25) + jitterY;
      particle.vz = (bias?.z ?? 0) + jitterZ * 1.4;
      particle.born = now;
      particle.lifetime = 0.16 + (Math.sin(seed * 3.7) + 1) * 0.12;
      particle.size = size * (0.65 + (Math.sin(seed * 2.1) + 1) * 0.375);
      particle.bounce = false;
      particleMesh.setColorAt(slot, new THREE.Color(color));
    }
    if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;
  };

  const spawnMuzzleSmoke = (position: THREE.Vector3, now: number) => {
    for (let index = 0; index < 4; index += 1) {
      const slot = particleCursor.current++ % WAR_ROOM_EFFECT_POOL_SIZE;
      const particle = particles[slot];
      const seed = now * 431 + slot * 23 + index * 13;
      particle.x = position.x;
      particle.y = position.y;
      particle.z = position.z;
      particle.vx = Math.sin(seed * 1.7) * 0.16;
      particle.vy = 0.28 + (Math.sin(seed * 2.3) + 1) * 0.12;
      particle.vz = Math.cos(seed * 2.1) * 0.16;
      particle.born = now;
      particle.lifetime = 0.34 + (index % 2) * 0.08;
      particle.size = 0.075 + (index % 2) * 0.018;
      particle.bounce = false;
      particleMesh.setColorAt(slot, new THREE.Color(index % 2 ? "#8d8375" : "#b1a18c"));
    }
    if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;
  };

  const spawnCasing = (position: THREE.Vector3, now: number, yaw: number) => {
    const slot = particleCursor.current++ % WAR_ROOM_EFFECT_POOL_SIZE;
    const particle = particles[slot];
    particle.x = position.x + Math.cos(yaw) * 0.12;
    particle.y = Math.max(0.3, position.y - 0.55);
    particle.z = position.z + Math.sin(yaw) * 0.12;
    particle.vx = Math.cos(yaw) * 0.42 + 0.1;
    particle.vy = 1.05;
    particle.vz = Math.sin(yaw) * 0.42;
    particle.born = now;
    particle.lifetime = 0.98;
    particle.size = 0.032;
    particle.bounce = true;
    particleMesh.setColorAt(slot, new THREE.Color("#c5b698"));
    if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;
  };

  const addBulletHole = (position: THREE.Vector3, incomingDirection: THREE.Vector3, now: number) => {
    const slot = decalCursor.current++ % WAR_ROOM_DECAL_POOL_SIZE;
    decalNormal.copy(incomingDirection).negate().normalize();
    decalTransform.position.copy(position).addScaledVector(decalNormal, 0.009);
    decalTransform.quaternion.setFromUnitVectors(decalForward, decalNormal);
    decalTransform.scale.setScalar(0.75 + (Math.sin(now * 29 + slot) + 1) * 0.16);
    decalTransform.updateMatrix();
    decalMesh.setMatrixAt(slot, decalTransform.matrix);
    decalMesh.setColorAt(slot, new THREE.Color(slot % 3 ? "#43392f" : "#614837"));
    decalMesh.instanceMatrix.needsUpdate = true;
    if (decalMesh.instanceColor) decalMesh.instanceColor.needsUpdate = true;
  };

  const addTracer = (start: THREE.Vector3, end: THREE.Vector3, color: string, now: number, lifetime = 0.08) => {
    const slot = tracerState.cursor++ % WAR_ROOM_TRACER_POOL_SIZE;
    const offset = slot * 6;
    tracerState.positions.set([start.x, start.y, start.z, end.x, end.y, end.z], offset);
    const tint = new THREE.Color(color);
    tracerState.colors.set([tint.r, tint.g, tint.b, tint.r, tint.g, tint.b], offset);
    tracerState.expires[slot] = now + lifetime;
    tracerState.geometry.attributes.position.needsUpdate = true;
    tracerState.geometry.attributes.color.needsUpdate = true;
  };

  const addProjectile = (start: THREE.Vector3, end: THREE.Vector3, color: string, now: number) => {
    const slot = projectileCursor.current++ % WAR_ROOM_PROJECTILE_POOL_SIZE;
    const projectile = projectiles[slot];
    projectile.start.copy(start);
    projectile.end.copy(end);
    projectile.born = now;
    projectile.lifetime = Math.max(0.12, Math.min(0.62, start.distanceTo(end) / 48));
    projectile.color = color;
    const tint = new THREE.Color(color);
    projectileShafts.setColorAt(slot, tint);
    projectileHeads.setColorAt(slot, tint);
    if (projectileShafts.instanceColor) projectileShafts.instanceColor.needsUpdate = true;
    if (projectileHeads.instanceColor) projectileHeads.instanceColor.needsUpdate = true;
  };

  const getAimHit = (x: number, y: number, range: number) => {
    raycaster.setFromCamera(ndc.set(x, y), perspective);
    const origin = raycaster.ray.origin;
    const rayDirection = raycaster.ray.direction;
    const rayEnd = origin.clone().addScaledVector(rayDirection, range);
    const blockedAt = segmentBlockFraction(
      { x: origin.x, y: origin.y, z: origin.z },
      { x: rayEnd.x, y: rayEnd.y, z: rayEnd.z },
    );
    const result = traceWarRoomRay(
      { x: origin.x, y: origin.y, z: origin.z },
      { x: rayDirection.x, y: rayDirection.y, z: rayDirection.z },
      runtimeRef.current.enemies,
      range,
      blockedAt,
    );
    return {
      enemy: result.target,
      index: result.targetIndex,
      point: new THREE.Vector3(result.point.x, result.point.y, result.point.z),
      headshot: result.headshot,
      blocked: result.blocked,
    };
  };

  const fireWeapon = (now: number, charge = 1) => {
    const runtime = runtimeRef.current;
    const player = runtime.player;
    const weaponId = weaponIds[player.activeSlot];
    const weapon = WAR_ROOM_WEAPON_BY_ID.get(weaponId)!;
    const ammo = player.ammo[weaponId];
    if (!ammo || ammo.magazine <= 0) {
      playWarRoomSound("empty");
      player.lastHitText = "CEPHANE BİTTİ · YENİDEN DOLDUR";
      player.hitMessageUntil = now + 1.1;
      return;
    }
    if (now < player.nextShotAt || player.reloadingWeapon) return;
    player.nextShotAt = now + weapon.fireInterval;
    const shotStyle: WarRoomShotStyle = weapon.weaponClass === "shotgun" || weaponId === "scattergun"
      ? "shotgun"
      : weapon.weaponClass === "pistol" || weaponId === "sidearm"
        ? "pistol"
        : "rifle";
    playWarRoomSound(
      weaponId === "longbow" || weaponId === "crossbow" ? "bow" : "shot",
      1,
      shotStyle,
    );
    ammo.magazine -= 1;
    player.shots += 1;
    player.lastHitDamage = 0;
    player.hitMarkerUntil = 0;
    player.hitMarkerHeadshot = false;
    player.shotFlashUntil = now + 0.06;
    player.shotFeedbackUntil = now + 0.2;
    player.recoil = Math.min(0.17, player.recoil + weapon.recoil);
    cameraKickRef.current = Math.min(0.16, cameraKickRef.current + 0.045 + weapon.recoil * 0.4);
    cameraSideKickRef.current = Math.max(
      -0.025,
      Math.min(0.025, cameraSideKickRef.current + Math.sin(now * 37.7) * 0.004),
    );

    const pellets = weapon.pellets ?? 1;
    const spread = weapon.spread + player.recoil * 0.18;
    let shotHit = false;
    let shotHeadshot = false;
    const muzzle = new THREE.Vector3();
    const muzzleAnchor = playerMuzzleRef.current;
    if (muzzleAnchor) {
      muzzleAnchor.updateWorldMatrix(true, false);
      muzzleAnchor.getWorldPosition(muzzle);
    } else {
      muzzle.set(
        player.x + Math.cos(player.yaw) * 0.38 + Math.sin(player.yaw) * 0.25,
        1.36 + player.jumpHeight,
        player.z - Math.sin(player.yaw) * 0.38 + Math.cos(player.yaw) * 0.25,
      );
    }
    if (muzzleFlashRef.current) {
      const flash = muzzleFlashRef.current;
      flash.visible = true;
      const seed = now * 91.7;
      const scale = 0.8 + (Math.sin(seed) + 1) * 0.24;
      flash.scale.setScalar(scale);
      flash.rotation.z = Math.sin(seed * 1.3) * 0.65;
      flash.userData.warRoomExpiresAt = now + 0.06;
    }
    if (muzzleLightRef.current) {
      muzzleLightRef.current.position.copy(muzzle);
      muzzleLightRef.current.intensity = 2.4;
      muzzleLightRef.current.visible = true;
      muzzleLightRef.current.userData.warRoomExpiresAt = now + 0.06;
    }
    spawnMuzzleSmoke(muzzle, now);
    if (weaponId !== "longbow" && weaponId !== "crossbow") spawnCasing(muzzle, now, player.yaw);
    const tracerEnd = new THREE.Vector3();
    const chargeMultiplier = weapon.charge ? 0.65 + charge * 0.55 : 1;
    for (let pellet = 0; pellet < pellets; pellet += 1) {
      const spreadX = (nextWarRoomRandom(runtime) - 0.5) * spread;
      const spreadY = (nextWarRoomRandom(runtime) - 0.5) * spread;
      const aim = getAimHit(spreadX, spreadY, weapon.range);
      const aimedEnemy = aim.enemy;
      if (aimedEnemy) {
        const damage = applyWarRoomDamage(
          aimedEnemy,
          weapon.damage * chargeMultiplier,
          aim.headshot ? weapon.headshotMultiplier : 1,
        );
        aimedEnemy.hitUntil = now + 0.14;
        shotHit = true;
        shotHeadshot ||= aim.headshot;
        player.lastHitDamage += damage.damage;
        player.lastHitText = `${aimedEnemy.name} · −${damage.damage}${aim.headshot ? " · KAFA" : ""}`;
        player.hitMessageUntil = now + 0.72;
        player.hitMarkerUntil = now + 0.18;
        player.hitMarkerHeadshot = aim.headshot;
        if (damage.killed) {
          aimedEnemy.alive = false;
          player.kills += 1;
          if (aim.headshot) player.headshots += 1;
          player.killFeed = [
            { id: now * 1000 + player.kills, text: `Yolcu  →  ${aimedEnemy.name}${aim.headshot ? " · KAFA" : ""}` },
            ...player.killFeed,
          ].slice(0, 4);
        }
        tracerEnd.copy(aim.point);
        spawnImpact(aim.point, aim.headshot ? "#ff584f" : "#f2d7aa", now, aim.headshot ? 8 : 7, aim.headshot ? 0.075 : 0.05);
      } else {
        tracerEnd.copy(aim.point);
        if (aim.blocked) {
          spawnImpact(tracerEnd, "#b99870", now, 7, 0.055);
          if (pellet === 0) addBulletHole(tracerEnd, raycaster.ray.direction, now);
        }
      }
      if (pellet === 0 || aimedEnemy) {
        if (weaponId === "crossbow" || weaponId === "longbow") {
          addProjectile(muzzle, tracerEnd, weapon.color, now);
        } else {
          addTracer(muzzle, tracerEnd, weapon.color, now);
        }
      }
    }
    if (!weapon.charge && weaponId !== "crossbow") {
      spawnImpact(
        muzzle.clone().add(new THREE.Vector3(0.08, 0.015, 0)),
        "#c6a360",
        now,
        2,
        0.025,
        new THREE.Vector3(0.7, 0.15, 0.15),
      );
    }
    if (shotHit) {
      player.hits += 1;
      if (shotHeadshot && !player.killFeed.some((entry) => entry.id === now * 1000 + player.kills)) player.headshots += 1;
    }
  };

  useFrame((frame, rawDelta) => {
    const runtime = runtimeRef.current;
    const player = runtime.player;
    const input = inputRef.current;
    const delta = Math.min(rawDelta, 0.05);
    if (input.paused) return;
    player.clockTime += delta;
    const now = player.clockTime;
    player.recoil = Math.max(0, player.recoil - delta * 0.36);
    if (player.startTime === 0) player.startTime = now;
    player.yaw = input.yaw;
    player.pitch = Math.max(-0.56, Math.min(0.55, input.pitch));

    const forwardX = Math.sin(player.yaw);
    const forwardZ = -Math.cos(player.yaw);
    const rightX = Math.cos(player.yaw);
    const rightZ = Math.sin(player.yaw);
    const keyX = (input.keys.has("d") ? 1 : 0) - (input.keys.has("a") ? 1 : 0);
    const keyY = (input.keys.has("w") ? 1 : 0) - (input.keys.has("s") ? 1 : 0);
    let moveX = input.moveX + keyX;
    let moveY = input.moveY + keyY;
    const inputLength = Math.hypot(moveX, moveY);
    if (inputLength > 1) {
      moveX /= inputLength;
      moveY /= inputLength;
    }

    if (input.crouchPressed) {
      player.crouched = !player.crouched;
      input.crouchPressed = false;
    }
    if (input.swapPressed) {
      player.activeSlot = player.activeSlot === 0 ? 1 : 0;
      player.reloadingWeapon = null;
      player.reloadUntil = 0;
      input.swapPressed = false;
    }
    if (input.jumpPressed) {
      if (player.jumpHeight <= 0.001) player.jumpVelocity = 5.4;
      input.jumpPressed = false;
    }
    if (input.dodgePressed) {
      if (player.stamina >= 18 && now >= player.dodgeUntil) {
        const dodgeLength = Math.hypot(moveX, moveY);
        const localX = dodgeLength > 0.05 ? moveX / dodgeLength : 0;
        const localY = dodgeLength > 0.05 ? moveY / dodgeLength : -1;
        player.dodgeX = rightX * localX + forwardX * localY;
        player.dodgeZ = rightZ * localX + forwardZ * localY;
        player.stamina = Math.max(0, player.stamina - 18);
        player.dodgeUntil = now + 0.26;
        player.invulnerableUntil = now + 0.18;
      }
      input.dodgePressed = false;
    }

    const speed = player.crouched ? 3.05 : 6.1;
    let dx = (rightX * moveX + forwardX * moveY) * speed * delta;
    let dz = (rightZ * moveX + forwardZ * moveY) * speed * delta;
    if (now < player.dodgeUntil) {
      const remaining = Math.max(0, player.dodgeUntil - now);
      dx += player.dodgeX * 11 * Math.min(delta, remaining);
      dz += player.dodgeZ * 11 * Math.min(delta, remaining);
    }
    const nextPosition = moveWarRoomEntity(player.x, player.z, dx, dz);
    player.x = nextPosition.x;
    player.z = nextPosition.z;
    player.jumpVelocity -= 14 * delta;
    player.jumpHeight = Math.max(0, player.jumpHeight + player.jumpVelocity * delta);
    if (player.jumpHeight === 0) player.jumpVelocity = 0;
    player.stamina = Math.min(player.maxStamina, player.stamina + delta * (player.crouched ? 22 : 15));
    player.lastHitDamage = Math.max(0, player.lastHitDamage);

    const weaponId = weaponIds[player.activeSlot];
    const weapon = WAR_ROOM_WEAPON_BY_ID.get(weaponId)!;
    if (input.reloadPressed) {
      const ammo = player.ammo[weaponId];
      if (ammo && ammo.magazine < weapon.magazine && ammo.reserve > 0 && !player.reloadingWeapon) {
        player.reloadingWeapon = weaponId;
        player.reloadUntil = now + weapon.reloadSeconds;
        playWarRoomSound("reload");
      }
      input.reloadPressed = false;
    }
    if (player.reloadingWeapon && now >= player.reloadUntil) {
      const reloading = WAR_ROOM_WEAPON_BY_ID.get(player.reloadingWeapon);
      const ammo = player.ammo[player.reloadingWeapon];
      if (reloading && ammo) {
        const moved = Math.min(reloading.magazine - ammo.magazine, ammo.reserve);
        ammo.magazine += moved;
        ammo.reserve -= moved;
      }
      player.reloadingWeapon = null;
      player.reloadUntil = 0;
    }

    if (weapon.charge && input.firePressed) player.chargeStartedAt = now || 0.0001;
    if (weapon.charge && input.fireReleased && player.chargeStartedAt > 0) {
      const charge = Math.max(0.15, Math.min(1, (now - player.chargeStartedAt) / 0.95));
      fireWeapon(now, charge);
      player.chargeStartedAt = 0;
    } else if (!weapon.charge && (input.firePressed || (weapon.automatic && input.fireHeld))) {
      fireWeapon(now);
    }
    input.firePressed = false;
    input.fireReleased = false;

    for (let index = 0; index < runtime.enemies.length; index += 1) {
      const enemy = runtime.enemies[index];
      const group = enemyGroupRefs.current[index];
      if (!enemy.alive) {
        if (group) group.visible = false;
        continue;
      }
      const gap = Math.hypot(enemy.x - player.x, enemy.z - player.z);
      const enemyEye = { x: enemy.x, y: enemy.commander ? 1.65 : 1.45, z: enemy.z };
      const playerEye = { x: player.x, y: player.jumpHeight + (player.crouched ? 1.1 : 1.4), z: player.z };
      const lineBlocked = segmentBlockFraction(enemyEye, playerEye) !== null;
      enemy.mode = player.hp / player.maxHp < 0.33
        ? "cover"
        : !lineBlocked && gap <= (enemy.commander ? 22 : 17)
          ? "fire"
          : lineBlocked && gap < 26 ? "cover" : "approach";
      const updateInterval = gap > 38 ? 0.55 : 0.12;
      if (now >= enemy.brainAt) {
        enemy.brainAt = now + updateInterval;
        let targetX = player.x;
        let targetZ = player.z;
        if (enemy.mode === "cover") {
          if (enemy.hp / enemy.maxHp < 0.32 || lineBlocked) {
            const cover = getNearestWarRoomCover(enemy.x, enemy.z);
            if (cover) {
              enemy.coverX = cover.x;
              enemy.coverZ = cover.z;
            }
          }
          targetX = enemy.coverX;
          targetZ = enemy.coverZ;
        }
        const holdDistance = enemy.commander ? 12.5 : 10.5;
        const shouldMove = enemy.mode !== "fire" && Math.hypot(targetX - enemy.x, targetZ - enemy.z) > (enemy.mode === "cover" ? 1.2 : holdDistance);
        if (shouldMove) {
          const targetYaw = Math.atan2(targetX - enemy.x, -(targetZ - enemy.z));
          const moveSpeed = enemy.commander ? 2.55 : enemy.mode === "cover" ? 3.25 : 3.7;
          let moveXEnemy = Math.sin(targetYaw) * moveSpeed * updateInterval;
          let moveZEnemy = -Math.cos(targetYaw) * moveSpeed * updateInterval;
          for (const other of runtime.enemies) {
            if (other === enemy || !other.alive) continue;
            const separationX = enemy.x - other.x;
            const separationZ = enemy.z - other.z;
            const separation = Math.hypot(separationX, separationZ);
            if (separation > 0.001 && separation < 1.25) {
              moveXEnemy += (separationX / separation) * 1.5 * updateInterval;
              moveZEnemy += (separationZ / separation) * 1.5 * updateInterval;
            }
          }
          const moved = moveWarRoomEntity(enemy.x, enemy.z, moveXEnemy, moveZEnemy, 0.35);
          enemy.x = moved.x;
          enemy.z = moved.z;
        }
      }
      if (group) {
        group.position.set(enemy.x, 0, enemy.z);
        group.visible = true;
      }
    }

    const attackCandidates = runtime.enemies
      .filter((enemy) => {
        if (!enemy.alive || Math.hypot(enemy.x - player.x, enemy.z - player.z) > 24) return false;
        const blocked = segmentBlockFraction(
          { x: enemy.x, y: enemy.commander ? 1.6 : 1.4, z: enemy.z },
          { x: player.x, y: player.jumpHeight + 1.3, z: player.z },
        );
        return blocked === null;
      })
      .sort((left, right) => Math.hypot(left.x - player.x, left.z - player.z) - Math.hypot(right.x - player.x, right.z - player.z))
      .slice(0, 3);

    for (const enemy of attackCandidates) {
      if (now < enemy.nextShotAt || now < player.invulnerableUntil) continue;
      enemy.nextShotAt = now + (enemy.commander ? 1.2 : 1.65) + nextWarRoomRandom(runtime) * 0.55;
      const muzzle = new THREE.Vector3(enemy.x + 0.22, enemy.commander ? 1.5 : 1.35, enemy.z - 0.48);
      const enemyGroup = enemyGroupRefs.current[runtime.enemies.indexOf(enemy)];
      const enemyMuzzle = enemyGroup?.getObjectByName("war-room-muzzle-anchor");
      if (enemyMuzzle) {
        enemyMuzzle.updateWorldMatrix(true, false);
        enemyMuzzle.getWorldPosition(muzzle);
      }
      const enemyFlash = enemyGroup?.getObjectByName("war-room-muzzle-flash") as THREE.Group | undefined;
      if (enemyFlash) {
        enemyFlash.visible = true;
        enemyFlash.userData.warRoomExpiresAt = now + 0.08;
        const flashScale = 0.78 + (Math.sin(now * 83 + enemy.x) + 1) * 0.18;
        enemyFlash.scale.setScalar(flashScale);
        enemyFlash.rotation.z = Math.sin(now * 29 + enemy.z) * 0.55;
      }
      if (muzzleLightRef.current) {
        muzzleLightRef.current.position.copy(muzzle);
        muzzleLightRef.current.intensity = 2;
        muzzleLightRef.current.visible = true;
        muzzleLightRef.current.userData.warRoomExpiresAt = now + 0.06;
      }
      spawnMuzzleSmoke(muzzle, now);
      spawnCasing(muzzle, now, Math.atan2(player.x - enemy.x, -(player.z - enemy.z)));
      const enemyDistance = Math.hypot(enemy.x - player.x, enemy.z - player.z);
      playWarRoomSound("enemy-shot", Math.max(0.08, 1 - enemyDistance / 27), "rifle");
      const missSeed = now * 9 + runtime.enemies.indexOf(enemy) * 2.7;
      const target = new THREE.Vector3(
        player.x + Math.sin(missSeed) * 0.38,
        player.jumpHeight + 1.15 + Math.cos(missSeed * 1.37) * 0.22,
        player.z + Math.sin(missSeed * 0.71) * 0.38,
      );
      addTracer(muzzle, target, "#f36e54", now, 0.08);
      if (nextWarRoomRandom(runtime) > (enemy.commander ? 0.25 : 0.38)) {
        const hit = applyWarRoomDamage(player, enemy.damage);
        if (hit.damage > 0) {
          playWarRoomSound("hit");
          player.lastDamageAt = now;
          player.invulnerableUntil = now + 0.28;
          player.damageDirection = shortestAngleDelta(
            player.yaw,
            Math.atan2(enemy.x - player.x, -(enemy.z - player.z)),
          );
          player.lastHitText = `−${hit.damage} CAN · ${enemy.name}`;
          player.hitMessageUntil = now + 1;
          player.lastHitDamage = hit.damage;
        }
      }
    }

    const positions = tracerState.positions;
    for (let slot = 0; slot < WAR_ROOM_TRACER_POOL_SIZE; slot += 1) {
      if (tracerState.expires[slot] > 0 && tracerState.expires[slot] <= now) {
        const offset = slot * 6;
        positions.fill(0, offset, offset + 6);
        tracerState.expires[slot] = 0;
        tracerState.geometry.attributes.position.needsUpdate = true;
      }
    }
    for (let slot = 0; slot < WAR_ROOM_EFFECT_POOL_SIZE; slot += 1) {
      const particle = particles[slot];
      const age = now - particle.born;
      if (particle.born < 0 || age >= particle.lifetime) {
        particleTransform.position.set(0, -1000, 0);
        particleTransform.scale.setScalar(0);
      } else {
        const groundTime = particle.bounce
          ? (particle.vy + Math.sqrt(particle.vy * particle.vy + 8.8 * Math.max(0, particle.y - 0.025))) / 4.4
          : Number.POSITIVE_INFINITY;
        const afterBounce = age > groundTime ? age - groundTime : 0;
        const impactVelocity = particle.vy - 4.4 * groundTime;
        const reboundVelocity = Math.abs(impactVelocity) * 0.28;
        const particleY = particle.bounce && afterBounce > 0
          ? Math.max(0.025, 0.025 + reboundVelocity * afterBounce - afterBounce * afterBounce * 2.2)
          : particle.y + particle.vy * age - age * age * 2.2;
        particleTransform.position.set(
          particle.x + particle.vx * (particle.bounce ? Math.min(age, groundTime) + afterBounce * 0.32 : age),
          particleY,
          particle.z + particle.vz * (particle.bounce ? Math.min(age, groundTime) + afterBounce * 0.32 : age),
        );
        particleTransform.scale.setScalar(particle.size * (1 - age / particle.lifetime));
      }
      particleTransform.updateMatrix();
      particleMesh.setMatrixAt(slot, particleTransform.matrix);
    }
    particleMesh.instanceMatrix.needsUpdate = true;

    for (let slot = 0; slot < WAR_ROOM_PROJECTILE_POOL_SIZE; slot += 1) {
      const projectile = projectiles[slot];
      const age = now - projectile.born;
      if (projectile.born < 0 || age >= projectile.lifetime) {
        projectileTransform.position.set(0, -1000, 0);
        projectileTransform.quaternion.identity();
        projectileTransform.scale.setScalar(0);
        projectileTransform.updateMatrix();
        projectileShafts.setMatrixAt(slot, projectileTransform.matrix);
        projectileHeads.setMatrixAt(slot, projectileTransform.matrix);
        continue;
      }
      const progress = Math.min(1, age / projectile.lifetime);
      projectileDirection.subVectors(projectile.end, projectile.start).normalize();
      projectileTip.copy(projectile.start).lerp(projectile.end, progress);
      projectileTransform.quaternion.setFromUnitVectors(projectileUp, projectileDirection);
      projectileTransform.position.copy(projectileTip).addScaledVector(projectileDirection, -0.26);
      projectileTransform.scale.set(1, 1, 1);
      projectileTransform.updateMatrix();
      projectileShafts.setMatrixAt(slot, projectileTransform.matrix);
      projectileTransform.position.copy(projectileTip).addScaledVector(projectileDirection, -0.075);
      projectileTransform.scale.set(1, 1, 1);
      projectileTransform.updateMatrix();
      projectileHeads.setMatrixAt(slot, projectileTransform.matrix);
    }
    projectileShafts.instanceMatrix.needsUpdate = true;
    projectileHeads.instanceMatrix.needsUpdate = true;

    const aimDistance = WAR_ROOM_WEAPON_BY_ID.get(weaponIds[player.activeSlot])!.range;
    const desiredFov = input.aimHeld ? 48 : 70;
    perspective.fov += (desiredFov - perspective.fov) * (1 - Math.exp(-9 * delta));
    perspective.updateProjectionMatrix();
    const cameraForwardX = Math.sin(player.yaw) * Math.cos(player.pitch);
    const cameraForwardY = Math.sin(player.pitch);
    const cameraForwardZ = -Math.cos(player.yaw) * Math.cos(player.pitch);
    const cameraBack = input.aimHeld ? 2.8 : 4.05;
    const shoulder = input.aimHeld ? 1.02 : 0.92;
    cameraStart.set(player.x, player.jumpHeight + (player.crouched ? 1.2 : 1.55), player.z);
    cameraDesired.set(
      player.x - cameraForwardX * cameraBack + Math.cos(player.yaw) * shoulder,
      cameraStart.y + 0.35 - cameraForwardY * cameraBack,
      player.z - cameraForwardZ * cameraBack + Math.sin(player.yaw) * shoulder,
    );
    const cameraCollision = boxSegment(cameraStart, cameraDesired);
    const safeFraction = cameraCollision ?? 1;
    if (safeFraction < 1) {
      cameraDesired.lerpVectors(cameraStart, cameraDesired, Math.max(0.12, safeFraction - 0.08));
    }
    camera.position.lerp(cameraDesired, 1 - Math.exp(-14 * delta));
    cameraLook.set(
      player.x + cameraForwardX * 10,
      player.jumpHeight + (player.crouched ? 1.18 : 1.48) + cameraForwardY * 10 + cameraKickRef.current,
      player.z + cameraForwardZ * 10,
    );
    cameraLook.x += Math.cos(player.yaw) * cameraSideKickRef.current;
    cameraLook.z += Math.sin(player.yaw) * cameraSideKickRef.current;
    cameraKickRef.current = Math.max(0, cameraKickRef.current - delta * 0.72);
    cameraSideKickRef.current *= Math.exp(-delta * 7.5);
    if (now - player.lastDamageAt < 0.24) {
      const shake = Math.sin(now * 92) * 0.045;
      camera.position.x += shake;
      camera.position.y += Math.cos(now * 78) * 0.028;
    }
    camera.lookAt(cameraLook);
    scene.updateMatrixWorld(true);

    const aim = getAimHit(0, 0, aimDistance);
    player.targetId = aim?.enemy?.id ?? null;

    if (now - lastHudAtRef.current >= 0.1) {
      lastHudAtRef.current = now;
      onHudUpdate(buildHudSnapshot(runtime, now, weaponIds, input));
    }
    const snapshot = buildHudSnapshot(runtime, now, weaponIds, input);
    if (!finishedRef.current && player.hp <= 0) {
      finishedRef.current = true;
      onFinish("defeat", snapshot);
    } else if (!finishedRef.current && getWarRoomRemaining(runtime) === 0) {
      finishedRef.current = true;
      onFinish("victory", snapshot);
    }
  });

  const runtime = runtimeRef.current;
  const activeWeapon = weaponIds[runtime.player.activeSlot];
  return (
    <>
      <Battlefield />
      <primitive object={tracerLines} dispose={null} />
      <primitive object={particleMesh} dispose={null} />
      <primitive object={decalMesh} dispose={null} />
      <primitive object={projectileShafts} dispose={null} />
      <primitive object={projectileHeads} dispose={null} />
      <pointLight
        ref={muzzleLightRef}
        color="#ff9a4d"
        intensity={0}
        distance={3.2}
        decay={2}
        visible={false}
      />
      <group userData={{ runtime }}>
        {runtime.enemies.map((enemy, index) => (
          <EnemyActor
            key={enemy.id}
            enemy={enemy}
            index={index}
            groupRefs={enemyGroupRefs}
            muzzleLightRef={muzzleLightRef}
          />
        ))}
      </group>
      <PlayerActor
        runtimeRef={runtimeRef}
        inputRef={inputRef}
        weaponId={activeWeapon}
        weaponMountOverrides={weaponMountOverrides}
        rootRef={playerRootRef}
        muzzleRef={playerMuzzleRef}
        muzzleLightRef={muzzleLightRef}
      />
    </>
  );
}

export default function WarRoomScene3D(props: Props) {
  const touchDevice = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const pixelRatio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  return (
    <Canvas
      dpr={Math.min(pixelRatio, touchDevice ? 1.45 : 1.8)}
      shadows
      camera={{ position: [0, 3, 5], fov: 70, near: 0.08, far: 150 }}
      gl={{ antialias: !touchDevice, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping }}
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
        gl.toneMappingExposure = 1.12;
      }}
    >
      <WarRoomRuntimeScene {...props} />
    </Canvas>
  );
}
