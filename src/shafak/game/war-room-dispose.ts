export type WarRoomDisposableMaterial = { dispose: () => void };

export type WarRoomDisposableRenderable = {
  isInstancedMesh?: boolean;
  dispose?: () => void;
  geometry: { dispose: () => void };
  material: WarRoomDisposableMaterial | WarRoomDisposableMaterial[];
};

export type WarRoomOwnedRenderable = {
  object: WarRoomDisposableRenderable;
  disposeGeometry?: boolean;
};

export function disposeWarRoomSceneResources(resources: readonly WarRoomOwnedRenderable[]) {
  resources.forEach(({ object, disposeGeometry = true }) => {
    if (object.isInstancedMesh) object.dispose?.();
    if (disposeGeometry) object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => material.dispose());
  });
}
