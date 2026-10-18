import { Html, useProgress } from "@react-three/drei";
import { useFrame, useLoader } from "@react-three/fiber";
import { Component, useEffect, useMemo, useRef } from "react";
import type { MutableRefObject, ReactNode } from "react";
import * as THREE from "three";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { WorldMotion } from "./movement";
import type { WorldObject } from "./world-generation";
import { applyRockPbrMaterials } from "./procedural-materials";
import { capWorldTextures } from "./texture-budget.ts";
import {
  getWorldAssetKind,
  getWorldAssetRepresentativeNode,
  getWorldAssetSizeTarget,
  getWorldModelFitScale,
} from "./world-model-sizing.ts";
export { getWorldAssetKind as getWorldAssetFallbackKind } from "./world-model-sizing.ts";
import {
  createRoadShoulderGeometry,
  getNaturalRockGeometry,
  WORLD_ROAD_WIDTH,
} from "./world-natural-geometry";

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/assets/draco/");

export function configureWorldGLTFLoader(loader: GLTFLoader) {
  loader.setDRACOLoader(dracoLoader);
}

const down = new THREE.Vector3(0, -1, 0);
const raycaster = new THREE.Raycaster();
const rayOrigin = new THREE.Vector3();
const groundMeshes = (() => {
  const material = new THREE.MeshBasicMaterial({ color: "white", side: THREE.DoubleSide });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(340, 440), material);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.52, -150);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_ROAD_WIDTH, 440), material);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, -0.08, -150);
  const shoulder = new THREE.Mesh(createRoadShoulderGeometry("high"), material);
  shoulder.position.z = -150;
  const meshes = [ground, shoulder, road];
  meshes.forEach((mesh) => mesh.updateMatrixWorld(true));
  return meshes;
})();

/** Places scenery against the same road, shoulder, and terrain surfaces rendered by WorldLandscape. */
export function raycastWorldGround(x: number, z: number) {
  rayOrigin.set(x, 40, z);
  raycaster.set(rayOrigin, down);
  const intersections = raycaster.intersectObjects(groundMeshes, false);
  return intersections[0]?.point.y ?? -0.52;
}

type ModelProps = {
  src: string;
  height?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  castShadow?: boolean;
  disposeOnUnmount?: boolean;
};

type WorldAssetErrorBoundaryProps = {
  fallback: ReactNode;
  children?: ReactNode;
};

class WorldAssetLoadBoundary extends Component<
  WorldAssetErrorBoundaryProps,
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn("[shafak-world] Model load failed; using procedural geometry.", error.message);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

export function WorldAssetErrorBoundary(props: WorldAssetErrorBoundaryProps) {
  return <WorldAssetLoadBoundary {...props} />;
}

export type WorldAssetFallbackKind = ReturnType<typeof getWorldAssetKind>;

const FALLBACK_ROCK_MATERIAL = new THREE.MeshStandardMaterial({
  color: "#aaa595",
  roughness: 0.97,
  metalness: 0,
});
const FALLBACK_WOOD_MATERIAL = new THREE.MeshStandardMaterial({
  color: "#694731",
  roughness: 0.9,
});
const FALLBACK_WOOD_HIGHLIGHT_MATERIAL = new THREE.MeshStandardMaterial({
  color: "#8a6141",
  roughness: 0.88,
});
const FALLBACK_CLAY_MATERIAL = new THREE.MeshStandardMaterial({
  color: "#a76755",
  roughness: 0.82,
});
const FALLBACK_BRONZE_MATERIAL = new THREE.MeshStandardMaterial({
  color: "#9a7953",
  metalness: 0.58,
  roughness: 0.46,
});
const FALLBACK_BARREL_GEOMETRY = new THREE.LatheGeometry([
  new THREE.Vector2(0, 0),
  new THREE.Vector2(0.31, 0),
  new THREE.Vector2(0.37, 0.08),
  new THREE.Vector2(0.42, 0.26),
  new THREE.Vector2(0.44, 0.5),
  new THREE.Vector2(0.42, 0.74),
  new THREE.Vector2(0.37, 0.92),
  new THREE.Vector2(0.31, 1),
  new THREE.Vector2(0, 1),
], 32);
const FALLBACK_VASE_GEOMETRY = new THREE.LatheGeometry([
  new THREE.Vector2(0, 0),
  new THREE.Vector2(0.2, 0),
  new THREE.Vector2(0.28, 0.08),
  new THREE.Vector2(0.38, 0.3),
  new THREE.Vector2(0.4, 0.52),
  new THREE.Vector2(0.32, 0.71),
  new THREE.Vector2(0.19, 0.84),
  new THREE.Vector2(0.16, 0.96),
  new THREE.Vector2(0.21, 1),
  new THREE.Vector2(0.14, 1),
  new THREE.Vector2(0.13, 0.9),
  new THREE.Vector2(0.1, 0.8),
  new THREE.Vector2(0, 0.8),
], 32);
const FALLBACK_CHEST_BODY = new THREE.BoxGeometry(0.84, 0.54, 0.62);
const FALLBACK_CHEST_LID = new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2);
const FALLBACK_CHEST_STRAP = new THREE.BoxGeometry(0.075, 0.9, 0.66);
const FALLBACK_CHEST_LATCH = new THREE.BoxGeometry(0.14, 0.18, 0.045);
const FALLBACK_GENERIC_GEOMETRY = new THREE.SphereGeometry(1, 32, 24);

export function WorldAssetFallback({
  src,
  height,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  castShadow = false,
  disposeOnUnmount = false,
}: ModelProps) {
  const kind = getWorldAssetKind(src);
  const sizing = getWorldAssetSizeTarget(src);
  const targetHeight = height ?? sizing.targetHeight;
  const rockFit = getWorldModelFitScale(
    { x: 0.169, y: 0.144, z: 0.32 },
    targetHeight,
    sizing.maxDimension,
  );
  const rockGeometry = useMemo(
    () => disposeOnUnmount ? getNaturalRockGeometry(2).clone() : getNaturalRockGeometry(2),
    [disposeOnUnmount],
  );
  const rockSecondaryGeometry = useMemo(
    () => disposeOnUnmount ? getNaturalRockGeometry(4).clone() : getNaturalRockGeometry(4),
    [disposeOnUnmount],
  );
  const rockMaterial = useMemo(
    () => disposeOnUnmount ? FALLBACK_ROCK_MATERIAL.clone() : FALLBACK_ROCK_MATERIAL,
    [disposeOnUnmount],
  );

  useEffect(() => {
    if (!disposeOnUnmount) return undefined;
    return () => {
      rockGeometry.dispose();
      rockSecondaryGeometry.dispose();
      rockMaterial.dispose();
    };
  }, [disposeOnUnmount, rockGeometry, rockMaterial, rockSecondaryGeometry]);

  return (
    <group
      position={position}
      rotation={rotation}
      scale={scale * (kind === "rock" ? rockFit : 1)}
    >
      {kind === "rock" && (
        <group>
          <mesh
            geometry={rockGeometry}
            material={rockMaterial}
            position={[0, 0.072, 0]}
            scale={[0.0845, 0.072, 0.16]}
            castShadow={castShadow}
            receiveShadow={castShadow}
          />
          <mesh
            geometry={rockSecondaryGeometry}
            material={rockMaterial}
            position={[0.017, 0.026, -0.048]}
            scale={[0.02, 0.026, 0.027]}
            castShadow={castShadow}
            receiveShadow={castShadow}
          />
        </group>
      )}
      {kind === "barrel" && (
        <group scale={[height, height, height]}>
          <mesh geometry={FALLBACK_BARREL_GEOMETRY} material={FALLBACK_WOOD_MATERIAL} castShadow={castShadow} receiveShadow={castShadow} />
          {[0.13, 0.87].map((y) => (
            <mesh
              key={y}
              position={[0, y, 0]}
              rotation={[Math.PI / 2, 0, 0]}
              material={FALLBACK_BRONZE_MATERIAL}
              castShadow={castShadow}
              receiveShadow={castShadow}
            >
              <torusGeometry args={[0.41, 0.032, 8, 32]} />
            </mesh>
          ))}
          {[-0.2, 0, 0.2].map((x) => (
            <mesh
              key={x}
              position={[x, 0.5, 0.414]}
              scale={[0.075, 0.73, 0.012]}
              geometry={FALLBACK_GENERIC_GEOMETRY}
              material={FALLBACK_WOOD_HIGHLIGHT_MATERIAL}
            />
          ))}
        </group>
      )}
      {kind === "vase" && (
        <group scale={[height, height, height]}>
          <mesh geometry={FALLBACK_VASE_GEOMETRY} material={FALLBACK_CLAY_MATERIAL} castShadow={castShadow} receiveShadow={castShadow} />
          <mesh
            position={[0, 0.95, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            material={FALLBACK_CLAY_MATERIAL}
          >
            <torusGeometry args={[0.18, 0.035, 8, 24]} />
          </mesh>
        </group>
      )}
      {kind === "chest" && (
        <group scale={[height, height, height]}>
          <mesh geometry={FALLBACK_CHEST_BODY} position={[0, 0.27, 0]} material={FALLBACK_WOOD_MATERIAL} castShadow={castShadow} receiveShadow={castShadow} />
          <mesh
            geometry={FALLBACK_CHEST_LID}
            position={[0, 0.54, 0]}
            scale={[0.42, 0.43, 0.31]}
            material={FALLBACK_WOOD_HIGHLIGHT_MATERIAL}
            castShadow={castShadow}
            receiveShadow={castShadow}
          />
          {[-0.25, 0.25].map((x) => (
            <mesh
              key={x}
              geometry={FALLBACK_CHEST_STRAP}
              position={[x, 0.47, 0]}
              material={FALLBACK_BRONZE_MATERIAL}
              castShadow={castShadow}
              receiveShadow={castShadow}
            />
          ))}
          <mesh
            geometry={FALLBACK_CHEST_LATCH}
            position={[0, 0.42, 0.335]}
            material={FALLBACK_BRONZE_MATERIAL}
            castShadow={castShadow}
            receiveShadow={castShadow}
          />
        </group>
      )}
      {kind === "generic" && (
        <mesh
          geometry={FALLBACK_GENERIC_GEOMETRY}
          material={FALLBACK_ROCK_MATERIAL}
          position={[0, height * 0.5, 0]}
          scale={[height * 0.42, height * 0.5, height * 0.42]}
          castShadow={castShadow}
          receiveShadow={castShadow}
        />
      )}
    </group>
  );
}

function LoadedWorldAssetModel({
  src,
  height,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  castShadow = false,
  disposeOnUnmount = false,
}: ModelProps) {
  const gltf = useLoader(GLTFLoader, src, configureWorldGLTFLoader);
  const normalizedAsset = useMemo(() => {
    gltf.scene.updateMatrixWorld(true);
    let model = gltf.scene.clone(true);
    const representativeName = getWorldAssetRepresentativeNode(src);
    if (representativeName) {
      const representative = model.getObjectByName(representativeName);
      if (!representative) {
        throw new Error(`World asset "${src}" is missing expected node "${representativeName}".`);
      }
      const sourceTransform = representative.matrixWorld.clone();
      representative.removeFromParent();
      const isolated = new THREE.Group();
      isolated.name = representativeName;
      sourceTransform.decompose(isolated.position, isolated.quaternion, isolated.scale);
      isolated.add(representative);
      representative.position.set(0, 0, 0);
      representative.rotation.set(0, 0, 0);
      representative.scale.set(1, 1, 1);
      model = isolated;
    }
    capWorldTextures(model);
    if (getWorldAssetKind(src) === "rock") applyRockPbrMaterials(model);
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const sizing = getWorldAssetSizeTarget(src);
    const fit = getWorldModelFitScale(size, height ?? sizing.targetHeight, sizing.maxDimension);
    const center = bounds.getCenter(new THREE.Vector3());
    model.scale.multiplyScalar(fit);
    model.position.set(-center.x * fit, -bounds.min.y * fit, -center.z * fit);
    const ownedGeometries: THREE.BufferGeometry[] = [];
    const ownedMaterials: THREE.Material[] = [];
    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = castShadow;
      child.receiveShadow = castShadow;
      if (disposeOnUnmount) {
        child.geometry = child.geometry.clone();
        ownedGeometries.push(child.geometry);
        const cloneMaterial = (material: THREE.Material) => {
          const clone = material.clone();
          ownedMaterials.push(clone);
          return clone;
        };
        child.material = Array.isArray(child.material)
          ? child.material.map(cloneMaterial)
          : cloneMaterial(child.material);
      }
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) value.anisotropy = Math.min(value.anisotropy, 4);
        }
      });
    });
    model.updateMatrixWorld(true);
    return { model, ownedGeometries, ownedMaterials };
  }, [castShadow, disposeOnUnmount, gltf.scene, height, src]);

  useEffect(() => () => {
    normalizedAsset.ownedGeometries.forEach((geometry) => geometry.dispose());
    normalizedAsset.ownedMaterials.forEach((material) => material.dispose());
  }, [normalizedAsset]);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <primitive object={normalizedAsset.model} dispose={null} />
    </group>
  );
}

export function WorldAssetModel(props: ModelProps) {
  return (
    <WorldAssetLoadBoundary fallback={<WorldAssetFallback {...props} />}>
      <LoadedWorldAssetModel {...props} />
    </WorldAssetLoadBoundary>
  );
}

type ModelPart = {
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
  transform: THREE.Matrix4;
};

type AssetBatchProps = {
  src: string;
  targetHeight?: number;
  items: readonly WorldObject[];
  motionRef: MutableRefObject<WorldMotion>;
  maxVisibleDistance?: number;
  maxDetailedDistance?: number;
  castShadow?: boolean;
};

function ModelPartInstances({
  part,
  items,
  motionRef,
  name,
  maxVisibleDistance,
  maxDetailedDistance,
  fitTransform,
  castShadow,
}: {
  part: ModelPart;
  items: readonly WorldObject[];
  motionRef: MutableRefObject<WorldMotion>;
  name: string;
  maxVisibleDistance: number;
  maxDetailedDistance?: number;
  fitTransform: THREE.Matrix4;
  castShadow: boolean;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const instanceMatrix = useMemo(() => new THREE.Matrix4(), []);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const motion = motionRef.current;
    mesh.count = items.length;
    items.forEach((item, index) => {
      const gap = item.worldX - motion.distance;
      const visible = gap > -32
        && gap < maxVisibleDistance
        && (maxDetailedDistance === undefined || gap <= maxDetailedDistance);
      const x = item.lane * 9.7;
      dummy.position.set(
        x,
        raycastWorldGround(x, -150),
        -(item.worldX - motion.cameraX) * item.parallax,
      );
      dummy.rotation.set(0, (item.flickerSeed % 63) * 0.1, 0);
      dummy.scale.setScalar(visible ? item.scale : 0);
      dummy.updateMatrix();
      instanceMatrix.copy(dummy.matrix).multiply(fitTransform).multiply(part.transform);
      mesh.setMatrixAt(index, instanceMatrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  });

  return (
    <instancedMesh
      ref={meshRef}
      name={name}
      args={[part.geometry, part.material, items.length]}
      userData={{
        cameraOccluder: true,
        worldPropNames: items.map((item) => `${item.kind}:${item.id}`),
      }}
      castShadow={castShadow}
      receiveShadow={castShadow}
      frustumCulled={false}
    />
  );
}

export function WorldAssetInstanceBatch({
  src,
  targetHeight,
  items,
  motionRef,
  maxVisibleDistance = 150,
  maxDetailedDistance,
  castShadow = false,
}: AssetBatchProps) {
  const gltf = useLoader(GLTFLoader, src, configureWorldGLTFLoader);
  const { parts, fitTransform } = useMemo(() => {
    gltf.scene.updateMatrixWorld(true);
    let model = gltf.scene.clone(true);
    const representativeName = getWorldAssetRepresentativeNode(src);
    if (representativeName) {
      const representative = model.getObjectByName(representativeName);
      if (!representative) {
        throw new Error(`World asset "${src}" is missing expected node "${representativeName}".`);
      }
      const sourceTransform = representative.matrixWorld.clone();
      representative.removeFromParent();
      const isolated = new THREE.Group();
      isolated.name = representativeName;
      sourceTransform.decompose(isolated.position, isolated.quaternion, isolated.scale);
      isolated.add(representative);
      representative.position.set(0, 0, 0);
      representative.rotation.set(0, 0, 0);
      representative.scale.set(1, 1, 1);
      model = isolated;
    }
    capWorldTextures(model);
    if (getWorldAssetKind(src) === "rock") applyRockPbrMaterials(model);
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const sizing = getWorldAssetSizeTarget(src);
    const fit = getWorldModelFitScale(size, targetHeight ?? sizing.targetHeight, sizing.maxDimension);
    const center = bounds.getCenter(new THREE.Vector3());
    const fitTransform = new THREE.Matrix4()
      .makeTranslation(-center.x * fit, -bounds.min.y * fit, -center.z * fit)
      .multiply(new THREE.Matrix4().makeScale(fit, fit, fit));
    const parts: ModelPart[] = [];
    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = castShadow;
      child.receiveShadow = castShadow;
      parts.push({
        geometry: child.geometry,
        material: child.material,
        transform: child.matrixWorld.clone(),
      });
    });
    return { parts, fitTransform };
  }, [castShadow, gltf.scene, src, targetHeight]);

  return (
    <group>
      {parts.map((part, index) => (
        <ModelPartInstances
          key={`${src}:${index}`}
          name={`roadside-asset:${src}:${index}`}
          part={part}
          items={items}
          motionRef={motionRef}
          maxVisibleDistance={maxVisibleDistance}
          maxDetailedDistance={maxDetailedDistance}
          fitTransform={fitTransform}
          castShadow={castShadow}
        />
      ))}
    </group>
  );
}

export function WorldRockFarLod({
  items,
  motionRef,
}: {
  items: readonly WorldObject[];
  motionRef: MutableRefObject<WorldMotion>;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const geometry = useMemo(() => getNaturalRockGeometry(3), []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#756b66",
    roughness: 0.94,
    metalness: 0.02,
  }), []);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const motion = motionRef.current;
    items.forEach((item, index) => {
      const gap = item.worldX - motion.distance;
      const visible = gap > 72 && gap < 150;
      const x = item.lane * 9.7;
      const ground = raycastWorldGround(x, -150);
      dummy.position.set(x, ground + (visible ? 0.68 * item.scale : 0), -(item.worldX - motion.cameraX) * item.parallax);
      dummy.rotation.set(0.1, (item.flickerSeed % 63) * 0.1, 0.15);
      dummy.scale.set(visible ? 0.92 * item.scale : 0, visible ? 0.72 * item.scale : 0, visible ? 0.82 * item.scale : 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, items.length]}
      castShadow={false}
      receiveShadow={false}
      frustumCulled={false}
    />
  );
}

export function WorldAssetProgress() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <Html center zIndexRange={[120, 0]}>
      <div
        role="status"
        aria-label="Dünya modelleri yükleniyor"
        style={{
          width: 164,
          height: 5,
          borderRadius: 999,
          overflow: "hidden",
          background: "rgba(18, 17, 20, .55)",
          boxShadow: "0 0 12px rgba(255, 190, 115, .35)",
        }}
      >
        <span
          style={{
            display: "block",
            width: `${Math.max(4, progress)}%`,
            height: "100%",
            borderRadius: 999,
            background: "linear-gradient(90deg, #d58c56, #f4d29a)",
            transition: "width 120ms linear",
          }}
        />
      </div>
    </Html>
  );
}
