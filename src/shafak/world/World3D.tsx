import { Component, useEffect, useMemo, useRef, useState } from "react";
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
import { mapOpponentAnimationState } from "./model-animation";
import {
  AshSky,
  WorldChunks,
} from "./WorldElements";
import { createWorldChunk, type WorldChunk } from "./world-generation";
import WorldRoadEntities from "./WorldRoadEntities";
import type { WorldRival } from "./world-content";
import type { CombatAction, CombatEvent, CombatState } from "../game/combat-engine";
import type { EquipmentVisual } from "../game/store-types";
import WorldPostProcessing from "./WorldPostProcessing";
import { getPixelRatioCap, getShadowMapSize } from "./graphics-quality";

export type WorldQuality = "high" | "balanced" | "low";
type CombatVisualEvent = CombatEvent & { expiresAt: number };

type World3DProps = {
  motionRef: MutableRefObject<WorldMotion>;
  quality: WorldQuality;
  visualEffectsEnabled: boolean;
  motionReduced: boolean;
  airEnabled: boolean;
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
};

class WorldCanvasErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.error("[shafak-world] 3D canvas failed to start.", error);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="world-three-fallback" role="alert">
          3D sahne başlatılamadı. WebGL destekli bir tarayıcıyla yeniden deneyin.
        </div>
      );
    }
    return this.props.children;
  }
}

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    return Boolean(context);
  } catch {
    return false;
  }
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

function SceneFog({ airEnabled }: { airEnabled: boolean }) {
  const { scene } = useThree();
  useEffect(() => {
    scene.fog = new THREE.FogExp2(airEnabled ? "#574552" : "#353343", airEnabled ? 0.0085 : 0.005);
    return () => {
      scene.fog = null;
    };
  }, [airEnabled, scene]);
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
  combatVisualEvents: CombatVisualEvent[];
  visualEffectsEnabled: boolean;
  cinematicIntro: boolean;
  finisherSlowMotion: boolean;
}) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const targetRef = useMemo(() => new THREE.Vector3(), []);
  const desiredRef = useMemo(() => new THREE.Vector3(), []);
  const impactRef = useRef({ tick: -1, startedAt: 0 });
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
      const centerX = (combat.player.x + combat.bot.x) * 0.5;
      const centerZ = -motion.distance + (combat.player.z + combat.bot.z) * 0.5;
      desiredRef.set(centerX + 4.1, 3.25, centerZ + 7.25);
      targetRef.set(centerX, 1.1, centerZ - 0.35);
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
    const desiredFov = combat
      ? 45 - combatImpact * 1.1 - skillZoom - finisherZoom
      : focusedRival ? (cinematicIntro ? 51 : 48) : 54 + Math.min(speed, 7) * 0.7;
    const nextFov = THREE.MathUtils.damp(camera.fov, desiredFov, 3, scaledDelta);
    if (Math.abs(nextFov - camera.fov) > 0.015) {
      camera.fov = nextFov;
      camera.updateProjectionMatrix();
    }
  });

  return <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 4.15, 10.2]} fov={54} near={0.1} far={380} />;
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
          facingAngle={side === "bot" ? Math.PI : 0}
          appearance={side === "player" ? equipmentVisual : undefined}
          modelConfig={modelConfig}
          modelAnimationState={modelAnimationState}
        />
        <pointLight
          position={[0, 1.7, side === "bot" ? -0.2 : 0.2]}
          color={side === "bot" ? "#ff644f" : equipmentVisual.auraColor ?? "#f5c175"}
          intensity={side === "bot" ? 0.95 : 0.62}
          distance={4.5}
        />
      </group>
      {visualEffectsEnabled && <DuelAshDispersal active={defeated} x={renderedActor.x} />}
      {side === "bot" && (
        <Html position={[renderedActor.x, 2.55, renderedActor.z]} center distanceFactor={12} zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
          <span className="world-bot-tag is-focused"><b>BOT</b><span>RAKİP</span></span>
        </Html>
      )}
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

function DuelTelegraph({ combatStateRef }: { combatStateRef: MutableRefObject<CombatState | null> }) {
  const ringRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((frame) => {
    const bot = combatStateRef.current?.bot;
    if (!bot || !ringRef.current || !materialRef.current) return;
    const pulse = (Math.sin(frame.clock.elapsedTime * 17) + 1) * 0.5;
    ringRef.current.position.set(bot.x, 0.07, bot.z + 0.88);
    ringRef.current.scale.setScalar(0.94 + pulse * 0.12);
    materialRef.current.opacity = 0.48 + pulse * 0.34;
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
    </group>
  );
}

function DuelArena({
  opponentName,
  motionRef,
  combatStateRef,
  combatRender,
  motionReduced,
  equipmentVisual,
  visualEffectsEnabled,
  finisherSlowMotion,
  botTelegraphActive,
}: Pick<World3DProps, "opponentName" | "motionRef" | "combatStateRef" | "combatRender" | "motionReduced" | "equipmentVisual" | "visualEffectsEnabled" | "finisherSlowMotion" | "botTelegraphActive">) {
  return (
    <group position={[0, 0, -motionRef.current.distance]}>
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
            <meshBasicMaterial color="#ff9d58" transparent opacity={0.85} />
          </mesh>
          <pointLight position={[0, 1.48, 0]} color="#ff7849" intensity={1.15} distance={6} />
        </group>
      ))}
      {visualEffectsEnabled && botTelegraphActive && <DuelTelegraph combatStateRef={combatStateRef} />}
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
  const lightRef = useRef<THREE.PointLight>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const progression = Math.min(0.6, Math.max(0, level - 1) * 0.035 + relicCount * 0.04);
  useFrame((_, delta) => {
    const motion = motionRef.current;
    const speed = Math.hypot(motion.velocityX, motion.velocityY);
    const x = motion.depth * 5.2;
    if (lightRef.current) {
      lightRef.current.position.x += (x - lightRef.current.position.x) * (1 - Math.exp(-delta * 9));
      lightRef.current.position.z = -1.4;
      lightRef.current.intensity = 2.8 + progression + Math.min(speed, 7) * 0.08;
    }
    if (glowRef.current) glowRef.current.position.x = x;
  });
  return (
    <>
      <pointLight ref={lightRef} position={[0, 2, -1.4]} color={lightColor} intensity={2.8} distance={19 + progression * 3 + lightRadius} decay={2} />
      <mesh ref={glowRef} position={[0, 0.04, -3.2]} scale={[4.5, 0.045, 9]}>
        <sphereGeometry args={[1, 12, 7]} />
        <meshBasicMaterial color="#e78450" transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, 0.14, -1.8]} scale={[4.4, 0.06, 6.6]}>
        <sphereGeometry args={[1, 10, 6]} />
        <meshBasicMaterial color="#f0ae70" transparent opacity={0.075} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </>
  );
}

function SceneContents({
  motionRef,
  quality,
  visualEffectsEnabled,
  motionReduced,
  airEnabled,
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
  debugEnabled,
}: World3DProps & {
  onDebugStats: (stats: DebugStats) => void;
  debugEnabled: boolean;
}) {
  const chunkCacheRef = useRef(new Map<number, WorldChunk>());
  const [chunks, setChunks] = useState<WorldChunk[]>(() => getChunksForDistance(motionRef.current.distance, chunkCacheRef.current));
  const activeChunkRef = useRef(Math.floor(motionRef.current.distance / WORLD_CHUNK_LENGTH_METERS));
  const footSlipRef = useRef(0);
  const prefetchCancelRef = useRef<(() => void) | null>(null);
  const initialPrefetchRef = useRef(false);
  const { gl } = useThree();
  const shadowMapSize = getShadowMapSize(quality, gl.getPixelRatio());
  const debugClock = useRef({ startedAt: 0, frames: 0, longFrames: 0, maxFrameMs: 0 });

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

  useFrame((frame, delta) => {
    const motion = motionRef.current;
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
    if (!debugEnabled) return;
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
      onDebugStats({
        x: motion.depth * 5.2,
        y: 0,
        z: -motion.distance,
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
      });
      monitor.startedAt = now;
      monitor.frames = 0;
      monitor.longFrames = 0;
      monitor.maxFrameMs = 0;
    }
  });

  return (
    <>
      <SceneFog airEnabled={airEnabled} />
      <RendererEffects quality={quality} visualEffectsEnabled={visualEffectsEnabled} />
      <color attach="background" args={["#252330"]} />
      <hemisphereLight args={["#c6b6b9", "#1a1b2b", 0.62]} />
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
      {visualEffectsEnabled && quality !== "low" && <WorldPostProcessing />}
      <CameraRig
        motionRef={motionRef}
        motionReduced={motionReduced}
        focusedRival={focusedRival}
        slowMotion={slowMotion}
        combatActive={combatActive}
        combatStateRef={combatStateRef}
        combatVisualEvents={combatVisualEvents}
        visualEffectsEnabled={visualEffectsEnabled}
        cinematicIntro={cinematicIntro}
        finisherSlowMotion={finisherSlowMotion}
      />
      <AshSky motionRef={motionRef} />
      <WorldChunks
        chunks={chunks}
        motionRef={motionRef}
        motionReduced={motionReduced}
        quality={quality}
        airEnabled={airEnabled}
      />
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
  });
  const pixelRatio = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  const maxDpr = Math.min(getPixelRatioCap(props.quality), pixelRatio);
  const minDpr = Math.min(1, maxDpr);

  useEffect(() => {
    const syncDebug = () => setDebugEnabled(isDebugEnabled());
    window.addEventListener("popstate", syncDebug);
    return () => window.removeEventListener("popstate", syncDebug);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setWebglAvailable(supportsWebGL()));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="world-three-layer" aria-label="Kül Yolu 3D dünyası">
      {webglAvailable === null ? (
        <div className="world-three-loading" role="status">3D sahne hazırlanıyor…</div>
      ) : webglAvailable ? (
        <WorldCanvasErrorBoundary>
          <Canvas
            dpr={[minDpr, maxDpr]}
            shadows={props.quality !== "low"}
            camera={{ position: [0, 4.15, 10.2], fov: 54, near: 0.1, far: 380 }}
            gl={{
              alpha: false,
              antialias: props.quality === "high",
              powerPreference: "high-performance",
              toneMapping: props.visualEffectsEnabled ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping,
              toneMappingExposure: props.visualEffectsEnabled ? 1.12 : 1,
            }}
            onCreated={({ gl: renderer, scene }) => {
              renderer.outputColorSpace = THREE.SRGBColorSpace;
              renderer.info.autoReset = true;
              scene.background = new THREE.Color("#252330");
            }}
            fallback={<div className="world-three-fallback" role="status">Bu tarayıcı 3D sahneyi başlatamadı.</div>}
          >
            <SceneContents {...props} debugEnabled={debugEnabled} onDebugStats={setDebugStats} />
          </Canvas>
        </WorldCanvasErrorBoundary>
      ) : (
        <div className="world-three-fallback" role="alert">
          Bu tarayıcı WebGL ile 3D sahneyi başlatamıyor. Oyunu WebGL destekli bir tarayıcıda açın.
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
          <span>Animasyon: {debugStats.animation} · Ayak kayması: {debugStats.footSlip.toFixed(3)} m</span>
          {props.combatRender && (
            <span>Can: {Math.ceil(props.combatRender.player.hp)}/{props.combatRender.player.maxHp} · Dayanıklılık: {Math.ceil(props.combatRender.player.stamina)}/{props.combatRender.player.maxStamina}</span>
          )}
          <span>Dünya: Kül Yolu · Yüklü parça: {debugStats.chunks}</span>
          <span>BOT: {props.debugCounters.rivalCount} · Eşya: {props.debugCounters.pickupCount} · Toplanan: {props.debugCounters.collectedCount}</span>
          <div className="world-debug__actions">
            <button type="button" onClick={props.onDebugNearestRival}>En yakın BOT</button>
            <button type="button" onClick={props.onDebugNearestPickup}>En yakın eşya</button>
            <button type="button" onClick={props.onDebugSkipDistance}>+25 m</button>
            <button type="button" onClick={props.onDebugStartBattle}>Savaşı hemen başlat</button>
            <button type="button" onClick={props.onToggleDebugOneHit}>Rakibi bir vuruşta öldür: {props.debugOneHitEnabled ? "AÇIK" : "KAPALI"}</button>
          </div>
        </aside>
      )}
    </div>
  );
}
