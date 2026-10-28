import test from "node:test";
import assert from "node:assert/strict";
import {
  CONTROLS_CONFIG,
  WAR_ROOM_CONTROL_LAYOUT_KEY,
  clearWarRoomControlLayout,
  createDefaultWarRoomControlLayout,
  fitWarRoomControlLayoutToStage,
  loadWarRoomControlLayout,
  moveWarRoomControl,
  normalizeWarRoomControlLayout,
  resizeWarRoomControl,
  saveWarRoomControlLayout,
} from "./war-room-controls.ts";

test("War Room control catalog contains all movable touch controls", () => {
  assert.deepEqual(
    CONTROLS_CONFIG.map(({ id }) => id),
    ["move-stick", "aim", "reload", "jump", "dodge", "swap", "fire", "weapon-select"],
  );
});

test("control layout normalization clamps size, opacity, and positions", () => {
  const layout = normalizeWarRoomControlLayout({
    fire: { x: 3, y: -2, size: 250, opacity: 0 },
    aim: { x: 0.44, y: 0.51, size: 90, opacity: 0.66 },
  });

  assert.deepEqual(layout.fire, { x: 1, y: 0, size: 140, opacity: 0.2 });
  assert.deepEqual(layout.aim, { x: 0.44, y: 0.51, size: 90, opacity: 0.66 });
  assert.deepEqual(layout.jump, createDefaultWarRoomControlLayout().jump);
});

test("dragging clamps the full control inside the safe editor stage", () => {
  const layout = createDefaultWarRoomControlLayout();
  const moved = moveWarRoomControl(layout, "fire", -1, 4, 800, 360);

  assert.ok(moved.fire.x >= (38 / 800));
  assert.ok(moved.fire.x <= 1 - (38 / 800));
  assert.ok(moved.fire.y >= (38 / 360));
  assert.ok(moved.fire.y <= 1 - (38 / 360));
  assert.equal(layout.fire.x, 0.91);
});

test("default controls fit even a short landscape safe stage", () => {
  const defaults = createDefaultWarRoomControlLayout();
  const fitted = fitWarRoomControlLayoutToStage(defaults, 800, 180);

  for (const control of CONTROLS_CONFIG) {
    const position = fitted[control.id];
    const halfWidth = (control.width * position.size / 100) / 2 + 8;
    const halfHeight = (control.height * position.size / 100) / 2 + 8;
    assert.ok(position.x * 800 >= halfWidth, `${control.id} stays inside the left safe edge`);
    assert.ok(position.x * 800 <= 800 - halfWidth, `${control.id} stays inside the right safe edge`);
    assert.ok(position.y * 180 >= halfHeight, `${control.id} stays inside the top safe edge`);
    assert.ok(position.y * 180 <= 180 - halfHeight, `${control.id} stays inside the bottom safe edge`);
  }
});

test("increasing a control size keeps its full bounds inside the safe stage", () => {
  const layout = createDefaultWarRoomControlLayout();
  const moved = moveWarRoomControl(layout, "fire", 0.95, 0.95, 800, 360);
  const resized = resizeWarRoomControl(moved, "fire", 140, 800, 360);

  assert.ok(resized.fire.x >= (50 / 800));
  assert.ok(resized.fire.x <= 1 - (50 / 800));
  assert.ok(resized.fire.y >= (50 / 360));
  assert.ok(resized.fire.y <= 1 - (50 / 360));
});

test("control layout loads, saves, and resets with local storage", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const initial = loadWarRoomControlLayout(storage);
  const edited = {
    ...initial.layout,
    fire: { ...initial.layout.fire, x: 0.72, size: 125, opacity: 0.8 },
  };

  assert.equal(initial.customized, false);
  assert.equal(saveWarRoomControlLayout(storage, edited), true);
  assert.equal(values.has(WAR_ROOM_CONTROL_LAYOUT_KEY), true);
  assert.deepEqual(loadWarRoomControlLayout(storage), { layout: edited, customized: true });
  assert.equal(clearWarRoomControlLayout(storage), true);
  assert.deepEqual(loadWarRoomControlLayout(storage), initial);
});

test("corrupt or unavailable storage uses defaults without throwing", () => {
  assert.equal(loadWarRoomControlLayout({ getItem: () => "{" }).customized, false);
  assert.equal(saveWarRoomControlLayout(null, createDefaultWarRoomControlLayout()), false);
  assert.equal(clearWarRoomControlLayout(null), false);
});
