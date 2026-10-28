import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  getCurrentTimeOfDayMode,
  getTimeOfDayDaylight,
  getTimeOfDayLabel,
  getTimeOfDayPhase,
  getTimeOfDaySunAltitude,
  getTimeOfDayTwilight,
  resolveTimeOfDayMode,
  subscribeToTimeOfDayMode,
  type TimeOfDayMode,
} from "./time-of-day";
import type { RenderQuality } from "./graphics-quality";

const SKY_VERTEX_SHADER = `
  varying vec3 vSkyDirection;
  void main() {
    vSkyDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT_SHADER = `
  uniform float uPhase;
  uniform float uCloudsEnabled;
  varying vec3 vSkyDirection;

  void main() {
    const float PI = 3.14159265359;
    vec3 direction = normalize(vSkyDirection);
    float phase = mod(uPhase, 1.0);
    float daylight = clamp((sin(phase * 2.0 * PI + PI * 0.5) + 1.0) * 0.5, 0.0, 1.0);
    float sunset = max(0.0, 1.0 - abs(phase - 0.25) / 0.12);
    float dawn = max(0.0, 1.0 - abs(phase - 0.75) / 0.12);
    float twilight = max(sunset, dawn);

    vec3 nightZenith = vec3(0.018, 0.035, 0.082);
    vec3 nightHorizon = vec3(0.075, 0.12, 0.21);
    vec3 dayZenith = vec3(0.12, 0.35, 0.62);
    vec3 dayHorizon = vec3(0.58, 0.72, 0.82);
    vec3 twilightZenith = vec3(0.23, 0.17, 0.34);
    vec3 twilightHorizon = vec3(0.92, 0.43, 0.28);
    float horizonBlend = smoothstep(-0.08, 0.78, direction.y);
    vec3 zenith = mix(nightZenith, dayZenith, daylight);
    vec3 horizon = mix(nightHorizon, dayHorizon, daylight);
    zenith = mix(zenith, twilightZenith, twilight * 0.72);
    horizon = mix(horizon, twilightHorizon, twilight);
    vec3 color = mix(horizon, zenith, horizonBlend);

    float angle = phase * 2.0 * PI;
    float altitude = sin(angle + PI * 0.5);
    vec3 sunDirection = normalize(vec3(cos(angle), altitude, sin(angle)));
    float sunDot = dot(direction, sunDirection);
    float sunDisc = smoothstep(0.99945, 0.9998, sunDot) * daylight;
    float sunHalo = (1.0 - smoothstep(0.91, 0.9994, sunDot)) * daylight * 0.17;
    color += vec3(1.0, 0.76, 0.48) * (sunDisc + sunHalo);

    vec3 moonDirection = -sunDirection;
    float moonDot = dot(direction, moonDirection);
    float moonDisc = smoothstep(0.9994, 0.9998, moonDot) * (1.0 - daylight);
    float moonHalo = (1.0 - smoothstep(0.94, 0.9993, moonDot)) * (1.0 - daylight) * 0.08;
    color += vec3(0.58, 0.76, 1.0) * (moonDisc + moonHalo);

    float cloudShape = sin((direction.x * 5.8 + direction.z * 4.1) + phase * 0.5)
      * cos(direction.y * 12.0 + direction.z * 2.2);
    float cloud = smoothstep(0.55, 0.92, cloudShape) * uCloudsEnabled * daylight * 0.12;
    color = mix(color, vec3(0.78, 0.83, 0.88), cloud);
    gl_FragColor = vec4(color, 1.0);
  }
`;

const STAR_VERTEX_SHADER = `
  uniform float uPhase;
  uniform float uEnabled;
  varying float vNight;
  void main() {
    float daylight = clamp((sin(uPhase * 6.28318530718 + 1.57079632679) + 1.0) * 0.5, 0.0, 1.0);
    vNight = (1.0 - daylight) * uEnabled;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = 1.45;
  }
`;

const STAR_FRAGMENT_SHADER = `
  varying float vNight;
  void main() {
    float radius = length(gl_PointCoord - vec2(0.5));
    float alpha = (1.0 - smoothstep(0.28, 0.5, radius)) * vNight * 0.88;
    gl_FragColor = vec4(0.76, 0.86, 1.0, alpha);
  }
`;

type LightSnapshot = {
  light: THREE.Light;
  intensity: number;
  color: THREE.Color | null;
  groundColor: THREE.Color | null;
  position: THREE.Vector3 | null;
  positionRadius: number;
};

type Props = {
  quality: RenderQuality;
};

export default function TimeOfDaySky({ quality }: Props) {
  const { camera, scene } = useThree();
  const skyRef = useRef<THREE.Mesh>(null);
  const starsRef = useRef<THREE.Points>(null);
  const modeRef = useRef<TimeOfDayMode>(
    resolveTimeOfDayMode(
      typeof window === "undefined" ? "" : window.location.search,
      getCurrentTimeOfDayMode(),
    ),
  );
  const phaseUniform = useMemo(() => ({ value: 0 }), []);
  const cloudUniform = useMemo(() => ({ value: quality === "low" ? 0 : 1 }), [quality]);
  const starEnabledUniform = useMemo(() => ({ value: quality === "low" ? 0 : 1 }), [quality]);
  const lightSnapshotsRef = useRef<LightSnapshot[]>([]);
  const lastDebugUpdate = useRef(0);
  const debugEnabled = useMemo(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "1",
    [],
  );
  const [debugValues, setDebugValues] = useState({ mode: "auto" as TimeOfDayMode, phase: 0, altitude: 0, daylight: 1 });
  const skyMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uPhase: phaseUniform, uCloudsEnabled: cloudUniform },
    vertexShader: SKY_VERTEX_SHADER,
    fragmentShader: SKY_FRAGMENT_SHADER,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
    toneMapped: false,
  }), [cloudUniform, phaseUniform]);
  const starMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uPhase: phaseUniform, uEnabled: starEnabledUniform },
    vertexShader: STAR_VERTEX_SHADER,
    fragmentShader: STAR_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  }), [phaseUniform, starEnabledUniform]);
  const starGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(180 * 3);
    let seed = 0x5afac;
    const random = () => {
      seed = (seed * 1_664_525 + 1_013_904_223) >>> 0;
      return seed / 0x1_0000_0000;
    };
    for (let index = 0; index < 180; index += 1) {
      const y = random() * 1.82 - 0.91;
      const angle = random() * Math.PI * 2;
      const horizontal = Math.sqrt(1 - y * y);
      const offset = index * 3;
      positions[offset] = Math.cos(angle) * horizontal * 280;
      positions[offset + 1] = y * 280;
      positions[offset + 2] = Math.sin(angle) * horizontal * 280;
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, []);
  const nightTint = useMemo(() => new THREE.Color("#203450"), []);
  const twilightTint = useMemo(() => new THREE.Color("#bc816a"), []);
  const nightFog = useMemo(() => new THREE.Color("#1b2942"), []);

  useEffect(() => subscribeToTimeOfDayMode((mode) => {
    modeRef.current = resolveTimeOfDayMode(
      typeof window === "undefined" ? "" : window.location.search,
      mode,
    );
  }), []);

  useEffect(() => {
    const snapshots: LightSnapshot[] = [];
    scene.traverse((object) => {
      if (!(object instanceof THREE.Light)) return;
      const light = object as THREE.Light & {
        intensity?: number;
        color?: THREE.Color;
        groundColor?: THREE.Color;
      };
      const position = object instanceof THREE.DirectionalLight ? object.position.clone() : null;
      snapshots.push({
        light: object,
        intensity: light.intensity ?? 1,
        color: light.color?.clone() ?? null,
        groundColor: light.groundColor?.clone() ?? null,
        position,
        positionRadius: position ? Math.hypot(position.x, position.z) : 0,
      });
    });
    lightSnapshotsRef.current = snapshots;
    return () => {
      lightSnapshotsRef.current = [];
    };
  }, [scene]);

  useEffect(() => () => {
    skyMaterial.dispose();
    starMaterial.dispose();
    starGeometry.dispose();
  }, [nightFog, nightTint, skyMaterial, starGeometry, starMaterial, twilightTint]);

  useFrame((frame) => {
    const mode = modeRef.current;
    const phase = getTimeOfDayPhase(Date.now(), mode);
    const daylight = getTimeOfDayDaylight(phase);
    const twilight = getTimeOfDayTwilight(phase);
    const night = 1 - daylight;
    const altitude = getTimeOfDaySunAltitude(phase);
    phaseUniform.value = phase;
    if (skyRef.current) skyRef.current.position.copy(camera.position);
    if (starsRef.current) starsRef.current.position.copy(camera.position);

    const angle = phase * Math.PI * 2;
    let primarySunPositionAssigned = false;
    for (const snapshot of lightSnapshotsRef.current) {
      const light = snapshot.light as THREE.Light & {
        intensity?: number;
        color?: THREE.Color;
        groundColor?: THREE.Color;
      };
      if (light instanceof THREE.DirectionalLight) {
        light.intensity = snapshot.intensity * (0.28 + daylight * 0.72);
        if (snapshot.color) {
          light.color.copy(snapshot.color).lerp(twilightTint, twilight * 0.22);
        }
        if (snapshot.position && !primarySunPositionAssigned) {
          primarySunPositionAssigned = true;
          light.position.set(
            Math.cos(angle) * snapshot.positionRadius,
            Math.max(2.5, Math.abs(altitude) * snapshot.position.length()),
            Math.sin(angle) * snapshot.positionRadius,
          );
        }
      } else if (light instanceof THREE.HemisphereLight) {
        light.intensity = snapshot.intensity * (0.35 + daylight * 0.65);
        if (snapshot.color) light.color.copy(snapshot.color).lerp(nightTint, night * 0.42);
        if (snapshot.groundColor) light.groundColor.copy(snapshot.groundColor).lerp(nightFog, night * 0.24);
      } else if (light instanceof THREE.AmbientLight) {
        light.intensity = snapshot.intensity * (0.38 + daylight * 0.62);
        if (snapshot.color) light.color.copy(snapshot.color).lerp(nightTint, night * 0.22);
      } else if (light instanceof THREE.PointLight) {
        light.intensity = snapshot.intensity * (1 + night * 0.14);
      }
    }
    if (scene.fog) {
      scene.fog.color.setRGB(
        0.13 + daylight * 0.48 + twilight * 0.2,
        0.2 + daylight * 0.38 + twilight * 0.12,
        0.32 + daylight * 0.28 - twilight * 0.04,
      );
      if (scene.fog instanceof THREE.Fog) {
        scene.fog.near = quality === "low" ? 155 : 180;
        scene.fog.far = quality === "low" ? 370 : 440;
      }
    }
    if (debugEnabled && frame.clock.elapsedTime - lastDebugUpdate.current >= 0.5) {
      lastDebugUpdate.current = frame.clock.elapsedTime;
      setDebugValues({ mode, phase, altitude, daylight });
    }
  });

  return (
    <>
      <mesh ref={skyRef} name="shared-time-of-day-sky" frustumCulled={false} renderOrder={-1000}>
        <sphereGeometry args={[300, 24, 16]} />
        <primitive object={skyMaterial} attach="material" dispose={null} />
      </mesh>
      <points ref={starsRef} name="shared-time-of-day-stars" geometry={starGeometry} material={starMaterial} frustumCulled={false} renderOrder={-999} />
      {debugEnabled && (
        <Html fullscreen>
          <div
            style={{
              position: "fixed",
              top: 8,
              left: 8,
              zIndex: 20,
              padding: "5px 8px",
              border: "1px solid rgba(255,255,255,.25)",
              borderRadius: 6,
              color: "#fff",
              background: "rgba(6,12,20,.72)",
              font: "11px/1.45 ui-monospace, monospace",
              pointerEvents: "none",
            }}
          >
            {getTimeOfDayLabel(debugValues.phase)} · {debugValues.mode} · {Intl.DateTimeFormat().resolvedOptions().timeZone}
            <br />
            faz {debugValues.phase.toFixed(3)} · güneş {debugValues.altitude.toFixed(2)} · gün ışığı {debugValues.daylight.toFixed(2)}
          </div>
        </Html>
      )}
    </>
  );
}
