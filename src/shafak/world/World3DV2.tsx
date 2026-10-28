import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import * as THREE from "three";
import type { World3DProps } from "./World3D";
import { readWorldInput, WORLD_JOYSTICK_X_DEADZONE } from "./movement";
import type { WorldMotion } from "./movement";
import type { WorldObstacle, WorldRival } from "./world-content";
import { KNIGHT_CONFIG } from "./knight-config";
import { getAnimatedRivalModelConfig } from "./opponent-model-config";
import { getWorldBotProfileByArchetype } from "./world-bot-profiles";
import WorldV2Actor from "./WorldV2Actor";
import type { WorldV2ActorDebugSnapshot } from "./WorldV2Actor";
import { WorldV2Entities } from "./WorldV2Entities";
import {
  WorldV2RouteGates,
  WorldV2WeatherPoints,
} from "./WorldV2Environment";
import WorldRoadEnvironmentLayer from "./WorldRoadEnvironment";
import { getWorldV2CameraOffset, WORLD_V2_CONFIG } from "./world-v2-config";
import { loadAsset } from "./world-v2-assets";
import type { LoadedWorldAsset } from "./world-v2-assets";
import type { WorldV2AssetTarget } from "./world-v2-config";
import { auditWorldMeshSizes, reportWorldMeshSizeIssues } from "./world-v2-audit";
import type { WorldMeshSizeIssue } from "./world-v2-audit";
import {
  resolveCameraCollision,
} from "./world-v2-camera";
import { WORLD_V2_CAMERA_COLLISION_LAYER } from "./world-v2-geometry";
import WorldBlackFrameProbe from "./WorldBlackFrameProbe";
import TimeOfDaySky from "./TimeOfDaySky";
import { WorldV2LabelManager } from "./WorldV2Labels";
import { getWorldRenderPixelRatio, shouldEnableWorldShadows } from "./graphics-quality";
import { inspectWorldCharacterGroups } from "./world-character-debug";
import "./world-v2.css";

type MotionRef = World3DProps["motionRef"];
const DEMIR_TAC_WORLD_CONFIG = getAnimatedRivalModelConfig(
  "Demir Taç",
  getWorldBotProfileByArchetype("chapter-boss"),
  "world",
)!;
const DEMIR_TAC_WORLD_ASSET_TARGET: WorldV2AssetTarget = {
  targetHeight: DEMIR_TAC_WORLD_CONFIG.targetHeight!,
  maxDimension: DEMIR_TAC_WORLD_CONFIG.maxDimension!,
  modelRotation: DEMIR_TAC_WORLD_CONFIG.modelRotation,
};

type DebugSnapshot = {
  fps: number;
  camera: [number, number, number];
  nearbyMeshes: string[];
  sizeWarnings: WorldMeshSizeIssue[];
};

const NO_HELD_KEYS: ReadonlySet<string> = new Set();

function readQueryFlag(name: string) {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get(name) === "1";
}

function WorldV2Camera({
  motionRef,
  motionReduced,
}: {
  motionRef: MotionRef;
  motionReduced: boolean;
}) {
  const { camera, scene } = useThree();
  const raycaster = useMemo(() => {
    const caster = new THREE.Raycaster();
    caster.layers.set(WORLD_V2_CAMERA_COLLISION_LAYER);
    return caster;
  }, []);
  const origin = useMemo(() => new THREE.Vector3(), []);
  const desired = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);
  const presentationOffset = useMemo(() => new THREE.Vector3(), []);
  const cameraHeading = useRef(0);
  const previousMovementState = useRef<WorldMotion["movementState"] | null>(null);
  const jumpPeakHeight = useRef(0);
  const landingPulseSeconds = useRef(0);
  const landingPulseStrength = useRef(0);

  useEffect(() => {
    camera.near = WORLD_V2_CONFIG.camera.near;
    camera.far = WORLD_V2_CONFIG.camera.far;
    if (camera instanceof THREE.PerspectiveCamera) camera.fov = 70;
    camera.updateProjectionMatrix();
  }, [camera]);

  useFrame((_state, delta) => {
    const motion = motionRef.current;
    const dt = Math.min(delta, 0.05);
    camera.position.sub(presentationOffset);
    presentationOffset.set(0, 0, 0);
    if (motion.movementState === "HAVADA_YUKARI" || motion.movementState === "HAVADA_AŞAĞI") {
      jumpPeakHeight.current = Math.max(jumpPeakHeight.current, motion.jumpHeight);
    }
    if (
      motion.movementState === "İNİŞ"
      && previousMovementState.current !== "İNİŞ"
    ) {
      landingPulseStrength.current = THREE.MathUtils.clamp(jumpPeakHeight.current * 0.085, 0.035, 0.16);
      landingPulseSeconds.current = 0.24;
      jumpPeakHeight.current = 0;
    }
    previousMovementState.current = motion.movementState;
    landingPulseSeconds.current = Math.max(0, landingPulseSeconds.current - dt);
    const playerX = motion.depth * 5.2;
    const playerZ = -(motion.distance - motion.cameraX);
    const targetHeading = motion.cameraHeading;
    const headingDelta = Math.atan2(
      Math.sin(targetHeading - cameraHeading.current),
      Math.cos(targetHeading - cameraHeading.current),
    );
    cameraHeading.current += headingDelta * (1 - Math.exp(-9 * dt));
    const cameraOffset = getWorldV2CameraOffset(
      cameraHeading.current,
      WORLD_V2_CONFIG.camera.distanceBehind,
    );
    origin.set(playerX, motion.jumpHeight + 1.05, playerZ);
    desired.set(
      playerX + cameraOffset.x,
      motion.jumpHeight + WORLD_V2_CONFIG.camera.height,
      playerZ + cameraOffset.z,
    );
    direction.copy(desired).sub(origin);
    const desiredDistance = direction.length();
    if (desiredDistance > 0) {
      direction.normalize();
      raycaster.set(origin, direction);
      raycaster.far = desiredDistance;
      const hit = raycaster.intersectObjects(scene.children, true)
        .find((candidate) =>
          candidate.object.layers.test(raycaster.layers)
          && candidate.object.visible
          && candidate.distance < desiredDistance,
        );
      const safePosition = resolveCameraCollision(origin, desired, hit?.distance);
      if (hit) camera.position.copy(safePosition);
      else camera.position.lerp(safePosition, 1 - Math.exp(-WORLD_V2_CONFIG.camera.followSpeed * dt));
    }
    target.set(playerX, motion.jumpHeight + WORLD_V2_CONFIG.camera.targetHeight, playerZ);
    camera.lookAt(target);
    const pulseProgress = 1 - landingPulseSeconds.current / 0.24;
    const pulseEnvelope = Math.sin(Math.PI * pulseProgress) * landingPulseStrength.current;
    const cameraShake = motionReduced ? 0 : pulseEnvelope;
    presentationOffset.set(
      Math.sin(_state.clock.elapsedTime * 86) * cameraShake * 0.16,
      -pulseEnvelope,
      0,
    );
    camera.position.add(presentationOffset);
    if (camera instanceof THREE.PerspectiveCamera) {
      const targetFov = !motionReduced && motion.movementState === "SPRINT" ? 76 : 70;
      const nextFov = THREE.MathUtils.damp(camera.fov, targetFov, 5, dt);
      if (Math.abs(nextFov - camera.fov) > 0.015) {
        camera.fov = nextFov;
        camera.updateProjectionMatrix();
      }
    }
  });
  return null;
}

function findMeshesNearCamera(scene: THREE.Scene, camera: THREE.Camera, maxDistance: number) {
  camera.updateMatrixWorld(true);
  const cameraPosition = camera.getWorldPosition(new THREE.Vector3());
  const bounds = new THREE.Box3();
  const closest = new THREE.Vector3();
  const found: { label: string; distance: number }[] = [];
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !object.visible) return;
    if (object instanceof THREE.InstancedMesh) {
      const local = object.geometry.boundingBox ?? (object.geometry.computeBoundingBox(), object.geometry.boundingBox);
      if (!local) return;
      const instance = new THREE.Matrix4();
      const world = new THREE.Matrix4();
      for (let index = 0; index < object.count; index += 1) {
        object.getMatrixAt(index, instance);
        world.multiplyMatrices(object.matrixWorld, instance);
        bounds.copy(local).applyMatrix4(world);
        bounds.clampPoint(cameraPosition, closest);
        const distance = closest.distanceTo(cameraPosition);
        if (distance <= maxDistance) found.push({ label: `${object.name || object.type}[${index}]`, distance });
      }
      return;
    }
    bounds.setFromObject(object, true);
    bounds.clampPoint(cameraPosition, closest);
    const distance = closest.distanceTo(cameraPosition);
    if (distance <= maxDistance) found.push({ label: object.name || object.type, distance });
  });
  return found
    .sort((left, right) => left.distance - right.distance)
    .slice(0, 10)
    .map((item) => `${item.label} (${item.distance.toFixed(1)}m)`);
}

function WorldV2Diagnostics({
  enabled,
  onUpdate,
}: {
  enabled: boolean;
  onUpdate: (snapshot: DebugSnapshot) => void;
}) {
  const { scene, camera } = useThree();
  const elapsed = useRef(0);
  const frameCount = useRef(0);
  const lastWarnings = useRef("");
  useFrame((_state, delta) => {
    if (!enabled) return;
    elapsed.current += delta;
    frameCount.current += 1;
    if (elapsed.current < 1) return;
    const fps = Math.round(frameCount.current / elapsed.current);
    const warnings = auditWorldMeshSizes(scene);
    const signature = warnings.map((warning) => `${warning.name}:${warning.maxDimension}`).join("|");
    if (signature !== lastWarnings.current) {
      lastWarnings.current = signature;
      reportWorldMeshSizeIssues(warnings);
    }
    onUpdate({
      fps,
      camera: [camera.position.x, camera.position.y, camera.position.z].map((value) => Number(value.toFixed(2))) as [number, number, number],
      nearbyMeshes: findMeshesNearCamera(scene, camera, 3),
      sizeWarnings: warnings,
    });
    elapsed.current = 0;
    frameCount.current = 0;
  });
  return null;
}

function WorldV2FrameDebug({
  enabled,
  motionRef,
  joystickRef,
  actorDebugRef,
  visibleLabelCountRef,
  outputRef,
  rivals,
}: {
  enabled: boolean;
  motionRef: MotionRef;
  joystickRef: World3DProps["joystickRef"];
  actorDebugRef: React.MutableRefObject<WorldV2ActorDebugSnapshot | null>;
  visibleLabelCountRef: React.MutableRefObject<number>;
  outputRef: React.RefObject<HTMLPreElement | null>;
  rivals: World3DProps["rivals"];
}) {
  const { camera, scene } = useThree();
  const cameraPosition = useMemo(() => new THREE.Vector3(), []);
  const playerPosition = useMemo(() => new THREE.Vector3(), []);
  const bossPosition = useMemo(() => new THREE.Vector3(), []);
  const cameraDirection = useMemo(() => new THREE.Vector3(), []);
  const refreshElapsed = useRef(0);
  const empty = "—";

  useFrame((_state, delta) => {
    if (!enabled || !outputRef.current) return;
    refreshElapsed.current += Math.min(delta, 0.1);
    if (refreshElapsed.current < 0.2) return;
    refreshElapsed.current %= 0.2;
    const motion = motionRef.current;
    const rawJoystick = joystickRef.current;
    const processedJoystick = readWorldInput(NO_HELD_KEYS, rawJoystick);
    const actorDebug = actorDebugRef.current;
    const characterGroups = inspectWorldCharacterGroups(scene);
    const playerGroup = characterGroups.find((group) => group.isPlayer);
    const bossGroup = characterGroups.find((group) => group.isBoss);
    camera.getWorldPosition(cameraPosition);
    camera.getWorldDirection(cameraDirection);
    const cameraYaw = Math.atan2(cameraDirection.x, -cameraDirection.z);
    if (playerGroup) playerPosition.fromArray(playerGroup.position);
    else playerPosition.set(motion.depth * 5.2, motion.jumpHeight, -(motion.distance - motion.cameraX));
    const cameraPlayerDistance = cameraPosition.distanceTo(playerPosition);
    const boss = rivals.find((rival) => rival.isBoss);
    const bossActor = bossGroup
      ? scene.getObjectByName(bossGroup.name)
      : boss ? scene.getObjectByName(`world-v2-npc:${boss.name}:${boss.id}`) : undefined;
    const cameraBossDistance = bossActor
      ? cameraPosition.distanceTo(bossActor.getWorldPosition(bossPosition))
      : null;
    const format = (value: number) => Number.isFinite(value) ? value.toFixed(2) : empty;
    const yaw = actorDebug?.yaw ?? playerGroup?.yaw ?? undefined;
    const characterErrors = characterGroups.flatMap((group) =>
      group.errors.map((error) => `${group.name} / ${error}`),
    );
    const formatDegrees = (value: number) => Number.isFinite(value)
      ? `${THREE.MathUtils.radToDeg(value).toFixed(1)}°`
      : empty;
    const formatRotation = (rotation: [number, number, number] | null) => rotation
      ? rotation.map(formatDegrees).join("/")
      : empty;
    const playerAnimations = playerGroup?.animations ?? [];
    const strafeAnimations = playerAnimations.filter((animation) =>
      /strafe|side|left|right/i.test(animation.name),
    );
    const strafeWeight = strafeAnimations.reduce((weight, animation) => weight + animation.weight, 0);
    const targetYawText = actorDebug ? formatDegrees(actorDebug.targetHeading) : empty;
    const bodyYawText = yaw === undefined ? empty : formatDegrees(yaw);
    const visibleHeadingText = actorDebug ? formatDegrees(actorDebug.visibleHeading) : empty;
    outputRef.current.textContent = [
      `Joystick ham: ${format(rawJoystick.x)}, ${format(rawJoystick.y)}`,
      `Joystick dönüş / ileri: ${format(processedJoystick.turn)}, ${format(processedJoystick.forward)} (deadzone ${format(WORLD_JOYSTICK_X_DEADZONE)})`,
      `Hız X / ileri: ${format(motion.velocityX)}, ${format(motion.velocityY)} m/sn`,
      `Kamera yaw: ${formatDegrees(cameraYaw)}`,
      `Hedef yaw / gövde yaw / net model yönü: ${targetYawText} / ${bodyYawText} / ${visibleHeadingText}`,
      `Gerçek beden eğimi 3B (Hips→Head): ${formatDegrees(actorDebug?.bodyLean ?? Number.NaN)}`,
      `Root XYZ / Hips XYZ: ${formatRotation(actorDebug?.rootRotation ?? null)} / ${formatRotation(actorDebug?.hipsRotation ?? null)}`,
      `Torso XYZ: ${formatRotation(actorDebug?.torsoRotation ?? null)}`,
      `Root/Hips konum track'i: ${actorDebug?.rootMotionTracks.join(", ") || "yok"}`,
      `Strafe clip ağırlığı: ${format(strafeWeight)}${strafeAnimations.length ? "" : " (clip yok)"}`,
      `Kamera-oyuncu: ${format(cameraPlayerDistance)} m`,
      `Kamera-boss: ${cameraBossDistance === null ? empty : `${format(cameraBossDistance)} m`}`,
      `Çalan animasyonlar: ${characterGroups.flatMap((group) =>
        group.animations.map((animation) => `${group.name}/${animation.name}=${animation.weight.toFixed(3)}`),
      ).join(", ") || `${actorDebug?.clipName ?? empty}=${format(actorDebug?.clipWeight ?? 0)}`}`,
      `Görünür dünya etiketi: ${visibleLabelCountRef.current}`,
      `HATA karakter mesh offset: ${characterErrors.length}`,
      ...characterErrors.slice(0, 4).map((error) => `HATA ${error}`),
      ...(characterErrors.length > 4 ? [`…${characterErrors.length - 4} başka hata`] : []),
    ].join("\n");
  });
  return null;
}

function isDebugEnabled() {
  return readQueryFlag("debug");
}

function getBuildStamp() {
  try {
    return typeof __WORLD_BUILD_HASH__ === "string" ? __WORLD_BUILD_HASH__ : "dev";
  } catch {
    return "dev";
  }
}

class WorldV2CanvasErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.error("[shafak-world-v2] 3D canvas failed to start.", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function World3DV2(props: World3DProps) {
  const [debug] = useState(isDebugEnabled);
  const [noNpc] = useState(() => readQueryFlag("nonpc"));
  const [noProps] = useState(() => readQueryFlag("noprops"));
  const [noFx] = useState(() => readQueryFlag("nofx"));
  const [rendererUnavailable, setRendererUnavailable] = useState(false);
  const [canvasAttempt, setCanvasAttempt] = useState(0);
  const [asset, setAsset] = useState<LoadedWorldAsset | null>(null);
  const [demirTacAsset, setDemirTacAsset] = useState<LoadedWorldAsset | null>(null);
  const [assetError, setAssetError] = useState("");
  const hasDemirTacRival = props.rivals.some((rival) => rival.name === "Demir Taç");
  const [debugSnapshot, setDebugSnapshot] = useState<DebugSnapshot>({
    fps: 0,
    camera: [0, 0, 0],
    nearbyMeshes: [],
    sizeWarnings: [],
  });
  const frameDebugOutputRef = useRef<HTMLPreElement>(null);
  const actorDebugRef = useRef<WorldV2ActorDebugSnapshot | null>(null);
  const visibleLabelCountRef = useRef(0);
  const touchRenderer = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const pixelRatio = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  const renderPixelRatio = getWorldRenderPixelRatio(props.quality, pixelRatio, touchRenderer);
  const enableWorldShadows = shouldEnableWorldShadows(props.quality, touchRenderer);
  const contextCleanupRef = useRef<(() => void) | null>(null);
  const automaticRecoveryAttemptsRef = useRef(0);
  const recoveryRequestedRef = useRef(false);

  const retryWorld3D = useCallback(() => {
    automaticRecoveryAttemptsRef.current = 0;
    recoveryRequestedRef.current = false;
    setRendererUnavailable(false);
    setCanvasAttempt((attempt) => attempt + 1);
  }, []);
  const recoverWorld3D = useCallback(() => {
    if (recoveryRequestedRef.current) return;
    if (automaticRecoveryAttemptsRef.current >= 1) {
      console.error("[world-v2] 3D renderer stayed black after rebuilding; waiting for a manual 3D retry.");
      setRendererUnavailable(true);
      return;
    }
    automaticRecoveryAttemptsRef.current += 1;
    recoveryRequestedRef.current = true;
    console.warn("[world-v2] rebuilding the 3D renderer after an empty frame or context loss.");
    setCanvasAttempt((attempt) => attempt + 1);
  }, []);

  useEffect(() => {
    const resetRecoveryBudget = window.setTimeout(() => {
      automaticRecoveryAttemptsRef.current = 0;
    }, 15_000);
    return () => window.clearTimeout(resetRecoveryBudget);
  }, [canvasAttempt, rendererUnavailable]);

  useEffect(() => () => {
    contextCleanupRef.current?.();
    contextCleanupRef.current = null;
  }, []);

  useEffect(() => {
    let active = true;
    const playerAsset = loadAsset(KNIGHT_CONFIG.modelPath, WORLD_V2_CONFIG.player);
    const bossAsset = hasDemirTacRival
      ? loadAsset(DEMIR_TAC_WORLD_CONFIG.modelPath, DEMIR_TAC_WORLD_ASSET_TARGET)
      : Promise.resolve(null);
    Promise.all([playerAsset, bossAsset])
      .then(([loadedPlayer, loadedDemirTac]) => {
        if (!active) return;
        setAsset(loadedPlayer);
        setDemirTacAsset(loadedDemirTac);
      })
      .catch((error: unknown) => {
        if (active) setAssetError(error instanceof Error ? error.message : String(error));
      });
    return () => {
      active = false;
    };
  }, [hasDemirTacRival]);

  return (
    <div className="world-three-layer world-3d-layer" aria-label="Kül Yolu 3D dünyası">
      {rendererUnavailable ? (
        <div className="world-three-fallback" role="alert">
          <div className="world-three-fallback__content">
            <p>3D görüntüleyici iki denemeden sonra da açılamadı. Safari’de WebGL’i destekleyen bir sekmede yeniden deneyin.</p>
            <button type="button" onClick={retryWorld3D}>3D SAHNEYİ YENİDEN OLUŞTUR</button>
          </div>
        </div>
      ) : (
        <WorldV2CanvasErrorBoundary
          key={canvasAttempt}
          fallback={
            <div className="world-three-fallback" role="alert">
              <div className="world-three-fallback__content">
                <p>3D görüntüleyici başlatılamadı. Sahne 3D olarak yeniden oluşturulmayı bekliyor.</p>
                <button type="button" onClick={retryWorld3D}>3D SAHNEYİ YENİDEN OLUŞTUR</button>
              </div>
            </div>
          }
        >
          <Canvas
            key={canvasAttempt}
            dpr={renderPixelRatio}
            shadows={enableWorldShadows}
            camera={{
              position: [0, WORLD_V2_CONFIG.camera.height, WORLD_V2_CONFIG.camera.distanceBehind],
              fov: 70,
              near: WORLD_V2_CONFIG.camera.near,
              far: WORLD_V2_CONFIG.camera.far,
            }}
            gl={{
              alpha: false,
              antialias: true,
              powerPreference: "high-performance",
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.05,
            }}
            onCreated={({ gl, scene }) => {
              gl.setPixelRatio(renderPixelRatio);
              gl.outputColorSpace = THREE.SRGBColorSpace;
              gl.shadowMap.enabled = enableWorldShadows;
              gl.shadowMap.type = THREE.PCFSoftShadowMap;
              gl.info.autoReset = false;
              scene.background = new THREE.Color("#82919b");
              recoveryRequestedRef.current = false;
              contextCleanupRef.current?.();
              const canvas = gl.domElement;
              const handleContextLost = (event: Event) => {
                event.preventDefault();
                recoverWorld3D();
              };
              const handleContextRestored = () => recoverWorld3D();
              canvas.addEventListener("webglcontextlost", handleContextLost, false);
              canvas.addEventListener("webglcontextrestored", handleContextRestored, false);
              contextCleanupRef.current = () => {
                canvas.removeEventListener("webglcontextlost", handleContextLost, false);
                canvas.removeEventListener("webglcontextrestored", handleContextRestored, false);
              };
            }}
            fallback={
              <div className="world-three-fallback" role="alert">
                <div className="world-three-fallback__content">
                  <p>Bu tarayıcı 3D sahneyi başlatamadı. WebGL destekli bir tarayıcıda yeniden deneyin.</p>
                  <button type="button" onClick={retryWorld3D}>3D SAHNEYİ YENİDEN OLUŞTUR</button>
                </div>
              </div>
            }
          >
            <Suspense fallback={null}>
              <TimeOfDaySky quality={props.quality} />
              <WorldRoadEnvironmentLayer
                motionRef={props.motionRef}
                weather={props.weatherMode}
                showProps={!noProps}
                quality={props.quality}
              />
              <WorldV2Camera motionRef={props.motionRef} motionReduced={props.motionReduced} />
              <WorldV2RouteGates
                motionRef={props.motionRef}
                unlockedThroughChapter={props.unlockedThroughChapter}
              />
              <WorldV2WeatherPoints
                motionRef={props.motionRef}
                weather={props.weatherMode}
                enabled={!noFx}
                quality={props.quality}
              />
              {asset && (
                <>
                  <WorldV2Actor
                    asset={asset}
                    motionRef={props.motionRef}
                    debugRef={debug ? actorDebugRef : undefined}
                    isPlayer
                    animationState={props.animationState}
                  />
                  <WorldV2Entities
                    motionRef={props.motionRef}
                    asset={asset}
                    demirTacAsset={demirTacAsset}
                    demirTacModelConfig={DEMIR_TAC_WORLD_CONFIG}
                    dialoguePortal={props.dialoguePortal}
                    rivals={props.rivals}
                    pickups={props.pickups}
                    obstacles={props.obstacles}
                    collectedPickupIds={props.collectedPickupIds}
                    brokenObstacleIds={props.brokenObstacleIds}
                    focusedRivalId={props.focusedRival?.id ?? null}
                    talkingRivalId={props.talkingRivalId}
                    canChallenge={props.canChallenge}
                    dailyAccessAllowed={props.dailyAccessAllowed}
                    challengeLabel={props.challengeLabel}
                    onChallenge={props.onChallenge}
                    onFallingRockDespawn={props.onFallingRockDespawn}
                    interactableRegistry={props.interactableRegistry}
                    weather={props.weatherMode}
                    noNpc={noNpc}
                  />
                </>
              )}
            </Suspense>
            <WorldV2LabelManager
              motionRef={props.motionRef}
              visibleCountRef={debug ? visibleLabelCountRef : undefined}
            />
            {debug && (
              <WorldV2FrameDebug
                enabled={debug}
                motionRef={props.motionRef}
                joystickRef={props.joystickRef}
                actorDebugRef={actorDebugRef}
                visibleLabelCountRef={visibleLabelCountRef}
                outputRef={frameDebugOutputRef}
                rivals={props.rivals}
              />
            )}
            {debug && <WorldV2Diagnostics enabled={debug} onUpdate={setDebugSnapshot} />}
            <WorldBlackFrameProbe onBlackFrame={recoverWorld3D} manualRender />
          </Canvas>
        </WorldV2CanvasErrorBoundary>
      )}
      {assetError && (
        <div className="world-v2-error" role="alert">
          3D karakter modeli yüklenemedi: {assetError}
        </div>
      )}
      {debug && (
        <aside className="world-v2-frame-debug" aria-label="Kare başına dünya tanılaması">
          <b>FRAME DEBUG</b>
          <pre ref={frameDebugOutputRef}>Joystick ve sahne verileri bekleniyor…</pre>
        </aside>
      )}
      {debug && (
        <aside className="world-v2-debug" aria-live="polite">
          <b>WORLD V2 · FPS {debugSnapshot.fps}</b>
          <span>Kamera {debugSnapshot.camera.join(", ")}</span>
          <span>Yakın mesh (&lt;3m): {debugSnapshot.nearbyMeshes.length ? debugSnapshot.nearbyMeshes.join(", ") : "yok"}</span>
          {debugSnapshot.sizeWarnings.map((warning) => (
            <span className={warning.error ? "is-error" : "is-warning"} key={`${warning.name}:${warning.instanceId ?? "mesh"}`}>
              {warning.error ? "HATA" : "UYARI"} {warning.name}: {warning.maxDimension}m
            </span>
          ))}
          <small>build: {getBuildStamp()}</small>
        </aside>
      )}
      {!asset && !assetError && <div className="world-v2-loading" role="status">3D karakter yükleniyor…</div>}
    </div>
  );
}
