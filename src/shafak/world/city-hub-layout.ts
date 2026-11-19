export type CityDoorId = "campaign" | "war-room" | "survival" | "daily";
export type CityPosition = { x: number; z: number };
export type CityInput = { x: number; z: number };
export type CityJoystickBounds = Pick<DOMRect, "left" | "top" | "width" | "height">;
export type CityStreetSide = "east" | "west" | "north" | "south";
export type CityMissionMode = "raid" | "survival" | "daily";

export type CityDoor = {
  id: CityDoorId;
  missionMode?: CityMissionMode;
  title: string;
  category: string;
  description: string;
  color: string;
  street: string;
  side: CityStreetSide;
  building: CityPosition;
  entrance: CityPosition;
  width: number;
  depth: number;
  height: number;
};

export const CITY_DOORS: readonly CityDoor[] = [
  {
    id: "campaign",
    title: "SEFER ARŞİVİ",
    category: "ANA OPERASYON · KUZGUN HATTI",
    description: "Dokuz istihbarat dosyasını topla, Alaz'ı bul ve tahliye ağını kimin ele geçirdiğini ortaya çıkar.",
    color: "#d6aa69",
    street: "Batı Sokağı",
    side: "east",
    building: { x: -11, z: 0 },
    entrance: { x: -7.35, z: 0 },
    width: 6,
    depth: 6,
    height: 5.6,
  },
  {
    id: "war-room",
    missionMode: "raid",
    title: "TAKTİK ARENA",
    category: "OPERASYON MERKEZİ",
    description: "Silah donanımını seç, çatışma alanında hedefleri temizle ve üsse dön.",
    color: "#ec7359",
    street: "Doğu Sokağı",
    side: "west",
    building: { x: 11, z: 0 },
    entrance: { x: 7.35, z: 0 },
    width: 6,
    depth: 6,
    height: 5.6,
  },
  {
    id: "survival",
    missionMode: "survival",
    title: "DALGA SAVUNMASI",
    category: "HAYATTA KALMA OPERASYONU",
    description: "Kontrol noktasını art arda gelen düşman birliklerine karşı savun ve en yüksek dalgana ulaş.",
    color: "#78aeba",
    street: "Kuzey Çarşısı",
    side: "south",
    building: { x: 0, z: -11 },
    entrance: { x: 0, z: -7.35 },
    width: 6,
    depth: 6,
    height: 5.6,
  },
  {
    id: "daily",
    missionMode: "daily",
    title: "GÜNLÜK OPERASYON",
    category: "GÜNLÜK SAHA GÖREVİ",
    description: "Günün değişen harita ve hedeflerini tamamla, ödülünü alıp üsse dön.",
    color: "#e5a052",
    street: "Güney Çarşısı",
    side: "north",
    building: { x: 0, z: 11 },
    entrance: { x: 0, z: 7.35 },
    width: 6,
    depth: 6,
    height: 5.6,
  },
] as const;

export const CITY_START_POSITION: CityPosition = { x: 0, z: 0 };
export const CITY_WALK_SPEED = 4.4;
export const CITY_EDGE_LIMIT = 21;
export const CITY_DOOR_INTERACTION_RANGE = 2.25;

export const CITY_COLLISION_MARGIN = 0.55;

export function readCityJoystick(
  clientX: number,
  clientY: number,
  bounds: CityJoystickBounds,
): CityInput {
  if (![clientX, clientY, bounds.left, bounds.top, bounds.width, bounds.height].every(Number.isFinite)) {
    return { x: 0, z: 0 };
  }
  const radius = Math.max(1, Math.min(bounds.width, bounds.height) * 0.34);
  const dx = clientX - bounds.left - bounds.width / 2;
  const dy = clientY - bounds.top - bounds.height / 2;
  const magnitude = Math.hypot(dx, dy);
  const scale = magnitude > radius ? radius / magnitude : 1;
  return {
    x: Math.max(-1, Math.min(1, (dx * scale) / radius)),
    z: Math.max(-1, Math.min(1, (dy * scale) / radius)),
  };
}

function isInsideBuilding(position: CityPosition, door: CityDoor) {
  const halfWidth = door.width / 2 + CITY_COLLISION_MARGIN;
  const halfDepth = door.depth / 2 + CITY_COLLISION_MARGIN;
  return Math.abs(position.x - door.building.x) < halfWidth
    && Math.abs(position.z - door.building.z) < halfDepth;
}

function clampPosition(position: CityPosition): CityPosition {
  return {
    x: Math.max(-CITY_EDGE_LIMIT, Math.min(CITY_EDGE_LIMIT, position.x)),
    z: Math.max(-CITY_EDGE_LIMIT, Math.min(CITY_EDGE_LIMIT, position.z)),
  };
}

export function stepCityPosition(
  position: CityPosition,
  input: CityInput,
  deltaSeconds: number,
): CityPosition {
  const safeDelta = Number.isFinite(deltaSeconds)
    ? Math.max(0, Math.min(0.05, deltaSeconds))
    : 0;
  let x = Number.isFinite(position.x) ? position.x : 0;
  let z = Number.isFinite(position.z) ? position.z : 0;
  let axisX = Number.isFinite(input.x) ? Math.max(-1, Math.min(1, input.x)) : 0;
  let axisZ = Number.isFinite(input.z) ? Math.max(-1, Math.min(1, input.z)) : 0;
  const magnitude = Math.hypot(axisX, axisZ);

  if (magnitude > 1) {
    axisX /= magnitude;
    axisZ /= magnitude;
  }

  const distance = CITY_WALK_SPEED * safeDelta;
  const nextX = clampPosition({ x: x + axisX * distance, z }).x;
  if (!CITY_DOORS.some((door) => isInsideBuilding({ x: nextX, z }, door))) x = nextX;

  const nextZ = clampPosition({ x, z: z + axisZ * distance }).z;
  if (!CITY_DOORS.some((door) => isInsideBuilding({ x, z: nextZ }, door))) z = nextZ;

  return { x, z };
}

export function findNearbyCityDoor(
  position: CityPosition,
  maxDistance = CITY_DOOR_INTERACTION_RANGE,
): CityDoor | null {
  let nearest: CityDoor | null = null;
  let nearestDistance = Math.max(0, maxDistance);

  for (const door of CITY_DOORS) {
    const distance = Math.hypot(position.x - door.entrance.x, position.z - door.entrance.z);
    if (distance <= nearestDistance) {
      nearest = door;
      nearestDistance = distance;
    }
  }

  return nearest;
}
