export type WarRoomControlId =
  | "move-stick"
  | "aim"
  | "reload"
  | "jump"
  | "dodge"
  | "sprint-lock"
  | "swap"
  | "fire"
  | "weapon-select";

export type WarRoomControlPosition = {
  x: number;
  y: number;
  size: number;
  opacity: number;
};

export type WarRoomControlLayout = Record<WarRoomControlId, WarRoomControlPosition>;

export type WarRoomControlDefinition = {
  id: WarRoomControlId;
  label: string;
  symbol: string;
  action: "move" | "aim" | "reload" | "jump" | "crouch" | "dodge" | "sprint-lock" | "swap" | "fire" | "select-weapon";
  width: number;
  height: number;
  defaultX: number;
  defaultY: number;
};

export const CONTROLS_CONFIG: readonly WarRoomControlDefinition[] = [
  { id: "move-stick", label: "HAREKET", symbol: "◉", action: "move", width: 96, height: 96, defaultX: 0.1, defaultY: 0.82 },
  { id: "aim", label: "NİŞAN", symbol: "⌖", action: "aim", width: 66, height: 66, defaultX: 0.78, defaultY: 0.63 },
  { id: "reload", label: "DOLDUR", symbol: "↻", action: "reload", width: 66, height: 66, defaultX: 0.9, defaultY: 0.53 },
  { id: "jump", label: "ZIPLA", symbol: "↑", action: "jump", width: 66, height: 66, defaultX: 0.91, defaultY: 0.72 },
  { id: "dodge", label: "EĞİL", symbol: "⌄", action: "crouch", width: 66, height: 66, defaultX: 0.77, defaultY: 0.83 },
  { id: "sprint-lock", label: "KOŞU", symbol: "»", action: "sprint-lock", width: 60, height: 60, defaultX: 0.88, defaultY: 0.39 },
  { id: "swap", label: "DEĞİŞTİR", symbol: "⇄", action: "swap", width: 66, height: 66, defaultX: 0.65, defaultY: 0.83 },
  { id: "fire", label: "ATEŞ", symbol: "✹", action: "fire", width: 92, height: 92, defaultX: 0.91, defaultY: 0.88 },
  { id: "weapon-select", label: "SİLAH ÇUBUĞU", symbol: "Ⅰ Ⅱ", action: "select-weapon", width: 150, height: 42, defaultX: 0.5, defaultY: 0.9 },
];

export const WAR_ROOM_CONTROL_LAYOUT_KEY = "shafak-war-room-controls-v18";

const CONTROL_BY_ID = new Map(CONTROLS_CONFIG.map((control) => [control.id, control]));
const MIN_SIZE = 70;
const MAX_SIZE = 140;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createDefaultWarRoomControlLayout(): WarRoomControlLayout {
  return Object.fromEntries(CONTROLS_CONFIG.map((control) => [
    control.id,
    { x: control.defaultX, y: control.defaultY, size: 100, opacity: 1 },
  ])) as WarRoomControlLayout;
}

export function isWarRoomDynamicStickStartAllowed(
  x: number,
  y: number,
  width: number,
  height: number,
): boolean {
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return false;
  const landscape = height < 500;
  const minY = landscape ? height * 0.18 : height * 0.38;
  const maxY = landscape ? height - 126 : height - 270;
  const maxX = landscape ? Math.min(width * 0.46, 96) : width * 0.46;
  return x >= 12 && x <= maxX && y >= minY && y <= maxY;
}

export function normalizeWarRoomControlLayout(value: unknown): WarRoomControlLayout {
  const defaults = createDefaultWarRoomControlLayout();
  if (!isRecord(value)) return defaults;

  for (const control of CONTROLS_CONFIG) {
    const candidate = value[control.id];
    if (!isRecord(candidate)) continue;
    const current = defaults[control.id];
    const x = typeof candidate.x === "number" && Number.isFinite(candidate.x) ? candidate.x : current.x;
    const y = typeof candidate.y === "number" && Number.isFinite(candidate.y) ? candidate.y : current.y;
    const size = typeof candidate.size === "number" && Number.isFinite(candidate.size) ? candidate.size : current.size;
    const opacity = typeof candidate.opacity === "number" && Number.isFinite(candidate.opacity)
      ? candidate.opacity
      : current.opacity;

    defaults[control.id] = {
      x: clamp(x, 0, 1),
      y: clamp(y, 0, 1),
      size: clamp(size, MIN_SIZE, MAX_SIZE),
      opacity: clamp(opacity, 0.2, 1),
    };
  }

  return defaults;
}

export function moveWarRoomControl(
  layout: WarRoomControlLayout,
  id: WarRoomControlId,
  x: number,
  y: number,
  stageWidth: number,
  stageHeight: number,
): WarRoomControlLayout {
  const definition = CONTROL_BY_ID.get(id);
  if (!definition) return layout;
  const position = layout[id];
  const width = Math.max(1, stageWidth);
  const height = Math.max(1, stageHeight);
  const scaledWidth = definition.width * (position.size / 100);
  const scaledHeight = definition.height * (position.size / 100);
  const minX = Math.min(0.5, (scaledWidth / 2 + 8) / width);
  const minY = Math.min(0.5, (scaledHeight / 2 + 8) / height);
  const nextX = clamp(x, minX, 1 - minX);
  const nextY = clamp(y, minY, 1 - minY);
  if (nextX === position.x && nextY === position.y) return layout;

  return {
    ...layout,
    [id]: {
      ...position,
      x: nextX,
      y: nextY,
    },
  };
}

export function fitWarRoomControlLayoutToStage(
  layout: WarRoomControlLayout,
  stageWidth: number,
  stageHeight: number,
): WarRoomControlLayout {
  return CONTROLS_CONFIG.reduce<WarRoomControlLayout>(
    (fitted, control) => moveWarRoomControl(
      fitted,
      control.id,
      fitted[control.id].x,
      fitted[control.id].y,
      stageWidth,
      stageHeight,
    ),
    layout,
  );
}

export function resizeWarRoomControl(
  layout: WarRoomControlLayout,
  id: WarRoomControlId,
  size: number,
  stageWidth: number,
  stageHeight: number,
): WarRoomControlLayout {
  const position = layout[id];
  const resized = {
    ...layout,
    [id]: { ...position, size: clamp(size, MIN_SIZE, MAX_SIZE) },
  };
  return moveWarRoomControl(resized, id, position.x, position.y, stageWidth, stageHeight);
}

export function loadWarRoomControlLayout(storage: Pick<Storage, "getItem"> | null | undefined) {
  const defaults = createDefaultWarRoomControlLayout();
  if (!storage) return { layout: defaults, customized: false };
  try {
    const serialized = storage.getItem(WAR_ROOM_CONTROL_LAYOUT_KEY);
    if (!serialized) return { layout: defaults, customized: false };
    const parsed: unknown = JSON.parse(serialized);
    if (!isRecord(parsed)) return { layout: defaults, customized: false };
    return { layout: normalizeWarRoomControlLayout(parsed), customized: true };
  } catch {
    return { layout: defaults, customized: false };
  }
}

export function saveWarRoomControlLayout(
  storage: Pick<Storage, "setItem"> | null | undefined,
  layout: WarRoomControlLayout,
) {
  if (!storage) return false;
  try {
    storage.setItem(WAR_ROOM_CONTROL_LAYOUT_KEY, JSON.stringify(normalizeWarRoomControlLayout(layout)));
    return true;
  } catch {
    return false;
  }
}

export function clearWarRoomControlLayout(storage: Pick<Storage, "removeItem"> | null | undefined) {
  if (!storage) return false;
  try {
    storage.removeItem(WAR_ROOM_CONTROL_LAYOUT_KEY);
    return true;
  } catch {
    return false;
  }
}
