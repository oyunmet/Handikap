import { useFrame, useLoader } from "@react-three/fiber";
import { Component, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { createPlayerLocomotionClip, isRootTranslationTrack, resolveGlbClipName } from "./model-animation";
import {
  cloneCharacterResources,
  disposeCharacterResources,
  fitCharacterModel,
  loadCharacter,
  type CharacterOwnedResources,
} from "./character-model";
import {
  PLAYER_CHARACTER_ANIMATION_CLIPS,
  PLAYER_CHARACTER_MODEL_FACING,
  PLAYER_CHARACTER_ROOT_BONE,
} from "./player-model";
import { fitWarRoomWeapon } from "../game/war-room-weapon-fit";

export const WAR_ROOM_MODEL_URLS = [
  "/models/player-hero.glb",
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
  useLoader.preload(GLTFLoader, WAR_ROOM_MODEL_URLS[0], loadCharacter);
  WAR_ROOM_MODEL_URLS.slice(1).forEach((url) => useLoader.preload(WarRoomStaticGLTFLoader, url, loadCharacter));
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

export type WarRoomAnimationState =
  | "idle"
  | "walk"
  | "run"
  | "crouch"
  | "jump"
  | "turn-left"
  | "turn-right"
  | "attack"
  | "hit"
  | "death";

type AnimatedActorProps = {
  src: string;
  height: number;
  tint?: string;
  commander?: boolean;
  state: () => WarRoomAnimationState;
  playbackScale?: () => number;
  modelRef?: MutableRefObject<THREE.Group | null>;
  afterAnimationFrame?: (model: THREE.Group) => void;
};

function createWarRoomPoseClip(
  model: THREE.Group,
  name: string,
  times: readonly number[],
  poses: readonly {
    boneName: string;
    rotations: readonly (readonly [number, number, number])[];
  }[],
) {
  const tracks: THREE.KeyframeTrack[] = [];
  for (const pose of poses) {
    const bone = model.getObjectByName(pose.boneName);
    if (!bone || pose.rotations.length !== times.length) continue;
    const values: number[] = [];
    pose.rotations.forEach(([x, y, z]) => {
      const offset = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
      bone.quaternion.clone().multiply(offset).toArray(values, values.length);
    });
    tracks.push(new THREE.QuaternionKeyframeTrack(
      `${bone.name}.quaternion`,
      times,
      values,
    ));
  }
  return tracks.length > 0
    ? new THREE.AnimationClip(name, times[times.length - 1], tracks)
    : null;
}

function createWarRoomPoseClips(model: THREE.Group) {
  const crouch = createWarRoomPoseClip(model, "crouch", [0, 0.4, 0.8], [
    { boneName: "Hips", rotations: [[0.16, 0, 0], [0.17, 0, 0], [0.16, 0, 0]] },
    { boneName: "UpperLeg.L", rotations: [[-0.42, 0, 0], [-0.48, 0, 0], [-0.42, 0, 0]] },
    { boneName: "UpperLeg.R", rotations: [[-0.48, 0, 0], [-0.42, 0, 0], [-0.48, 0, 0]] },
    { boneName: "LowerLeg.L", rotations: [[0.82, 0, 0], [0.72, 0, 0], [0.82, 0, 0]] },
    { boneName: "LowerLeg.R", rotations: [[0.72, 0, 0], [0.82, 0, 0], [0.72, 0, 0]] },
    { boneName: "Spine", rotations: [[-0.12, 0, 0], [-0.12, 0, 0], [-0.12, 0, 0]] },
    { boneName: "UpperArm.L", rotations: [[-0.18, 0, 0], [-0.2, 0, 0], [-0.18, 0, 0]] },
    { boneName: "UpperArm.R", rotations: [[-0.18, 0, 0], [-0.2, 0, 0], [-0.18, 0, 0]] },
  ]);
  const jump = createWarRoomPoseClip(model, "jump", [0, 0.08, 0.22, 0.38], [
    { boneName: "UpperLeg.L", rotations: [[0, 0, 0], [-0.48, 0, 0], [-0.48, 0, 0], [-0.48, 0, 0]] },
    { boneName: "UpperLeg.R", rotations: [[0, 0, 0], [-0.48, 0, 0], [-0.48, 0, 0], [-0.48, 0, 0]] },
    { boneName: "LowerLeg.L", rotations: [[0, 0, 0], [0.78, 0, 0], [0.78, 0, 0], [0.78, 0, 0]] },
    { boneName: "LowerLeg.R", rotations: [[0, 0, 0], [0.78, 0, 0], [0.78, 0, 0], [0.78, 0, 0]] },
    { boneName: "UpperArm.L", rotations: [[0, 0, 0], [-0.32, 0, 0], [-0.32, 0, 0], [-0.32, 0, 0]] },
    { boneName: "UpperArm.R", rotations: [[0, 0, 0], [-0.32, 0, 0], [-0.32, 0, 0], [-0.32, 0, 0]] },
  ]);
  const turnLeft = createWarRoomPoseClip(model, "turn-left", [0, 0.12, 0.24, 0.36, 0.48], [
    { boneName: "Hips", rotations: [[0, 0, 0], [0.03, 0.2, -0.07], [0, 0.34, 0], [0.02, -0.08, 0.07], [0, 0, 0]] },
    { boneName: "Abdomen", rotations: [[0, 0, 0], [0, -0.08, 0.025], [0, -0.16, 0], [0, 0.04, -0.025], [0, 0, 0]] },
    { boneName: "Torso", rotations: [[0, 0, 0], [-0.025, -0.1, 0.08], [-0.04, -0.2, 0.04], [0, 0.08, -0.07], [0, 0, 0]] },
    { boneName: "UpperArm.L", rotations: [[0, 0, 0], [-0.14, 0, -0.14], [-0.2, 0, -0.24], [-0.08, 0, 0.08], [0, 0, 0]] },
    { boneName: "UpperArm.R", rotations: [[0, 0, 0], [0.1, 0, 0.1], [0.16, 0, 0.2], [0.06, 0, -0.08], [0, 0, 0]] },
    { boneName: "UpperLeg.L", rotations: [[0, 0, 0], [-0.28, 0, 0.1], [0.16, 0, 0.16], [-0.08, 0, 0], [0, 0, 0]] },
    { boneName: "UpperLeg.R", rotations: [[0, 0, 0], [0.14, 0, -0.08], [-0.2, 0, -0.14], [0.06, 0, 0], [0, 0, 0]] },
    { boneName: "LowerLeg.L", rotations: [[0, 0, 0], [0.1, 0, 0], [-0.14, 0, 0], [0.04, 0, 0], [0, 0, 0]] },
    { boneName: "LowerLeg.R", rotations: [[0, 0, 0], [-0.08, 0, 0], [0.12, 0, 0], [-0.03, 0, 0], [0, 0, 0]] },
  ]);
  const turnRight = createWarRoomPoseClip(model, "turn-right", [0, 0.12, 0.24, 0.36, 0.48], [
    { boneName: "Hips", rotations: [[0, 0, 0], [0.03, -0.2, 0.07], [0, -0.34, 0], [0.02, 0.08, -0.07], [0, 0, 0]] },
    { boneName: "Abdomen", rotations: [[0, 0, 0], [0, 0.08, -0.025], [0, 0.16, 0], [0, -0.04, 0.025], [0, 0, 0]] },
    { boneName: "Torso", rotations: [[0, 0, 0], [-0.025, 0.1, -0.08], [-0.04, 0.2, -0.04], [0, -0.08, 0.07], [0, 0, 0]] },
    { boneName: "UpperArm.L", rotations: [[0, 0, 0], [0.1, 0, -0.1], [0.16, 0, -0.2], [0.06, 0, 0.08], [0, 0, 0]] },
    { boneName: "UpperArm.R", rotations: [[0, 0, 0], [-0.14, 0, 0.14], [-0.2, 0, 0.24], [-0.08, 0, -0.08], [0, 0, 0]] },
    { boneName: "UpperLeg.L", rotations: [[0, 0, 0], [0.14, 0, 0.08], [-0.2, 0, 0.14], [0.06, 0, 0], [0, 0, 0]] },
    { boneName: "UpperLeg.R", rotations: [[0, 0, 0], [-0.28, 0, -0.1], [0.16, 0, -0.16], [-0.08, 0, 0], [0, 0, 0]] },
    { boneName: "LowerLeg.L", rotations: [[0, 0, 0], [-0.08, 0, 0], [0.12, 0, 0], [-0.03, 0, 0], [0, 0, 0]] },
    { boneName: "LowerLeg.R", rotations: [[0, 0, 0], [0.1, 0, 0], [-0.14, 0, 0], [0.04, 0, 0], [0, 0, 0]] },
  ]);
  return [crouch, jump, turnLeft, turnRight].filter((clip): clip is THREE.AnimationClip => clip !== null);
}

function attachCommanderCape(model: THREE.Group, resources: CharacterOwnedResources) {
  const torso = model.getObjectByName("Torso")
    ?? model.getObjectByName("Abdomen")
    ?? model.getObjectByName("Hips")
    ?? model;
  model.updateMatrixWorld(true);
  const parentScale = torso.getWorldScale(new THREE.Vector3());
  const inverseScale = new THREE.Vector3(
    1 / Math.max(0.01, Math.abs(parentScale.x)),
    1 / Math.max(0.01, Math.abs(parentScale.y)),
    1 / Math.max(0.01, Math.abs(parentScale.z)),
  );
  const mount = new THREE.Group();
  mount.name = "war-room-commander-cape-mount";
  mount.scale.copy(inverseScale);
  mount.position.set(0, -0.025 * inverseScale.y, -0.11 * inverseScale.z);
  torso.add(mount);

  const columns = 8;
  const rows = 9;
  const positions = new Float32Array((columns + 1) * (rows + 1) * 3);
  const uvs = new Float32Array((columns + 1) * (rows + 1) * 2);
  const indices: number[] = [];
  for (let row = 0; row <= rows; row += 1) {
    for (let column = 0; column <= columns; column += 1) {
      const vertex = row * (columns + 1) + column;
      const u = column / columns;
      const v = row / rows;
      positions[vertex * 3] = (u - 0.5) * (0.42 + v * 0.32);
      positions[vertex * 3 + 1] = -v * 0.88;
      positions[vertex * 3 + 2] = -0.12 - Math.sin(v * Math.PI / 2) * 0.13;
      uvs[vertex * 2] = u;
      uvs[vertex * 2 + 1] = 1 - v;
      if (row < rows && column < columns) {
        const nextRow = vertex + columns + 1;
        indices.push(vertex, nextRow, vertex + 1, vertex + 1, nextRow, nextRow + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    color: "#a5222d",
    roughness: 0.93,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const cape = new THREE.Mesh(geometry, material);
  cape.name = "war-room-commander-red-cape";
  cape.castShadow = true;
  mount.add(cape);
  resources.geometries.push(geometry);
  resources.materials.push(material);
}

export function WarRoomAnimatedActor({
  src,
  height,
  tint,
  commander = false,
  state,
  playbackScale,
  modelRef,
  afterAnimationFrame,
}: AnimatedActorProps) {
  const { scene, animations } = useLoader(GLTFLoader, src, loadCharacter) as GLTF;
  const prepared = useMemo(() => {
    const clone = cloneSkinned(scene) as THREE.Group;
    const resources = cloneCharacterResources(clone);
    if (tint) {
      const tintColor = new THREE.Color(tint);
      clone.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          const name = material.name.toLowerCase().replace(/[^a-z0-9]/g, "");
          const colored = material as THREE.Material & { color?: THREE.Color };
          if (!colored.color?.isColor) return;
          if (name === "shirt" || name === "undershirt") colored.color.set(tintColor);
          else if (name === "pants") colored.color.lerp(tintColor, 0.2);
        });
      });
    }
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = false;
    });
    fitCharacterModel(clone, height, src);
    if (commander) attachCommanderCape(clone, resources);
    return { model: clone, resources };
  }, [commander, height, scene, src, tint]);
  const model = prepared.model;
  const poseClips = useMemo(() => createWarRoomPoseClips(model), [model]);
  const animationClips = useMemo(
    () => [
      ...animations.map((clip) => {
        const inPlaceClip = clip.clone();
        inPlaceClip.tracks = inPlaceClip.tracks.filter(
          (track) => !isRootTranslationTrack(track.name, PLAYER_CHARACTER_ROOT_BONE),
        );
        return createPlayerLocomotionClip(inPlaceClip);
      }),
      ...poseClips,
    ],
    [animations, poseClips],
  );
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model]);
  const activeAction = useRef<THREE.AnimationAction | null>(null);
  const activeState = useRef<WarRoomAnimationState | null>(null);
  const previousPlaybackSign = useRef(1);

  useEffect(() => {
    if (modelRef) modelRef.current = model;
    return () => {
      if (modelRef?.current === model) modelRef.current = null;
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      activeAction.current = null;
      activeState.current = null;
      disposeCharacterResources(prepared.resources);
    };
  }, [mixer, model, modelRef, prepared.resources]);

  useFrame((_, delta) => {
    const nextState = state();
    if (nextState !== activeState.current) {
      const animationState = nextState === "death"
        ? "die"
        : nextState === "crouch"
          ? "idle"
          : nextState === "turn-left" || nextState === "turn-right"
            ? "idle"
          : nextState;
      const clip = animationClips.find((candidate) => candidate.name === nextState)
        ?? animationClips.find((candidate) => candidate.name === resolveGlbClipName(
          animationState,
          animationClips.map((item) => item.name),
          PLAYER_CHARACTER_ANIMATION_CLIPS,
        ));
      if (clip) {
        const nextAction = mixer.clipAction(clip);
        nextAction.reset().setEffectiveWeight(1).play();
        if (activeAction.current) {
          activeAction.current.crossFadeTo(nextAction, 0.18, false);
        } else {
          nextAction.fadeIn(0.18);
        }
        activeAction.current = nextAction;
        if (
          nextState === "death"
          || nextState === "attack"
          || nextState === "hit"
          || nextState === "jump"
        ) {
          nextAction.setLoop(THREE.LoopOnce, 1).clampWhenFinished = true;
        }
        else nextAction.setLoop(THREE.LoopRepeat, Infinity);
      }
      activeState.current = nextState;
    }
    const requestedPlaybackScale = playbackScale?.() ?? 1;
    const playbackSign = requestedPlaybackScale < 0 ? -1 : 1;
    if (activeAction.current) {
      if (playbackSign !== previousPlaybackSign.current) {
        activeAction.current.time = playbackSign < 0 ? activeAction.current.getClip().duration : 0;
      }
      activeAction.current.timeScale = requestedPlaybackScale;
    }
    previousPlaybackSign.current = playbackSign;
    mixer.update(Math.min(delta, 0.05));
    afterAnimationFrame?.(model);
  });

  return (
    <group rotation={[0, PLAYER_CHARACTER_MODEL_FACING, 0]}>
      <primitive object={model} dispose={null} />
    </group>
  );
}
