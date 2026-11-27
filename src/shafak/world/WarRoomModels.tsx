import { useFrame, useLoader } from "@react-three/fiber";
import { Component, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import {
  loadCharacter,
} from "./character-model";
import {
  PLAYER_CHARACTER_MODEL_FACING,
  PLAYER_CHARACTER_MODEL_PATH,
} from "./player-model";
import { fitWarRoomWeapon } from "../game/war-room-weapon-fit";
import { WAR_ROOM_WEAPON_BY_ID, type WarRoomWeaponId } from "../game/war-room-data";
import { getWarRoomWeaponAnimationNode } from "./war-room-model-parts";
import type { EquipmentVisual } from "../game/store-types";
import type { CharacterAnimationState } from "./character-animation";
import SharedCharacterModel from "./SharedCharacterModel";
import {
  getFantasyKnightHeadAccessory,
  getFantasyKnightOutfitVariant,
} from "./fantasy-knight-model";

export const WAR_ROOM_MODEL_URLS = [
  "/models/war-room/wall.glb",
  "/models/war-room/tower-square.glb",
  "/models/war-room/tower-square-top.glb",
  "/models/war-room/tower-square-roof.glb",
  "/models/war-room/flag-pennant.glb",
  "/models/war-room/siege-ballista.glb",
  "/models/war-room/rocks-large.glb",
] as const;

const MISSING_COLORMAP_DATA_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAC6klEQVR42r2WuW4VQRQF+9uIyQjZxS72BPsthoTFNthsqfeU1X9IoWpdjqYTS9ZDGge+I53Sm6l7etqlixdWejX+dl7e3331YHN2a2t+e3tx5/3y7oeNe8xPvi73dl7s764dfFw//DQ7+jw//rJgvvbw8vqjK7PHV+dPri2eXl8+u7Hx/Cbz7/tvfhy8/Xn47tfR5u/jrdOT7W97r/8CSIQBgHSigUFiThwA0okGBgmMANKJJhcSGBjMSSeaXEhgYHQAceQCgEQ6GHjMyQVAKOlg4MEQQCjpYIiGAYw5oaSDIRoGsA4glGgAYICRDoM50QDAkEs6DEgCSCSXdBiQ4DEnkVzSYUCC1wHkkgiAaEgwQDInEQDRkGCQDkwA0YTCIB0YGOZEEwqDdGBgOoB0QgGQCwMeGOaEAiAXBtFgQAogFwbRYEiHxJxcGESDIR1SBxA9XsxJHy8B48WcuPFqK98D5dNI/p/Ip5H+/JRPIzVwtFxBzGzKp5HcmMinkTqe8mmkSzpa7vszsymfRnJjIp9GakjKp5EKMlpuC5jZlE8juTGRTyOtgZRPI92h0XKX1MymfBrJjYl8GukSpXwaac2MlrtDZrbzKHgWxZsdaXFyY9KRFqc9kx1pcdoCYxlblGa2/3EepJGlqc+9jCxNfSzZu2qq+9m7XVPdLyNLUx9LGVmaCsjeVVPNyd7tmrq9ZWRp6nKVkaWpgOxdNfW5Z+92TX2xZWRpqvtlZGkqIHtXTV2u7N2u6SrUzKu5XGVkaWrBlZGlqYD8PFBT+yc/D/5pmsVZbWr/VHFWmwrIzwPb1O3Nz4Pepivfg+xI+z3l00gNSfk0UkFGy328/dDPjrS8Uj6N9PmmfBrpDo2Wu6T90M+O9ABJ+TTSJUr5NNL3N1ruDvVD/zwKnkXxlh3pCZXyaaQ9k/JppC0wWq6B/ds0j3LrN+XTSLc05dNIi3K03B7r36Z5lHsEZkdanDqeHWlxuqRjGVszZv4BWf6KytMsO2cAAAAASUVORK5CYII=";

class WarRoomStaticGLTFLoader extends GLTFLoader {
  constructor() {
    super();
    // Keep Three's shared loading manager so the briefing progress bar tracks these files too.
    this.manager.setURLModifier((url) => {
      const normalized = decodeURIComponent(url).replace(/\\/g, "/");
      if (/(?:^|\/)textures\/colormap\.png(?:[?#].*)?$/i.test(normalized)) {
        return MISSING_COLORMAP_DATA_URI;
      }
      return url;
    });
  }
}

export function preloadWarRoomModels() {
  WAR_ROOM_MODEL_URLS.forEach((url) => useLoader.preload(WarRoomStaticGLTFLoader, url, loadCharacter));
}

export function getWarRoomWeaponPreloadUrls(weaponIds: readonly WarRoomWeaponId[]) {
  const urls = new Set<string>();
  for (const id of weaponIds) {
    const modelFile = WAR_ROOM_WEAPON_BY_ID.get(id)?.modelFile;
    if (modelFile) urls.add(`/models/weapons/${modelFile}`);
  }
  return [...urls];
}

export function preloadWarRoomWeaponModels(weaponIds: readonly WarRoomWeaponId[]) {
  getWarRoomWeaponPreloadUrls(weaponIds).forEach((url) => {
  useLoader.preload(WarRoomStaticGLTFLoader, url, loadCharacter);
  });
}

type AssetBoundaryProps = {
  children?: ReactNode;
  fallback: ReactNode;
};

class WarRoomAssetBoundaryImpl extends Component<
  AssetBoundaryProps,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.warn("[war-room] GLB yüklenemedi; basit yedek geometri kullanılıyor.", error.message);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function WarRoomAssetBoundary(props: AssetBoundaryProps) {
  return <WarRoomAssetBoundaryImpl {...props} />;
}

type TargetSize = readonly [number, number, number];

type StaticModelProps = {
  src: string;
  position: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  targetSize: TargetSize;
  uniformFitLength?: number;
  gripRatio?: number;
  minimumVisualThickness?: number;
  muzzleEnd?: -1 | 1;
  muzzleOffsetZ?: number;
  fallbackColor?: string;
  emissiveBoost?: number;
  muzzleAnchorRef?: MutableRefObject<THREE.Group | null>;
  magazineRef?: MutableRefObject<THREE.Object3D | null>;
  boltRef?: MutableRefObject<THREE.Object3D | null>;
  arrowRef?: MutableRefObject<THREE.Object3D | null>;
};

export function WarRoomStaticModel({
  src,
  position,
  rotation = [0, 0, 0],
  targetSize,
  uniformFitLength,
  gripRatio,
  minimumVisualThickness,
  muzzleEnd,
  muzzleOffsetZ = 0,
  fallbackColor,
  emissiveBoost = 0,
  muzzleAnchorRef,
  magazineRef,
  boltRef,
  arrowRef,
}: StaticModelProps) {
  const { scene } = useLoader(WarRoomStaticGLTFLoader, src, loadCharacter) as GLTF;
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      if (fallbackColor) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        const tintedMaterials = materials.map((material) => {
          const cloneMaterial = material.clone();
          if (cloneMaterial instanceof THREE.MeshStandardMaterial || cloneMaterial instanceof THREE.MeshPhysicalMaterial) {
            if (cloneMaterial.map) cloneMaterial.map.colorSpace = THREE.SRGBColorSpace;
            if (emissiveBoost > 0) {
              cloneMaterial.emissive.set(fallbackColor ?? "#b8a88d");
              cloneMaterial.emissiveIntensity = emissiveBoost;
            }
          }
          if (
            (cloneMaterial instanceof THREE.MeshStandardMaterial || cloneMaterial instanceof THREE.MeshPhysicalMaterial)
            && !cloneMaterial.map?.image
          ) {
            cloneMaterial.map = null;
            cloneMaterial.color.set(fallbackColor);
            cloneMaterial.needsUpdate = true;
          }
          return cloneMaterial;
        });
        object.material = Array.isArray(object.material) ? tintedMaterials : tintedMaterials[0];
      }
    });
    const bounds = new THREE.Box3().setFromObject(clone);
    const size = bounds.getSize(new THREE.Vector3());
    if (bounds.isEmpty() || size.x < 0.0001 || size.y < 0.0001 || size.z < 0.0001) {
      throw new Error(`Modelin ölçüleri okunamadı: ${src}`);
    }
    const center = bounds.getCenter(new THREE.Vector3());
    if (uniformFitLength && gripRatio !== undefined) {
      const fit = fitWarRoomWeapon(
        [bounds.min.x, bounds.min.y, bounds.min.z],
        [bounds.max.x, bounds.max.y, bounds.max.z],
        uniformFitLength,
        gripRatio,
        minimumVisualThickness,
      );
      clone.scale.multiply(new THREE.Vector3(...fit.scale));
      clone.position.set(...fit.offset);
    } else if (uniformFitLength) {
      const fitScale = uniformFitLength / Math.max(size.x, size.y, size.z);
      clone.scale.multiplyScalar(fitScale);
      clone.position.set(-center.x * fitScale, -center.y * fitScale, -center.z * fitScale);
    } else {
      const scale = new THREE.Vector3(
        targetSize[0] / size.x,
        targetSize[1] / size.y,
        targetSize[2] / size.z,
      );
      clone.scale.multiply(scale);
      clone.position.set(
        -center.x * scale.x,
        -bounds.min.y * scale.y,
        -center.z * scale.z,
      );
    }
    return clone;
  }, [emissiveBoost, fallbackColor, gripRatio, minimumVisualThickness, scene, src, targetSize, uniformFitLength]);

  useLayoutEffect(() => {
    const magazine = getWarRoomWeaponAnimationNode(model, "Magazine");
    const bolt = getWarRoomWeaponAnimationNode(model, "Bolt");
    const arrow = getWarRoomWeaponAnimationNode(model, "Arrow");
    magazineRef && (magazineRef.current = magazine ?? null);
    boltRef && (boltRef.current = bolt ?? null);
    arrowRef && (arrowRef.current = arrow ?? null);
    return () => {
      if (magazineRef && magazineRef.current === magazine) magazineRef.current = null;
      if (boltRef && boltRef.current === bolt) boltRef.current = null;
      if (arrowRef && arrowRef.current === arrow) arrowRef.current = null;
    };
  }, [arrowRef, boltRef, magazineRef, model]);

  useLayoutEffect(() => {
    const anchor = muzzleAnchorRef?.current;
    if (!anchor) return;
    model.updateMatrixWorld(true);
    const weaponRoot = anchor.parent;
    weaponRoot?.updateWorldMatrix(true, false);
    const toWeaponLocal = (worldPoint: THREE.Vector3) => (
      weaponRoot ? weaponRoot.worldToLocal(worldPoint) : worldPoint
    );
    let marker: THREE.Object3D | null = null;
    model.traverse((object) => {
      if (!marker && /muzzle|barrel[_ -]?end/i.test(object.name)) marker = object;
    });
    const muzzleMarker = marker as THREE.Object3D | null;
    if (muzzleMarker) {
      const markerWorldPosition = muzzleMarker.getWorldPosition(new THREE.Vector3());
      anchor.position.copy(toWeaponLocal(markerWorldPosition));
      return;
    }
    const inverseWeaponWorld = weaponRoot
      ? new THREE.Matrix4().copy(weaponRoot.matrixWorld).invert()
      : new THREE.Matrix4();
    const modelBounds = new THREE.Box3();
    const meshBounds = new THREE.Box3();
    const meshToWeapon = new THREE.Matrix4();
    const corner = new THREE.Vector3();
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const geometry = object.geometry;
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      if (!geometry.boundingBox) return;
      meshBounds.copy(geometry.boundingBox);
      meshToWeapon.multiplyMatrices(inverseWeaponWorld, object.matrixWorld);
      for (let index = 0; index < 8; index += 1) {
        corner.set(
          index & 1 ? meshBounds.max.x : meshBounds.min.x,
          index & 2 ? meshBounds.max.y : meshBounds.min.y,
          index & 4 ? meshBounds.max.z : meshBounds.min.z,
        ).applyMatrix4(meshToWeapon);
        modelBounds.expandByPoint(corner);
      }
    });
    if (modelBounds.isEmpty()) return;
    if (muzzleEnd) {
      anchor.position.set(
        (modelBounds.min.x + modelBounds.max.x) / 2,
        (modelBounds.min.y + modelBounds.max.y) / 2,
        (muzzleEnd < 0 ? modelBounds.min.z : modelBounds.max.z) + muzzleOffsetZ,
      );
      return;
    }
    anchor.position.set(
      (modelBounds.min.x + modelBounds.max.x) / 2,
      (modelBounds.min.y + modelBounds.max.y) / 2,
      modelBounds.min.z,
    );
  }, [model, muzzleAnchorRef, muzzleEnd, muzzleOffsetZ]);

  return (
    <group position={position} rotation={rotation}>
      <primitive object={model} dispose={null} />
    </group>
  );
}

type WarRoomCharacterProps = {
  src: string;
  height: number;
  tint?: string;
  commander?: boolean;
  modelRef?: MutableRefObject<THREE.Group | null>;
  stateRef?: MutableRefObject<CharacterAnimationState>;
  animationPaused?: boolean | (() => boolean);
};

function getWarRoomCharacterAppearance(
  src: string,
  tint: string | undefined,
  commander: boolean,
): EquipmentVisual {
  const outfit = getFantasyKnightOutfitVariant(`${src}:${tint ?? ""}:${commander}`);
  return {
    ...outfit,
    armor: tint ?? outfit.armor,
    armorLight: commander ? "#c29b54" : tint ?? outfit.armorLight,
    armorDark: "#493a31",
    trim: commander ? "#e0bd68" : "#a77d43",
    bootColor: "#4a352a",
    cape: commander ? "#9d343c" : outfit.cape,
    armorStyle: commander ? "royal" : outfit.armorStyle,
    weaponStyle: "sword",
  };
}

export function WarRoomCharacterActor({
  src,
  height,
  tint,
  commander = false,
  modelRef,
  stateRef,
  animationPaused,
}: WarRoomCharacterProps) {
  const rigRef = useRef<THREE.Group | null>(null);
  const appearance = useMemo(
    () => getWarRoomCharacterAppearance(src, tint, commander),
    [commander, src, tint],
  );

  useEffect(() => {
    if (!modelRef) return undefined;
    modelRef.current = rigRef.current;
    return () => {
      if (modelRef.current === rigRef.current) modelRef.current = null;
    };
  }, [modelRef]);

  return (
    <group rotation={[0, PLAYER_CHARACTER_MODEL_FACING, 0]} name="shared-player-hero-war-room-actor">
      <SharedCharacterModel
        appearance={appearance}
        headAccessory={getFantasyKnightHeadAccessory(`${src}:${tint ?? ""}:${commander}`)}
        targetHeight={height}
        showWeapon={false}
        rootRef={rigRef}
        modelPath={PLAYER_CHARACTER_MODEL_PATH}
        stateRef={stateRef}
        animationPaused={animationPaused}
      />
    </group>
  );
}

