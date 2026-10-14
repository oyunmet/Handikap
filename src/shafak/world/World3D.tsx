import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ErrorInfo, MutableRefObject, ReactNode } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Html, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import type { CharacterAnimationState } from "./character-animation";
import KnightActor from "./KnightActor";
import { WORLD_CHUNK_LENGTH_METERS, type WorldMotion } from "./movement";
import { nextGateDistance } from "./world-generation";
import { createWorldMotion } from "./movement";
import { getOpponentModelConfig } from "./opponent-model-config";
import { getWorldBotProfileByName } from "./world-bot-profiles";
import { mapOpponentAnimationState } from "./model-animation";
import {
  AshSky,
  WorldChunks,
} from "./WorldElements";
import { createWorldChunk, type WorldChunk } from "./world-generation";
import { getBiomeTransition, WORLD_BIOME_PALETTES, type WeatherMode } from "./world-biomes";
import WorldRoadEntities from "./WorldRoadEntities";
import WorldBlackFrameProbe from "./WorldBlackFrameProbe";
import type { WorldCollisionGrid, WorldObstacle, WorldPickup, WorldRival } from "./world-content";
import type { CombatAction, CombatEvent, CombatState } from "../game/combat-engine";
import type { EquipmentVisual } from "../game/store-types";
import WorldPostProcessing from "./WorldPostProcessing";
import {
  getShadowMapSize,
  getWorldRenderPixelRatio,
  shouldEnableWorldShadows,
} from "./graphics-quality";
import { getTravelCameraSettings, WORLD_CAMERA_FAR, WORLD_CAMERA_NEAR } from "./camera-settings";
import {
  createFrameMetricsAccumulator,
  recordFrameMetric,
  type FrameMetricsSnapshot,
} from "./frame-metrics";
import { hasWebGLApi } from "./webgl-support";
import {
  getDuelVfxKind,
  LIGHTNING_BOLT_COUNT,
  LIGHTNING_SEGMENT_COUNT,
  MAX_ACTIVE_DUEL_VFX,
  type DuelVfxKind,
} from "./duel-vfx";
import { getDuelCameraPose, getDuelFacingAngle } from "../game/duel-camera";

export type WorldQuality = "high" | "balanced" | "low";
type CombatVisualEvent = CombatEvent & { expiresAt: number };

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
  unlockedThroughChapter: number;
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
  pickups: WorldPickup[];
  obstacles: WorldObstacle[];
  collectedPickupIds: ReadonlySet<string>;
  brokenObstacleIds: ReadonlySet<string>;
  defeatedOpponentIds: readonly string[];
  playerName: string;
  focusedRival: WorldRival | null;
  slowMotion: boolean;
  combatActive: boolean;
  combatStateRef: MutableRefObject<CombatState | null>;
  combatRender: CombatState | null;
  combatVisualEvents: CombatVisualEvent[];
  cinematicIntro: boolean;
  finisherSlowMotion: boolean;
  botTelegraphActive: boolean;
  opponentName: string;
  debugCounters: { rivalCount: number; pickupCount: number; collectedCount: number };
  onDebugNearestRival: () => void;
  onDebugNearestPickup: () => void;
  onDebugSkipDistance: () => void;
  onDebugStartBattle: () => void;
  debugOneHitEnabled: boolean;
  onToggleDebugOneHit: () => void;
};

const DUEL_MODEL_PATH = "/models/gece-nobetcisi.glb";

function configureDuelModelLoader(loader: GLTFLoader) {
  loader.setMeshoptDecoder(MeshoptDecoder);
}

function DuelModelShaderWarmup() {
  const gltf = useLoader(GLTFLoader, DUEL_MODEL_PATH, configureDuelModelLoader) as GLTF;
  const warmModel = useMemo(() => {
    const model = cloneSkinned(gltf.scene);
    model.traverse((object) => {
      if ((object as THREE.Mesh).isMesh) object.frustumCulled = false;
    });
    return model;
  }, [gltf.scene]);
  const warmupRef = useRef<THREE.Group>(null);
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    const group = warmupRef.current;
    if (!group) return undefined;
    group.visible = true;
    void gl.compileAsync(scene, camera).catch(() => undefined);
    group.visible = false;
    return () => {
      group.visible = false;
    };
  }, [camera, gl, scene]);

  return (
    <group ref={warmupRef} position={[0, -100, 0]} visible={false}>
      <primitive object={warmModel} dispose={null} />
    </group>
  );
}

class WarmupErrorBoundary extends Component<
  { children: ReactNode; onError?: (error: Error) => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error("[shafak-world] Duel model asset failed to load.", error);
    this.props.onError?.(error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

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
  cameraDirectionX: number;
  cameraDirectionY: number;
  cameraDirectionZ: number;
  cameraNear: number;
  cameraFar: number;
  motionCameraX: number;
  originDistance: number;
  fogColor: string;
  fogDensity: string;
  background: string;
  lights: number;
  lightIntensity: number;
  sceneChildren: number;
  visibleMeshes: number;
  totalMeshes: number;
  coordinatesFinite: boolean;
  contextLost: boolean;
  shaderErrors: number;
  assetError: string;
  runtimeError: string;
  safeRecoveryMode: boolean;
};

type RenderOverrides = {
  disableFog: boolean;
  boostAmbientLight: boolean;
  disableFrustumCulling: boolean;
};

type RuntimeDiagnostics = {
  shaderErrors: number;
  lastAssetError: string;
  lastRuntimeError: string;
  contextLost: boolean;
};

function isEffectivelyVisible(object: THREE.Object3D) {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (!current.visible) return false;
    current = current.parent;
  }
  return true;
}

function getSceneDiagnostics(scene: THREE.Scene, camera: THREE.Camera) {
  const perspectiveCamera = camera as THREE.PerspectiveCamera;
  const cameraDirection = camera.getWorldDirection(new THREE.Vector3());
  let lights = 0;
  let lightIntensity = 0;
  let totalMeshes = 0;
  let visibleMeshes = 0;
  scene.traverse((object) => {
    if (object instanceof THREE.Light && isEffectivelyVisible(object)) {
      lights += 1;
      lightIntensity += object.intensity;
    }
    if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
      totalMeshes += 1;
      if (isEffectivelyVisible(object)) visibleMeshes += 1;
    }
  });

  const background = scene.background instanceof THREE.Color
    ? `#${scene.background.getHexString()}`
    : scene.background?.constructor.name ?? "yok";
  const fog = scene.fog;
  const fogDensity = !fog
    ? "kapalı"
    : fog instanceof THREE.FogExp2
      ? fog.density.toFixed(4)
      : `${fog.near.toFixed(1)}–${fog.far.toFixed(1)}`;

  return {
    cameraX: camera.position.x,
    cameraY: camera.position.y,
    cameraZ: camera.position.z,
    cameraDirectionX: cameraDirection.x,
    cameraDirectionY: cameraDirection.y,
    cameraDirectionZ: cameraDirection.z,
    cameraNear: perspectiveCamera.near,
    cameraFar: perspectiveCamera.far,
    fogColor: fog ? `#${fog.color.getHexString()}` : "kapalı",
    fogDensity,
    background,
    lights,
    lightIntensity,
    sceneChildren: scene.children.length,
    visibleMeshes,
    totalMeshes,
  };
}

class WorldCanvasErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; onRetry: () => void; onError: (error: Error) => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.error("[shafak-world] 3D canvas failed to start.", error);
    this.props.onError(error);
  }

  render() {
    if (this.state.failed) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function CanvasContextGuard({
  onLost,
}: {
  onLost: () => void;
}) {
  const { gl } = useThree();
  const contextCheckElapsedRef = useRef(0);
  useFrame((_, delta) => {
    contextCheckElapsedRef.current += delta;
    if (contextCheckElapsedRef.current < 1) return;
    contextCheckElapsedRef.current = 0;
    if (gl.getContext().isContextLost()) onLost();
  }, -1);
  useEffect(() => {
    const canvas = gl.domElement;
    const handleLost = (event: Event) => {
      event.preventDefault();
      onLost();
    };
    canvas.addEventListener("webglcontextlost", handleLost);
    return () => {
      canvas.removeEventListener("webglcontextlost", handleLost);
    };
  }, [gl, onLost]);
  return null;
}

function supportsWebGL() {
  if (typeof window === "undefined") return false;
  // Do not consume a mobile browser's limited WebGL contexts with a throwaway
  // canvas. The React Three Fiber Canvas below is the authoritative check.
  return hasWebGLApi(
    typeof WebGL2RenderingContext === "undefined" ? undefined : WebGL2RenderingContext,
    typeof WebGLRenderingContext === "undefined" ? undefined : WebGLRenderingContext,
  );
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
  disabled,
}: {
  motionRef: MutableRefObject<WorldMotion>;
  weatherMode: WeatherMode;
  combatActive: boolean;
  disabled: boolean;
}) {
  const { scene } = useThree();
  const fogRef = useRef<THREE.FogExp2 | null>(null);
  useEffect(() => {
    const fog = new THREE.FogExp2("#69505a", 0.0085);
    fogRef.current = disabled ? null : fog;
    scene.fog = combatActive || disabled ? null : fog;
    return () => {
      fogRef.current = null;
      scene.fog = null;
    };
  }, [combatActive, disabled, scene]);
  useFrame(() => {
    const fog = fogRef.current;
    if (!fog || combatActive) return;
    const transition = getBiomeTransition(motionRef.current.distance);
    fog.color.lerpColors(FOG_COLORS[transition.from], FOG_COLORS[transition.to], transition.mix);
    const baseDensity = weatherMode === "fog" ? 0.016 : weatherMode === "rain" ? 0.0095 : weatherMode === "ash" ? 0.0085 : 0.004;
    const biomeDensity = transition.biome === "frozen-pass" ? 1.08 : transition.biome === "red-marsh" ? 1.13 : 1;
    fog.density = baseDensity * biomeDensity;
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
  touchRenderer,
}: {
  quality: WorldQuality;
  visualEffectsEnabled: boolean;
  touchRenderer: boolean;
}) {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMapping = visualEffectsEnabled ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
    gl.toneMappingExposure = visualEffectsEnabled ? 1.12 : 1;
    gl.shadowMap.enabled = shouldEnableWorldShadows(quality, touchRenderer);
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    gl.shadowMap.needsUpdate = gl.shadowMap.enabled;
  }, [gl, quality, touchRenderer, visualEffectsEnabled]);
  return null;
}

function CameraRig({
  motionRef,
  motionReduced,
  touchRenderer,
  focusedRival,
  slowMotion,
  combatActive,
  combatStateRef,
  combatVisualEvents,
  visualEffectsEnabled,
  cinematicIntro,
  finisherSlowMotion,
}: {
  motionRef: MutableRefObject<WorldMotion>;
  motionReduced: boolean;
  touchRenderer: boolean;
  focusedRival: WorldRival | null;
  slowMotion: boolean;
  combatActive: boolean;
  combatStateRef: MutableRefObject<CombatState | null>;
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
    const travelCamera = getTravelCameraSettings(speed, touchRenderer);
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
      const pose = getDuelCameraPose(
        combat.player,
        combat.bot,
        -(motion.distance - motion.originDistance),
        touchRenderer ? 8.2 : 8.7,
        touchRenderer ? 0.55 : 0.8,
      );
      desiredRef.set(pose.position.x, pose.position.y, pose.position.z);
      targetRef.set(pose.target.x, pose.target.y, pose.target.z);
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
      desiredRef.set(lateral * 0.56, travelCamera.height, travelCamera.distanceBehind);
      targetRef.set(lateral * 0.42, travelCamera.targetHeight, -travelCamera.targetDistanceAhead);
    }
    camera.position.lerp(desiredRef, response);
    const runShake = motionReduced ? 0 : travelCamera.runShake;
    const time = _.clock.elapsedTime;
    camera.position.x += Math.sin(time * 17.5) * 0.018 * runShake;
    camera.position.y += Math.cos(time * 13.2) * 0.014 * runShake;
    camera.lookAt(targetRef);
    const combatImpact = combat ? combat.lastImpactStrength : 0;
    const finisherZoom = finisherSlowMotion && visualEffectsEnabled ? 2.1 : 0;
    const desiredFov = combat
      ? (touchRenderer ? 56 : 48) - combatImpact * 1.1 - skillZoom - finisherZoom
      : focusedRival ? (cinematicIntro ? 51 : 48) : travelCamera.fieldOfView;
    const nextFov = THREE.MathUtils.damp(camera.fov, desiredFov, 3, scaledDelta);
    if (Math.abs(nextFov - camera.fov) > 0.015) {
      camera.fov = nextFov;
      camera.updateProjectionMatrix();
    }
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      position={[0, 4.15, touchRenderer ? 6.5 : 10.2]}
      fov={54}
      near={WORLD_CAMERA_NEAR}
      far={WORLD_CAMERA_FAR}
    />
  );
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
  const opposingActor = combatRender?.[side === "player" ? "bot" : "player"];
  const facingAngle = renderedActor && opposingActor
    ? getDuelFacingAngle(renderedActor, opposingActor)
    : side === "bot" ? Math.PI : 0;
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
  const isAttackBeat = Boolean(renderedActor && ["attack", "heavyAttack", "skillOne", "skillTwo", "parry"].includes(renderedActor.action));
  const combatGlow = side === "player" ? "#ffad58" : "#6de0e5";

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
      {visualEffectsEnabled && (
        <>
          <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.48, isAttackBeat ? 0.76 : 0.66, 32]} />
            <meshBasicMaterial color={isAttackBeat ? "#fff0ad" : combatGlow} transparent opacity={isAttackBeat ? 0.64 : 0.24} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <pointLight
            position={[0, 1.55, 0.25]}
            color={isAttackBeat ? "#fff0ad" : combatGlow}
            intensity={isAttackBeat ? 12 : 3.2}
            distance={isAttackBeat ? 5.5 : 3.8}
            decay={2}
          />
        </>
      )}
      <group ref={actorVisualRoot} scale={side === "bot" ? 1.07 : 1}>
        <KnightActor
          motionRef={actorMotion}
          state={animation}
          motionReduced={motionReduced}
          animationTimeScale={finisherSlowMotion && visualEffectsEnabled ? 0.36 : 1}
          facingAngle={facingAngle}
          appearance={side === "player" ? equipmentVisual : undefined}
          castShadow
          modelConfig={modelConfig}
          modelAnimationState={modelAnimationState}
        />
      </group>
      {visualEffectsEnabled && <DuelAshDispersal active={defeated} x={renderedActor.x} />}
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
      <mesh position={[0, -0.11, -0.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[42, 96]} />
        <meshBasicMaterial color="#302830" side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 5.2, 2.2]} color="#ffe0b0" intensity={82} distance={24} decay={2} />
      <pointLight position={[0, 4.1, -3.8]} color="#a5daf0" intensity={42} distance={22} decay={2} />
      <pointLight position={[-3.2, 2.8, -0.4]} color="#ff795c" intensity={16} distance={10} decay={2} />
      <mesh position={[0, 0.018, -0.6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[4.28, 96]} />
        <meshStandardMaterial
          color="#493a44"
          emissive="#30242f"
          emissiveIntensity={0.28}
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
      {[-4.25, 4.25].map((x) => (
        <group key={x} position={[x, 0, -0.55]}>
          <mesh position={[0, 0.66, 0]}>
            <cylinderGeometry args={[0.085, 0.13, 1.3, 7]} />
            <meshStandardMaterial color="#4b3030" roughness={0.78} />
          </mesh>
          <mesh position={[0, 1.43, 0]}>
            <dodecahedronGeometry args={[0.19, 0]} />
            <meshBasicMaterial color="#ff9d58" transparent opacity={0.85} depthWrite={false} />
          </mesh>
        </group>
      ))}
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
  unlockedThroughChapter,
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
  combatVisualEvents,
  cinematicIntro,
  finisherSlowMotion,
  botTelegraphActive,
  combatRender,
  opponentName,
  onDebugStats,
  performanceMonitorEnabled,
  onPerformanceStats,
  onBlackFrame,
  debugEnabled,
  touchRenderer,
  renderOverrides,
  forceSafeRendering,
  runtimeDiagnostics,
}: World3DProps & {
  touchRenderer: boolean;
  onDebugStats: (stats: DebugStats) => void;
  onPerformanceStats: (stats: FrameMetricsSnapshot) => void;
  onBlackFrame: () => void;
  debugEnabled: boolean;
  renderOverrides: RenderOverrides;
  forceSafeRendering: boolean;
  runtimeDiagnostics: MutableRefObject<RuntimeDiagnostics>;
}) {
  const chunkCacheRef = useRef(new Map<number, WorldChunk>());
  const [chunks, setChunks] = useState<WorldChunk[]>(() => getChunksForDistance(motionRef.current.distance, chunkCacheRef.current));
  const activeChunkRef = useRef(Math.floor(motionRef.current.distance / WORLD_CHUNK_LENGTH_METERS));
  const footSlipRef = useRef(0);
  const prefetchCancelRef = useRef<(() => void) | null>(null);
  const chunkUpdateTimeoutRef = useRef<number | null>(null);
  const initialPrefetchRef = useRef(false);
  const { gl, camera, scene } = useThree();
  const shadowMapSize = getShadowMapSize(quality, gl.getPixelRatio());
  const debugClock = useRef({ startedAt: 0, frames: 0, longFrames: 0, maxFrameMs: 0 });
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

  useEffect(() => () => {
    prefetchCancelRef.current?.();
    if (chunkUpdateTimeoutRef.current !== null) {
      window.clearTimeout(chunkUpdateTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    performanceMetricsRef.current = createFrameMetricsAccumulator();
    if (!performanceMonitorEnabled) {
      onPerformanceStats({ averageFps: 0, minimumFps: 0, averageFrameMs: 0, longFrames: 0 });
    }
  }, [onPerformanceStats, performanceMonitorEnabled]);

  useEffect(() => {
    useLoader.preload(GLTFLoader, DUEL_MODEL_PATH, configureDuelModelLoader);
  }, []);

  const hasCombatRender = combatRender !== null;

  useEffect(() => {
    if (!forceSafeRendering && !renderOverrides.disableFrustumCulling) return undefined;
    const previousCulling = new Map<THREE.Object3D, boolean>();
    scene.traverse((object) => {
      const candidate = object as THREE.Object3D & { frustumCulled?: boolean };
      if (typeof candidate.frustumCulled !== "boolean") return;
      previousCulling.set(object, candidate.frustumCulled);
      candidate.frustumCulled = false;
    });
    return () => {
      previousCulling.forEach((frustumCulled, object) => {
        (object as THREE.Object3D & { frustumCulled?: boolean }).frustumCulled = frustumCulled;
      });
    };
  }, [forceSafeRendering, renderOverrides.disableFrustumCulling, scene]);

  useEffect(() => {
    if (!combatActive || !hasCombatRender) return undefined;

    let idleHandle = 0;
    let timeoutHandle = 0;
    let cancelled = false;
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const warmDuelShaders = () => {
      if (cancelled) return;
      void gl.compileAsync(scene, camera).catch(() => {
        // Shader warm-up is best-effort; the normal renderer handles unsupported cases.
      });
    };

    if (idleWindow.requestIdleCallback) {
      idleHandle = idleWindow.requestIdleCallback(warmDuelShaders, { timeout: 700 });
    } else {
      timeoutHandle = window.setTimeout(warmDuelShaders, 0);
    }

    return () => {
      cancelled = true;
      if (idleHandle) idleWindow.cancelIdleCallback?.(idleHandle);
      if (timeoutHandle) window.clearTimeout(timeoutHandle);
    };
  }, [camera, combatActive, gl, hasCombatRender, scene]);

  useFrame((frame, delta) => {
    const motion = motionRef.current;
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
      if (chunkUpdateTimeoutRef.current !== null) {
        window.clearTimeout(chunkUpdateTimeoutRef.current);
      }
      chunkUpdateTimeoutRef.current = window.setTimeout(() => {
        chunkUpdateTimeoutRef.current = null;
        setChunks(getChunksForDistance(motionRef.current.distance, chunkCacheRef.current));
      }, 0);
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
        const sceneDiagnostics = getSceneDiagnostics(scene, camera);
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
          ...sceneDiagnostics,
          motionCameraX: motion.cameraX,
          originDistance: motion.originDistance,
          coordinatesFinite: [
            motion.distance,
            motion.cameraX,
            camera.position.x,
            camera.position.y,
            camera.position.z,
            camera.near,
            camera.far,
          ].every(Number.isFinite),
          contextLost: runtimeDiagnostics.current.contextLost || gl.getContext().isContextLost(),
          shaderErrors: runtimeDiagnostics.current.shaderErrors,
          assetError: runtimeDiagnostics.current.lastAssetError,
          runtimeError: runtimeDiagnostics.current.lastRuntimeError,
          safeRecoveryMode: forceSafeRendering,
        });
        monitor.startedAt = now;
        monitor.frames = 0;
        monitor.longFrames = 0;
        monitor.maxFrameMs = 0;
      }
    }
    // Count the complete next render, including EffectComposer's extra passes.
    gl.info.reset();
  });

  return (
    <>
      <ProceduralEnvironment />
      <SceneFog
        motionRef={motionRef}
        weatherMode={weatherMode}
        combatActive={combatActive}
        disabled={forceSafeRendering || renderOverrides.disableFog}
      />
      <RendererEffects
        quality={quality}
        visualEffectsEnabled={visualEffectsEnabled}
        touchRenderer={touchRenderer}
      />
      <color attach="background" args={[combatActive ? "#46353e" : "#252330"]} />
      <hemisphereLight args={["#c6b6b9", "#1a1b2b", forceSafeRendering ? 1.5 : 0.82]} />
      {(forceSafeRendering || renderOverrides.boostAmbientLight) && (
        <ambientLight color="#ffe2c3" intensity={forceSafeRendering ? 2.1 : 2.4} />
      )}
      {combatActive && <ambientLight color="#ffdbb3" intensity={1.25} />}
      <directionalLight
        position={[-8, 14, 8]}
        color="#ffd09a"
        intensity={2.05}
        castShadow={shouldEnableWorldShadows(quality, touchRenderer)}
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
      {visualEffectsEnabled && quality !== "low" && !touchRenderer && (
        <WorldPostProcessing quality={quality} onBlackFrame={onBlackFrame} />
      )}
      <CameraRig
        motionRef={motionRef}
        motionReduced={motionReduced}
        touchRenderer={touchRenderer}
        focusedRival={focusedRival}
        slowMotion={slowMotion}
        combatActive={combatActive}
        combatStateRef={combatStateRef}
        combatVisualEvents={combatVisualEvents}
        visualEffectsEnabled={visualEffectsEnabled}
        cinematicIntro={cinematicIntro}
        finisherSlowMotion={finisherSlowMotion}
      />
      {!combatActive && <AshSky motionRef={motionRef} />}
      {!combatActive && (
        <group name="road-world">
          <WorldChunks
            chunks={chunks}
            motionRef={motionRef}
            motionReduced={motionReduced}
            quality={quality}
            weather={weatherMode}
            unlockedThroughChapter={unlockedThroughChapter}
            touchRenderer={touchRenderer}
          />
        </group>
      )}
      <WarmupErrorBoundary onError={(error) => {
        runtimeDiagnostics.current.lastAssetError = error.message.slice(0, 180);
      }}>
        <Suspense fallback={null}><DuelModelShaderWarmup /></Suspense>
      </WarmupErrorBoundary>
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
  return new URLSearchParams(window.location.search).get("debug") === "1";
}

export default function World3D(props: World3DProps) {
  const [debugEnabled, setDebugEnabled] = useState(isDebugEnabled);
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);
  const [canvasAttempt, setCanvasAttempt] = useState(0);
  const [renderOverrides, setRenderOverrides] = useState<RenderOverrides>({
    disableFog: false,
    boostAmbientLight: false,
    disableFrustumCulling: false,
  });
  const runtimeDiagnosticsRef = useRef<RuntimeDiagnostics>({
    shaderErrors: 0,
    lastAssetError: "",
    lastRuntimeError: "",
    contextLost: false,
  });
  const autoRecoveryAttemptsRef = useRef(0);
  const rendererRecoveryTimesRef = useRef<number[]>([]);
  const rendererRecoveryInFlightRef = useRef(false);
  const [safeRecoveryMode, setSafeRecoveryMode] = useState(false);
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
    cameraDirectionX: 0,
    cameraDirectionY: 0,
    cameraDirectionZ: -1,
    cameraNear: WORLD_CAMERA_NEAR,
    cameraFar: WORLD_CAMERA_FAR,
    motionCameraX: 0,
    originDistance: 0,
    fogColor: "ölçülüyor",
    fogDensity: "ölçülüyor",
    background: "ölçülüyor",
    lights: 0,
    lightIntensity: 0,
    sceneChildren: 0,
    visibleMeshes: 0,
    totalMeshes: 0,
    coordinatesFinite: true,
    contextLost: false,
    shaderErrors: 0,
    assetError: "",
    runtimeError: "",
    safeRecoveryMode: false,
  });
  const pixelRatio = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  const touchRenderer = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const rendererQuality = safeRecoveryMode ? "low" : props.quality;
  const rendererVisualEffectsEnabled = props.visualEffectsEnabled && !safeRecoveryMode;
  const maxDpr = getWorldRenderPixelRatio(rendererQuality, pixelRatio, touchRenderer);
  const minDpr = Math.min(1, maxDpr);
  const recoverBlackCanvas = useCallback(() => {
    if (rendererRecoveryInFlightRef.current) return;
    rendererRecoveryInFlightRef.current = true;

    const now = Date.now();
    const recentRecoveries = rendererRecoveryTimesRef.current.filter((at) => now - at < 60_000);
    if (recentRecoveries.length >= 1) {
      runtimeDiagnosticsRef.current.lastRuntimeError =
        "Güvenli 3D çizim denemesi de başarısız oldu; siyah ekran yerine yeniden deneme uyarısı gösteriliyor.";
      setWebglAvailable(false);
      window.setTimeout(() => { rendererRecoveryInFlightRef.current = false; }, 1_000);
      return;
    }

    recentRecoveries.push(now);
    rendererRecoveryTimesRef.current = recentRecoveries;
    runtimeDiagnosticsRef.current.contextLost = false;
    runtimeDiagnosticsRef.current.lastRuntimeError =
      "Siyah kare algılandı; 3D sahne fog kapalı, güçlü ortam ışığı ve culling olmadan yeniden kuruluyor.";
    setSafeRecoveryMode(true);
    setWebglAvailable(null);
    window.setTimeout(() => {
      setCanvasAttempt((attempt) => attempt + 1);
      rendererRecoveryInFlightRef.current = false;
    }, 120);
  }, []);
  const retryWebGL = useCallback(() => {
    autoRecoveryAttemptsRef.current = 0;
    rendererRecoveryTimesRef.current = [];
    rendererRecoveryInFlightRef.current = false;
    setSafeRecoveryMode(false);
    runtimeDiagnosticsRef.current.contextLost = false;
    runtimeDiagnosticsRef.current.lastRuntimeError = "";
    setWebglAvailable(null);
    setCanvasAttempt((attempt) => attempt + 1);
  }, []);
  const retryCanvasAfterError = useCallback(() => {
    if (autoRecoveryAttemptsRef.current >= 1) return;
    autoRecoveryAttemptsRef.current += 1;
    setSafeRecoveryMode(true);
    window.setTimeout(() => {
      setWebglAvailable(null);
      setCanvasAttempt((attempt) => attempt + 1);
    }, 500);
  }, []);
  const fallback = (
    <div className="world-three-fallback" role="alert">
      <div className="world-three-fallback__content">
        <p>{runtimeDiagnosticsRef.current.lastRuntimeError || "3D dünya şu anda çizilemedi. Sahneyi yeniden oluşturmayı deneyin."}</p>
        <button type="button" onClick={retryWebGL}>3D DÜNYAYI YENİDEN OLUŞTUR</button>
      </div>
    </div>
  );
  const markContextLost = useCallback(() => {
    runtimeDiagnosticsRef.current.contextLost = true;
    runtimeDiagnosticsRef.current.lastRuntimeError = "WebGL bağlamı kaybedildi; güvenli 3D ayarlarıyla sahne yeniden kuruluyor.";
    recoverBlackCanvas();
  }, [recoverBlackCanvas]);

  useEffect(() => {
    const syncDebug = () => setDebugEnabled(isDebugEnabled());
    window.addEventListener("popstate", syncDebug);
    return () => window.removeEventListener("popstate", syncDebug);
  }, []);

  useEffect(() => {
    if (!debugEnabled) return undefined;
    const recordRuntimeError = (message: string) => {
      runtimeDiagnosticsRef.current.lastRuntimeError = message.slice(0, 180);
    };
    const handleError = (event: ErrorEvent) => {
      recordRuntimeError(event.message || "window.onerror: bilinmeyen hata");
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
      recordRuntimeError(`unhandledrejection: ${reason}`);
    };
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, [debugEnabled]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setWebglAvailable(supportsWebGL()));
    return () => window.cancelAnimationFrame(frame);
  }, [canvasAttempt]);

  useEffect(() => {
    if (!webglAvailable) return undefined;
    const timer = window.setTimeout(() => {
      autoRecoveryAttemptsRef.current = 0;
    }, 10_000);
    return () => window.clearTimeout(timer);
  }, [canvasAttempt, webglAvailable]);

  return (
    <div className="world-three-layer" aria-label="Kül Yolu 3D dünyası">
      {webglAvailable === null ? (
        <div className="world-three-loading" role="status">3D sahne hazırlanıyor…</div>
      ) : webglAvailable ? (
        <WorldCanvasErrorBoundary
          key={canvasAttempt}
          fallback={fallback}
          onRetry={retryWebGL}
          onError={(error) => {
            runtimeDiagnosticsRef.current.lastRuntimeError = `3D sahne hatası: ${error.message}`.slice(0, 180);
            retryCanvasAfterError();
          }}
        >
          <Canvas
            dpr={[minDpr, maxDpr]}
            shadows={shouldEnableWorldShadows(rendererQuality, touchRenderer)}
            camera={{
              position: [0, 4.15, 10.2],
              fov: 54,
              near: WORLD_CAMERA_NEAR,
              far: WORLD_CAMERA_FAR,
            }}
            gl={{
              alpha: false,
              antialias: false,
              powerPreference: "high-performance",
              toneMapping: rendererVisualEffectsEnabled ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping,
              toneMappingExposure: rendererVisualEffectsEnabled ? 1.12 : 1,
            }}
            onCreated={({ gl: renderer, scene }) => {
              renderer.outputColorSpace = THREE.SRGBColorSpace;
              renderer.info.autoReset = false;
              scene.background = new THREE.Color("#252330");
              runtimeDiagnosticsRef.current.contextLost = false;
              renderer.debug.checkShaderErrors = debugEnabled;
              renderer.debug.onShaderError = debugEnabled
                ? (context, program, vertexShader, fragmentShader) => {
                  runtimeDiagnosticsRef.current.shaderErrors += 1;
                  const details = [
                    context.getProgramInfoLog(program),
                    context.getShaderInfoLog(vertexShader),
                    context.getShaderInfoLog(fragmentShader),
                  ].filter(Boolean).join(" | ");
                  runtimeDiagnosticsRef.current.lastRuntimeError =
                    `Shader derleme hatası: ${details || "ayrıntı yok"}`.slice(0, 180);
                  console.error("[shafak-world] WebGL shader compile/link failure.", details);
                }
                : null;
            }}
            fallback={fallback}
          >
            <CanvasContextGuard onLost={markContextLost} />
            <WorldBlackFrameProbe onBlackFrame={recoverBlackCanvas} />
            <SceneContents
              {...props}
              quality={rendererQuality}
              visualEffectsEnabled={rendererVisualEffectsEnabled}
              touchRenderer={touchRenderer}
              debugEnabled={debugEnabled}
              renderOverrides={renderOverrides}
              forceSafeRendering={safeRecoveryMode}
              runtimeDiagnostics={runtimeDiagnosticsRef}
              onDebugStats={setDebugStats}
              onPerformanceStats={setPerformanceStats}
              onBlackFrame={recoverBlackCanvas}
            />
          </Canvas>
        </WorldCanvasErrorBoundary>
      ) : (
        fallback
      )}
      {debugEnabled && (
        <aside className="world-debug" aria-label="3D dünya hata ayıklama bilgileri">
          <b>3D DEBUG · KÜL YOLU</b>
          <span>Konum: x {debugStats.x.toFixed(2)} · y {debugStats.y.toFixed(2)} · z {debugStats.z.toFixed(2)}</span>
          <span>Mesafe: {debugStats.distance.toFixed(1)} m · Hız: {debugStats.speed.toFixed(2)} m/sn</span>
          <span>Kamera: {debugStats.cameraX.toFixed(1)}, {debugStats.cameraY.toFixed(1)}, {debugStats.cameraZ.toFixed(1)} · yön {debugStats.cameraDirectionX.toFixed(2)}, {debugStats.cameraDirectionY.toFixed(2)}, {debugStats.cameraDirectionZ.toFixed(2)} · near/far {debugStats.cameraNear}/{debugStats.cameraFar}</span>
          <span>Dünya koordinatı: kamera {debugStats.motionCameraX.toFixed(1)} m · origin {debugStats.originDistance.toFixed(1)} m</span>
          <span>Fog: {debugStats.fogColor} · yoğunluk {debugStats.fogDensity} · arka plan {debugStats.background}</span>
          <span>Işık: {debugStats.lights} kaynak / güç {debugStats.lightIntensity.toFixed(2)} · çocuk {debugStats.sceneChildren}</span>
          <span>Mesh: {debugStats.visibleMeshes}/{debugStats.totalMeshes} görünür · koordinatlar {debugStats.coordinatesFinite ? "sonlu" : "GEÇERSİZ"}</span>
          <span>FPS: {debugStats.fps || "ölçülüyor"} · Draw: {debugStats.drawCalls} · Üçgen: {debugStats.triangles.toLocaleString("tr-TR")}</span>
          <span>Geometri/Doku: {debugStats.geometries}/{debugStats.textures} · JS heap: {debugStats.heapMb === null ? "n/a" : `${debugStats.heapMb} MB`}</span>
          <span>En uzun kare: {debugStats.maxFrameMs} ms · &gt;100 ms kare: {debugStats.longFrames}</span>
          <span>Animasyon: {debugStats.animation} · Ayak kayması: {debugStats.footSlip.toFixed(3)} m</span>
          <span>Bağlam: {debugStats.contextLost ? "KAYIP" : "açık"} · shader hata: {debugStats.shaderErrors} · güvenli 3D: {debugStats.safeRecoveryMode ? "AÇIK" : "kapalı"}</span>
          <span>Asset: {debugStats.assetError || "hata yok"} · JS: {debugStats.runtimeError || "hata yok"}</span>
          {props.combatRender && (
            <span>Can: {Math.ceil(props.combatRender.player.hp)}/{props.combatRender.player.maxHp} · Dayanıklılık: {Math.ceil(props.combatRender.player.stamina)}/{props.combatRender.player.maxStamina}</span>
          )}
          <span>Dünya: Kül Yolu · Yüklü parça: {debugStats.chunks}</span>
          <span>Rakip: {props.debugCounters.rivalCount} · Eşya: {props.debugCounters.pickupCount} · Toplanan: {props.debugCounters.collectedCount}</span>
          <div className="world-debug__actions">
            <button type="button" onClick={() => setRenderOverrides((current) => ({ ...current, disableFog: !current.disableFog }))}>
              Fog kapat {renderOverrides.disableFog ? "AÇIK" : "KAPALI"}
            </button>
            <button type="button" onClick={() => setRenderOverrides((current) => ({ ...current, boostAmbientLight: !current.boostAmbientLight }))}>
              Ek ışık {renderOverrides.boostAmbientLight ? "AÇIK" : "KAPALI"}
            </button>
            <button type="button" onClick={() => setRenderOverrides((current) => ({ ...current, disableFrustumCulling: !current.disableFrustumCulling }))}>
              Culling kapat {renderOverrides.disableFrustumCulling ? "AÇIK" : "KAPALI"}
            </button>
            <button type="button" onClick={props.onDebugNearestRival}>En yakın rakip</button>
            <button type="button" onClick={props.onDebugNearestPickup}>En yakın eşya</button>
            <button type="button" onClick={props.onDebugSkipDistance}>+25 m</button>
            <button type="button" onClick={props.onDebugStartBattle}>Savaşı hemen başlat</button>
            <button type="button" onClick={props.onToggleDebugOneHit}>Rakibi bir vuruşta öldür: {props.debugOneHitEnabled ? "AÇIK" : "KAPALI"}</button>
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
