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
import { getOpponentModelConfig, type OpponentModelAnimationState } from "./opponent-model-config";
import {
  AshSky,
  WorldChunks,
} from "./WorldElements";
import { createWorldChunk, type WorldChunk } from "./world-generation";
import WorldRoadEntities from "./WorldRoadEntities";
import type { WorldRival } from "./world-content";
import type { CombatAction, CombatState } from "../game/combat-engine";
import type { EquipmentVisual } from "../game/store-types";

export type WorldQuality = "high" | "balanced" | "low";

type World3DProps = {
  motionRef: MutableRefObject<WorldMotion>;
  quality: WorldQuality;
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
  triangles: number;
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
    scene.fog = new THREE.FogExp2(airEnabled ? "#514047" : "#382f38", airEnabled ? 0.008 : 0.0045);
    return () => {
      scene.fog = null;
    };
  }, [airEnabled, scene]);
  return null;
}

function CameraRig({
  motionRef,
  motionReduced,
  focusedRival,
  slowMotion,
  combatActive,
  combatStateRef,
}: {
  motionRef: MutableRefObject<WorldMotion>;
  motionReduced: boolean;
  focusedRival: WorldRival | null;
  slowMotion: boolean;
  combatActive: boolean;
  combatStateRef: MutableRefObject<CombatState | null>;
}) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const targetRef = useMemo(() => new THREE.Vector3(), []);
  const desiredRef = useMemo(() => new THREE.Vector3(), []);
  const impactRef = useRef({ tick: -1, startedAt: 0 });

  useFrame((_, delta) => {
    const camera = cameraRef.current;
    if (!camera) return;
    const motion = motionRef.current;
    const speed = Math.hypot(motion.velocityX, motion.velocityY);
    const lateral = motion.depth * 5.2;
    const combat = combatActive ? combatStateRef.current : null;
    const scaledDelta = Math.min(delta, 0.05) * (slowMotion && !combat ? 0.24 : 1);
    const response = 1 - Math.exp(-scaledDelta * (combat ? 5.5 : focusedRival ? 2.6 : 4.5));
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
      if (impact > 0 && !motionReduced) {
        camera.position.x += Math.sin(_.clock.elapsedTime * 58) * 0.055 * impact;
        camera.position.y += Math.cos(_.clock.elapsedTime * 51) * 0.035 * impact;
      }
    } else if (focusedRival) {
      const playerX = motion.depth * 5.2;
      const gap = focusedRival.distance - motion.distance;
      const rivalX = focusedRival.x;
      desiredRef.set((playerX + rivalX) * 0.5 + 3.2, 3.55, -gap * 0.5 + 6.1);
      targetRef.set((playerX + rivalX) * 0.5, 1.15, -gap * 0.5);
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
    const desiredFov = combat ? 45 - combatImpact * 1.1 : focusedRival ? 48 : 54 + Math.min(speed, 7) * 0.7;
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

function modelAnimationForState(state: CharacterAnimationState): OpponentModelAnimationState {
  if (state === "walk" || state === "run") return "run";
  if (state === "heavyAttack") return "attack";
  if (state === "die") return "death";
  return state;
}

function DuelFighter({
  side,
  opponentName,
  motionRef,
  combatStateRef,
  combatRender,
  motionReduced,
  equipmentVisual,
}: {
  side: "player" | "bot";
  opponentName: string;
  motionRef: MutableRefObject<WorldMotion>;
  combatStateRef: MutableRefObject<CombatState | null>;
  combatRender: CombatState | null;
  motionReduced: boolean;
  equipmentVisual: EquipmentVisual;
}) {
  const actorRoot = useRef<THREE.Group>(null);
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
          : modelAnimationForState(animation)
      : modelAnimationForState(animation)
    : undefined;

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

  if (!renderedActor) return null;
  return (
    <group ref={actorRoot}>
      <group scale={side === "bot" ? 1.07 : 1}>
        <KnightActor
          motionRef={actorMotion}
          state={animation}
          motionReduced={motionReduced}
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
      {side === "bot" && (
        <Html position={[renderedActor.x, 2.55, renderedActor.z]} center distanceFactor={12} zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
          <span className="world-bot-tag is-focused"><b>BOT</b><span>RAKİP</span></span>
        </Html>
      )}
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
}: Pick<World3DProps, "opponentName" | "motionRef" | "combatStateRef" | "combatRender" | "motionReduced" | "equipmentVisual">) {
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
      {combatRender && (
        <>
          <DuelFighter side="player" opponentName={opponentName} motionRef={motionRef} combatStateRef={combatStateRef} combatRender={combatRender} motionReduced={motionReduced} equipmentVisual={equipmentVisual} />
          <DuelFighter side="bot" opponentName={opponentName} motionRef={motionRef} combatStateRef={combatStateRef} combatRender={combatRender} motionReduced={motionReduced} equipmentVisual={equipmentVisual} />
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
  combatRender,
  opponentName,
  onDebugStats,
}: World3DProps & { onDebugStats: (stats: DebugStats) => void }) {
  const chunkCacheRef = useRef(new Map<number, WorldChunk>());
  const [chunks, setChunks] = useState<WorldChunk[]>(() => getChunksForDistance(motionRef.current.distance, chunkCacheRef.current));
  const activeChunkRef = useRef(Math.floor(motionRef.current.distance / WORLD_CHUNK_LENGTH_METERS));
  const footSlipRef = useRef(0);
  const { gl } = useThree();
  const debugClock = useRef({ last: 0, frames: 0 });

  useFrame((frame) => {
    const motion = motionRef.current;
    const currentChunk = Math.floor(motion.distance / WORLD_CHUNK_LENGTH_METERS);
    if (currentChunk !== activeChunkRef.current) {
      activeChunkRef.current = currentChunk;
      setChunks(getChunksForDistance(motion.distance, chunkCacheRef.current));
    }
    const now = frame.clock.elapsedTime;
    debugClock.current.frames += 1;
    if (now - debugClock.current.last >= 0.25) {
      const elapsed = now - debugClock.current.last;
      onDebugStats({
        x: motion.depth * 5.2,
        y: 0,
        z: -motion.distance,
        distance: motion.distance,
        speed: Math.hypot(motion.velocityX, motion.velocityY),
        fps: debugClock.current.last === 0 ? 0 : Math.round(debugClock.current.frames / elapsed),
        triangles: gl.info.render.triangles,
        animation: animationState,
        footSlip: footSlipRef.current,
        chunks: chunks.length,
      });
      debugClock.current.last = now;
      debugClock.current.frames = 0;
    }
  });

  return (
    <>
      <SceneFog airEnabled={airEnabled} />
      <color attach="background" args={["#252330"]} />
      <hemisphereLight args={["#d7c4b9", "#27232a", 1.55]} />
      <ambientLight color="#c3a99b" intensity={0.4} />
      <directionalLight position={[-8, 14, 8]} color="#f2d2ad" intensity={1.65} />
      <directionalLight position={[7, 7, -10]} color="#b5bad8" intensity={0.62} />
      <CameraRig
        motionRef={motionRef}
        motionReduced={motionReduced}
        focusedRival={focusedRival}
        slowMotion={slowMotion}
        combatActive={combatActive}
        combatStateRef={combatStateRef}
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
        <DuelArena opponentName={opponentName} motionRef={motionRef} combatStateRef={combatStateRef} combatRender={combatRender} motionReduced={motionReduced} equipmentVisual={equipmentVisual} />
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
    triangles: 0,
    animation: "idle",
    footSlip: 0,
    chunks: 0,
  });
  const pixelRatio = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  const maxDpr = props.quality === "high"
    ? Math.min(2, pixelRatio)
    : props.quality === "balanced"
      ? Math.min(1.5, pixelRatio)
      : Math.min(1, pixelRatio);
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
            camera={{ position: [0, 4.15, 10.2], fov: 54, near: 0.1, far: 380 }}
            gl={{
              alpha: false,
              antialias: props.quality === "high",
              powerPreference: "high-performance",
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.24,
            }}
            onCreated={({ gl: renderer, scene }) => {
              renderer.outputColorSpace = THREE.SRGBColorSpace;
              renderer.info.autoReset = true;
              scene.background = new THREE.Color("#252330");
            }}
            fallback={<div className="world-three-fallback" role="status">Bu tarayıcı 3D sahneyi başlatamadı.</div>}
          >
            <SceneContents {...props} onDebugStats={setDebugStats} />
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
          <span>FPS: {debugStats.fps || "ölçülüyor"} · Üçgen: {debugStats.triangles.toLocaleString("tr-TR")}</span>
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
