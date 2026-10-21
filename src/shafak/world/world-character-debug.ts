import * as THREE from "three";

export const CHARACTER_MESH_OFFSET_ERROR_METERS = 3;

export type WorldCharacterDebugEntry = {
  name: string;
  position: [number, number, number];
  yaw: number | null;
  isPlayer: boolean;
  isBoss: boolean;
  meshes: Array<{ name: string; offset: number }>;
  animations: Array<{ name: string; weight: number }>;
  errors: string[];
};

export function inspectWorldCharacterGroups(scene: THREE.Scene): WorldCharacterDebugEntry[] {
  scene.updateMatrixWorld(true);
  const entries: WorldCharacterDebugEntry[] = [];
  scene.traverse((object) => {
    if (object.userData.worldCharacterRoot !== true) return;
    const groupPosition = object.getWorldPosition(new THREE.Vector3());
    const animations = new Map<string, number>();
    let yaw: number | null = null;
    const meshes: WorldCharacterDebugEntry["meshes"] = [];
    const errors: string[] = [];
    object.traverse((child) => {
      const childYaw = child.userData.worldCharacterYaw;
      if (typeof childYaw === "number" && Number.isFinite(childYaw)) yaw = childYaw;
      const clips = child.userData.worldAnimationClips;
      if (Array.isArray(clips)) {
        for (const clip of clips) {
          if (
            clip
            && typeof clip.name === "string"
            && typeof clip.weight === "number"
            && Number.isFinite(clip.weight)
          ) {
            animations.set(clip.name, Math.max(animations.get(clip.name) ?? 0, clip.weight));
          }
        }
      }
      if (!(child instanceof THREE.SkinnedMesh)) return;
      const meshPosition = child.getWorldPosition(new THREE.Vector3());
      const offset = groupPosition.distanceTo(meshPosition);
      meshes.push({
        name: child.name || child.type,
        offset: Number.isFinite(offset) ? offset : Number.POSITIVE_INFINITY,
      });
      if (!Number.isFinite(offset) || offset > CHARACTER_MESH_OFFSET_ERROR_METERS) {
        errors.push(`${child.name || child.type}: ${Number.isFinite(offset) ? offset.toFixed(3) : "non-finite"}m`);
      }
    });
    entries.push({
      name: object.name || object.type,
      position: groupPosition.toArray().map((value) => Number(value.toFixed(3))) as [number, number, number],
      yaw,
      isPlayer: object.userData.worldPlayerActor === true,
      isBoss: object.userData.worldBossActor === true,
      meshes,
      animations: [...animations].map(([name, weight]) => ({ name, weight })),
      errors,
    });
  });
  return entries;
}

export function formatWorldCharacterGroups(entries: WorldCharacterDebugEntry[]) {
  return entries.map((entry) => {
    const meshes = entry.meshes.length
      ? entry.meshes.map((mesh) => `${mesh.name}=${Number.isFinite(mesh.offset) ? mesh.offset.toFixed(3) : "∞"}m`).join(", ")
      : "SkinnedMesh yok";
    const animations = entry.animations.length
      ? entry.animations.map((animation) => `${animation.name}=${animation.weight.toFixed(3)}`).join(", ")
      : "animasyon yok";
    return `${entry.name} @ (${entry.position.map((value) => value.toFixed(3)).join(", ")}) · mesh offset: ${meshes} · anim: ${animations}`;
  });
}
