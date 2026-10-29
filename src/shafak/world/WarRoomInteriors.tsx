import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { WarRoomBuilding } from "../game/war-room-data";
import { getWarRoomInteriorStyle } from "../game/war-room-interior-layout";
import type { ShaderMaterial } from "three";

const TV_VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const TV_FRAGMENT_SHADER = `
  precision highp float;
  uniform float uTime;
  uniform float uSeed;
  varying vec2 vUv;

  float ridge(float x, float speed, float seed) {
    return 0.30
      + 0.08 * sin(x * 9.0 + seed * 13.0 + uTime * speed)
      + 0.045 * sin(x * 21.0 - seed * 5.0 - uTime * speed * 0.64);
  }

  void main() {
    vec2 uv = vUv;
    float phase = uTime * 0.26 + uSeed * 6.28318;
    vec3 skyTop = mix(vec3(0.025, 0.055, 0.14), vec3(0.15, 0.20, 0.34), uv.y);
    vec3 skyLow = vec3(0.88, 0.32, 0.13);
    vec3 color = mix(skyLow, skyTop, smoothstep(0.18, 0.94, uv.y));

    float sunX = 0.5 + 0.31 * sin(phase * 0.74);
    float sunY = 0.64 + 0.05 * cos(phase * 1.13);
    float sunDistance = distance(uv, vec2(sunX, sunY));
    float sun = 1.0 - smoothstep(0.105, 0.113, sunDistance);
    float sunGlow = 1.0 - smoothstep(0.10, 0.42, sunDistance);
    color += vec3(0.92, 0.37, 0.08) * sunGlow * 0.4;
    color = mix(color, vec3(1.0, 0.76, 0.39), sun);

    float farRidge = ridge(uv.x, 0.08, uSeed);
    float nearRidge = ridge(uv.x + uTime * 0.012, -0.13, uSeed + 0.48) - 0.10;
    color = mix(color, vec3(0.25, 0.28, 0.38), 1.0 - smoothstep(farRidge - 0.008, farRidge + 0.008, uv.y));
    color = mix(color, vec3(0.105, 0.19, 0.23), 1.0 - smoothstep(nearRidge - 0.008, nearRidge + 0.008, uv.y));

    float waterLine = 0.19 + 0.012 * sin(uv.x * 28.0 + uTime * 2.2 + uSeed);
    float water = 1.0 - smoothstep(waterLine - 0.006, waterLine + 0.006, uv.y);
    float reflection = (0.35 + 0.65 * sin(uv.x * 90.0 + uTime * 6.0)) * exp(-abs(uv.y - 0.20) * 13.0);
    color = mix(color, vec3(0.08, 0.19, 0.26) + vec3(0.38, 0.16, 0.06) * reflection, water);

    float broadcastBar = 1.0 - smoothstep(0.018, 0.024, abs(uv.y - 0.075));
    float ticker = 0.70 + 0.30 * step(0.5, fract((uv.x + uTime * 0.08) * 8.0));
    color = mix(color, vec3(0.92, 0.78, 0.54) * ticker, broadcastBar);
    float scanline = 0.97 + 0.03 * sin(uv.y * 510.0 + uTime * 7.0);
    color *= scanline;
    gl_FragColor = vec4(color, 1.0);
  }
`;

function AnimatedTVScreen({ seed }: { seed: number }) {
  const material = useRef<ShaderMaterial | null>(null);

  useFrame(({ clock }) => {
    if (material.current) material.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh position={[0, 0.84, 0.103]}>
      <planeGeometry args={[1.02, 0.575]} />
      <shaderMaterial
        ref={material}
        uniforms={{ uTime: { value: 0 }, uSeed: { value: seed } }}
        vertexShader={TV_VERTEX_SHADER}
        fragmentShader={TV_FRAGMENT_SHADER}
        toneMapped={false}
      />
    </mesh>
  );
}

function Rug({
  position,
  width,
  depth,
  base,
  accent,
  pattern = 0,
}: {
  position: readonly [number, number, number];
  width: number;
  depth: number;
  base: string;
  accent: string;
  pattern?: number;
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.018, 0]} receiveShadow>
        <boxGeometry args={[width, 0.035, depth]} />
        <meshStandardMaterial color={base} roughness={0.96} />
      </mesh>
      <mesh position={[0, 0.039, 0]}>
        <boxGeometry args={[width - 0.16, 0.009, depth - 0.16]} />
        <meshStandardMaterial color={accent} roughness={0.94} />
      </mesh>
      <mesh position={[0, 0.046, 0]}>
        <boxGeometry args={[width - 0.3, 0.01, depth - 0.3]} />
        <meshStandardMaterial color={base} roughness={0.95} />
      </mesh>
      {Array.from({ length: 5 }, (_, index) => (
        <mesh
          key={`rug-motif-${index}`}
          position={[
            (index - 2) * (width - 0.52) / 4,
            0.054,
            pattern % 2 === 0 ? 0 : (index % 2 === 0 ? -0.24 : 0.24),
          ]}
          rotation={[0, pattern % 2 === 0 ? 0 : Math.PI / 4, 0]}
        >
          <boxGeometry args={[0.11, 0.008, 0.11]} />
          <meshStandardMaterial color={accent} roughness={0.9} />
        </mesh>
      ))}
      {[-1, 1].flatMap((side) => Array.from({ length: 4 }, (_, index) => (
        <mesh
          key={`rug-fringe-${side}-${index}`}
          position={[side * (width / 2 + 0.035), 0.02, (index - 1.5) * depth / 5]}
        >
          <boxGeometry args={[0.09, 0.018, 0.035]} />
          <meshStandardMaterial color={accent} roughness={0.95} />
        </mesh>
      )))}
    </group>
  );
}

function Sofa({
  position,
  rotation,
  wood,
  upholstery,
  cushion,
  accent,
}: {
  position: readonly [number, number, number];
  rotation: number;
  wood: string;
  upholstery: string;
  cushion: string;
  accent: string;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.25, -0.04]} castShadow>
        <boxGeometry args={[2.25, 0.3, 0.82]} />
        <meshStandardMaterial color={wood} roughness={0.84} />
      </mesh>
      {[-0.88, 0.88].map((x) => [-0.31, 0.25].map((z) => (
        <mesh key={`sofa-leg-${x}-${z}`} position={[x, 0.115, z]} castShadow>
          <boxGeometry args={[0.12, 0.25, 0.13]} />
          <meshStandardMaterial color={wood} roughness={0.82} />
        </mesh>
      )))}
      <mesh position={[0, 0.55, -0.32]} castShadow>
        <boxGeometry args={[2.2, 0.72, 0.22]} />
        <meshStandardMaterial color={upholstery} roughness={0.88} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={`sofa-arm-${side}`} position={[side * 1.06, 0.46, 0.02]} castShadow>
          <boxGeometry args={[0.2, 0.5, 0.84]} />
          <meshStandardMaterial color={upholstery} roughness={0.88} />
        </mesh>
      ))}
      {[-0.68, 0, 0.68].map((x, index) => (
        <group key={`sofa-seat-${index}`}>
          <mesh position={[x, 0.47, 0.13]} castShadow>
            <boxGeometry args={[0.65, 0.2, 0.58]} />
            <meshStandardMaterial color={cushion} roughness={0.92} />
          </mesh>
          <mesh position={[x, 0.75, -0.22]} castShadow>
            <boxGeometry args={[0.64, 0.47, 0.16]} />
            <meshStandardMaterial color={upholstery} roughness={0.9} />
          </mesh>
          <mesh position={[x, 0.571, 0.135]}>
            <boxGeometry args={[0.5, 0.012, 0.012]} />
            <meshStandardMaterial color={accent} roughness={0.84} />
          </mesh>
        </group>
      ))}
      <mesh position={[-0.74, 0.77, -0.08]} rotation={[0.08, 0, -0.12]} castShadow>
        <boxGeometry args={[0.34, 0.34, 0.14]} />
        <meshStandardMaterial color={accent} roughness={0.94} />
      </mesh>
    </group>
  );
}

function TVAndConsole({
  position,
  wood,
  metal,
  seed,
}: {
  position: readonly [number, number, number];
  wood: string;
  metal: string;
  seed: number;
}) {
  return (
    <group position={position} rotation={[0, Math.PI, 0]}>
      <mesh position={[0, 0.47, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.48, 0.43, 0.46]} />
        <meshStandardMaterial color={wood} roughness={0.74} />
      </mesh>
      {[-0.55, 0.55].map((x) => (
        <mesh key={`console-door-${x}`} position={[x, 0.47, 0.236]}>
          <boxGeometry args={[0.47, 0.32, 0.025]} />
          <meshStandardMaterial color={metal} roughness={0.72} metalness={0.18} />
        </mesh>
      ))}
      {[-0.52, 0.52].map((x) => (
        <mesh key={`console-leg-${x}`} position={[x, 0.13, 0]} castShadow>
          <boxGeometry args={[0.085, 0.27, 0.32]} />
          <meshStandardMaterial color={wood} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 0.84, -0.035]} castShadow>
        <boxGeometry args={[1.3, 0.78, 0.16]} />
        <meshStandardMaterial color="#171b20" roughness={0.35} metalness={0.22} />
      </mesh>
      <mesh position={[0, 0.84, 0.055]}>
        <boxGeometry args={[1.18, 0.66, 0.035]} />
        <meshStandardMaterial color="#090e13" roughness={0.22} metalness={0.12} />
      </mesh>
      <AnimatedTVScreen seed={seed} />
      <mesh position={[0.54, 0.39, 0.257]}>
        <sphereGeometry args={[0.025, 8, 6]} />
        <meshStandardMaterial color="#ed593a" emissive="#ff4d2c" emissiveIntensity={0.65} />
      </mesh>
      <mesh position={[0.38, 1.26, -0.035]} castShadow>
        <boxGeometry args={[0.09, 0.14, 0.1]} />
        <meshStandardMaterial color="#20262b" roughness={0.36} />
      </mesh>
    </group>
  );
}

function Bed({
  position,
  rotation,
  wood,
  bedding,
  blanket,
  metal,
}: {
  position: readonly [number, number, number];
  rotation: number;
  wood: string;
  bedding: string;
  blanket: string;
  metal: string;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[1.62, 0.34, 2.18]} />
        <meshStandardMaterial color={wood} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.51, 0.03]} castShadow>
        <boxGeometry args={[1.48, 0.23, 2.02]} />
        <meshStandardMaterial color="#d1c7b4" roughness={0.96} />
      </mesh>
      <mesh position={[0, 0.65, 0.19]} castShadow>
        <boxGeometry args={[1.42, 0.09, 1.45]} />
        <meshStandardMaterial color={bedding} roughness={0.94} />
      </mesh>
      <mesh position={[0, 0.704, 0.61]} castShadow>
        <boxGeometry args={[1.43, 0.075, 0.48]} />
        <meshStandardMaterial color={blanket} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.75, 0.37]}>
        <boxGeometry args={[1.26, 0.012, 0.014]} />
        <meshStandardMaterial color={metal} roughness={0.9} />
      </mesh>
      {[-0.39, 0.39].map((x) => (
        <mesh key={`bed-pillow-${x}`} position={[x, 0.69, -0.65]} rotation={[0.05, 0, x * 0.05]} castShadow>
          <boxGeometry args={[0.59, 0.13, 0.4]} />
          <meshStandardMaterial color="#e6dfd1" roughness={0.96} />
        </mesh>
      ))}
      <mesh position={[0, 0.73, -1.08]} castShadow>
        <boxGeometry args={[1.72, 0.7, 0.15]} />
        <meshStandardMaterial color={wood} roughness={0.8} />
      </mesh>
      {[-0.58, 0, 0.58].map((x) => (
        <mesh key={`headboard-inlay-${x}`} position={[x, 0.78, -0.994]}>
          <boxGeometry args={[0.07, 0.48, 0.018]} />
          <meshStandardMaterial color={metal} roughness={0.76} metalness={0.16} />
        </mesh>
      ))}
    </group>
  );
}

function Nightstand({ position, wood, metal }: { position: readonly [number, number, number]; wood: string; metal: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.32, 0]} castShadow>
        <boxGeometry args={[0.57, 0.58, 0.49]} />
        <meshStandardMaterial color={wood} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.39, 0.255]}>
        <boxGeometry args={[0.46, 0.18, 0.025]} />
        <meshStandardMaterial color={metal} roughness={0.74} metalness={0.18} />
      </mesh>
      <mesh position={[0, 0.68, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.2, 0.06, 10]} />
        <meshStandardMaterial color={metal} roughness={0.76} />
      </mesh>
      <mesh position={[0, 0.81, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.05, 0.22, 8]} />
        <meshStandardMaterial color="#8d795f" roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.95, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.11, 0.18, 10]} />
        <meshStandardMaterial color="#d2a96f" emissive="#e9a24e" emissiveIntensity={0.12} roughness={0.85} />
      </mesh>
    </group>
  );
}

function StoragePiece({
  kind,
  position,
  wood,
  metal,
}: {
  kind: "chest" | "bookcase" | "writing-desk" | "wardrobe";
  position: readonly [number, number, number];
  wood: string;
  metal: string;
}) {
  if (kind === "bookcase") {
    return (
      <group position={position}>
        <mesh position={[0, 1.0, 0]} castShadow>
          <boxGeometry args={[1.05, 2.0, 0.42]} />
          <meshStandardMaterial color={wood} roughness={0.84} />
        </mesh>
        {[0.48, 1.0, 1.52].map((y, row) => (
          <group key={`book-row-${row}`}>
            <mesh position={[0, y, 0.23]}>
              <boxGeometry args={[0.98, 0.06, 0.08]} />
              <meshStandardMaterial color={metal} roughness={0.82} />
            </mesh>
            {[-0.36, -0.12, 0.12, 0.36].map((x, index) => (
              <mesh key={`book-${row}-${index}`} position={[x, y + 0.2, 0.2]} rotation={[0, 0, index % 2 ? 0.035 : -0.025]}>
                <boxGeometry args={[0.18, 0.34, 0.12]} />
                <meshStandardMaterial color={["#8f493c", "#536b67", "#b19361", "#47566a"][(row + index) % 4]} roughness={0.9} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
    );
  }

  if (kind === "writing-desk") {
    return (
      <group position={position}>
        <mesh position={[0, 0.8, 0]} castShadow>
          <boxGeometry args={[1.25, 0.14, 0.68]} />
          <meshStandardMaterial color={wood} roughness={0.76} />
        </mesh>
        {[-0.48, 0.48].map((x) => (
          <mesh key={`desk-leg-${x}`} position={[x, 0.4, 0]} castShadow>
            <boxGeometry args={[0.12, 0.8, 0.58]} />
            <meshStandardMaterial color={wood} roughness={0.82} />
          </mesh>
        ))}
        <mesh position={[-0.2, 0.9, -0.04]} rotation={[-0.04, 0, 0.08]}>
          <boxGeometry args={[0.4, 0.018, 0.28]} />
          <meshStandardMaterial color="#c9b18a" roughness={0.96} />
        </mesh>
        <mesh position={[0.36, 0.91, 0.06]}>
          <cylinderGeometry args={[0.045, 0.05, 0.12, 8]} />
          <meshStandardMaterial color={metal} roughness={0.62} metalness={0.25} />
        </mesh>
      </group>
    );
  }

  if (kind === "wardrobe") {
    return (
      <group position={position}>
        <mesh position={[0, 1.05, 0]} castShadow>
          <boxGeometry args={[1.1, 2.1, 0.56]} />
          <meshStandardMaterial color={wood} roughness={0.82} />
        </mesh>
        {[-0.27, 0.27].map((x) => (
          <mesh key={`wardrobe-door-${x}`} position={[x, 1.05, 0.293]}>
            <boxGeometry args={[0.49, 1.94, 0.03]} />
            <meshStandardMaterial color={wood} roughness={0.78} />
          </mesh>
        ))}
        {[-0.08, 0.08].map((x) => (
          <mesh key={`wardrobe-handle-${x}`} position={[x, 1.05, 0.319]}>
            <sphereGeometry args={[0.035, 8, 6]} />
            <meshStandardMaterial color={metal} roughness={0.36} metalness={0.56} />
          </mesh>
        ))}
      </group>
    );
  }

  return (
    <group position={position}>
      <mesh position={[0, 0.39, 0]} castShadow>
        <boxGeometry args={[1.12, 0.72, 0.66]} />
        <meshStandardMaterial color={wood} roughness={0.82} />
      </mesh>
      <mesh position={[0, 0.78, 0]} castShadow>
        <boxGeometry args={[1.18, 0.1, 0.72]} />
        <meshStandardMaterial color={metal} roughness={0.7} metalness={0.12} />
      </mesh>
      {[-0.37, 0.37].map((x) => (
        <mesh key={`chest-strap-${x}`} position={[x, 0.4, 0.335]}>
          <boxGeometry args={[0.09, 0.68, 0.026]} />
          <meshStandardMaterial color={metal} roughness={0.58} metalness={0.28} />
        </mesh>
      ))}
      <mesh position={[0, 0.53, 0.36]}>
        <boxGeometry args={[0.12, 0.16, 0.035]} />
        <meshStandardMaterial color={metal} roughness={0.48} metalness={0.42} />
      </mesh>
    </group>
  );
}

function TrestleTable({
  position,
  wood,
  metal,
}: {
  position: readonly [number, number, number];
  wood: string;
  metal: string;
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.82, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.42, 0.15, 0.82]} />
        <meshStandardMaterial color={wood} roughness={0.82} />
      </mesh>
      <mesh position={[0, 0.71, 0]} castShadow>
        <boxGeometry args={[1.2, 0.1, 0.62]} />
        <meshStandardMaterial color={wood} roughness={0.86} />
      </mesh>
      {[-0.5, 0.5].map((x) => (
        <group key={`table-trestle-${x}`}>
          <mesh position={[x, 0.39, 0]} castShadow>
            <boxGeometry args={[0.12, 0.66, 0.62]} />
            <meshStandardMaterial color={wood} roughness={0.84} />
          </mesh>
          <mesh position={[x, 0.1, 0]} castShadow>
            <boxGeometry args={[0.72, 0.1, 0.7]} />
            <meshStandardMaterial color={wood} roughness={0.88} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.84, -0.22]}>
        <boxGeometry args={[1.08, 0.018, 0.025]} />
        <meshStandardMaterial color={metal} roughness={0.72} metalness={0.14} />
      </mesh>
      <mesh position={[0, 0.91, 0.08]} rotation={[0.04, 0.08, 0.02]} castShadow>
        <boxGeometry args={[0.38, 0.025, 0.29]} />
        <meshStandardMaterial color="#c7b48f" roughness={0.96} />
      </mesh>
      <mesh position={[0.44, 0.94, 0.16]} castShadow>
        <cylinderGeometry args={[0.075, 0.085, 0.1, 8]} />
        <meshStandardMaterial color="#9b6a42" roughness={0.83} />
      </mesh>
    </group>
  );
}

function CarvedBench({
  position,
  rotation = 0,
  wood,
  accent,
}: {
  position: readonly [number, number, number];
  rotation?: number;
  wood: string;
  accent: string;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.42, 0.14, 0.42]} />
        <meshStandardMaterial color={wood} roughness={0.82} />
      </mesh>
      {[-0.54, 0.54].map((x) => (
        <mesh key={`bench-leg-${x}`} position={[x, 0.25, 0]} castShadow>
          <boxGeometry args={[0.12, 0.48, 0.34]} />
          <meshStandardMaterial color={wood} roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[0, 0.76, -0.13]} castShadow>
        <boxGeometry args={[1.34, 0.48, 0.11]} />
        <meshStandardMaterial color={wood} roughness={0.84} />
      </mesh>
      <mesh position={[0, 0.76, -0.065]}>
        <boxGeometry args={[0.9, 0.055, 0.018]} />
        <meshStandardMaterial color={accent} roughness={0.78} metalness={0.08} />
      </mesh>
    </group>
  );
}

function StoneHearth({
  position,
  stone,
  timber,
}: {
  position: readonly [number, number, number];
  stone: string;
  timber: string;
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.48, 0.94, 0.62]} />
        <meshStandardMaterial color={stone} roughness={0.96} />
      </mesh>
      <mesh position={[0, 0.42, -0.307]}>
        <boxGeometry args={[0.78, 0.54, 0.035]} />
        <meshStandardMaterial color="#181817" roughness={0.97} />
      </mesh>
      <mesh position={[0, 0.83, -0.35]} castShadow>
        <boxGeometry args={[1.72, 0.15, 0.76]} />
        <meshStandardMaterial color={timber} roughness={0.86} />
      </mesh>
      {[-0.2, 0.08].map((x, index) => (
        <mesh
          key={`hearth-flame-${index}`}
          position={[x, 0.32 + index * 0.08, -0.34]}
          rotation={[0, 0, index % 2 ? -0.13 : 0.15]}
        >
          <coneGeometry args={[0.11, 0.36 + index * 0.06, 6]} />
          <meshBasicMaterial
            color={index % 2 ? "#ff8e3b" : "#ffd16f"}
            toneMapped={false}
          />
        </mesh>
      ))}
      {[-0.26, 0.26].map((x) => (
        <mesh key={`hearth-log-${x}`} position={[x, 0.13, -0.35]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.045, 0.05, 0.55, 7]} />
          <meshStandardMaterial color="#47362b" roughness={0.94} />
        </mesh>
      ))}
    </group>
  );
}

function ClayStorage({
  position,
  clay,
  trim,
}: {
  position: readonly [number, number, number];
  clay: string;
  trim: string;
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.34, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.32, 10, 7]} />
        <meshStandardMaterial color={clay} roughness={0.91} />
      </mesh>
      <mesh position={[0, 0.62, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.17, 0.2, 9]} />
        <meshStandardMaterial color={clay} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.73, 0]}>
        <torusGeometry args={[0.13, 0.035, 6, 10]} />
        <meshStandardMaterial color={trim} roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.48, 0.264]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.16, 0.018, 5, 12]} />
        <meshStandardMaterial color={trim} roughness={0.82} />
      </mesh>
    </group>
  );
}

function SmallBarrel({
  position,
  wood,
  metal,
}: {
  position: readonly [number, number, number];
  wood: string;
  metal: string;
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.37, 0.31, 0.82, 10]} />
        <meshStandardMaterial color={wood} roughness={0.9} />
      </mesh>
      {[0.14, 0.7].map((y) => (
        <mesh key={`barrel-hoop-${y}`} position={[0, y, 0]}>
          <torusGeometry args={[0.34, 0.035, 6, 12]} />
          <meshStandardMaterial color={metal} roughness={0.62} metalness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 0.84, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.055, 10]} />
        <meshStandardMaterial color={wood} roughness={0.9} />
      </mesh>
    </group>
  );
}

export function WarRoomHouseInterior({ building }: { building: WarRoomBuilding }) {
  const style = getWarRoomInteriorStyle(building.style);
  const livingSide = -building.stairSide;
  const sofaX = livingSide * (1.05 + style.sofaShift);
  const tvX = livingSide * 1.18;
  const bedX = livingSide * 1.18;
  const bedZ = 0.2;
  const accessoryX = building.stairSide * 0.62;
  const accessoryZ = -building.depth / 2 + 0.78;
  const bedNightstandX = bedX + (style.bedAngle === 0 ? livingSide * 1.05 : 0);
  const bedNightstandZ = bedZ + (style.bedAngle === 0 ? 0 : 1.05);

  return (
    <group position={[building.x, 0, building.z]} rotation={[0, building.rotationY, 0]}>
      <Rug
        position={[sofaX, 0.085, 0.5 + style.sofaShift * 0.35]}
        width={2.8}
        depth={2.15}
        base={style.rug}
        accent={style.rugAccent}
        pattern={building.style}
      />
      <CarvedBench
        position={[sofaX, 0.08, -0.05]}
        rotation={style.sofaAngle}
        wood={style.wood}
        accent={style.rugAccent}
      />
      <StoneHearth
        position={[tvX, 0.02, building.depth / 2 - 0.67]}
        stone={style.metal}
        timber={style.wood}
      />
      <TrestleTable
        position={[sofaX, 0.08, 0.82]}
        wood={style.wood}
        metal={style.metal}
      />
      <CarvedBench
        position={[sofaX + livingSide * 0.12, 0.08, 1.58]}
        rotation={Math.PI}
        wood={style.wood}
        accent={style.rugAccent}
      />
      <StoragePiece
        kind={style.accessory}
        position={[accessoryX, 0.02, accessoryZ]}
        wood={style.wood}
        metal={style.metal}
      />
      <ClayStorage
        position={[livingSide * (building.width / 2 - 0.55), 0.02, building.depth / 2 - 1.05]}
        clay="#9b6542"
        trim={style.rugAccent}
      />
      <SmallBarrel
        position={[livingSide * (building.width / 2 - 0.58), 0.02, -building.depth / 2 + 1.05]}
        wood={style.wood}
        metal={style.metal}
      />

      <Rug
        position={[bedX, building.storyHeight + 0.085, bedZ]}
        width={2.2}
        depth={2.55}
        base={style.rug}
        accent={style.rugAccent}
        pattern={building.style + 1}
      />
      <Bed
        position={[bedX, building.storyHeight + 0.08, bedZ]}
        rotation={style.bedAngle}
        wood={style.wood}
        bedding={style.bedding}
        blanket={style.blanket}
        metal={style.metal}
      />
      <Nightstand
        position={[bedNightstandX, building.storyHeight + 0.08, bedNightstandZ]}
        wood={style.wood}
        metal={style.metal}
      />
      <StoragePiece
        kind={style.accessory === "bookcase" ? "chest" : "wardrobe"}
        position={[0.1, building.storyHeight + 0.08, -building.depth / 2 + 0.78]}
        wood={style.wood}
        metal={style.metal}
      />
      <ClayStorage
        position={[
          -livingSide * (building.width / 2 - 0.54),
          building.storyHeight + 0.08,
          building.depth / 2 - 0.72,
        ]}
        clay="#8b583a"
        trim={style.rugAccent}
      />
    </group>
  );
}
