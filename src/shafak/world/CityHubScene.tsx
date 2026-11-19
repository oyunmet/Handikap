import { Html, Sky } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import { createWorldMotion, type WorldMotion } from "./movement";
import {
  CITY_DOORS,
  findNearbyCityDoor,
  stepCityPosition,
  type CityDoor,
  type CityDoorId,
  type CityInput,
  type CityPosition,
} from "./city-hub-layout";
import { getCityCameraFrame, type CityCameraObstacle } from "./city-hub-camera";
import { CITY_RESIDENTS, CITY_RESIDENT_TINTS, type CityResident } from "./city-hub-residents";
import { getAnimatedRivalModelConfig, type OpponentModelConfig } from "./opponent-model-config";
import { getWorldBotProfileByArchetype } from "./world-bot-profiles";
import WorldV2Actor from "./WorldV2Actor";
import { KNIGHT_CONFIG } from "./knight-config";
import { loadAsset, type LoadedWorldAsset } from "./world-v2-assets";
import { WORLD_V2_CONFIG } from "./world-v2-config";
import type { EquipmentVisual } from "../game/store-types";

type CityHubSceneProps = {
  positionRef: MutableRefObject<CityPosition>;
  inputRef: MutableRefObject<CityInput>;
  activeDoorId: CityDoorId | null;
  onNearbyDoorChange: (door: CityDoor | null) => void;
  className?: string;
  pixelRatio?: number;
  reducedMotion?: boolean;
  playerAppearance?: EquipmentVisual;
};

const CITY_RESIDENT_MODEL_CONFIGS = CITY_RESIDENTS.map((resident) => {
  const profile = getWorldBotProfileByArchetype(resident.archetype);
  return getAnimatedRivalModelConfig(
    undefined,
    { ...profile, size: resident.scale },
    "world",
  ) as OpponentModelConfig;
});
const CITY_CAMERA_OBSTACLES: readonly CityCameraObstacle[] = CITY_DOORS.map((door) => ({
  x: door.building.x,
  z: door.building.z,
  width: door.width + 0.28,
  depth: door.depth + 0.48,
  height: door.height + 2.8,
}));

function RoadNetwork() {
  const roadColor = "#484a49";
  const stoneColor = "#a9a59a";
  const stripePositions = [-18, -13, -8, 8, 13, 18];
  const crosswalkPositions = [-4.75, -3.95, -3.15, -2.35, 2.35, 3.15, 3.95, 4.75];
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.08, 0]} receiveShadow>
        <planeGeometry args={[64, 64]} />
        <meshStandardMaterial color="#88866f" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[9, 64]} />
        <meshStandardMaterial color={roadColor} roughness={0.92} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.005, 0]} receiveShadow>
        <planeGeometry args={[64, 9]} />
        <meshStandardMaterial color={roadColor} roughness={0.92} />
      </mesh>
      {[-1, 1].flatMap((direction) => ([
        <mesh key={`sidewalk-x-${direction}`} position={[direction * 5.45, 0.04, 0]} receiveShadow>
          <boxGeometry args={[2, 0.18, 64]} />
          <meshStandardMaterial color={stoneColor} roughness={0.94} />
        </mesh>,
        <mesh key={`sidewalk-z-${direction}`} position={[0, 0.04, direction * 5.45]} receiveShadow>
          <boxGeometry args={[64, 0.18, 2]} />
          <meshStandardMaterial color={stoneColor} roughness={0.94} />
        </mesh>,
        <mesh key={`curb-x-${direction}`} position={[direction * 4.48, 0.13, 0]}>
          <boxGeometry args={[0.16, 0.24, 64]} />
          <meshStandardMaterial color="#d3c9b3" roughness={0.9} />
        </mesh>,
        <mesh key={`curb-z-${direction}`} position={[0, 0.13, direction * 4.48]}>
          <boxGeometry args={[64, 0.24, 0.16]} />
          <meshStandardMaterial color="#d3c9b3" roughness={0.9} />
        </mesh>,
      ]))}
      {stripePositions.map((position) => (
        <group key={`road-mark-${position}`}>
          <mesh position={[0, 0.018, position]}>
            <boxGeometry args={[0.12, 0.025, 2.2]} />
            <meshStandardMaterial color="#e1d8b7" roughness={0.8} />
          </mesh>
          <mesh position={[position, 0.018, 0]}>
            <boxGeometry args={[2.2, 0.025, 0.12]} />
            <meshStandardMaterial color="#e1d8b7" roughness={0.8} />
          </mesh>
        </group>
      ))}
      {crosswalkPositions.map((position) => (
        <group key={`crosswalk-${position}`}>
          <mesh position={[position, 0.02, -6.35]}>
            <boxGeometry args={[0.48, 0.035, 2.25]} />
            <meshStandardMaterial color="#eee7d5" roughness={0.75} />
          </mesh>
          <mesh position={[position, 0.02, 6.35]}>
            <boxGeometry args={[0.48, 0.035, 2.25]} />
            <meshStandardMaterial color="#eee7d5" roughness={0.75} />
          </mesh>
          <mesh position={[-6.35, 0.02, position]}>
            <boxGeometry args={[2.25, 0.035, 0.48]} />
            <meshStandardMaterial color="#eee7d5" roughness={0.75} />
          </mesh>
          <mesh position={[6.35, 0.02, position]}>
            <boxGeometry args={[2.25, 0.035, 0.48]} />
            <meshStandardMaterial color="#eee7d5" roughness={0.75} />
          </mesh>
        </group>
      ))}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 0]} receiveShadow>
        <circleGeometry args={[3.3, 48]} />
        <meshStandardMaterial color="#77796d" roughness={0.96} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.022, 0]}>
        <ringGeometry args={[2.65, 2.72, 48]} />
        <meshStandardMaterial color="#c8ae7d" roughness={0.75} />
      </mesh>
    </group>
  );
}

const BUILDING_WALL_COLORS: Record<CityDoor["id"], string> = {
  campaign: "#dcc8a3",
  "war-room": "#d99478",
  survival: "#b9c7a2",
  daily: "#91b7bd",
};

const BUILDING_ROOF_COLORS: Record<CityDoor["id"], string> = {
  campaign: "#765447",
  "war-room": "#72534a",
  survival: "#5f7060",
  daily: "#536d73",
};

function createGableShape(width: number, rise: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, rise);
  shape.closePath();
  return shape;
}

function Building({ door, active }: { door: CityDoor; active: boolean }) {
  const { x, z } = door.building;
  const gableShape = useMemo(() => createGableShape(door.depth, 1.5), [door.depth]);
  const frontX = door.side === "east" ? x + door.width / 2 : door.side === "west" ? x - door.width / 2 : x;
  const frontZ = door.side === "south" ? z + door.depth / 2 : door.side === "north" ? z - door.depth / 2 : z;
  const doorRotation = door.side === "east" || door.side === "west" ? Math.PI / 2 : 0;
  const windowPositions = door.side === "east" || door.side === "west"
    ? [[frontX, 2.45, z - 1.75], [frontX, 2.45, z + 1.75]]
    : [[x - 1.75, 2.45, frontZ], [x + 1.75, 2.45, frontZ]];

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, door.height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[door.width, door.height, door.depth]} />
        <meshStandardMaterial color={BUILDING_WALL_COLORS[door.id]} roughness={0.9} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={`${door.id}-gable-${side}`}
          position={[side * (door.width / 2 + 0.015), door.height, 0]}
          rotation-y={side > 0 ? Math.PI / 2 : -Math.PI / 2}
        >
          <shapeGeometry args={[gableShape]} />
          <meshStandardMaterial
            color={BUILDING_WALL_COLORS[door.id]}
            roughness={0.92}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      <mesh position={[-door.width / 4, door.height + 0.72, 0]} rotation-z={0.42} castShadow receiveShadow>
        <boxGeometry args={[door.width / 2 + 0.28, 0.18, door.depth + 0.48]} />
        <meshStandardMaterial color={BUILDING_ROOF_COLORS[door.id]} roughness={0.9} />
      </mesh>
      <mesh position={[door.width / 4, door.height + 0.72, 0]} rotation-z={-0.42} castShadow receiveShadow>
        <boxGeometry args={[door.width / 2 + 0.28, 0.18, door.depth + 0.48]} />
        <meshStandardMaterial color={BUILDING_ROOF_COLORS[door.id]} roughness={0.9} />
      </mesh>
      <mesh position={[-door.width / 4, door.height + 0.2, 0]}>
        <boxGeometry args={[0.14, 0.18, door.depth + 0.55]} />
        <meshStandardMaterial color="#d5c098" roughness={0.86} />
      </mesh>
      <mesh position={[door.width / 4, door.height + 0.2, 0]}>
        <boxGeometry args={[0.14, 0.18, door.depth + 0.55]} />
        <meshStandardMaterial color="#d5c098" roughness={0.86} />
      </mesh>
      <mesh position={[-door.width * 0.22, door.height + 1.26, -door.depth * 0.22]} castShadow>
        <boxGeometry args={[0.54, 1.45, 0.56]} />
        <meshStandardMaterial color="#9d8064" roughness={0.9} />
      </mesh>
      <mesh position={[-door.width * 0.22, door.height + 2, -door.depth * 0.22]}>
        <boxGeometry args={[0.68, 0.12, 0.7]} />
        <meshStandardMaterial color="#554b43" roughness={0.88} />
      </mesh>
      <mesh position={[0, door.height + 0.06, 0]}>
        <boxGeometry args={[door.width + 0.16, 0.18, door.depth + 0.16]} />
        <meshStandardMaterial color="#d5c098" roughness={0.8} />
      </mesh>
      <mesh
        position={[frontX - x + (door.side === "east" ? 0.06 : door.side === "west" ? -0.06 : 0), 1.25, frontZ - z]}
        rotation-y={doorRotation}
      >
        <boxGeometry args={[1.55, 2.5, 0.18]} />
        <meshStandardMaterial color={active ? door.color : "#493a32"} roughness={0.76} metalness={0.08} />
      </mesh>
      {windowPositions.map((position, index) => (
        <group
          key={`${door.id}-window-${index}`}
          position={[position[0] - x, position[1], position[2] - z]}
          rotation-y={doorRotation}
        >
          <mesh>
            <boxGeometry args={[1.1, 1.35, 0.12]} />
            <meshStandardMaterial color="#b9dce0" roughness={0.28} metalness={0.06} emissive="#b6d8d8" emissiveIntensity={0.09} />
          </mesh>
          <mesh position={[0, 0, 0.08]}>
            <boxGeometry args={[0.1, 1.42, 0.08]} />
            <meshStandardMaterial color="#e1cda9" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0, 0.09]}>
            <boxGeometry args={[1.15, 0.1, 0.08]} />
            <meshStandardMaterial color="#e1cda9" roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.76, 0.14]}>
            <boxGeometry args={[1.3, 0.12, 0.34]} />
            <meshStandardMaterial color="#e8d9bd" roughness={0.86} />
          </mesh>
        </group>
      ))}
      <mesh
        position={[frontX - x, 2.78, frontZ - z + (door.side === "south" ? 0.38 : door.side === "north" ? -0.38 : 0)]}
        rotation-y={doorRotation}
        castShadow
      >
        <boxGeometry args={[2.65, 0.16, 0.86]} />
        <meshStandardMaterial color={door.color} roughness={0.82} />
      </mesh>
      <mesh position={[frontX - x, 3.55, frontZ - z]} rotation-y={doorRotation} castShadow>
        <boxGeometry args={[3.25, 0.7, 0.2]} />
        <meshStandardMaterial color={door.color} roughness={0.74} />
      </mesh>
      <Html
        position={[0, 4.08, 0]}
        center
        distanceFactor={10}
        style={{ pointerEvents: "none" }}
      >
        <div className="city-world-sign" style={{ borderColor: door.color }}>
          <small>{door.category}</small>
          <strong>{door.title}</strong>
        </div>
      </Html>
      <mesh position={[door.entrance.x - x, 0.045, door.entrance.z - z]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.58, 0.68, 32]} />
        <meshBasicMaterial color={active ? door.color : "#d0b78d"} transparent opacity={active ? 0.95 : 0.58} />
      </mesh>
    </group>
  );
}

function StreetLamp({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.9, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.13, 3.8, 8]} />
        <meshStandardMaterial color="#343a3a" metalness={0.55} roughness={0.52} />
      </mesh>
      <mesh position={[0, 3.72, 0]}>
        <sphereGeometry args={[0.27, 12, 10]} />
        <meshStandardMaterial color="#ffe2a2" emissive="#ffc56e" emissiveIntensity={0.65} roughness={0.3} />
      </mesh>
    </group>
  );
}

function StreetTree({ x, z, variant }: { x: number; z: number; variant: number }) {
  const canopyColor = ["#587858", "#6e896c", "#78815d", "#4d716b"][variant % 4];
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.26, 0]} receiveShadow>
        <cylinderGeometry args={[0.74, 0.9, 0.5, 8]} />
        <meshStandardMaterial color="#a78f69" roughness={0.96} />
      </mesh>
      <mesh position={[0, 1.05, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.31, 1.5, 7]} />
        <meshStandardMaterial color="#70543f" roughness={0.93} />
      </mesh>
      <mesh position={[0, 2.15, 0]} scale={[1, 1.12, 1]} castShadow>
        <sphereGeometry args={[1.05, 10, 8]} />
        <meshStandardMaterial color={canopyColor} roughness={0.96} />
      </mesh>
      <mesh position={[0.48, 2.55, -0.14]} scale={[0.68, 0.75, 0.7]} castShadow>
        <sphereGeometry args={[0.84, 9, 7]} />
        <meshStandardMaterial color={canopyColor} roughness={0.96} />
      </mesh>
    </group>
  );
}

function Resident({
  resident,
  index,
  asset,
  motionRef,
  modelConfig,
}: {
  resident: CityResident;
  index: number;
  asset: LoadedWorldAsset;
  motionRef: MutableRefObject<WorldMotion>;
  modelConfig: OpponentModelConfig;
}) {
  return (
    <group position={[resident.x, 0, resident.z]}>
      <WorldV2Actor
        asset={asset}
        motionRef={motionRef}
        isPlayer={false}
        distance={-resident.z}
        x={resident.x}
        tint={CITY_RESIDENT_TINTS[index]}
        animationState="idle"
        localToParent
        showWeapon={false}
        modelConfig={modelConfig}
        cityAccessory={resident.accessory}
      />
    </group>
  );
}

function CityWorld({
  positionRef,
  inputRef,
  activeDoorId,
  onNearbyDoorChange,
  heroAsset,
  playerAppearance,
  residentAssets,
}: CityHubSceneProps & {
  heroAsset: LoadedWorldAsset | null;
  residentAssets: ReadonlyMap<string, LoadedWorldAsset>;
}) {
  const motionRef = useRef(createWorldMotion(
    -positionRef.current.z,
    positionRef.current.x / 5.2,
  ));
  const facingRef = useRef<CityPosition>({ x: 0, z: -1 });
  const playerMovingRef = useRef(false);
  const [playerMoving, setPlayerMoving] = useState(false);
  const lastDoorIdRef = useRef<CityDoorId | null>(null);
  const cameraTarget = useMemo(() => new THREE.Vector3(), []);
  const cameraPosition = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera }, delta) => {
    const previousX = positionRef.current.x;
    const previousZ = positionRef.current.z;
    const next = heroAsset
      ? stepCityPosition(positionRef.current, inputRef.current, delta)
      : { x: previousX, z: previousZ };
    if (!heroAsset) {
      inputRef.current.x = 0;
      inputRef.current.z = 0;
    }
    positionRef.current.x = next.x;
    positionRef.current.z = next.z;
    const motion = motionRef.current;
    const safeDelta = Math.max(delta, 1e-5);
    const velocityX = (next.x - previousX) / safeDelta;
    const velocityY = -(next.z - previousZ) / safeDelta;
    const speed = Math.hypot(velocityX, velocityY);
    const moving = speed > 0.12;
    motion.depth = next.x / 5.2;
    motion.distance = -next.z;
    motion.cameraX = 0;
    motion.velocityX = velocityX;
    motion.velocityY = velocityY;
    motion.jumpHeight = 0;
    motion.jumpVelocity = 0;
    motion.movementState = moving ? "KOŞUYOR" : "YERDE_DURUYOR";
    motion.movementMachine.state = motion.movementState;
    motion.stepPhase += speed * delta * 2.4;
    motion.stopTime = moving ? 0 : motion.stopTime + delta;
    motion.hasMoved ||= moving;
    if (moving) {
      motion.cameraHeading = Math.atan2(-velocityX, velocityY);
      motion.facing = velocityX < 0 ? -1 : 1;
      facingRef.current = { x: next.x - previousX, z: next.z - previousZ };
    }
    if (moving !== playerMovingRef.current) {
      playerMovingRef.current = moving;
      setPlayerMoving(moving);
    }

    const cameraFrame = getCityCameraFrame(next, facingRef.current, CITY_CAMERA_OBSTACLES);
    cameraPosition.set(
      cameraFrame.position.x,
      cameraFrame.position.y,
      cameraFrame.position.z,
    );
    if (cameraFrame.occluded) camera.position.copy(cameraPosition);
    else camera.position.lerp(cameraPosition, 1 - Math.exp(-delta * 4.2));
    cameraTarget.set(
      cameraFrame.target.x,
      cameraFrame.target.y,
      cameraFrame.target.z,
    );
    camera.lookAt(cameraTarget);

    const nearbyDoor = findNearbyCityDoor(next);
    const nextDoorId = nearbyDoor?.id ?? null;
    if (nextDoorId !== lastDoorIdRef.current) {
      lastDoorIdRef.current = nextDoorId;
      onNearbyDoorChange(nearbyDoor);
    }
  });

  return (
    <>
      <color attach="background" args={["#9ed5ed"]} />
      <fog attach="fog" args={["#c9e3e9", 34, 96]} />
      <Sky distance={450000} sunPosition={[42, 92, 32]} turbidity={5.8} rayleigh={1.7} mieCoefficient={0.003} mieDirectionalG={0.72} />
      <ambientLight intensity={0.9} color="#e5f2ed" />
      <hemisphereLight args={["#d8f0ff", "#9a896d", 1.25]} />
      <directionalLight
        position={[16, 30, 12]}
        intensity={2.25}
        color="#fff0d4"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={28}
        shadow-camera-bottom={-28}
      />

      <RoadNetwork />
      {CITY_DOORS.map((door) => <Building key={door.id} door={door} active={activeDoorId === door.id} />)}
      {[
        [-5.9, -5.9], [5.9, -5.9], [-5.9, 5.9], [5.9, 5.9],
        [-5.9, -14], [5.9, 14], [-14, -5.9], [14, 5.9],
      ].map(([x, z], index) => <StreetLamp key={`lamp-${index}`} x={x} z={z} />)}
      {[
        [-7, -8.6], [7, 8.6], [-8.2, 7], [8.2, -7],
        [-16, -7], [16, 7], [-7, 16], [7, -16],
      ].map(([x, z], index) => <StreetTree key={`tree-${index}`} x={x} z={z} variant={index} />)}

      {heroAsset && CITY_RESIDENTS.map((resident, index) => {
        const modelConfig = CITY_RESIDENT_MODEL_CONFIGS[index];
        const residentAsset = residentAssets.get(modelConfig.modelPath);
        if (!residentAsset) return null;
        return (
          <Resident
            key={`resident-${index}`}
            resident={resident}
            index={index}
            asset={residentAsset}
            motionRef={motionRef}
            modelConfig={modelConfig}
          />
        );
      })}
      {heroAsset && (
        <WorldV2Actor
          asset={heroAsset}
          motionRef={motionRef}
          isPlayer
          animationState={playerMoving ? "walk" : "idle"}
          showWeapon={Boolean(playerAppearance?.weaponStyle)}
          equipmentVisual={playerAppearance}
        />
      )}
    </>
  );
}

export default function CityHubScene(props: CityHubSceneProps) {
  const [heroAsset, setHeroAsset] = useState<LoadedWorldAsset | null>(null);
  const [residentAssets, setResidentAssets] = useState<ReadonlyMap<string, LoadedWorldAsset>>(() => new Map());
  const [modelLoadFailed, setModelLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    loadAsset(KNIGHT_CONFIG.modelPath, WORLD_V2_CONFIG.player).then((asset) => {
      if (active) setHeroAsset(asset);
    }).catch((error: unknown) => {
      console.error("[city-hub] Campaign character model failed to load.", error);
      if (active) setModelLoadFailed(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const modelPaths = [...new Set(CITY_RESIDENT_MODEL_CONFIGS.map((config) => config.modelPath))];
    void Promise.all(modelPaths.map(async (path) => {
      try {
        return [path, await loadAsset(path, WORLD_V2_CONFIG.player)] as const;
      } catch (error) {
        console.error(`[city-hub] Resident character model failed to load: ${path}`, error);
        return null;
      }
    })).then((entries) => {
      if (!active) return;
      setResidentAssets(new Map(entries.filter((entry): entry is readonly [string, LoadedWorldAsset] => entry !== null)));
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <Canvas
        className={props.className}
        shadows
        dpr={props.pixelRatio ?? 1}
        camera={{ position: [2.6, 5.2, 7.2], fov: 49, near: 0.1, far: 110 }}
        gl={{ antialias: true, powerPreference: "low-power" }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.18;
        }}
      >
        <CityWorld {...props} heroAsset={heroAsset} residentAssets={residentAssets} />
      </Canvas>
      {!heroAsset && !modelLoadFailed && (
        <div className="city-hub__model-loading" role="status">
          KAHRAMAN SAHNEYE ALINIYOR
        </div>
      )}
      {modelLoadFailed && (
        <div className="city-hub__model-error" role="alert">
          Şehir karakter modeli yüklenemedi. Sahne eksik görünebilir.
        </div>
      )}
    </>
  );
}
