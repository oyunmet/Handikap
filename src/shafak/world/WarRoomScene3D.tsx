import { Canvas, createPortal, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useMemo, useRef, type MutableRefObject } from "react";
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
import type { WarRoomRoom } from "../game/war-room-rooms";
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
import { getWarRoomMeleeAssistYaw, getWarRoomMeleeAttackPlan } from "../game/war-room-combat-feel";
import {
  cancelWarRoomPostAttackStrafeOnMovement,
  getWarRoomPostAttackStrafeUntil,
  resolveWarRoomLocomotion,
  resolveWarRoomOrientation,
  getWarRoomActorYawToTarget,
  stepWarRoomYaw,
} from "../game/war-room-orientation";
import {
  getWarRoomCameraRig,
  resolveWarRoomCameraSweep,
  type WarRoomCameraBounds,
  type WarRoomCameraMode,
  type WarRoomShoulderSide,
} from "../game/war-room-camera";
import {
  getWarRoomViewModelConfig,
  getWarRoomViewModelHorizontalFactor,
  getWarRoomViewModelPose,
  getWarRoomViewModelScaleFactor,
} from "../game/war-room-viewmodel";
import {
  getWarRoomImpactFxProfile,
  WAR_ROOM_CRACK_DECAL_LIFETIME_SECONDS,
  WAR_ROOM_DECAL_POOL_SIZE,
  WAR_ROOM_EFFECT_POOL_SIZE,
  WAR_ROOM_SLASH_TRAIL_SEGMENTS,
} from "../game/war-room-fx";
import {
  WAR_ROOM_CAMERA_FACING_ENABLED,
  WAR_ROOM_CAMERA_OCCLUSION_ENABLED,
  WAR_ROOM_COMBAT_FEEL_ENABLED,
  WAR_ROOM_COMMANDER_TELEGRAPH_ENABLED,
  WAR_ROOM_LAST_ENEMY_CINEMATIC_ENABLED,
  WAR_ROOM_POOLED_FX_ENABLED,
  WAR_ROOM_REACTION_FEEDBACK_ENABLED,
  WAR_ROOM_WEAPON_PRESENTATION_ENABLED,
} from "../game/war-room-features";
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
import { disposeWarRoomSceneResources } from "../game/war-room-dispose";
import type { RenderQuality } from "./graphics-quality";
import TimeOfDaySky from "./TimeOfDaySky";
import { createWorldRoadSurfaceTextures } from "./world-road-textures";
import {
  applyWarRoomDamage,
  getNearestWarRoomCover,
  getWarRoomCommanderHealth,
  getWarRoomRemaining,
  moveWarRoomEntity,
  nextWarRoomRandom,
  segmentBlockFraction,
  shortestAngleDelta,
  type WarRoomEnemy,
  type WarRoomHudSnapshot,
  type WarRoomInputState,
  type WarRoomRuntime,
} from "../game/war-room-engine";
import {
  getWarRoomMeleeImpactCues,
  playWarRoomSound,
  type WarRoomShotStyle,
  type WarRoomSoundOptions,
  type WarRoomSoundSurface,
} from "../game/war-room-audio";
import { isWarRoomLowHealth } from "../game/war-room-feedback";
import { PLAYER_CHARACTER_MODEL_FACING } from "./player-model";
import {
  WarRoomAnimatedActor,
  WarRoomAssetBoundary,
  WarRoomStaticModel,
  type WarRoomAnimationState,
} from "./WarRoomModels";

type Props = {
  runtimeRef: MutableRefObject<WarRoomRuntime>;
  inputRef: MutableRefObject<WarRoomInputState>;
  weaponIds: readonly [WarRoomWeaponId, WarRoomWeaponId];
  weaponMountOverrides?: Partial<Record<WarRoomWeaponId, WarRoomWeaponMount>>;
  cameraMode: WarRoomCameraMode;
  motionReduced: boolean;
  shoulderSide: WarRoomShoulderSide;
  shoulderOffset: number;
  bloodEffects: boolean;
  trainingMode: boolean;
  quality: RenderQuality;
  debugMode: boolean;
  onMeleeDebugUpdate: (message: string) => void;
  onRenderStats: (stats: WarRoomFrameStats) => void;
  onHudUpdate: (snapshot: WarRoomHudSnapshot) => void;
  onFinish: (result: "victory" | "defeat", snapshot: WarRoomHudSnapshot) => void;
};

const WAR_ROOM_ROAD_TEXTURES = createWorldRoadSurfaceTextures();
const WAR_ROOM_FLOOR_MATERIAL = new THREE.MeshStandardMaterial({
  color: "#ffffff",
  map: WAR_ROOM_ROAD_TEXTURES.roadVariants[0].color,
  normalMap: WAR_ROOM_ROAD_TEXTURES.roadVariants[0].normal,
  normalScale: new THREE.Vector2(0.27, 0.27),
  roughnessMap: WAR_ROOM_ROAD_TEXTURES.roadVariants[0].roughness,
  roughness: 0.94,
  metalness: 0,
  flatShading: false,
});
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
      const nextOpacity = original.opacity * (1 - progress * 0.55);
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

function StaticWarRoomAsset({
  src,
  position,
  targetSize,
  rotation,
  fallback,
}: {
  src: string;
  position: readonly [number, number, number];
  targetSize: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  fallback: ReactNode;
}) {
  const cameraOccluderId = `asset:${src}:${position.join(":")}`;
  return (
    <group
      name={`war-room-camera-occluder:${cameraOccluderId}`}
      userData={{ warRoomCameraOccluderId: cameraOccluderId }}
    >
      <WarRoomAssetBoundary fallback={fallback}>
        <Suspense fallback={fallback}>
          <WarRoomStaticModel src={src} position={position} targetSize={targetSize} rotation={rotation} />
        </Suspense>
      </WarRoomAssetBoundary>
    </group>
  );
}

function BlockerFallback({ blocker }: { blocker: WarRoomBlocker }) {
  return (
    <group>
      <mesh position={[blocker.x, blocker.height / 2, blocker.z]} castShadow receiveShadow>
        <boxGeometry args={[blocker.width, blocker.height, blocker.depth]} />
        <meshStandardMaterial color={blocker.color} roughness={blocker.kind === "cover" ? 0.9 : 0.78} />
      </mesh>
      {blocker.kind === "tower" && (
        <>
          <mesh position={[blocker.x, blocker.height + 0.5, blocker.z]} castShadow>
            <boxGeometry args={[blocker.width + 0.5, 1, blocker.depth + 0.5]} />
            <meshStandardMaterial color="#88715b" roughness={0.82} />
          </mesh>
          <mesh position={[blocker.x, blocker.height + 1.15, blocker.z]} castShadow>
            <coneGeometry args={[blocker.width * 0.52, 1.7, 4]} />
            <meshStandardMaterial color="#59443d" roughness={0.88} />
          </mesh>
        </>
      )}
    </group>
  );
}

function WarRoomHouse({ blocker }: { blocker: WarRoomBlocker }) {
  const wallHeight = Math.min(blocker.height * 0.62, 6.1);
  const front = -blocker.depth / 2 - 0.08;
  const roofAngle = 0.38;
  const windowMaterial = (
    <meshStandardMaterial
      color="#26303a"
      emissive="#b8753d"
      emissiveIntensity={0.16}
      roughness={0.46}
      metalness={0.08}
    />
  );

  return (
    <group
      position={[blocker.x, 0, blocker.z]}
      rotation={[0, blocker.id === "east-tower" ? Math.PI : 0, 0]}
      userData={{ warRoomCameraOccluderId: blocker.id }}
    >
      <mesh position={[0, wallHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[blocker.width, wallHeight, blocker.depth]} />
        <meshStandardMaterial color="#817568" roughness={0.92} />
      </mesh>
      <mesh position={[0, 2.8, front]} castShadow receiveShadow>
        <boxGeometry args={[blocker.width * 0.83, 5.6, 0.09]} />
        <meshStandardMaterial color="#594b43" roughness={0.86} />
      </mesh>
      <mesh position={[0, wallHeight * 0.48, front - 0.08]} castShadow>
        <boxGeometry args={[0.92, 2.1, 0.12]} />
        <meshStandardMaterial color="#332923" roughness={0.84} />
      </mesh>
      <mesh position={[0.28, wallHeight * 0.48, front - 0.15]}>
        <sphereGeometry args={[0.045, 6, 5]} />
        <meshStandardMaterial color="#d7a454" metalness={0.56} roughness={0.32} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={`house-window-${side}`}>
          <mesh position={[side * blocker.width * 0.25, wallHeight * 0.43, front - 0.1]}>
            <boxGeometry args={[1.12, 0.88, 0.08]} />
            {windowMaterial}
          </mesh>
          <mesh position={[side * blocker.width * 0.25, wallHeight * 0.76, front - 0.1]}>
            <boxGeometry args={[1.02, 0.74, 0.08]} />
            {windowMaterial}
          </mesh>
        </group>
      ))}
      {[-1, 1].map((side) => (
        <mesh
          key={`house-timber-${side}`}
          position={[side * (blocker.width * 0.43), wallHeight / 2, front - 0.12]}
          castShadow
        >
          <boxGeometry args={[0.16, wallHeight, 0.16]} />
          <meshStandardMaterial color="#44352d" roughness={0.84} />
        </mesh>
      ))}
      <mesh position={[0, wallHeight + 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[blocker.width + 0.48, 0.3, blocker.depth + 0.48]} />
        <meshStandardMaterial color="#53443b" roughness={0.9} />
      </mesh>
      <mesh
        position={[0, wallHeight + 0.38, -blocker.depth * 0.22]}
        rotation={[-roofAngle, 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[blocker.width + 0.56, 0.2, blocker.depth * 0.58]} />
        <meshStandardMaterial color="#493833" roughness={0.9} />
      </mesh>
      <mesh
        position={[0, wallHeight + 0.38, blocker.depth * 0.22]}
        rotation={[roofAngle, 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[blocker.width + 0.56, 0.2, blocker.depth * 0.58]} />
        <meshStandardMaterial color="#493833" roughness={0.9} />
      </mesh>
    </group>
  );
}

function WarRoomBuildingShell({ building }: { building: WarRoomRoom["buildings"][number] }) {
  const front = -building.depth / 2;
  const roofAngle = 0.38;
  const windowPositions = [-1, 1].map((side) => side * building.width * 0.29);

  return (
    <group
      position={[building.x, 0, building.z]}
      rotation={[0, building.rotationY, 0]}
    >
      <mesh position={[0, -0.045, 0]} receiveShadow>
        <boxGeometry args={[building.width - 0.48, 0.15, building.depth - 0.48]} />
        <meshStandardMaterial color="#9a836b" roughness={0.96} />
      </mesh>
      <mesh position={[0, 0.035, 0]} receiveShadow>
        <boxGeometry args={[building.width - 0.9, 0.035, building.depth - 0.9]} />
        <meshStandardMaterial color="#b19b7f" roughness={0.94} />
      </mesh>
      <mesh position={[0, 0.064, 0]} receiveShadow>
        <boxGeometry args={[1.9, 0.025, 2.8]} />
        <meshStandardMaterial color="#785444" roughness={0.96} />
      </mesh>
      {[-building.doorWidth / 2, building.doorWidth / 2].map((x) => (
        <mesh key={`door-post-${x}`} position={[x, building.wallHeight / 2, front - 0.16]} castShadow>
          <boxGeometry args={[0.2, building.wallHeight, 0.26]} />
          <meshStandardMaterial color="#564337" roughness={0.88} />
        </mesh>
      ))}
      <mesh position={[0, building.wallHeight - 0.16, front - 0.16]} castShadow>
        <boxGeometry args={[building.doorWidth + 0.2, 0.3, 0.27]} />
        <meshStandardMaterial color="#564337" roughness={0.88} />
      </mesh>
      {windowPositions.map((x) => (
        <group key={`front-window-${x}`} position={[x, building.wallHeight * 0.56, front - 0.25]}>
          <mesh>
            <boxGeometry args={[1.1, 0.9, 0.09]} />
            <meshStandardMaterial color="#293039" emissive="#b8753d" emissiveIntensity={0.18} roughness={0.5} />
          </mesh>
          {[-0.59, 0.59].map((frameX) => (
            <mesh key={frameX} position={[frameX, 0, 0.055]}>
              <boxGeometry args={[0.09, 1.08, 0.08]} />
              <meshStandardMaterial color="#4e3b30" roughness={0.86} />
            </mesh>
          ))}
          <mesh position={[0, 0, 0.055]}>
            <boxGeometry args={[0.07, 0.88, 0.08]} />
            <meshStandardMaterial color="#4e3b30" roughness={0.86} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 3.05, 0]} castShadow>
        <boxGeometry args={[0.12, 0.13, 0.12]} />
        <meshStandardMaterial color="#564337" roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.82, 0]}>
        <sphereGeometry args={[0.16, 7, 5]} />
        <meshStandardMaterial color="#edbd73" emissive="#fa9a47" emissiveIntensity={1.15} roughness={0.35} />
      </mesh>
      <pointLight position={[0, 2.7, 0]} color="#ffad66" intensity={2.2} distance={8} />
      <group
        name={`war-room-camera-occluder:roof:${building.id}`}
        userData={{ warRoomCameraOccluderId: `roof:${building.id}` }}
      >
        <mesh
          position={[0, building.wallHeight + 0.38, -building.depth * 0.22]}
          rotation={[-roofAngle, 0, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[building.width + 0.56, 0.2, building.depth * 0.58]} />
          <meshStandardMaterial color="#59413a" roughness={0.91} />
        </mesh>
        <mesh
          position={[0, building.wallHeight + 0.38, building.depth * 0.22]}
          rotation={[roofAngle, 0, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[building.width + 0.56, 0.2, building.depth * 0.58]} />
          <meshStandardMaterial color="#59413a" roughness={0.91} />
        </mesh>
        <mesh position={[0, building.wallHeight + 0.12, 0]} castShadow>
          <boxGeometry args={[building.width + 0.45, 0.3, building.depth + 0.45]} />
          <meshStandardMaterial color="#463730" roughness={0.93} />
        </mesh>
      </group>
    </group>
  );
}

function WarRoomHideoutCrate({ blocker }: { blocker: WarRoomBlocker }) {
  const { width, height, depth } = blocker;
  return (
    <group
      position={[blocker.x, 0, blocker.z]}
      userData={{ warRoomCameraOccluderId: blocker.id }}
    >
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color="#76543b" roughness={0.92} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, height * 0.28, side * (depth / 2 + 0.015)]} castShadow>
          <boxGeometry args={[width * 0.86, 0.1, 0.04]} />
          <meshStandardMaterial color="#a27a50" roughness={0.88} />
        </mesh>
      ))}
      <mesh position={[0, height * 0.72, depth / 2 + 0.016]} castShadow>
        <boxGeometry args={[width * 0.9, 0.1, 0.04]} />
        <meshStandardMaterial color="#a27a50" roughness={0.88} />
      </mesh>
    </group>
  );
}

function WarRoomBlockerVisual({ blocker }: { blocker: WarRoomBlocker }) {
  const fallback = <BlockerFallback blocker={blocker} />;
  if (blocker.kind === "wall") {
    return (
      <StaticWarRoomAsset
        src="/models/war-room/wall.glb"
        position={[blocker.x, 0, blocker.z]}
        targetSize={[blocker.width, blocker.height, blocker.depth]}
        fallback={fallback}
      />
    );
  }
  if (blocker.kind === "cover") {
    if (blocker.id.startsWith("hideout-crate-")) {
      return <WarRoomHideoutCrate blocker={blocker} />;
    }
    return (
      <StaticWarRoomAsset
        src="/models/war-room/rocks-large.glb"
        position={[blocker.x, 0, blocker.z]}
        targetSize={[blocker.width, blocker.height, blocker.depth]}
        fallback={fallback}
      />
    );
  }
  if (blocker.kind === "tower") {
    return <WarRoomHouse blocker={blocker} />;
  }
  if (blocker.kind === "platform") {
    return (
      <StaticWarRoomAsset
        src="/models/war-room/wall.glb"
        position={[blocker.x, 0, blocker.z]}
        targetSize={[blocker.width, blocker.height, blocker.depth]}
        fallback={fallback}
      />
    );
  }
  return fallback;
}

function WarRoomGateway({
  id,
  position,
  rotationY,
}: {
  id: string;
  position: readonly [number, number];
  rotationY: number;
}) {
  const pierPositions = [-2.72, 2.72] as const;
  return (
    <group
      position={[position[0], 0, position[1]]}
      rotation={[0, rotationY, 0]}
      name={`war-room-camera-occluder:gateway:${id}`}
      userData={{ warRoomCameraOccluderId: `gateway:${id}` }}
    >
      {pierPositions.map((x) => (
        <StaticWarRoomAsset
          key={`pier-${x}`}
          src="/models/war-room/wall.glb"
          position={[x, 0, 0]}
          targetSize={[0.8, 3.05, 1.05]}
          fallback={
            <mesh position={[x, 1.52, 0]} castShadow>
              <boxGeometry args={[0.8, 3.05, 1.05]} />
              <meshStandardMaterial color="#70564b" roughness={0.86} />
            </mesh>
          }
        />
      ))}
      <StaticWarRoomAsset
        src="/models/war-room/tower-square-top.glb"
        position={[0, 3.05, 0]}
        targetSize={[6.25, 0.72, 1.25]}
        fallback={
          <mesh position={[0, 3.05, 0]} castShadow>
            <boxGeometry args={[6.25, 0.72, 1.25]} />
            <meshStandardMaterial color="#88715b" roughness={0.82} />
          </mesh>
        }
      />
      <StaticWarRoomAsset
        src="/models/war-room/tower-square-roof.glb"
        position={[0, 3.45, 0]}
        targetSize={[6.55, 0.55, 1.45]}
        fallback={
          <mesh position={[0, 3.48, 0]} castShadow>
            <boxGeometry args={[6.55, 0.55, 1.45]} />
            <meshStandardMaterial color="#59443d" roughness={0.88} />
          </mesh>
        }
      />
    </group>
  );
}

function WarRoomTree({ position }: { position: readonly [number, number, number] }) {
  const cameraOccluderId = `tree:${position[0]}:${position[2]}`;
  return (
    <group
      position={position}
      scale={0.9}
      name={`war-room-camera-occluder:${cameraOccluderId}`}
      userData={{ warRoomCameraOccluderId: cameraOccluderId }}
    >
      <mesh position={[0, 0.95, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.12, 0.2, 1.9, 6]} />
        <meshStandardMaterial color="#46372c" roughness={0.96} />
      </mesh>
      {[0, 1, 2].map((tier) => (
        <mesh key={tier} position={[0, 1.45 + tier * 0.83, 0]} castShadow receiveShadow>
          <coneGeometry args={[1.05 - tier * 0.18, 1.65, 7]} />
          <meshStandardMaterial
            color={tier === 0 ? "#48523d" : tier === 1 ? "#596448" : "#697252"}
            roughness={0.94}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}

function FloorPaving({ palette }: { palette: WarRoomRoom["theme"]["tiles"] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.PlaneGeometry(7.92, 7.92), []);
  const tiles = useMemo(() => {
    const result: Array<{ x: number; z: number; color: string }> = [];
    for (let row = 0; row < 9; row += 1) {
      for (let column = 0; column < 9; column += 1) {
        result.push({
          x: -32 + column * 8,
          z: -32 + row * 8,
          color: palette[(row * 3 + column * 2) % palette.length],
        });
      }
    }
    return result;
  }, [palette]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const transform = new THREE.Object3D();
    tiles.forEach((tile, index) => {
      transform.position.set(tile.x, -0.11, tile.z);
      transform.rotation.set(-Math.PI / 2, 0, 0);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
      mesh.setColorAt(index, new THREE.Color(tile.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [tiles]);

  return <instancedMesh ref={meshRef} args={[geometry, WAR_ROOM_FLOOR_MATERIAL, tiles.length]} receiveShadow />;
}

function WallDetails({ blockers }: { blockers: readonly WarRoomRoom["blockers"][number][] }) {
  const openingsRef = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#392e28", roughness: 0.93, metalness: 0 }),
    [],
  );
  const openings = useMemo(() => blockers.flatMap((blocker) => {
    if (blocker.kind !== "wall" || blocker.height < 3) return [];
    const alongX = blocker.width >= blocker.depth;
    const length = alongX ? blocker.width : blocker.depth;
    const count = Math.min(14, Math.max(2, Math.floor(length / 5)));
    return Array.from({ length: count }, (_, index) => {
      const positionAlong = -length / 2 + ((index + 1) / (count + 1)) * length;
      const centerY = Math.min(blocker.height * 0.55, 2.55);
      return [-1, 1].map((face) => ({
        x: blocker.x + (alongX ? positionAlong : face * (blocker.width / 2 + 0.035)),
        y: centerY,
        z: blocker.z + (alongX ? face * (blocker.depth / 2 + 0.035) : positionAlong),
        rotationY: alongX ? 0 : Math.PI / 2,
      }));
    }).flat();
  }), [blockers]);

  useLayoutEffect(() => {
    const mesh = openingsRef.current;
    if (!mesh) return;
    const transform = new THREE.Object3D();
    openings.forEach((opening, index) => {
      transform.position.set(opening.x, opening.y, opening.z);
      transform.rotation.set(0, opening.rotationY, 0);
      transform.scale.set(0.58, 1.22, 0.075);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [openings]);

  return (
    <instancedMesh ref={openingsRef} args={[geometry, material, openings.length]} castShadow />
  );
}

function rotateWarRoomScenePoint(x: number, z: number, quarterTurns: number) {
  switch (quarterTurns % 4) {
    case 1: return { x: z, z: -x };
    case 2: return { x: -x, z: -z };
    case 3: return { x: -z, z: x };
    default: return { x, z };
  }
}

function Battlefield({ room }: { room: WarRoomRoom }) {
  const { theme } = room;
  const quarterRotation = room.quarterTurns * Math.PI / 2;
  useLayoutEffect(() => {
    WAR_ROOM_FLOOR_MATERIAL.color.set(theme.floorTint);
  }, [theme.floorTint]);
  return (
    <>
      <color attach="background" args={[theme.sky]} />
      <fog attach="fog" args={[theme.fog, theme.fogNear, theme.fogFar]} />
      <hemisphereLight args={[theme.skyLight, theme.groundLight, 2.2]} />
      <ambientLight color={theme.ambient} intensity={1.4} />
      <directionalLight
        position={[-8, 14, 8]}
        color={theme.keyLight}
        intensity={2.4}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-38}
        shadow-camera-right={38}
        shadow-camera-top={38}
        shadow-camera-bottom={-38}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[9, 8, -7]} color={theme.fillLight} intensity={0.72} />
      <pointLight position={[-26, 3, -21]} color={theme.emberLight} intensity={8} distance={15} />
      <pointLight position={[27, 3, 18]} color={theme.emberLight} intensity={6} distance={13} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]} receiveShadow>
        <planeGeometry args={[72, 72, 1, 1]} />
        <primitive object={WAR_ROOM_FLOOR_MATERIAL} attach="material" />
      </mesh>
      <FloorPaving palette={theme.tiles} />
      {room.blockers.map((blocker) => (
        <WarRoomBlockerVisual key={blocker.id} blocker={blocker} />
      ))}
      <WallDetails blockers={room.blockers} />
      {room.buildings.map((building) => (
        <WarRoomBuildingShell key={building.id} building={building} />
      ))}
      {[4.8, 21.2].map((z, index) => {
        const point = rotateWarRoomScenePoint(0, z, room.quarterTurns);
        return (
          <WarRoomGateway
            key={`gateway-${index}`}
            id={`room-${room.number}-${index}`}
            position={[point.x, point.z]}
            rotationY={quarterRotation}
          />
        );
      })}
      {[
        [-30, 0, -5],
        [31, 0, -10],
        [-30, 0, 22],
        [31, 0, -27],
      ].map((position, index) => (
        (() => {
          const point = rotateWarRoomScenePoint(position[0], position[2], room.quarterTurns);
          return (
            <WarRoomTree
              key={`tree-fallback-${index}`}
              position={[point.x, position[1], point.z]}
            />
          );
        })()
      ))}
      {[
        [-32, 0, -32],
        [32, 0, -32],
        [-32, 0, 32],
        [32, 0, 32],
      ].map((position, index) => {
        const point = rotateWarRoomScenePoint(position[0], position[2], room.quarterTurns);
        const transformedPosition: [number, number, number] = [point.x, position[1], point.z];
        return (
          <StaticWarRoomAsset
            key={`war-room-flag-${index}`}
            src="/models/war-room/flag-pennant.glb"
            position={transformedPosition}
            rotation={[0, quarterRotation, 0]}
            targetSize={[0.85, 3.8, 0.85]}
            fallback={
              <group position={transformedPosition} rotation={[0, quarterRotation, 0]}>
                <mesh position={[0, 1.9, 0]} castShadow>
                  <cylinderGeometry args={[0.055, 0.075, 3.8, 6]} />
                  <meshStandardMaterial color="#47352d" />
                </mesh>
              </group>
            }
          />
        );
      })}
      {[
        { position: [-19, 0, 16] as [number, number, number], rotation: [0, Math.PI / 4, 0] as [number, number, number] },
        { position: [19, 0, -16] as [number, number, number], rotation: [0, -Math.PI / 3, 0] as [number, number, number] },
      ].map((siege, index) => {
        const point = rotateWarRoomScenePoint(
          siege.position[0],
          siege.position[2],
          room.quarterTurns,
        );
        const position: [number, number, number] = [point.x, siege.position[1], point.z];
        const rotation: [number, number, number] = [
          siege.rotation[0],
          siege.rotation[1] + quarterRotation,
          siege.rotation[2],
        ];
        return (
          <StaticWarRoomAsset
            key={`war-room-ballista-${index}`}
            src="/models/war-room/siege-ballista.glb"
            position={position}
            rotation={rotation}
            targetSize={[2.8, 1.65, 2.1]}
            fallback={
              <group position={position} rotation={rotation}>
                <mesh position={[0, 0.7, 0]} castShadow>
                  <boxGeometry args={[0.35, 1.3, 1.4]} />
                  <meshStandardMaterial color="#664b35" />
                </mesh>
              </group>
            }
          />
        );
      })}
      {Array.from({ length: 8 }, (_, index) => {
        const angle = index * Math.PI / 4;
        const x = Math.cos(angle) * 32;
        const z = Math.sin(angle) * 32;
        return (
          <group key={`torch-${index}`} position={[x, 3.2, z]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.13, 0.19, 1.1, 7]} />
              <meshStandardMaterial color="#4a3329" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.66, 0]}>
              <coneGeometry args={[0.22, 0.58, 6]} />
              <meshBasicMaterial color="#ffad58" toneMapped={false} />
            </mesh>
            <pointLight position={[0, 0.72, 0]} color="#ff8c42" intensity={3} distance={7} />
          </group>
        );
      })}
    </>
  );
}

function WeaponModel({
  weaponId,
  mount,
  muzzleAnchorRef,
  muzzleFlashRef,
}: {
  weaponId: WarRoomWeaponId;
  mount: WarRoomWeaponMount;
  muzzleAnchorRef?: MutableRefObject<THREE.Group | null>;
  muzzleFlashRef?: MutableRefObject<THREE.Group | null>;
}) {
  const weapon = WAR_ROOM_WEAPON_BY_ID.get(weaponId)!;
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
          {!sidearm && (
            <mesh position={[0, -0.14, -0.04]} rotation={[0.22, 0, 0]} castShadow>
              <boxGeometry args={[0.12, 0.36, 0.17]} />
              <meshStandardMaterial color="#4b3529" roughness={0.8} />
            </mesh>
          )}
          {crossbow && (
            <mesh position={[0, 0.05, -0.13]} castShadow>
              <boxGeometry args={[0.9, 0.045, 0.085]} />
              <meshStandardMaterial color="#a88558" roughness={0.68} />
            </mesh>
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
            />
          </Suspense>
        </WarRoomAssetBoundary>
      ) : meleeFallback}
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

function FirstPersonArms() {
  const sleeve = <meshStandardMaterial color="#373b3b" roughness={0.86} flatShading />;
  const cuff = <meshStandardMaterial color="#9b7950" roughness={0.54} metalness={0.42} flatShading />;
  const hand = <meshStandardMaterial color="#b98a66" roughness={0.9} flatShading />;

  return (
    <group name="war-room-first-person-arms">
      <group position={[0.38, -0.48, -0.12]} rotation={[0.04, 0.1, 0.58]}>
        <mesh castShadow={false}>
          <capsuleGeometry args={[0.12, 0.52, 3, 7]} />
          {sleeve}
        </mesh>
        <mesh position={[0, 0.2, -0.015]} rotation={[0, 0, 0]} castShadow={false}>
          <boxGeometry args={[0.25, 0.075, 0.24]} />
          {cuff}
        </mesh>
        <mesh position={[-0.14, 0.27, -0.16]} castShadow={false}>
          <sphereGeometry args={[0.115, 8, 6]} />
          {hand}
        </mesh>
        <mesh position={[-0.2, 0.3, -0.22]} rotation={[0, 0, -0.4]} castShadow={false}>
          <capsuleGeometry args={[0.043, 0.1, 2, 5]} />
          {hand}
        </mesh>
      </group>
      <group position={[-0.32, -0.45, -0.4]} rotation={[0.02, -0.08, -0.58]}>
        <mesh castShadow={false}>
          <capsuleGeometry args={[0.115, 0.5, 3, 7]} />
          {sleeve}
        </mesh>
        <mesh position={[0, 0.19, -0.015]} castShadow={false}>
          <boxGeometry args={[0.24, 0.075, 0.23]} />
          {cuff}
        </mesh>
        <mesh position={[0.1, 0.27, -0.18]} castShadow={false}>
          <sphereGeometry args={[0.11, 8, 6]} />
          {hand}
        </mesh>
        <mesh position={[0.17, 0.3, -0.24]} rotation={[0, 0, 0.35]} castShadow={false}>
          <capsuleGeometry args={[0.042, 0.1, 2, 5]} />
          {hand}
        </mesh>
      </group>
    </group>
  );
}

function FirstPersonWeaponViewModel({
  runtimeRef,
  inputRef,
  weaponId,
  weaponMountOverrides,
  cameraMode,
  motionReduced,
}: {
  runtimeRef: MutableRefObject<WarRoomRuntime>;
  inputRef: MutableRefObject<WarRoomInputState>;
  weaponId: WarRoomWeaponId;
  weaponMountOverrides?: Partial<Record<WarRoomWeaponId, WarRoomWeaponMount>>;
  cameraMode: WarRoomCameraMode;
  motionReduced: boolean;
}) {
  const { camera, size } = useThree();
  const weaponRootRef = useRef<THREE.Group>(null);
  const weapon = WAR_ROOM_WEAPON_BY_ID.get(weaponId)!;
  const mount = weaponMountOverrides?.[weaponId] ?? WAR_ROOM_WEAPON_MOUNTS[weaponId];
  const viewConfig = getWarRoomViewModelConfig(weaponId, weapon.weaponClass === "melee");

  useFrame(() => {
    const group = weaponRootRef.current;
    if (!group) return;
    const player = runtimeRef.current.player;
    const input = inputRef.current;
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
    const aspect = size.height > 0 ? size.width / size.height : 1.75;
    const horizontalFactor = getWarRoomViewModelHorizontalFactor(aspect);
    const pose = getWarRoomViewModelPose({
      time: clock,
      movement: Math.hypot(input.moveX, input.moveY),
      aiming: input.aimHeld,
      recoil,
      reloadProgress,
      chargeProgress,
      meleeProgress,
      meleeStyle: weapon.meleeStyle ?? "slash",
      comboIndex: player.meleeAttackComboIndex,
      motionReduced,
    }, aspect);
    group.visible = cameraMode === "first-person";
    group.scale.setScalar(viewConfig.scale * getWarRoomViewModelScaleFactor(aspect));
    group.position.set(
      viewConfig.position[0] * horizontalFactor + pose.position[0],
      viewConfig.position[1] + pose.position[1],
      viewConfig.position[2] + pose.position[2],
    );
    group.rotation.set(
      mount.rotation[0] + viewConfig.rotation[0] + pose.rotation[0],
      mount.rotation[1] + viewConfig.rotation[1] + pose.rotation[1],
      mount.rotation[2] + viewConfig.rotation[2] + pose.rotation[2],
    );
  });

  return createPortal(
    <group
      ref={weaponRootRef}
      name="war-room-first-person-weapon"
      visible={cameraMode === "first-person"}
      scale={viewConfig.scale}
    >
      <FirstPersonArms />
      <WeaponModel weaponId={weaponId} mount={mount} />
    </group>,
    camera,
  );
}

function MeleeDebugCone({
  runtimeRef,
  weaponId,
  enabled,
}: {
  runtimeRef: MutableRefObject<WarRoomRuntime>;
  weaponId: WarRoomWeaponId;
  enabled: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const weapon = WAR_ROOM_WEAPON_BY_ID.get(weaponId)!;
  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const player = runtimeRef.current.player;
    const attackActive = player.meleeUntil > player.clockTime;
    group.position.set(player.x, player.jumpHeight + 0.025, player.z);
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
  weaponId,
  weaponMountOverrides,
  rootRef,
  muzzleRef,
  flashRef,
  muzzleLightRef,
}: {
  runtimeRef: MutableRefObject<WarRoomRuntime>;
  inputRef: MutableRefObject<WarRoomInputState>;
  weaponId: WarRoomWeaponId;
  weaponMountOverrides?: Partial<Record<WarRoomWeaponId, WarRoomWeaponMount>>;
  rootRef: MutableRefObject<THREE.Group | null>;
  muzzleRef: MutableRefObject<THREE.Group | null>;
  flashRef: MutableRefObject<THREE.Group | null>;
  muzzleLightRef: MutableRefObject<THREE.PointLight | null>;
}) {
  const recoilRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const reloadMagazineRef = useRef<THREE.Mesh>(null);
  const previousShotFeedbackRef = useRef(0);
  const shotgunPumpStartedAtRef = useRef(-1);
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
        player.x + Math.sin(bodyYaw) * heavyStep,
        player.jumpHeight - (player.prone ? 0.34 : 0),
        player.z - Math.cos(bodyYaw) * heavyStep,
      );
      root.rotation.y = shortestLerp(root.rotation.y, bodyYaw, 45, delta);
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
      if (hand) {
        const handScale = hand.getWorldScale(new THREE.Vector3());
        weaponMount.position.set(
          mount.position[0] / Math.max(0.01, Math.abs(handScale.x)),
          (mount.position[1] + (aiming ? 0.055 : 0)) / Math.max(0.01, Math.abs(handScale.y)),
          (mount.position[2] - (aiming ? 0.045 : 0)) / Math.max(0.01, Math.abs(handScale.z)),
        );
        weaponMount.scale.set(
          mount.scale / Math.max(0.01, Math.abs(handScale.x)),
          mount.scale / Math.max(0.01, Math.abs(handScale.y)),
          mount.scale / Math.max(0.01, Math.abs(handScale.z)),
        );
      } else {
        if (melee) {
          weaponMount.position.set(0.34, 1.1, -0.26);
          weaponMount.scale.setScalar(mount.scale);
        } else {
          weaponMount.position.set(0.7, 1.24 + (aiming ? 0.055 : 0), -0.36 - (aiming ? 0.045 : 0));
          weaponMount.scale.setScalar(1.32);
        }
      }
      weaponMount.position.y -= reloadDrop * 0.14 + chargeProgress * 0.035;
      weaponMount.position.z += recoilStrength * 0.08 + pumpStrength * 0.14 + chargeProgress * 0.1;
      weaponMount.rotation.set(...mount.rotation);
      weaponMount.rotation.x -= recoilStrength * 0.052 + pumpStrength * 0.06 + reloadDrop * 0.48 + chargeProgress * 0.16;
      weaponMount.rotation.z += recoilStrength * 0.018;
      if (melee) {
        const idleBreath = WAR_ROOM_WEAPON_PRESENTATION_ENABLED && player.meleeUntil <= player.clockTime
          ? Math.sin(player.clockTime * 1.8) * 0.012
          : 0;
        weaponMount.position.y += idleBreath;
        weaponMount.position.x += idleBreath * 0.35;
        weaponMount.rotation.z += idleBreath * 0.9;
        weaponMount.position.y += meleeLift * (player.meleeAttackHeavy ? 0.14 : 0.08);
        if (weapon.meleeStyle === "thrust") {
          weaponMount.position.z += meleePrepare * 0.12 - meleeStrike * (0.58 * heavyScale);
          weaponMount.rotation.x += -meleePrepare * 0.22 + meleeStrike * (0.34 * heavyScale);
        } else {
          weaponMount.position.x += meleeStrike * (0.12 + swingDirection * 0.045);
          weaponMount.position.z -= meleeStrike * 0.11;
          weaponMount.rotation.x += -meleeLift * (player.meleeAttackHeavy ? 0.42 : 0.28) + meleeStrike * (0.48 * heavyScale);
          weaponMount.rotation.z += meleeLift * 0.18
            - meleeStrike * ((weaponId === "melee_axe" || weaponId === "melee_shovel" || weaponId === "melee_pickaxe" ? 1.08 : 0.82) + swingDirection * 0.22);
          if (
            WAR_ROOM_WEAPON_PRESENTATION_ENABLED
            && player.meleeAttackHeavy
            && ["melee_axe", "melee_shovel", "melee_pickaxe"].includes(weaponId)
          ) {
            weaponMount.position.y += meleePrepare * 0.16;
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
        const gripWorld = weaponMount.localToWorld(new THREE.Vector3(-0.08, 0, -0.52));
        const gripLocal = leftHand.parent.worldToLocal(gripWorld);
        leftHand.position.lerp(gripLocal, Math.min(1, delta * 12));
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
      const locomotion = resolveWarRoomLocomotion(moveX, moveY, player.yaw, player.facingYaw);
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
    if (muzzleLightRef.current && muzzleLightRef.current.userData.warRoomExpiresAt <= player.clockTime) {
      muzzleLightRef.current.visible = false;
      muzzleLightRef.current.intensity = 0;
    }
  });
  const playerAnimation = () => {
    const player = runtimeRef.current.player;
    const input = inputRef.current;
    const moveX = input.moveX + (input.keys.has("d") ? 1 : 0) - (input.keys.has("a") ? 1 : 0);
    const moveY = input.moveY + (input.keys.has("w") ? 1 : 0) - (input.keys.has("s") ? 1 : 0);
    if (player.hp <= 0) return "death";
    if (player.clockTime - player.lastDamageAt < 0.2) return "hit";
    if (player.shotFeedbackUntil > player.clockTime || player.meleeUntil > player.clockTime) return "attack";
    const movement = Math.hypot(moveX, moveY);
    if (movement > 0.12) {
      return player.crouched || movement < 0.72 ? "walk" : "run";
    }
    const root = rootRef.current;
    if (root && Math.abs(Math.atan2(
      Math.sin(player.facingYaw - root.rotation.y),
      Math.cos(player.facingYaw - root.rotation.y),
    )) > Math.PI / 4) return "walk";
    return "idle";
  };
  const playerPlaybackScale = () => {
    const player = runtimeRef.current.player;
    const input = inputRef.current;
    const animation = playerAnimation();
    if (animation !== "walk" && animation !== "run") return 1;
    const moveX = input.moveX + (input.keys.has("d") ? 1 : 0) - (input.keys.has("a") ? 1 : 0);
    const moveY = input.moveY + (input.keys.has("w") ? 1 : 0) - (input.keys.has("s") ? 1 : 0);
    return resolveWarRoomLocomotion(moveX, moveY, player.yaw, player.facingYaw).playbackScale;
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
          />
        </Suspense>
      </WarRoomAssetBoundary>
      <group ref={recoilRef} name="war-room-weapon-mount" position={[0.7, 1.24, -0.36]}>
        <pointLight
          position={[0, 0.02, -0.32]}
          color={weapon.color}
          intensity={weapon.rarity === "Efsanevi" ? 0.28 : 0}
          distance={1.1}
          decay={2}
        />
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
  muzzleLightRef,
}: {
  enemy: WarRoomEnemy;
  index: number;
  groupRefs: MutableRefObject<Array<THREE.Group | null>>;
  muzzleLightRef: MutableRefObject<THREE.PointLight | null>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const weaponMountRef = useRef<THREE.Group>(null);
  const attackWarningRef = useRef<THREE.Group>(null);
  const muzzleAnchorRef = useRef<THREE.Group>(null);
  const muzzleFlashRef = useRef<THREE.Group>(null);
  useFrame((frame, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const runtime = group.parent?.userData.runtime as WarRoomRuntime | undefined;
    const player = runtime?.player;
    const gameNow = runtime?.player.clockTime ?? frame.clock.elapsedTime;
    const warningProgress = getWarRoomCommanderTelegraphProgress(
      enemy.commander && enemy.mode === "fire",
      gameNow,
      enemy.nextShotAt,
    );
    if (attackWarningRef.current) {
      attackWarningRef.current.visible = WAR_ROOM_COMMANDER_TELEGRAPH_ENABLED
        && enemy.alive
        && warningProgress !== null;
      if (warningProgress !== null) {
        attackWarningRef.current.scale.setScalar(0.82 + warningProgress * 0.18);
      }
    }
    if (player) {
      const targetYaw = getWarRoomActorYawToTarget(
        enemy.x,
        enemy.z,
        player.x,
        player.z,
        PLAYER_CHARACTER_MODEL_FACING,
      );
      group.rotation.y = shortestLerp(group.rotation.y, targetYaw, 12, delta);
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
      0,
      enemy.z + enemy.hitKnockbackZ * hitKick,
    );
    group.position.y = hitKick * 0.035;
    group.rotation.x = enemy.alive ? -hitKick * 0.035 : -Math.cos(enemy.deathYaw) * Math.min(1, deathProgress * 1.3);
    group.rotation.z = enemy.alive ? 0 : -Math.sin(enemy.deathYaw) * Math.min(1, deathProgress * 1.3);
    const hand = modelRef.current && [
      "Rig_RightHand", "mixamorigRightHand", "FistR", "Fist.R", "RightHand", "RightHandBone",
    ].map((name) => modelRef.current?.getObjectByName(name)).find(Boolean);
    const weaponMount = weaponMountRef.current;
    if (hand && weaponMount) {
      if (weaponMount.parent !== hand) {
        weaponMount.parent?.remove(weaponMount);
        hand.add(weaponMount);
      }
      weaponMount.visible = true;
      const mount = WAR_ROOM_WEAPON_MOUNTS[enemy.weaponId];
      const handScale = hand.getWorldScale(new THREE.Vector3());
      weaponMount.position.set(
        mount.position[0] / Math.max(0.01, Math.abs(handScale.x)),
        mount.position[1] / Math.max(0.01, Math.abs(handScale.y)),
        mount.position[2] / Math.max(0.01, Math.abs(handScale.z)),
      );
      weaponMount.rotation.set(...mount.rotation);
      weaponMount.scale.set(
        mount.scale / Math.max(0.01, Math.abs(handScale.x)),
        mount.scale / Math.max(0.01, Math.abs(handScale.y)),
        mount.scale / Math.max(0.01, Math.abs(handScale.z)),
      );
    } else if (weaponMount) {
      weaponMount.visible = false;
    }
    if (muzzleFlashRef.current && Number(muzzleFlashRef.current.userData.warRoomExpiresAt ?? 0) <= gameNow) {
      muzzleFlashRef.current.visible = false;
    }
    if (muzzleLightRef.current && Number(muzzleLightRef.current.userData.warRoomExpiresAt ?? 0) <= gameNow) {
      muzzleLightRef.current.visible = false;
      muzzleLightRef.current.intensity = 0;
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
          />
        </Suspense>
      </WarRoomAssetBoundary>
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
      {enemy.commander && (
        <mesh position={[0, 2.12, 0]}>
          <coneGeometry args={[0.2, 0.36, 5]} />
          <meshBasicMaterial color="#ff433a" toneMapped={false} />
        </mesh>
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

function buildHudSnapshot(runtime: WarRoomRuntime, now: number, weaponIds: readonly [WarRoomWeaponId, WarRoomWeaponId], input: WarRoomInputState): WarRoomHudSnapshot {
  const player = runtime.player;
  const weaponId = weaponIds[player.activeSlot];
  const ammo = player.ammo[weaponId];
  const bossHealth = getWarRoomCommanderHealth(runtime.enemies);
  const meleeProgress = player.meleeUntil > now
    ? Math.max(0, Math.min(1, (now - player.meleeStartedAt) / Math.max(0.01, player.meleeDuration)))
    : 0;
  const meleePhase = player.meleeUntil <= now
    ? "HAZIR"
    : meleeProgress < (player.meleeAttackHeavy ? 0.4 : 0.28)
      ? "HAZIRLIK"
      : meleeProgress < 0.72 ? "VURUŞ" : "TOPARLAN";
  return {
    player: {
      x: player.x,
      z: player.z,
      yaw: player.yaw,
      hp: player.hp,
      maxHp: player.maxHp,
      stamina: player.stamina,
      maxStamina: player.maxStamina,
    },
    orientation: {
      facingYaw: player.facingYaw,
      mode: player.facingMode,
      joystickAngleDegrees: player.joystickAngleDegrees,
      facingCamera: player.facingCamera,
    },
    enemies: runtime.enemies.map(({ id, x, z, alive, commander }) => ({ id, x, z, alive, commander })),
    healingPoints: RESTORE_CONFIG.enabled ? runtime.healingPoints.map(({ id, x, z, availableAt }) => ({
      id,
      x,
      z,
      available: availableAt <= now,
    })) : [],
    regenerationActive: player.regenerationActive,
    regenerationWaitSeconds: player.regenerationWaitSeconds,
    regenerationAtCap: RESTORE_CONFIG.enabled
      && player.hp >= player.maxHp * RESTORE_CONFIG.passive.maxHealthRatio,
    remaining: getWarRoomRemaining(runtime),
    bossHp: bossHealth.hp,
    bossMaxHp: bossHealth.maxHp,
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
    hitMessage: player.hitMessageUntil > now ? player.lastHitText : "",
    killFeed: player.killFeed,
    crouched: player.crouched,
    meleePhase,
    meleeComboCount: player.meleeComboCount,
    meleeLastResult: player.meleeLastResult,
  };
}

function WarRoomRuntimeScene({
  runtimeRef,
  inputRef,
  weaponIds,
  weaponMountOverrides,
  cameraMode,
  motionReduced,
  shoulderSide,
  shoulderOffset,
  bloodEffects,
  trainingMode,
  quality,
  debugMode,
  onMeleeDebugUpdate,
  onRenderStats,
  onHudUpdate,
  onFinish,
}: Props) {
  const { camera, scene, gl } = useThree();
  const perspective = camera as THREE.PerspectiveCamera;
  const enemyGroupRefs = useRef<Array<THREE.Group | null>>([]);
  const muzzleLightRef = useRef<THREE.PointLight>(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const cameraStart = useMemo(() => new THREE.Vector3(), []);
  const cameraDesired = useMemo(() => new THREE.Vector3(), []);
  const cameraDirection = useMemo(() => new THREE.Vector3(), []);
  const cameraLook = useMemo(() => new THREE.Vector3(), []);
  const meleeOrigin = useMemo(() => new THREE.Vector3(), []);
  const meleeImpact = useMemo(() => new THREE.Vector3(), []);
  const room = runtimeRef.current.room;
  const playerRootRef = useRef<THREE.Group | null>(null);
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
  const cameraBoundsRef = useRef<WarRoomCameraBounds[]>(logicalCameraBounds);
  const cameraBoundsRefreshRef = useRef(0);
  const cameraFadeByIdRef = useRef(new Map<string, number>());
  const cameraMaterialOriginalsRef = useRef(new WeakMap<THREE.Material, CameraMaterialSnapshot>());
  const cameraDebugAtRef = useRef(0);
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
      particle.lifetime = 0.3 + (Math.sin(seed * 3.7) + 1) * 0.12;
      particle.size = size * (0.65 + (Math.sin(seed * 2.1) + 1) * 0.375);
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
  ) => {
    const slot = shockwaveCursor.current++ % WAR_ROOM_SHOCKWAVE_POOL_SIZE;
    const shockwave = shockwaves[slot];
    shockwave.x = position.x;
    shockwave.z = position.z;
    shockwave.yaw = yaw;
    shockwave.born = now;
    shockwave.color = color;
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
    const rayEnd = origin.clone().addScaledVector(rayDirection, range);
    const blockedAt = segmentBlockFraction(
      { x: origin.x, y: origin.y, z: origin.z },
      { x: rayEnd.x, y: rayEnd.y, z: rayEnd.z },
      0,
      runtimeRef.current.room.blockers,
    );
    const result = traceWarRoomRay(
      { x: origin.x, y: origin.y, z: origin.z },
      { x: rayDirection.x, y: rayDirection.y, z: rayDirection.z },
      runtimeRef.current.enemies,
      range,
      blockedAt,
    );
    return {
      enemy: result.target,
      index: result.targetIndex,
      point: new THREE.Vector3(result.point.x, result.point.y, result.point.z),
      headshot: result.headshot,
      blocked: result.blocked,
    };
  };

  const isMeleeTargetBlocked = (player: WarRoomRuntime["player"], enemy: WarRoomEnemy) => (
    segmentBlockFraction(
      { x: player.x, y: player.jumpHeight + (player.crouched ? 1.05 : 1.12), z: player.z },
      { x: enemy.x, y: enemy.commander ? 1.35 : 1.05, z: enemy.z },
      0.08,
      runtimeRef.current.room.blockers,
    ) !== null
  );

  const getMeleeAimHit = (range: number, attackYaw: number) => {
    const player = runtimeRef.current.player;
    meleeOrigin.set(
      player.x,
      player.jumpHeight + (player.crouched ? 1.05 : 1.12),
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
      meleeImpact.set(result.target.x, result.target.commander ? 1.35 : 1.05, result.target.z);
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
        spawnImpact(impact.point, "#b82e3b", now, effects.bloodParticles, 0.045);
      }
      if (effects.exitSplashParticles > 0) {
        const thrustX = Math.sin(player.meleeAttackYaw);
        const thrustZ = -Math.cos(player.meleeAttackYaw);
        const splashPoint = impact.point.clone().add(
          new THREE.Vector3(thrustX * 0.18, 0, thrustZ * 0.18),
        );
        const splashColor = effects.bloodParticles > 0 ? "#b82e3b" : effects.flashColor;
        spawnImpact(
          splashPoint,
          splashColor,
          now,
          effects.exitSplashParticles,
          0.04,
          new THREE.Vector3(thrustX * 0.55, 0.16, thrustZ * 0.55),
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
          new THREE.Vector3(0, 0.18, 0),
        );
      }
      meleeOrigin.set(impact.point.x, 0.045, impact.point.z);
      if (effects.dustParticles > 0) {
        if (effects.dustRing) {
          spawnImpactDustRing(meleeOrigin, now, effects.dustColor, effects.dustParticles + 5);
        } else {
          spawnImpactDust(meleeOrigin, now, effects.dustParticles, effects.dustColor);
        }
      }
      if (effects.shockwave) {
        meleeOrigin.set(impact.point.x, 0.035, impact.point.z);
        spawnShockwave(meleeOrigin, player.meleeAttackYaw, now, effects.flashColor);
      }
      if (effects.crackDecal) {
        meleeOrigin.set(impact.point.x, 0, impact.point.z);
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
    const weaponId = weaponIds[player.activeSlot];
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
        0.38,
        runtime.room.blockers,
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
    const muzzle = new THREE.Vector3();
    const muzzleAnchor = playerMuzzleRef.current;
    if (muzzleAnchor) {
      muzzleAnchor.updateWorldMatrix(true, false);
      muzzleAnchor.getWorldPosition(muzzle);
    } else {
      muzzle.set(
        player.x + Math.cos(player.yaw) * 0.38 + Math.sin(player.yaw) * 0.25,
        1.36 + player.jumpHeight,
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
    if (muzzleLightRef.current) {
      muzzleLightRef.current.position.copy(muzzle);
      muzzleLightRef.current.intensity = 2.4;
      muzzleLightRef.current.visible = true;
      muzzleLightRef.current.userData.warRoomExpiresAt = now + 0.06;
    }
    spawnMuzzleSmoke(muzzle, now);
    if (weaponId !== "longbow" && weaponId !== "crossbow") spawnCasing(muzzle, now, player.yaw);
    const tracerEnd = new THREE.Vector3();
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
            spawnImpact(aim.point, "#b82e3b", now, effects.bloodParticles, 0.045);
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
              new THREE.Vector3(0, 0.14, 0),
            );
          }
          if (effects.dustParticles > 0) {
            spawnImpactDust(
              meleeOrigin.set(aim.point.x, 0.045, aim.point.z),
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
        muzzle.clone().add(new THREE.Vector3(0.08, 0.015, 0)),
        "#c6a360",
        now,
        2,
        0.025,
        new THREE.Vector3(0.7, 0.15, 0.15),
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
    const player = runtime.player;
    const input = inputRef.current;
    if (input.paused) return;
    const wallNow = frame.clock.elapsedTime;
    const renderStatsNow = performance.now();
    if (debugMode && renderStatsNow - renderStatsAtRef.current >= 250) {
      renderStatsAtRef.current = renderStatsNow;
      // R3F's automatic render completed the preceding frame before this sample.
      onRenderStats(getWarRoomFrameStats(gl.info.render.calls, rawDelta));
    }
    if (
      WAR_ROOM_LAST_ENEMY_CINEMATIC_ENABLED
      && runtime.enemies.length > 0
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
    player.yaw = input.yaw;
    player.pitch = Math.max(-0.56, Math.min(0.55, input.pitch));

    const forwardX = Math.sin(player.yaw);
    const forwardZ = -Math.cos(player.yaw);
    const rightX = Math.cos(player.yaw);
    const rightZ = Math.sin(player.yaw);
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
    const orientation = resolveWarRoomOrientation(
      player.yaw,
      moveX,
      moveY,
      player.facingYaw,
      input.aimHeld || now < player.strafeUntil,
      WAR_ROOM_CAMERA_FACING_ENABLED ? input.facingSetting : "movement",
    );
    const orientationWeapon = WAR_ROOM_WEAPON_BY_ID.get(weaponIds[player.activeSlot])!;
    const assistedYaw = WAR_ROOM_COMBAT_FEEL_ENABLED
      && orientationWeapon.weaponClass === "melee"
      && input.aimHeld
      ? getWarRoomMeleeAssistYaw(
        player.x,
        player.z,
        orientation.yaw,
        runtime.enemies,
        orientationWeapon.range,
        (enemy) => isMeleeTargetBlocked(player, enemy),
      )
      : orientation.yaw;
    player.facingYaw = stepWarRoomYaw(player.facingYaw, assistedYaw, delta, 55);
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

    const sprintRequested = !player.crouched
      && (input.sprintLocked || (moveY >= 0.93 && Math.abs(moveX) <= 0.34))
      && inputLength >= 0.28;
    player.sprinting = sprintRequested && player.stamina > 0;
    const speed = player.prone ? 1.25 : player.crouched ? 3.05 : player.sprinting ? 8.2 : 6.1;
    let dx = (rightX * moveX + forwardX * moveY) * speed * delta;
    let dz = (rightZ * moveX + forwardZ * moveY) * speed * delta;
    if (now < player.dodgeUntil) {
      const remaining = Math.max(0, player.dodgeUntil - now);
      dx += player.dodgeX * 11 * Math.min(delta, remaining);
      dz += player.dodgeZ * 11 * Math.min(delta, remaining);
    }
    const nextPosition = moveWarRoomEntity(player.x, player.z, dx, dz, 0.38, runtime.room.blockers);
    player.x = nextPosition.x;
    player.z = nextPosition.z;
    const pickup = collectWarRoomHealingPoint(
      runtime.healingPoints,
      player,
      player.x,
      player.z,
      now,
      RESTORE_CONFIG,
    );
    if (pickup.point && pickup.healed > 0) {
      player.lastHitText = `+${Math.round(pickup.healed)} CAN`;
      player.hitMessageUntil = now + 1.35;
      playWarRoomSound(
        "healing-pickup",
        0.9,
        "pistol",
        getWarRoomAudioOptions(player, pickup.point.x, pickup.point.z),
      );
      if (WAR_ROOM_POOLED_FX_ENABLED) {
        spawnImpact(new THREE.Vector3(pickup.point.x, 0.82, pickup.point.z), "#74f5a6", now, 12, 0.06);
      }
    }
    player.jumpVelocity -= 14 * delta;
    player.jumpHeight = Math.max(0, player.jumpHeight + player.jumpVelocity * delta);
    if (player.jumpHeight === 0) player.jumpVelocity = 0;
    const landed = previousJumpHeightRef.current > 0.08 && player.jumpHeight <= 0.001;
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
      const surface = getWarRoomFootstepSurface(player.x, player.z, runtime.room.blockers);
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

    const weaponId = weaponIds[player.activeSlot];
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

    if (!trainingMode) for (let index = 0; index < runtime.enemies.length; index += 1) {
      const enemy = runtime.enemies[index];
      const group = enemyGroupRefs.current[index];
      if (!enemy.alive) {
        if (group) group.visible = false;
        continue;
      }
      const gap = Math.hypot(enemy.x - player.x, enemy.z - player.z);
      const enemyEye = { x: enemy.x, y: enemy.commander ? 1.65 : 1.45, z: enemy.z };
      const playerEye = { x: player.x, y: player.jumpHeight + (player.crouched ? 1.1 : 1.4), z: player.z };
      const lineBlocked = segmentBlockFraction(enemyEye, playerEye, 0, runtime.room.blockers) !== null;
      enemy.mode = player.hp / player.maxHp < 0.33
        ? "cover"
        : !lineBlocked && gap <= (enemy.commander ? 22 : 17)
          ? "fire"
          : lineBlocked && gap < 26 ? "cover" : "approach";
      const updateInterval = gap > 38 ? 0.55 : 0.12;
      if (now >= enemy.brainAt) {
        enemy.brainAt = now + updateInterval;
        let targetX = player.x;
        let targetZ = player.z;
        if (enemy.mode === "cover") {
          if (enemy.hp / enemy.maxHp < 0.32 || lineBlocked) {
            const cover = getNearestWarRoomCover(enemy.x, enemy.z, runtime.room.coverSpots);
            if (cover) {
              enemy.coverX = cover.x;
              enemy.coverZ = cover.z;
            }
          }
          targetX = enemy.coverX;
          targetZ = enemy.coverZ;
        }
        const holdDistance = enemy.commander ? 12.5 : 10.5;
        const shouldMove = enemy.mode !== "fire" && Math.hypot(targetX - enemy.x, targetZ - enemy.z) > (enemy.mode === "cover" ? 1.2 : holdDistance);
        if (shouldMove) {
          const targetYaw = Math.atan2(targetX - enemy.x, -(targetZ - enemy.z));
          const moveSpeed = enemy.commander ? 2.55 : enemy.mode === "cover" ? 3.25 : 3.7;
          let moveXEnemy = Math.sin(targetYaw) * moveSpeed * updateInterval;
          let moveZEnemy = -Math.cos(targetYaw) * moveSpeed * updateInterval;
          for (const other of runtime.enemies) {
            if (other === enemy || !other.alive) continue;
            const separationX = enemy.x - other.x;
            const separationZ = enemy.z - other.z;
            const separation = Math.hypot(separationX, separationZ);
            if (separation > 0.001 && separation < 1.25) {
              moveXEnemy += (separationX / separation) * 1.5 * updateInterval;
              moveZEnemy += (separationZ / separation) * 1.5 * updateInterval;
            }
          }
          const moved = moveWarRoomEntity(
            enemy.x,
            enemy.z,
            moveXEnemy,
            moveZEnemy,
            0.35,
            runtime.room.blockers,
          );
          enemy.x = moved.x;
          enemy.z = moved.z;
        }
      }
      if (group) {
        group.position.set(enemy.x, 0, enemy.z);
        group.visible = true;
      }
    }

    const attackCandidates = trainingMode ? [] : runtime.enemies
      .filter((enemy) => {
        if (!enemy.alive || Math.hypot(enemy.x - player.x, enemy.z - player.z) > 24) return false;
        const blocked = segmentBlockFraction(
          { x: enemy.x, y: enemy.commander ? 1.6 : 1.4, z: enemy.z },
          { x: player.x, y: player.jumpHeight + 1.3, z: player.z },
          0,
          runtime.room.blockers,
        );
        return blocked === null;
      })
      .sort((left, right) => Math.hypot(left.x - player.x, left.z - player.z) - Math.hypot(right.x - player.x, right.z - player.z))
      .slice(0, 3);

    for (const enemy of attackCandidates) {
      if (now < enemy.nextShotAt || now < player.invulnerableUntil) continue;
      enemy.nextShotAt = now + (enemy.commander ? 1.2 : 1.65) + nextWarRoomRandom(runtime) * 0.55;
      const muzzle = new THREE.Vector3(enemy.x + 0.22, enemy.commander ? 1.5 : 1.35, enemy.z - 0.48);
      const enemyGroup = enemyGroupRefs.current[runtime.enemies.indexOf(enemy)];
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
      if (muzzleLightRef.current) {
        muzzleLightRef.current.position.copy(muzzle);
        muzzleLightRef.current.intensity = 2;
        muzzleLightRef.current.visible = true;
        muzzleLightRef.current.userData.warRoomExpiresAt = now + 0.06;
      }
      spawnMuzzleSmoke(muzzle, now);
      spawnCasing(muzzle, now, Math.atan2(player.x - enemy.x, -(player.z - enemy.z)));
      const enemyDistance = Math.hypot(enemy.x - player.x, enemy.z - player.z);
      playWarRoomSound(
        "enemy-shot",
        1,
        "rifle",
        getWarRoomAudioOptions(player, enemy.x, enemy.z),
      );
      const missSeed = now * 9 + runtime.enemies.indexOf(enemy) * 2.7;
      const target = new THREE.Vector3(
        player.x + Math.sin(missSeed) * 0.38,
        player.jumpHeight + 1.15 + Math.cos(missSeed * 1.37) * 0.22,
        player.z + Math.sin(missSeed * 0.71) * 0.38,
      );
      addTracer(muzzle, target, "#f36e54", now, 0.08);
      if (nextWarRoomRandom(runtime) > (enemy.commander ? 0.25 : 0.38)) {
        const hit = applyWarRoomDamage(player, enemy.damage);
        if (hit.damage > 0) {
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
        shockwaveTransform.scale.setScalar(0.3 + progress * 2.1);
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

    const aimDistance = WAR_ROOM_WEAPON_BY_ID.get(weaponIds[player.activeSlot])!.range;
    const cameraMotionScale = motionReduced ? 0 : 1;
    cameraFovKickRef.current *= Math.exp(-12 * delta);
    const desiredFov = (input.aimHeld ? 48 : cameraMode === "first-person" ? 82 : player.sprinting ? 76 : 70)
      + cameraFovKickRef.current * cameraMotionScale;
    perspective.fov += (desiredFov - perspective.fov) * (1 - Math.exp(-9 * delta));
    perspective.updateProjectionMatrix();
    const cameraForwardX = Math.sin(player.yaw) * Math.cos(player.pitch);
    const cameraForwardY = Math.sin(player.pitch);
    const cameraForwardZ = -Math.cos(player.yaw) * Math.cos(player.pitch);
    const victoryZoom = WAR_ROOM_LAST_ENEMY_CINEMATIC_ENABLED && cinematicStartedAt !== null
      ? Math.min(1, cinematicElapsed / WAR_ROOM_LAST_ENEMY_SLOW_MOTION_SECONDS)
      : 0;
    const { back: cameraBack, shoulder } = getWarRoomCameraRig({
      mode: cameraMode,
      aiming: input.aimHeld,
      shoulderOffset,
      shoulderSide,
      victoryZoom,
    });
    cameraStart.set(player.x, player.jumpHeight + (player.prone ? 0.65 : player.crouched ? 1.2 : 1.55), player.z);
    cameraDesired.set(
      player.x - cameraForwardX * cameraBack + Math.cos(player.yaw) * shoulder,
      cameraStart.y + (cameraMode === "first-person" ? 0 : 0.35) - cameraForwardY * cameraBack,
      player.z - cameraForwardZ * cameraBack + Math.sin(player.yaw) * shoulder,
    );
    if (scene && now - cameraBoundsRefreshRef.current >= 0.25) {
      scene.updateMatrixWorld(true);
      const occluders: CameraOccluderEntry[] = [];
      scene.traverse((object) => {
        const id = object.userData.warRoomCameraOccluderId;
        if (typeof id !== "string" || id.startsWith("gateway:")) return;
        const bounds = new THREE.Box3().setFromObject(object);
        if (bounds.isEmpty()) return;
        occluders.push({ id, object, bounds });
      });
      cameraOccludersRef.current = occluders;
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
    const desiredCameraDistance = cameraStart.distanceTo(cameraDesired);
    const cameraSweep = WAR_ROOM_CAMERA_OCCLUSION_ENABLED
      ? resolveWarRoomCameraSweep(
        { x: cameraStart.x, y: cameraStart.y, z: cameraStart.z },
        { x: cameraDesired.x, y: cameraDesired.y, z: cameraDesired.z },
        cameraBoundsRef.current,
        0.28,
        1.2,
        0.08,
      )
      : null;
    const blockerId = cameraSweep?.blocked ? cameraSweep.blockerId : null;
    if (cameraSweep?.blocked && desiredCameraDistance > 1e-8) {
      cameraDesired.lerpVectors(
        cameraStart,
        cameraDesired,
        Math.min(1, cameraSweep.safeDistance / desiredCameraDistance),
      );
    }
    if (WAR_ROOM_CAMERA_OCCLUSION_ENABLED) {
      for (const occluder of cameraOccludersRef.current) {
        const previous = cameraFadeByIdRef.current.get(occluder.id) ?? 0;
        const target = occluder.id === blockerId ? 1 : 0;
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
        const distance = cameraSweep?.blocked ? cameraSweep.safeDistance : desiredCameraDistance;
        onMeleeDebugUpdate(
          `KAMERA ${distance.toFixed(2)} m · ENGEL ${blockerId ?? "yok"}`,
        );
      }
    }
    camera.position.lerp(cameraDesired, 1 - Math.exp(-14 * delta));
    const playerCameraDistance = camera.position.distanceTo(cameraStart);
    const playerFadeTarget = cameraMode === "third-person"
      ? Math.max(0, Math.min(1, (1.35 - playerCameraDistance) / 0.85))
      : 0;
    const previousPlayerFade = cameraFadeByIdRef.current.get("player:camera-clearance") ?? 0;
    if (Math.abs(playerFadeTarget - previousPlayerFade) >= 0.002 && playerRootRef.current) {
      cameraFadeByIdRef.current.set("player:camera-clearance", playerFadeTarget);
      setWarRoomCameraOccluderFade(
        playerRootRef.current,
        playerFadeTarget,
        cameraMaterialOriginalsRef.current,
      );
    }
    if (playerRootRef.current) {
      playerRootRef.current.visible = cameraMode === "third-person" && playerCameraDistance > 0.42;
    }
    cameraLook.set(
      player.x + cameraForwardX * 10,
      player.jumpHeight + (player.prone ? 0.72 : player.crouched ? 1.18 : 1.48)
        + cameraForwardY * 10 + cameraKickRef.current * cameraMotionScale,
      player.z + cameraForwardZ * 10,
    );
    cameraLook.x += Math.cos(player.yaw) * cameraSideKickRef.current * cameraMotionScale;
    cameraLook.z += Math.sin(player.yaw) * cameraSideKickRef.current * cameraMotionScale;
    cameraKickRef.current = Math.max(0, cameraKickRef.current - delta * 0.72);
    cameraSideKickRef.current *= Math.exp(-delta * 7.5);
    if (now - player.lastDamageAt < 0.24) {
      const shake = Math.sin(now * 92) * 0.045;
      camera.position.x += shake;
      camera.position.y += Math.cos(now * 78) * 0.028;
    }
    if (player.meleeUntil > now) {
      const meleeProgress = Math.max(
        0,
        Math.min(1, (now - player.meleeStartedAt) / Math.max(0.01, player.meleeDuration)),
      );
      const shakeEnvelope = Math.sin(Math.PI * meleeProgress);
      camera.position.x += Math.sin(now * 74) * 0.012 * shakeEnvelope;
      camera.position.y += Math.cos(now * 83) * 0.008 * shakeEnvelope;
    }
    camera.lookAt(cameraLook);
    scene.updateMatrixWorld(true);

    const trailWeaponId = player.meleeAttackWeaponId ?? weaponIds[player.activeSlot];
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
          .multiplyScalar(trailProfile.trailIntensity);
      }
      const progress = Math.max(0, Math.min(1, (now - player.meleeStartedAt) / Math.max(0.01, player.meleeDuration)));
      const prepareEnd = player.meleeAttackHeavy ? 0.4 : 0.28;
      if (progress >= prepareEnd && progress <= 0.82) {
        const weaponMount = playerRootRef.current?.getObjectByName("war-room-weapon-mount");
        if (weaponMount) {
          weaponMount.updateWorldMatrix(true, false);
          const bladeLength = Math.max(0.3, Math.min(0.82, (trailWeapon.normalizeLength ?? trailWeapon.range * 0.56) * 0.72));
          const trailHalfWidth = Math.max(0.07, Math.min(0.13, bladeLength * 0.16));
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
      && now - slashTrailState.samples[slashTrailState.count - 1].born >= 0.12
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

    const activeWeapon = WAR_ROOM_WEAPON_BY_ID.get(weaponIds[player.activeSlot])!;
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

    if (now - lastHudAtRef.current >= 0.1) {
      lastHudAtRef.current = now;
      onHudUpdate(buildHudSnapshot(runtime, now, weaponIds, input));
    }
    const snapshot = buildHudSnapshot(runtime, now, weaponIds, input);
    if (!finishedRef.current && player.hp <= 0) {
      finishedRef.current = true;
      onFinish("defeat", snapshot);
    } else if (
      !finishedRef.current
      && getWarRoomRemaining(runtime) === 0
      && (!WAR_ROOM_LAST_ENEMY_CINEMATIC_ENABLED
        || (cinematicStartedAt !== null && cinematicElapsed >= WAR_ROOM_ENEMY_DEATH_FADE_SECONDS))
    ) {
      finishedRef.current = true;
      onFinish("victory", snapshot);
    }
  });

  const runtime = runtimeRef.current;
  const activeWeapon = weaponIds[runtime.player.activeSlot];
  return (
    <>
      <TimeOfDaySky quality={quality} />
      <Battlefield room={runtime.room} />
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
      <pointLight
        ref={muzzleLightRef}
        color="#ff9a4d"
        intensity={0}
        distance={3.2}
        decay={2}
        visible={false}
      />
      <group userData={{ runtime }}>
        {runtime.enemies.map((enemy, index) => (
          <EnemyActor
            key={enemy.id}
            enemy={enemy}
            index={index}
            groupRefs={enemyGroupRefs}
            muzzleLightRef={muzzleLightRef}
          />
        ))}
      </group>
      <PlayerActor
        runtimeRef={runtimeRef}
        inputRef={inputRef}
        weaponId={activeWeapon}
        weaponMountOverrides={weaponMountOverrides}
        rootRef={playerRootRef}
        muzzleRef={playerMuzzleRef}
        flashRef={playerMuzzleFlashRef}
        muzzleLightRef={muzzleLightRef}
      />
      <FirstPersonWeaponViewModel
        runtimeRef={runtimeRef}
        inputRef={inputRef}
        weaponId={activeWeapon}
        weaponMountOverrides={weaponMountOverrides}
        cameraMode={cameraMode}
        motionReduced={motionReduced}
      />
      <MeleeDebugCone runtimeRef={runtimeRef} weaponId={activeWeapon} enabled={debugMode} />
    </>
  );
}

export default function WarRoomScene3D(props: Props) {
  const { quality } = props;
  const touchDevice = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const pixelRatio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const maxPixelRatio = getWarRoomPixelRatio(quality, pixelRatio, touchDevice);
  const shadowsEnabled = typeof window !== "undefined"
    && !window.matchMedia("(pointer: coarse)").matches
    && quality !== "low";
  return (
    <Canvas
      dpr={maxPixelRatio}
      shadows={shadowsEnabled}
      camera={{ position: [0, 3, 5], fov: 70, near: 0.08, far: 150 }}
      gl={{ antialias: !touchDevice, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping }}
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = shadowsEnabled;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
        gl.toneMappingExposure = 1.12;
      }}
    >
      <WarRoomRuntimeScene {...props} />
    </Canvas>
  );
}
