import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import {
  WAR_ROOM_BLOCKERS,
  WAR_ROOM_WEAPON_BY_ID,
  type WarRoomWeaponId,
} from "../game/war-room-data";
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

type Props = {
  runtimeRef: MutableRefObject<WarRoomRuntime>;
  inputRef: MutableRefObject<WarRoomInputState>;
  weaponIds: readonly [WarRoomWeaponId, WarRoomWeaponId];
  onHudUpdate: (snapshot: WarRoomHudSnapshot) => void;
  onFinish: (result: "victory" | "defeat", snapshot: WarRoomHudSnapshot) => void;
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

function FloorPaving() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.PlaneGeometry(7.92, 7.92), []);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.96, metalness: 0 }),
    [],
  );
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

  return <instancedMesh ref={meshRef} args={[geometry, material, tiles.length]} receiveShadow />;
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
      <color attach="background" args={["#98664e"]} />
      <fog attach="fog" args={["#98664e", 45, 104]} />
      <ambientLight intensity={0.62} color="#ffd4ad" />
      <hemisphereLight args={["#ffd6ab", "#38251f", 1.1]} />
      <directionalLight
        position={[-24, 32, 18]}
        color="#ffd09a"
        intensity={3.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-42}
        shadow-camera-right={42}
        shadow-camera-top={42}
        shadow-camera-bottom={-42}
        shadow-bias={-0.0004}
      />
      <pointLight position={[-26, 3, -21]} color="#ff8a48" intensity={8} distance={15} />
      <pointLight position={[27, 3, 18]} color="#ff9b4f" intensity={6} distance={13} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]} receiveShadow>
        <planeGeometry args={[72, 72, 1, 1]} />
        <meshStandardMaterial color="#796653" roughness={0.96} />
      </mesh>
      <FloorPaving />
      {WAR_ROOM_BLOCKERS.map((blocker) => (
        <group key={blocker.id}>
          <mesh
            position={[blocker.x, blocker.height / 2, blocker.z]}
            castShadow
            receiveShadow
            userData={{ warRoomBlocker: blocker.id }}
          >
            <boxGeometry args={[blocker.width, blocker.height, blocker.depth]} />
            <meshStandardMaterial
              color={blocker.color}
              roughness={blocker.kind === "cover" ? 0.9 : 0.78}
              metalness={blocker.kind === "tower" ? 0.04 : 0}
            />
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
          {blocker.kind === "cover" && (
            <mesh
              position={[blocker.x, blocker.height + 0.04, blocker.z]}
              rotation={[0, Math.PI / 4, 0]}
              castShadow
            >
              <boxGeometry args={[0.16, 0.12, Math.min(blocker.width, blocker.depth) * 0.72]} />
              <meshStandardMaterial color="#bd8a57" roughness={0.86} />
            </mesh>
          )}
        </group>
      ))}
      <WallDetails />
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

function WeaponModel({ weaponId }: { weaponId: WarRoomWeaponId }) {
  const weapon = WAR_ROOM_WEAPON_BY_ID.get(weaponId)!;
  const crossbow = weaponId === "crossbow";
  const bow = weaponId === "longbow";
  const sidearm = weaponId === "sidearm";
  const shotgun = weaponId === "scattergun";
  const barrelLength = sidearm ? 0.38 : shotgun ? 0.86 : crossbow || bow ? 0.55 : 0.98;
  const bodyWidth = crossbow ? 0.72 : bow ? 0.15 : sidearm ? 0.25 : 0.3;
  return (
    <group name={`war-room-weapon:${weapon.id}`} position={[0, 0, 0]}>
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
          <mesh position={[0, 0.03, -0.25 - barrelLength * 0.48]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[sidearm ? 0.035 : 0.055, sidearm ? 0.045 : 0.075, barrelLength, 8]} />
            <meshStandardMaterial color="#64645c" metalness={0.68} roughness={0.34} />
          </mesh>
        </>
      )}
      <mesh name="weapon-muzzle" position={[0, 0.03, -0.25 - barrelLength]} scale={0.08} visible={false}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshBasicMaterial color={weapon.color} toneMapped={false} />
      </mesh>
    </group>
  );
}

function PlayerActor({
  runtimeRef,
  weaponId,
  rootRef,
}: {
  runtimeRef: MutableRefObject<WarRoomRuntime>;
  weaponId: WarRoomWeaponId;
  rootRef: MutableRefObject<THREE.Group | null>;
}) {
  const recoilRef = useRef<THREE.Group>(null);
  const muzzleRef = useRef<THREE.Mesh>(null);
  const weaponMuzzleDepth = weaponId === "sidearm" ? 0.55
    : weaponId === "scattergun" ? 1.03
      : weaponId === "crossbow" ? 0.72
        : weaponId === "longbow" ? 0.58 : 1.15;
  const armorMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#47575a", metalness: 0.48, roughness: 0.48 }),
    [],
  );
  useFrame((frame, delta) => {
    const player = runtimeRef.current.player;
    const root = rootRef.current;
    if (root) {
      root.position.set(player.x, player.jumpHeight, player.z);
      root.rotation.y = shortestLerp(root.rotation.y, player.yaw, 13, delta);
      root.scale.y = player.crouched ? 0.78 : 1;
    }
    const elapsed = player.clockTime;
    if (muzzleRef.current) muzzleRef.current.visible = player.shotFlashUntil > elapsed;
    if (recoilRef.current) {
      const recoil = Math.max(0, player.recoil - delta * 0.36);
      player.recoil = recoil;
      recoilRef.current.rotation.x = -recoil * 0.72;
      recoilRef.current.position.z = recoil * 0.6;
    }
  });
  return (
    <group ref={rootRef} name="war-room-player">
      <mesh position={[0, 0.16, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.34, 0.32, 10]} />
        <meshStandardMaterial color="#3b302b" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.93, 0]} castShadow material={armorMaterial}>
        <boxGeometry args={[0.72, 0.9, 0.38]} />
      </mesh>
      <mesh position={[0, 1.55, 0]} castShadow>
        <sphereGeometry args={[0.29, 12, 9]} />
        <meshStandardMaterial color="#8d7560" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.73, -0.02]} castShadow>
        <boxGeometry args={[0.58, 0.18, 0.56]} />
        <meshStandardMaterial color="#a17a50" metalness={0.24} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.99, 0.22]} castShadow>
        <boxGeometry args={[0.48, 0.62, 0.2]} />
        <meshStandardMaterial color="#655141" roughness={0.91} />
      </mesh>
      <mesh position={[0, 1.43, 0.26]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.68, 8]} />
        <meshStandardMaterial color="#a4855d" roughness={0.88} />
      </mesh>
      <mesh position={[-0.12, 1.0, 0.34]} rotation={[0, 0, -0.28]} castShadow>
        <boxGeometry args={[0.075, 0.58, 0.04]} />
        <meshStandardMaterial color="#b18a58" roughness={0.82} />
      </mesh>
      <mesh position={[0.12, 1.0, 0.34]} rotation={[0, 0, 0.28]} castShadow>
        <boxGeometry args={[0.075, 0.58, 0.04]} />
        <meshStandardMaterial color="#b18a58" roughness={0.82} />
      </mesh>
      <mesh position={[0, 1.16, -0.22]} castShadow>
        <boxGeometry args={[0.35, 0.36, 0.045]} />
        <meshStandardMaterial color="#a83f34" roughness={0.88} />
      </mesh>
      <mesh position={[0.5, 0.96, -0.16]} rotation={[0.18, 0, -0.24]} castShadow material={armorMaterial}>
        <capsuleGeometry args={[0.12, 0.42, 3, 6]} />
      </mesh>
      <mesh position={[-0.42, 0.96, -0.11]} rotation={[0.22, 0, 0.2]} castShadow material={armorMaterial}>
        <capsuleGeometry args={[0.12, 0.42, 3, 6]} />
      </mesh>
      <mesh position={[-0.16, 0.36, 0.02]} castShadow>
        <capsuleGeometry args={[0.14, 0.47, 3, 6]} />
        <meshStandardMaterial color="#414448" roughness={0.9} />
      </mesh>
      <mesh position={[0.16, 0.36, 0.02]} castShadow>
        <capsuleGeometry args={[0.14, 0.47, 3, 6]} />
        <meshStandardMaterial color="#414448" roughness={0.9} />
      </mesh>
      <group name="war-room-right-hand" position={[0.7, 1.24, -0.36]}>
        <mesh position={[0, 0, -0.04]}>
          <sphereGeometry args={[0.11, 8, 6]} />
          <meshStandardMaterial color="#94775d" roughness={0.88} />
        </mesh>
        <group ref={recoilRef} position={[0, 0.03, -0.08]} scale={[1.32, 1.32, 1.25]}>
          <WeaponModel weaponId={weaponId} />
          <mesh ref={muzzleRef} name="weapon-muzzle-flash" position={[0, 0.06, -weaponMuzzleDepth]} visible={false}>
            <sphereGeometry args={[0.2, 8, 6]} />
            <meshBasicMaterial color="#ffe19a" toneMapped={false} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function EnemyActor({
  enemy,
  index,
  groupRefs,
}: {
  enemy: WarRoomEnemy;
  index: number;
  groupRefs: MutableRefObject<Array<THREE.Group | null>>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
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
    group.visible = enemy.alive;
    if (materialRef.current) {
      materialRef.current.emissive.set(enemy.commander ? "#7b231d" : "#51382c");
      materialRef.current.emissiveIntensity = enemy.hitUntil > gameNow ? 0.62 : enemy.commander ? 0.18 : 0.04;
    }
  });
  return (
    <group
      ref={(node) => {
        groupRef.current = node;
        groupRefs.current[index] = node;
      }}
      name={`war-room-enemy:${enemy.id}`}
      userData={{ enemyIndex: index }}
    >
      {enemy.commander && (
        <mesh position={[0, 2.55, 0]}>
          <coneGeometry args={[0.24, 0.45, 5]} />
          <meshBasicMaterial color="#ff433a" toneMapped={false} />
        </mesh>
      )}
      <mesh position={[0, 0.76, 0]} castShadow>
        <capsuleGeometry args={[enemy.commander ? 0.27 : 0.24, enemy.commander ? 0.75 : 0.58, 3, 7]} />
        <meshStandardMaterial
          ref={materialRef}
          color={enemy.commander ? "#843630" : "#504847"}
          metalness={enemy.commander ? 0.4 : 0.28}
          roughness={0.72}
        />
      </mesh>
      <mesh position={[0, 1.53, 0]} castShadow name={`enemy-head:${index}`} userData={{ enemyIndex: index, enemyHead: true }}>
        <sphereGeometry args={[enemy.commander ? 0.24 : 0.2, 10, 8]} />
        <meshStandardMaterial color={enemy.commander ? "#9f4c3d" : "#90735d"} roughness={0.88} />
      </mesh>
      <mesh position={[0, 1.12, -0.18]} castShadow>
        <boxGeometry args={enemy.commander ? [0.42, 0.5, 0.06] : [0.32, 0.42, 0.045]} />
        <meshStandardMaterial color={enemy.commander ? "#c13d34" : "#866044"} roughness={0.86} />
      </mesh>
      <mesh position={[0.32, 0.79, -0.13]} rotation={[0.2, 0, -0.24]} castShadow>
        <capsuleGeometry args={[0.09, 0.35, 2, 5]} />
        <meshStandardMaterial color="#51483e" metalness={0.26} roughness={0.8} />
      </mesh>
      <group position={[0.34, 1.0, -0.28]} rotation={[0.02, 0, 0]}>
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

function getEnemyIndex(object: THREE.Object3D): number | null {
  let node: THREE.Object3D | null = object;
  while (node) {
    const index = node.userData.enemyIndex;
    if (typeof index === "number") return index;
    node = node.parent;
  }
  return null;
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
  onHudUpdate,
  onFinish,
}: Props) {
  const { camera, scene } = useThree();
  const perspective = camera as THREE.PerspectiveCamera;
  const enemyGroupRefs = useRef<Array<THREE.Group | null>>([]);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);
  const cameraStart = useMemo(() => new THREE.Vector3(), []);
  const cameraDesired = useMemo(() => new THREE.Vector3(), []);
  const cameraLook = useMemo(() => new THREE.Vector3(), []);
  const playerRootRef = useRef<THREE.Group | null>(null);
  const lastHudAtRef = useRef(0);
  const finishedRef = useRef(false);
  const linesRef = useRef<THREE.Line[]>([]);

  const removeLine = (line: THREE.Line) => {
    scene.remove(line);
    line.geometry.dispose();
    const material = line.material;
    if (Array.isArray(material)) material.forEach((item) => item.dispose());
    else material.dispose();
  };

  const addTracer = (start: THREE.Vector3, end: THREE.Vector3, color: string, now: number) => {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.82, depthWrite: false });
    const line = new THREE.Line(geometry, material);
    line.userData.warRoomExpiresAt = now + 0.12;
    line.frustumCulled = false;
    scene.add(line);
    linesRef.current.push(line);
    while (linesRef.current.length > 18) removeLine(linesRef.current.shift()!);
  };

  const getAimHit = (x: number, y: number, range: number) => {
    raycaster.setFromCamera(ndc.set(x, y), perspective);
    raycaster.far = range;
    const groups = enemyGroupRefs.current.filter((group): group is THREE.Group => Boolean(group));
    if (!groups.length) return null;
    const intersections = raycaster.intersectObjects(groups, true);
    for (const hit of intersections) {
      const index = getEnemyIndex(hit.object);
      if (index === null || !runtimeRef.current.enemies[index]?.alive) continue;
      const blockedAt = segmentBlockFraction(
        { x: raycaster.ray.origin.x, y: raycaster.ray.origin.y, z: raycaster.ray.origin.z },
        { x: hit.point.x, y: hit.point.y, z: hit.point.z },
      );
      if (blockedAt !== null && blockedAt < 0.985) continue;
      return { enemy: runtimeRef.current.enemies[index], index, point: hit.point, headshot: Boolean(hit.object.userData.enemyHead) };
    }
    return null;
  };

  const fireWeapon = (now: number, charge = 1) => {
    const runtime = runtimeRef.current;
    const player = runtime.player;
    const weaponId = weaponIds[player.activeSlot];
    const weapon = WAR_ROOM_WEAPON_BY_ID.get(weaponId)!;
    const ammo = player.ammo[weaponId];
    if (!ammo || ammo.magazine <= 0) {
      player.lastHitText = "CEPHANE BİTTİ · YENİDEN DOLDUR";
      player.hitMessageUntil = now + 1.1;
      return;
    }
    if (now < player.nextShotAt || player.reloadingWeapon) return;
    player.nextShotAt = now + weapon.fireInterval;
    ammo.magazine -= 1;
    player.shots += 1;
    player.lastHitDamage = 0;
    player.hitMarkerUntil = 0;
    player.hitMarkerHeadshot = false;
    player.shotFlashUntil = now + 0.07;
    player.recoil = Math.min(0.17, player.recoil + weapon.recoil);

    const pellets = weapon.pellets ?? 1;
    const spread = weapon.spread + player.recoil * 0.18;
    let shotHit = false;
    let shotHeadshot = false;
    const muzzle = new THREE.Vector3(
      player.x + Math.cos(player.yaw) * 0.38 + Math.sin(player.yaw) * 0.25,
      1.36 + player.jumpHeight,
      player.z - Math.sin(player.yaw) * 0.38 + Math.cos(player.yaw) * 0.25,
    );
    const tracerEnd = new THREE.Vector3();
    const chargeMultiplier = weapon.charge ? 0.65 + charge * 0.55 : 1;
    for (let pellet = 0; pellet < pellets; pellet += 1) {
      const spreadX = (nextWarRoomRandom(runtime) - 0.5) * spread;
      const spreadY = (nextWarRoomRandom(runtime) - 0.5) * spread;
      const aimed = getAimHit(spreadX, spreadY, weapon.range);
      if (aimed) {
        const damage = applyWarRoomDamage(
          aimed.enemy,
          weapon.damage * chargeMultiplier,
          aimed.headshot ? weapon.headshotMultiplier : 1,
        );
        aimed.enemy.hitUntil = now + 0.14;
        shotHit = true;
        shotHeadshot ||= aimed.headshot;
        player.lastHitDamage += damage.damage;
        player.lastHitText = `${aimed.enemy.name} · −${damage.damage}${aimed.headshot ? " · KAFA" : ""}`;
        player.hitMessageUntil = now + 0.72;
        player.hitMarkerUntil = now + 0.18;
        player.hitMarkerHeadshot = aimed.headshot;
        if (damage.killed) {
          aimed.enemy.alive = false;
          player.kills += 1;
          if (aimed.headshot) player.headshots += 1;
          player.killFeed = [
            { id: now * 1000 + player.kills, text: `Yolcu  →  ${aimed.enemy.name}${aimed.headshot ? " · KAFA" : ""}` },
            ...player.killFeed,
          ].slice(0, 4);
        }
        tracerEnd.copy(aimed.point);
        for (let spark = 0; spark < 3; spark += 1) {
          const flicker = new THREE.Vector3(
            (nextWarRoomRandom(runtime) - 0.5) * 0.3,
            nextWarRoomRandom(runtime) * 0.22,
            (nextWarRoomRandom(runtime) - 0.5) * 0.3,
          );
          addTracer(aimed.point, aimed.point.clone().add(flicker), "#ffe2a2", now);
        }
      } else {
        direction.set(0, 0, -1).applyQuaternion(perspective.quaternion).normalize();
        tracerEnd.copy(raycaster.ray.origin).addScaledVector(raycaster.ray.direction, Math.min(weapon.range, 34));
      }
      if (pellet === 0 || aimed) addTracer(muzzle, tracerEnd, weapon.color, now);
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
      const target = new THREE.Vector3(player.x, player.jumpHeight + 1.15, player.z);
      addTracer(muzzle, target, "#f36e54", now);
      if (nextWarRoomRandom(runtime) > (enemy.commander ? 0.25 : 0.38)) {
        const hit = applyWarRoomDamage(player, enemy.damage);
        if (hit.damage > 0) {
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

    for (const line of [...linesRef.current]) {
      if (Number(line.userData.warRoomExpiresAt ?? 0) <= now) {
        removeLine(line);
        linesRef.current.splice(linesRef.current.indexOf(line), 1);
      }
    }

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
      player.jumpHeight + (player.crouched ? 1.18 : 1.48) + cameraForwardY * 10,
      player.z + cameraForwardZ * 10,
    );
    camera.lookAt(cameraLook);
    scene.updateMatrixWorld(true);

    const aim = getAimHit(0, 0, aimDistance);
    player.targetId = aim?.enemy.id ?? null;

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
      <group userData={{ runtime }}>
        {runtime.enemies.map((enemy, index) => (
          <EnemyActor
            key={enemy.id}
            enemy={enemy}
            index={index}
            groupRefs={enemyGroupRefs}
          />
        ))}
      </group>
      <PlayerActor runtimeRef={runtimeRef} weaponId={activeWeapon} rootRef={playerRootRef} />
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
