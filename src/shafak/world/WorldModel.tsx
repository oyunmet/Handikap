import { Html, useProgress } from "@react-three/drei";
import { useFrame, useLoader } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { WorldMotion } from "./movement";
import type { WorldObject } from "./world-generation";
import { createRoadShoulderGeometry, WORLD_ROAD_WIDTH } from "./world-natural-geometry";

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
  height: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
};

export function WorldAssetModel({
  src,
  height,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: ModelProps) {
  const gltf = useLoader(GLTFLoader, src, configureWorldGLTFLoader);
  const normalizedScene = useMemo(() => {
    const model = gltf.scene.clone(true);
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const fit = height / Math.max(size.y, 0.001);
    const center = bounds.getCenter(new THREE.Vector3());
    model.scale.setScalar(fit);
    model.position.set(-center.x * fit, -bounds.min.y * fit, -center.z * fit);
    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) value.anisotropy = Math.min(value.anisotropy, 4);
        }
      });
    });
    model.updateMatrixWorld(true);
    return model;
  }, [gltf.scene, height]);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <primitive object={normalizedScene} dispose={null} />
    </group>
  );
}

type ModelPart = {
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
  transform: THREE.Matrix4;
};

type AssetBatchProps = {
  src: string;
  targetHeight: number;
  items: readonly WorldObject[];
  motionRef: MutableRefObject<WorldMotion>;
  maxVisibleDistance?: number;
  maxDetailedDistance?: number;
};

function ModelPartInstances({
  part,
  items,
  motionRef,
  maxVisibleDistance,
  maxDetailedDistance,
  fitTransform,
}: {
  part: ModelPart;
  items: readonly WorldObject[];
  motionRef: MutableRefObject<WorldMotion>;
  maxVisibleDistance: number;
  maxDetailedDistance?: number;
  fitTransform: THREE.Matrix4;
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
      args={[part.geometry, part.material, items.length]}
      castShadow
      receiveShadow
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
}: AssetBatchProps) {
  const gltf = useLoader(GLTFLoader, src, configureWorldGLTFLoader);
  const { parts, fitTransform } = useMemo(() => {
    gltf.scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(gltf.scene);
    const size = bounds.getSize(new THREE.Vector3());
    const fit = targetHeight / Math.max(size.y, 0.001);
    const center = bounds.getCenter(new THREE.Vector3());
    const fitTransform = new THREE.Matrix4()
      .makeTranslation(-center.x * fit, -bounds.min.y * fit, -center.z * fit)
      .multiply(new THREE.Matrix4().makeScale(fit, fit, fit));
    const parts: ModelPart[] = [];
    gltf.scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      parts.push({
        geometry: child.geometry,
        material: child.material,
        transform: child.matrixWorld.clone(),
      });
    });
    return { parts, fitTransform };
  }, [gltf.scene, targetHeight]);

  return (
    <group>
      {parts.map((part, index) => (
        <ModelPartInstances
          key={`${src}:${index}`}
          part={part}
          items={items}
          motionRef={motionRef}
          maxVisibleDistance={maxVisibleDistance}
          maxDetailedDistance={maxDetailedDistance}
          fitTransform={fitTransform}
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
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 2), []);
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
      castShadow
      receiveShadow
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
