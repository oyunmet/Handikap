import * as THREE from "three";

export const WORLD_CAMERA_OCCLUSION_OPACITY = 0.32;

export function isEffectivelyVisible(object: THREE.Object3D) {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (!current.visible) return false;
    current = current.parent;
  }
  return true;
}

export function isCameraCollisionIgnored(object: THREE.Object3D) {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (
      current.userData.cameraCollisionIgnore === true
      || current.userData.cameraOccluder === false
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

export function collectCameraOccluders(scene: THREE.Scene) {
  const occluders: THREE.Object3D[] = [];
  scene.traverse((object) => {
    if (
      object.userData.cameraOccluder === true
      && !isCameraCollisionIgnored(object)
      && isEffectivelyVisible(object)
    ) {
      occluders.push(object);
    }
  });
  return occluders;
}

type FadedMaterial = {
  original: THREE.Material | THREE.Material[];
  faded: THREE.Material | THREE.Material[];
};

function cloneTransparentMaterial(material: THREE.Material): THREE.Material {
  const clone = material.clone();
  clone.transparent = true;
  clone.opacity = WORLD_CAMERA_OCCLUSION_OPACITY;
  clone.depthWrite = false;
  clone.needsUpdate = true;
  return clone;
}

function cloneFadedMaterial(material: THREE.Material | THREE.Material[]) {
  return Array.isArray(material)
    ? material.map(cloneTransparentMaterial)
    : cloneTransparentMaterial(material);
}

function disposeFadedMaterial(material: THREE.Material | THREE.Material[]) {
  if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
  else material.dispose();
}

/**
 * Fades only the exact hit meshes, without mutating shared materials.
 * InstancedMesh is intentionally excluded: fading one hit instance by
 * replacing its material makes every instance in that batch translucent.
 */
export class WorldCameraOcclusionFader {
  private readonly fadedMeshes = new Map<THREE.Mesh, FadedMaterial>();

  update(hitObjects: readonly THREE.Object3D[]) {
    const nextMeshes = new Set<THREE.Mesh>();
    for (const object of hitObjects) {
      if (
        object instanceof THREE.Mesh
        && !(object instanceof THREE.InstancedMesh)
        && !isCameraCollisionIgnored(object)
        && isEffectivelyVisible(object)
      ) {
        nextMeshes.add(object);
      }
    }

    for (const [mesh, faded] of this.fadedMeshes) {
      if (nextMeshes.has(mesh) && mesh.material === faded.faded) continue;
      if (mesh.material === faded.faded) mesh.material = faded.original;
      disposeFadedMaterial(faded.faded);
      this.fadedMeshes.delete(mesh);
    }

    for (const mesh of nextMeshes) {
      if (this.fadedMeshes.has(mesh)) continue;
      const original = mesh.material;
      const faded = cloneFadedMaterial(original);
      mesh.material = faded;
      this.fadedMeshes.set(mesh, { original, faded });
    }
  }

  clear() {
    for (const [mesh, faded] of this.fadedMeshes) {
      if (mesh.material === faded.faded) mesh.material = faded.original;
      disposeFadedMaterial(faded.faded);
    }
    this.fadedMeshes.clear();
  }
}

function getProjectedBoxArea(bounds: THREE.Box3, camera: THREE.Camera) {
  if (bounds.isEmpty()) return 0;
  const corners = [
    new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.min.z),
    new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.max.z),
    new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.min.z),
    new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.max.z),
    new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.min.z),
    new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.max.z),
    new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.min.z),
    new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.max.z),
  ].map((corner) => corner.project(camera));
  if (corners.every((point) => point.z < -1 || point.z > 1)) return 0;

  const minX = Math.min(...corners.map((point) => point.x));
  const maxX = Math.max(...corners.map((point) => point.x));
  const minY = Math.min(...corners.map((point) => point.y));
  const maxY = Math.max(...corners.map((point) => point.y));
  const width = THREE.MathUtils.clamp((Math.min(1, maxX) - Math.max(-1, minX)) / 2, 0, 1);
  const height = THREE.MathUtils.clamp((Math.min(1, maxY) - Math.max(-1, minY)) / 2, 0, 1);
  return width * height;
}

function getCameraOccluderLabel(mesh: THREE.Mesh, instanceId?: number) {
  const worldPropNames = mesh.userData.worldPropNames as string[] | undefined;
  if (typeof instanceId === "number" && worldPropNames?.[instanceId]) {
    return worldPropNames[instanceId];
  }
  return mesh.name || mesh.type;
}

/** Finds occluder meshes that contain the camera or project over 40% of the view. */
export function inspectCameraOccluders(
  occluders: readonly THREE.Object3D[],
  camera: THREE.Camera,
  minimumScreenArea = 0.4,
) {
  camera.updateMatrixWorld(true);
  const cameraPosition = camera.getWorldPosition(new THREE.Vector3());
  const issues: { name: string; cameraInside: boolean; screenArea: number }[] = [];
  const geometryBounds = new THREE.Box3();
  const instanceMatrix = new THREE.Matrix4();
  const worldMatrix = new THREE.Matrix4();
  const candidateBounds = new THREE.Box3();

  for (const root of occluders) {
    if (!isEffectivelyVisible(root) || isCameraCollisionIgnored(root)) continue;
    root.traverse((object) => {
      if (
        !(object instanceof THREE.Mesh)
        || !isEffectivelyVisible(object)
        || isCameraCollisionIgnored(object)
      ) {
        return;
      }

      const inspectBounds = (instanceId?: number) => {
        const cameraInside = candidateBounds.containsPoint(cameraPosition);
        const screenArea = getProjectedBoxArea(candidateBounds, camera);
        if (!cameraInside && screenArea < minimumScreenArea) return;
        issues.push({
          name: getCameraOccluderLabel(object, instanceId),
          cameraInside,
          screenArea: Number(screenArea.toFixed(3)),
        });
      };

      if (object instanceof THREE.InstancedMesh) {
        object.geometry.computeBoundingBox();
        if (!object.geometry.boundingBox) return;
        geometryBounds.copy(object.geometry.boundingBox);
        for (let index = 0; index < object.count; index += 1) {
          object.getMatrixAt(index, instanceMatrix);
          worldMatrix.multiplyMatrices(object.matrixWorld, instanceMatrix);
          candidateBounds.copy(geometryBounds).applyMatrix4(worldMatrix);
          inspectBounds(index);
        }
      } else {
        candidateBounds.setFromObject(object, true);
        inspectBounds();
      }
    });
  }

  return issues;
}
