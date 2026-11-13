import { Canvas, createPortal, useFrame, useThree } from "@react-three/fiber";
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  memo,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import type { ReactNode } from "react";
import * as THREE from "three";
import {
  WAR_ROOM_BLOCKERS,
  WAR_ROOM_CHARACTER_HEIGHT,
  WAR_ROOM_COMMANDER_SCALE,
  WAR_ROOM_WEAPON_BY_ID,
  WAR_ROOM_WEAPON_MOUNTS,
  type WarRoomBlocker,
  type WarRoomWeaponMount,
  type WarRoomWeaponId,
} from "../game/war-room-data";
import {
  getWarRoomFloorHeight,
  getWarRoomBuildingLocalPoint,
  getWarRoomStairProgress,
  type WarRoomRoom,
} from "../game/war-room-rooms";
import {
  getWarRoomActiveBlockers,
  getNearestWarRoomDoor,
  getWarRoomDoorOpenProgress,
  updateWarRoomDoors,
} from "../game/war-room-doors";
import {
  applyWarRoomLookDelta,
  getWarRoomCameraAngles,
  setWarRoomLook,
} from "../game/war-room-look";
import {
  getWarRoomPointerSensitivity,
  readWarRoomLookSensitivitySettings,
} from "../game/war-room-look-settings";
import {
  getWarRoomBotDecisionInterval,
  getWarRoomLootPursuitPoint,
  getWarRoomObstacleWaypoint,
  shouldUpdateWarRoomBotPerception,
  WAR_ROOM_BOT_PERCEPTION_INTERVAL_SECONDS,
} from "../game/war-room-ai";
import WarRoomBattlefield from "./WarRoomBattlefield";
import {
  getWarRoomMeleeEffectiveReach,
  traceWarRoomMeleeCone,
  traceWarRoomRay,
  type WarRoomMeleeConeReason,
} from "../game/war-room-aim";
import {
  RESTORE_CONFIG,
  advanceWarRoomPassiveRegen,
  applyWarRoomKillHeal,
  collectWarRoomHealingPoint,
  type WarRoomHealingPoint,
} from "../game/war-room-restore";
import {
  getWarRoomMeleeAssistYaw,
  getWarRoomMeleeAttackPlan,
  getWarRoomRangedAimAssistYaw,
} from "../game/war-room-combat-feel";
import {
  cancelWarRoomPostAttackStrafeOnMovement,
  getWarRoomActorRootYawToTarget,
  getWarRoomPostAttackStrafeUntil,
  getWarRoomYawError,
  getWarRoomFacingYawFromRootYaw,
  getWarRoomPlayerRootYaw,
  getWarRoomWorldMovement,
  resolveWarRoomLocomotion,
  resolveWarRoomOrientation,
  getWarRoomActorYawToTarget,
  getWarRoomDirectionalSpeedScale,
  isWarRoomFacingTarget,
  stepWarRoomYaw,
} from "../game/war-room-orientation";
import {
  getWarRoomMovementCameraYaw,
  clampWarRoomLookDelta,
  rebaseWarRoomJoystick,
  type WarRoomMobileControlsState,
} from "../game/war-room-mobile-controls";
import {
  getWarRoomPlayerAnimationPlaybackScale,
  resolveWarRoomPlayerAnimationState,
} from "../game/war-room-player-animation";
import {
  clampWarRoomCameraToInterior,
  getWarRoomRearCameraFrame,
  getWarRoomCameraBlockerIds,
  getWarRoomCameraRaySafeDistance,
  getWarRoomResponsiveCameraFov,
  getWarRoomCameraRig,
  getWarRoomEyeClearancePush,
  isWarRoomEyeClearAbove,
  isWarRoomCameraPointClear,
  getWarRoomViewModelWallProximity,
  getWarRoomViewModelWallSafetyRetraction,
  resolveWarRoomInteriorCameraPlacement,
  resolveWarRoomCameraPlacement,
  stepWarRoomCameraFloorHeight,
  stepWarRoomCameraFollowPosition,
  type WarRoomCameraBounds,
  type WarRoomCameraMode,
  type WarRoomShoulderSide,
} from "../game/war-room-camera";
import {
  createWarRoomSprintHysteresisState,
  stepWarRoomSprintHysteresis,
} from "../game/war-room-input";
import {
  getWarRoomCameraFov,
  getWarRoomViewModelAimScaleFactor,
  getWarRoomViewModelOpacity,
  getWarRoomViewModelConfig,
  getWarRoomViewModelGripPoints,
  getWarRoomViewModelHorizontalFactor,
  getWarRoomViewModelMovementIntent,
  getWarRoomViewModelPose,
  getWarRoomViewModelScaleFactor,
  getWarRoomViewModelSwayScale,
  createWarRoomViewModelFrameTimingState,
  createWarRoomViewModelPoseSpringState,
  stepWarRoomViewModelFrameTiming,
  stepWarRoomViewModelMovement,
  stepWarRoomViewModelPoseSpring,
  stepWarRoomViewModelRunAmount,
  stepWarRoomViewModelWallProximity,
  WAR_ROOM_VIEWMODEL_FOV,
  type WarRoomViewModelPose,
  type WarRoomViewModelFrameTimingState,
  type WarRoomViewModelPoseSpringState,
  type WarRoomViewModelMovementState,
} from "../game/war-room-viewmodel";
import type { WarRoomWeaponSwayLevel } from "../game/war-room-viewmodel-settings";
import {
  getWarRoomImpactFxProfile,
  WAR_ROOM_CRACK_DECAL_LIFETIME_SECONDS,
  WAR_ROOM_DECAL_POOL_SIZE,
  WAR_ROOM_EFFECT_POOL_SIZE,
  WAR_ROOM_SLASH_TRAIL_SEGMENTS,
} from "../game/war-room-fx";
import {
  WAR_ROOM_CAMERA_OCCLUSION_ENABLED,
  WAR_ROOM_COMBAT_FEEL_ENABLED,
  WAR_ROOM_COMMANDER_TELEGRAPH_ENABLED,
  WAR_ROOM_LAST_ENEMY_CINEMATIC_ENABLED,
  WAR_ROOM_POOLED_FX_ENABLED,
  WAR_ROOM_REACTION_FEEDBACK_ENABLED,
  WAR_ROOM_WEAPON_PRESENTATION_ENABLED,
} from "../game/war-room-features";
import {
  getWarRoomBossAttackDamage,
  getWarRoomBossChargeStep,
  getWarRoomBossPhase,
  getWarRoomBossShockwaveHits,
  getWarRoomBossTelegraphSeconds,
  updateWarRoomBossTelegraph,
  WAR_ROOM_BOSS_ATTACK_COOLDOWN_SECONDS,
  WAR_ROOM_BOSS_CHARGE_SECONDS,
  WAR_ROOM_BOSS_SHOCKWAVE_RADIUS,
  WAR_ROOM_BOSS_SUMMON_COUNT,
  type WarRoomBossAttack,
} from "../game/war-room-boss";
import { updateWarRoomAwareness } from "../game/war-room-awareness";
import {
  getWarRoomCommanderTelegraphProgress,
  getWarRoomDeathFadeProgress,
  getWarRoomHitRimIntensity,
  getWarRoomVisualKnockbackDistance,
  WAR_ROOM_COMMANDER_TELEGRAPH_SECONDS,
  WAR_ROOM_ENEMY_DEATH_FADE_SECONDS,
  WAR_ROOM_ENEMY_HIT_FLASH_SECONDS,
  WAR_ROOM_LAST_ENEMY_SLOW_MOTION_SECONDS,
} from "../game/war-room-reactions";
import {
  countOccupiedWarRoomDecals,
  countActiveWarRoomParticles,
  getWarRoomEffectCount,
  getWarRoomFrameStats,
  getWarRoomPixelRatio,
  getWarRoomQualityProfile,
  isWarRoomAttackRunContinuous,
  WAR_ROOM_DRAW_CALL_BUDGET,
  WAR_ROOM_PERFORMANCE_SAMPLE_MS,
  type WarRoomFrameStats,
} from "../game/war-room-quality";
import {
  recordWarRoomPerformanceFrame,
  recordWarRoomQualityDowngrade,
  recordWarRoomShaderWarmup,
  resetWarRoomPerformanceFrameClock,
  warRoomPerformanceCollector,
} from "../game/war-room-performance";
import { pauseWarRoomInput } from "../game/war-room-input";
import { disposeWarRoomSceneResources } from "../game/war-room-dispose";
import type { RenderQuality } from "./graphics-quality";
import WarRoomAdaptiveDpr from "./WarRoomAdaptiveDpr";
import TimeOfDaySky from "./TimeOfDaySky";
import {
  applyWarRoomDamage,
  applyWarRoomLootChest,
  getNearbyWarRoomLootChest,
  getNearestWarRoomCover,
  getWarRoomCommanderHealth,
  getWarRoomRemaining,
  getWarRoomFallDamage,
  moveWarRoomEntity,
  nextWarRoomRandom,
  spawnWarRoomBossSummons,
  segmentBlockFraction,
  shortestAngleDelta,
  WAR_ROOM_PLAYER_COLLISION_RADIUS,
  type WarRoomEnemy,
  type WarRoomHudSnapshot,
  type WarRoomInputState,
  type WarRoomRuntime,
} from "../game/war-room-engine";
import {
  advanceWarRoomFixedMovement,
  createWarRoomMovementClock,
} from "../game/war-room-fixed-movement";
import {
  getWarRoomMeleeImpactCues,
  playWarRoomSound,
  type WarRoomShotStyle,
  type WarRoomSoundOptions,
  type WarRoomSoundSurface,
} from "../game/war-room-audio";
import { isWarRoomLowHealth } from "../game/war-room-feedback";
import {
  getWarRoomEnemySpeedMultiplier,
  getWarRoomMissionOutcome,
} from "../game/war-room-missions";
import {
  WarRoomAnimatedActor,
  WarRoomAssetBoundary,
  WarRoomStaticModel,
  type WarRoomAnimationState,
} from "./WarRoomModels";
import { WarRoomFirstPersonArms, type WarRoomArmsAnimation } from "./WarRoomFirstPersonArms";
import WarRoomFirstPersonLegs from "./WarRoomFirstPersonLegs";
import { WAR_ROOM_CONFIG } from "../game/war-room-config";
import WarRoomSceneErrorBoundary from "./WarRoomSceneErrorBoundary";

type Props = {
  runtimeRef: MutableRefObject<WarRoomRuntime>;
  inputRef: MutableRefObject<WarRoomInputState>;
  mobileControlsRef: MutableRefObject<WarRoomMobileControlsState>;
  weaponIds: readonly [WarRoomWeaponId, WarRoomWeaponId];
  weaponMountOverrides?: Partial<Record<WarRoomWeaponId, WarRoomWeaponMount>>;
  cameraMode: WarRoomCameraMode;
  motionReduced: boolean;
  weaponSway: WarRoomWeaponSwayLevel;
  armsVisible: boolean;
  shoulderSide: WarRoomShoulderSide;
  shoulderOffset: number;
  bloodEffects: boolean;
  trainingMode: boolean;
  quality: RenderQuality;
  debugMode: boolean;
  debugDiagnosticsEnabled: boolean;
  collectPerformanceMetrics: boolean;
  onMeleeDebugUpdate: (message: string) => void;
  onRenderStats: (stats: WarRoomFrameStats) => void;
  onLookDebugUpdate: (snapshot: {
    yaw: number;
    pitch: number;
    x: number;
    y: number;
    z: number;
    deltaX: number;
    deltaY: number;
  }) => void;
  onHudUpdate: (snapshot: WarRoomHudSnapshot) => void;
  onFinish: (result: "victory" | "defeat", snapshot: WarRoomHudSnapshot) => void;
  onWarmupComplete: (succeeded: boolean) => void;
  onRuntimeError: () => void;
};

const WAR_ROOM_FIXED_CAMERA_PITCH = WAR_ROOM_CONFIG.camera.fixedPitch;

type WarRoomHandMountPose = {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
};

function getWarRoomHandMountPose(
  root: THREE.Group,
  hand: THREE.Object3D,
  mount: WarRoomWeaponMount,
): WarRoomHandMountPose {
  root.updateWorldMatrix(true, true);
  hand.updateWorldMatrix(true, false);

  const position = new THREE.Vector3(...mount.position)
    .applyMatrix4(root.matrixWorld)
    .applyMatrix4(new THREE.Matrix4().copy(hand.matrixWorld).invert());
  const rootWorldRotation = root.getWorldQuaternion(new THREE.Quaternion());
  const handWorldRotation = hand.getWorldQuaternion(new THREE.Quaternion()).invert();
  const weaponWorldRotation = rootWorldRotation.multiply(
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...mount.rotation)),
  );
  const quaternion = handWorldRotation.multiply(weaponWorldRotation);
  const handScale = hand.getWorldScale(new THREE.Vector3());

  return {
    position,
    quaternion,
    scale: new THREE.Vector3(
      mount.scale / Math.max(0.01, Math.abs(handScale.x)),
      mount.scale / Math.max(0.01, Math.abs(handScale.y)),
      mount.scale / Math.max(0.01, Math.abs(handScale.z)),
    ),
  };
}

const WAR_ROOM_TRACER_POOL_SIZE = 24;
const WAR_ROOM_PROJECTILE_POOL_SIZE = 12;
const WAR_ROOM_MELEE_HALF_ANGLE_DEGREES = 65;
const WAR_ROOM_SHOCKWAVE_POOL_SIZE = 4;
const WAR_ROOM_SHOCKWAVE_LIFETIME = 0.34;
const WAR_ROOM_DECAL_COLORS = [
  new THREE.Color("#9b5042"),
  new THREE.Color("#bf7252"),
] as const;
const WAR_ROOM_COMMANDER_WARNING_GEOMETRY = new THREE.RingGeometry(
  0.54,
  1.12,
  24,
  1,
  -Math.PI / 3,
  (Math.PI * 2) / 3,
);
const WAR_ROOM_COMMANDER_WARNING_MATERIAL = new THREE.MeshBasicMaterial({
  color: "#ff3028",
  transparent: true,
  opacity: 0.62,
  depthWrite: false,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  toneMapped: false,
});

function installWarRoomHitRim(material: THREE.Material) {
  if (
    !(material instanceof THREE.MeshStandardMaterial)
    && !(material instanceof THREE.MeshPhysicalMaterial)
  ) return;
  const rimUniform = { value: 0 };
  const previousCompile = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previousCompile.call(material, shader, renderer);
    shader.uniforms.warRoomHitRim = rimUniform;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWarRoomViewNormal;")
      .replace(
        "#include <beginnormal_vertex>",
        "#include <beginnormal_vertex>\nvWarRoomViewNormal = normalize(normalMatrix * objectNormal);",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float warRoomHitRim;\nvarying vec3 vWarRoomViewNormal;",
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
         float warRoomFacing = abs(dot(normalize(vWarRoomViewNormal), normalize(vViewPosition)));
         float warRoomRim = pow(1.0 - warRoomFacing, 2.4);
         totalEmissiveRadiance += vec3(1.0, 0.11, 0.025) * warRoomRim * warRoomHitRim;`,
      );
  };
  material.customProgramCacheKey = () => "war-room-hit-rim-v1";
  material.userData.warRoomHitRim = rimUniform;
}

function getWarRoomFootstepSurface(
  x: number,
  z: number,
  blockers: readonly Pick<WarRoomRoom["blockers"][number], "x" | "z" | "width" | "depth">[] = WAR_ROOM_BLOCKERS,
): WarRoomSoundSurface {
  const nearStone = blockers.some((blocker) => {
    const edgeX = Math.max(0, Math.abs(x - blocker.x) - blocker.width / 2);
    const edgeZ = Math.max(0, Math.abs(z - blocker.z) - blocker.depth / 2);
    return Math.hypot(edgeX, edgeZ) <= 0.9;
  });
  return nearStone ? "stone" : "earth";
}

function getWarRoomAudioOptions(
  listener: { x: number; z: number; yaw: number },
  sourceX: number,
  sourceZ: number,
  surface?: WarRoomSoundSurface,
  heavy = false,
  weaponId?: WarRoomWeaponId,
): WarRoomSoundOptions {
  return {
    surface,
    heavy,
    weaponId,
    spatial: {
      source: { x: sourceX, z: sourceZ },
      listener: { x: listener.x, z: listener.z, yaw: listener.yaw },
    },
  };
}

function applyWarRoomBossImpact(
  attack: WarRoomBossAttack,
  enemy: WarRoomEnemy,
  missionTarget: { x: number; z: number },
  player: WarRoomRuntime["player"],
  mission: WarRoomRuntime["mission"],
  defenseMode: boolean,
  now: number,
  cameraKickRef: MutableRefObject<number>,
  cameraFovKickRef: MutableRefObject<number>,
  cameraSideKickRef: MutableRefObject<number>,
) {
  const damage = getWarRoomBossAttackDamage(enemy.damage, attack);
  if (defenseMode) {
    const distance = Math.hypot(enemy.x - missionTarget.x, enemy.z - missionTarget.z);
    const impactRadius = attack === "charge" ? 2.05 : WAR_ROOM_BOSS_SHOCKWAVE_RADIUS;
    if (distance > impactRadius) return;
    const defenseDamage = Math.min(mission.defenseHp, damage);
    if (defenseDamage <= 0) return;
    mission.defenseHp = Math.max(0, mission.defenseHp - defenseDamage);
    enemy.score += defenseDamage;
    player.lastHitText = `SAVUNMA −${defenseDamage} CAN`;
    player.hitMessageUntil = now + 1.2;
    playWarRoomSound(
      "hit",
      0.9,
      "shotgun",
      getWarRoomAudioOptions(player, enemy.x, enemy.z, "metal"),
    );
    return;
  }
  if (now < player.invulnerableUntil) return;
  const hit = applyWarRoomDamage(player, damage);
  if (hit.damage <= 0) return;
  enemy.score += hit.damage;
  playWarRoomSound(
    "hit",
    1,
    "shotgun",
    getWarRoomAudioOptions(player, enemy.x, enemy.z, "flesh"),
  );
  player.lastDamageAt = now;
  player.lastCombatAt = now;
  player.invulnerableUntil = now + 0.38;
  cameraKickRef.current = Math.max(cameraKickRef.current, 0.14);
  cameraFovKickRef.current = Math.min(cameraFovKickRef.current + 2.4, 5.2);
  cameraSideKickRef.current = Math.max(
    -0.045,
    Math.min(0.045, cameraSideKickRef.current + Math.sign(player.damageDirection || 1) * 0.024),
  );
  player.damageDirection = shortestAngleDelta(
    player.yaw,
    Math.atan2(enemy.x - player.x, -(enemy.z - player.z)),
  );
  player.lastHitText = `−${hit.damage} CAN · ${enemy.name}`;
  player.hitMessageUntil = now + 1.2;
  player.lastHitDamage = hit.damage;
  player.lastHitSource = "received";
  player.lastHitCritical = false;
  player.damageEventId += 1;
}

function createWarRoomMeleeDebugGeometry() {
  const segments = 28;
  const positions = new Float32Array(segments * 9);
  for (let index = 0; index < segments; index += 1) {
    const firstAngle = (-WAR_ROOM_MELEE_HALF_ANGLE_DEGREES
      + (WAR_ROOM_MELEE_HALF_ANGLE_DEGREES * 2 * index) / segments) * Math.PI / 180;
    const secondAngle = (-WAR_ROOM_MELEE_HALF_ANGLE_DEGREES
      + (WAR_ROOM_MELEE_HALF_ANGLE_DEGREES * 2 * (index + 1)) / segments) * Math.PI / 180;
    const offset = index * 9;
    positions.set([
      0, 0, 0,
      Math.sin(firstAngle), 0, -Math.cos(firstAngle),
      Math.sin(secondAngle), 0, -Math.cos(secondAngle),
    ], offset);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

const WAR_ROOM_MELEE_DEBUG_GEOMETRY = createWarRoomMeleeDebugGeometry();

function createWarRoomCrackGeometry() {
  const vertices: number[] = [];
  const indices: number[] = [];
  for (let ray = 0; ray < 8; ray += 1) {
    let previousX = 0;
    let previousY = 0;
    const baseAngle = (ray / 8) * Math.PI * 2;
    for (let segment = 0; segment < 4; segment += 1) {
      const angle = baseAngle + (segment % 2 === 0 ? 0.12 : -0.16);
      const radius = 0.11 + segment * 0.075;
      const nextX = Math.cos(angle) * radius;
      const nextY = Math.sin(angle) * radius;
      const dx = nextX - previousX;
      const dy = nextY - previousY;
      const length = Math.max(0.001, Math.hypot(dx, dy));
      const halfWidth = 0.009 - segment * 0.0015;
      const offsetX = (-dy / length) * halfWidth;
      const offsetY = (dx / length) * halfWidth;
      const first = vertices.length / 3;
      vertices.push(
        previousX - offsetX, previousY - offsetY, 0,
        previousX + offsetX, previousY + offsetY, 0,
        nextX + offsetX, nextY + offsetY, 0,
        nextX - offsetX, nextY - offsetY, 0,
      );
      indices.push(first, first + 1, first + 2, first, first + 2, first + 3);
      previousX = nextX;
      previousY = nextY;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const WAR_ROOM_CRACK_GEOMETRY = createWarRoomCrackGeometry();

type WarRoomParticle = {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  born: number; lifetime: number; size: number;
  bounce: boolean;
};

type WarRoomDecal = {
  kind: "bullet" | "crack" | null;
  x: number;
  z: number;
  yaw: number;
  scale: number;
  born: number;
};

type WarRoomSlashSample = {
  base: THREE.Vector3;
  tip: THREE.Vector3;
  born: number;
};

type WarRoomProjectile = {
  start: THREE.Vector3;
  end: THREE.Vector3;
  born: number;
  lifetime: number;
  color: string;
};

type CameraOccluderEntry = {
  id: string;
  object: THREE.Object3D;
  bounds: THREE.Box3;
};

type CameraMaterialSnapshot = {
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
};

function setWarRoomCameraOccluderFade(
  object: THREE.Object3D,
  progress: number,
  originals: WeakMap<THREE.Material, CameraMaterialSnapshot>,
) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      let original = originals.get(material);
      if (!original) {
        original = {
          opacity: material.opacity,
          transparent: material.transparent,
          depthWrite: material.depthWrite,
        };
        originals.set(material, original);
      }
      const nextTransparent = original.transparent || progress > 0;
  const nextOpacity = original.opacity * (1 - progress * 0.9);
      const changedTransparency = material.transparent !== nextTransparent
        || material.depthWrite !== (progress > 0 ? false : original.depthWrite);
      material.opacity = nextOpacity;
      material.transparent = nextTransparent;
      material.depthWrite = progress > 0 ? false : original.depthWrite;
      if (changedTransparency) material.needsUpdate = true;
    });
  });
}

function shortestLerp(from: number, to: number, speed: number, delta: number) {
  return from + shortestAngleDelta(from, to) * (1 - Math.exp(-speed * Math.min(delta, 0.05)));
}

function smoothProgress(value: number) {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
}

function WarRoomWeaponReloadMotion({
  weaponId,
  animationRef,
  magazineRef,
  boltRef,
  arrowRef,
}: {
  weaponId: WarRoomWeaponId;
  animationRef: MutableRefObject<WarRoomArmsAnimation>;
  magazineRef: MutableRefObject<THREE.Object3D | null>;
  boltRef: MutableRefObject<THREE.Object3D | null>;
  arrowRef: MutableRefObject<THREE.Object3D | null>;
}) {
  useFrame(() => {
    const animation = animationRef.current;
    const progress = animation.reloadProgress;
    const magazine = magazineRef.current;
    if (magazine) {
      let magazineY = -0.14;
      let visible = animation.loaded || progress > 0.04;
      if (progress >= 0.12 && progress < 0.34) {
        magazineY -= 0.24 * smoothProgress((progress - 0.12) / 0.22);
      } else if (progress >= 0.34 && progress < 0.58) {
        magazineY -= 0.24;
        visible = progress < 0.43;
      } else if (progress >= 0.58 && progress < 0.82) {
        magazineY -= 0.24 * (1 - smoothProgress((progress - 0.58) / 0.24));
      }
      magazine.position.y = magazineY;
      magazine.visible = visible;
    }

    const bolt = boltRef.current;
    if (bolt) {
      const pull = progress < 0.78
        ? 0
        : progress < 0.88
          ? smoothProgress((progress - 0.78) / 0.1)
          : progress < 0.97
            ? 1 - smoothProgress((progress - 0.88) / 0.09)
            : 0;
      bolt.position.z = -0.24 + pull * 0.14;
    }

    const arrow = arrowRef.current;
    if (!arrow) return;
    if (weaponId === "crossbow") {
      const insertion = smoothProgress((progress - 0.25) / 0.5);
      arrow.visible = animation.loaded || progress > 0.1;
      if (progress > 0 && progress < 1) {
        arrow.position.set(
          0.32 * (1 - insertion),
          -0.18 * (1 - insertion) + 0.12 * insertion,
          -0.18 - 0.22 * insertion,
        );
      } else {
        arrow.position.set(0, 0.12, -0.4);
      }
    } else if (weaponId === "longbow") {
      const draw = Math.max(0, Math.min(1, animation.chargeProgress));
      arrow.visible = animation.loaded || draw > 0.04;
      arrow.position.set(0, 0.02, -0.3 + draw * 0.18);
    }
  });
  return null;
}

function WeaponModel({
  weaponId,
  mount,
  muzzleAnchorRef,
  muzzleFlashRef,
  animationRef,
}: {
  weaponId: WarRoomWeaponId;
  mount: WarRoomWeaponMount;
  muzzleAnchorRef?: MutableRefObject<THREE.Group | null>;
  muzzleFlashRef?: MutableRefObject<THREE.Group | null>;
  animationRef?: MutableRefObject<WarRoomArmsAnimation>;
}) {
  const magazineRef = useRef<THREE.Object3D>(null);
  const boltRef = useRef<THREE.Object3D>(null);
  const arrowRef = useRef<THREE.Object3D>(null);
  const weapon = WAR_ROOM_WEAPON_BY_ID.get(weaponId)!;
  const gripPoints = getWarRoomViewModelGripPoints(weaponId);
  const crossbow = weaponId === "crossbow";
  const bow = weaponId === "longbow";
  const melee = weapon.weaponClass === "melee";
  const shovel = weaponId === "melee_shovel";
  const sidearm = weaponId === "sidearm" || weapon.weaponClass === "pistol";
  const shotgun = weaponId === "scattergun" || weapon.weaponClass === "shotgun";
  const muzzle = mount.muzzle ?? [0, 0.02, -(weapon.normalizeLength ?? weapon.modelSize?.[2] ?? 0.6) / 2] as const;
  const barrelLength = Math.max(0.08, Math.abs(muzzle[2] + 0.25));
  const bodyWidth = crossbow ? 0.72 : bow ? 0.15 : sidearm ? 0.25 : 0.3;
  const proceduralFallback = (
    <group>
      {melee && weaponId === "melee_staff" ? (
        <>
          <mesh position={[0, 0, -0.53]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.035, 0.045, 1.05, 8]} />
            <meshStandardMaterial color="#76553c" roughness={0.76} />
          </mesh>
          <mesh position={[0, 0.04, -1.02]} castShadow>
            <sphereGeometry args={[0.12, 8, 6]} />
            <meshStandardMaterial color={weapon.color} metalness={0.48} roughness={0.36} emissive={weapon.color} emissiveIntensity={0.14} />
          </mesh>
        </>
      ) : melee && weaponId === "melee_war_spear" ? (
        <>
          <mesh position={[0, 0, -0.72]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.025, 0.035, 1.42, 7]} />
            <meshStandardMaterial color="#75533b" roughness={0.78} />
          </mesh>
          <mesh position={[0, 0.02, -1.43]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <coneGeometry args={[0.075, 0.3, 6]} />
            <meshStandardMaterial color={weapon.color} metalness={0.68} roughness={0.34} />
          </mesh>
        </>
      ) : melee && weaponId === "melee_pickaxe" ? (
        <>
          <mesh position={[0, 0, -0.42]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.035, 0.045, 0.84, 7]} />
            <meshStandardMaterial color="#74583f" roughness={0.86} />
          </mesh>
          <mesh position={[0, 0.12, -0.82]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <boxGeometry args={[0.66, 0.11, 0.12]} />
            <meshStandardMaterial color={weapon.color} metalness={0.68} roughness={0.38} />
          </mesh>
        </>
      ) : melee && shovel ? (
        <>
          <mesh position={[0, 0.02, 0]} castShadow>
            <cylinderGeometry args={[0.035, 0.045, 0.78, 7]} />
            <meshStandardMaterial color="#74583f" roughness={0.86} />
          </mesh>
          <mesh position={[0, 0.37, -0.035]} rotation={[0.14, 0, 0]} castShadow>
            <boxGeometry args={[0.22, 0.31, 0.045]} />
            <meshStandardMaterial color="#9b8b76" metalness={0.58} roughness={0.48} />
          </mesh>
        </>
      ) : melee ? (
        <>
          <mesh position={[0, 0, -0.28]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.035, 0.045, 0.72, 7]} />
            <meshStandardMaterial color="#74583f" roughness={0.86} />
          </mesh>
          <mesh position={[0, 0.02, -0.58]} rotation={[0, 0, weaponId === "melee_axe" ? -0.22 : 0]} castShadow>
            <boxGeometry args={weaponId === "melee_knife" ? [0.055, 0.22, 0.045] : [0.24, 0.2, 0.06]} />
            <meshStandardMaterial color={weapon.color} metalness={0.5} roughness={0.42} />
          </mesh>
        </>
      ) : bow ? (
        <>
          <mesh position={[0, 0.02, -0.3]} rotation={[0.06, 0, 0]} castShadow>
            <torusGeometry args={[0.38, 0.045, 7, 16, Math.PI]} />
            <meshStandardMaterial color="#9a653b" roughness={0.75} />
          </mesh>
          <mesh position={[0, 0.02, -0.3]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.76, 5]} />
            <meshStandardMaterial color="#e7d2a6" roughness={0.45} />
          </mesh>
          <group ref={(node) => { arrowRef.current = node; }} position={[0, 0.02, -0.3]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} castShadow={false}>
              <cylinderGeometry args={[0.009, 0.012, 0.48, 5]} />
              <meshStandardMaterial color="#d7bd8e" roughness={0.82} />
            </mesh>
            <mesh position={[0, 0.25, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow={false}>
              <coneGeometry args={[0.025, 0.1, 5]} />
              <meshStandardMaterial color="#a9a396" metalness={0.5} roughness={0.55} />
            </mesh>
          </group>
        </>
      ) : (
        <>
          <mesh position={[0, 0, -0.23]} castShadow>
            <boxGeometry args={[bodyWidth, 0.18, sidearm ? 0.36 : 0.6]} />
            <meshStandardMaterial color={crossbow ? "#8b6844" : "#806449"} roughness={0.62} metalness={0.24} />
          </mesh>
          <mesh position={[0, 0.098, -0.24]} castShadow>
            <boxGeometry args={[Math.max(0.1, bodyWidth * 0.66), 0.025, sidearm ? 0.2 : 0.42]} />
            <meshStandardMaterial color={weapon.color} roughness={0.4} metalness={0.44} />
          </mesh>
          {!crossbow && (
            <group ref={(node) => { magazineRef.current = node; }} position={[0, -0.14, -0.04]} rotation={[0.22, 0, 0]}>
              <mesh castShadow={false}>
                <boxGeometry args={sidearm ? [0.1, 0.21, 0.12] : [0.12, 0.36, 0.17]} />
                <meshStandardMaterial color="#4b3529" roughness={0.84} />
              </mesh>
              <mesh position={[0, -0.02, 0.012]} castShadow={false}>
                <boxGeometry args={[sidearm ? 0.073 : 0.09, 0.035, 0.014]} />
                <meshStandardMaterial color="#b18a5e" roughness={0.76} />
              </mesh>
            </group>
          )}
          {!crossbow && (
            <group ref={(node) => { boltRef.current = node; }} position={[sidearm ? 0.11 : 0.16, 0.11, -0.24]}>
              <mesh castShadow={false}>
                <boxGeometry args={sidearm ? [0.055, 0.035, 0.16] : [0.075, 0.045, 0.2]} />
                <meshStandardMaterial color="#55534c" metalness={0.58} roughness={0.44} />
              </mesh>
              <mesh position={[0, -0.025, -0.015]} castShadow={false}>
                <boxGeometry args={[0.06, 0.035, 0.07]} />
                <meshStandardMaterial color="#77736a" metalness={0.5} roughness={0.5} />
              </mesh>
            </group>
          )}
          {crossbow && (
            <>
              <mesh position={[0, 0.05, -0.13]} castShadow={false}>
                <boxGeometry args={[0.9, 0.045, 0.085]} />
                <meshStandardMaterial color="#a88558" roughness={0.68} />
              </mesh>
              <group ref={(node) => { arrowRef.current = node; }} position={[0, 0.12, -0.4]}>
                <mesh rotation={[-Math.PI / 2, 0, 0]} castShadow={false}>
                  <cylinderGeometry args={[0.009, 0.012, 0.42, 5]} />
                  <meshStandardMaterial color="#d7bd8e" roughness={0.82} />
                </mesh>
                <mesh position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow={false}>
                  <coneGeometry args={[0.026, 0.1, 5]} />
                  <meshStandardMaterial color="#a9a396" metalness={0.5} roughness={0.55} />
                </mesh>
              </group>
            </>
          )}
          {shotgun && (
            <mesh position={[0, -0.08, -0.48]} castShadow>
              <boxGeometry args={[0.2, 0.12, 0.42]} />
              <meshStandardMaterial color="#8f6540" roughness={0.8} />
            </mesh>
          )}
          <mesh position={[0, 0.03, (-0.25 + muzzle[2]) / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[sidearm ? 0.035 : 0.055, sidearm ? 0.045 : 0.075, barrelLength, 8]} />
            <meshStandardMaterial color="#64645c" metalness={0.68} roughness={0.34} />
          </mesh>
        </>
      )}
    </group>
  );
  const meleeFallback = melee
    ? (
      <group scale={weapon.normalizeLength ? weapon.normalizeLength / 0.72 : 0.75}>
        {proceduralFallback}
      </group>
    )
    : proceduralFallback;
  return (
    <group name={`war-room-weapon:${weapon.id}`} position={[0, 0, 0]}>
      {animationRef && (
        <>
          <group name={`war-room-gripR:${weaponId}`} position={gripPoints.gripR} visible={false} />
          <group name={`war-room-gripL:${weaponId}`} position={gripPoints.gripL} visible={false} />
        </>
      )}
      {weapon.modelFile ? (
        <WarRoomAssetBoundary fallback={meleeFallback}>
          <Suspense fallback={meleeFallback}>
            <WarRoomStaticModel
              src={`/models/weapons/${weapon.modelFile}`}
              position={[0, 0, 0]}
              targetSize={weapon.modelSize ?? [1, 1, 1]}
              uniformFitLength={weapon.normalizeLength}
              gripRatio={mount.gripRatio}
              minimumVisualThickness={weapon.minimumVisualThickness}
              muzzleEnd={mount.muzzleEnd}
              muzzleOffsetZ={mount.muzzleOffsetZ}
              fallbackColor={weapon.color}
              emissiveBoost={WAR_ROOM_WEAPON_PRESENTATION_ENABLED ? 0.12 : 0}
              muzzleAnchorRef={muzzleAnchorRef}
              magazineRef={magazineRef}
              boltRef={boltRef}
              arrowRef={arrowRef}
            />
          </Suspense>
        </WarRoomAssetBoundary>
      ) : meleeFallback}
      {animationRef && (
        <WarRoomWeaponReloadMotion
          weaponId={weaponId}
          animationRef={animationRef}
          magazineRef={magazineRef}
          boltRef={boltRef}
          arrowRef={arrowRef}
        />
      )}
      <group ref={muzzleAnchorRef} name="war-room-muzzle-anchor" position={muzzle}>
        <group ref={muzzleFlashRef} name="war-room-muzzle-flash" visible={false}>
          <mesh>
            <planeGeometry args={[0.34, 0.34]} />
            <meshBasicMaterial color="#ff8b32" transparent opacity={0.92} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
          <mesh scale={[0.52, 0.52, 1]} rotation={[0, 0, Math.PI / 4]}>
            <planeGeometry args={[0.34, 0.34]} />
            <meshBasicMaterial color="#fff0a3" transparent opacity={0.96} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function FirstPersonWeaponViewModel({
  runtimeRef,
  inputRef,
  cameraBounds,
  weaponId,
  weaponMountOverrides,
  cameraMode,
  motionReduced,
  weaponSway,
  armsVisible,
  sourceCamera,
}: {
  runtimeRef: MutableRefObject<WarRoomRuntime>;
  inputRef: MutableRefObject<WarRoomInputState>;
  cameraBounds: readonly WarRoomCameraBounds[];
  weaponId: WarRoomWeaponId;
  weaponMountOverrides?: Partial<Record<WarRoomWeaponId, WarRoomWeaponMount>>;
  cameraMode: WarRoomCameraMode;
  motionReduced: boolean;
  weaponSway: WarRoomWeaponSwayLevel;
  armsVisible: boolean;
  sourceCamera: THREE.Camera;
}) {
  const { size } = useThree();
  const weaponRootRef = useRef<THREE.Group>(null);
  const armsRootRef = useRef<THREE.Group>(null);
  const weaponPoseRef = useRef<THREE.Group>(null);
  const armsAnimationRef = useRef<WarRoomArmsAnimation>({
    weaponId,
    aiming: false,
    reloadProgress: 0,
    chargeProgress: 0,
    recoil: 0,
    loaded: true,
  });
  const cameraPositionRef = useRef(new THREE.Vector3());
  const cameraQuaternionRef = useRef(new THREE.Quaternion());
  const cameraForwardRef = useRef(new THREE.Vector3());
  const localQuaternionRef = useRef(new THREE.Quaternion());
  const localEulerRef = useRef(new THREE.Euler());
  const wallProbeRef = useRef({ x: 0, y: 0, z: 0 });
  const preparedMeshesRef = useRef(new WeakSet<THREE.Mesh>());
  const viewModelMovementRef = useRef<WarRoomViewModelMovementState>({
    value: 0,
    velocity: 0,
    active: false,
  });
  const frameTimingRef = useRef<WarRoomViewModelFrameTimingState>(
    createWarRoomViewModelFrameTimingState(),
  );
  const poseSpringRef = useRef<WarRoomViewModelPoseSpringState>(
    createWarRoomViewModelPoseSpringState(),
  );
  const runAmountRef = useRef(0);
  const legMovementRef = useRef(0);
  const walkPhaseRef = useRef(0);
  const wallProximityRef = useRef(0);
  const wallSafetyRetractionRef = useRef(0);
  const lastWeaponIdRef = useRef(weaponId);
  const switchProgressRef = useRef(1);
  const preparedWeaponMeshesRef = useRef(new WeakSet<THREE.Mesh>());
  const weaponMaterialClonesRef = useRef(new Set<THREE.Material>());
  const weaponMaterialDefaultsRef = useRef(new WeakMap<THREE.Material, {
    opacity: number;
    transparent: boolean;
    depthWrite: boolean;
  }>());
  const weapon = WAR_ROOM_WEAPON_BY_ID.get(weaponId)!;
  const mount = weaponMountOverrides?.[weaponId] ?? WAR_ROOM_WEAPON_MOUNTS[weaponId];
  const viewConfig = getWarRoomViewModelConfig(weaponId, weapon.weaponClass === "melee");

  useEffect(() => () => {
    for (const material of weaponMaterialClonesRef.current) material.dispose();
    weaponMaterialClonesRef.current.clear();
  }, [weaponId]);

  useFrame((_, rawDelta) => {
    const group = weaponRootRef.current;
    const arms = armsRootRef.current;
    const weaponPose = weaponPoseRef.current;
    if (inputRef.current.paused) return;
    if (!group || !arms || !weaponPose) return;
    sourceCamera.updateWorldMatrix(true, false);
    sourceCamera.getWorldPosition(cameraPositionRef.current);
    sourceCamera.getWorldQuaternion(cameraQuaternionRef.current);
    const player = runtimeRef.current.player;
    const input = inputRef.current;
    const frameTiming = stepWarRoomViewModelFrameTiming(frameTimingRef.current, rawDelta);
    frameTimingRef.current = frameTiming;
    const delta = frameTiming.delta;
    const keyX = (input.keys.has("d") ? 1 : 0) - (input.keys.has("a") ? 1 : 0);
    const keyY = (input.keys.has("w") ? 1 : 0) - (input.keys.has("s") ? 1 : 0);
    const movementIntent = getWarRoomViewModelMovementIntent(input.moveX, input.moveY, keyX, keyY);
    const isAirborne = player.jumpHeight > 0.02;
    runAmountRef.current = stepWarRoomViewModelRunAmount(
      runAmountRef.current,
      player.sprinting,
      !isAirborne,
      delta,
    );
    viewModelMovementRef.current = stepWarRoomViewModelMovement(
      viewModelMovementRef.current,
      movementIntent,
      !isAirborne,
      delta,
    );
    const viewModelMovement = viewModelMovementRef.current.value;
    legMovementRef.current = viewModelMovement;
    if (viewModelMovement > 0.02) {
      walkPhaseRef.current = (walkPhaseRef.current + delta * (7.2 + viewModelMovement * 2.8))
        % (Math.PI * 2);
    }
    const clock = player.clockTime;
    const shotAge = Math.max(0, 0.2 - (player.shotFeedbackUntil - clock));
    const recoilEnvelope = shotAge <= 0.06
      ? Math.min(1, shotAge / 0.06)
      : Math.max(0, 1 - Math.pow((shotAge - 0.06) / 0.12, 2));
    const recoil = player.shotFeedbackUntil > clock
      ? Math.min(1, player.recoil / Math.max(0.02, weapon.recoil)) * recoilEnvelope
      : 0;
    const reloadProgress = player.reloadingWeapon === weaponId
      ? Math.max(0, Math.min(1, 1 - (player.reloadUntil - clock) / weapon.reloadSeconds))
      : 0;
    const chargeProgress = weapon.charge && player.chargeStartedAt > 0
      ? Math.max(0, Math.min(1, (clock - player.chargeStartedAt) / 0.95))
      : 0;
    const meleeProgress = weapon.weaponClass === "melee" && player.meleeUntil > clock
      ? Math.max(0, Math.min(1, (clock - player.meleeStartedAt) / Math.max(0.01, player.meleeDuration)))
      : null;
    if (lastWeaponIdRef.current !== weaponId) {
      lastWeaponIdRef.current = weaponId;
      switchProgressRef.current = 0;
    } else {
      switchProgressRef.current = Math.min(1, switchProgressRef.current + delta / 0.38);
    }
    armsAnimationRef.current.weaponId = weaponId;
    armsAnimationRef.current.aiming = input.aimHeld;
    armsAnimationRef.current.reloadProgress = reloadProgress;
    armsAnimationRef.current.chargeProgress = chargeProgress;
    armsAnimationRef.current.recoil = recoil;
    armsAnimationRef.current.loaded = weapon.weaponClass === "melee"
      || (player.ammo[weaponId]?.magazine ?? 1) > 0
    const aspect = size.height > 0 ? size.width / size.height : 1.75;
    const horizontalFactor = getWarRoomViewModelHorizontalFactor(aspect);
    sourceCamera.getWorldDirection(cameraForwardRef.current);
    const targetWallProximity = getWarRoomViewModelWallProximity(
      cameraPositionRef.current,
      cameraForwardRef.current,
      cameraBounds,
    );
    wallProximityRef.current = stepWarRoomViewModelWallProximity(
      wallProximityRef.current,
      targetWallProximity,
      delta,
    );
    const wallProximity = wallProximityRef.current;
    const viewModelScale = getWarRoomViewModelScaleFactor(aspect);
    const pose = getWarRoomViewModelPose({
      time: clock,
      movement: viewModelMovement,
      runAmount: runAmountRef.current,
      walkPhase: walkPhaseRef.current,
      swayScale: getWarRoomViewModelSwayScale(weaponSway) * frameTiming.swayScale,
      wallProximity,
      wallTuckEnabled: movementIntent <= 0.05 && !isAirborne,
      aiming: input.aimHeld,
      recoil,
      reloadProgress,
      chargeProgress,
      meleeProgress,
      meleeStyle: weapon.meleeStyle ?? "slash",
      comboIndex: player.meleeAttackComboIndex,
      motionReduced,
      switchProgress: switchProgressRef.current,
    }, aspect);
    const weaponLength = weapon.normalizeLength
      ?? Math.max(...(weapon.modelSize ?? [0.8, 0.8, 0.8]));
    const weaponForwardReach = (
      Math.max(0, -(viewConfig.position[2] + pose.position[2]))
      + weaponLength * viewConfig.scale * 0.5
    ) * viewModelScale;
    const targetWallRetraction = getWarRoomViewModelWallSafetyRetraction(
      wallProximity,
      weaponForwardReach,
    );
    wallSafetyRetractionRef.current = stepWarRoomViewModelWallProximity(
      wallSafetyRetractionRef.current,
      targetWallRetraction,
      delta,
      4,
    );
    const wallSafetyRetraction = wallSafetyRetractionRef.current / viewModelScale;
    group.visible = cameraMode === "first-person";
    group.scale.setScalar(viewModelScale);
    group.position.copy(cameraPositionRef.current);
    group.quaternion.copy(cameraQuaternionRef.current);

    const targetPose: WarRoomViewModelPose = {
      position: [
        viewConfig.position[0] * horizontalFactor + pose.position[0],
        viewConfig.position[1] + pose.position[1],
        viewConfig.position[2] + pose.position[2] + wallSafetyRetraction,
      ],
      rotation: [
        mount.rotation[0] + viewConfig.rotation[0] + pose.rotation[0],
        mount.rotation[1] + viewConfig.rotation[1] + pose.rotation[1],
        mount.rotation[2] + viewConfig.rotation[2] + pose.rotation[2],
      ],
    };
    const poseSpring = stepWarRoomViewModelPoseSpring(
      poseSpringRef.current,
      targetPose,
      rawDelta,
    );
    poseSpringRef.current = poseSpring.state;
    arms.position.set(...poseSpring.pose.position);
    arms.rotation.set(...poseSpring.pose.rotation);
    weaponPose.position.set(...poseSpring.pose.position);
    localEulerRef.current.set(...poseSpring.pose.rotation);
    localQuaternionRef.current.setFromEuler(localEulerRef.current);
    weaponPose.quaternion.copy(localQuaternionRef.current);
    weaponPose.scale.setScalar(viewConfig.scale * getWarRoomViewModelAimScaleFactor(input.aimHeld));
    const weaponOpacity = getWarRoomViewModelOpacity(input.aimHeld);
    weaponPose.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      if (!preparedWeaponMeshesRef.current.has(object)) {
        preparedWeaponMeshesRef.current.add(object);
        const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
        const viewModelMaterials = sourceMaterials.map((source) => {
          const material = source.clone();
          weaponMaterialClonesRef.current.add(material);
          weaponMaterialDefaultsRef.current.set(material, {
            opacity: source.opacity,
            transparent: source.transparent,
            depthWrite: source.depthWrite,
          });
          return material;
        });
        object.material = Array.isArray(object.material) ? viewModelMaterials : viewModelMaterials[0];
      }
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        const defaults = weaponMaterialDefaultsRef.current.get(material);
        if (!defaults) continue;
        material.opacity = defaults.opacity * weaponOpacity;
        const transparent = defaults.transparent || weaponOpacity < 1;
        const depthWrite = weaponOpacity < 1 ? false : defaults.depthWrite;
        if (material.transparent !== transparent || material.depthWrite !== depthWrite) {
          material.transparent = transparent;
          material.depthWrite = depthWrite;
          material.needsUpdate = true;
        }
      }
    });
    group.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || preparedMeshesRef.current.has(object)) return;
      preparedMeshesRef.current.add(object);
      object.frustumCulled = false;
    });
  });

  return (
    <group
      ref={weaponRootRef}
      name="war-room-first-person-weapon"
      visible={cameraMode === "first-person"}
      scale={getWarRoomViewModelScaleFactor(size.height > 0 ? size.width / size.height : 1.75)}
    >
      <group ref={armsRootRef} name="war-room-first-person-arms-mount">
        <WarRoomFirstPersonArms
          animationRef={armsAnimationRef}
          weaponScale={viewConfig.scale}
          visible={armsVisible}
        />
      </group>
      <WarRoomFirstPersonLegs
        runtimeRef={runtimeRef}
        parentRef={weaponRootRef}
        cameraPositionRef={cameraPositionRef}
        cameraQuaternionRef={cameraQuaternionRef}
        cameraForwardRef={cameraForwardRef}
        movementRef={legMovementRef}
        walkPhaseRef={walkPhaseRef}
        active={cameraMode === "first-person"}
      />
      <group ref={weaponPoseRef} name="war-room-first-person-weapon-bob">
        <WeaponModel weaponId={weaponId} mount={mount} animationRef={armsAnimationRef} />
      </group>
    </group>
  );
}

function MeleeDebugCone({
  runtimeRef,
  inputRef,
  weaponId,
  enabled,
}: {
  runtimeRef: MutableRefObject<WarRoomRuntime>;
  inputRef: MutableRefObject<WarRoomInputState>;
  weaponId: WarRoomWeaponId;
  enabled: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const weapon = WAR_ROOM_WEAPON_BY_ID.get(weaponId)!;
  useFrame(() => {
    if (inputRef.current.paused) return;
    const group = groupRef.current;
    if (!group) return;
    const player = runtimeRef.current.player;
    const attackActive = player.meleeUntil > player.clockTime;
    group.position.set(player.x, player.floorHeight + player.jumpHeight + 0.025, player.z);
    group.rotation.y = attackActive ? player.meleeAttackYaw : player.yaw;
    group.scale.setScalar(weapon.range);
    group.visible = enabled && weapon.weaponClass === "melee";
  });
  return (
    <group ref={groupRef} name="war-room-melee-debug-cone">
      <mesh
        geometry={WAR_ROOM_MELEE_DEBUG_GEOMETRY}
        renderOrder={1}
        frustumCulled={false}
      >
        <meshBasicMaterial
          color="#f0bd70"
          transparent
          opacity={0.19}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function ProceduralPlayerFallback() {
  return (
    <group>
      <mesh position={[0, 0.2, 0]} castShadow>
        <capsuleGeometry args={[0.28, 0.9, 3, 7]} />
        <meshStandardMaterial color="#47575a" metalness={0.42} roughness={0.55} />
      </mesh>
      <mesh position={[0, 1.46, 0]} castShadow>
        <sphereGeometry args={[0.25, 10, 8]} />
        <meshStandardMaterial color="#85715e" roughness={0.88} />
      </mesh>
      <mesh position={[0, 1.06, 0.2]} castShadow>
        <boxGeometry args={[0.38, 0.66, 0.08]} />
        <meshStandardMaterial color="#963c35" roughness={0.85} />
      </mesh>
    </group>
  );
}

function PlayerActor({
  runtimeRef,
  inputRef,
  movementBasisYawRef,
  renderPositionRef,
  weaponId,
  weaponMountOverrides,
  rootRef,
  muzzleRef,
  flashRef,
}: {
  runtimeRef: MutableRefObject<WarRoomRuntime>;
  inputRef: MutableRefObject<WarRoomInputState>;
  movementBasisYawRef: MutableRefObject<number | null>;
  renderPositionRef: MutableRefObject<{ x: number; z: number }>;
  weaponId: WarRoomWeaponId;
  weaponMountOverrides?: Partial<Record<WarRoomWeaponId, WarRoomWeaponMount>>;
  rootRef: MutableRefObject<THREE.Group | null>;
  muzzleRef: MutableRefObject<THREE.Group | null>;
  flashRef: MutableRefObject<THREE.Group | null>;
}) {
  const recoilRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const handMountPoseRef = useRef<{
    hand: THREE.Object3D;
    mount: WarRoomWeaponMount;
    weaponId: WarRoomWeaponId;
    pose: WarRoomHandMountPose;
  } | null>(null);
  const reloadMagazineRef = useRef<THREE.Mesh>(null);
  const previousShotFeedbackRef = useRef(0);
  const shotgunPumpStartedAtRef = useRef(-1);
  const handScaleScratch = useMemo(() => new THREE.Vector3(), []);
  const gripWorldScratch = useMemo(() => new THREE.Vector3(), []);
  const gripLocalScratch = useMemo(() => new THREE.Vector3(), []);
  const mount = weaponMountOverrides?.[weaponId] ?? WAR_ROOM_WEAPON_MOUNTS[weaponId];
  const weapon = WAR_ROOM_WEAPON_BY_ID.get(weaponId)!;
  const isMeleeWeapon = weapon.weaponClass === "melee";
  const applyMeleePoseAfterAnimation = (model: THREE.Group) => {
    const player = runtimeRef.current.player;
    const active = player.meleeUntil > player.clockTime;
    const stored = model.userData.warRoomMeleePose as {
      startedAt: number;
      heavy: boolean;
      comboIndex: number;
      bones: Array<{ bone: THREE.Object3D; base: [number, number, number] }>;
    } | undefined;
    if (!active) {
      stored?.bones.forEach(({ bone, base }) => bone.rotation.set(...base));
      delete model.userData.warRoomMeleePose;
      return;
    }

    let pose = stored;
    if (!pose || pose.startedAt !== player.meleeStartedAt) {
      const findBone = (names: string[]) => names
        .map((name) => model.getObjectByName(name))
        .find((bone): bone is THREE.Object3D => Boolean(bone));
      const candidates = [
        findBone(["mixamorigRightShoulder", "RightShoulder", "Rig_RightShoulder", "Shoulder.R"]),
        findBone(["mixamorigRightArm", "RightArm", "Rig_RightArm", "RightUpperArm", "UpperArm.R", "Arm.R"]),
        findBone(["mixamorigRightForeArm", "RightForeArm", "Rig_RightForeArm", "RightLowerArm", "LowerArm.R", "ForeArm.R"]),
        findBone(["mixamorigSpine", "Spine", "Rig_Spine", "spine", "Torso"]),
      ].filter((bone): bone is THREE.Object3D => Boolean(bone));
      pose = {
        startedAt: player.meleeStartedAt,
        heavy: player.meleeAttackHeavy,
        comboIndex: player.meleeAttackComboIndex,
        bones: candidates.map((bone) => ({
          bone,
          base: [bone.rotation.x, bone.rotation.y, bone.rotation.z],
        })),
      };
      model.userData.warRoomMeleePose = pose;
    }

    const weapon = WAR_ROOM_WEAPON_BY_ID.get(player.meleeAttackWeaponId ?? weaponId);
    const progress = Math.max(
      0,
      Math.min(1, (player.clockTime - player.meleeStartedAt) / Math.max(0.01, player.meleeDuration)),
    );
    const prepareEnd = player.meleeAttackHeavy ? 0.4 : 0.28;
    const strikeEnd = 0.72;
    const prepare = Math.max(0, Math.min(1, progress / prepareEnd));
    const strikePhase = Math.max(0, Math.min(1, (progress - prepareEnd) / (strikeEnd - prepareEnd)));
    const strike = Math.sin(Math.PI * strikePhase);
    const swingDirection = [-1, 1, 0][pose.comboIndex] ?? 0;
    pose.bones.forEach(({ bone, base }) => {
      const isShoulder = /shoulder/i.test(bone.name);
      const isUpperArm = /arm/i.test(bone.name) && !/fore|lower/i.test(bone.name);
      const isForearm = /fore|lower/i.test(bone.name);
      const isTorso = /spine|torso/i.test(bone.name);
      if (weapon?.meleeStyle === "thrust") {
        bone.rotation.set(
          base[0] + (isForearm ? -prepare * 0.32 + strike * 0.45 : 0),
          base[1] + (isTorso ? strike * 0.08 : 0),
          base[2] + ((isShoulder || isUpperArm) ? -prepare * (pose.heavy ? 0.42 : 0.28) + strike * (0.62 + swingDirection * 0.08) : 0),
        );
      } else {
        bone.rotation.set(
          base[0] + (isForearm ? prepare * 0.22 - strike * 0.5 : 0),
          base[1] + (isTorso ? strike * 0.08 : 0),
          base[2] + ((isShoulder || isUpperArm) ? -prepare * (pose.heavy ? 0.66 : 0.45) + strike * (0.72 + swingDirection * 0.18) : 0),
        );
      }
    });
  };
  useFrame((_, delta) => {
    if (inputRef.current.paused) return;
    const player = runtimeRef.current.player;
    const root = rootRef.current;
    if (root) {
      const bodyYaw = player.meleeUntil > player.clockTime ? player.meleeAttackYaw : player.facingYaw;
      const attackProgress = player.meleeUntil > player.clockTime
        ? Math.max(0, Math.min(1, (player.clockTime - player.meleeStartedAt) / Math.max(0.01, player.meleeDuration)))
        : 0;
      const heavyStep = WAR_ROOM_WEAPON_PRESENTATION_ENABLED
        && player.meleeAttackHeavy
        && player.meleeUntil > player.clockTime
        ? Math.sin(Math.PI * attackProgress) * 0.16
        : 0;
      root.position.set(
        renderPositionRef.current.x + Math.sin(bodyYaw) * heavyStep,
        player.floorHeight + player.jumpHeight - (player.prone ? 0.34 : 0),
        renderPositionRef.current.z - Math.cos(bodyYaw) * heavyStep,
      );
      root.rotation.y = shortestLerp(root.rotation.y, getWarRoomPlayerRootYaw(bodyYaw), 10, delta);
      root.scale.y = player.prone ? 0.5 : player.crouched ? 0.78 : 1;
    }
    const hand = modelRef.current && [
      "Rig_RightHand", "mixamorigRightHand", "FistR", "Fist.R", "RightHand", "RightHandBone",
    ].map((name) => modelRef.current?.getObjectByName(name)).find(Boolean);
    const leftHand = modelRef.current && [
      "Rig_LeftHand", "mixamorigLeftHand", "FistL", "Fist.L", "LeftHand", "LeftHandBone",
    ].map((name) => modelRef.current?.getObjectByName(name)).find(Boolean);
    const rightUpperArm = modelRef.current && [
      "mixamorigRightArm", "RightArm", "Rig_RightArm", "RightUpperArm", "UpperArm.R", "Arm.R",
    ].map((name) => modelRef.current?.getObjectByName(name)).find(Boolean);
    const rightForeArm = modelRef.current && [
      "mixamorigRightForeArm", "RightForeArm", "Rig_RightForeArm", "RightLowerArm", "LowerArm.R", "ForeArm.R",
    ].map((name) => modelRef.current?.getObjectByName(name)).find(Boolean);
    const rightArm = rightForeArm ?? rightUpperArm;
    const torso = modelRef.current && [
      "mixamorigSpine", "Spine", "Rig_Spine", "spine", "Torso",
    ].map((name) => modelRef.current?.getObjectByName(name)).find(Boolean);
    modelRef.current?.updateMatrixWorld(true);
    const mountParent = hand ?? root;
    const weaponMount = recoilRef.current;
    if (mountParent && weaponMount && weaponMount.parent !== mountParent) {
      weaponMount.parent?.remove(weaponMount);
      mountParent.add(weaponMount);
    }
    if (weaponMount) {
      const aiming = inputRef.current.aimHeld;
      const weapon = WAR_ROOM_WEAPON_BY_ID.get(weaponId)!;
      const melee = weapon.weaponClass === "melee";
      weaponMount.visible = true;
      if (player.shotFeedbackUntil > previousShotFeedbackRef.current && weapon.weaponClass === "shotgun") {
        shotgunPumpStartedAtRef.current = player.clockTime;
      }
      previousShotFeedbackRef.current = player.shotFeedbackUntil;
      const shotAge = Math.max(0, 0.2 - (player.shotFeedbackUntil - player.clockTime));
      const recoilEnvelope = shotAge <= 0.06
        ? Math.min(1, shotAge / 0.06)
        : Math.max(0, 1 - Math.pow((shotAge - 0.06) / 0.12, 2));
      const recoilStrength = player.shotFeedbackUntil > player.clockTime
        ? Math.min(1, player.recoil / Math.max(0.02, weapon.recoil)) * recoilEnvelope
        : 0;
      const meleeProgress = weapon.weaponClass === "melee" && player.meleeUntil > player.clockTime
        ? Math.max(0, Math.min(1, (player.clockTime - player.meleeStartedAt) / Math.max(0.01, player.meleeDuration)))
        : 0;
      const prepareEnd = player.meleeAttackHeavy ? 0.4 : 0.28;
      const strikeEnd = 0.72;
      const meleePrepare = Math.max(0, Math.min(1, meleeProgress / prepareEnd));
      const meleeStrikePhase = Math.max(0, Math.min(1, (meleeProgress - prepareEnd) / (strikeEnd - prepareEnd)));
      const meleeStrike = Math.sin(Math.PI * meleeStrikePhase);
      const meleeRecover = Math.max(0, Math.min(1, (meleeProgress - strikeEnd) / (1 - strikeEnd)));
      const meleeLift = meleeProgress < prepareEnd
        ? meleePrepare
        : Math.max(0, 1 - meleeRecover);
      const swingDirection = [-1, 1, 0][player.meleeAttackComboIndex] ?? 0;
      const heavyScale = player.meleeAttackHeavy ? 1.22 : 1;
      const pumpElapsed = player.clockTime - shotgunPumpStartedAtRef.current;
      const pumpProgress = pumpElapsed >= 0 && pumpElapsed < 0.4
        ? pumpElapsed < 0.14
          ? pumpElapsed / 0.14
          : 1 - (pumpElapsed - 0.14) / 0.26
        : 0;
      const pumpStrength = 0.5 - Math.cos(Math.PI * Math.max(0, Math.min(1, pumpProgress))) * 0.5;
      const reloadProgress = player.reloadingWeapon === weaponId
        ? Math.max(0, Math.min(1, 1 - (player.reloadUntil - player.clockTime) / weapon.reloadSeconds))
        : 0;
      const reloadElapsed = player.reloadingWeapon === weaponId
        ? Math.max(0, weapon.reloadSeconds * reloadProgress)
        : 0;
      const reloadDrop = Math.sin(Math.PI * reloadProgress);
      const chargeProgress = weapon.charge && player.chargeStartedAt > 0
        ? Math.max(0, Math.min(1, (player.clockTime - player.chargeStartedAt) / 0.95))
        : 0;
      if (hand && root) {
        let cachedPose = handMountPoseRef.current;
        if (
          !cachedPose
          || cachedPose.hand !== hand
          || cachedPose.mount !== mount
          || cachedPose.weaponId !== weaponId
        ) {
          cachedPose = {
            hand,
            mount,
            weaponId,
            pose: getWarRoomHandMountPose(root, hand, mount),
          };
          handMountPoseRef.current = cachedPose;
        }
        weaponMount.position.copy(cachedPose.pose.position);
        weaponMount.quaternion.copy(cachedPose.pose.quaternion);
        weaponMount.scale.copy(cachedPose.pose.scale);
        const handScale = hand.getWorldScale(handScaleScratch);
        const readabilityScale = melee ? 1.2 : 1.12;
        weaponMount.scale.multiplyScalar(readabilityScale);
        weaponMount.position.x += 0.035 / Math.max(0.01, Math.abs(handScale.x));
        weaponMount.position.y += (aiming ? 0.055 : 0) / Math.max(0.01, Math.abs(handScale.y));
        weaponMount.position.z -= (aiming ? 0.045 : 0) / Math.max(0.01, Math.abs(handScale.z));
      } else {
        if (melee) {
          weaponMount.position.set(0.34, 1.1, -0.26);
          weaponMount.scale.setScalar(mount.scale);
        } else {
          weaponMount.position.set(0.7, 1.24 + (aiming ? 0.055 : 0), -0.36 - (aiming ? 0.045 : 0));
          weaponMount.scale.setScalar(1.32);
        }
        weaponMount.rotation.set(...mount.rotation);
      }
      weaponMount.position.y -= reloadDrop * 0.14 + chargeProgress * 0.035;
      weaponMount.position.z += recoilStrength * 0.08 + pumpStrength * 0.14 + chargeProgress * 0.1;
      weaponMount.rotation.x -= recoilStrength * 0.052 + pumpStrength * 0.06 + reloadDrop * 0.48 + chargeProgress * 0.16;
      weaponMount.rotation.z += recoilStrength * 0.018;
      if (melee) {
        const idleBreath = WAR_ROOM_WEAPON_PRESENTATION_ENABLED && player.meleeUntil <= player.clockTime
          ? Math.sin(player.clockTime * 1.8) * 0.012
          : 0;
        weaponMount.position.y += idleBreath;
        weaponMount.position.x += idleBreath * 0.35;
        weaponMount.rotation.z += idleBreath * 0.9;
        if (weapon.meleeStyle === "thrust") {
          weaponMount.rotation.x += -meleePrepare * 0.22 + meleeStrike * (0.34 * heavyScale);
        } else {
          weaponMount.rotation.x += -meleeLift * (player.meleeAttackHeavy ? 0.42 : 0.28) + meleeStrike * (0.48 * heavyScale);
          weaponMount.rotation.z += meleeLift * 0.18
            - meleeStrike * ((weaponId === "melee_axe" || weaponId === "melee_shovel" || weaponId === "melee_pickaxe" ? 1.08 : 0.82) + swingDirection * 0.22);
          if (
            WAR_ROOM_WEAPON_PRESENTATION_ENABLED
            && player.meleeAttackHeavy
            && ["melee_axe", "melee_shovel", "melee_pickaxe"].includes(weaponId)
          ) {
            weaponMount.rotation.x -= meleePrepare * 0.48;
            weaponMount.rotation.x += meleeStrike * 0.32;
          }
        }
      }
      if (reloadMagazineRef.current) {
        const magazineVisible = !melee && reloadElapsed < 0.3 && player.reloadingWeapon === weaponId;
        reloadMagazineRef.current.visible = magazineVisible;
        const magazineTravel = reloadElapsed < 0.15
          ? 1 - Math.pow(1 - reloadElapsed / 0.15, 2)
          : Math.pow(Math.max(0, 1 - (reloadElapsed - 0.15) / 0.15), 2);
        reloadMagazineRef.current.position.y = -0.2 - (magazineVisible
          ? magazineTravel * 0.16
          : 0);
      }
      if (weapon.weaponClass !== "melee" && weaponId !== "sidearm" && leftHand?.parent) {
        weaponMount.updateMatrixWorld(true);
        weaponMount.localToWorld(gripWorldScratch.set(-0.08, 0, -0.52));
        leftHand.parent.worldToLocal(gripLocalScratch.copy(gripWorldScratch));
        leftHand.position.lerp(gripLocalScratch, Math.min(1, delta * 12));
      }
      const applyBoneOffset = (
        bone: THREE.Object3D | undefined | null,
        x: number,
        y: number,
        z: number,
      ) => {
        if (!bone) return;
        const base = bone.userData.warRoomBaseRotation as [number, number, number] | undefined;
        if (!base) bone.userData.warRoomBaseRotation = [bone.rotation.x, bone.rotation.y, bone.rotation.z];
        const original = (bone.userData.warRoomBaseRotation ?? [0, 0, 0]) as [number, number, number];
        bone.rotation.set(original[0] + x, original[1] + y, original[2] + z);
      };
      applyBoneOffset(rightArm, recoilStrength * 0.11 + reloadDrop * 0.14 + chargeProgress * 0.2, 0, 0);
      const moveX = inputRef.current.moveX
        + (inputRef.current.keys.has("d") ? 1 : 0)
        - (inputRef.current.keys.has("a") ? 1 : 0);
      const moveY = inputRef.current.moveY
        + (inputRef.current.keys.has("w") ? 1 : 0)
        - (inputRef.current.keys.has("s") ? 1 : 0);
      const locomotion = resolveWarRoomLocomotion(
        moveX,
        moveY,
        movementBasisYawRef.current ?? player.facingYaw,
        player.facingYaw,
      );
      applyBoneOffset(
        torso,
        -recoilStrength * 0.025 + locomotion.leanForward,
        locomotion.leanSide,
        0,
      );
    }
    if (flashRef.current && flashRef.current.userData.warRoomExpiresAt <= player.clockTime) {
      flashRef.current.visible = false;
    }
  });
  const playerAnimation = () => {
    const player = runtimeRef.current.player;
    const input = inputRef.current;
    const moveX = input.moveX + (input.keys.has("d") ? 1 : 0) - (input.keys.has("a") ? 1 : 0);
    const moveY = input.moveY + (input.keys.has("w") ? 1 : 0) - (input.keys.has("s") ? 1 : 0);
    const root = rootRef.current;
    const turnError = root
      ? getWarRoomYawError(getWarRoomFacingYawFromRootYaw(root.rotation.y), player.facingYaw)
      : 0;
    const turnDirection = Math.abs(turnError) > 0.1
      ? turnError > 0 ? "right" as const : "left" as const
      : null;
    return resolveWarRoomPlayerAnimationState({
      hp: player.hp,
      damageAge: player.clockTime - player.lastDamageAt,
      shotFeedbackUntil: player.shotFeedbackUntil,
      meleeUntil: player.meleeUntil,
      clockTime: player.clockTime,
      jumpHeight: player.jumpHeight,
      crouched: player.crouched,
      prone: player.prone,
      movement: Math.hypot(moveX, moveY),
      sprinting: player.sprinting,
      turnDirection,
    });
  };
  const playerPlaybackScale = () => {
    const player = runtimeRef.current.player;
    const input = inputRef.current;
    const animation = playerAnimation();
    const moveX = input.moveX + (input.keys.has("d") ? 1 : 0) - (input.keys.has("a") ? 1 : 0);
    const moveY = input.moveY + (input.keys.has("w") ? 1 : 0) - (input.keys.has("s") ? 1 : 0);
    const direction = resolveWarRoomLocomotion(
      moveX,
      moveY,
      movementBasisYawRef.current ?? player.facingYaw,
      player.facingYaw,
    ).direction;
    const isOnStairs = runtimeRef.current.room.buildings.some((building) => (
      getWarRoomStairProgress(building, player.x, player.z) !== null
    ));
    const fullMovementSpeed = player.prone ? 1.25
      : player.crouched ? 3.05
        : player.sprinting ? 8.2
          : isOnStairs ? 4
            : 6.1;
    const movementSpeed = fullMovementSpeed * Math.min(1, Math.hypot(moveX, moveY));
    return getWarRoomPlayerAnimationPlaybackScale(animation, direction, movementSpeed);
  };
  return (
    <group ref={rootRef} name="war-room-player">
      <WarRoomAssetBoundary fallback={<ProceduralPlayerFallback />}>
        <Suspense fallback={<ProceduralPlayerFallback />}>
          <WarRoomAnimatedActor
            src="/models/player-hero.glb"
            height={WAR_ROOM_CHARACTER_HEIGHT}
            state={playerAnimation}
            playbackScale={playerPlaybackScale}
            modelRef={modelRef}
            afterAnimationFrame={applyMeleePoseAfterAnimation}
            isPaused={() => inputRef.current.paused}
          />
        </Suspense>
      </WarRoomAssetBoundary>
      <group ref={recoilRef} name="war-room-weapon-mount" position={[0.7, 1.24, -0.36]}>
        {!isMeleeWeapon && (
          <mesh position={[0, 0, -0.04]}>
            <sphereGeometry args={[0.11, 8, 6]} />
            <meshStandardMaterial color="#94775d" roughness={0.88} />
          </mesh>
        )}
        <group position={[0, 0.03, -0.08]}>
          <WeaponModel
            weaponId={weaponId}
            mount={mount}
            muzzleAnchorRef={muzzleRef}
            muzzleFlashRef={flashRef}
          />
          {!isMeleeWeapon && (
            <mesh ref={reloadMagazineRef} position={[0, -0.2, -0.22]} visible={false}>
              <boxGeometry args={[0.085, 0.18, 0.1]} />
              <meshStandardMaterial color="#4a4945" roughness={0.38} metalness={0.72} />
            </mesh>
          )}
        </group>
      </group>
    </group>
  );
}

function ProceduralEnemyFallback({ commander, color }: { commander: boolean; color: string }) {
  return (
    <group>
      <mesh position={[0, 0.76, 0]} castShadow>
        <capsuleGeometry args={[commander ? 0.27 : 0.24, commander ? 0.75 : 0.58, 3, 7]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.75} />
      </mesh>
      <mesh position={[0, 1.53, 0]} castShadow>
        <sphereGeometry args={[commander ? 0.24 : 0.2, 10, 8]} />
        <meshStandardMaterial color={color} roughness={0.88} />
      </mesh>
      <mesh position={[0, 1.12, -0.18]} castShadow>
        <boxGeometry args={commander ? [0.42, 0.5, 0.06] : [0.32, 0.42, 0.045]} />
        <meshStandardMaterial color={color} roughness={0.86} />
      </mesh>
      <group position={[0.34, 1.0, -0.28]}>
        <mesh position={[0, 0, -0.26]} castShadow>
          <boxGeometry args={[0.2, 0.13, 0.54]} />
          <meshStandardMaterial color="#49372e" metalness={0.32} roughness={0.65} />
        </mesh>
        <mesh position={[0, 0.02, -0.6]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.038, 0.052, 0.54, 7]} />
          <meshStandardMaterial color="#343739" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

function EnemyActor({
  enemy,
  index,
  groupRefs,
  inputRef,
}: {
  enemy: WarRoomEnemy;
  index: number;
  groupRefs: MutableRefObject<Array<THREE.Group | null>>;
  inputRef: MutableRefObject<WarRoomInputState>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const hitPulseRef = useRef<THREE.Mesh>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const weaponMountRef = useRef<THREE.Group>(null);
  const handMountPoseRef = useRef<{
    hand: THREE.Object3D;
    mount: WarRoomWeaponMount;
    weaponId: WarRoomWeaponId;
    pose: WarRoomHandMountPose;
  } | null>(null);
  const attackWarningRef = useRef<THREE.Group>(null);
  const muzzleAnchorRef = useRef<THREE.Group>(null);
  const muzzleFlashRef = useRef<THREE.Group>(null);
  useFrame((frame, delta) => {
    if (inputRef.current.paused) return;
    const group = groupRef.current;
    if (!group) return;
    const runtime = group.parent?.userData.runtime as WarRoomRuntime | undefined;
    const player = runtime?.player;
    const gameNow = runtime?.player.clockTime ?? frame.clock.elapsedTime;
    const isBossAbilityTelegraph = Boolean(
      enemy.commander
      && enemy.bossAttack
      && gameNow < enemy.nextShotAt,
    );
    const warningProgress = isBossAbilityTelegraph && enemy.bossAttack
      ? Math.max(0, Math.min(1, (
        gameNow - (enemy.bossAttackStartedAt ?? gameNow)
      ) / Math.max(0.01, getWarRoomBossTelegraphSeconds(enemy.bossAttack))))
      : getWarRoomCommanderTelegraphProgress(
        enemy.commander && enemy.mode === "fire" && !enemy.bossAttack,
        gameNow,
        enemy.nextShotAt,
      );
    if (attackWarningRef.current) {
      attackWarningRef.current.visible = WAR_ROOM_COMMANDER_TELEGRAPH_ENABLED
        && enemy.alive
        && warningProgress !== null;
      if (warningProgress !== null) {
        const scale = enemy.bossAttack === "shockwave"
          ? 0.82 + warningProgress * (WAR_ROOM_BOSS_SHOCKWAVE_RADIUS * 0.55)
          : 0.82 + warningProgress * 0.22;
        attackWarningRef.current.scale.setScalar(scale);
        if (enemy.bossAttack === "charge") {
          attackWarningRef.current.rotation.y = Math.atan2(
            (enemy.bossAttackTargetX ?? enemy.x) - enemy.x,
            -((enemy.bossAttackTargetZ ?? enemy.z) - enemy.z),
          );
        } else {
          attackWarningRef.current.rotation.y = 0;
        }
      }
    }
    if (player) {
      const targetRootYaw = getWarRoomActorRootYawToTarget(
        enemy.x,
        enemy.z,
        player.x,
        player.z,
      );
      group.rotation.y = shortestLerp(group.rotation.y, targetRootYaw, 24, delta);
    }
    const hitKick = enemy.hitUntil > gameNow ? (enemy.hitUntil - gameNow) / 0.2 : 0;
    if (enemy.alive) delete group.userData.warRoomDeathStartedAt;
    else if (group.userData.warRoomDeathStartedAt == null) {
      group.userData.warRoomDeathStartedAt = frame.clock.elapsedTime;
    }
    const deathAt = Number(group.userData.warRoomDeathStartedAt ?? frame.clock.elapsedTime);
    const deathProgress = enemy.alive
      ? 0
      : getWarRoomDeathFadeProgress(frame.clock.elapsedTime, deathAt);
    group.position.set(
      enemy.x + enemy.hitKnockbackX * hitKick,
      (enemy.floorHeight ?? 0) + hitKick * 0.035,
      enemy.z + enemy.hitKnockbackZ * hitKick,
    );
    group.rotation.x = enemy.alive ? -hitKick * 0.035 : -Math.cos(enemy.deathYaw) * Math.min(1, deathProgress * 1.3);
    group.rotation.z = enemy.alive ? 0 : -Math.sin(enemy.deathYaw) * Math.min(1, deathProgress * 1.3);
    const hand = modelRef.current && [
      "Rig_RightHand", "mixamorigRightHand", "FistR", "Fist.R", "RightHand", "RightHandBone",
    ].map((name) => modelRef.current?.getObjectByName(name)).find(Boolean);
    const weaponMount = weaponMountRef.current;
    const root = groupRef.current;
    if (hand && weaponMount && root) {
      if (weaponMount.parent !== hand) {
        weaponMount.parent?.remove(weaponMount);
        hand.add(weaponMount);
      }
      weaponMount.visible = true;
      const mount = WAR_ROOM_WEAPON_MOUNTS[enemy.weaponId];
      let cachedPose = handMountPoseRef.current;
      if (
        !cachedPose
        || cachedPose.hand !== hand
        || cachedPose.mount !== mount
        || cachedPose.weaponId !== enemy.weaponId
      ) {
        cachedPose = {
          hand,
          mount,
          weaponId: enemy.weaponId,
          pose: getWarRoomHandMountPose(root, hand, mount),
        };
        handMountPoseRef.current = cachedPose;
      }
      weaponMount.position.copy(cachedPose.pose.position);
      weaponMount.quaternion.copy(cachedPose.pose.quaternion);
      weaponMount.scale.copy(cachedPose.pose.scale);
    } else if (weaponMount) {
      weaponMount.visible = false;
    }
    if (muzzleFlashRef.current && Number(muzzleFlashRef.current.userData.warRoomExpiresAt ?? 0) <= gameNow) {
      muzzleFlashRef.current.visible = false;
    }
    group.visible = enemy.alive || deathProgress < 1;
    const kneeDip = enemy.alive && enemy.hitKneeUntil > gameNow ? 0.82 : 1;
    group.scale.y = enemy.alive ? kneeDip : Math.max(0.025, 1 - deathProgress);
    if (modelRef.current && !modelRef.current.userData.warRoomOwnedMaterials) {
      modelRef.current.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.material = Array.isArray(object.material)
          ? object.material.map((material) => material.clone())
          : object.material.clone();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(installWarRoomHitRim);
      });
      modelRef.current.userData.warRoomOwnedMaterials = true;
    }
    if (modelRef.current) {
      const hitRim = WAR_ROOM_REACTION_FEEDBACK_ENABLED
        ? getWarRoomHitRimIntensity(gameNow, enemy.hitFlashUntil)
        : 0;
      const alpha = enemy.alive ? 1 : Math.max(0, 1 - deathProgress);
      modelRef.current.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          const emissive = material as THREE.Material & { emissive?: THREE.Color; emissiveIntensity?: number };
          const rim = material.userData.warRoomHitRim as { value: number } | undefined;
          if (rim) rim.value = hitRim;
          material.transparent = alpha < 1;
          material.opacity = alpha;
          if (emissive.emissive?.isColor) {
            emissive.emissive.set(enemy.commander ? "#7b231d" : "#51382c");
            emissive.emissiveIntensity = enemy.commander ? 0.18 : 0.04;
          }
        });
      });
    }
    if (hitPulseRef.current) {
      const intensity = enemy.alive
        ? Math.max(0, Math.min(1, (enemy.hitFlashUntil - gameNow) / WAR_ROOM_ENEMY_HIT_FLASH_SECONDS))
        : 0;
      hitPulseRef.current.visible = intensity > 0;
      hitPulseRef.current.scale.setScalar(0.9 + (1 - intensity) * 0.8);
      const material = hitPulseRef.current.material as THREE.MeshBasicMaterial;
      material.color.set(enemy.commander ? "#ff786b" : "#ffd27a");
      material.opacity = intensity * 0.96;
    }
  });
  const enemyAnimation = (): WarRoomAnimationState => {
    const runtime = groupRef.current?.parent?.userData.runtime as WarRoomRuntime | undefined;
    const gameNow = runtime?.player.clockTime ?? 0;
    if (!enemy.alive) return "death";
    if (enemy.hitUntil > gameNow) return "hit";
    if (enemy.mode === "approach") return "run";
    if (enemy.mode === "fire") return "attack";
    return "idle";
  };
  const tint = enemy.color;
  const characterHeight = WAR_ROOM_CHARACTER_HEIGHT * (enemy.commander ? WAR_ROOM_COMMANDER_SCALE : 1);
  const fallback = <ProceduralEnemyFallback commander={enemy.commander} color={enemy.color} />;
  return (
    <group
      ref={(node) => {
        groupRef.current = node;
        groupRefs.current[index] = node;
      }}
      name={`war-room-enemy:${enemy.id}`}
      userData={{ enemyIndex: index }}
    >
      <WarRoomAssetBoundary fallback={fallback}>
        <Suspense fallback={fallback}>
          <WarRoomAnimatedActor
            src="/models/player-hero.glb"
            height={characterHeight}
            tint={tint}
            commander={enemy.commander}
            state={enemyAnimation}
            modelRef={modelRef}
            isPaused={() => inputRef.current.paused}
          />
        </Suspense>
      </WarRoomAssetBoundary>
      {enemy.alive && enemy.mode === "alert" && (
        <mesh
          name={`war-room-alert:${enemy.id}`}
          position={[0, characterHeight + 0.2, 0]}
          renderOrder={10}
        >
          <octahedronGeometry args={[0.13, 0]} />
          <meshBasicMaterial color="#ffd27a" toneMapped={false} />
        </mesh>
      )}
      <group
        ref={attackWarningRef}
        name={`commander-warning:${enemy.id}`}
        visible={false}
        userData={{ warRoomCameraIgnore: true }}
      >
        <mesh
          geometry={WAR_ROOM_COMMANDER_WARNING_GEOMETRY}
          material={WAR_ROOM_COMMANDER_WARNING_MATERIAL}
          position={[0, 0.025, 0]}
          rotation={[-Math.PI / 2, 0, Math.PI / 2]}
          dispose={null}
        />
      </group>
      <group ref={weaponMountRef} name={`enemy-weapon:${enemy.id}`} visible={false}>
        <WeaponModel
          weaponId={enemy.weaponId}
          mount={WAR_ROOM_WEAPON_MOUNTS[enemy.weaponId]}
          muzzleAnchorRef={muzzleAnchorRef}
          muzzleFlashRef={muzzleFlashRef}
        />
      </group>
      <mesh
        ref={hitPulseRef}
        position={[0, enemy.commander ? 1.42 : 1.12, -0.48]}
        visible={false}
        renderOrder={5}
      >
        <torusGeometry args={[0.42, 0.065, 8, 32]} />
        <meshBasicMaterial
          color="#ffd27a"
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {enemy.commander && (
        <group position={[0, 2.08, 0]} name="commander-crest">
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.16, 0.025, 6, 16]} />
            <meshBasicMaterial color="#ffd173" toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.16, 0]}>
            <coneGeometry args={[0.19, 0.34, 5]} />
            <meshBasicMaterial color="#ff433a" toneMapped={false} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function WarRoomHealingPointMarker({
  point,
  readNow,
}: {
  point: WarRoomHealingPoint;
  readNow: () => number;
}) {
  const markerRef = useRef<THREE.Group>(null);
  useFrame(() => {
    const now = readNow();
    if (!markerRef.current) return;
    markerRef.current.visible = point.availableAt <= now;
    markerRef.current.position.y = 0.72 + Math.sin(now * 2.2 + point.x) * 0.055;
    markerRef.current.rotation.y = now * 0.72;
  });
  return (
    <group ref={markerRef} position={[point.x, 0.72, point.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.65, 0]}>
        <ringGeometry args={[0.4, 0.56, 24]} />
        <meshBasicMaterial
          color="#62f29c"
          transparent
          opacity={0.62}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0.08, 0]}>
        <octahedronGeometry args={[0.23, 0]} />
        <meshStandardMaterial
          color="#b5ffd0"
          emissive="#36e87d"
          emissiveIntensity={1.4}
          roughness={0.22}
          metalness={0.05}
        />
      </mesh>
      <mesh position={[0, -0.19, 0]} scale={[0.34, 0.075, 0.19]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshBasicMaterial color="#73f6a8" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function WarRoomTargetMarker({
  enemy,
  readTargetId,
  readNow,
}: {
  enemy: WarRoomEnemy;
  readTargetId: () => string | null;
  readNow: () => number;
}) {
  const markerRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const marker = markerRef.current;
    if (!marker) return;
    marker.visible = enemy.alive && readTargetId() === enemy.id;
    marker.position.set(enemy.x, 0.04, enemy.z);
    marker.rotation.set(-Math.PI / 2, readNow() * 0.55, 0);
  });
  return (
    <mesh ref={markerRef} rotation={[-Math.PI / 2, 0, 0]} renderOrder={6}>
      <ringGeometry args={[0.48, 0.62, 32]} />
      <meshBasicMaterial
        color={enemy.commander ? "#ffd173" : "#73f0a1"}
        transparent
        opacity={0.9}
        depthWrite={false}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

function buildHudSnapshot(runtime: WarRoomRuntime, now: number, input: WarRoomInputState): WarRoomHudSnapshot {
  const player = runtime.player;
  const weaponId = player.weaponSlots[player.activeSlot];
  const ammo = player.ammo[weaponId];
  const bossHealth = getWarRoomCommanderHealth(runtime.enemies);
  const bossAttackEnemy = runtime.enemies.find(
    (enemy) => enemy.commander && enemy.alive && enemy.bossAttack,
  );
  const nearbyChest = getNearbyWarRoomLootChest(runtime);
  const nearbyDoor = getNearestWarRoomDoor(
    runtime.room.buildings,
    player.x,
    player.z,
    player.floorHeight,
    input.yaw,
  );
  const meleeProgress = player.meleeUntil > now
    ? Math.max(0, Math.min(1, (now - player.meleeStartedAt) / Math.max(0.01, player.meleeDuration)))
    : 0;
  const meleePhase = player.meleeUntil <= now
    ? "HAZIR"
    : meleeProgress < (player.meleeAttackHeavy ? 0.4 : 0.28)
      ? "HAZIRLIK"
      : meleeProgress < 0.72 ? "VURUŞ" : "TOPARLAN";
  return {
    mission: {
      mode: runtime.mission.mode,
      dailyObjective: runtime.mission.dailyObjective,
      wave: runtime.mission.wave,
      score: runtime.mission.score,
      timeLimitSeconds: runtime.mission.timeLimitSeconds,
      targetChests: runtime.mission.targetChests,
      defenseHp: runtime.mission.defenseHp,
      defenseMaxHp: runtime.mission.defenseMaxHp,
    },
    player: {
      x: player.x,
      z: player.z,
      floorHeight: player.floorHeight,
      yaw: player.yaw,
      hp: player.hp,
      maxHp: player.maxHp,
      armor: player.armor,
      maxArmor: player.maxArmor,
      stamina: player.stamina,
      maxStamina: player.maxStamina,
    },
    weaponSlots: [...player.weaponSlots],
    orientation: {
      facingYaw: player.facingYaw,
      mode: player.facingMode,
      joystickAngleDegrees: player.joystickAngleDegrees,
      facingCamera: player.facingCamera,
    },
    enemies: runtime.enemies.map(({ id, x, z, floorHeight = 0, alive, commander }) => ({
      id,
      x,
      z,
      floorHeight,
      alive,
      commander,
    })),
    healingPoints: RESTORE_CONFIG.enabled ? runtime.healingPoints.map(({ id, x, z, availableAt }) => ({
      id,
      x,
      z,
      floorHeight: 0,
      available: availableAt <= now,
    })) : [],
    armorPoints: RESTORE_CONFIG.enabled ? runtime.armorPoints.map(({ id, x, z, availableAt }) => ({
      id,
      x,
      z,
      floorHeight: 0,
      available: availableAt <= now,
    })) : [],
    regenerationActive: player.regenerationActive,
    regenerationWaitSeconds: player.regenerationWaitSeconds,
    regenerationAtCap: RESTORE_CONFIG.enabled
      && player.hp >= player.maxHp * RESTORE_CONFIG.passive.maxHealthRatio,
    remaining: getWarRoomRemaining(runtime),
    bossHp: bossHealth.hp,
    bossMaxHp: bossHealth.maxHp,
    bossAttack: bossAttackEnemy?.bossAttack
      ? {
        attack: bossAttackEnemy.bossAttack,
        telegraphing: now < bossAttackEnemy.nextShotAt,
      }
      : null,
    kills: player.kills,
    headshots: player.headshots,
    shots: player.shots,
    hits: player.hits,
    targetName: player.targetName,
    targetReason: player.targetReason,
    elapsedSeconds: Math.max(0, now - player.startTime),
    weaponId,
    magazine: ammo?.magazine ?? 0,
    reserve: ammo?.reserve ?? 0,
    reloading: player.reloadingWeapon === weaponId,
    aiming: input.aimHeld,
    targetVisible: Boolean(player.targetId),
    hitMarker: player.hitMarkerUntil > now,
    headshotMarker: player.hitMarkerUntil > now && player.hitMarkerHeadshot,
    damageNumberCritical: player.lastHitCritical,
    lastHitSource: player.lastHitSource,
    damageEventId: player.damageEventId,
    firing: player.shotFeedbackUntil > now,
    damageVignette: player.lastDamageAt > 0 && now - player.lastDamageAt < 0.72,
    damageDirection: player.damageDirection,
    lastHitDamage: player.lastHitDamage,
    lastHitArmorDamage: player.lastHitArmorDamage,
    hitMessage: player.hitMessageUntil > now ? player.lastHitText : "",
    killFeed: player.killFeed,
    crouched: player.crouched,
    meleePhase,
    meleeComboCount: player.meleeComboCount,
    meleeLastResult: player.meleeLastResult,
    nearbyDoor: nearbyDoor
      ? {
        id: nearbyDoor.key,
        openProgress: getWarRoomDoorOpenProgress(runtime.doorStates[nearbyDoor.key], now),
      }
      : null,
    nearbyLootChest: nearbyChest
      ? {
        id: nearbyChest.chest.id,
        label: nearbyChest.label,
        contents: nearbyChest.contents,
        progress: player.lootChestId === nearbyChest.chest.id ? player.lootProgress : 0,
      }
      : null,
    lootChestsOpened: runtime.lootChests.filter((chest) => chest.opened).length,
  };
}

function WarRoomRuntimeScene({
  runtimeRef,
  inputRef,
  mobileControlsRef,
  weaponIds,
  weaponMountOverrides,
  cameraMode,
  motionReduced,
  weaponSway,
  armsVisible,
  shoulderSide,
  shoulderOffset,
  bloodEffects,
  trainingMode,
  quality,
  debugMode,
  debugDiagnosticsEnabled,
  collectPerformanceMetrics,
  onMeleeDebugUpdate,
  onRenderStats,
  onLookDebugUpdate,
  onHudUpdate,
  onFinish,
  onRuntimeError,
}: Omit<Props, "onWarmupComplete">) {
  const { camera, scene, gl, size } = useThree();
  const perspective = camera as THREE.PerspectiveCamera;
  const viewModelScene = useMemo(() => {
    const result = new THREE.Scene();
    result.name = "war-room-first-person-view-model-pass";
    return result;
  }, []);
  const viewModelCamera = useMemo(() => {
    const result = new THREE.PerspectiveCamera(WAR_ROOM_VIEWMODEL_FOV, 1, 0.012, 18);
    result.name = "war-room-first-person-view-model-camera";
    return result;
  }, []);
  useFrame(({ gl: renderer, camera: activeCamera, scene: worldScene }) => {
    activeCamera.updateWorldMatrix(true, false);
    activeCamera.getWorldPosition(viewModelCamera.position);
    activeCamera.getWorldQuaternion(viewModelCamera.quaternion);
    const viewAspect = size.height > 0 ? size.width / size.height : 1.75;
    if (viewModelCamera.aspect !== viewAspect) {
      viewModelCamera.aspect = viewAspect;
      viewModelCamera.updateProjectionMatrix();
    }
    viewModelCamera.updateMatrixWorld(true);
    const previousAutoClear = renderer.autoClear;
    try {
      renderer.autoClear = false;
      renderer.clear();
      renderer.render(worldScene, activeCamera);
      renderer.clearDepth();
      renderer.render(viewModelScene, viewModelCamera);
    } finally {
      renderer.autoClear = previousAutoClear;
    }
  }, 1);
  const enemyGroupRefs = useRef<Array<THREE.Group | null>>([]);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const cameraRaycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const cameraStart = useMemo(() => new THREE.Vector3(), []);
  const cameraDesired = useMemo(() => new THREE.Vector3(), []);
  const cameraEyeHeightRef = useRef(1.6);
  const cameraFloorHeightRef = useRef(0);
  const cameraDirection = useMemo(() => new THREE.Vector3(), []);
  const cameraLook = useMemo(() => new THREE.Vector3(), []);
  const cameraRayOrigin = useMemo(() => new THREE.Vector3(), []);
  const cameraUnobstructed = useMemo(() => new THREE.Vector3(), []);
  const meleeOrigin = useMemo(() => new THREE.Vector3(), []);
  const meleeImpact = useMemo(() => new THREE.Vector3(), []);
  const aimRayEnd = useMemo(() => new THREE.Vector3(), []);
  const aimImpactPoint = useMemo(() => new THREE.Vector3(), []);
  const muzzleScratch = useMemo(() => new THREE.Vector3(), []);
  const tracerEndScratch = useMemo(() => new THREE.Vector3(), []);
  const impactPointScratch = useMemo(() => new THREE.Vector3(), []);
  const impactBiasScratch = useMemo(() => new THREE.Vector3(), []);
  const enemyShotDirectionScratch = useMemo(() => new THREE.Vector3(), []);
  const enemyAimPointScratch = useMemo(() => new THREE.Vector3(), []);
  const enemyTracerTargetScratch = useMemo(() => new THREE.Vector3(), []);
  const enemyMissOffsetScratch = useMemo(() => new THREE.Vector3(), []);
  const enemyMoveResultScratch = useMemo(() => ({ x: 0, z: 0 }), []);
  const pickupImpactScratch = useMemo(() => new THREE.Vector3(), []);
  const room = runtimeRef.current.room;
  const playerRootRef = useRef<THREE.Group | null>(null);
  const playerRenderPositionRef = useRef({
    x: runtimeRef.current.player.x,
    z: runtimeRef.current.player.z,
  });
  const playerMovementClockRef = useRef(createWarRoomMovementClock(
    runtimeRef.current.player.x,
    runtimeRef.current.player.z,
  ));
  const attackCandidatesRef = useRef<WarRoomEnemy[]>([]);
  const playerMuzzleRef = useRef<THREE.Group | null>(null);
  const playerMuzzleFlashRef = useRef<THREE.Group | null>(null);
  const lastHudAtRef = useRef(0);
  const finishedRef = useRef(false);
  const victoryCinematicStartedAtRef = useRef<number | null>(null);
  const cameraKickRef = useRef(0);
  const cameraSideKickRef = useRef(0);
  const cameraFovKickRef = useRef(0);
  const lowHealthBeatAtRef = useRef(0);
  const renderStatsAtRef = useRef(0);
  const rendererNameForReportRef = useRef<string | null>(null);
  const previousQualityForReportRef = useRef(quality);
  useEffect(() => {
    const qualityRank = { low: 0, balanced: 1, high: 2 } as const;
    const previous = previousQualityForReportRef.current;
    if (collectPerformanceMetrics && qualityRank[quality] < qualityRank[previous]) {
      recordWarRoomQualityDowngrade(
        warRoomPerformanceCollector,
        performance.now(),
        previous,
        quality,
      );
    }
    previousQualityForReportRef.current = quality;
  }, [collectPerformanceMetrics, quality]);
  const logicalCameraBounds = useMemo<WarRoomCameraBounds[]>(
    () => room.blockers.map((blocker) => ({
      id: blocker.id,
      minX: blocker.x - blocker.width / 2,
      minY: -0.15,
      minZ: blocker.z - blocker.depth / 2,
      maxX: blocker.x + blocker.width / 2,
      maxY: blocker.height + (blocker.kind === "tower" ? 2.2 : 0.15),
      maxZ: blocker.z + blocker.depth / 2,
    })),
    [room],
  );
  const cameraOccludersRef = useRef<CameraOccluderEntry[]>([]);
  const cameraRaycastMeshesByOwnerRef = useRef(new Map<string, THREE.Object3D[]>());
  const cameraRaycastCandidatesRef = useRef<THREE.Object3D[]>([]);
  const cameraRaycastOwnerByObjectRef = useRef(new WeakMap<THREE.Object3D, string>());
  const cameraBoundsRef = useRef<WarRoomCameraBounds[]>(logicalCameraBounds);
  const activeBlockersRef = useRef<readonly WarRoomBlocker[]>(runtimeRef.current.room.blockers);
  const activeBlockerBufferRef = useRef<WarRoomBlocker[]>([]);
  const cameraBoundsRefreshRef = useRef(0);
  const cameraFadeByIdRef = useRef(new Map<string, number>());
  const cameraMaterialOriginalsRef = useRef(new WeakMap<THREE.Material, CameraMaterialSnapshot>());
  const cameraDebugAtRef = useRef(0);
  const lookDebugAtRef = useRef(0);
  const lastLookDeltaRef = useRef({ dx: 0, dy: 0 });
  const movementBasisYawRef = useRef<number | null>(null);
  const sprintHysteresisRef = useRef(createWarRoomSprintHysteresisState());
  const previousLookYawRef = useRef<number | null>(null);
  const cameraInitializedRef = useRef(false);
  const lastSafePlayerPositionRef = useRef<{ x: number; z: number; floorHeight: number } | null>(null);
  const emptyClickAtRef = useRef(0);
  const meleePerformanceRef = useRef({
    started: false,
    elapsedMs: 0,
    sampleElapsedMs: 0,
    poolSampleElapsedMs: 0,
    totalFrames: 0,
    sampleFrames: 0,
    attackCount: 0,
    lastAttackAtMs: 0,
    startedAtMs: 0,
    lastFrameAtMs: 0,
    largestAttackGapMs: 0,
    minFps: Number.POSITIVE_INFINITY,
    peakActiveParticles: 0,
    peakOccupiedDecals: 0,
    baselineGeometries: null as number | null,
    baselineTextures: null as number | null,
    reported: false,
  });
  const particles = useMemo<WarRoomParticle[]>(
    () => Array.from({ length: WAR_ROOM_EFFECT_POOL_SIZE }, () => ({
      x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, born: -1, lifetime: 0, size: 0, bounce: false,
    })),
    [],
  );
  const particleCursor = useRef(0);
  const particleMesh = useMemo(() => {
    const mesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 6, 5),
      new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.92, depthWrite: false }),
      WAR_ROOM_EFFECT_POOL_SIZE,
    );
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const white = new THREE.Color("#ffffff");
    for (let index = 0; index < WAR_ROOM_EFFECT_POOL_SIZE; index += 1) mesh.setColorAt(index, white);
    mesh.frustumCulled = false;
    return mesh;
  }, []);
  const particleTransform = useMemo(() => new THREE.Object3D(), []);
  const decalMesh = useMemo(() => {
    const mesh = new THREE.InstancedMesh(
      new THREE.CircleGeometry(0.11, 8),
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        side: THREE.DoubleSide,
      }),
      WAR_ROOM_DECAL_POOL_SIZE,
    );
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let index = 0; index < WAR_ROOM_DECAL_POOL_SIZE; index += 1) {
      mesh.setColorAt(index, WAR_ROOM_DECAL_COLORS[index % WAR_ROOM_DECAL_COLORS.length]);
    }
    const hidden = new THREE.Object3D();
    hidden.scale.setScalar(0);
    hidden.updateMatrix();
    for (let index = 0; index < WAR_ROOM_DECAL_POOL_SIZE; index += 1) mesh.setMatrixAt(index, hidden.matrix);
    mesh.frustumCulled = false;
    return mesh;
  }, []);
  const crackMesh = useMemo(() => {
    const mesh = new THREE.InstancedMesh(
      WAR_ROOM_CRACK_GEOMETRY,
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.58,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        vertexColors: false,
      }),
      WAR_ROOM_DECAL_POOL_SIZE,
    );
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const initialCrackColor = new THREE.Color("#9b684d");
    for (let index = 0; index < WAR_ROOM_DECAL_POOL_SIZE; index += 1) {
      mesh.setColorAt(index, initialCrackColor);
    }
    const hidden = new THREE.Object3D();
    hidden.scale.setScalar(0);
    hidden.updateMatrix();
    for (let index = 0; index < WAR_ROOM_DECAL_POOL_SIZE; index += 1) mesh.setMatrixAt(index, hidden.matrix);
    mesh.frustumCulled = false;
    return mesh;
  }, []);
  const decalCursor = useRef(0);
  const decalState = useMemo<WarRoomDecal[]>(
    () => Array.from({ length: WAR_ROOM_DECAL_POOL_SIZE }, () => ({
      kind: null,
      x: 0,
      z: 0,
      yaw: 0,
      scale: 0,
      born: -1,
    })),
    [],
  );
  const decalTransform = useMemo(() => new THREE.Object3D(), []);
  const decalNormal = useMemo(() => new THREE.Vector3(), []);
  const decalForward = useMemo(() => new THREE.Vector3(0, 0, 1), []);
  const crackTint = useMemo(() => new THREE.Color(), []);
  const hiddenDecalTransform = useMemo(() => {
    const object = new THREE.Object3D();
    object.scale.setScalar(0);
    object.updateMatrix();
    return object;
  }, []);
  const shockwaves = useMemo(
    () => Array.from({ length: WAR_ROOM_SHOCKWAVE_POOL_SIZE }, () => ({
      x: 0,
      z: 0,
      born: -1,
      yaw: 0,
      color: "#ffd27e",
      maxScale: 2.4,
    })),
    [],
  );
  const shockwaveCursor = useRef(0);
  const shockwaveTransform = useMemo(() => new THREE.Object3D(), []);
  const shockwaveTint = useMemo(() => new THREE.Color(), []);
  const shockwaveMesh = useMemo(() => {
    const mesh = new THREE.InstancedMesh(
      new THREE.RingGeometry(0.45, 0.53, 24),
      new THREE.MeshBasicMaterial({
        color: "#f8b960",
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
      WAR_ROOM_SHOCKWAVE_POOL_SIZE,
    );
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const initialShockwaveColor = new THREE.Color("#ffd27e");
    for (let index = 0; index < WAR_ROOM_SHOCKWAVE_POOL_SIZE; index += 1) {
      mesh.setColorAt(index, initialShockwaveColor);
    }
    const hidden = new THREE.Object3D();
    hidden.scale.setScalar(0);
    hidden.updateMatrix();
    for (let index = 0; index < WAR_ROOM_SHOCKWAVE_POOL_SIZE; index += 1) mesh.setMatrixAt(index, hidden.matrix);
    mesh.frustumCulled = false;
    return mesh;
  }, []);
  const slashTrailState = useMemo(() => {
    const positions = new Float32Array((WAR_ROOM_SLASH_TRAIL_SEGMENTS + 1) * 2 * 3);
    const colors = new Float32Array(positions.length);
    const indices: number[] = [];
    for (let segment = 0; segment < WAR_ROOM_SLASH_TRAIL_SEGMENTS; segment += 1) {
      const first = segment * 2;
      const next = first + 2;
      indices.push(first, first + 1, next, first + 1, next + 1, next);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
    );
    geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage),
    );
    geometry.setIndex(indices);
    return {
      geometry,
      positions,
      colors,
      samples: Array.from({ length: WAR_ROOM_SLASH_TRAIL_SEGMENTS + 1 }, () => ({
        base: new THREE.Vector3(),
        tip: new THREE.Vector3(),
        born: -1,
      } satisfies WarRoomSlashSample)),
      count: 0,
      attackStartedAt: -1,
      tint: new THREE.Color("#ffffff"),
    };
  }, []);
  const slashTrailMesh = useMemo(() => {
    const mesh = new THREE.Mesh(
      slashTrailState.geometry,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    mesh.frustumCulled = false;
    mesh.renderOrder = 5;
    return mesh;
  }, [slashTrailState]);
  const slashBase = useMemo(() => new THREE.Vector3(), []);
  const slashTip = useMemo(() => new THREE.Vector3(), []);
  const slashLocalBase = useMemo(() => new THREE.Vector3(0, 0.02, -0.18), []);
  const slashLocalTip = useMemo(() => new THREE.Vector3(), []);
  const footDustAtRef = useRef(0);
  const footstepAtRef = useRef(0);
  const previousJumpHeightRef = useRef(0);
  const fallStartHeightRef = useRef<number | null>(null);
  const fallRuntimeRef = useRef<WarRoomRuntime | null>(null);
  const tracerState = useMemo(() => ({
    geometry: new THREE.BufferGeometry(),
    positions: new Float32Array(WAR_ROOM_TRACER_POOL_SIZE * 6),
    colors: new Float32Array(WAR_ROOM_TRACER_POOL_SIZE * 6),
    expires: new Float64Array(WAR_ROOM_TRACER_POOL_SIZE),
    cursor: 0,
  }), []);
  const tracerLines = useMemo(() => {
    tracerState.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(tracerState.positions, 3).setUsage(THREE.DynamicDrawUsage),
    );
    tracerState.geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(tracerState.colors, 3).setUsage(THREE.DynamicDrawUsage),
    );
    const lines = new THREE.LineSegments(
      tracerState.geometry,
      new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.88, depthWrite: false }),
    );
    lines.frustumCulled = false;
    return lines;
  }, [tracerState]);
  const projectiles = useMemo<WarRoomProjectile[]>(
    () => Array.from({ length: WAR_ROOM_PROJECTILE_POOL_SIZE }, () => ({
      start: new THREE.Vector3(),
      end: new THREE.Vector3(),
      born: -1,
      lifetime: 0,
      color: "#ffffff",
    })),
    [],
  );
  const projectileCursor = useRef(0);
  const projectileUp = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const projectileDirection = useMemo(() => new THREE.Vector3(), []);
  const projectileTip = useMemo(() => new THREE.Vector3(), []);
  const projectileTransform = useMemo(() => new THREE.Object3D(), []);
  const projectileShafts = useMemo(() => {
    const mesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.48, 5),
      new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: 0.32, roughness: 0.5 }),
      WAR_ROOM_PROJECTILE_POOL_SIZE,
    );
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const initialProjectileColor = new THREE.Color("#ffffff");
    for (let index = 0; index < WAR_ROOM_PROJECTILE_POOL_SIZE; index += 1) {
      mesh.setColorAt(index, initialProjectileColor);
    }
    mesh.frustumCulled = false;
    return mesh;
  }, []);
  const projectileHeads = useMemo(() => {
    const mesh = new THREE.InstancedMesh(
      new THREE.ConeGeometry(0.036, 0.15, 5),
      new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: 0.22, roughness: 0.48 }),
      WAR_ROOM_PROJECTILE_POOL_SIZE,
    );
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const initialProjectileColor = new THREE.Color("#ffffff");
    for (let index = 0; index < WAR_ROOM_PROJECTILE_POOL_SIZE; index += 1) {
      mesh.setColorAt(index, initialProjectileColor);
    }
    mesh.frustumCulled = false;
    return mesh;
  }, []);
  useLayoutEffect(() => () => {
    disposeWarRoomSceneResources([
      { object: tracerLines },
      { object: particleMesh },
      { object: decalMesh },
      { object: crackMesh, disposeGeometry: false },
      { object: shockwaveMesh },
      { object: slashTrailMesh },
      { object: projectileShafts },
      { object: projectileHeads },
    ]);
  }, [
    crackMesh,
    decalMesh,
    particleMesh,
    projectileHeads,
    projectileShafts,
    shockwaveMesh,
    slashTrailMesh,
    tracerLines,
  ]);

  const spawnImpact = (
    position: THREE.Vector3,
    color: string,
    now: number,
    count = 6,
    size = 0.045,
    bias?: THREE.Vector3,
  ) => {
    const particleCount = getWarRoomEffectCount(count, quality);
    const activePoolSize = getWarRoomQualityProfile(quality).maxActiveParticles;
    for (let index = 0; index < particleCount; index += 1) {
      const slot = particleCursor.current++ % activePoolSize;
      const particle = particles[slot];
      const seed = now * 997 + slot * 31 + index * 17;
      const jitterX = Math.sin(seed * 12.9898);
      const jitterY = (Math.sin(seed * 7.233 + 1.3) + 1) * 0.75;
      const jitterZ = Math.sin(seed * 5.341 + 2.7);
      particle.x = position.x;
      particle.y = position.y;
      particle.z = position.z;
      particle.vx = (bias?.x ?? 0) + jitterX * 1.4;
      particle.vy = (bias?.y ?? 0.25) + jitterY;
      particle.vz = (bias?.z ?? 0) + jitterZ * 1.4;
      particle.born = now;
      particle.lifetime = 0.42 + (Math.sin(seed * 3.7) + 1) * 0.14;
      particle.size = size * 1.35 * (0.65 + (Math.sin(seed * 2.1) + 1) * 0.375);
      particle.bounce = false;
      particleMesh.setColorAt(slot, new THREE.Color(color));
    }
    if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;
  };

  const spawnImpactDust = (
    position: THREE.Vector3,
    now: number,
    count = 3,
    color = "#b3a18b",
  ) => {
    const particleCount = getWarRoomEffectCount(count, quality);
    const activePoolSize = getWarRoomQualityProfile(quality).maxActiveParticles;
    for (let index = 0; index < particleCount; index += 1) {
      const slot = particleCursor.current++ % activePoolSize;
      const particle = particles[slot];
      const seed = now * 613 + slot * 19 + index * 11;
      particle.x = position.x;
      particle.y = position.y;
      particle.z = position.z;
      particle.vx = Math.sin(seed * 1.9) * 0.18;
      particle.vy = 0.12 + index * 0.045;
      particle.vz = Math.cos(seed * 1.4) * 0.18;
      particle.born = now;
      particle.lifetime = 0.38 + index * 0.035;
      particle.size = 0.1 + index * 0.012;
      particle.bounce = false;
      particleMesh.setColorAt(slot, new THREE.Color(color));
    }
    if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;
  };

  const spawnImpactDustRing = (
    position: THREE.Vector3,
    now: number,
    color: string,
    count = 12,
  ) => {
    const particleCount = getWarRoomEffectCount(count, quality);
    const activePoolSize = getWarRoomQualityProfile(quality).maxActiveParticles;
    for (let index = 0; index < particleCount; index += 1) {
      const slot = particleCursor.current++ % activePoolSize;
      const particle = particles[slot];
      const angle = (index / Math.max(1, particleCount)) * Math.PI * 2;
      const speed = 0.3 + (index % 3) * 0.08;
      particle.x = position.x + Math.cos(angle) * 0.055;
      particle.y = Math.max(0.035, position.y);
      particle.z = position.z + Math.sin(angle) * 0.055;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = 0.2 + (index % 2) * 0.06;
      particle.vz = Math.sin(angle) * speed;
      particle.born = now;
      particle.lifetime = 0.4 + (index % 4) * 0.025;
      particle.size = 0.075 + (index % 3) * 0.012;
      particle.bounce = false;
      particleMesh.setColorAt(slot, new THREE.Color(color));
    }
    if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;
  };

  const spawnMuzzleSmoke = (position: THREE.Vector3, now: number) => {
    const particleCount = getWarRoomEffectCount(4, quality);
    const activePoolSize = getWarRoomQualityProfile(quality).maxActiveParticles;
    for (let index = 0; index < particleCount; index += 1) {
      const slot = particleCursor.current++ % activePoolSize;
      const particle = particles[slot];
      const seed = now * 431 + slot * 23 + index * 13;
      particle.x = position.x;
      particle.y = position.y;
      particle.z = position.z;
      particle.vx = Math.sin(seed * 1.7) * 0.16;
      particle.vy = 0.28 + (Math.sin(seed * 2.3) + 1) * 0.12;
      particle.vz = Math.cos(seed * 2.1) * 0.16;
      particle.born = now;
      particle.lifetime = 0.34 + (index % 2) * 0.08;
      particle.size = 0.075 + (index % 2) * 0.018;
      particle.bounce = false;
      particleMesh.setColorAt(slot, new THREE.Color(index % 2 ? "#8d8375" : "#b1a18c"));
    }
    if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;
  };

  const spawnCasing = (position: THREE.Vector3, now: number, yaw: number) => {
    const activePoolSize = getWarRoomQualityProfile(quality).maxActiveParticles;
    if (getWarRoomEffectCount(1, quality) === 0) return;
    const slot = particleCursor.current++ % activePoolSize;
    const particle = particles[slot];
    particle.x = position.x + Math.cos(yaw) * 0.12;
    particle.y = Math.max(0.3, position.y - 0.55);
    particle.z = position.z + Math.sin(yaw) * 0.12;
    particle.vx = Math.cos(yaw) * 0.42 + 0.1;
    particle.vy = 1.05;
    particle.vz = Math.sin(yaw) * 0.42;
    particle.born = now;
    particle.lifetime = 0.98;
    particle.size = 0.032;
    particle.bounce = true;
    particleMesh.setColorAt(slot, new THREE.Color("#c5b698"));
    if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;
  };

  const addBulletHole = (position: THREE.Vector3, incomingDirection: THREE.Vector3, now: number) => {
    const slot = decalCursor.current++ % WAR_ROOM_DECAL_POOL_SIZE;
    const decal = decalState[slot];
    decal.kind = "bullet";
    decal.born = now;
    crackMesh.setMatrixAt(slot, hiddenDecalTransform.matrix);
    decalNormal.copy(incomingDirection).negate().normalize();
    decalTransform.position.copy(position).addScaledVector(decalNormal, 0.009);
    decalTransform.quaternion.setFromUnitVectors(decalForward, decalNormal);
    decalTransform.scale.setScalar(0.75 + (Math.sin(now * 29 + slot) + 1) * 0.16);
    decalTransform.updateMatrix();
    decalMesh.setMatrixAt(slot, decalTransform.matrix);
    decalMesh.setColorAt(slot, WAR_ROOM_DECAL_COLORS[slot % WAR_ROOM_DECAL_COLORS.length]);
    decalMesh.instanceMatrix.needsUpdate = true;
    if (decalMesh.instanceColor) decalMesh.instanceColor.needsUpdate = true;
    crackMesh.instanceMatrix.needsUpdate = true;
  };

  const addCrackDecal = (position: THREE.Vector3, yaw: number, now: number) => {
    const slot = decalCursor.current++ % WAR_ROOM_DECAL_POOL_SIZE;
    const decal = decalState[slot];
    decal.kind = "crack";
    decal.x = position.x;
    decal.z = position.z;
    decal.yaw = yaw;
    decal.scale = 1.35 + (Math.sin(now * 17 + slot) + 1) * 0.12;
    decal.born = now;
    decalMesh.setMatrixAt(slot, hiddenDecalTransform.matrix);
    decalTransform.position.set(position.x, 0.018, position.z);
    decalTransform.rotation.set(-Math.PI / 2, 0, yaw);
    decalTransform.scale.setScalar(decal.scale);
    decalTransform.updateMatrix();
    crackMesh.setMatrixAt(slot, decalTransform.matrix);
    crackTint.set(slot % 2 ? "#865740" : "#ad7652");
    crackMesh.setColorAt(slot, crackTint);
    crackMesh.instanceMatrix.needsUpdate = true;
    if (crackMesh.instanceColor) crackMesh.instanceColor.needsUpdate = true;
    decalMesh.instanceMatrix.needsUpdate = true;
  };

  const spawnShockwave = (
    position: THREE.Vector3,
    yaw: number,
    now: number,
    color = "#ffd27e",
    maxScale = 2.4,
  ) => {
    const slot = shockwaveCursor.current++ % WAR_ROOM_SHOCKWAVE_POOL_SIZE;
    const shockwave = shockwaves[slot];
    shockwave.x = position.x;
    shockwave.z = position.z;
    shockwave.yaw = yaw;
    shockwave.born = now;
    shockwave.color = color;
    shockwave.maxScale = maxScale;
    shockwaveTint.set(shockwave.color);
    shockwaveMesh.setColorAt(slot, shockwaveTint);
    if (shockwaveMesh.instanceColor) shockwaveMesh.instanceColor.needsUpdate = true;
  };

  const addTracer = (start: THREE.Vector3, end: THREE.Vector3, color: string, now: number, lifetime = 0.08) => {
    const slot = tracerState.cursor++ % WAR_ROOM_TRACER_POOL_SIZE;
    const offset = slot * 6;
    tracerState.positions.set([start.x, start.y, start.z, end.x, end.y, end.z], offset);
    const tint = new THREE.Color(color);
    tracerState.colors.set([tint.r, tint.g, tint.b, tint.r, tint.g, tint.b], offset);
    tracerState.expires[slot] = now + lifetime;
    tracerState.geometry.attributes.position.needsUpdate = true;
    tracerState.geometry.attributes.color.needsUpdate = true;
  };

  const addProjectile = (start: THREE.Vector3, end: THREE.Vector3, color: string, now: number) => {
    const slot = projectileCursor.current++ % WAR_ROOM_PROJECTILE_POOL_SIZE;
    const projectile = projectiles[slot];
    projectile.start.copy(start);
    projectile.end.copy(end);
    projectile.born = now;
    projectile.lifetime = Math.max(0.12, Math.min(0.62, start.distanceTo(end) / 48));
    projectile.color = color;
    const tint = new THREE.Color(color);
    projectileShafts.setColorAt(slot, tint);
    projectileHeads.setColorAt(slot, tint);
    if (projectileShafts.instanceColor) projectileShafts.instanceColor.needsUpdate = true;
    if (projectileHeads.instanceColor) projectileHeads.instanceColor.needsUpdate = true;
  };

  const getAimHit = (x: number, y: number, range: number) => {
    raycaster.setFromCamera(ndc.set(x, y), perspective);
    const origin = raycaster.ray.origin;
    const rayDirection = raycaster.ray.direction;
    const rayEnd = aimRayEnd.copy(origin).addScaledVector(rayDirection, range);
    const blockedAt = segmentBlockFraction(
      origin,
      rayEnd,
      0,
      activeBlockersRef.current,
    );
    const result = traceWarRoomRay(
      origin,
      rayDirection,
      runtimeRef.current.enemies,
      range,
      blockedAt,
    );
    return {
      enemy: result.target,
      index: result.targetIndex,
      point: aimImpactPoint.set(result.point.x, result.point.y, result.point.z),
      headshot: result.headshot,
      blocked: result.blocked,
    };
  };

  const isMeleeTargetBlocked = (player: WarRoomRuntime["player"], enemy: WarRoomEnemy) => (
    Math.abs((enemy.floorHeight ?? 0) - player.floorHeight) > 1.05
    || segmentBlockFraction(
      {
        x: player.x,
        y: player.floorHeight + player.jumpHeight + (player.crouched ? 1.05 : 1.12),
        z: player.z,
      },
      {
        x: enemy.x,
        y: (enemy.floorHeight ?? 0) + (enemy.commander ? 1.35 : 1.05),
        z: enemy.z,
      },
      0.08,
      activeBlockersRef.current,
    ) !== null
  );

  const getMeleeAimHit = (range: number, attackYaw: number) => {
    const player = runtimeRef.current.player;
    meleeOrigin.set(
      player.x,
      player.floorHeight + player.jumpHeight + (player.crouched ? 1.05 : 1.12),
      player.z,
    );
    const directionX = Math.sin(attackYaw);
    const directionZ = -Math.cos(attackYaw);
    const result = traceWarRoomMeleeCone(
      { x: meleeOrigin.x, z: meleeOrigin.z },
      { x: directionX, z: directionZ },
      runtimeRef.current.enemies,
      range,
      WAR_ROOM_MELEE_HALF_ANGLE_DEGREES,
      (enemy) => isMeleeTargetBlocked(player, enemy),
    );
    if (result.target) {
      meleeImpact.set(
        result.target.x,
        (result.target.floorHeight ?? player.floorHeight) + (result.target.commander ? 1.35 : 1.05),
        result.target.z,
      );
    } else {
      meleeImpact.set(
        meleeOrigin.x + directionX * Math.min(range, Number.isFinite(result.distance) ? result.distance : range),
        meleeOrigin.y,
        meleeOrigin.z + directionZ * Math.min(range, Number.isFinite(result.distance) ? result.distance : range),
      );
    }
    return {
      enemy: result.target,
      point: meleeImpact,
      reason: result.reason,
      distance: result.distance,
      angleDegrees: result.angleDegrees,
      range,
    };
  };

  const applyKillRecovery = (player: WarRoomRuntime["player"], commander: boolean, now: number) => {
    const healed = applyWarRoomKillHeal(player, commander, RESTORE_CONFIG);
    if (healed <= 0) return;
    player.lastHitSource = null;
    player.lastHitDamage = 0;
    player.lastHitText = `+${Math.round(healed)} CAN`;
    player.hitMessageUntil = now + 1.35;
  };

  const resolveMeleeContact = (now: number, wallNow: number) => {
    const runtime = runtimeRef.current;
    const player = runtime.player;
    if (!player.meleeHitPending || now < player.meleeHitAt) return;
    player.meleeHitPending = false;
    const weaponId = player.meleeAttackWeaponId;
    const weapon = weaponId ? WAR_ROOM_WEAPON_BY_ID.get(weaponId) : undefined;
    if (!weapon || weapon.weaponClass !== "melee") return;

    const meleeReach = getWarRoomMeleeEffectiveReach(
      weapon.id,
      weapon.range,
      player.meleeAttackRangeBonus,
    );
    const impact = getMeleeAimHit(meleeReach, player.meleeAttackYaw);
    const enemy = impact.enemy;
    if (!enemy) {
      const distance = Number.isFinite(impact.distance) ? `${impact.distance.toFixed(2)} m` : "—";
      const missMessage = impact.reason === "range"
        ? `ISKA: menzil dışı (mesafe ${distance}, menzil ${impact.range.toFixed(2)} m)`
        : impact.reason === "angle"
          ? `ISKA: açı dışı (${impact.angleDegrees?.toFixed(1) ?? "?"}°, mesafe ${distance})`
          : impact.reason === "blocked"
            ? `ISKA: engel (mesafe ${distance})`
            : "ISKA: hedef yok";
      player.meleeLastResult = missMessage;
      if (debugMode) {
        const missMessages: Record<WarRoomMeleeConeReason, string> = {
          hit: "ISKA: hedef yok",
          range: `ISKA: menzil dışı (mesafe ${distance}, menzil ${impact.range.toFixed(2)} m)`,
          angle: `ISKA: açı dışı (${impact.angleDegrees?.toFixed(1) ?? "?"}°, mesafe ${distance})`,
          blocked: `ISKA: engel (mesafe ${distance})`,
          "no-target": "ISKA: hedef yok",
        };
        onMeleeDebugUpdate(missMessages[impact.reason]);
      }
      return;
    }

    const damage = applyWarRoomDamage(enemy, weapon.damage, player.meleeAttackDamageMultiplier);
    enemy.hitUntil = now + player.meleeAttackStaggerSeconds;
    enemy.hitFlashUntil = WAR_ROOM_REACTION_FEEDBACK_ENABLED
      ? now + WAR_ROOM_ENEMY_HIT_FLASH_SECONDS
      : 0;
    enemy.hitKneeUntil = WAR_ROOM_REACTION_FEEDBACK_ENABLED && player.meleeAttackHeavy
      ? now + Math.min(0.38, player.meleeAttackStaggerSeconds)
      : 0;
    const knockbackLength = Math.max(0.001, Math.hypot(enemy.x - player.x, enemy.z - player.z));
    const visualKnockback = WAR_ROOM_REACTION_FEEDBACK_ENABLED
      ? getWarRoomVisualKnockbackDistance(weaponId ?? "melee_knife", player.meleeAttackHeavy)
      : 0;
    enemy.hitKnockbackX = ((enemy.x - player.x) / knockbackLength) * visualKnockback;
    enemy.hitKnockbackZ = ((enemy.z - player.z) / knockbackLength) * visualKnockback;
    player.hits += 1;
    player.lastHitDamage = damage.damage;
    player.lastHitSource = "dealt";
    player.damageEventId += 1;
    player.lastHitCritical = player.meleeAttackHeavy;
    player.lastHitText = `${enemy.name} · −${damage.damage} CAN`;
    player.hitMessageUntil = now + 0.82;
    player.hitMarkerUntil = now + 0.24;
    player.hitMarkerHeadshot = player.meleeAttackHeavy;
    player.meleeHitStopUntil = Math.max(
      player.meleeHitStopUntil,
      wallNow + player.meleeAttackHitStopSeconds,
    );
    player.meleeLastResult = `${player.meleeAttackHeavy ? "Güçlü" : "Hafif"} isabet · −${damage.damage}`;
    cameraKickRef.current = Math.max(cameraKickRef.current, player.meleeAttackHeavy ? 0.052 : 0.034);
    cameraFovKickRef.current = Math.min(
      4.2,
      cameraFovKickRef.current + (player.meleeAttackHeavy ? 3.8 : 2.2),
    );
    cameraSideKickRef.current = Math.max(
      -0.025,
      Math.min(0.025, cameraSideKickRef.current + Math.sin(now * 37.7) * 0.012),
    );
    const impactSurface = enemy.commander ? "metal" : "flesh";
    for (const cue of getWarRoomMeleeImpactCues(player.meleeAttackHeavy)) {
      playWarRoomSound(
        cue,
        cue === "critical-hit" ? 0.42 : 1,
        "rifle",
        getWarRoomAudioOptions(
          player,
          enemy.x,
          enemy.z,
          impactSurface,
          player.meleeAttackHeavy,
          weaponId ?? undefined,
        ),
      );
    }
    const effects = getWarRoomImpactFxProfile(
      bloodEffects,
      player.meleeAttackHeavy,
      impactSurface,
      weaponId ?? "melee_knife",
    );
    if (WAR_ROOM_POOLED_FX_ENABLED) {
      if (effects.bloodParticles > 0) {
        spawnImpact(impact.point, "#d33d50", now, effects.bloodParticles, 0.045);
      }
      if (effects.exitSplashParticles > 0) {
        const thrustX = Math.sin(player.meleeAttackYaw);
        const thrustZ = -Math.cos(player.meleeAttackYaw);
        const splashPoint = impactPointScratch.copy(impact.point).add(
          impactBiasScratch.set(thrustX * 0.18, 0, thrustZ * 0.18),
        );
        const splashColor = effects.bloodParticles > 0 ? "#b82e3b" : effects.flashColor;
        spawnImpact(
          splashPoint,
          splashColor,
          now,
          effects.exitSplashParticles,
          0.04,
          impactBiasScratch.set(thrustX * 0.55, 0.16, thrustZ * 0.55),
        );
      }
      if (effects.sparkParticles > 0) {
        spawnImpact(impact.point, effects.sparkColor, now, effects.sparkParticles, 0.05);
      }
      if (effects.flashParticles > 0) {
        spawnImpact(
          impact.point,
          effects.flashColor,
          now,
          effects.flashParticles,
          0.07,
          impactBiasScratch.set(0, 0.18, 0),
        );
      }
      const impactFloorHeight = enemy.floorHeight ?? player.floorHeight;
      meleeOrigin.set(impact.point.x, impactFloorHeight + 0.045, impact.point.z);
      if (effects.dustParticles > 0) {
        if (effects.dustRing) {
          spawnImpactDustRing(meleeOrigin, now, effects.dustColor, effects.dustParticles + 5);
        } else {
          spawnImpactDust(meleeOrigin, now, effects.dustParticles, effects.dustColor);
        }
      }
      if (effects.shockwave) {
        meleeOrigin.set(impact.point.x, impactFloorHeight + 0.035, impact.point.z);
        spawnShockwave(meleeOrigin, player.meleeAttackYaw, now, effects.flashColor);
      }
      if (effects.crackDecal) {
        meleeOrigin.set(impact.point.x, impactFloorHeight, impact.point.z);
        addCrackDecal(meleeOrigin, player.meleeAttackYaw, now);
      }
    }
    if (debugMode) {
      const activeParticles = countActiveWarRoomParticles(particles, now);
      const poolLimit = getWarRoomQualityProfile(quality).maxActiveParticles;
      const visualReport = WAR_ROOM_POOLED_FX_ENABLED
        ? `EFEKT: ${effects.impactType} · İZ: ${effects.trailStyle} · HAVUZ: ${activeParticles}/${poolLimit}`
        : "EFEKT: kapalı";
      onMeleeDebugUpdate(`İSABET: ${enemy.name}, −${damage.damage} · ${visualReport}`);
    }
    if (damage.killed) {
      enemy.alive = false;
      enemy.deathYaw = player.meleeAttackYaw;
      player.kills += 1;
      applyKillRecovery(player, enemy.commander, now);
      player.killFeed = [
        { id: now * 1000 + player.kills, text: `Yolcu  →  ${enemy.name}` },
        ...player.killFeed,
      ].slice(0, 4);
    }
  };

  const fireWeapon = (now: number, charge = 1, meleeHoldSeconds = 0) => {
    const runtime = runtimeRef.current;
    const player = runtime.player;
    const weaponId = player.weaponSlots[player.activeSlot];
    const weapon = WAR_ROOM_WEAPON_BY_ID.get(weaponId)!;
    if (now < player.nextShotAt || player.reloadingWeapon) return;
    if (weapon.weaponClass === "melee") {
      player.lastCombatAt = now;
      const comboExpired = player.meleeComboLastAttackAt < 0
        || now - player.meleeComboLastAttackAt > 1.15;
      if (comboExpired) {
        player.meleeComboIndex = 0;
        player.meleeComboCount = 0;
      }
      const plan = getWarRoomMeleeAttackPlan(
        meleeHoldSeconds,
        player.meleeComboIndex,
        WAR_ROOM_COMBAT_FEEL_ENABLED,
      );
      const duration = Math.min(
        weapon.fireInterval,
        (weapon.meleeDuration ?? weapon.fireInterval * 0.82) * plan.durationMultiplier,
      );
      player.strafeUntil = getWarRoomPostAttackStrafeUntil(now, duration);
      const attackRangeBonus = plan.heavy ? 0.12 : 0;
      const attackReach = getWarRoomMeleeEffectiveReach(weapon.id, weapon.range, attackRangeBonus);
      const isBlocked = (enemy: WarRoomEnemy) => isMeleeTargetBlocked(player, enemy);
      const attackYaw = WAR_ROOM_COMBAT_FEEL_ENABLED
        ? getWarRoomMeleeAssistYaw(player.x, player.z, player.facingYaw, runtime.enemies, attackReach, isBlocked)
        : player.facingYaw;
      const lunged = moveWarRoomEntity(
        player.x,
        player.z,
        Math.sin(attackYaw) * plan.lungeMeters,
        -Math.cos(attackYaw) * plan.lungeMeters,
        WAR_ROOM_PLAYER_COLLISION_RADIUS,
        activeBlockersRef.current,
        player.floorHeight,
        player.jumpHeight,
      );
      player.x = lunged.x;
      player.z = lunged.z;
      player.stamina = Math.max(0, player.stamina - plan.staminaCost);
      player.nextShotAt = now + weapon.fireInterval;
      player.meleeStartedAt = now;
      player.meleeDuration = duration;
      player.meleeUntil = now + duration;
      player.shotFeedbackUntil = now + duration;
      player.meleeHitAt = now + duration * 0.55;
      player.meleeHitPending = true;
      player.meleeAttackWeaponId = weaponId;
      player.meleeAttackYaw = attackYaw;
      player.meleeAttackComboIndex = plan.comboIndex;
      player.meleeAttackHeavy = plan.heavy;
      player.meleeAttackDamageMultiplier = plan.damageMultiplier;
      player.meleeAttackRangeBonus = attackRangeBonus;
      player.meleeAttackHitStopSeconds = plan.hitStopSeconds;
      player.meleeAttackStaggerSeconds = plan.staggerSeconds;
      player.meleeComboIndex = plan.nextComboIndex;
      player.meleeComboCount = plan.heavy ? 0 : plan.comboIndex + 1;
      player.meleeComboLastAttackAt = now;
      const performanceSample = meleePerformanceRef.current;
      const attackAtMs = performance.now();
      if (performanceSample.started) {
        const attackGapMs = Math.max(0, attackAtMs - performanceSample.lastAttackAtMs);
        performanceSample.largestAttackGapMs = Math.max(performanceSample.largestAttackGapMs, attackGapMs);
      } else {
        performanceSample.started = true;
        performanceSample.startedAtMs = attackAtMs;
        performanceSample.lastFrameAtMs = attackAtMs;
        performanceSample.baselineGeometries = gl.info.memory.geometries;
        performanceSample.baselineTextures = gl.info.memory.textures;
      }
      performanceSample.lastAttackAtMs = attackAtMs;
      performanceSample.started = true;
      performanceSample.attackCount += 1;
      player.meleeLastResult = plan.heavy
        ? "Güçlü saldırı · hazırlık"
        : `Hafif saldırı · kombo ${plan.comboIndex + 1}/3`;
      playWarRoomSound(
        "melee-swing",
        1,
        "rifle",
        getWarRoomAudioOptions(player, player.x, player.z, undefined, plan.heavy, weaponId),
      );
      player.shots += 1;
      player.lastHitDamage = 0;
      player.lastHitCritical = false;
      player.hitMarkerUntil = 0;
      player.hitMarkerHeadshot = false;
      cameraKickRef.current = Math.max(cameraKickRef.current, plan.heavy ? 0.028 : 0.014);
      cameraSideKickRef.current = Math.max(
        -0.02,
        Math.min(0.02, cameraSideKickRef.current + Math.sin(now * 37.7) * 0.012),
      );
      if (debugMode) {
        onMeleeDebugUpdate(`${plan.heavy ? "GÜÇLÜ" : "HAZIRLIK"} · KOMBO ${plan.heavy ? 0 : plan.comboIndex + 1}/3`);
      }
      return;
    }
    const ammo = player.ammo[weaponId];
    if (!ammo || ammo.magazine <= 0) {
      if (now >= emptyClickAtRef.current) {
        playWarRoomSound("empty", 1, "rifle", getWarRoomAudioOptions(player, player.x, player.z));
        player.lastHitSource = null;
        player.lastHitDamage = 0;
        player.lastHitText = "CEPHANE BİTTİ · YENİDEN DOLDUR";
        player.hitMessageUntil = now + 1.1;
        emptyClickAtRef.current = now + 0.45;
      }
      return;
    }
    player.nextShotAt = now + weapon.fireInterval;
    player.strafeUntil = getWarRoomPostAttackStrafeUntil(now);
    const shotStyle: WarRoomShotStyle = weapon.weaponClass === "shotgun" || weaponId === "scattergun"
      ? "shotgun"
      : weapon.weaponClass === "pistol" || weaponId === "sidearm"
        ? "pistol"
        : "rifle";
    playWarRoomSound(
      weaponId === "longbow" || weaponId === "crossbow" ? "bow" : "shot",
      1,
      shotStyle,
      getWarRoomAudioOptions(player, player.x, player.z),
    );
    ammo.magazine -= 1;
    player.shots += 1;
    player.lastCombatAt = now;
    player.lastHitDamage = 0;
    player.lastHitCritical = false;
    player.hitMarkerUntil = 0;
    player.hitMarkerHeadshot = false;
    player.shotFlashUntil = now + 0.06;
    player.shotFeedbackUntil = now + 0.2;
    player.recoil = Math.min(0.17, player.recoil + weapon.recoil);
    cameraKickRef.current = Math.min(0.16, cameraKickRef.current + 0.045 + weapon.recoil * 0.4);
    cameraSideKickRef.current = Math.max(
      -0.025,
      Math.min(0.025, cameraSideKickRef.current + Math.sin(now * 37.7) * 0.004),
    );

    const pellets = weapon.pellets ?? 1;
    const spread = weapon.spread + player.recoil * 0.18;
    let shotHit = false;
    let shotHeadshot = false;
    const muzzle = muzzleScratch;
    const muzzleAnchor = playerMuzzleRef.current;
    if (muzzleAnchor) {
      muzzleAnchor.updateWorldMatrix(true, false);
      muzzleAnchor.getWorldPosition(muzzle);
    } else {
      muzzle.set(
        player.x + Math.cos(player.yaw) * 0.38 + Math.sin(player.yaw) * 0.25,
        player.floorHeight + 1.36 + player.jumpHeight,
        player.z - Math.sin(player.yaw) * 0.38 + Math.cos(player.yaw) * 0.25,
      );
    }
    if (playerMuzzleFlashRef.current) {
      const flash = playerMuzzleFlashRef.current;
      flash.visible = true;
      const seed = now * 91.7;
      const scale = 0.8 + (Math.sin(seed) + 1) * 0.24;
      flash.scale.setScalar(scale);
      flash.rotation.z = Math.sin(seed * 1.3) * 0.65;
      flash.userData.warRoomExpiresAt = now + 0.06;
    }
    spawnMuzzleSmoke(muzzle, now);
    if (weaponId !== "longbow" && weaponId !== "crossbow") spawnCasing(muzzle, now, player.yaw);
    const tracerEnd = tracerEndScratch;
    const chargeMultiplier = weapon.charge ? 0.65 + charge * 0.55 : 1;
    for (let pellet = 0; pellet < pellets; pellet += 1) {
      const spreadX = (nextWarRoomRandom(runtime) - 0.5) * spread;
      const spreadY = (nextWarRoomRandom(runtime) - 0.5) * spread;
      const aim = getAimHit(spreadX, spreadY, weapon.range);
      const aimedEnemy = aim.enemy;
      if (aimedEnemy) {
        const damage = applyWarRoomDamage(
          aimedEnemy,
          weapon.damage * chargeMultiplier,
          aim.headshot ? weapon.headshotMultiplier : 1,
        );
        aimedEnemy.hitUntil = now + 0.22;
        aimedEnemy.hitFlashUntil = WAR_ROOM_REACTION_FEEDBACK_ENABLED
          ? now + WAR_ROOM_ENEMY_HIT_FLASH_SECONDS
          : 0;
        aimedEnemy.hitKneeUntil = 0;
        const knockbackLength = Math.max(0.001, Math.hypot(aimedEnemy.x - player.x, aimedEnemy.z - player.z));
        const bulletKnockback = WAR_ROOM_REACTION_FEEDBACK_ENABLED ? 0.3 : 0;
        aimedEnemy.hitKnockbackX = ((aimedEnemy.x - player.x) / knockbackLength) * bulletKnockback;
        aimedEnemy.hitKnockbackZ = ((aimedEnemy.z - player.z) / knockbackLength) * bulletKnockback;
        shotHit = true;
        shotHeadshot ||= aim.headshot;
        player.lastHitDamage += damage.damage;
        player.lastHitSource = "dealt";
        player.damageEventId += 1;
        player.lastHitCritical ||= aim.headshot;
        player.lastHitText = `${aimedEnemy.name} · −${damage.damage}${aim.headshot ? " · KAFA" : ""}`;
        player.hitMessageUntil = now + 0.72;
        player.hitMarkerUntil = now + 0.18;
        player.hitMarkerHeadshot = aim.headshot;
        if (damage.killed) {
          aimedEnemy.alive = false;
          aimedEnemy.deathYaw = Math.atan2(
            aimedEnemy.x - player.x,
            -(aimedEnemy.z - player.z),
          );
          player.kills += 1;
          applyKillRecovery(player, aimedEnemy.commander, now);
          if (aim.headshot) player.headshots += 1;
          player.killFeed = [
            { id: now * 1000 + player.kills, text: `Yolcu  →  ${aimedEnemy.name}${aim.headshot ? " · KAFA" : ""}` },
            ...player.killFeed,
          ].slice(0, 4);
        }
        tracerEnd.copy(aim.point);
        if (WAR_ROOM_POOLED_FX_ENABLED) {
          const effects = getWarRoomImpactFxProfile(
            bloodEffects,
            false,
            aimedEnemy.commander ? "metal" : "flesh",
            weaponId,
          );
          if (effects.bloodParticles > 0) {
        spawnImpact(aim.point, "#d33d50", now, effects.bloodParticles, 0.045);
          }
          if (effects.sparkParticles > 0) {
            spawnImpact(aim.point, effects.sparkColor, now, effects.sparkParticles, 0.05);
          }
          if (effects.flashParticles > 0) {
            spawnImpact(
              aim.point,
              effects.flashColor,
              now,
              effects.flashParticles,
              0.06,
              impactBiasScratch.set(0, 0.14, 0),
            );
          }
          if (effects.dustParticles > 0) {
            spawnImpactDust(
              meleeOrigin.set(aim.point.x, aim.point.y, aim.point.z),
              now,
              effects.dustParticles,
              effects.dustColor,
            );
          }
          if (debugMode) {
            const activeParticles = countActiveWarRoomParticles(particles, now);
            const poolLimit = getWarRoomQualityProfile(quality).maxActiveParticles;
            onMeleeDebugUpdate(
              `İSABET: ${aimedEnemy.name}, −${damage.damage} · EFEKT: ${effects.impactType}`
              + ` · HAVUZ: ${activeParticles}/${poolLimit}`,
            );
          }
        }
      } else {
        tracerEnd.copy(aim.point);
        if (aim.blocked) {
          if (WAR_ROOM_POOLED_FX_ENABLED) {
            spawnImpact(tracerEnd, "#b99870", now, 7, 0.055);
            spawnImpactDust(tracerEnd, now);
            if (pellet === 0) addBulletHole(tracerEnd, raycaster.ray.direction, now);
          }
        }
      }
      if (pellet === 0 || aimedEnemy) {
        if (weaponId === "crossbow" || weaponId === "longbow") {
          addProjectile(muzzle, tracerEnd, weapon.color, now);
        } else {
          addTracer(muzzle, tracerEnd, weapon.color, now);
        }
      }
    }
    if (!weapon.charge && weaponId !== "crossbow") {
      spawnImpact(
        impactPointScratch.copy(muzzle).add(impactBiasScratch.set(0.08, 0.015, 0)),
        "#c6a360",
        now,
        2,
        0.025,
        impactBiasScratch.set(0.7, 0.15, 0.15),
      );
    }
    if (shotHit) {
      player.hits += 1;
      if (shotHeadshot && !player.killFeed.some((entry) => entry.id === now * 1000 + player.kills)) player.headshots += 1;
      playWarRoomSound(
        shotHeadshot ? "critical-hit" : "hit",
        shotHeadshot ? 0.82 : 0.46,
        shotStyle,
        getWarRoomAudioOptions(player, player.x, player.z, "flesh"),
      );
    }
  };

  useFrame((frame, rawDelta) => {
    const runtime = runtimeRef.current;
    if (fallRuntimeRef.current !== runtime) {
      fallRuntimeRef.current = runtime;
      fallStartHeightRef.current = null;
      previousJumpHeightRef.current = runtime.player.jumpHeight;
    }
    const player = runtime.player;
    const input = inputRef.current;
    if (input.paused) return;
    try {
    const lookDeltaX = input.lookDeltaX;
    const lookDeltaY = input.lookDeltaY;
    input.lookDeltaX = 0;
    input.lookDeltaY = 0;
    const boundedLookDelta = clampWarRoomLookDelta(lookDeltaX, lookDeltaY);
    if (boundedLookDelta) {
      lastLookDeltaRef.current = { dx: boundedLookDelta.dx, dy: boundedLookDelta.dy };
      const sensitivity = getWarRoomPointerSensitivity(
        size.width,
        size.height,
        readWarRoomLookSensitivitySettings(),
      );
      const fovScale = perspective.fov / 75;
      applyWarRoomLookDelta(
        input,
        boundedLookDelta.dx,
        boundedLookDelta.dy,
        { x: sensitivity.x * fovScale, y: sensitivity.y * fovScale },
        input.lookPointerType,
      );
      input.cameraTargetYaw = input.yaw;
      if (input.movementBaseYaw !== null) {
        input.movementBaseYaw = rebaseWarRoomJoystick(mobileControlsRef.current, input.yaw);
      }
    }
    const wallNow = frame.clock.elapsedTime;
    const renderStatsNow = collectPerformanceMetrics ? performance.now() : 0;
    if (collectPerformanceMetrics) {
      const canvasForReport = gl.domElement;
      let activeBotsForReport = 0;
      for (let index = 0; index < runtime.enemies.length; index += 1) {
        if (runtime.enemies[index]?.alive) activeBotsForReport += 1;
      }
      if (rendererNameForReportRef.current === null) {
        try {
          const context = gl.getContext();
          const rendererExtension = context.getExtension("WEBGL_debug_renderer_info") as
            | { UNMASKED_RENDERER_WEBGL: number }
            | null;
          const rendererValue = rendererExtension
            ? context.getParameter(rendererExtension.UNMASKED_RENDERER_WEBGL)
            : context.getParameter(context.RENDERER);
          rendererNameForReportRef.current = typeof rendererValue === "string"
            ? rendererValue
            : "unknown";
        } catch {
          rendererNameForReportRef.current = "unavailable";
        }
      }
      recordWarRoomPerformanceFrame(
        warRoomPerformanceCollector,
        renderStatsNow,
        gl.info.render.calls,
        gl.info.render.triangles,
        gl.info.memory.geometries,
        gl.info.memory.textures,
        gl.getPixelRatio(),
        canvasForReport.width,
        canvasForReport.height,
        activeBotsForReport,
        quality,
        runtime.room.name,
        rendererNameForReportRef.current,
        typeof window === "undefined" ? 1 : window.devicePixelRatio,
      );
    }
    if ((debugMode || debugDiagnosticsEnabled) && renderStatsNow - renderStatsAtRef.current >= 250) {
      renderStatsAtRef.current = renderStatsNow;
      // R3F's automatic render completed the preceding frame before this sample.
      onRenderStats(getWarRoomFrameStats(
        gl.info.render.calls,
        rawDelta,
        gl.info.render.triangles,
      ));
    }
    if (
      WAR_ROOM_LAST_ENEMY_CINEMATIC_ENABLED
      && runtime.enemies.length > 0
      && runtime.mission.mode !== "treasure"
      && getWarRoomRemaining(runtime) === 0
      && victoryCinematicStartedAtRef.current === null
    ) {
      victoryCinematicStartedAtRef.current = wallNow;
    }
    const cinematicStartedAt = victoryCinematicStartedAtRef.current;
    const cinematicElapsed = cinematicStartedAt === null ? 0 : wallNow - cinematicStartedAt;
    const delta = Math.min(rawDelta, 0.05)
      * (WAR_ROOM_LAST_ENEMY_CINEMATIC_ENABLED
        && cinematicStartedAt !== null
        && cinematicElapsed < WAR_ROOM_LAST_ENEMY_SLOW_MOTION_SECONDS
        ? 0.25
        : 1);
    const qualityProfile = getWarRoomQualityProfile(quality);
    const performanceSample = meleePerformanceRef.current;
    if (debugMode && performanceSample.started && !performanceSample.reported) {
      const frameAtMs = performance.now();
      const frameGapMs = Math.max(0, frameAtMs - performanceSample.lastFrameAtMs);
      const elapsed = Math.min(frameGapMs, 1_000);
      performanceSample.lastFrameAtMs = frameAtMs;
      performanceSample.elapsedMs += elapsed;
      performanceSample.sampleElapsedMs += elapsed;
      performanceSample.poolSampleElapsedMs += elapsed;
      performanceSample.totalFrames += 1;
      performanceSample.sampleFrames += 1;
      if (performanceSample.sampleElapsedMs >= 1_000) {
        performanceSample.minFps = Math.min(
          performanceSample.minFps,
          performanceSample.sampleFrames * 1_000 / performanceSample.sampleElapsedMs,
        );
        performanceSample.sampleFrames = 0;
        performanceSample.sampleElapsedMs = 0;
      }
      if (performanceSample.poolSampleElapsedMs >= 500) {
        performanceSample.peakActiveParticles = Math.max(
          performanceSample.peakActiveParticles,
          countActiveWarRoomParticles(particles, player.clockTime),
        );
        performanceSample.peakOccupiedDecals = Math.max(
          performanceSample.peakOccupiedDecals,
          countOccupiedWarRoomDecals(decalState),
        );
        performanceSample.poolSampleElapsedMs = 0;
      }
      if (performanceSample.elapsedMs >= WAR_ROOM_PERFORMANCE_SAMPLE_MS) {
        const averageFps = performanceSample.totalFrames * 1_000 / performanceSample.elapsedMs;
        const finalAttackGapMs = Math.max(0, frameAtMs - performanceSample.lastAttackAtMs);
        const continuousAttacks = isWarRoomAttackRunContinuous(
          performanceSample.attackCount,
          performanceSample.largestAttackGapMs,
          finalAttackGapMs,
        );
        const geometryCount = gl.info.memory.geometries;
        const textureCount = gl.info.memory.textures;
        const geometryDelta = performanceSample.baselineGeometries === null
          ? "?"
          : `${geometryCount - performanceSample.baselineGeometries >= 0 ? "+" : ""}${geometryCount - performanceSample.baselineGeometries}`;
        const textureDelta = performanceSample.baselineTextures === null
          ? "?"
          : `${textureCount - performanceSample.baselineTextures >= 0 ? "+" : ""}${textureCount - performanceSample.baselineTextures}`;
        onMeleeDebugUpdate(
          `60 SN · ${continuousAttacks ? "KESİNTİSİZ SALDIRI OK" : "KESİNTİSİZ SALDIRI YOK"} · `
          + `${performanceSample.attackCount} vuruş, en uzun ara ${Math.round(performanceSample.largestAttackGapMs)} ms, `
          + `son ara ${Math.round(finalAttackGapMs)} ms · `
          + `${averageFps.toFixed(1)} ort / ${performanceSample.minFps.toFixed(1)} min FPS · `
          + `HARİTA ${runtime.room.layoutName} · ÇAĞRI ${gl.info.render.calls}/${WAR_ROOM_DRAW_CALL_BUDGET} · `
          + `FX ${performanceSample.peakActiveParticles}/${qualityProfile.maxActiveParticles}, `
          + `decal ${performanceSample.peakOccupiedDecals}/${WAR_ROOM_DECAL_POOL_SIZE} · `
          + `GPU ${geometryCount} geo (${geometryDelta}), ${textureCount} doku (${textureDelta}) · ${quality}`,
        );
        performanceSample.reported = true;
      }
    }
    if (player.meleeHitStopUntil > wallNow) return;
    player.clockTime += delta;
    const now = player.clockTime;
    if (isWarRoomLowHealth(player.hp, player.maxHp)) {
      if (now >= lowHealthBeatAtRef.current) {
        playWarRoomSound("heartbeat", 0.22, "rifle", getWarRoomAudioOptions(player, player.x, player.z, "flesh"));
        lowHealthBeatAtRef.current = now + 0.88;
      }
    } else {
      lowHealthBeatAtRef.current = 0;
    }
    const restoration = advanceWarRoomPassiveRegen(player, now, delta, RESTORE_CONFIG);
    player.regenerationActive = restoration.active;
    player.regenerationWaitSeconds = restoration.secondsUntilReady;
    player.recoil = Math.max(0, player.recoil - delta * 0.36);
    if (player.startTime === 0) player.startTime = now;
    const keyX = (input.keys.has("d") ? 1 : 0) - (input.keys.has("a") ? 1 : 0);
    const keyY = (input.keys.has("w") ? 1 : 0) - (input.keys.has("s") ? 1 : 0);
    let moveX = input.moveX + keyX;
    let moveY = input.moveY + keyY;
    const inputLength = Math.hypot(moveX, moveY);
    if (inputLength > 1) {
      moveX /= inputLength;
      moveY /= inputLength;
    }
    player.strafeUntil = cancelWarRoomPostAttackStrafeOnMovement(
      player.strafeUntil,
      now,
      moveX,
      moveY,
    );
    const strafeActive = input.aimHeld || now < player.strafeUntil;
    if (input.movementBaseYaw !== null) {
      const autoFollowYaw = getWarRoomMovementCameraYaw(
        input.movementBaseYaw,
        moveX,
        moveY,
        input.aimHeld,
      );
      if (autoFollowYaw !== null) input.cameraTargetYaw = autoFollowYaw;
    }
    const controlCameraAngles = getWarRoomCameraAngles(input.yaw, input.pitch);
    const cameraTargetYaw = getWarRoomCameraAngles(input.cameraTargetYaw, input.pitch).yaw;
    const movementYaw = stepWarRoomYaw(
      controlCameraAngles.yaw,
      cameraTargetYaw,
      delta,
      input.movementBaseYaw === null ? 16 : 9,
    );
    const movementBasisYaw = input.movementBaseYaw ?? movementYaw;
    const priorLookYaw = previousLookYawRef.current;
    if (priorLookYaw !== null && Math.abs(shortestAngleDelta(priorLookYaw, movementYaw)) > Math.PI / 4
      && (debugMode || debugDiagnosticsEnabled)) {
      console.warn("War Room camera yaw changed by more than 45° in one frame.", {
        previousYaw: priorLookYaw,
        currentYaw: movementYaw,
      });
      console.trace("War Room yaw jump source");
    }
    previousLookYawRef.current = movementYaw;
    setWarRoomLook(input, movementYaw, controlCameraAngles.pitch);
    movementBasisYawRef.current = movementBasisYaw;
    player.yaw = player.facingYaw;
    player.pitch = controlCameraAngles.pitch;
    const forwardX = Math.sin(movementBasisYaw);
    const forwardZ = -Math.cos(movementBasisYaw);
    const rightX = Math.cos(movementBasisYaw);
    const rightZ = Math.sin(movementBasisYaw);
    const worldMovement = getWarRoomWorldMovement(moveX, moveY, movementBasisYaw);
    updateWarRoomDoors(runtime, now, input.doorPressed, input.yaw, worldMovement);
    input.doorPressed = false;
    activeBlockersRef.current = getWarRoomActiveBlockers(
      runtime,
      now,
      activeBlockerBufferRef.current,
    );
    const orientation = resolveWarRoomOrientation(
      movementYaw,
      moveX,
      moveY,
      player.facingYaw,
      strafeActive,
      "camera",
    );
    const orientationWeapon = WAR_ROOM_WEAPON_BY_ID.get(player.weaponSlots[player.activeSlot])!;
    const assistedYaw = orientationWeapon.weaponClass === "melee"
      ? WAR_ROOM_COMBAT_FEEL_ENABLED && input.aimHeld && inputLength < 0.12
        ? getWarRoomMeleeAssistYaw(
          player.x,
          player.z,
          orientation.yaw,
          runtime.enemies,
          orientationWeapon.range,
          (enemy) => isMeleeTargetBlocked(player, enemy),
        )
        : orientation.yaw
      : input.aimHeld && input.aimAssistEnabled
        ? getWarRoomRangedAimAssistYaw(
          player.x,
          player.z,
          orientation.yaw,
          runtime.enemies,
          20,
          (enemy) => Math.abs((enemy.floorHeight ?? 0) - player.floorHeight) > 1.25
            || segmentBlockFraction(
              { x: player.x, y: player.floorHeight + 1.35, z: player.z },
              {
                x: enemy.x,
                y: (enemy.floorHeight ?? 0) + (enemy.commander ? 1.35 : 1.05),
                z: enemy.z,
              },
              0,
              activeBlockersRef.current,
            ) !== null,
        )
        : orientation.yaw;
    player.facingYaw = stepWarRoomYaw(player.facingYaw, assistedYaw, delta, 55);
    player.yaw = player.facingYaw;
    player.facingMode = orientation.mode;
    player.joystickAngleDegrees = orientation.joystickAngleDegrees;
    player.facingCamera = orientation.facingCamera;

    if (input.pronePressed) {
      player.prone = !player.prone;
      player.crouched = player.prone;
      input.pronePressed = false;
    }
    if (input.crouchPressed) {
      player.prone = false;
      player.crouched = !player.crouched;
      input.crouchPressed = false;
    }
    if (input.weaponSlotPressed !== null) {
      const requestedSlot = input.weaponSlotPressed;
      if (requestedSlot >= 0 && requestedSlot < weaponIds.length && requestedSlot !== player.activeSlot) {
        player.activeSlot = requestedSlot as 0 | 1;
        player.reloadingWeapon = null;
        player.reloadUntil = 0;
        player.meleeInputPending = false;
        player.meleeComboIndex = 0;
        player.meleeComboCount = 0;
      }
      input.weaponSlotPressed = null;
    }
    if (input.swapPressed) {
      player.activeSlot = player.activeSlot === 0 ? 1 : 0;
      player.reloadingWeapon = null;
      player.reloadUntil = 0;
      player.meleeInputPending = false;
      player.meleeComboIndex = 0;
      player.meleeComboCount = 0;
      input.swapPressed = false;
    }
    if (input.jumpPressed) {
      if (player.jumpHeight <= 0.001) player.jumpVelocity = 5.4;
      input.jumpPressed = false;
    }
    if (input.dodgePressed) {
      if (player.stamina >= 18 && now >= player.dodgeUntil) {
        const dodgeLength = Math.hypot(moveX, moveY);
        const localX = dodgeLength > 0.05 ? moveX / dodgeLength : 0;
        const localY = dodgeLength > 0.05 ? moveY / dodgeLength : -1;
        player.dodgeX = rightX * localX + forwardX * localY;
        player.dodgeZ = rightZ * localX + forwardZ * localY;
        player.stamina = Math.max(0, player.stamina - 18);
        player.dodgeUntil = now + 0.26;
        player.invulnerableUntil = now + 0.18;
      }
      input.dodgePressed = false;
    }

    const sprintIntent = !player.crouched
      && (input.sprintLocked || (Math.abs(moveY) >= 0.93 && Math.abs(moveX) <= 0.34))
      && inputLength >= 0.28;
    const isOnStairs = runtime.room.buildings.some((building) => (
      getWarRoomStairProgress(building, player.x, player.z) !== null
    ));
    const stairSprintRequested = sprintIntent && !isOnStairs && player.stamina > 0;
    player.sprinting = stepWarRoomSprintHysteresis(
      sprintHysteresisRef.current,
      stairSprintRequested,
      now,
      0.15,
    );
    const speed = player.prone ? 1.25
      : player.crouched ? 3.05
        : isOnStairs ? 4
          : player.sprinting ? 8.2
            : 6.1;
    const directionalSpeedScale = getWarRoomDirectionalSpeedScale(moveX, moveY);
    const previousMoveX = player.x;
    const previousMoveZ = player.z;
    const nextPosition = advanceWarRoomFixedMovement(playerMovementClockRef.current, {
      x: player.x,
      z: player.z,
      velocityX: worldMovement.x * speed * directionalSpeedScale,
      velocityZ: worldMovement.z * speed * directionalSpeedScale,
      delta,
      now,
      blockers: activeBlockersRef.current,
      radius: WAR_ROOM_PLAYER_COLLISION_RADIUS,
      floorHeight: player.floorHeight,
      jumpHeight: player.jumpHeight,
      dodge: { x: player.dodgeX, z: player.dodgeZ, until: player.dodgeUntil },
    });
    player.x = nextPosition.x;
    player.z = nextPosition.z;
    const dx = player.x - previousMoveX;
    const dz = player.z - previousMoveZ;
    playerRenderPositionRef.current.x = nextPosition.renderX;
    playerRenderPositionRef.current.z = nextPosition.renderZ;
    const previousFloorHeight = player.floorHeight;
    const previousJumpHeight = player.jumpHeight;
    const nextFloorHeight = getWarRoomFloorHeight(
      player.x,
      player.z,
      player.floorHeight,
      runtime.room.buildings,
    );
    const lostFloorHeight = previousFloorHeight - nextFloorHeight;
    if (lostFloorHeight > 0.45) {
      fallStartHeightRef.current = Math.max(
        fallStartHeightRef.current ?? Number.NEGATIVE_INFINITY,
        previousFloorHeight + previousJumpHeight,
      );
      player.jumpHeight += lostFloorHeight;
    }
    player.floorHeight = nextFloorHeight;
    const nearbyLoot = getNearbyWarRoomLootChest(runtime);
    if (!input.lootHeld || !nearbyLoot) {
      player.lootChestId = null;
      player.lootStartedAt = 0;
      player.lootProgress = 0;
    } else {
      const chest = nearbyLoot.chest;
      if (player.lootChestId !== chest.id) {
        player.lootChestId = chest.id;
        player.lootStartedAt = now;
        player.lootProgress = 0;
      } else {
        player.lootProgress = Math.min(1, (now - player.lootStartedAt) / 1.8);
      }
      if (player.lootProgress >= 1) {
        player.lastHitText = applyWarRoomLootChest(player, chest);
        player.lastHitSource = null;
        player.lastHitDamage = 0;
        player.hitMessageUntil = now + 1.6;
        chest.opened = true;
        player.lootChestId = null;
        player.lootStartedAt = 0;
        player.lootProgress = 0;
        input.lootHeld = false;
        playWarRoomSound(
          "healing-pickup",
          0.95,
          "pistol",
          getWarRoomAudioOptions(player, chest.x, chest.z),
        );
      }
    }
    const pickup = collectWarRoomHealingPoint(
      runtime.healingPoints,
      player,
      player.x,
      player.z,
      now,
      RESTORE_CONFIG,
    );
    if (pickup.point && pickup.healed > 0) {
      player.lastHitSource = null;
      player.lastHitDamage = 0;
      player.lastHitText = `+${Math.round(pickup.healed)} CAN`;
      player.hitMessageUntil = now + 1.35;
      playWarRoomSound(
        "healing-pickup",
        0.9,
        "pistol",
        getWarRoomAudioOptions(player, pickup.point.x, pickup.point.z),
      );
      if (WAR_ROOM_POOLED_FX_ENABLED) {
        spawnImpact(pickupImpactScratch.set(pickup.point.x, 0.82, pickup.point.z), "#74f5a6", now, 12, 0.06);
      }
    }
    if (fallStartHeightRef.current !== null) {
      fallStartHeightRef.current = Math.max(
        fallStartHeightRef.current,
        player.floorHeight + player.jumpHeight,
      );
    }
    player.jumpVelocity -= 14 * delta;
    player.jumpHeight = Math.max(0, player.jumpHeight + player.jumpVelocity * delta);
    if (player.jumpHeight === 0) player.jumpVelocity = 0;
    const landed = previousJumpHeightRef.current > 0.08 && player.jumpHeight <= 0.001;
    if (landed && fallStartHeightRef.current !== null) {
      const fallDamage = getWarRoomFallDamage(fallStartHeightRef.current - player.floorHeight);
      fallStartHeightRef.current = null;
      if (fallDamage > 0) {
        const hit = applyWarRoomDamage(player, fallDamage);
        if (hit.damage > 0) {
          player.lastDamageAt = now;
          player.lastCombatAt = now;
          player.invulnerableUntil = Math.max(player.invulnerableUntil, now + 0.4);
          player.damageDirection = 0;
          player.lastHitText = `−${hit.damage} CAN · DÜŞME`;
          player.hitMessageUntil = now + 1.2;
          player.lastHitDamage = hit.damage;
          player.lastHitSource = "received";
          player.lastHitCritical = false;
          player.damageEventId += 1;
          cameraKickRef.current = Math.max(cameraKickRef.current, 0.08);
        }
      }
    }
    if (
      WAR_ROOM_POOLED_FX_ENABLED
      && (landed || (
        player.jumpHeight <= 0.02
        && Math.hypot(dx, dz) > 0.035
        && now >= footDustAtRef.current
      ))
    ) {
      spawnImpactDust(meleeOrigin.set(player.x, 0.025, player.z), now);
      footDustAtRef.current = now + (landed ? 0.28 : 0.34);
    }
    previousJumpHeightRef.current = player.jumpHeight;
    if (
      player.jumpHeight <= 0.02
      && Math.hypot(dx, dz) > 0.035
      && now >= footstepAtRef.current
    ) {
      const surface = getWarRoomFootstepSurface(player.x, player.z, activeBlockersRef.current);
      playWarRoomSound(
        "footstep",
        player.crouched ? 0.38 : 0.68,
        "rifle",
        getWarRoomAudioOptions(player, player.x, player.z, surface),
      );
      footstepAtRef.current = now + (player.crouched ? 0.58 : inputLength > 0.7 ? 0.34 : 0.46);
    }
    player.stamina = player.sprinting
      ? Math.max(0, player.stamina - delta * 10)
      : Math.min(player.maxStamina, player.stamina + delta * (player.crouched ? 22 : 15));
    player.lastHitDamage = Math.max(0, player.lastHitDamage);
    resolveMeleeContact(now, wallNow);

    const weaponId = player.weaponSlots[player.activeSlot];
    const weapon = WAR_ROOM_WEAPON_BY_ID.get(weaponId)!;
    if (input.reloadPressed) {
      const ammo = player.ammo[weaponId];
      if (ammo && ammo.magazine < weapon.magazine && ammo.reserve > 0 && !player.reloadingWeapon) {
        player.reloadingWeapon = weaponId;
        player.reloadUntil = now + weapon.reloadSeconds;
        playWarRoomSound("reload", 1, "rifle", getWarRoomAudioOptions(player, player.x, player.z));
      }
      input.reloadPressed = false;
    }
    if (player.reloadingWeapon && now >= player.reloadUntil) {
      const reloading = WAR_ROOM_WEAPON_BY_ID.get(player.reloadingWeapon);
      const ammo = player.ammo[player.reloadingWeapon];
      if (reloading && ammo) {
        const moved = Math.min(reloading.magazine - ammo.magazine, ammo.reserve);
        ammo.magazine += moved;
        ammo.reserve -= moved;
      }
      player.reloadingWeapon = null;
      player.reloadUntil = 0;
    }

    if (weapon.weaponClass === "melee") {
      if (input.firePressed && !player.meleeInputPending) {
        player.meleeInputStartedAt = now;
        player.meleeInputPending = true;
      }
      if (input.fireReleased && player.meleeInputPending) {
        const holdSeconds = Math.max(0, now - player.meleeInputStartedAt);
        player.meleeInputPending = false;
        player.meleeInputStartedAt = 0;
        fireWeapon(now, 1, holdSeconds);
      }
    } else if (weapon.charge && input.firePressed) player.chargeStartedAt = now || 0.0001;
    else if (weapon.charge && input.fireReleased && player.chargeStartedAt > 0) {
      const charge = Math.max(0.15, Math.min(1, (now - player.chargeStartedAt) / 0.95));
      fireWeapon(now, charge);
      player.chargeStartedAt = 0;
    } else if (!weapon.charge && (
      input.firePressed
      || (weapon.automatic && input.fireHeld)
    )) {
      fireWeapon(now);
    }
    input.firePressed = false;
    input.fireReleased = false;

    const activeLootChest = player.lootChestId
      ? runtime.lootChests.find((chest) => chest.id === player.lootChestId && !chest.opened)
      : undefined;
    const lootBuilding = activeLootChest
      ? runtime.room.buildings.find((building) => building.id === activeLootChest.buildingId)
      : undefined;
    const activeLootChase = Boolean(activeLootChest && lootBuilding);
    const playerBuilding = runtime.room.buildings.find((building) => {
      const localPlayer = getWarRoomBuildingLocalPoint(building, player.x, player.z);
      return Math.abs(localPlayer.x) <= building.width / 2
        && Math.abs(localPlayer.z) <= building.depth / 2;
    });
    if (!trainingMode) for (let index = 0; index < runtime.enemies.length; index += 1) {
      const enemy = runtime.enemies[index];
      const group = enemyGroupRefs.current[index];
      if (!enemy.alive) {
        if (group) group.visible = false;
        continue;
      }
      enemy.floorHeight = getWarRoomFloorHeight(
        enemy.x,
        enemy.z,
        enemy.floorHeight ?? 0,
        runtime.room.buildings,
      );
      const defenseMode = runtime.mission.mode === "defense";
      const missionTarget = defenseMode ? runtime.mission.objectivePosition : player;
      const bossTelegraph = enemy.commander
        ? updateWarRoomBossTelegraph(enemy, runtime.room.id, now, missionTarget)
        : null;
      const bossPhase = bossTelegraph?.phase ?? 1;
      const bossAttack = bossTelegraph?.attack ?? null;
      const bossTelegraphing = bossTelegraph?.telegraphing ?? false;
      const bossChargeActive = bossAttack === "charge"
        && now >= enemy.nextShotAt
        && now < enemy.nextShotAt + WAR_ROOM_BOSS_CHARGE_SECONDS;
      if (bossTelegraphing || bossChargeActive) {
        enemy.moveVelocityX = 0;
        enemy.moveVelocityZ = 0;
        enemy.doorApproachX = 0;
        enemy.doorApproachZ = 0;
      }
      if (enemy.commander && bossAttack && now >= enemy.nextShotAt) {
        if (bossAttack === "shockwave" && !enemy.bossAttackResolved) {
          enemy.bossAttackResolved = true;
          const center = new THREE.Vector3(enemy.x, 0, enemy.z);
          spawnShockwave(
            center,
            0,
            now,
            "#ff5b45",
            WAR_ROOM_BOSS_SHOCKWAVE_RADIUS / 0.53,
          );
          const distance = Math.hypot(enemy.x - missionTarget.x, enemy.z - missionTarget.z);
          const verticalGap = Math.abs(
            (enemy.floorHeight ?? 0) - (player.floorHeight + player.jumpHeight),
          );
          if (defenseMode) {
            if (distance <= WAR_ROOM_BOSS_SHOCKWAVE_RADIUS) {
              applyWarRoomBossImpact(
                "shockwave",
                enemy,
                missionTarget,
                player,
                runtime.mission,
                defenseMode,
                now,
                cameraKickRef,
                cameraFovKickRef,
                cameraSideKickRef,
              );
            }
          } else if (
            getWarRoomBossShockwaveHits(
              distance,
              verticalGap,
              player.jumpHeight > 0.85,
            )
          ) {
            applyWarRoomBossImpact(
              "shockwave",
              enemy,
              missionTarget,
              player,
              runtime.mission,
              defenseMode,
              now,
              cameraKickRef,
              cameraFovKickRef,
              cameraSideKickRef,
            );
          }
          enemy.bossAttack = null;
          enemy.bossAttackResolved = false;
          enemy.nextShotAt = now + WAR_ROOM_BOSS_ATTACK_COOLDOWN_SECONDS;
        } else if (bossAttack === "summon" && !enemy.bossAttackResolved) {
          enemy.bossAttackResolved = true;
          spawnWarRoomBossSummons(runtime, enemy, now, WAR_ROOM_BOSS_SUMMON_COUNT);
          playWarRoomSound(
            "enemy-shot",
            0.75,
            "rifle",
            getWarRoomAudioOptions(player, enemy.x, enemy.z, "stone"),
          );
          enemy.bossAttack = null;
          enemy.bossAttackResolved = false;
          enemy.nextShotAt = now + WAR_ROOM_BOSS_ATTACK_COOLDOWN_SECONDS;
        }
      }
      if (bossChargeActive) {
        const targetX = enemy.bossAttackTargetX ?? missionTarget.x;
        const targetZ = enemy.bossAttackTargetZ ?? missionTarget.z;
        const dx = targetX - enemy.x;
        const dz = targetZ - enemy.z;
        const distance = Math.hypot(dx, dz);
        const step = Math.min(distance, getWarRoomBossChargeStep(rawDelta));
        if (distance > 0.001 && step > 0) {
          const chargeYaw = Math.atan2(dx, -dz);
          const moved = moveWarRoomEntity(
            enemy.x,
            enemy.z,
            (dx / distance) * step,
            (dz / distance) * step,
            0.48,
            activeBlockersRef.current,
            enemy.floorHeight ?? 0,
          );
          enemy.x = moved.x;
          enemy.z = moved.z;
          enemy.doorApproachX = Math.sin(chargeYaw) * step;
          enemy.doorApproachZ = -Math.cos(chargeYaw) * step;
          enemy.floorHeight = getWarRoomFloorHeight(
            enemy.x,
            enemy.z,
            enemy.floorHeight ?? 0,
            runtime.room.buildings,
          );
        }
        const currentTargetGap = Math.hypot(enemy.x - missionTarget.x, enemy.z - missionTarget.z);
        const impactRadius = defenseMode ? 2.05 : 1.55;
        if (!enemy.bossAttackResolved && currentTargetGap <= impactRadius) {
          enemy.bossAttackResolved = true;
          applyWarRoomBossImpact(
            "charge",
            enemy,
            missionTarget,
            player,
            runtime.mission,
            defenseMode,
            now,
            cameraKickRef,
            cameraFovKickRef,
            cameraSideKickRef,
          );
        }
      } else if (
        bossAttack === "charge"
        && now >= enemy.nextShotAt + WAR_ROOM_BOSS_CHARGE_SECONDS
      ) {
        enemy.bossAttack = null;
        enemy.bossAttackResolved = false;
        enemy.nextShotAt = now + WAR_ROOM_BOSS_ATTACK_COOLDOWN_SECONDS;
      }
      const gap = Math.hypot(enemy.x - missionTarget.x, enemy.z - missionTarget.z);
      const floorGap = defenseMode
        ? Math.abs(enemy.floorHeight ?? 0)
        : Math.abs((enemy.floorHeight ?? 0) - player.floorHeight);
      let lineBlocked = enemy.lineOfSightBlocked;
      if (shouldUpdateWarRoomBotPerception(enemy.perceptionAt, now)) {
        const previousPerceptionAt = enemy.perceptionAt;
        const perceptionDelta = Number.isFinite(previousPerceptionAt)
          ? Math.min(
            WAR_ROOM_BOT_PERCEPTION_INTERVAL_SECONDS,
            Math.max(0, now - previousPerceptionAt),
          )
          : rawDelta;
        const enemyEye = {
          x: enemy.x,
          y: (enemy.floorHeight ?? 0) + (enemy.commander ? 1.65 : 1.45),
          z: enemy.z,
        };
        const targetEye = {
          x: missionTarget.x,
          y: defenseMode ? 0.95
            : player.floorHeight + player.jumpHeight + (player.crouched ? 1.1 : 1.4),
          z: missionTarget.z,
        };
        lineBlocked = segmentBlockFraction(
          enemyEye,
          targetEye,
          0,
          activeBlockersRef.current,
        ) !== null;
        enemy.lineOfSightBlocked = lineBlocked;
        enemy.perceptionAt = now;
        const perception = updateWarRoomAwareness(enemy.awareness, perceptionDelta, {
          visible: floorGap <= 1.25 && gap <= 25 && !lineBlocked,
          heardSound: floorGap <= 1.25 && (
            (player.sprinting && gap <= 14)
            || (
              player.lastCombatAt >= player.startTime
              && now - player.lastCombatAt <= 2.4
              && gap <= 32
            )
          ),
        });
        enemy.awareness = perception.awareness;
        const engaged = enemy.commander || defenseMode || perception.state === "engaged";
        enemy.mode = activeLootChase
          ? "approach"
          : floorGap > 1.25
            ? "approach"
            : !engaged
              ? perception.state === "alert" ? "alert" : "patrol"
          : !defenseMode && player.hp / player.maxHp < 0.33
            ? "cover"
            : !lineBlocked && gap <= (defenseMode ? 22 : enemy.commander ? 22 : 17)
              ? "fire"
              : lineBlocked && gap < 26 ? "cover" : "approach";
      }
      lineBlocked = enemy.lineOfSightBlocked;
      const updateInterval = getWarRoomBotDecisionInterval(gap, activeLootChase);
      if (now >= enemy.brainAt && !bossTelegraphing && !bossChargeActive) {
        enemy.brainAt = now + updateInterval;
        enemy.doorApproachX = 0;
        enemy.doorApproachZ = 0;
        enemy.moveVelocityX = 0;
        enemy.moveVelocityZ = 0;
        enemy.movementBlockers.length = 0;
        const needsFloorRoute = enemy.mode === "approach"
          && !activeLootChase && !defenseMode && floorGap > 1.25 && playerBuilding;
        let target: { x: number; z: number; floorHeight?: number } = activeLootChase && lootBuilding
          ? getWarRoomLootPursuitPoint(enemy, player, lootBuilding)
          : defenseMode
            ? { ...runtime.mission.objectivePosition, floorHeight: 0 }
          : enemy.mode === "patrol"
            ? { x: enemy.coverX, z: enemy.coverZ, floorHeight: enemy.floorHeight ?? 0 }
          : enemy.mode === "alert"
            ? { x: player.x, z: player.z, floorHeight: player.floorHeight }
          : needsFloorRoute
            ? getWarRoomLootPursuitPoint(enemy, player, playerBuilding!)
            : { x: player.x, z: player.z, floorHeight: player.floorHeight };
        if (!activeLootChase && !defenseMode && enemy.mode === "cover") {
          if (enemy.hp / enemy.maxHp < 0.32 || lineBlocked) {
            const cover = getNearestWarRoomCover(enemy.x, enemy.z, runtime.room.coverSpots);
            if (cover) {
              enemy.coverX = cover.x;
              enemy.coverZ = cover.z;
            }
          }
          target = { x: enemy.coverX, z: enemy.coverZ, floorHeight: enemy.floorHeight ?? 0 };
        }
        if (!activeLootChase && !needsFloorRoute && enemy.mode !== "alert") {
          target = getWarRoomObstacleWaypoint(
            enemy,
            target,
            activeBlockersRef.current,
            0.35,
          );
        }
        const holdDistance = activeLootChase ? 0.8
          : defenseMode ? 1.7
            : enemy.mode === "patrol" ? 0.4
              : enemy.commander ? 12.5 : 10.5;
        const shouldMove = (enemy.mode === "patrol" || enemy.mode === "approach" || enemy.mode === "cover")
          && Math.hypot(target.x - enemy.x, target.z - enemy.z)
            > (enemy.mode === "cover" ? 1.2 : holdDistance);
        if (shouldMove) {
          const targetYaw = Math.atan2(target.x - enemy.x, -(target.z - enemy.z));
          const moveSpeed = (enemy.commander ? 2.55
            : enemy.mode === "patrol" ? 1.15
              : enemy.mode === "cover" ? 3.25 : 3.7)
            * enemy.speedMultiplier
            * getWarRoomEnemySpeedMultiplier(runtime.mission.modifiers);
          let moveXEnemy = Math.sin(targetYaw) * moveSpeed;
          let moveZEnemy = -Math.cos(targetYaw) * moveSpeed;
          for (const other of runtime.enemies) {
            if (other === enemy || !other.alive) continue;
            const separationX = enemy.x - other.x;
            const separationZ = enemy.z - other.z;
            const separation = Math.hypot(separationX, separationZ);
            if (separation > 0.001 && separation < 1.25) {
              moveXEnemy += (separationX / separation) * 1.5;
              moveZEnemy += (separationZ / separation) * 1.5;
            }
          }
          enemy.moveVelocityX = moveXEnemy;
          enemy.moveVelocityZ = moveZEnemy;
          enemy.doorApproachX = enemy.moveVelocityX;
          enemy.doorApproachZ = enemy.moveVelocityZ;
          const movementBlockerPadding = 0.45
            + Math.hypot(enemy.moveVelocityX, enemy.moveVelocityZ) * updateInterval;
          for (const blocker of activeBlockersRef.current) {
            if (
              Math.abs(blocker.x - enemy.x) <= blocker.width / 2 + movementBlockerPadding
              && Math.abs(blocker.z - enemy.z) <= blocker.depth / 2 + movementBlockerPadding
            ) enemy.movementBlockers.push(blocker);
          }
        }
      }
      if (
        !bossTelegraphing
        && !bossChargeActive
        && delta > 0
        && (enemy.moveVelocityX !== 0 || enemy.moveVelocityZ !== 0)
      ) {
        const moved = moveWarRoomEntity(
          enemy.x,
          enemy.z,
          enemy.moveVelocityX * delta,
          enemy.moveVelocityZ * delta,
          0.35,
          enemy.movementBlockers,
          enemy.floorHeight ?? 0,
          0,
          enemyMoveResultScratch,
        );
        enemy.x = moved.x;
        enemy.z = moved.z;
        enemy.floorHeight = getWarRoomFloorHeight(
          enemy.x,
          enemy.z,
          enemy.floorHeight ?? 0,
          runtime.room.buildings,
        );
      }
      const playerVerticalGap = Math.abs(
        (enemy.floorHeight ?? 0) - (player.floorHeight + player.jumpHeight),
      );
      const minimumActorGap = enemy.commander ? 1.2 : 0.88;
      const actorGap = Math.hypot(enemy.x - player.x, enemy.z - player.z);
      if (
        !(bossChargeActive && enemy.commander)
        && playerVerticalGap < 1.25
        && actorGap < minimumActorGap
      ) {
        const fallbackAngle = (index % 4) * (Math.PI / 2);
        const awayX = actorGap > 0.001 ? (enemy.x - player.x) / actorGap : Math.cos(fallbackAngle);
        const awayZ = actorGap > 0.001 ? (enemy.z - player.z) / actorGap : Math.sin(fallbackAngle);
        const overlap = minimumActorGap - actorGap;
        const enemyPush = overlap * 0.65;
        const enemySeparated = moveWarRoomEntity(
          enemy.x,
          enemy.z,
          awayX * enemyPush,
          awayZ * enemyPush,
          0.35,
          activeBlockersRef.current,
          enemy.floorHeight ?? 0,
        );
        enemy.x = enemySeparated.x;
        enemy.z = enemySeparated.z;
        enemy.floorHeight = getWarRoomFloorHeight(
          enemy.x,
          enemy.z,
          enemy.floorHeight ?? 0,
          runtime.room.buildings,
        );

        const remainingOverlap = minimumActorGap - Math.hypot(enemy.x - player.x, enemy.z - player.z);
        if (remainingOverlap > 0.001) {
          const playerSeparated = moveWarRoomEntity(
            player.x,
            player.z,
            -awayX * remainingOverlap,
            -awayZ * remainingOverlap,
            0.4,
            activeBlockersRef.current,
            player.floorHeight,
            player.jumpHeight,
          );
          player.x = playerSeparated.x;
          player.z = playerSeparated.z;
          player.floorHeight = getWarRoomFloorHeight(
            player.x,
            player.z,
            player.floorHeight,
            runtime.room.buildings,
          );
        }
      }
      if (group) {
        group.position.set(enemy.x, enemy.floorHeight ?? 0, enemy.z);
        group.visible = true;
      }
    }

    const defenseMode = runtime.mission.mode === "defense";
    const attackTarget = defenseMode ? runtime.mission.objectivePosition : player;
    const attackCandidates = attackCandidatesRef.current;
    attackCandidates.length = 0;
    if (!trainingMode) {
      for (const enemy of runtime.enemies) {
        if (
          !enemy.alive
          || enemy.mode !== "fire"
          || (enemy.commander && getWarRoomBossPhase(enemy.hp, enemy.maxHp) >= 2)
          || Math.abs((enemy.floorHeight ?? 0) - (defenseMode ? 0 : player.floorHeight)) > 1.25
          || enemy.lineOfSightBlocked
        ) continue;
        const distance = Math.hypot(enemy.x - attackTarget.x, enemy.z - attackTarget.z);
        if (distance > 24) continue;
        let insertAt = attackCandidates.length;
        for (let candidateIndex = 0; candidateIndex < attackCandidates.length; candidateIndex += 1) {
          const candidate = attackCandidates[candidateIndex]!;
          const candidateDistance = Math.hypot(
            candidate.x - attackTarget.x,
            candidate.z - attackTarget.z,
          );
          if (distance < candidateDistance) {
            insertAt = candidateIndex;
            break;
          }
        }
        if (insertAt >= 3) continue;
        if (attackCandidates.length < 3) attackCandidates.push(enemy);
        for (let index = attackCandidates.length - 1; index > insertAt; index -= 1) {
          attackCandidates[index] = attackCandidates[index - 1]!;
        }
        attackCandidates[insertAt] = enemy;
      }
    }

    for (const enemy of attackCandidates) {
      if (now < enemy.nextShotAt || (!defenseMode && now < player.invulnerableUntil)) continue;
      const enemyIndex = runtime.enemies.indexOf(enemy);
      const enemyGroup = enemyGroupRefs.current[enemyIndex];
      const enemyFacingYaw = getWarRoomActorYawToTarget(
        enemy.x,
        enemy.z,
        attackTarget.x,
        attackTarget.z,
        0,
      );
      const targetRootYaw = getWarRoomActorRootYawToTarget(
        enemy.x,
        enemy.z,
        attackTarget.x,
        attackTarget.z,
      );
      const actorFacingYaw = enemyGroup
        ? getWarRoomFacingYawFromRootYaw(enemyGroup.rotation.y)
        : enemyFacingYaw;
      if (!enemyGroup || !isWarRoomFacingTarget(actorFacingYaw, enemyFacingYaw)) continue;
      enemyGroup.rotation.y = targetRootYaw;
      enemy.nextShotAt = now + (enemy.commander ? 1.2 : 1.65) + nextWarRoomRandom(runtime) * 0.55;
      const muzzle = muzzleScratch.set(
        enemy.x + 0.22,
        (enemy.floorHeight ?? 0) + (enemy.commander ? 1.5 : 1.35),
        enemy.z - 0.48,
      );
      const enemyMuzzle = enemyGroup?.getObjectByName("war-room-muzzle-anchor");
      if (enemyMuzzle) {
        enemyMuzzle.updateWorldMatrix(true, false);
        enemyMuzzle.getWorldPosition(muzzle);
      }
      const enemyFlash = enemyGroup?.getObjectByName("war-room-muzzle-flash") as THREE.Group | undefined;
      if (enemyFlash) {
        enemyFlash.visible = true;
        enemyFlash.userData.warRoomExpiresAt = now + 0.08;
        const flashScale = 0.78 + (Math.sin(now * 83 + enemy.x) + 1) * 0.18;
        enemyFlash.scale.setScalar(flashScale);
        enemyFlash.rotation.z = Math.sin(now * 29 + enemy.z) * 0.55;
      }
      spawnMuzzleSmoke(muzzle, now);
      spawnCasing(muzzle, now, enemyFacingYaw);
      const enemyDistance = Math.hypot(enemy.x - attackTarget.x, enemy.z - attackTarget.z);
      playWarRoomSound(
        "enemy-shot",
        1,
        "rifle",
        getWarRoomAudioOptions(player, enemy.x, enemy.z),
      );
      const missSeed = now * 9 + runtime.enemies.indexOf(enemy) * 2.7;
      const shotDirection = enemyShotDirectionScratch.set(
        Math.sin(enemyFacingYaw),
        0,
        -Math.cos(enemyFacingYaw),
      );
      const playerAimPoint = enemyAimPointScratch.set(
        attackTarget.x,
        defenseMode ? 0.95 : player.floorHeight + player.jumpHeight + 1.15,
        attackTarget.z,
      );
      const shotDistance = Math.max(1, playerAimPoint.sub(muzzle).dot(shotDirection));
      const target = enemyTracerTargetScratch.copy(muzzle)
        .addScaledVector(shotDirection, shotDistance)
        .add(enemyMissOffsetScratch.set(
          Math.sin(missSeed) * 0.38,
          Math.cos(missSeed * 1.37) * 0.22,
          Math.sin(missSeed * 0.71) * 0.38,
        ));
      addTracer(muzzle, target, "#f36e54", now, 0.08);
      if (nextWarRoomRandom(runtime) > (enemy.commander ? 0.25 : 0.38)) {
        if (defenseMode) {
          const defenseDamage = Math.min(runtime.mission.defenseHp, enemy.damage);
          runtime.mission.defenseHp = Math.max(0, runtime.mission.defenseHp - defenseDamage);
          enemy.score += defenseDamage;
          player.lastHitText = `SAVUNMA −${defenseDamage} CAN`;
          player.hitMessageUntil = now + 1;
          playWarRoomSound("hit", 0.8, "rifle", getWarRoomAudioOptions(player, enemy.x, enemy.z, "metal"));
        } else {
          const hit = applyWarRoomDamage(player, enemy.damage);
          if (hit.damage > 0) {
            enemy.score += hit.damage;
            playWarRoomSound("hit", 1, "rifle", getWarRoomAudioOptions(player, enemy.x, enemy.z, "flesh"));
            player.lastDamageAt = now;
            player.lastCombatAt = now;
            player.invulnerableUntil = now + 0.28;
            cameraKickRef.current = Math.max(cameraKickRef.current, 0.09);
            cameraFovKickRef.current = Math.min(cameraFovKickRef.current + 1.8, 4.2);
            cameraSideKickRef.current = Math.max(
              -0.035,
              Math.min(0.035, cameraSideKickRef.current + Math.sign(player.damageDirection || 1) * 0.018),
            );
            player.damageDirection = shortestAngleDelta(
              player.yaw,
              Math.atan2(enemy.x - player.x, -(enemy.z - player.z)),
            );
            player.lastHitText = `−${hit.damage} CAN · ${enemy.name}`;
            player.hitMessageUntil = now + 1;
            player.lastHitDamage = hit.damage;
            player.lastHitSource = "received";
            player.lastHitCritical = false;
            player.damageEventId += 1;
          }
        }
      }
    }

    const positions = tracerState.positions;
    for (let slot = 0; slot < WAR_ROOM_TRACER_POOL_SIZE; slot += 1) {
      if (tracerState.expires[slot] > 0 && tracerState.expires[slot] <= now) {
        const offset = slot * 6;
        positions.fill(0, offset, offset + 6);
        tracerState.expires[slot] = 0;
        tracerState.geometry.attributes.position.needsUpdate = true;
      }
    }
    for (let slot = 0; slot < WAR_ROOM_EFFECT_POOL_SIZE; slot += 1) {
      const particle = particles[slot];
      if (slot >= qualityProfile.maxActiveParticles) {
        particle.born = -1;
        particleTransform.position.set(0, -1000, 0);
        particleTransform.scale.setScalar(0);
        particleTransform.updateMatrix();
        particleMesh.setMatrixAt(slot, particleTransform.matrix);
        continue;
      }
      const age = now - particle.born;
      if (particle.born < 0 || age >= particle.lifetime) {
        particleTransform.position.set(0, -1000, 0);
        particleTransform.scale.setScalar(0);
      } else {
        const groundTime = particle.bounce
          ? (particle.vy + Math.sqrt(particle.vy * particle.vy + 8.8 * Math.max(0, particle.y - 0.025))) / 4.4
          : Number.POSITIVE_INFINITY;
        const afterBounce = age > groundTime ? age - groundTime : 0;
        const impactVelocity = particle.vy - 4.4 * groundTime;
        const reboundVelocity = Math.abs(impactVelocity) * 0.28;
        const particleY = particle.bounce && afterBounce > 0
          ? Math.max(0.025, 0.025 + reboundVelocity * afterBounce - afterBounce * afterBounce * 2.2)
          : particle.y + particle.vy * age - age * age * 2.2;
        particleTransform.position.set(
          particle.x + particle.vx * (particle.bounce ? Math.min(age, groundTime) + afterBounce * 0.32 : age),
          particleY,
          particle.z + particle.vz * (particle.bounce ? Math.min(age, groundTime) + afterBounce * 0.32 : age),
        );
        particleTransform.scale.setScalar(particle.size * (1 - age / particle.lifetime));
      }
      particleTransform.updateMatrix();
      particleMesh.setMatrixAt(slot, particleTransform.matrix);
    }
    particleMesh.instanceMatrix.needsUpdate = true;

    let crackDecalsChanged = false;
    for (let slot = 0; slot < WAR_ROOM_DECAL_POOL_SIZE; slot += 1) {
      const decal = decalState[slot];
      if (decal.kind !== "crack") continue;
      const progress = (now - decal.born) / WAR_ROOM_CRACK_DECAL_LIFETIME_SECONDS;
      if (progress >= 1) {
        crackMesh.setMatrixAt(slot, hiddenDecalTransform.matrix);
        decal.kind = null;
        crackDecalsChanged = true;
        continue;
      }
      decalTransform.position.set(decal.x, 0.018, decal.z);
      decalTransform.rotation.set(-Math.PI / 2, 0, decal.yaw);
      decalTransform.scale.setScalar(decal.scale * (1 - progress));
      decalTransform.updateMatrix();
      crackMesh.setMatrixAt(slot, decalTransform.matrix);
      crackDecalsChanged = true;
    }
    if (crackDecalsChanged) crackMesh.instanceMatrix.needsUpdate = true;

    for (let slot = 0; slot < WAR_ROOM_SHOCKWAVE_POOL_SIZE; slot += 1) {
      const shockwave = shockwaves[slot];
      const age = now - shockwave.born;
      if (shockwave.born < 0 || age >= WAR_ROOM_SHOCKWAVE_LIFETIME) {
        shockwaveTransform.position.set(0, -1000, 0);
        shockwaveTransform.scale.setScalar(0);
      } else {
        const progress = age / WAR_ROOM_SHOCKWAVE_LIFETIME;
        shockwaveTransform.position.set(shockwave.x, 0.035, shockwave.z);
        shockwaveTransform.rotation.set(-Math.PI / 2, 0, shockwave.yaw);
        shockwaveTransform.scale.setScalar(0.3 + progress * Math.max(0.3, shockwave.maxScale - 0.3));
        shockwaveTint.set(shockwave.color).multiplyScalar(1 - progress);
        shockwaveMesh.setColorAt(slot, shockwaveTint);
      }
      shockwaveTransform.updateMatrix();
      shockwaveMesh.setMatrixAt(slot, shockwaveTransform.matrix);
    }
    shockwaveMesh.instanceMatrix.needsUpdate = true;
    if (shockwaveMesh.instanceColor) shockwaveMesh.instanceColor.needsUpdate = true;

    for (let slot = 0; slot < WAR_ROOM_PROJECTILE_POOL_SIZE; slot += 1) {
      const projectile = projectiles[slot];
      const age = now - projectile.born;
      if (projectile.born < 0 || age >= projectile.lifetime) {
        projectileTransform.position.set(0, -1000, 0);
        projectileTransform.quaternion.identity();
        projectileTransform.scale.setScalar(0);
        projectileTransform.updateMatrix();
        projectileShafts.setMatrixAt(slot, projectileTransform.matrix);
        projectileHeads.setMatrixAt(slot, projectileTransform.matrix);
        continue;
      }
      const progress = Math.min(1, age / projectile.lifetime);
      projectileDirection.subVectors(projectile.end, projectile.start).normalize();
      projectileTip.copy(projectile.start).lerp(projectile.end, progress);
      projectileTransform.quaternion.setFromUnitVectors(projectileUp, projectileDirection);
      projectileTransform.position.copy(projectileTip).addScaledVector(projectileDirection, -0.26);
      projectileTransform.scale.set(1, 1, 1);
      projectileTransform.updateMatrix();
      projectileShafts.setMatrixAt(slot, projectileTransform.matrix);
      projectileTransform.position.copy(projectileTip).addScaledVector(projectileDirection, -0.075);
      projectileTransform.scale.set(1, 1, 1);
      projectileTransform.updateMatrix();
      projectileHeads.setMatrixAt(slot, projectileTransform.matrix);
    }
    projectileShafts.instanceMatrix.needsUpdate = true;
    projectileHeads.instanceMatrix.needsUpdate = true;

    const aimDistance = WAR_ROOM_WEAPON_BY_ID.get(player.weaponSlots[player.activeSlot])!.range;
    const indoorBuilding = room.buildings.find((building) => {
      const localPlayer = getWarRoomBuildingLocalPoint(building, player.x, player.z);
      return Math.abs(localPlayer.x) <= building.width / 2
        && Math.abs(localPlayer.z) <= building.depth / 2;
    });
    cameraKickRef.current *= Math.exp(-delta * 11);
    cameraSideKickRef.current *= Math.exp(-delta * 15);
    cameraFovKickRef.current = Math.max(0, cameraFovKickRef.current - delta * 16);
    const targetFov = getWarRoomResponsiveCameraFov(
      getWarRoomCameraFov(input.aimHeld) + cameraFovKickRef.current,
      size.height > 0 ? size.width / size.height : 1.75,
      input.aimHeld ? 0 : 75,
    );
    const smoothedFov = THREE.MathUtils.damp(perspective.fov, targetFov, 18, delta);
    if (Math.abs(perspective.fov - smoothedFov) > 0.005) {
      perspective.fov = smoothedFov;
      perspective.updateProjectionMatrix();
    }
    const sceneCameraAngles = getWarRoomCameraAngles(
      inputRef.current.yaw + cameraSideKickRef.current,
      inputRef.current.pitch + cameraKickRef.current,
    );
    const cameraYaw = cameraMode === "third-person" && playerRootRef.current
      ? getWarRoomFacingYawFromRootYaw(playerRootRef.current.rotation.y)
      : sceneCameraAngles.yaw;
    const cameraPitch = sceneCameraAngles.pitch;
    const victoryZoom = WAR_ROOM_LAST_ENEMY_CINEMATIC_ENABLED && cinematicStartedAt !== null
      ? Math.min(1, cinematicElapsed / WAR_ROOM_LAST_ENEMY_SLOW_MOTION_SECONDS)
      : 0;
    const { back: baseCameraBack, shoulder } = getWarRoomCameraRig({
      mode: cameraMode,
      aiming: false,
      shoulderOffset,
      shoulderSide,
      indoors: Boolean(indoorBuilding),
      victoryZoom: 0,
    });
    const targetEyeHeight = player.crouched ? 1 : 1.6;
    const isPlayerViewClear = (
      x: number,
      z: number,
      floorHeight: number,
      jumpHeight = 0,
    ) => isWarRoomCameraPointClear(
      { x, y: floorHeight + jumpHeight + targetEyeHeight, z },
      cameraBoundsRef.current,
      0.3,
    );
    const eyeClearancePush = getWarRoomEyeClearancePush({
      x: player.x,
      y: player.floorHeight + player.jumpHeight + cameraEyeHeightRef.current,
      z: player.z,
    }, cameraBoundsRef.current, 0.35, 0.3);
    if (Math.hypot(eyeClearancePush.x, eyeClearancePush.z) > 0.001) {
      const clearancePosition = moveWarRoomEntity(
        player.x,
        player.z,
        eyeClearancePush.x,
        eyeClearancePush.z,
        WAR_ROOM_PLAYER_COLLISION_RADIUS,
        activeBlockersRef.current,
        player.floorHeight,
        player.jumpHeight,
      );
      player.x = clearancePosition.x;
      player.z = clearancePosition.z;
      player.floorHeight = getWarRoomFloorHeight(
        player.x,
        player.z,
        player.floorHeight,
        room.buildings,
      );
    }
    {
      if (
        !isWarRoomCameraPointClear(
          { x: player.x, y: player.floorHeight + player.jumpHeight + 0.75, z: player.z },
          cameraBoundsRef.current,
          0.05,
        )
        || !isPlayerViewClear(player.x, player.z, player.floorHeight, player.jumpHeight)
      ) {
        let recovered = false;
        const savedPosition = lastSafePlayerPositionRef.current;
        if (
          savedPosition
          && isWarRoomCameraPointClear(
            { x: savedPosition.x, y: savedPosition.floorHeight + 0.75, z: savedPosition.z },
            cameraBoundsRef.current,
            0.05,
          )
          && isPlayerViewClear(savedPosition.x, savedPosition.z, savedPosition.floorHeight)
        ) {
          const recoveryX = savedPosition.x - player.x;
          const recoveryZ = savedPosition.z - player.z;
          const recoveryDistance = Math.hypot(recoveryX, recoveryZ);
          const recoveryScale = recoveryDistance > 0.3 ? 0.3 / recoveryDistance : 1;
          const candidateX = player.x + recoveryX * recoveryScale;
          const candidateZ = player.z + recoveryZ * recoveryScale;
          const candidateFloor = getWarRoomFloorHeight(
            candidateX,
            candidateZ,
            player.floorHeight,
            room.buildings,
          );
          if (isWarRoomCameraPointClear(
            { x: candidateX, y: candidateFloor + 0.75, z: candidateZ },
            cameraBoundsRef.current,
            0.05,
          ) && isPlayerViewClear(candidateX, candidateZ, candidateFloor)) {
            player.x = candidateX;
            player.z = candidateZ;
            player.floorHeight = candidateFloor;
            player.jumpHeight = 0;
            player.jumpVelocity = 0;
            recovered = true;
          }
        }
        for (let radius = 0.05; !recovered && radius <= 0.3; radius += 0.05) {
          for (let step = 0; step < 12; step += 1) {
            const angle = (step / 12) * Math.PI * 2;
            const candidateX = player.x + Math.cos(angle) * radius;
            const candidateZ = player.z + Math.sin(angle) * radius;
            const candidateFloor = getWarRoomFloorHeight(
              candidateX,
              candidateZ,
              player.floorHeight,
              room.buildings,
            );
            if (!isWarRoomCameraPointClear(
              { x: candidateX, y: candidateFloor + 0.75, z: candidateZ },
              cameraBoundsRef.current,
              0.05,
            ) || !isPlayerViewClear(candidateX, candidateZ, candidateFloor)) continue;
            player.x = candidateX;
            player.z = candidateZ;
            player.floorHeight = candidateFloor;
            player.jumpHeight = 0;
            player.jumpVelocity = 0;
            recovered = true;
            break;
          }
        }
      }
      if (
        isWarRoomCameraPointClear(
          { x: player.x, y: player.floorHeight + player.jumpHeight + 0.75, z: player.z },
          cameraBoundsRef.current,
          0.05,
        )
        && isPlayerViewClear(player.x, player.z, player.floorHeight, player.jumpHeight)
      ) {
        lastSafePlayerPositionRef.current = {
          x: player.x,
          z: player.z,
          floorHeight: player.floorHeight,
        };
      }
    }
    const eyeHeightTarget = isWarRoomEyeClearAbove({
      x: player.x,
      y: player.floorHeight + player.jumpHeight + targetEyeHeight,
      z: player.z,
    }, cameraBoundsRef.current, 0.35)
      ? targetEyeHeight
      : Math.max(0.82, targetEyeHeight - 0.28);
    cameraEyeHeightRef.current += (
      eyeHeightTarget - cameraEyeHeightRef.current
    ) * (1 - Math.exp(-delta * 10));
    const cameraHeight = cameraMode === "first-person" ? cameraEyeHeightRef.current : 1.55;
    const smoothedFloorHeight = fallStartHeightRef.current !== null
      ? player.floorHeight
      : stepWarRoomCameraFloorHeight(
        cameraFloorHeightRef.current,
        player.floorHeight,
        delta,
      );
    const renderX = playerRenderPositionRef.current.x;
    const renderZ = playerRenderPositionRef.current.z;
    const smoothedEye = {
      x: renderX,
      y: smoothedFloorHeight + player.jumpHeight + cameraHeight,
      z: renderZ,
    };
    cameraFloorHeightRef.current = isWarRoomCameraPointClear(
      smoothedEye,
      cameraBoundsRef.current,
      0.05,
    )
      ? smoothedFloorHeight
      : player.floorHeight;
    const cameraFloorHeight = cameraFloorHeightRef.current;
    const focusHeight = cameraMode === "first-person" ? cameraHeight : 1.5;
    const focusAhead = cameraMode === "first-person" ? 8 : 0;
    cameraStart.set(
      renderX,
      cameraFloorHeight + player.jumpHeight + cameraHeight,
      renderZ,
    );
    const cameraFrame = getWarRoomRearCameraFrame(
      { x: renderX, y: cameraFloorHeight + player.jumpHeight, z: renderZ },
      cameraYaw,
      cameraPitch,
      baseCameraBack,
      shoulder,
      cameraHeight,
      focusAhead,
      focusHeight,
    );
    cameraDesired.set(cameraFrame.position.x, cameraFrame.position.y, cameraFrame.position.z);
    if (indoorBuilding && cameraMode === "third-person" && !WAR_ROOM_CAMERA_OCCLUSION_ENABLED) {
      const indoorTarget = clampWarRoomCameraToInterior(
        { x: cameraDesired.x, y: cameraDesired.y, z: cameraDesired.z },
        indoorBuilding,
      );
      cameraDesired.set(indoorTarget.x, indoorTarget.y, indoorTarget.z);
    }
    if (scene && now - cameraBoundsRefreshRef.current >= 0.25) {
      scene.updateMatrixWorld(true);
      const occluders: CameraOccluderEntry[] = [];
      const raycastMeshesByOwner = new Map<string, THREE.Object3D[]>();
      const raycastOwners = new WeakMap<THREE.Object3D, string>();
      scene.traverse((object) => {
        const id = object.userData.warRoomCameraOccluderId;
        if (typeof id !== "string" || id.startsWith("gateway:")) return;
        const bounds = new THREE.Box3().setFromObject(object);
        if (bounds.isEmpty()) return;
        occluders.push({ id, object, bounds });
        object.traverse((child) => {
          if (!(child instanceof THREE.Mesh) || !child.visible) return;
          const meshes = raycastMeshesByOwner.get(id) ?? [];
          meshes.push(child);
          raycastMeshesByOwner.set(id, meshes);
          raycastOwners.set(child, id);
        });
      });
      cameraOccludersRef.current = occluders;
      cameraRaycastMeshesByOwnerRef.current = raycastMeshesByOwner;
      cameraRaycastOwnerByObjectRef.current = raycastOwners;
      cameraBoundsRef.current = [
        ...logicalCameraBounds,
        ...occluders.map(({ id, bounds }) => ({
          id,
          minX: bounds.min.x,
          minY: bounds.min.y,
          minZ: bounds.min.z,
          maxX: bounds.max.x,
          maxY: bounds.max.y,
          maxZ: bounds.max.z,
        })),
      ];
      cameraBoundsRefreshRef.current = now;
    }
    cameraUnobstructed.copy(cameraDesired);
    const requestedCameraDistance = cameraStart.distanceTo(cameraDesired);
    const cameraStartPoint = { x: cameraStart.x, y: cameraStart.y, z: cameraStart.z };
    const cameraEndPoint = { x: cameraDesired.x, y: cameraDesired.y, z: cameraDesired.z };
    const cameraPlacement = cameraMode === "third-person" && WAR_ROOM_CAMERA_OCCLUSION_ENABLED
      ? indoorBuilding
        ? resolveWarRoomInteriorCameraPlacement(
          cameraStartPoint,
          cameraEndPoint,
          cameraBoundsRef.current,
          indoorBuilding,
          0.28,
          0.08,
        )
        : resolveWarRoomCameraPlacement(
          cameraStartPoint,
          cameraEndPoint,
          cameraBoundsRef.current,
          0.28,
          2.5,
          0.08,
        )
      : null;
    let blockerId = cameraPlacement?.blocked ? cameraPlacement.blockerId : null;
    if (cameraPlacement) {
      cameraDesired.set(
        cameraPlacement.position.x,
        cameraPlacement.position.y,
        cameraPlacement.position.z,
      );
    }
    if (cameraMode === "third-person" && cameraRaycastMeshesByOwnerRef.current.size > 0) {
      cameraRayOrigin.set(
        cameraFrame.lookAt.x,
        cameraFrame.lookAt.y,
        cameraFrame.lookAt.z,
      );
      cameraDirection.subVectors(cameraUnobstructed, cameraRayOrigin);
      const rayLength = cameraDirection.length();
      if (rayLength > 0.001) {
        cameraDirection.divideScalar(rayLength);
        cameraRaycaster.set(cameraRayOrigin, cameraDirection);
        cameraRaycaster.near = 0;
        cameraRaycaster.far = rayLength;
        const candidateIds = getWarRoomCameraBlockerIds(
          cameraStartPoint,
          cameraEndPoint,
          cameraBoundsRef.current,
          0.28,
        );
        const raycastCandidates = cameraRaycastCandidatesRef.current;
        raycastCandidates.length = 0;
        for (const id of candidateIds) {
          const meshes = cameraRaycastMeshesByOwnerRef.current.get(id);
          if (meshes) raycastCandidates.push(...meshes);
        }
        const rayHit = raycastCandidates.length > 0
          ? cameraRaycaster
            .intersectObjects(raycastCandidates, false)
            .find((hit) => cameraRaycastOwnerByObjectRef.current.has(hit.object))
          : undefined;
        if (rayHit) {
          const safeDistance = getWarRoomCameraRaySafeDistance(
            rayLength,
            rayHit.distance,
            0.2,
          );
          cameraDesired.copy(cameraRayOrigin).addScaledVector(cameraDirection, safeDistance);
          blockerId = cameraRaycastOwnerByObjectRef.current.get(rayHit.object) ?? blockerId;
        }
      }
    }
    const cameraFadeIds = WAR_ROOM_CAMERA_OCCLUSION_ENABLED
      ? getWarRoomCameraBlockerIds(
        cameraStartPoint,
        { x: cameraDesired.x, y: cameraDesired.y, z: cameraDesired.z },
        cameraBoundsRef.current,
        0.28,
      )
      : new Set<string>();
    if (blockerId) cameraFadeIds.add(blockerId);
    if (WAR_ROOM_CAMERA_OCCLUSION_ENABLED) {
      for (const occluder of cameraOccludersRef.current) {
        const previous = cameraFadeByIdRef.current.get(occluder.id) ?? 0;
        const target = cameraFadeIds.has(occluder.id) ? 1 : 0;
        const next = target > previous
          ? Math.min(target, previous + delta / 0.25)
          : Math.max(target, previous - delta / 0.25);
        if (Math.abs(next - previous) < 0.002) continue;
        cameraFadeByIdRef.current.set(occluder.id, next);
        setWarRoomCameraOccluderFade(
          occluder.object,
          next,
          cameraMaterialOriginalsRef.current,
        );
      }
      if (debugMode && now - cameraDebugAtRef.current >= 0.25) {
        cameraDebugAtRef.current = now;
        const distance = cameraStart.distanceTo(cameraDesired) || requestedCameraDistance;
        onMeleeDebugUpdate(
          `KAMERA ${distance.toFixed(2)} m · ENGEL ${blockerId ?? "yok"}`,
        );
      }
    }
    const cameraBlocked = Boolean(blockerId || cameraPlacement?.blocked);
    if (cameraMode === "first-person" || !cameraInitializedRef.current || cameraBlocked) {
      camera.position.copy(cameraDesired);
      cameraInitializedRef.current = true;
    } else {
      const followedCameraPosition = stepWarRoomCameraFollowPosition(
        cameraStartPoint,
        { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        { x: cameraDesired.x, y: cameraDesired.y, z: cameraDesired.z },
        delta,
      );
      camera.position.set(
        followedCameraPosition.x,
        followedCameraPosition.y,
        followedCameraPosition.z,
      );
      if (!isWarRoomCameraPointClear(
        { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        cameraBoundsRef.current,
        0.28,
      )) camera.position.copy(cameraDesired);
    }
    if (
      cameraPlacement
      && !isWarRoomCameraPointClear(
        { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        cameraBoundsRef.current,
        0.28,
      )
      && isWarRoomCameraPointClear(
        { x: cameraDesired.x, y: cameraDesired.y, z: cameraDesired.z },
        cameraBoundsRef.current,
        0.28,
      )
    ) {
      camera.position.copy(cameraDesired);
    }
    if (
      cameraMode === "third-person"
      && cameraPlacement
      && cameraPlacement.safeDistance >= 2.5
      && camera.position.distanceTo(cameraStart) < 2.5
    ) {
      camera.position.copy(cameraDesired);
    }
    if (playerRootRef.current) {
      playerRootRef.current.visible = cameraMode !== "first-person";
    }
    cameraLook.set(
      cameraFrame.lookAt.x,
      cameraFrame.lookAt.y,
      cameraFrame.lookAt.z,
    );
    if (indoorBuilding && cameraMode === "third-person") {
      const indoorLook = clampWarRoomCameraToInterior(
        { x: cameraLook.x, y: cameraLook.y, z: cameraLook.z },
        indoorBuilding,
        0.2,
      );
      cameraLook.set(indoorLook.x, indoorLook.y, indoorLook.z);
    }
    if (camera.rotation.order !== "YXZ") camera.rotation.order = "YXZ";
    camera.lookAt(cameraLook);
    camera.rotation.z = 0;
    // The renderer updates the full scene graph before drawing. Only the camera
    // needs an immediate matrix update for the aim ray later in this frame.
    camera.updateMatrixWorld();
    const lookDebugWallNow = performance.now();
    if (
      (debugMode || debugDiagnosticsEnabled)
      && lookDebugWallNow - lookDebugAtRef.current >= 250
    ) {
      lookDebugAtRef.current = lookDebugWallNow;
      onLookDebugUpdate({
        yaw: input.yaw,
        pitch: input.pitch,
        x: player.x,
        y: player.floorHeight + player.jumpHeight,
        z: player.z,
        deltaX: lastLookDeltaRef.current.dx,
        deltaY: lastLookDeltaRef.current.dy,
      });
    }

    const trailWeaponId = player.meleeAttackWeaponId ?? player.weaponSlots[player.activeSlot];
    const trailWeapon = WAR_ROOM_WEAPON_BY_ID.get(trailWeaponId);
    const meleeActive = WAR_ROOM_POOLED_FX_ENABLED
      && trailWeapon?.weaponClass === "melee"
      && player.meleeUntil > now;
    if (meleeActive && trailWeapon) {
      if (slashTrailState.attackStartedAt !== player.meleeStartedAt) {
        slashTrailState.attackStartedAt = player.meleeStartedAt;
        slashTrailState.count = 0;
        const trailProfile = getWarRoomImpactFxProfile(
          false,
          player.meleeAttackHeavy,
          "flesh",
          trailWeaponId,
        );
        slashTrailState.tint
          .set(trailProfile.trailColor)
          .multiplyScalar(Math.max(1, trailProfile.trailIntensity));
      }
      const progress = Math.max(0, Math.min(1, (now - player.meleeStartedAt) / Math.max(0.01, player.meleeDuration)));
      const prepareEnd = player.meleeAttackHeavy ? 0.4 : 0.28;
      if (progress >= prepareEnd && progress <= 0.82) {
        const weaponMount = playerRootRef.current?.getObjectByName("war-room-weapon-mount");
        if (weaponMount) {
          weaponMount.updateWorldMatrix(true, false);
          const bladeLength = Math.max(0.3, Math.min(0.82, (trailWeapon.normalizeLength ?? trailWeapon.range * 0.56) * 0.72));
          const trailHalfWidth = Math.max(0.11, Math.min(0.2, bladeLength * 0.24));
          const bladeTipZ = -Math.max(0.36, Math.min(0.88, bladeLength));
          slashLocalBase.set(-trailHalfWidth, 0.02, bladeTipZ);
          slashLocalTip.set(trailHalfWidth, 0.02, bladeTipZ);
          slashBase.copy(weaponMount.localToWorld(slashLocalBase));
          slashTip.copy(weaponMount.localToWorld(slashLocalTip));
          for (let index = Math.min(slashTrailState.count, qualityProfile.slashTrailSegments); index > 0; index -= 1) {
            const previous = slashTrailState.samples[index - 1];
            const current = slashTrailState.samples[index];
            current.base.copy(previous.base);
            current.tip.copy(previous.tip);
            current.born = previous.born;
          }
          slashTrailState.count = Math.min(qualityProfile.slashTrailSegments + 1, slashTrailState.count + 1);
          const newest = slashTrailState.samples[0];
          newest.base.copy(slashBase);
          newest.tip.copy(slashTip);
          newest.born = now;
        }
      }
    } else {
      slashTrailState.count = 0;
    }
    while (
      slashTrailState.count > 0
      && now - slashTrailState.samples[slashTrailState.count - 1].born >= 0.22
    ) {
      slashTrailState.count -= 1;
    }
    const trailAttribute = slashTrailState.geometry.getAttribute("position") as THREE.BufferAttribute;
    const trailColorAttribute = slashTrailState.geometry.getAttribute("color") as THREE.BufferAttribute;
    for (let row = 0; row < slashTrailState.count; row += 1) {
      const sample = slashTrailState.samples[slashTrailState.count - 1 - row];
      const ageAlpha = Math.max(0, 1 - (now - sample.born) / 0.12);
      const offset = row * 6;
      slashTrailState.positions.set(
        [sample.base.x, sample.base.y, sample.base.z, sample.tip.x, sample.tip.y, sample.tip.z],
        offset,
      );
      for (let vertex = 0; vertex < 2; vertex += 1) {
        const colorOffset = offset + vertex * 3;
        slashTrailState.colors[colorOffset] = slashTrailState.tint.r * ageAlpha;
        slashTrailState.colors[colorOffset + 1] = slashTrailState.tint.g * ageAlpha;
        slashTrailState.colors[colorOffset + 2] = slashTrailState.tint.b * ageAlpha;
      }
    }
    trailAttribute.needsUpdate = true;
    trailColorAttribute.needsUpdate = true;
    slashTrailState.geometry.setDrawRange(0, Math.max(0, slashTrailState.count - 1) * 6);

    const activeWeapon = WAR_ROOM_WEAPON_BY_ID.get(player.weaponSlots[player.activeSlot])!;
    if (activeWeapon.weaponClass === "melee") {
      const attackBonus = player.meleeUntil > now ? player.meleeAttackRangeBonus : 0;
      const meleeReach = getWarRoomMeleeEffectiveReach(activeWeapon.id, activeWeapon.range, attackBonus);
      const baseYaw = player.meleeUntil > now ? player.meleeAttackYaw : player.yaw;
      const targetYaw = WAR_ROOM_COMBAT_FEEL_ENABLED
        ? getWarRoomMeleeAssistYaw(
          player.x,
          player.z,
          baseYaw,
          runtime.enemies,
          meleeReach,
          (enemy) => isMeleeTargetBlocked(player, enemy),
        )
        : baseYaw;
      const meleeTarget = getMeleeAimHit(meleeReach, targetYaw);
      player.targetId = meleeTarget.enemy?.id ?? null;
      player.targetName = meleeTarget.enemy?.name ?? null;
      player.targetReason = meleeTarget.enemy ? "hit" : meleeTarget.reason;
    } else {
      const aim = getAimHit(0, 0, aimDistance);
      player.targetId = aim.enemy?.id ?? null;
      player.targetName = aim.enemy?.name ?? null;
      player.targetReason = aim.enemy ? "hit" : aim.blocked ? "blocked" : "no-target";
    }

    let snapshot: WarRoomHudSnapshot | null = null;
    if (now - lastHudAtRef.current >= 0.1) {
      lastHudAtRef.current = now;
      snapshot = buildHudSnapshot(runtime, now, input);
      onHudUpdate(snapshot);
    }
    const remaining = getWarRoomRemaining(runtime);
    let openedChests = 0;
    for (const chest of runtime.lootChests) {
      if (chest.opened) openedChests += 1;
    }
    const missionOutcome = getWarRoomMissionOutcome(runtime.mission.mode, {
      remaining,
      openedChests,
      elapsedSeconds: Math.max(0, now - player.startTime),
      playerHp: player.hp,
      defenseHp: runtime.mission.defenseHp,
    }, runtime.mission);
    if (!finishedRef.current && missionOutcome === "defeat") {
      finishedRef.current = true;
      onFinish("defeat", snapshot ?? buildHudSnapshot(runtime, now, input));
    } else if (
      !finishedRef.current
      && (missionOutcome === "victory" || missionOutcome === "wave-complete")
      && (runtime.mission.mode === "treasure"
        || runtime.mission.mode === "defense"
        || !WAR_ROOM_LAST_ENEMY_CINEMATIC_ENABLED
        || (cinematicStartedAt !== null && cinematicElapsed >= WAR_ROOM_ENEMY_DEATH_FADE_SECONDS))
    ) {
      finishedRef.current = true;
      onFinish("victory", snapshot ?? buildHudSnapshot(runtime, now, input));
    }
    } catch {
      pauseWarRoomInput(input);
      onRuntimeError();
    }
  });

  const runtime = runtimeRef.current;
  const activeWeapon = runtime.player.weaponSlots[runtime.player.activeSlot];
  return (
    <>
      <TimeOfDaySky quality={quality} />
      <WarRoomBattlefield runtime={runtime} runtimeRef={runtimeRef} />
      {RESTORE_CONFIG.enabled && runtime.healingPoints.map((point) => (
        <WarRoomHealingPointMarker
          key={point.id}
          point={point}
          readNow={() => runtimeRef.current.player.clockTime}
        />
      ))}
      {runtime.enemies.map((enemy) => (
        <WarRoomTargetMarker
          key={`target-${enemy.id}`}
          enemy={enemy}
          readTargetId={() => runtimeRef.current.player.targetId}
          readNow={() => runtimeRef.current.player.clockTime}
        />
      ))}
      <primitive object={tracerLines} dispose={null} />
      <primitive object={particleMesh} dispose={null} />
      <primitive object={decalMesh} dispose={null} />
      <primitive object={projectileShafts} dispose={null} />
      <primitive object={projectileHeads} dispose={null} />
      <group userData={{ runtime }}>
        {runtime.enemies.map((enemy, index) => (
          <EnemyActor
            key={enemy.id}
            enemy={enemy}
            index={index}
            inputRef={inputRef}
            groupRefs={enemyGroupRefs}
          />
        ))}
      </group>
      <PlayerActor
        runtimeRef={runtimeRef}
        inputRef={inputRef}
        movementBasisYawRef={movementBasisYawRef}
        renderPositionRef={playerRenderPositionRef}
        weaponId={activeWeapon}
        weaponMountOverrides={weaponMountOverrides}
        rootRef={playerRootRef}
        muzzleRef={playerMuzzleRef}
        flashRef={playerMuzzleFlashRef}
      />
      {createPortal(
        <>
          <hemisphereLight args={["#fff0dc", "#59483b", 1.6]} />
          <directionalLight color="#fff0d7" intensity={1.8} position={[1.5, 2.5, 3]} />
          <FirstPersonWeaponViewModel
            runtimeRef={runtimeRef}
            inputRef={inputRef}
            cameraBounds={logicalCameraBounds}
            weaponId={activeWeapon}
            weaponMountOverrides={weaponMountOverrides}
            cameraMode={cameraMode}
            motionReduced={motionReduced}
            weaponSway={weaponSway}
            armsVisible={armsVisible}
            sourceCamera={camera}
          />
        </>,
        viewModelScene,
        { camera: viewModelCamera },
      )}
      <MeleeDebugCone
        runtimeRef={runtimeRef}
        inputRef={inputRef}
        weaponId={activeWeapon}
        enabled={debugMode}
      />
    </>
  );
}

function WarRoomShaderWarmup({
  onComplete,
}: {
  onComplete: (succeeded: boolean) => void;
}) {
  const { camera, gl, scene } = useThree();
  useEffect(() => {
    let cancelled = false;
    let finished = false;
    let timeout = 0;
    const startedAt = performance.now();
    const finish = (succeeded: boolean) => {
      if (cancelled || finished) return;
      finished = true;
      window.clearTimeout(timeout);
      recordWarRoomShaderWarmup(
        warRoomPerformanceCollector,
        performance.now() - startedAt,
        succeeded,
      );
      onComplete(succeeded);
    };
    timeout = window.setTimeout(() => finish(false), 10_000);
    void (async () => {
      try {
        if (typeof gl.compileAsync === "function") {
          await gl.compileAsync(scene, camera);
        } else {
          gl.compile(scene, camera);
        }
        finish(true);
      } catch {
        finish(false);
      }
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [camera, gl, onComplete, scene]);
  return null;
}

export default memo(function WarRoomScene3D(props: Props) {
  const { quality, onWarmupComplete, ...runtimeProps } = props;
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryNotice, setRecoveryNotice] = useState(false);
  const [warmupComplete, setWarmupComplete] = useState(false);
  const recoveryNoticeTimerRef = useRef<number | null>(null);
  const warmupCompletedRef = useRef(false);
  const recoveryInProgressRef = useRef(false);
  const resumeAfterRecoveryRef = useRef(false);
  const effectiveQuality: RenderQuality = recoveryMode ? "low" : quality;
  const touchDevice = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const maxPixelRatio = getWarRoomPixelRatio(
    effectiveQuality,
    typeof window === "undefined" ? 1 : window.devicePixelRatio,
    touchDevice,
  );
  // Keep Canvas's prop aligned with runtime DPR changes so React renders do not reset them.
  const [adaptiveDpr, setAdaptiveDpr] = useState(() => ({
    maxPixelRatio,
    pixelRatio: maxPixelRatio,
  }));
  const canvasPixelRatio = adaptiveDpr.maxPixelRatio === maxPixelRatio
    ? adaptiveDpr.pixelRatio
    : maxPixelRatio;
  const handleAdaptivePixelRatioChange = useCallback((pixelRatio: number) => {
    setAdaptiveDpr((current) => current.maxPixelRatio === maxPixelRatio
      && current.pixelRatio === pixelRatio
      ? current
      : { maxPixelRatio, pixelRatio });
  }, [maxPixelRatio]);
  const handleRepeatedStall = useCallback(() => {
    setRecoveryMode(true);
    setRecoveryNotice(true);
    if (recoveryNoticeTimerRef.current !== null) {
      window.clearTimeout(recoveryNoticeTimerRef.current);
    }
    recoveryNoticeTimerRef.current = window.setTimeout(() => {
      recoveryNoticeTimerRef.current = null;
      setRecoveryNotice(false);
    }, 5_000);
  }, []);
  const pauseForCanvasRecovery = useCallback(() => {
    if (!recoveryInProgressRef.current) {
      recoveryInProgressRef.current = true;
      resumeAfterRecoveryRef.current = !warmupCompletedRef.current
        || !props.inputRef.current.paused;
    }
    pauseWarRoomInput(props.inputRef.current);
    resetWarRoomPerformanceFrameClock();
  }, [props.inputRef]);
  const handleWarmupComplete = useCallback((succeeded: boolean) => {
    setWarmupComplete(true);
    warmupCompletedRef.current = true;
    if (!recoveryInProgressRef.current || resumeAfterRecoveryRef.current) {
      onWarmupComplete(succeeded);
    }
    recoveryInProgressRef.current = false;
    resumeAfterRecoveryRef.current = false;
  }, [onWarmupComplete]);
  const shadowsEnabled = typeof window !== "undefined"
    && !window.matchMedia("(pointer: coarse)").matches
    && effectiveQuality !== "low";
  const [canvasGeneration, setCanvasGeneration] = useState(0);
  const [contextLost, setContextLost] = useState(false);
  const contextListenersRef = useRef<(() => void) | null>(null);
  const retryCanvas = useCallback(() => {
    pauseForCanvasRecovery();
    contextListenersRef.current?.();
    contextListenersRef.current = null;
    setWarmupComplete(false);
    warmupCompletedRef.current = false;
    setContextLost(false);
    setCanvasGeneration((generation) => generation + 1);
  }, [pauseForCanvasRecovery]);
  const handleCanvasCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    contextListenersRef.current?.();
    const canvas = gl.domElement;
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      pauseForCanvasRecovery();
      setWarmupComplete(false);
      warmupCompletedRef.current = false;
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
      setWarmupComplete(false);
      setCanvasGeneration((generation) => generation + 1);
    };
    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);
    contextListenersRef.current = () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
    };
    gl.shadowMap.enabled = shadowsEnabled;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    gl.toneMappingExposure = 1.12;
  }, [pauseForCanvasRecovery, shadowsEnabled]);

  useEffect(() => () => {
    contextListenersRef.current?.();
    contextListenersRef.current = null;
  }, []);
  useEffect(() => () => {
    if (recoveryNoticeTimerRef.current !== null) {
      window.clearTimeout(recoveryNoticeTimerRef.current);
    }
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <WarRoomSceneErrorBoundary
        key={canvasGeneration}
        onRetry={retryCanvas}
        onError={pauseForCanvasRecovery}
      >
        <Canvas
          key={canvasGeneration}
          resize={{ debounce: { resize: 150, scroll: 150 } }}
          dpr={canvasPixelRatio}
          frameloop="always"
          shadows={shadowsEnabled}
          camera={{
            position: [0, 3, 5],
            fov: WAR_ROOM_CONFIG.camera.firstPerson.fov,
            near: WAR_ROOM_CONFIG.camera.firstPerson.near,
            far: WAR_ROOM_CONFIG.camera.firstPerson.far,
          }}
          gl={{
            antialias: effectiveQuality === "high" && !touchDevice,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
          }}
          onCreated={handleCanvasCreated}
        >
          <WarRoomAdaptiveDpr
            quality={effectiveQuality}
            touchDevice={touchDevice}
            onPixelRatioChange={handleAdaptivePixelRatioChange}
            onRepeatedStall={handleRepeatedStall}
          />
          <WarRoomShaderWarmup onComplete={handleWarmupComplete} />
          <WarRoomRuntimeScene {...runtimeProps} quality={effectiveQuality} />
        </Canvas>
      </WarRoomSceneErrorBoundary>
      {!warmupComplete && !contextLost && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 20,
            display: "grid",
            placeItems: "center",
            background: "rgba(7, 10, 16, 0.88)",
            color: "#f4ead7",
            font: "700 12px/1.5 Manrope, sans-serif",
            letterSpacing: ".14em",
            pointerEvents: "none",
          }}
        >
          SAVAŞ ALANI HAZIRLANIYOR
        </div>
      )}
      {recoveryNotice && !contextLost && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "absolute",
            zIndex: 25,
            top: "max(12px, env(safe-area-inset-top))",
            left: "50%",
            transform: "translateX(-50%)",
            maxWidth: "calc(100% - 24px)",
            padding: "9px 14px",
            border: "1px solid rgba(235,198,126,.5)",
            borderRadius: 5,
            background: "rgba(17,17,21,.92)",
            color: "#f4ead7",
            font: "700 11px/1.4 Manrope, sans-serif",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          OYUN TOPARLANDI · GRAFİK YÜKÜ AZALTILDI
        </div>
      )}
      {contextLost && (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 30,
            display: "grid",
            alignContent: "center",
            justifyItems: "center",
            gap: 12,
            padding: 24,
            background: "rgba(7, 10, 16, 0.96)",
            color: "#f4ead7",
            textAlign: "center",
            font: "600 14px/1.5 Manrope, sans-serif",
          }}
        >
          <strong style={{ font: "700 20px/1.3 Cinzel, Georgia, serif" }}>
            3D bağlantısı kesildi
          </strong>
          <span>Sahne geri yüklenince yeniden başlatabilir veya elle deneyebilirsin.</span>
          <button
            type="button"
            onClick={retryCanvas}
            style={{
              minHeight: 44,
              padding: "0 20px",
              border: "1px solid rgba(212, 177, 111, .65)",
              borderRadius: 7,
              background: "linear-gradient(120deg, #f0d08a, #ba7b36)",
              color: "#1b1711",
              fontWeight: 800,
            }}
          >
            3D sahneyi yeniden başlat
          </button>
        </div>
      )}
    </div>
  );
});
