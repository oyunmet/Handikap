import { WAR_ROOM_WEAPON_BY_ID, type WarRoomWeaponId } from "./war-room-data";

const weaponIconCache = new Map<WarRoomWeaponId, string>();
const renderedWeaponIconCache = new Map<WarRoomWeaponId, string>();
const renderedWeaponIconPromises = new Map<WarRoomWeaponId, Promise<string>>();
const modelCache = new Map<string, Promise<{ scene: import("three").Group }>>();
let rendererQueue = Promise.resolve();

const meleeShapes: Partial<Record<WarRoomWeaponId, string>> = {
  melee_knife: '<path d="M19 46 43 14 39 39 23 50Z"/><path d="m14 42 10 8"/>',
  melee_axe: '<path d="M31 51 34 19"/><path d="M32 26 14 16 11 28 27 32 39 20 51 25 48 11 34 13Z"/>',
  melee_cudgel: '<path d="M13 46 47 14"/><path d="m38 14 9-4 5 5-4 9"/>',
  melee_spear: '<path d="M17 51 43 14"/><path d="m37 17 12-10-1 16Z"/>',
  melee_shovel: '<path d="M30 50 35 22"/><path d="M23 10 47 14 40 30 27 28Z"/>',
  melee_staff: '<path d="M20 49 42 14"/><circle cx="45" cy="11" r="5"/><path d="m17 52 5-2"/>',
  melee_war_spear: '<path d="M15 53 43 12"/><path d="m38 15 14-11-2 18Z"/><path d="m12 56 5-4"/>',
  melee_pickaxe: '<path d="M30 52 34 23"/><path d="M13 17 35 11 52 18 48 25 34 20 18 27Z"/>',
};

function getRangedShape(id: WarRoomWeaponId) {
  if (id === "blaster_b" || id === "blaster_k" || id === "sidearm") {
    return '<path d="M11 22h29l8 6-4 7H29l-2 13H18l1-14-8-4Z"/><path d="M16 25v-7h18v7"/>';
  }
  if (id === "blaster_c" || id === "blaster_o" || id === "scattergun") {
    return '<path d="M8 24h38l9 5-2 6H18l-4 8H8l3-9Z"/><path d="M40 23v-6h12v6"/>';
  }
  if (id === "longbow") {
    return '<path d="M18 8q-18 24 0 48"/><path d="M18 8 45 32 18 56"/><path d="M15 32h38l-8-6m8 6-8 6"/>';
  }
  if (id === "crossbow") {
    return '<path d="M10 31h44M31 12v40"/><path d="M19 12q-15 19 0 40M31 29h23l-7-5m7 5-7 5"/>';
  }
  return '<path d="M7 24h39l11 5v6H22l-4 8h-9l4-10Z"/><path d="M15 25v-7h21v7"/><path d="M46 28h8"/>';
}

export function getWarRoomWeaponIconDataUrl(weaponId: WarRoomWeaponId) {
  const cached = weaponIconCache.get(weaponId);
  if (cached) return cached;
  const weapon = WAR_ROOM_WEAPON_BY_ID.get(weaponId);
  const color = weapon?.color ?? "#d9bd8b";
  const shape = meleeShapes[weaponId] ?? getRangedShape(weaponId);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><g fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${shape}</g></svg>`;
  const dataUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  weaponIconCache.set(weaponId, dataUrl);
  return dataUrl;
}

async function renderWeaponModelIcon(weaponId: WarRoomWeaponId): Promise<string> {
  const weapon = WAR_ROOM_WEAPON_BY_ID.get(weaponId);
  if (!weapon || typeof document === "undefined") return getWarRoomWeaponIconDataUrl(weaponId);

  const [{ GLTFLoader }, { SVGRenderer }, THREE] = await Promise.all([
    import("three/addons/loaders/GLTFLoader.js"),
    import("three/addons/renderers/SVGRenderer.js"),
    import("three"),
  ]);
  const source = weapon.modelFile
    ? `/models/weapons/${weapon.modelFile}`
    : null;
  let model: import("three").Object3D;
  let generatedGeometry: import("three").BufferGeometry[] = [];
  const generatedMaterials: import("three").Material[] = [];
  if (source) {
    let load = modelCache.get(source);
    if (!load) {
      load = new GLTFLoader().loadAsync(source).then(({ scene }) => ({ scene }));
      modelCache.set(source, load);
      void load.catch(() => modelCache.delete(source));
    }
    model = (await load).scene.clone(true);
  } else if (weaponId === "melee_shovel") {
    const shovel = new THREE.Group();
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.025, 0.78, 7),
      new THREE.MeshPhongMaterial({ color: "#806345", shininess: 12 }),
    );
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.21, 0.26, 0.035),
      new THREE.MeshPhongMaterial({ color: "#b5bdba", shininess: 42 }),
    );
    blade.position.y = -0.4;
    shovel.add(handle, blade);
    model = shovel;
    generatedGeometry = [handle.geometry, blade.geometry];
    generatedMaterials.push(handle.material, blade.material);
  } else {
    const weaponBody = new THREE.Group();
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: weapon.color ?? "#806345", shininess: 22 });
    const metalMaterial = new THREE.MeshPhongMaterial({ color: "#b5bdba", shininess: 42 });
    generatedMaterials.push(bodyMaterial, metalMaterial);
    const addPart = (
      geometry: import("three").BufferGeometry,
      material: import("three").Material,
      position: [number, number, number],
      rotation?: [number, number, number],
    ) => {
      const part = new THREE.Mesh(geometry, material);
      part.position.set(...position);
      if (rotation) part.rotation.set(...rotation);
      weaponBody.add(part);
      generatedGeometry.push(geometry);
    };
    if (weaponId === "longbow" || weaponId === "crossbow") {
      addPart(new THREE.TorusGeometry(0.42, 0.035, 6, 16, Math.PI), bodyMaterial, [0, 0, 0], [0, 0, -Math.PI / 2]);
      addPart(new THREE.CylinderGeometry(0.012, 0.012, 0.84, 5), metalMaterial, [0, 0, 0.02], [0, 0, Math.PI / 2]);
      if (weaponId === "crossbow") {
        addPart(new THREE.BoxGeometry(0.52, 0.08, 0.1), metalMaterial, [0, 0, 0]);
        addPart(new THREE.BoxGeometry(0.12, 0.42, 0.09), bodyMaterial, [0, -0.08, 0]);
      }
    } else {
      const pistol = weaponId === "sidearm" || weaponId === "blaster_b" || weaponId === "blaster_k";
      addPart(new THREE.BoxGeometry(pistol ? 0.44 : 0.72, 0.16, 0.14), bodyMaterial, [0, 0, 0]);
      addPart(new THREE.CylinderGeometry(0.035, 0.035, pistol ? 0.34 : 0.58, 8), metalMaterial, [0, 0.03, pistol ? -0.32 : -0.58], [Math.PI / 2, 0, 0]);
      addPart(new THREE.BoxGeometry(0.13, 0.28, 0.12), bodyMaterial, [0.04, -0.18, 0.08], [0, 0, -0.18]);
      if (!pistol) addPart(new THREE.BoxGeometry(0.26, 0.12, 0.14), bodyMaterial, [0, -0.01, 0.38]);
    }
    model = weaponBody;
  }

  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const original = Array.isArray(object.material) ? object.material : [object.material];
    const materials = original.map((material) => {
      const sourceColor = (material as import("three").MeshStandardMaterial).color;
      const next = new THREE.MeshPhongMaterial({
        color: sourceColor?.isColor ? sourceColor.clone() : (weapon.color ?? "#d9bd8b"),
        shininess: 26,
        flatShading: true,
      });
      generatedMaterials.push(next);
      return next;
    });
    object.material = Array.isArray(object.material) ? materials : materials[0];
  });

  const render = async () => {
    const root = new THREE.Group();
    root.add(model);
    const bounds = new THREE.Box3().setFromObject(root);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const longest = Math.max(size.x, size.y, size.z, 0.001);
    model.position.sub(center);
    root.scale.setScalar(1.4 / longest);
    root.rotation.set(-0.34, 0.52, 0.18);
    root.updateMatrixWorld(true);

    const scene = new THREE.Scene();
    scene.add(root);
    scene.add(new THREE.HemisphereLight("#ffffff", "#564536", 2.2));
    const key = new THREE.DirectionalLight("#fff1d5", 2.8);
    key.position.set(2, 4, 5);
    scene.add(key);
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 20);
    camera.position.set(0, 0, 6);
    camera.lookAt(0, 0, 0);
    const renderer = new SVGRenderer();
    renderer.setSize(64, 64);
    renderer.setPrecision(2);
    renderer.setQuality("low");
    renderer.render(scene, camera);
    const svg = renderer.domElement;
    svg.setAttribute("viewBox", "0 0 64 64");
    svg.setAttribute("width", "64");
    svg.setAttribute("height", "64");
    const dataUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
    generatedMaterials.forEach((material) => material.dispose());
    generatedGeometry.forEach((geometry) => geometry.dispose());
    return dataUrl;
  };

  const pending = rendererQueue.then(render, render);
  rendererQueue = pending.then(() => undefined, () => undefined);
  return pending;
}

export function getWarRoomRenderedWeaponIconDataUrl(weaponId: WarRoomWeaponId) {
  const cached = renderedWeaponIconCache.get(weaponId);
  if (cached) return Promise.resolve(cached);
  const pending = renderedWeaponIconPromises.get(weaponId);
  if (pending) return pending;
  const next = renderWeaponModelIcon(weaponId)
    .then((dataUrl) => {
      renderedWeaponIconCache.set(weaponId, dataUrl);
      return dataUrl;
    })
    .catch(() => getWarRoomWeaponIconDataUrl(weaponId))
    .finally(() => renderedWeaponIconPromises.delete(weaponId));
  renderedWeaponIconPromises.set(weaponId, next);
  return next;
}
