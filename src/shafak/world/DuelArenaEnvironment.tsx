import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { DuelArenaTheme } from "../game/duel-arena-theme";

const ARENA_CENTER_Z = -0.6;
const ARENA_RING_RADIUS = 18;

type ArenaInstance = {
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
  color: string;
};

function makeRingInstances(
  count: number,
  radius: number,
  height: number,
  colors: readonly string[],
  excludeRearGate = false,
): ArenaInstance[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    const distanceFromRearGate = Math.abs(Math.atan2(Math.sin(angle - Math.PI), Math.cos(angle - Math.PI)));
    if (excludeRearGate && distanceFromRearGate < 0.24) return null;
    return {
      position: [Math.sin(angle) * radius, height, ARENA_CENTER_Z + Math.cos(angle) * radius],
      scale: [1, 1, 1],
      rotation: [0, -angle, 0],
      color: colors[index % colors.length],
    };
  }).filter((instance): instance is ArenaInstance => instance !== null);
}

function applyInstances(
  mesh: THREE.InstancedMesh | null,
  instances: readonly ArenaInstance[],
  transform: THREE.Object3D,
  color: THREE.Color,
) {
  if (!mesh) return;
  mesh.count = instances.length;
  instances.forEach((instance, index) => {
    transform.position.set(...instance.position);
    transform.rotation.set(...instance.rotation);
    transform.scale.set(...instance.scale);
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
    mesh.setColorAt(index, color.set(instance.color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
}

const SEATING_TIERS = [
  { inner: 9.5, outer: 11.15, y: 1.15 },
  { inner: 11.15, outer: 12.8, y: 2.2 },
  { inner: 12.8, outer: 14.45, y: 3.25 },
  { inner: 14.45, outer: 16.1, y: 4.3 },
] as const;

export function DuelArenaAtmosphere({ theme }: { theme: DuelArenaTheme }) {
  const { scene } = useThree();

  useEffect(() => {
    const previousBackground = scene.background;
    const previousFog = scene.fog;
    const width = 256;
    const height = 128;
    const pixels = new Uint8Array(width * height * 4);
    const zenith = new THREE.Color(theme.skyZenith);
    const horizon = new THREE.Color(theme.skyHorizon).lerp(new THREE.Color(theme.wall[1]), 0.12);
    const cloud = new THREE.Color(theme.wall[1]).lerp(new THREE.Color(theme.accent), 0.16);
    const sunGlow = new THREE.Color(theme.flame).lerp(new THREE.Color("#ffdb91"), 0.28);
    const sunCore = new THREE.Color("#fff2d2");
    const color = new THREE.Color();
    const srgb = new THREE.Color();
    const sunLongitude = Math.PI * 0.48;
    for (let y = 0; y < height; y += 1) {
      const latitude = Math.abs(y / (height - 1) - 0.5) * 2;
      const skyMix = THREE.MathUtils.smoothstep(latitude, 0.04, 0.94);
      const rowColor = color.copy(horizon).lerp(zenith, skyMix).clone();
      for (let x = 0; x < width; x += 1) {
        const u = x / width * Math.PI * 2;
        const v = y / height;
        const wisps = THREE.MathUtils.smoothstep(
          0.5 + Math.sin(u * 3.2 + v * 11) * 0.24 + Math.sin(u * 7.1 - v * 17) * 0.15,
          0.53,
          0.82,
        );
        const longitudeDelta = Math.min(
          Math.abs(u - sunLongitude),
          Math.PI * 2 - Math.abs(u - sunLongitude),
        );
        const haloDistance = (longitudeDelta / 0.19) ** 2 + ((latitude - 0.2) / 0.12) ** 2;
        const discDistance = (longitudeDelta / 0.028) ** 2 + ((latitude - 0.2) / 0.035) ** 2;
        color.copy(rowColor)
          .lerp(sunGlow, Math.exp(-haloDistance) * 0.42)
          .lerp(sunCore, Math.exp(-discDistance) * 0.88)
          .lerp(cloud, wisps * 0.12);
        srgb.copy(color).convertLinearToSRGB();
        const pixel = (y * width + x) * 4;
        pixels[pixel] = Math.round(THREE.MathUtils.clamp(srgb.r, 0, 1) * 255);
        pixels[pixel + 1] = Math.round(THREE.MathUtils.clamp(srgb.g, 0, 1) * 255);
        pixels[pixel + 2] = Math.round(THREE.MathUtils.clamp(srgb.b, 0, 1) * 255);
        pixels[pixel + 3] = 255;
      }
    }
    const sky = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat);
    sky.mapping = THREE.EquirectangularReflectionMapping;
    sky.colorSpace = THREE.SRGBColorSpace;
    sky.magFilter = THREE.LinearFilter;
    sky.minFilter = THREE.LinearFilter;
    sky.needsUpdate = true;
    scene.background = sky;
    scene.fog = new THREE.Fog(theme.fog, 26, 72);
    return () => {
      scene.background = previousBackground;
      scene.fog = previousFog;
      sky.dispose();
    };
  }, [scene, theme.accent, theme.flame, theme.fog, theme.skyHorizon, theme.skyZenith, theme.wall]);

  return null;
}

export default function DuelArenaEnvironment({ theme }: { theme: DuelArenaTheme }) {
  const buttressRef = useRef<THREE.InstancedMesh>(null);
  const lintelRef = useRef<THREE.InstancedMesh>(null);
  const towerRef = useRef<THREE.InstancedMesh>(null);
  const finialRef = useRef<THREE.InstancedMesh>(null);
  const bannerRef = useRef<THREE.InstancedMesh>(null);
  const bannerStripeRef = useRef<THREE.InstancedMesh>(null);
  const sconceRef = useRef<THREE.InstancedMesh>(null);
  const transform = useMemo(() => new THREE.Object3D(), []);
  const tint = useMemo(() => new THREE.Color(), []);

  const buttresses = useMemo(
    () => makeRingInstances(28, ARENA_RING_RADIUS - 0.58, 6.35, theme.wall, true),
    [theme.wall],
  );
  const lintels = useMemo(
    () => makeRingInstances(28, ARENA_RING_RADIUS - 0.58, 12.95, theme.column, true),
    [theme.column],
  );
  const towers = useMemo(
    () => makeRingInstances(8, ARENA_RING_RADIUS - 0.68, 15.1, theme.wall, true),
    [theme.wall],
  );
  const finials = useMemo(
    () => makeRingInstances(8, ARENA_RING_RADIUS - 0.68, 17.65, theme.column, true),
    [theme.column],
  );
  const banners = useMemo(
    () => makeRingInstances(8, ARENA_RING_RADIUS - 1.15, 9.85, theme.wall, true),
    [theme.wall],
  );
  const bannerStripes = useMemo(
    () => banners.map((banner) => ({ ...banner, color: theme.accent })),
    [banners, theme.accent],
  );
  const sconces = useMemo(
    () => makeRingInstances(20, ARENA_RING_RADIUS - 1.05, 6.4, Array(20).fill(theme.flame)),
    [theme.flame],
  );

  const bannerGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.62, 1.55);
    shape.lineTo(0.62, 1.55);
    shape.lineTo(0.56, -0.95);
    shape.lineTo(0, -1.55);
    shape.lineTo(-0.56, -0.95);
    shape.closePath();
    return new THREE.ShapeGeometry(shape, 4);
  }, []);
  const stripeGeometry = useMemo(() => new THREE.PlaneGeometry(0.13, 1.7), []);

  useLayoutEffect(() => {
    applyInstances(buttressRef.current, buttresses, transform, tint);
    applyInstances(lintelRef.current, lintels, transform, tint);
    applyInstances(towerRef.current, towers, transform, tint);
    applyInstances(finialRef.current, finials, transform, tint);
    applyInstances(bannerRef.current, banners, transform, tint);
    applyInstances(bannerStripeRef.current, bannerStripes, transform, tint);
    applyInstances(sconceRef.current, sconces, transform, tint);
  }, [bannerStripes, banners, buttresses, finials, lintels, sconces, tint, towers, transform]);

  return (
    <group name="duel-arena-environment">
      <mesh
        name="arena-courtyard-ground"
        position={[0, -2.18, ARENA_CENTER_Z]}
        rotation={[-Math.PI / 2, 0, 0]}
        frustumCulled={false}
      >
        <planeGeometry args={[180, 180]} />
        <meshStandardMaterial color={theme.stone[1]} roughness={0.98} metalness={0.015} />
      </mesh>

      <mesh name="arena-stone-plinth" position={[0, -1.06, ARENA_CENTER_Z]}>
        <cylinderGeometry args={[9.04, 10.05, 2.12, 96, 2]} />
        <meshStandardMaterial color={theme.wall[0]} roughness={0.95} metalness={0.04} />
      </mesh>
      <mesh position={[0, -1.76, ARENA_CENTER_Z]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[9.76, 0.16, 8, 96]} />
        <meshStandardMaterial color={theme.accent} roughness={0.52} metalness={0.48} />
      </mesh>
      <mesh position={[0, -0.66, ARENA_CENTER_Z]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[9.5, 0.09, 8, 96]} />
        <meshStandardMaterial color={theme.stone[2]} roughness={0.82} metalness={0.18} />
      </mesh>

      <mesh
        name="arena-inner-citadel-wall"
        position={[0, 7.3, ARENA_CENTER_Z]}
        frustumCulled={false}
        userData={{ cameraOccluder: true }}
      >
        <cylinderGeometry args={[ARENA_RING_RADIUS, ARENA_RING_RADIUS + 0.4, 14.6, 96, 1, true]} />
        <meshStandardMaterial color={theme.wall[0]} roughness={0.96} side={THREE.DoubleSide} />
      </mesh>

      {[0.35, 2.3, 7.2, 13.95].map((height, index) => (
        <mesh
          key={height}
          position={[0, height, ARENA_CENTER_Z]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[ARENA_RING_RADIUS - 0.05, index === 3 ? 0.2 : 0.1, 8, 112]} />
          <meshStandardMaterial
            color={index === 3 ? theme.accent : theme.column[index % theme.column.length]}
            roughness={index === 3 ? 0.55 : 0.88}
            metalness={index === 3 ? 0.38 : 0.06}
          />
        </mesh>
      ))}

      {SEATING_TIERS.map((tier, index) => (
        <group key={tier.inner} name={`arena-seating-tier-${index + 1}`}>
          <mesh position={[0, tier.y, ARENA_CENTER_Z]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[tier.inner, tier.outer, 112]} />
            <meshStandardMaterial
              color={theme.stone[index % theme.stone.length]}
              roughness={0.94}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, tier.y - 0.52, ARENA_CENTER_Z]}>
            <cylinderGeometry args={[tier.inner, tier.inner, 1.04, 112, 1, true]} />
            <meshStandardMaterial color={theme.wall[index % theme.wall.length]} roughness={0.97} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}

      <group name="arena-rear-entry" position={[0, 0, -12.45]}>
        <mesh position={[-2.45, 2.9, 0]}>
          <cylinderGeometry args={[0.42, 0.68, 5.8, 10]} />
          <meshStandardMaterial color={theme.column[1]} roughness={0.84} />
        </mesh>
        <mesh position={[2.45, 2.9, 0]}>
          <cylinderGeometry args={[0.42, 0.68, 5.8, 10]} />
          <meshStandardMaterial color={theme.column[1]} roughness={0.84} />
        </mesh>
        <mesh position={[0, 5.85, 0]} rotation={[0, 0, 0]}>
          <torusGeometry args={[2.45, 0.38, 12, 48, Math.PI]} />
          <meshStandardMaterial color={theme.accent} roughness={0.52} metalness={0.42} />
        </mesh>
        <mesh position={[0, 3, -0.22]}>
          <boxGeometry args={[3.75, 5.8, 0.24]} />
          <meshStandardMaterial color={theme.wall[0]} roughness={0.93} />
        </mesh>
        <mesh position={[0, 3, -0.06]}>
          <boxGeometry args={[0.09, 5.55, 0.08]} />
          <meshStandardMaterial color={theme.accent} roughness={0.48} metalness={0.44} />
        </mesh>
        <mesh position={[0, 6.28, 0]}>
          <boxGeometry args={[5.9, 0.48, 1.25]} />
          <meshStandardMaterial color={theme.column[0]} roughness={0.82} />
        </mesh>
      </group>

      <instancedMesh ref={buttressRef} args={[undefined, undefined, buttresses.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.52, 0.72, 12.5, 8, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={lintelRef} args={[undefined, undefined, lintels.length]} frustumCulled={false}>
        <boxGeometry args={[2.35, 0.78, 1.48]} />
        <meshStandardMaterial color="#ffffff" roughness={0.88} />
      </instancedMesh>
      <instancedMesh ref={towerRef} args={[undefined, undefined, towers.length]} frustumCulled={false}>
        <boxGeometry args={[1.52, 4.9, 1.68]} />
        <meshStandardMaterial color="#ffffff" roughness={0.91} />
      </instancedMesh>
      <instancedMesh ref={finialRef} args={[undefined, undefined, finials.length]} frustumCulled={false}>
        <coneGeometry args={[1.05, 1.35, 4]} />
        <meshStandardMaterial color="#ffffff" roughness={0.74} metalness={0.16} />
      </instancedMesh>
      <instancedMesh
        ref={bannerRef}
        args={[bannerGeometry, undefined, banners.length]}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#ffffff" roughness={0.92} side={THREE.DoubleSide} />
      </instancedMesh>
      <instancedMesh
        ref={bannerStripeRef}
        args={[stripeGeometry, undefined, bannerStripes.length]}
        frustumCulled={false}
      >
        <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={sconceRef} args={[undefined, undefined, sconces.length]} frustumCulled={false}>
        <sphereGeometry args={[0.28, 12, 8]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
