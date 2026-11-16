import { Html, Sky } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import {
  CITY_DOORS,
  findNearbyCityDoor,
  stepCityPosition,
  type CityDoor,
  type CityDoorId,
  type CityInput,
  type CityPosition,
} from "./city-hub-layout";

type CityHubSceneProps = {
  positionRef: MutableRefObject<CityPosition>;
  inputRef: MutableRefObject<CityInput>;
  activeDoorId: CityDoorId | null;
  onNearbyDoorChange: (door: CityDoor | null) => void;
};

const RESIDENTS = [
  { x: -6.4, z: -3.4, axis: "x", skin: "#d8a47f", hair: "#332621", coat: "#596d78", scarf: "#bf7957", scale: 1.02, hat: false, bag: true },
  { x: 6.4, z: 3.2, axis: "z", skin: "#edc4a3", hair: "#4a3528", coat: "#72876d", scarf: "#d7b06a", scale: 0.91, hat: true, bag: false },
  { x: -3.2, z: -6.4, axis: "x", skin: "#a96f51", hair: "#241e20", coat: "#c16d51", scarf: "#e3c39a", scale: 0.97, hat: false, bag: false },
  { x: 3.1, z: -6.4, axis: "z", skin: "#f0c9a6", hair: "#a7603c", coat: "#586b91", scarf: "#e0b15d", scale: 1.09, hat: false, bag: true },
  { x: -6.3, z: 4.3, axis: "z", skin: "#c28761", hair: "#242027", coat: "#775978", scarf: "#c18e62", scale: 1.12, hat: true, bag: false },
  { x: 6.2, z: -3.5, axis: "x", skin: "#e4b28f", hair: "#3d3027", coat: "#d0a158", scarf: "#617b80", scale: 0.94, hat: false, bag: true },
  { x: -3.1, z: 6.3, axis: "x", skin: "#87593f", hair: "#201c1a", coat: "#507874", scarf: "#d17c59", scale: 0.89, hat: false, bag: false },
  { x: 3.2, z: 6.3, axis: "z", skin: "#f0cfb2", hair: "#67432f", coat: "#ab6557", scarf: "#d9bd83", scale: 1.05, hat: true, bag: false },
  { x: -12.4, z: -4.1, axis: "z", skin: "#d2a17e", hair: "#372a25", coat: "#737c89", scarf: "#c18d66", scale: 1.01, hat: false, bag: true },
  { x: 12.2, z: 4.3, axis: "x", skin: "#bb805f", hair: "#251f20", coat: "#a55f55", scarf: "#e2c982", scale: 0.95, hat: true, bag: false },
  { x: -4.4, z: -12.1, axis: "x", skin: "#e8bd9a", hair: "#72533d", coat: "#627a69", scarf: "#c87955", scale: 1.08, hat: false, bag: false },
  { x: 4.3, z: 12.1, axis: "z", skin: "#9e674c", hair: "#211d20", coat: "#826b9c", scarf: "#d5a85f", scale: 0.92, hat: false, bag: true },
] as const;

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

function Building({ door, active }: { door: CityDoor; active: boolean }) {
  const { x, z } = door.building;
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
        <meshStandardMaterial color={door.id === "war-room" ? "#6f5952" : door.id === "smithy" ? "#8b6c52" : "#a78d6b"} roughness={0.88} />
      </mesh>
      <mesh position={[0, door.height + 0.7, 0]} rotation-y={Math.PI / 4} castShadow>
        <coneGeometry args={[5.1, 1.8, 4]} />
        <meshStandardMaterial color={door.id === "war-room" ? "#554a47" : door.id === "weapons" ? "#607c83" : "#7b5947"} roughness={0.9} />
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
        <group key={`${door.id}-window-${index}`} position={[position[0] - x, position[1], position[2] - z]}>
          <mesh>
            <boxGeometry args={[1.1, 1.35, 0.12]} />
            <meshStandardMaterial color="#7da0a2" roughness={0.22} metalness={0.12} emissive="#688b91" emissiveIntensity={0.18} />
          </mesh>
          <mesh position={[0, 0, 0.08]}>
            <boxGeometry args={[0.1, 1.42, 0.08]} />
            <meshStandardMaterial color="#e1cda9" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0, 0.09]}>
            <boxGeometry args={[1.15, 0.1, 0.08]} />
            <meshStandardMaterial color="#e1cda9" roughness={0.8} />
          </mesh>
        </group>
      ))}
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

function Resident({ resident, index }: { resident: typeof RESIDENTS[number]; index: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const phase = index * 0.83;
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const time = clock.elapsedTime * 0.16 + phase;
    const stride = Math.sin(time) * 0.72;
    if (resident.axis === "x") {
      groupRef.current.position.set(resident.x + stride, 0, resident.z);
      groupRef.current.rotation.y = Math.cos(time) >= 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      groupRef.current.position.set(resident.x, 0, resident.z + stride);
      groupRef.current.rotation.y = Math.cos(time) >= 0 ? 0 : Math.PI;
    }
  });
  return (
    <group ref={groupRef} scale={resident.scale}>
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <cylinderGeometry args={[0.2, 0.23, 0.12, 8]} />
        <meshStandardMaterial color="#373a38" roughness={0.98} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.21, 0.62, 0.24]} />
        <meshStandardMaterial color="#47413c" roughness={0.92} />
      </mesh>
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[0.56, 0.8, 0.34]} />
        <meshStandardMaterial color={resident.coat} roughness={0.88} />
      </mesh>
      <mesh position={[0, 1.28, 0.19]}>
        <boxGeometry args={[0.38, 0.13, 0.035]} />
        <meshStandardMaterial color={resident.scarf} roughness={0.86} />
      </mesh>
      <mesh position={[-0.36, 1.05, 0]} rotation-z={-0.08} castShadow>
        <capsuleGeometry args={[0.105, 0.52, 3, 6]} />
        <meshStandardMaterial color={resident.coat} roughness={0.9} />
      </mesh>
      <mesh position={[0.36, 1.05, 0]} rotation-z={0.08} castShadow>
        <capsuleGeometry args={[0.105, 0.52, 3, 6]} />
        <meshStandardMaterial color={resident.coat} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.65, 0]} castShadow>
        <sphereGeometry args={[0.22, 12, 10]} />
        <meshStandardMaterial color={resident.skin} roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.77, -0.015]} castShadow>
        <sphereGeometry args={[0.225, 11, 8, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
        <meshStandardMaterial color={resident.hair} roughness={0.95} />
      </mesh>
      {resident.hat && (
        <mesh position={[0, 1.84, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.27, 0.16, 10]} />
          <meshStandardMaterial color={resident.scarf} roughness={0.9} />
        </mesh>
      )}
      {resident.bag && (
        <mesh position={[0, 0.99, -0.22]} castShadow>
          <boxGeometry args={[0.34, 0.45, 0.22]} />
          <meshStandardMaterial color="#806044" roughness={0.95} />
        </mesh>
      )}
    </group>
  );
}

function CityWorld({
  positionRef,
  inputRef,
  activeDoorId,
  onNearbyDoorChange,
}: CityHubSceneProps) {
  const playerRef = useRef<THREE.Group>(null);
  const lastDoorIdRef = useRef<CityDoorId | null>(null);
  const cameraTarget = useMemo(() => new THREE.Vector3(), []);
  const cameraPosition = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera, clock }, delta) => {
    const next = stepCityPosition(positionRef.current, inputRef.current, delta);
    positionRef.current.x = next.x;
    positionRef.current.z = next.z;

    if (playerRef.current) {
      playerRef.current.position.set(next.x, 0, next.z);
      if (Math.hypot(inputRef.current.x, inputRef.current.z) > 0.12) {
        playerRef.current.rotation.y = Math.atan2(inputRef.current.x, inputRef.current.z);
      }
      playerRef.current.position.y = Math.sin(clock.elapsedTime * 10) * 0.035
        * Math.min(1, Math.hypot(inputRef.current.x, inputRef.current.z));
    }

    cameraPosition.set(next.x + 5.2, 7.2, next.z + 9.4);
    camera.position.lerp(cameraPosition, 1 - Math.exp(-delta * 3.2));
    cameraTarget.set(next.x, 1.15, next.z - 1.25);
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
      <color attach="background" args={["#a9c9d5"]} />
      <fog attach="fog" args={["#b4c9cb", 27, 80]} />
      <Sky distance={450000} sunPosition={[70, 18, 45]} turbidity={9} rayleigh={1.05} mieCoefficient={0.004} mieDirectionalG={0.78} />
      <ambientLight intensity={0.72} color="#dce8e2" />
      <hemisphereLight args={["#d8e9f4", "#786754", 1.1]} />
      <directionalLight
        position={[12, 19, 7]}
        intensity={2.05}
        color="#ffe1ba"
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

      {RESIDENTS.map((resident, index) => (
        <Resident key={`resident-${index}`} resident={resident} index={index} />
      ))}

      <group ref={playerRef}>
        <mesh position={[0, 0.12, 0]} receiveShadow>
          <cylinderGeometry args={[0.33, 0.4, 0.08, 20]} />
          <meshBasicMaterial color="#182029" transparent opacity={0.26} />
        </mesh>
        <mesh position={[0, 1.05, 0]} castShadow>
          <capsuleGeometry args={[0.34, 0.66, 5, 9]} />
          <meshStandardMaterial color="#283b49" roughness={0.78} />
        </mesh>
        <mesh position={[0, 1.18, 0.29]}>
          <boxGeometry args={[0.36, 0.14, 0.05]} />
          <meshStandardMaterial color="#cf8655" roughness={0.76} />
        </mesh>
        <mesh position={[0, 1.83, 0]} castShadow>
          <sphereGeometry args={[0.25, 16, 12]} />
          <meshStandardMaterial color="#cc9976" roughness={0.82} />
        </mesh>
        <mesh position={[0, 1.96, -0.02]} castShadow>
          <sphereGeometry args={[0.25, 12, 9, 0, Math.PI * 2, 0, Math.PI * 0.48]} />
          <meshStandardMaterial color="#302723" roughness={0.94} />
        </mesh>
        <mesh position={[0, 1.64, -0.12]} castShadow>
          <boxGeometry args={[0.67, 0.62, 0.2]} />
          <meshStandardMaterial color="#4c3b34" roughness={0.93} />
        </mesh>
      </group>
    </>
  );
}

export default function CityHubScene(props: CityHubSceneProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.35]}
      camera={{ position: [5.2, 7.2, 9.4], fov: 49, near: 0.1, far: 110 }}
      gl={{ antialias: true, powerPreference: "low-power" }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.08;
      }}
    >
      <CityWorld {...props} />
    </Canvas>
  );
}
