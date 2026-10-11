import { Component, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ErrorInfo, MutableRefObject, ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import type { CharacterAnimationState } from "./character-animation";
import KnightActor from "./KnightActor";
import { WORLD_CHUNK_LENGTH_METERS, type WorldMotion } from "./movement";
import { nextGateDistance } from "./world-generation";
import { createWorldMotion } from "./movement";
import { getOpponentModelConfig } from "./opponent-model-config";
import { getWorldBotProfileByName } from "./world-bot-profiles";
import { mapOpponentAnimationState } from "./model-animation";
import { getDuelCameraFraming } from "./duel-camera";
import {
  AshSky,
  WorldChunks,
} from "./WorldElements";
import { createWorldChunk, type WorldChunk } from "./world-generation";
import {
  getBiomeTransition,
  getWorldFogDensity,
  WORLD_BIOME_PALETTES,
  type WeatherMode,
} from "./world-biomes";
import WorldRoadEntities from "./WorldRoadEntities";
import type { WorldCollisionGrid, WorldRival } from "./world-content";
import type { CombatAction, CombatEvent, CombatState } from "../game/combat-engine";
import type { EquipmentVisual } from "../game/store-types";
import {
  appendWorldDiagnostic,
  emitWorldDiagnostic,
  formatWorldDiagnostics,
  type WorldDiagnostic,
} from "./world-diagnostics";
import WorldPostProcessing from "./WorldPostProcessing";
import { getShadowMapSize, getWorldRenderPixelRatio } from "./graphics-quality";
import {
  advanceBlackFrameSamples,
  BLACK_FRAME_LUMINANCE_THRESHOLD,
} from "./render-health";
import { WORLD_CAMERA_FAR } from "./world-render-config";
import {
  createFrameMetricsAccumulator,
  recordFrameMetric,
  type FrameMetricsSnapshot,
} from "./frame-metrics";
import {
  getDuelVfxKind,
  LIGHTNING_BOLT_COUNT,
  LIGHTNING_SEGMENT_COUNT,
  MAX_ACTIVE_DUEL_VFX,
  type DuelVfxKind,
} from "./duel-vfx";

export type WorldQuality = "high" | "balanced" | "low";
type CombatVisualEvent = CombatEvent & { expiresAt: number };
let lastSceneFrameAt = 0;

function createProceduralEnvironmentMap() {
  const width = 128;
  const height = 64;
  const pixels = new Uint8Array(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    const elevation = 1 - Math.abs((y / height) * 2 - 1);
    for (let x = 0; x < width; x += 1) {
      const u = x / width;
      const warm = Math.exp(-(((u - 0.16) / 0.12) ** 2 + ((y / height - 0.43) / 0.19) ** 2));
      const cool = Math.exp(-(((u - 0.68) / 0.17) ** 2 + ((y / height - 0.47) / 0.22) ** 2));
      const horizon = Math.exp(-(((y / height - 0.51) / 0.12) ** 2));
      const index = (y * width + x) * 3;
      pixels[index] = Math.min(255, Math.round(12 + elevation * 13 + warm * 111 + horizon * 21));
      pixels[index + 1] = Math.min(255, Math.round(15 + elevation * 17 + warm * 63 + cool * 26 + horizon * 23));
      pixels[index + 2] = Math.min(255, Math.round(23 + elevation * 31 + cool * 69 + horizon * 31));
    }
  }
  const texture = new THREE.DataTexture(pixels, width, height, THREE.RGBFormat);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

const PROCEDURAL_ENVIRONMENT_MAP = createProceduralEnvironmentMap();

type World3DProps = {
  motionRef: MutableRefObject<WorldMotion>;
  collisionGrid: WorldCollisionGrid;
  quality: WorldQuality;
  visualEffectsEnabled: boolean;
  motionReduced: boolean;
  performanceMonitorEnabled: boolean;
  weatherMode: WeatherMode;
  level: number;
  relicCount: number;
  equipmentVisual: EquipmentVisual;
  lightRadius: number;
  animationState: CharacterAnimationState;
  rivals: WorldRival[];
  collectedPickupIds: ReadonlySet<string>;
  brokenObstacleIds: ReadonlySet<string>;
  focusedRival: WorldRival | null;
  slowMotion: boolean;
  combatActive: boolean;
  combatStateRef: MutableRefObject<CombatState | null>;
  combatRender: CombatState | null;
  cameraOrbitRef: MutableRefObject<{ yaw: number; pitch: number }>;
  duelLockOn: boolean;
  combatVisualEvents: CombatVisualEvent[];
  cinematicIntro: boolean;
  finisherSlowMotion: boolean;
  botTelegraphActive: boolean;
  opponentName: string;
  debugCounters: { rivalCount: number; pickupCount: number; collectedCount: number };
  onDebugNearestRival: () => void;
  onDebugNearestPickup: () => void;
  onDebugSkipDistance: () => void;
  onDebugNextBiome: () => void;
  onDebugStartBattle: () => void;
  debugOneHitEnabled: boolean;
  onToggleDebugOneHit: () => void;
};

type DebugStats = {
  x: number;
  y: number;
  z: number;
  distance: number;
  speed: number;
  fps: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  heapMb: number | null;
  maxFrameMs: number;
  longFrames: number;
  animation: CharacterAnimationState;
  footSlip: number;
  chunks: number;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  exposure: number;
  background: string;
  fogDensity: number;
  programs: number;
  lights: number;
  pixelLuminance: number | null;
  litPixelSamples: number;
  pixelSampleCount: number;
};

function sampleRendererPixels(renderer: THREE.WebGLRenderer) {
  const context = renderer.getContext();
  const width = context.drawingBufferWidth;
  const height = context.drawingBufferHeight;
  if (context.isContextLost() || width < 1 || height < 1) {
    return { meanLuminance: null, litSamples: 0, sampleCount: 0 };
  }

  const points: ReadonlyArray<readonly [number, number]> = [
    [0.5, 0.5],
    [0.25, 0.35],
    [0.75, 0.35],
    [0.25, 0.7],
    [0.75, 0.7],
  ];
  const pixel = new Uint8Array(4);
  let luminanceSum = 0;
  let litSamples = 0;
  try {
    for (const [xRatio, yRatio] of points) {
      context.readPixels(
        Math.min(width - 1, Math.floor(width * xRatio)),
        Math.min(height - 1, Math.floor(height * yRatio)),
        1,
        1,
        context.RGBA,
        context.UNSIGNED_BYTE,
        pixel,
      );
      const luminance = (0.2126 * pixel[0] + 0.7152 * pixel[1] + 0.0722 * pixel[2]) / 255;
      luminanceSum += luminance;
      if (luminance > 0.02) litSamples += 1;
    }
  } catch {
    return { meanLuminance: null, litSamples: 0, sampleCount: 0 };
  }
  return {
    meanLuminance: luminanceSum / points.length,
    litSamples,
    sampleCount: points.length,
  };
}

class WorldCanvasErrorBoundary extends Component<
  { children: ReactNode; onRetry: () => void; onError: (error: Error) => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.error("[shafak-world] 3D canvas failed to start.", error);
    emitWorldDiagnostic("canvas", error.message);
    this.props.onError(error);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="world-three-fallback" role="alert">
          <div className="world-three-fallback__content">
            <span>3D sahne başlatılamadı. WebGL destekli bir tarayıcıyla yeniden deneyin.</span>
            <button type="button" onClick={this.props.onRetry}>YENİDEN DENE</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function CanvasContextGuard({
  onLost,
  onRestored,
}: {
  onLost: () => void;
  onRestored: () => void;
}) {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const handleLost = (event: Event) => {
      event.preventDefault();
      emitWorldDiagnostic("webgl", "webglcontextlost: grafik bağlamı kesildi.");
      onLost();
    };
    const handleRestored = () => {
      emitWorldDiagnostic("webgl", "webglcontextrestored: grafik bağlamı geri geldi.");
      onRestored();
    };
    canvas.addEventListener("webglcontextlost", handleLost);
    canvas.addEventListener("webglcontextrestored", handleRestored);
    return () => {
      canvas.removeEventListener("webglcontextlost", handleLost);
      canvas.removeEventListener("webglcontextrestored", handleRestored);
    };
  }, [gl, onLost, onRestored]);
  return null;
}

function FirstFrameGuard({ onFirstFrame }: { onFirstFrame: () => void }) {
  const reportedRef = useRef(false);
  useFrame(() => {
    if (reportedRef.current) return;
    reportedRef.current = true;
    window.requestAnimationFrame(() => onFirstFrame());
  });
  return null;
}

function supportsWebGL() {
  // Do not create and destroy a throwaway WebGL context on iOS. The renderer
  // below is the authoritative capability check and owns the only live context.
  return typeof WebGL2RenderingContext !== "undefined"
    || typeof WebGLRenderingContext !== "undefined";
}

function getChunksForDistance(distance: number, cache: Map<number, WorldChunk>) {
  const current = Math.floor(distance / WORLD_CHUNK_LENGTH_METERS);
  const visible: WorldChunk[] = [];
  for (let index = current - 1; index <= current + 4; index += 1) {
    let chunk = cache.get(index);
    if (!chunk) {
      chunk = createWorldChunk(index);
      cache.set(index, chunk);
    }
    visible.push(chunk);
  }
  for (const index of cache.keys()) {
    if (index < current - 2 || index > current + 5) cache.delete(index);
  }
  return visible;
}

const FOG_COLORS = Object.fromEntries(
  Object.entries(WORLD_BIOME_PALETTES).map(([biome, palette]) => [biome, new THREE.Color(palette.fog)]),
) as Record<keyof typeof WORLD_BIOME_PALETTES, THREE.Color>;

function SceneFog({
  motionRef,
  weatherMode,
  combatActive,
}: {
  motionRef: MutableRefObject<WorldMotion>;
  weatherMode: WeatherMode;
  combatActive: boolean;
}) {
  const { scene } = useThree();
  const fogRef = useRef<THREE.FogExp2 | null>(null);
  useEffect(() => {
    const fog = new THREE.FogExp2("#69505a", 0.0085);
    fogRef.current = fog;
    scene.fog = fog;
    return () => {
      fogRef.current = null;
      scene.fog = null;
    };
  }, [scene]);
  useFrame(() => {
    const fog = fogRef.current;
    if (!fog) return;
    const transition = getBiomeTransition(motionRef.current.distance);
    fog.color.lerpColors(FOG_COLORS[transition.from], FOG_COLORS[transition.to], transition.mix);
    fog.density = getWorldFogDensity(weatherMode, transition.biome, combatActive);
  });
  return null;
}

function ProceduralEnvironment() {
  const { scene } = useThree();
  useEffect(() => {
    const previousEnvironment = scene.environment;
    const previousIntensity = scene.environmentIntensity;
    scene.environment = PROCEDURAL_ENVIRONMENT_MAP;
    scene.environmentIntensity = 0.62;
    return () => {
      scene.environment = previousEnvironment;
      scene.environmentIntensity = previousIntensity;
    };
  }, [scene]);
  return null;
}

function RendererEffects({
  quality,
  visualEffectsEnabled,
}: {
  quality: WorldQuality;
  visualEffectsEnabled: boolean;
}) {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMapping = visualEffectsEnabled ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
    gl.toneMappingExposure = visualEffectsEnabled ? 1.12 : 1;
    gl.shadowMap.enabled = quality !== "low";
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    gl.shadowMap.needsUpdate = true;
  }, [gl, quality, visualEffectsEnabled]);
  return null;
}

function CameraRig({
  motionRef,
  motionReduced,
  focusedRival,
  slowMotion,
  combatActive,
  combatStateRef,
  cameraOrbitRef,
  duelLockOn,
  combatVisualEvents,
  visualEffectsEnabled,
  cinematicIntro,
  finisherSlowMotion,
}: {
  motionRef: MutableRefObject<WorldMotion>;
  motionReduced: boolean;
  focusedRival: WorldRival | null;
  slowMotion: boolean;
  combatActive: boolean;
  combatStateRef: MutableRefObject<CombatState | null>;
  cameraOrbitRef: MutableRefObject<{ yaw: number; pitch: number }>;
  duelLockOn: boolean;
  combatVisualEvents: CombatVisualEvent[];
  visualEffectsEnabled: boolean;
  cinematicIntro: boolean;
  finisherSlowMotion: boolean;
}) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const targetRef = useMemo(() => new THREE.Vector3(), []);
  const desiredRef = useMemo(() => new THREE.Vector3(), []);
  const impactRef = useRef({ tick: -1, startedAt: 0 });
  const cinematicStartRef = useRef<number | null>(null);
  const { size } = useThree();
  const skillPulseRef = useRef<{ id: number; startedAt: number; attack: "skillOne" | "skillTwo" | null }>({
    id: -1,
    startedAt: 0,
    attack: null,
  });

  useFrame((_, delta) => {
    const camera = cameraRef.current;
    if (!camera) return;
    const motion = motionRef.current;
    const speed = Math.hypot(motion.velocityX, motion.velocityY);
    const lateral = motion.depth * 5.2;
    const combat = combatActive ? combatStateRef.current : null;
    if (cinematicIntro) cinematicStartRef.current ??= _.clock.elapsedTime;
    else cinematicStartRef.current = null;
    const scaledDelta = Math.min(delta, 0.05) * ((slowMotion && !combat) || finisherSlowMotion ? 0.24 : 1);
    const response = 1 - Math.exp(-scaledDelta * (combat ? 5.5 : focusedRival ? 2.6 : 4.5));
    let latestSkillEvent: CombatVisualEvent | undefined;
    for (let index = combatVisualEvents.length - 1; index >= 0; index -= 1) {
      if (combatVisualEvents[index].type === "skill") {
        latestSkillEvent = combatVisualEvents[index];
        break;
      }
    }
    if (visualEffectsEnabled && latestSkillEvent && latestSkillEvent.id !== skillPulseRef.current.id) {
      skillPulseRef.current = {
        id: latestSkillEvent.id,
        startedAt: _.clock.elapsedTime,
        attack: latestSkillEvent.attack === "skillOne" ? "skillOne" : "skillTwo",
      };
    }
    const skillAge = _.clock.elapsedTime - skillPulseRef.current.startedAt;
    const skillZoom = visualEffectsEnabled && skillAge < 0.46
      ? Math.sin(THREE.MathUtils.clamp(skillAge / 0.46, 0, 1) * Math.PI) * (skillPulseRef.current.attack === "skillTwo" ? 3.1 : 2.4)
      : 0;
    if (combat) {
      const framing = getDuelCameraFraming({
        player: combat.player,
        bot: combat.bot,
        aspect: size.width / Math.max(1, size.height),
        orbitYaw: cameraOrbitRef.current.yaw,
        lockOn: duelLockOn,
      });
      const pitch = THREE.MathUtils.clamp(cameraOrbitRef.current.pitch, 0.18, 1.05);
      const cinematicProgress = cinematicIntro && !motionReduced
        ? THREE.MathUtils.clamp((_.clock.elapsedTime - (cinematicStartRef.current ?? _.clock.elapsedTime)) / 2, 0, 1)
        : 1;
      const easedCinematicProgress = cinematicProgress * cinematicProgress * (3 - 2 * cinematicProgress);
      const cameraYaw = framing.yaw + (1 - easedCinematicProgress) * 0.22;
      const cameraDistance = framing.distance + (1 - easedCinematicProgress) * 1.6;
      const horizontal = cameraDistance * Math.cos(pitch);
      const vertical = cameraDistance * Math.sin(pitch);
      const centerZ = -(motion.distance - motion.originDistance) + framing.targetZ;
      desiredRef.set(
        framing.targetX + Math.sin(cameraYaw) * horizontal,
        1.15 + vertical,
        centerZ + Math.cos(cameraYaw) * horizontal,
      );
      targetRef.set(framing.targetX, 1.0, centerZ);
      if (combat.lastImpactTick !== impactRef.current.tick) {
        impactRef.current = { tick: combat.lastImpactTick, startedAt: _.clock.elapsedTime };
      }
      const impactAge = _.clock.elapsedTime - impactRef.current.startedAt;
      const impact = impactAge < 0.13 ? combat.lastImpactStrength * (1 - impactAge / 0.13) : 0;
      if (impact > 0 && visualEffectsEnabled && !motionReduced) {
        camera.position.x += Math.sin(_.clock.elapsedTime * 58) * 0.078 * impact;
        camera.position.y += Math.cos(_.clock.elapsedTime * 51) * 0.046 * impact;
      }
    } else if (focusedRival) {
      const playerX = motion.depth * 5.2;
      const gap = focusedRival.distance - motion.distance;
      const rivalX = focusedRival.x;
      const orbit = cinematicIntro && !motionReduced ? Math.sin(_.clock.elapsedTime * 1.35) * 0.78 : 0;
      const orbitDepth = cinematicIntro && !motionReduced ? Math.cos(_.clock.elapsedTime * 1.35) * 0.22 : 0;
      desiredRef.set((playerX + rivalX) * 0.5 + 3.2 + orbit, 3.55 + Math.abs(orbit) * 0.12, -gap * 0.5 + 6.1 + orbitDepth);
      targetRef.set((playerX + rivalX) * 0.5 + orbit * 0.22, 1.15, -gap * 0.5);
    } else {
      desiredRef.set(lateral * 0.56, 4.15 + Math.min(speed, 7) * 0.045, 10.2 + Math.min(speed, 7) * 0.18);
      targetRef.set(lateral * 0.42, 1.25, -11.5);
    }
    camera.position.lerp(desiredRef, response);
    const runShake = motionReduced ? 0 : THREE.MathUtils.clamp((speed - 4.2) / 2.2, 0, 1);
    const time = _.clock.elapsedTime;
    camera.position.x += Math.sin(time * 17.5) * 0.018 * runShake;
    camera.position.y += Math.cos(time * 13.2) * 0.014 * runShake;
    camera.lookAt(targetRef);
    const combatImpact = combat ? combat.lastImpactStrength : 0;
    const finisherZoom = finisherSlowMotion && visualEffectsEnabled ? 2.1 : 0;
    const duelFov = combat
      ? getDuelCameraFraming({
          player: combat.player,
          bot: combat.bot,
          aspect: size.width / Math.max(1, size.height),
          orbitYaw: cameraOrbitRef.current.yaw,
          lockOn: duelLockOn,
        }).fov
      : 45;
    const desiredFov = combat
      ? duelFov - combatImpact * 1.1 - skillZoom - finisherZoom
      : focusedRival ? (cinematicIntro ? 51 : 48) : 54 + Math.min(speed, 7) * 0.7;
    const nextFov = THREE.MathUtils.damp(camera.fov, desiredFov, 3, scaledDelta);
    if (Math.abs(nextFov - camera.fov) > 0.015) {
      camera.fov = nextFov;
      camera.updateProjectionMatrix();
    }
  });

  return <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 4.15, 10.2]} fov={54} near={0.6} far={WORLD_CAMERA_FAR} />;
}

function combatAnimation(action: CombatAction, speed: number) {
  if (action === "windup") return "block" as const;
  if (action === "attack") return "attack" as const;
  if (action === "heavyAttack" || action === "skillOne" || action === "skillTwo") return "heavyAttack" as const;
  if (action === "block" || action === "dodge" || action === "hit" || action === "die") return action;
  return speed > 0.28 ? "walk" as const : "idle" as const;
}

function DuelFighter({
  side,
  opponentName,
  motionRef,
  combatStateRef,
  combatRender,
  motionReduced,
  equipmentVisual,
  visualEffectsEnabled,
  finisherSlowMotion,
}: {
  side: "player" | "bot";
  opponentName: string;
  motionRef: MutableRefObject<WorldMotion>;
  combatStateRef: MutableRefObject<CombatState | null>;
  combatRender: CombatState | null;
  motionReduced: boolean;
  equipmentVisual: EquipmentVisual;
  visualEffectsEnabled: boolean;
  finisherSlowMotion: boolean;
}) {
  const actorRoot = useRef<THREE.Group>(null);
  const actorVisualRoot = useRef<THREE.Group>(null);
  const deathStartedAtRef = useRef<number | null>(null);
  const actorMotion = useMemo(() => ({ current: createWorldMotion() }), []);
  const renderedActor = combatRender?.[side];
  const speed = renderedActor ? Math.hypot(renderedActor.vx, renderedActor.vz) : 0;
  const animation = renderedActor ? combatAnimation(renderedActor.action, speed) : "idle";
  const modelConfig = side === "bot" ? getOpponentModelConfig(opponentName) : undefined;
  const modelAnimationState = modelConfig
    ? combatRender?.ended
      ? combatRender.verdict === "defeat"
        ? "victory"
        : combatRender.verdict === "victory"
          ? "death"
          : mapOpponentAnimationState(animation, renderedActor?.action)
      : mapOpponentAnimationState(animation, renderedActor?.action)
    : undefined;
  const defeated = Boolean(
    renderedActor
    && (renderedActor.action === "die"
      || (combatRender?.ended && (
        (side === "player" && combatRender.verdict === "defeat")
        || (side === "bot" && combatRender.verdict === "victory")
      ))),
  );

  useFrame(() => {
    const state = combatStateRef.current;
    const actor = state?.[side];
    if (!state || !actor) return;
    actorMotion.current.depth = THREE.MathUtils.clamp(actor.x / 5.2, -1, 1);
    actorMotion.current.velocityX = actor.vx;
    actorMotion.current.velocityY = actor.vz;
    actorMotion.current.distance = motionRef.current.distance - actor.z;
    actorMotion.current.cameraX = motionRef.current.cameraX;
    actorMotion.current.stepPhase = state.tick * 0.13;
    actorMotion.current.hasMoved = Math.hypot(actor.vx, actor.vz) > 0.25;
    actorRoot.current?.position.set(0, 0, actor.z);
  });

  useFrame((frame) => {
    const visualRoot = actorVisualRoot.current;
    if (!visualRoot) return;
    const baseScale = side === "bot" ? 1.07 : 1;
    const staminaRatio = side === "player" && renderedActor
      ? renderedActor.stamina / Math.max(1, renderedActor.maxStamina)
      : 1;
    const exhaustion = visualEffectsEnabled && !motionReduced && !defeated
      ? THREE.MathUtils.clamp((0.2 - staminaRatio) / 0.2, 0, 1)
      : 0;
    visualRoot.position.y = Math.sin(frame.clock.elapsedTime * 4.6) * 0.026 * exhaustion;
    visualRoot.rotation.x = Math.sin(frame.clock.elapsedTime * 2.4) * 0.018 * exhaustion;
    if (!visualEffectsEnabled || !defeated) {
      deathStartedAtRef.current = null;
      visualRoot.scale.setScalar(baseScale);
      return;
    }
    deathStartedAtRef.current ??= frame.clock.elapsedTime;
    const progress = THREE.MathUtils.clamp((frame.clock.elapsedTime - deathStartedAtRef.current) / 0.86, 0, 1);
    visualRoot.scale.setScalar(baseScale * (1 - progress));
  });

  if (!renderedActor) return null;
  return (
    <group ref={actorRoot}>
      <group ref={actorVisualRoot} scale={side === "bot" ? 1.07 : 1}>
        <KnightActor
          motionRef={actorMotion}
          state={animation}
          motionReduced={motionReduced}
          animationTimeScale={finisherSlowMotion && visualEffectsEnabled ? 0.36 : 1}
          facingAngle={renderedActor.yaw}
          appearance={side === "player" ? equipmentVisual : undefined}
          castShadow
          modelConfig={modelConfig}
          modelAnimationState={modelAnimationState}
        />
      </group>
      {visualEffectsEnabled && <DuelAshDispersal active={defeated} x={renderedActor.x} />}
      {side === "bot" && (
        <Html position={[renderedActor.x, 2.55, renderedActor.z]} center distanceFactor={12} zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
          <span className="world-rival-tag is-focused">
            <b>{opponentName}</b>
            <span>{getWorldBotProfileByName(opponentName)?.title ?? "SAVAŞÇI"}</span>
          </span>
        </Html>
      )}
      <group position={[renderedActor.x, 0.055, renderedActor.z]} rotation={[0, renderedActor.yaw, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.42, 0.47, 32]} />
          <meshBasicMaterial
            color={side === "player" ? "#71ded5" : "#ff9778"}
            transparent
            opacity={0.5}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, 0.045, 0.74]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.14, 0.34, 3]} />
          <meshBasicMaterial color={side === "player" ? "#a2fff0" : "#ffb094"} transparent opacity={0.82} depthWrite={false} />
        </mesh>
        {visualEffectsEnabled && renderedActor.attackType && !renderedActor.attackHit && (
          <mesh position={[0, 0.07, 0.78]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.28, 0.92]} />
            <meshBasicMaterial
              color={renderedActor.attackType === "skillTwo" ? "#75ecff" : "#ffcf88"}
              transparent
              opacity={0.48}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
      </group>
    </group>
  );
}

function DuelAshDispersal({ active, x }: { active: boolean; x: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const progressRef = useRef(0);
  const count = 26;
  const { geometry, seeds } = useMemo(() => {
    const nextGeometry = new THREE.BufferGeometry();
    const positions = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
    positions.setUsage(THREE.DynamicDrawUsage);
    nextGeometry.setAttribute("position", positions);
    const nextSeeds = new Float32Array(count * 4);
    for (let index = 0; index < count; index += 1) {
      nextSeeds[index * 4] = (index / count) * Math.PI * 2;
      nextSeeds[index * 4 + 1] = ((index * 17) % 13) / 13;
      nextSeeds[index * 4 + 2] = ((index * 29) % 11) / 11;
      nextSeeds[index * 4 + 3] = ((index * 7) % 9) / 9;
    }
    return { geometry: nextGeometry, seeds: nextSeeds };
  }, []);
  const material = useMemo(() => new THREE.PointsMaterial({
    color: "#d8c8b1",
    size: 0.075,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  }), []);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useFrame((_, delta) => {
    const points = pointsRef.current;
    if (!points) return;
    if (!active) {
      progressRef.current = 0;
      points.visible = false;
      material.opacity = 0;
      return;
    }
    progressRef.current = Math.min(1, progressRef.current + Math.min(delta, 0.05) / 0.86);
    const progress = progressRef.current;
    const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let index = 0; index < count; index += 1) {
      const angle = seeds[index * 4];
      const height = seeds[index * 4 + 1];
      const drift = seeds[index * 4 + 2];
      const curve = angle + progress * (0.8 + drift);
      const spread = 0.1 + progress * (0.32 + drift * 0.2);
      positions.setXYZ(
        index,
        Math.cos(curve) * spread,
        0.2 + height * 0.58 + progress * (0.75 + drift * 0.9),
        Math.sin(curve) * spread + (seeds[index * 4 + 3] - 0.5) * progress * 0.2,
      );
    }
    positions.needsUpdate = true;
    points.visible = progress < 1;
    material.opacity = (1 - progress) * 0.78;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} position={[x, 0.025, 0]} frustumCulled={false} />;
}

function DuelTelegraph({ combatStateRef, motionReduced }: { combatStateRef: MutableRefObject<CombatState | null>; motionReduced: boolean }) {
  const ringRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const glintMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const glintLightRef = useRef<THREE.PointLight>(null);

  useFrame((frame) => {
    const bot = combatStateRef.current?.bot;
    if (!bot || !ringRef.current || !materialRef.current || !glintMaterialRef.current || !glintLightRef.current) return;
    const pulse = motionReduced ? 0.5 : (Math.sin(frame.clock.elapsedTime * 17) + 1) * 0.5;
    ringRef.current.position.set(bot.x, 0.07, bot.z + 0.88);
    ringRef.current.scale.setScalar(0.94 + pulse * 0.12);
    materialRef.current.opacity = 0.48 + pulse * 0.34;
    glintMaterialRef.current.opacity = 0.25 + pulse * 0.72;
    glintLightRef.current.intensity = 0.25 + pulse * 1.1;
  });

  return (
    <group ref={ringRef}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.72, 1.04, 48]} />
        <meshBasicMaterial ref={materialRef} color="#ff3444" transparent opacity={0.65} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.003, 0]}>
        <circleGeometry args={[0.72, 40]} />
        <meshBasicMaterial color="#c20e27" transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.36, 1.18, -0.76]} rotation={[0.08, 0, -0.48]}>
        <boxGeometry args={[0.095, 0.62, 0.055]} />
        <meshBasicMaterial ref={glintMaterialRef} color="#fff0ae" transparent opacity={0.8} toneMapped={false} />
      </mesh>
    </group>
  );
}

function DuelCombatVisual({
  event,
  kind,
  combatStateRef,
  motionReduced,
}: {
  event: CombatVisualEvent;
  kind: DuelVfxKind;
  combatStateRef: MutableRefObject<CombatState | null>;
  motionReduced: boolean;
}) {
  const fireballRef = useRef<THREE.Group>(null);
  const lightningMaterialRef = useRef<THREE.LineBasicMaterial>(null);
  const shieldRef = useRef<THREE.Mesh>(null);
  const shieldMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const afterimageRef = useRef<THREE.Group>(null);
  const afterimageMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const shockwaveRef = useRef<THREE.Mesh>(null);
  const shockwaveMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const lightningPositions = useMemo(
    () => new Float32Array(LIGHTNING_BOLT_COUNT * LIGHTNING_SEGMENT_COUNT * 2 * 3),
    [],
  );
  const lightningGeometry = useMemo(() => new THREE.BufferGeometry(), []);
  const start = useMemo(() => new THREE.Vector3(), []);
  const end = useMemo(() => new THREE.Vector3(), []);
  const first = useMemo(() => new THREE.Vector3(), []);
  const second = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const attribute = new THREE.BufferAttribute(lightningPositions, 3);
    attribute.setUsage(THREE.DynamicDrawUsage);
    lightningGeometry.setAttribute("position", attribute);
    return () => lightningGeometry.dispose();
  }, [lightningGeometry, lightningPositions]);

  useFrame((frame) => {
    const state = combatStateRef.current;
    if (!state) return;
    const actor = state[event.target];
    const opponent = state[event.target === "player" ? "bot" : "player"];
    const age = THREE.MathUtils.clamp((performance.now() - (event.expiresAt - 900)) / 900, 0, 1);
    const fade = 1 - age;
    start.set(actor.x + (event.target === "player" ? 0.26 : -0.26), 1.1, actor.z - 0.42);
    end.set(opponent.x, 1.04, opponent.z - 0.08);

    if (kind === "fireball" && fireballRef.current) {
      fireballRef.current.position.lerpVectors(start, end, age);
      fireballRef.current.position.y += Math.sin(age * Math.PI) * 0.35;
      fireballRef.current.scale.setScalar(motionReduced ? 0.92 : 0.82 + Math.sin(frame.clock.elapsedTime * 24) * 0.08 + (1 - age) * 0.16);
      fireballRef.current.visible = age < 1;
    }

    if (kind === "lightning" && lightningMaterialRef.current) {
      let vertex = 0;
      for (let bolt = 0; bolt < LIGHTNING_BOLT_COUNT; bolt += 1) {
        const branchOffset = (bolt - (LIGHTNING_BOLT_COUNT - 1) / 2) * 0.18;
        for (let segment = 0; segment < LIGHTNING_SEGMENT_COUNT; segment += 1) {
          const t0 = segment / LIGHTNING_SEGMENT_COUNT;
          const t1 = (segment + 1) / LIGHTNING_SEGMENT_COUNT;
          const offsetPoint = (point: THREE.Vector3, progress: number) => {
            point.lerpVectors(start, end, progress);
            const effectTime = motionReduced ? 0 : frame.clock.elapsedTime;
            const jagged = Math.sin(progress * 27 + bolt * 13 + event.id * 0.7 + effectTime * 74) * 0.13;
            const envelope = Math.sin(progress * Math.PI);
            point.x += branchOffset * envelope + jagged * envelope;
            point.y += Math.sin(progress * 41 + bolt * 4 + effectTime * 82) * 0.15 * envelope;
          };
          offsetPoint(first, t0);
          offsetPoint(second, t1);
          lightningPositions[vertex++] = first.x;
          lightningPositions[vertex++] = first.y;
          lightningPositions[vertex++] = first.z;
          lightningPositions[vertex++] = second.x;
          lightningPositions[vertex++] = second.y;
          lightningPositions[vertex++] = second.z;
        }
      }
      const positions = lightningGeometry.getAttribute("position") as THREE.BufferAttribute;
      positions.needsUpdate = true;
      lightningMaterialRef.current.opacity = fade * (motionReduced ? 0.8 : 0.72 + Math.sin(frame.clock.elapsedTime * 58) * 0.2);
    }

    if ((kind === "shield") && shieldRef.current && shieldMaterialRef.current) {
      const defender = state[event.target];
      shieldRef.current.position.set(defender.x, 1.02, defender.z - 0.1);
      shieldRef.current.scale.set(0.7 + age * 0.34, 1.02 + age * 0.22, 0.54 + age * 0.22);
      shieldMaterialRef.current.opacity = fade * (event.type === "parry" ? 0.34 : 0.2);
    }

    if (kind === "afterimage" && afterimageRef.current && afterimageMaterialRef.current) {
      const dodging = state[event.target];
      afterimageRef.current.position.set(
        dodging.x - THREE.MathUtils.clamp(dodging.vx * 0.12, -0.3, 0.3),
        0.04,
        dodging.z - THREE.MathUtils.clamp(dodging.vz * 0.12, -0.34, 0.34),
      );
      afterimageRef.current.rotation.y = Math.atan2(dodging.vx, -dodging.vz);
      afterimageRef.current.scale.setScalar(1 - age * 0.1);
      afterimageMaterialRef.current.opacity = fade * 0.28;
    }

    if (kind === "shockwave" && shockwaveRef.current && shockwaveMaterialRef.current) {
      shockwaveRef.current.position.set(opponent.x, 0.065, opponent.z - 0.1);
      shockwaveRef.current.scale.setScalar(0.5 + age * 2.1);
      shockwaveMaterialRef.current.opacity = fade * 0.85;
    }
  });

  return (
    <>
      {kind === "fireball" && (
        <group ref={fireballRef}>
          <mesh>
            <icosahedronGeometry args={[0.24, 1]} />
            <meshStandardMaterial color="#ffbc62" emissive="#ff4f16" emissiveIntensity={2.1} toneMapped={false} />
          </mesh>
          <mesh scale={1.5}>
            <sphereGeometry args={[0.24, 10, 8]} />
            <meshBasicMaterial color="#ff6a27" transparent opacity={0.22} depthWrite={false} />
          </mesh>
        </group>
      )}
      {kind === "lightning" && (
        <lineSegments geometry={lightningGeometry} frustumCulled={false}>
          <lineBasicMaterial
            ref={lightningMaterialRef}
            color="#a8f3ff"
            transparent
            opacity={0.9}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </lineSegments>
      )}
      {kind === "shield" && (
        <mesh ref={shieldRef}>
          <icosahedronGeometry args={[0.72, 1]} />
          <meshBasicMaterial
            ref={shieldMaterialRef}
            color={event.type === "parry" ? "#ffe8a0" : "#7ae7ff"}
            wireframe
            transparent
            opacity={0.28}
            depthWrite={false}
          />
        </mesh>
      )}
      {kind === "afterimage" && (
        <group ref={afterimageRef}>
          <mesh position={[0, 0.92, 0]}>
            <capsuleGeometry args={[0.19, 0.56, 4, 6]} />
            <meshBasicMaterial
              ref={afterimageMaterialRef}
              color="#a7ecf5"
              transparent
              opacity={0.3}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, 1.66, 0]}>
            <sphereGeometry args={[0.16, 8, 6]} />
            <meshBasicMaterial color="#d6faff" transparent opacity={0.2} depthWrite={false} />
          </mesh>
        </group>
      )}
      {kind === "shockwave" && (
        <mesh ref={shockwaveRef} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.24, 0.42, 28]} />
          <meshBasicMaterial
            ref={shockwaveMaterialRef}
            color={event.critical ? "#ffe9a8" : "#ff9d62"}
            transparent
            opacity={0.8}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </>
  );
}

function DuelArena({
  opponentName,
  motionRef,
  combatStateRef,
  combatRender,
  combatVisualEvents,
  motionReduced,
  equipmentVisual,
  visualEffectsEnabled,
  finisherSlowMotion,
  botTelegraphActive,
}: Pick<World3DProps, "opponentName" | "motionRef" | "combatStateRef" | "combatRender" | "combatVisualEvents" | "motionReduced" | "equipmentVisual" | "visualEffectsEnabled" | "finisherSlowMotion" | "botTelegraphActive">) {
  return (
    <group position={[0, 0, -(motionRef.current.distance - motionRef.current.originDistance)]}>
      <mesh position={[0, -0.045, -0.6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[26, 96]} />
        <meshStandardMaterial color="#302a35" emissive="#211822" emissiveIntensity={0.14} roughness={0.98} />
      </mesh>
      <mesh position={[0, 0.018, -0.6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[4.28, 96]} />
        <meshStandardMaterial
          color="#40313a"
          emissive="#4d2926"
          emissiveIntensity={0.24}
          roughness={0.94}
          metalness={0.04}
        />
      </mesh>
      <mesh position={[0, 0.026, -0.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.22, 4.3, 96]} />
        <meshBasicMaterial color="#855248" transparent opacity={0.3} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.055, -0.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.05, 4.18, 96]} />
        <meshBasicMaterial color="#f2a05b" transparent opacity={0.58} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.045, -0.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.78, 3.86, 72]} />
        <meshBasicMaterial color="#e45c48" transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {Array.from({ length: 8 }, (_, index) => {
        const angle = (index / 8) * Math.PI * 2;
        const radius = 4.14;
        return (
        <group key={index} position={[Math.sin(angle) * radius, 0, -0.6 + Math.cos(angle) * radius]}>
          <mesh position={[0, 0.66, 0]}>
            <cylinderGeometry args={[0.085, 0.13, 1.3, 7]} />
            <meshStandardMaterial color="#4b3030" roughness={0.78} />
          </mesh>
          <mesh position={[0, 1.43, 0]}>
            <dodecahedronGeometry args={[0.19, 0]} />
            <meshBasicMaterial color="#ff9d58" transparent opacity={0.85} depthWrite={false} />
          </mesh>
        </group>
        );
      })}
      {visualEffectsEnabled && botTelegraphActive && <DuelTelegraph combatStateRef={combatStateRef} motionReduced={motionReduced} />}
      {visualEffectsEnabled && combatVisualEvents
        .filter((event) => getDuelVfxKind(event) !== "none")
        .slice(-MAX_ACTIVE_DUEL_VFX)
        .map((event) => (
          <DuelCombatVisual
            key={event.id}
            event={event}
            kind={getDuelVfxKind(event)}
            combatStateRef={combatStateRef}
            motionReduced={motionReduced}
          />
        ))}
      {combatRender && (
        <>
          <DuelFighter side="player" opponentName={opponentName} motionRef={motionRef} combatStateRef={combatStateRef} combatRender={combatRender} motionReduced={motionReduced} equipmentVisual={equipmentVisual} visualEffectsEnabled={visualEffectsEnabled} finisherSlowMotion={finisherSlowMotion} />
          <DuelFighter side="bot" opponentName={opponentName} motionRef={motionRef} combatStateRef={combatStateRef} combatRender={combatRender} motionReduced={motionReduced} equipmentVisual={equipmentVisual} visualEffectsEnabled={visualEffectsEnabled} finisherSlowMotion={finisherSlowMotion} />
        </>
      )}
    </group>
  );
}

function PlayerLight({
  motionRef,
  level,
  relicCount,
  lightRadius,
  lightColor,
}: {
  motionRef: MutableRefObject<WorldMotion>;
  level: number;
  relicCount: number;
  lightRadius: number;
  lightColor: string;
}) {
  const glowRef = useRef<THREE.Mesh>(null);
  const progression = Math.min(0.6, Math.max(0, level - 1) * 0.035 + relicCount * 0.04);
  useFrame(() => {
    const motion = motionRef.current;
    const x = motion.depth * 5.2;
    if (glowRef.current) glowRef.current.position.x = x;
  });
  return (
    <>
      <mesh ref={glowRef} position={[0, 0.04, -3.2]} scale={[4.5 + lightRadius * 0.08, 0.045, 9]}>
        <sphereGeometry args={[1, 12, 7]} />
        <meshBasicMaterial color={lightColor} transparent opacity={0.09 + progression * 0.025} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, 0.14, -1.8]} scale={[4.4, 0.06, 6.6]}>
        <sphereGeometry args={[1, 10, 6]} />
        <meshBasicMaterial color={lightColor} transparent opacity={0.06 + progression * 0.018} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </>
  );
}

function WorldCollisionDebug({
  grid,
  motionRef,
}: {
  grid: WorldCollisionGrid;
  motionRef: MutableRefObject<WorldMotion>;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const colliders = useMemo(() => {
    const result = [];
    for (const row of grid.values()) {
      for (const cell of row.values()) {
        for (const collider of cell) result.push(collider);
      }
    }
    return result;
  }, [grid]);

  useFrame(() => {
    if (rootRef.current) {
      rootRef.current.position.z = motionRef.current.cameraX - motionRef.current.originDistance;
    }
  });

  return (
    <group ref={rootRef}>
      {colliders.map((collider) => (
        <mesh
          key={collider.id}
          position={[collider.x, 0.055, -(collider.distance - motionRef.current.originDistance)]}
          rotation={collider.shape === "circle" ? [-Math.PI / 2, 0, 0] : undefined}
        >
          {collider.shape === "circle"
            ? <ringGeometry args={[Math.max(0.02, collider.radius - 0.055), collider.radius, 18]} />
            : <boxGeometry args={[collider.halfWidth * 2, 0.03, collider.halfDepth * 2]} />}
          <meshBasicMaterial color={collider.breakableId ? "#ff9c5a" : "#7ce6b2"} wireframe transparent opacity={0.82} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function SceneContents({
  motionRef,
  collisionGrid,
  quality,
  visualEffectsEnabled,
  motionReduced,
  weatherMode,
  level,
  relicCount,
  equipmentVisual,
  lightRadius,
  animationState,
  rivals,
  collectedPickupIds,
  brokenObstacleIds,
  focusedRival,
  slowMotion,
  combatActive,
  combatStateRef,
  cameraOrbitRef,
  duelLockOn,
  combatVisualEvents,
  cinematicIntro,
  finisherSlowMotion,
  botTelegraphActive,
  combatRender,
  opponentName,
  onDebugStats,
  performanceMonitorEnabled,
  onPerformanceStats,
  debugEnabled,
}: World3DProps & {
  onDebugStats: (stats: DebugStats) => void;
  onPerformanceStats: (stats: FrameMetricsSnapshot) => void;
  debugEnabled: boolean;
}) {
  const chunkCacheRef = useRef(new Map<number, WorldChunk>());
  const [chunks, setChunks] = useState<WorldChunk[]>(() => getChunksForDistance(motionRef.current.distance, chunkCacheRef.current));
  const activeChunkRef = useRef(Math.floor(motionRef.current.distance / WORLD_CHUNK_LENGTH_METERS));
  const footSlipRef = useRef(0);
  const darkPixelWindowsRef = useRef(0);
  const pixelRecoverySentRef = useRef(false);
  const touchPixelSampleAtRef = useRef(-1_000);
  const prefetchCancelRef = useRef<(() => void) | null>(null);
  const initialPrefetchRef = useRef(false);
  const { gl } = useThree();
  const touchRenderer = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const shadowMapSize = getShadowMapSize(quality, gl.getPixelRatio());
  const debugClock = useRef({ startedAt: 0, frames: 0, longFrames: 0, maxFrameMs: 0 });
  const zeroDrawCallFramesRef = useRef(0);
  const zeroDrawRecoverySentRef = useRef(false);
  const performanceMetricsRef = useRef(createFrameMetricsAccumulator());

  const scheduleChunkPrefetch = (chunkIndex: number) => {
    prefetchCancelRef.current?.();
    prefetchCancelRef.current = null;
    if (chunkCacheRef.current.has(chunkIndex)) return;
    const run = () => {
      prefetchCancelRef.current = null;
      if (!chunkCacheRef.current.has(chunkIndex)) {
        chunkCacheRef.current.set(chunkIndex, createWorldChunk(chunkIndex));
      }
    };
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (idleWindow.requestIdleCallback) {
      const handle = idleWindow.requestIdleCallback(run, { timeout: 600 });
      prefetchCancelRef.current = () => idleWindow.cancelIdleCallback?.(handle);
    } else {
      const handle = window.setTimeout(run, 0);
      prefetchCancelRef.current = () => window.clearTimeout(handle);
    }
  };

  useEffect(() => () => prefetchCancelRef.current?.(), []);

  useEffect(() => {
    performanceMetricsRef.current = createFrameMetricsAccumulator();
    if (!performanceMonitorEnabled) {
      onPerformanceStats({ averageFps: 0, minimumFps: 0, averageFrameMs: 0, longFrames: 0 });
    }
  }, [onPerformanceStats, performanceMonitorEnabled]);

  useFrame((frame, delta) => {
    lastSceneFrameAt = performance.now();
    const motion = motionRef.current;
    const observePixels = (pixelSample: ReturnType<typeof sampleRendererPixels>) => {
      const health = advanceBlackFrameSamples(
        darkPixelWindowsRef.current,
        pixelSample.meanLuminance,
      );
      darkPixelWindowsRef.current = health.consecutiveSamples;
      if (health.shouldRecover && !pixelRecoverySentRef.current) {
        pixelRecoverySentRef.current = true;
        emitWorldDiagnostic("render", "İki ardışık ölçümde siyah kare bulundu; düşük yükte sahne kurtarma başlatıldı.");
        window.dispatchEvent(new CustomEvent("shafak:scene-recovery", {
          detail: { message: "WebGL iki ölçümde siyah kare üretti." },
        }));
      } else if (pixelSample.meanLuminance !== null
        && pixelSample.meanLuminance >= BLACK_FRAME_LUMINANCE_THRESHOLD) {
        pixelRecoverySentRef.current = false;
      }
      return pixelSample;
    };
    if (gl.info.render.calls > 0) {
      zeroDrawCallFramesRef.current = 0;
      zeroDrawRecoverySentRef.current = false;
    } else {
      zeroDrawCallFramesRef.current += 1;
      if (zeroDrawCallFramesRef.current >= 120 && !zeroDrawRecoverySentRef.current) {
        zeroDrawRecoverySentRef.current = true;
        emitWorldDiagnostic("render", "120 kare boyunca WebGL draw call üretilmedi.");
        window.dispatchEvent(new CustomEvent("shafak:scene-recovery", {
          detail: { message: "3D sahne 120 kare boyunca çizim üretmedi." },
        }));
      }
    }
    if (performanceMonitorEnabled) {
      const stats = recordFrameMetric(
        performanceMetricsRef.current,
        frame.clock.elapsedTime * 1_000,
        delta * 1_000,
      );
      if (stats) onPerformanceStats(stats);
    }
    const currentChunk = Math.floor(motion.distance / WORLD_CHUNK_LENGTH_METERS);
    if (!initialPrefetchRef.current) {
      initialPrefetchRef.current = true;
      scheduleChunkPrefetch(currentChunk + 5);
    }
    if (currentChunk !== activeChunkRef.current) {
      activeChunkRef.current = currentChunk;
      setChunks(getChunksForDistance(motion.distance, chunkCacheRef.current));
      scheduleChunkPrefetch(currentChunk + 5);
    }
    if (debugEnabled) {
      const now = frame.clock.elapsedTime;
      const monitor = debugClock.current;
      const frameMs = delta * 1_000;
      if (!monitor.startedAt) monitor.startedAt = now;
      monitor.frames += 1;
      monitor.maxFrameMs = Math.max(monitor.maxFrameMs, frameMs);
      if (frameMs > 100) monitor.longFrames += 1;
      const elapsed = now - monitor.startedAt;
      if (elapsed >= 1) {
        const browserPerformance = performance as Performance & { memory?: { usedJSHeapSize: number } };
        const pixelSample = observePixels(sampleRendererPixels(gl));
        const background = frame.scene.background;
        const fog = frame.scene.fog;
        onDebugStats({
          x: motion.depth * 5.2,
          y: 0,
          z: -(motion.distance - motion.originDistance),
          distance: motion.distance,
          speed: Math.hypot(motion.velocityX, motion.velocityY),
          fps: Math.round(monitor.frames / elapsed),
          drawCalls: gl.info.render.calls,
          triangles: gl.info.render.triangles,
          geometries: gl.info.memory.geometries,
          textures: gl.info.memory.textures,
          heapMb: browserPerformance.memory
            ? Math.round(browserPerformance.memory.usedJSHeapSize / (1024 * 1024))
            : null,
          maxFrameMs: Math.round(monitor.maxFrameMs),
          longFrames: monitor.longFrames,
          animation: animationState,
          footSlip: footSlipRef.current,
          chunks: chunks.length,
          cameraX: frame.camera.position.x,
          cameraY: frame.camera.position.y,
          cameraZ: frame.camera.position.z,
          exposure: gl.toneMappingExposure,
          background: background instanceof THREE.Color ? `#${background.getHexString()}` : background ? "texture" : "none",
          fogDensity: fog instanceof THREE.FogExp2 ? fog.density : 0,
          programs: gl.info.programs?.length ?? 0,
          lights: frame.scene.children.filter((child) => child instanceof THREE.Light && child.visible).length,
          pixelLuminance: pixelSample.meanLuminance,
          litPixelSamples: pixelSample.litSamples,
          pixelSampleCount: pixelSample.sampleCount,
        });
        monitor.startedAt = now;
        monitor.frames = 0;
        monitor.longFrames = 0;
        monitor.maxFrameMs = 0;
      }
    }
    if (!debugEnabled && touchRenderer) {
      const now = frame.clock.elapsedTime * 1_000;
      if (now - touchPixelSampleAtRef.current >= 1_000) {
        touchPixelSampleAtRef.current = now;
        observePixels(sampleRendererPixels(gl));
      }
    }
    // Count the complete next render, including EffectComposer's extra passes.
    gl.info.reset();
  });

  return (
    <>
      <ProceduralEnvironment />
      <SceneFog motionRef={motionRef} weatherMode={weatherMode} combatActive={combatActive} />
      <RendererEffects quality={quality} visualEffectsEnabled={visualEffectsEnabled} />
      <color attach="background" args={[combatActive ? "#39343e" : "#252330"]} />
      <hemisphereLight args={["#c6b6b9", "#1a1b2b", 0.62]} />
      {combatActive && (
        <>
          <hemisphereLight args={["#f2d7c0", "#4b4355", 1.1]} />
          <directionalLight position={[4, 7, 6]} color="#ffe1bd" intensity={2.2} />
          <directionalLight position={[-5, 4, -3]} color="#acd8e8" intensity={1.25} />
        </>
      )}
      <directionalLight
        position={[-8, 14, 8]}
        color="#ffd09a"
        intensity={2.05}
        castShadow={quality !== "low"}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-camera-near={0.5}
        shadow-camera-far={72}
        shadow-bias={-0.0002}
        shadow-normalBias={0.025}
      />
      {!combatActive && visualEffectsEnabled && quality !== "low" && !touchRenderer && (
        <WorldPostProcessing quality={quality} />
      )}
      <CameraRig
        motionRef={motionRef}
        motionReduced={motionReduced}
        focusedRival={focusedRival}
        slowMotion={slowMotion}
        combatActive={combatActive}
        combatStateRef={combatStateRef}
        cameraOrbitRef={cameraOrbitRef}
        duelLockOn={duelLockOn}
        combatVisualEvents={combatVisualEvents}
        visualEffectsEnabled={visualEffectsEnabled}
        cinematicIntro={cinematicIntro}
        finisherSlowMotion={finisherSlowMotion}
      />
      <AshSky motionRef={motionRef} combatActive={combatActive} />
      <group visible={!combatActive} name="road-world">
        <WorldChunks
          chunks={chunks}
          motionRef={motionRef}
          motionReduced={motionReduced}
          quality={quality}
          weather={weatherMode}
        />
      </group>
      {!combatActive && <WorldRoadEntities
        motionRef={motionRef}
        rivals={rivals}
        collectedPickupIds={collectedPickupIds}
        brokenObstacleIds={brokenObstacleIds}
        focusedRivalId={focusedRival?.id ?? null}
        reducedMotion={motionReduced}
      />}
      {!combatActive && <PlayerLight motionRef={motionRef} level={level} relicCount={relicCount} lightRadius={lightRadius} lightColor={equipmentVisual.auraColor ?? "#ffb36f"} />}
      {combatActive ? (
        <DuelArena
          opponentName={opponentName}
          motionRef={motionRef}
          combatStateRef={combatStateRef}
          combatRender={combatRender}
          combatVisualEvents={combatVisualEvents}
          motionReduced={motionReduced}
          equipmentVisual={equipmentVisual}
          visualEffectsEnabled={visualEffectsEnabled}
          finisherSlowMotion={finisherSlowMotion}
          botTelegraphActive={botTelegraphActive}
        />
      ) : (
        <KnightActor
          motionRef={motionRef}
          state={animationState}
          motionReduced={motionReduced}
          footSlipRef={footSlipRef}
          appearance={equipmentVisual}
        />
      )}
      {debugEnabled && <WorldCollisionDebug grid={collisionGrid} motionRef={motionRef} />}
    </>
  );
}

function isDebugEnabled() {
  if (typeof window === "undefined") return false;
  const query = new URLSearchParams(window.location.search);
  return query.get("debug") === "1" || query.get("selftest") === "1";
}

export default function World3D(props: World3DProps) {
  const [debugEnabled, setDebugEnabled] = useState(isDebugEnabled);
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [canvasAttempt, setCanvasAttempt] = useState(0);
  const [firstFrameReported, setFirstFrameReported] = useState(false);
  const [debugEvents, setDebugEvents] = useState<WorldDiagnostic[]>([]);
  const [debugCopied, setDebugCopied] = useState(false);
  const autoRecoveryAttemptsRef = useRef(0);
  const [performanceStats, setPerformanceStats] = useState<FrameMetricsSnapshot>({
    averageFps: 0,
    minimumFps: 0,
    averageFrameMs: 0,
    longFrames: 0,
  });
  const [debugStats, setDebugStats] = useState<DebugStats>({
    x: 0,
    y: 0,
    z: 0,
    distance: 0,
    speed: 0,
    fps: 0,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
    heapMb: null,
    maxFrameMs: 0,
    longFrames: 0,
    animation: "idle",
    footSlip: 0,
    chunks: 0,
    cameraX: 0,
    cameraY: 0,
    cameraZ: 0,
    exposure: 1,
    background: "n/a",
    fogDensity: 0,
    programs: 0,
    lights: 0,
    pixelLuminance: null,
    litPixelSamples: 0,
    pixelSampleCount: 0,
  });
  const touchRenderer = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const pixelRatio = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  const maxDpr = getWorldRenderPixelRatio(
    props.quality,
    pixelRatio,
    touchRenderer,
    canvasAttempt > 0,
  );
  const minDpr = Math.min(1, maxDpr);
  const markFirstFrame = useCallback(() => {
    setFirstFrameReported(true);
    emitWorldDiagnostic("render", "3D sahnenin ilk karesi çizildi.");
  }, []);
  const retryWebGL = useCallback(() => {
    autoRecoveryAttemptsRef.current = 0;
    setContextLost(false);
    setRecoveryMessage("");
    setFirstFrameReported(false);
    setWebglAvailable(null);
    setCanvasAttempt((attempt) => attempt + 1);
  }, []);
  const retryCanvasAfterError = useCallback((error?: Error) => {
    if (error) emitWorldDiagnostic("recovery", error.stack ?? error.message);
    if (autoRecoveryAttemptsRef.current >= 1) {
      setRecoveryMessage(error?.message ?? "3D sahne çizim üretmiyor.");
      return;
    }
    autoRecoveryAttemptsRef.current += 1;
    setRecoveryMessage("");
    window.setTimeout(() => {
      setContextLost(false);
      setRecoveryMessage("");
      setFirstFrameReported(false);
      setWebglAvailable(null);
      setCanvasAttempt((attempt) => attempt + 1);
    }, 500);
  }, []);
  const markContextLost = useCallback(() => setContextLost(true), []);
  const rebuildRestoredContext = useCallback(() => {
    setContextLost(false);
    setRecoveryMessage("");
    setFirstFrameReported(false);
    setWebglAvailable(null);
    setCanvasAttempt((attempt) => attempt + 1);
  }, []);

  const copyDebugEvents = useCallback(() => {
    const text = formatWorldDiagnostics(debugEvents);
    if (!navigator.clipboard?.writeText) {
      setDebugCopied(false);
      return;
    }
    void navigator.clipboard.writeText(text).then(() => {
      setDebugCopied(true);
      window.setTimeout(() => setDebugCopied(false), 1_800);
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      emitWorldDiagnostic("clipboard", `Tanı kayıtları kopyalanamadı: ${message}`);
    });
  }, [debugEvents]);

  useEffect(() => {
    const onDiagnostic = (event: Event) => {
      const detail = (event as CustomEvent<WorldDiagnostic>).detail;
      if (!detail || typeof detail.message !== "string") return;
      setDebugEvents((current) => appendWorldDiagnostic(current, detail));
    };
    const onError = (event: ErrorEvent) => {
      const stack = event.error instanceof Error ? event.error.stack : "";
      const location = event.filename ? ` (${event.filename}:${event.lineno}:${event.colno})` : "";
      emitWorldDiagnostic("uncaught", `${event.message}${location}${stack ? `\n${stack}` : ""}`);
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.stack ?? reason.message : String(reason);
      emitWorldDiagnostic("promise", message);
    };
    window.addEventListener("shafak:world-diagnostic", onDiagnostic);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("shafak:world-diagnostic", onDiagnostic);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  useEffect(() => {
    const recoverScene = (event: Event) => {
      const detail = (event as CustomEvent<{ error?: Error; message?: string }>).detail;
      retryCanvasAfterError(detail?.error ?? new Error(detail?.message ?? "3D sahne çizim durdu."));
    };
    window.addEventListener("shafak:scene-recovery", recoverScene);
    return () => window.removeEventListener("shafak:scene-recovery", recoverScene);
  }, [retryCanvasAfterError]);

  useEffect(() => {
    const syncDebug = () => setDebugEnabled(isDebugEnabled());
    window.addEventListener("popstate", syncDebug);
    return () => window.removeEventListener("popstate", syncDebug);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setWebglAvailable(supportsWebGL()));
    return () => window.cancelAnimationFrame(frame);
  }, [canvasAttempt]);

  useEffect(() => {
    if (webglAvailable !== true || firstFrameReported || contextLost) return undefined;
    const timer = window.setTimeout(() => {
      emitWorldDiagnostic("render", "Canvas başlatıldı ancak 3 saniyede ilk çizim karesi gelmedi.");
      retryCanvasAfterError(new Error("3D sahne ilk kareyi çizmedi."));
    }, 3_000);
    return () => window.clearTimeout(timer);
  }, [canvasAttempt, contextLost, firstFrameReported, retryCanvasAfterError, webglAvailable]);

  useEffect(() => {
    if (webglAvailable !== true || contextLost) return undefined;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "hidden" || !firstFrameReported || !lastSceneFrameAt) return;
      if (performance.now() - lastSceneFrameAt < 2_500) return;
      emitWorldDiagnostic("render", "Görünür sekmede 2,5 saniyedir WebGL kare sinyali alınmıyor.");
      lastSceneFrameAt = performance.now();
      retryCanvasAfterError(new Error("WebGL render loop durdu."));
    }, 1_500);
    return () => window.clearInterval(timer);
  }, [canvasAttempt, contextLost, firstFrameReported, retryCanvasAfterError, webglAvailable]);

  useEffect(() => {
    if (!webglAvailable) return undefined;
    const timer = window.setTimeout(() => {
      autoRecoveryAttemptsRef.current = 0;
    }, 10_000);
    return () => window.clearTimeout(timer);
  }, [canvasAttempt, webglAvailable]);

  const debugBiomeTransition = getBiomeTransition(debugStats.distance);
  const debugFogDensity = getWorldFogDensity(
    props.weatherMode,
    debugBiomeTransition.biome,
    props.combatActive,
  );

  return (
    <div className="world-three-layer" aria-label="Kül Yolu 3D dünyası">
      {webglAvailable === null ? (
        <div className="world-three-loading" role="status">3D sahne hazırlanıyor…</div>
      ) : webglAvailable ? (
        <WorldCanvasErrorBoundary
          key={canvasAttempt}
          onRetry={retryWebGL}
          onError={retryCanvasAfterError}
        >
          <Canvas
            dpr={[minDpr, maxDpr]}
            shadows={props.quality !== "low" && canvasAttempt === 0}
            camera={{ position: [0, 4.15, 10.2], fov: 54, near: 0.6, far: WORLD_CAMERA_FAR }}
            gl={{
              alpha: false,
              antialias: false,
              preserveDrawingBuffer: debugEnabled,
              powerPreference: "high-performance",
              toneMapping: props.visualEffectsEnabled ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping,
              toneMappingExposure: props.visualEffectsEnabled ? 1.12 : 1,
            }}
            onCreated={({ gl: renderer, scene }) => {
              renderer.outputColorSpace = THREE.SRGBColorSpace;
              renderer.info.autoReset = false;
              lastSceneFrameAt = performance.now();
              const previousShaderError = renderer.debug.onShaderError;
              renderer.debug.checkShaderErrors = true;
              renderer.debug.onShaderError = (context, program, vertexShader, fragmentShader) => {
                const logs = [
                  context.getProgramInfoLog(program),
                  context.getShaderInfoLog(vertexShader),
                  context.getShaderInfoLog(fragmentShader),
                ].filter(Boolean).join("\n").slice(0, 1_800);
                emitWorldDiagnostic("shader", logs || "WebGL shader/program derleme hatası.");
                if (typeof previousShaderError === "function") {
                  previousShaderError(context, program, vertexShader, fragmentShader);
                }
              };
              scene.background = new THREE.Color("#252330");
              emitWorldDiagnostic("webgl", `Renderer hazır; DPR ${renderer.getPixelRatio().toFixed(2)}, maksimum doku ${renderer.getContext().getParameter(renderer.getContext().MAX_TEXTURE_SIZE)} px.`);
            }}
            fallback={(
              <div className="world-three-fallback" role="alert">
                <div className="world-three-fallback__content">
                  <span>Bu tarayıcı 3D sahneyi başlatamadı.</span>
                  <button type="button" onClick={retryWebGL}>YENİDEN DENE</button>
                </div>
              </div>
            )}
          >
            <CanvasContextGuard onLost={markContextLost} onRestored={rebuildRestoredContext} />
            <FirstFrameGuard onFirstFrame={markFirstFrame} />
            <SceneContents
              {...props}
              debugEnabled={debugEnabled}
              onDebugStats={setDebugStats}
              onPerformanceStats={setPerformanceStats}
            />
          </Canvas>
        </WorldCanvasErrorBoundary>
      ) : (
        <div className="world-three-fallback" role="alert">
          <div className="world-three-fallback__content">
            <span>Bu tarayıcı WebGL ile 3D sahneyi başlatamıyor. Oyunu WebGL destekli bir tarayıcıda açın.</span>
            <button type="button" onClick={retryWebGL}>YENİDEN DENE</button>
          </div>
        </div>
      )}
      {(contextLost || recoveryMessage) && (
        <div className="world-three-recovery" role="alert">
          <div>
            <strong>{contextLost ? "3D sahne durakladı" : "3D sahne yeniden yüklenemedi"}</strong>
            <span>{recoveryMessage || "Grafik bağlamı kesildi. Sahneyi yeniden yükleyip devam edebilirsin."}</span>
            <button type="button" onClick={retryWebGL}>SAHNEYİ YENİDEN YÜKLE</button>
          </div>
        </div>
      )}
      {debugEnabled && (
        <aside className="world-debug" aria-label="3D dünya hata ayıklama bilgileri">
          <b>3D DEBUG · KÜL YOLU</b>
          <span>Konum: x {debugStats.x.toFixed(2)} · y {debugStats.y.toFixed(2)} · z {debugStats.z.toFixed(2)}</span>
          <span>Mesafe: {debugStats.distance.toFixed(1)} m · Hız: {debugStats.speed.toFixed(2)} m/sn</span>
          <span>FPS: {debugStats.fps || "ölçülüyor"} · Draw: {debugStats.drawCalls} · Üçgen: {debugStats.triangles.toLocaleString("tr-TR")}</span>
          <span>Geometri/Doku: {debugStats.geometries}/{debugStats.textures} · JS heap: {debugStats.heapMb === null ? "n/a" : `${debugStats.heapMb} MB`}</span>
          <span>En uzun kare: {debugStats.maxFrameMs} ms · &gt;100 ms kare: {debugStats.longFrames}</span>
          <span>Render döngüsü: {debugStats.fps > 0 ? "CANLI" : "BAŞLAMADI"} · İlk kare: {firstFrameReported ? "EVET" : "BEKLENİYOR"} · Aktif rakip: {props.combatActive ? props.opponentName : props.focusedRival?.name ?? "yok"} · Model: {props.combatActive && getOpponentModelConfig(props.opponentName)?.modelPath ? "GLB" : "prosedürel"}</span>
          <span>Animasyon: {debugStats.animation} · Ayak kayması: {debugStats.footSlip.toFixed(3)} m</span>
          {props.combatRender && (
            <span>Can: {Math.ceil(props.combatRender.player.hp)}/{props.combatRender.player.maxHp} · Dayanıklılık: {Math.ceil(props.combatRender.player.stamina)}/{props.combatRender.player.maxStamina}</span>
          )}
          <span>Dünya: {WORLD_BIOME_PALETTES[debugBiomeTransition.biome].label} · Hava: {props.weatherMode} · Sis: {debugFogDensity.toFixed(4)} · Parça: {debugStats.chunks}</span>
          <span>Kamera: {debugStats.cameraX.toFixed(1)}, {debugStats.cameraY.toFixed(1)}, {debugStats.cameraZ.toFixed(1)} · BG: {debugStats.background} · Pozlama: {debugStats.exposure.toFixed(2)} · Işık: {debugStats.lights} · Sis: {debugStats.fogDensity.toFixed(4)}</span>
          <span>ReadPixels luma: {debugStats.pixelLuminance === null ? "bekleniyor" : debugStats.pixelLuminance.toFixed(3)} · Aydınlık örnek: {debugStats.litPixelSamples}/{debugStats.pixelSampleCount} · Shader programı: {debugStats.programs}</span>
          <span>Rakip: {props.debugCounters.rivalCount} · Eşya: {props.debugCounters.pickupCount} · Toplanan: {props.debugCounters.collectedCount}</span>
          <div className="world-debug__actions">
            <button type="button" onClick={props.onDebugNearestRival}>En yakın rakip</button>
            <button type="button" onClick={props.onDebugNearestPickup}>En yakın eşya</button>
            <button type="button" onClick={props.onDebugSkipDistance}>+25 m</button>
            <button type="button" onClick={props.onDebugNextBiome}>Sonraki biyom</button>
            <button type="button" onClick={props.onDebugStartBattle}>Savaşı hemen başlat</button>
            <button type="button" onClick={props.onToggleDebugOneHit}>Rakibi bir vuruşta öldür: {props.debugOneHitEnabled ? "AÇIK" : "KAPALI"}</button>
          </div>
          <div className="world-debug__events">
            <div>
              <b>SON {debugEvents.length} TANILAMA KAYDI</b>
              <button type="button" onClick={copyDebugEvents} disabled={!debugEvents.length}>
                {debugCopied ? "KOPYALANDI" : "KAYITLARI KOPYALA"}
              </button>
            </div>
            <pre>{debugEvents.length ? formatWorldDiagnostics(debugEvents) : "Henüz tanılama kaydı yok."}</pre>
          </div>
        </aside>
      )}
      {props.performanceMonitorEnabled && (
        <aside className="world-performance" aria-label="Canlı kare hızı ve kare süresi">
          <b>PERFORMANS</b>
          <span>Ort. FPS <strong>{performanceStats.averageFps ? performanceStats.averageFps.toFixed(0) : "ölçülüyor"}</strong></span>
          <span>En düşük FPS <strong>{performanceStats.minimumFps ? performanceStats.minimumFps.toFixed(0) : "ölçülüyor"}</strong></span>
          <span>Ort. kare <strong>{performanceStats.averageFrameMs ? `${performanceStats.averageFrameMs.toFixed(1)} ms` : "ölçülüyor"}</strong></span>
          <span>Uzun kare (&gt;50 ms) <strong>{performanceStats.longFrames}</strong></span>
        </aside>
      )}
    </div>
  );
}
