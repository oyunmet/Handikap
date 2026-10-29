import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useProgress } from "@react-three/drei";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import * as THREE from "three";
import {
  WAR_ROOM_CHARACTER_HEIGHT,
  WAR_ROOM_WEAPON_BY_ID,
  WAR_ROOM_WEAPON_MOUNTS,
  type WarRoomWeapon,
  type WarRoomWeaponId,
} from "../game/war-room-data";
import type { ItemRarity, EquipmentVisual } from "../game/store-types";
import { EQUIPMENT_PREVIEW_MAX_DPR } from "../game/store-ui/equipment-preview-config";
import { WarRoomAnimatedActor, WarRoomAssetBoundary, WarRoomStaticModel } from "./WarRoomModels";
import KnightActor from "./KnightActor";
import { createWorldMotion } from "./movement";
import { PLAYER_CHARACTER_MODEL_PATH } from "./player-model";

type EquipmentPreview3DProps = {
  appearance: EquipmentVisual;
  itemId: string;
  itemIcon?: string;
  rarity: ItemRarity;
  equipped: boolean;
  warRoomWeaponId?: string;
};

type PreviewOrbitControls = {
  reset: () => void;
  target: THREE.Vector3;
  minDistance: number;
  maxDistance: number;
  update: () => void;
};

const DEFAULT_PREVIEW_WEAPON_MOUNT = {
  position: [0, 0, 0] as const,
  rotation: [0, 0, 0] as const,
  scale: 1,
};

function getPreviewWeaponMount(weaponId: WarRoomWeaponId, weapon: WarRoomWeapon) {
  return WAR_ROOM_WEAPON_MOUNTS[weaponId] ?? weapon.mount ?? DEFAULT_PREVIEW_WEAPON_MOUNT;
}

function PreviewLoadingObserver({ onLoadingChange }: { onLoadingChange: (loading: boolean) => void }) {
  const { active } = useProgress();

  useEffect(() => {
    if (active) {
      onLoadingChange(true);
      return undefined;
    }
    const timer = window.setTimeout(() => onLoadingChange(false), 180);
    return () => window.clearTimeout(timer);
  }, [active, onLoadingChange]);

  return null;
}

function PreviewWebGLFallback({
  itemIcon,
  onReady,
}: {
  itemIcon?: string;
  onReady: () => void;
}) {
  useEffect(() => onReady(), [onReady]);
  return (
    <div className="store-item-preview-3d__fallback" role="img" aria-label="3D görünüm kullanılamıyor">
      <span aria-hidden="true">{itemIcon ?? "◇"}</span>
      <small>3D görünüm bu cihazda kullanılamıyor</small>
    </div>
  );
}

function PreviewHeroFallback() {
  return (
    <group>
      <mesh position={[0, 0.66, 0]} castShadow>
        <capsuleGeometry args={[0.25, 0.72, 4, 8]} />
        <meshStandardMaterial color="#55443a" roughness={0.92} />
      </mesh>
      <mesh position={[0, 1.28, 0]} castShadow>
        <sphereGeometry args={[0.19, 16, 12]} />
        <meshStandardMaterial color="#bd9368" roughness={0.84} />
      </mesh>
    </group>
  );
}

function PreviewActorErrorFallback({
  failedRef,
}: {
  failedRef: MutableRefObject<boolean>;
}) {
  useEffect(() => {
    failedRef.current = true;
  }, [failedRef]);
  return <PreviewHeroFallback />;
}

function PreviewWeaponFallback({ color, pistol }: { color: string; pistol: boolean }) {
  return (
    <group scale={pistol ? 0.7 : 1}>
      <mesh position={[0, 0.015, -0.25]} castShadow>
        <boxGeometry args={[0.14, 0.13, 0.72]} />
        <meshStandardMaterial color={color} metalness={0.46} roughness={0.42} />
      </mesh>
      <mesh position={[0, -0.1, -0.025]} castShadow>
        <boxGeometry args={[0.095, 0.2, 0.13]} />
        <meshStandardMaterial color="#322a24" roughness={0.76} />
      </mesh>
      <mesh position={[0, 0.09, -0.16]} castShadow>
        <boxGeometry args={[0.19, 0.055, 0.18]} />
        <meshStandardMaterial color="#8c704d" metalness={0.42} roughness={0.48} />
      </mesh>
    </group>
  );
}

function PreviewWeaponErrorFallback({
  color,
  pistol,
  loadedRef,
}: {
  color: string;
  pistol: boolean;
  loadedRef: MutableRefObject<boolean>;
}) {
  useEffect(() => {
    loadedRef.current = true;
  }, [loadedRef]);
  return <PreviewWeaponFallback color={color} pistol={pistol} />;
}

function WarRoomPreviewRig({
  weaponId,
  readyRef,
}: {
  weaponId: WarRoomWeaponId;
  readyRef: React.MutableRefObject<boolean>;
}) {
  const weapon = WAR_ROOM_WEAPON_BY_ID.get(weaponId);
  const mountConfig = weapon ? getPreviewWeaponMount(weaponId, weapon) : DEFAULT_PREVIEW_WEAPON_MOUNT;
  const actorRef = useRef<THREE.Group | null>(null);
  const actorFailedRef = useRef(false);
  const weaponLoadedRef = useRef(!weaponId || !WAR_ROOM_WEAPON_BY_ID.get(weaponId)?.modelFile);
  const rigRef = useRef<THREE.Group | null>(null);
  const mountRef = useRef<THREE.Group | null>(null);
  const handScaleRef = useRef(new THREE.Vector3());
  const fallbackScale = mountConfig.scale;

  useFrame(() => {
    if (!weapon || !rigRef.current || !mountRef.current) return;
    if (!actorRef.current && !actorFailedRef.current) return;
    if (!weaponLoadedRef.current) return;
    actorRef.current?.updateMatrixWorld(true);
    const hand = actorRef.current && [
      "Rig_RightHand", "mixamorigRightHand", "FistR", "Fist.R", "RightHand", "RightHandBone",
    ].map((name) => actorRef.current?.getObjectByName(name)).find(Boolean);
    const mount = mountRef.current;
    const target = hand ?? rigRef.current;

    if (mount.parent !== target) {
      mount.parent?.remove(mount);
      target.add(mount);
    }
    if (hand) {
      const scale = hand.getWorldScale(handScaleRef.current);
      mount.position.set(
        mountConfig.position[0] / Math.max(0.01, Math.abs(scale.x)),
        mountConfig.position[1] / Math.max(0.01, Math.abs(scale.y)),
        mountConfig.position[2] / Math.max(0.01, Math.abs(scale.z)),
      );
      mount.scale.set(
        mountConfig.scale / Math.max(0.01, Math.abs(scale.x)),
        mountConfig.scale / Math.max(0.01, Math.abs(scale.y)),
        mountConfig.scale / Math.max(0.01, Math.abs(scale.z)),
      );
    } else {
      mount.position.set(0.34, 1.1, -0.26);
      mount.scale.setScalar(fallbackScale);
    }
    mount.rotation.set(mountConfig.rotation[0], mountConfig.rotation[1], mountConfig.rotation[2]);
    mount.visible = true;
    readyRef.current = true;
  });

  if (!weapon) return <PreviewHeroFallback />;
  const weaponFallback = <PreviewWeaponFallback color={weapon.color ?? "#c9a45b"} pistol={weapon.weaponClass === "pistol"} />;

  return (
    <group ref={rigRef}>
      <Suspense fallback={null}>
        <WarRoomAssetBoundary fallback={<PreviewActorErrorFallback failedRef={actorFailedRef} />}>
          <WarRoomAnimatedActor
            src={PLAYER_CHARACTER_MODEL_PATH}
            height={WAR_ROOM_CHARACTER_HEIGHT}
            state={() => "idle"}
            modelRef={actorRef}
          />
        </WarRoomAssetBoundary>
      </Suspense>
      <group ref={mountRef} name={`store-preview-weapon:${weaponId}`} visible={false}>
        {weapon.modelFile ? (
          <WarRoomAssetBoundary
            key={weaponId}
            fallback={
              <PreviewWeaponErrorFallback
                color={weapon.color ?? "#c9a45b"}
                pistol={weapon.weaponClass === "pistol"}
                loadedRef={weaponLoadedRef}
              />
            }
          >
            <Suspense fallback={null}>
              <PreviewWeaponModel
                weapon={weapon}
                src={`/models/weapons/${weapon.modelFile}`}
                loadedRef={weaponLoadedRef}
              />
            </Suspense>
          </WarRoomAssetBoundary>
        ) : (
          <PreviewWeaponErrorFallback
            color={weapon.color ?? "#c9a45b"}
            pistol={weapon.weaponClass === "pistol"}
            loadedRef={weaponLoadedRef}
          />
        )}
      </group>
    </group>
  );
}

function PreviewWeaponModel({
  weapon,
  src,
  loadedRef,
}: {
  weapon: WarRoomWeapon;
  src: string;
  loadedRef: MutableRefObject<boolean>;
}) {
  useEffect(() => {
    loadedRef.current = true;
  }, [loadedRef]);

  const weaponSize = weapon.modelSize ?? weapon.sourceBounds ?? [0.22, 0.42, 0.8] as const;
  const mount = getPreviewWeaponMount(weapon.id, weapon);
  return (
    <WarRoomStaticModel
      src={src}
      position={[0, 0, 0]}
      rotation={[0, 0, 0]}
      targetSize={weaponSize}
      uniformFitLength={weapon.normalizeLength}
      gripRatio={mount.gripRatio}
      minimumVisualThickness={weapon.minimumVisualThickness}
      muzzleEnd={mount.muzzleEnd}
      muzzleOffsetZ={mount.muzzleOffsetZ}
      fallbackColor={weapon.color}
    />
  );
}

function PreviewCameraFit({
  itemId,
  isLoading,
  subjectRef,
  controlsRef,
  readyRef,
}: {
  itemId: string;
  isLoading: boolean;
  subjectRef: RefObject<THREE.Group | null>;
  controlsRef: RefObject<PreviewOrbitControls | null>;
  readyRef?: RefObject<boolean>;
}) {
  const { camera, size } = useThree();
  const fittedKeyRef = useRef("");
  const fitKey = `${itemId}:${Math.round(size.width)}x${Math.round(size.height)}`;

  useFrame(() => {
    if (isLoading || fittedKeyRef.current === fitKey || (readyRef && !readyRef.current)) return;
    const subject = subjectRef.current;
    if (!subject) return;
    subject.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3().setFromObject(subject, true);
    if (bounds.isEmpty()) return;
    const sphere = bounds.getBoundingSphere(new THREE.Sphere());
    if (!Number.isFinite(sphere.radius) || sphere.radius < 0.08) return;

    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    const verticalFov = THREE.MathUtils.degToRad(perspectiveCamera.fov);
    const aspect = Math.max(0.1, size.width / Math.max(1, size.height));
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
    const halfFitFov = Math.min(verticalFov, horizontalFov) / 2;
    const distance = (sphere.radius / Math.sin(halfFitFov)) * 1.2;
    const center = sphere.center;
    const viewDirection = new THREE.Vector3(0.2, 0.14, 1).normalize();
    perspectiveCamera.position.copy(center).addScaledVector(viewDirection, distance);
    perspectiveCamera.near = Math.max(0.01, distance / 100);
    perspectiveCamera.far = Math.max(80, distance * 12);
    perspectiveCamera.updateProjectionMatrix();
    perspectiveCamera.lookAt(center);

    const controls = controlsRef.current;
    if (controls) {
      controls.target.copy(center);
      controls.minDistance = distance * 0.68;
      controls.maxDistance = distance * 2.35;
      controls.update();
    }
    fittedKeyRef.current = fitKey;
  });

  return null;
}

export default function EquipmentPreview3D({
  appearance,
  itemId,
  itemIcon,
  rarity,
  equipped,
  warRoomWeaponId,
}: EquipmentPreview3DProps) {
  const motionRef = useMemo(() => ({ current: createWorldMotion() }), []);
  const rootRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<PreviewOrbitControls | null>(null);
  const previewGroupRef = useRef<THREE.Group>(null);
  const weaponReadyRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number; id: number } | null>(null);
  const lastTapRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const previousItemIdRef = useRef(itemId);
  const [isVisible, setIsVisible] = useState(true);
  const [itemChanging, setItemChanging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const onPreviewReady = useCallback(() => setIsLoading(false), []);

  useEffect(() => {
    const element = rootRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, { threshold: 0.01 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (previousItemIdRef.current === itemId) return undefined;
    previousItemIdRef.current = itemId;
    setItemChanging(true);
    setIsLoading(true);
    weaponReadyRef.current = false;
    const timer = window.setTimeout(() => setItemChanging(false), 240);
    return () => window.clearTimeout(timer);
  }, [itemId]);

  const resetPreview = () => controlsRef.current?.reset();
  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
  };
  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start || start.id !== event.pointerId || event.isPrimary === false) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 7) {
      lastTapRef.current = null;
      return;
    }
    const now = event.timeStamp;
    const lastTap = lastTapRef.current;
    if (lastTap && now - lastTap.time < 330 && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 28) {
      resetPreview();
      lastTapRef.current = null;
      return;
    }
    lastTapRef.current = { x: event.clientX, y: event.clientY, time: now };
  };

  return (
    <div
      ref={rootRef}
      className={`store-item-preview-3d${itemChanging ? " is-changing" : ""}`}
      data-rarity={rarity}
      data-equipped={equipped ? "true" : "false"}
      aria-label="Oyuncu karakterinin seçili ekipmanla döndürülebilir üç boyutlu görünümü"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { pointerStartRef.current = null; }}
      onDoubleClick={(event) => {
        event.preventDefault();
        resetPreview();
      }}
    >
      <div className="store-item-preview-3d__vignette" aria-hidden="true" />
      {isLoading && (
        <div className="store-item-preview-3d__loading" role="status" aria-live="polite">
          <i aria-hidden="true" />
          <span>Önizleme hazırlanıyor</span>
        </div>
      )}
      <Canvas
        dpr={[1, EQUIPMENT_PREVIEW_MAX_DPR]}
        frameloop={isVisible ? "always" : "never"}
        camera={{ position: [0, 1.7, 5], fov: 38 }}
        gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
        fallback={<PreviewWebGLFallback itemIcon={itemIcon} onReady={onPreviewReady} />}
      >
        <PreviewLoadingObserver onLoadingChange={setIsLoading} />
        <ambientLight intensity={0.48} />
        <hemisphereLight args={["#fff0d4", "#20242c", 0.72]} />
        <directionalLight position={[3.5, 5, 3]} intensity={1.9} color="#f2d4a2" />
        <directionalLight position={[-3, 2, -2]} intensity={0.95} color="#83aab2" />
        <pointLight position={[0, 2.4, -2.2]} intensity={1.1} color={rarity === "legendary" ? "#ffc75e" : "#b9d5df"} distance={6} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]} scale={[0.8, 0.54, 1]}>
          <circleGeometry args={[1, 40]} />
          <meshBasicMaterial color="#080a0e" transparent opacity={0.34} depthWrite={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]} scale={[0.58, 0.37, 1]}>
          <circleGeometry args={[1, 40]} />
          <meshBasicMaterial color="#161820" transparent opacity={0.22} depthWrite={false} />
        </mesh>
        <group ref={previewGroupRef}>
          {warRoomWeaponId && WAR_ROOM_WEAPON_BY_ID.has(warRoomWeaponId as WarRoomWeaponId) ? (
            <WarRoomPreviewRig
              key={warRoomWeaponId}
              weaponId={warRoomWeaponId as WarRoomWeaponId}
              readyRef={weaponReadyRef}
            />
          ) : (
            <group scale={0.79}>
              <KnightActor
                motionRef={motionRef}
                state="idle"
                motionReduced={false}
                facingAngle={0}
                castShadow={false}
                appearance={appearance}
                playerCharacter
                useInGamePlayerModel
                preserveOriginalPlayerMaterials={false}
              />
            </group>
          )}
        </group>
        <PreviewCameraFit
          itemId={itemId}
          isLoading={isLoading}
          subjectRef={previewGroupRef}
          controlsRef={controlsRef}
          readyRef={warRoomWeaponId && WAR_ROOM_WEAPON_BY_ID.has(warRoomWeaponId as WarRoomWeaponId) ? weaponReadyRef : undefined}
        />
        <OrbitControls
          ref={(instance) => { controlsRef.current = instance as unknown as PreviewOrbitControls | null; }}
          target={[0, 0.78, 0]}
          enablePan={false}
          enableZoom
          enableDamping
          dampingFactor={0.08}
          minDistance={1.8}
          maxDistance={12}
          minPolarAngle={Math.PI / 3.8}
          maxPolarAngle={Math.PI / 1.95}
          autoRotate
          autoRotateSpeed={0.32}
        />
      </Canvas>
    </div>
  );
}
