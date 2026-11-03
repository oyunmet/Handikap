import test from "node:test";
import assert from "node:assert/strict";
import {
  readWarRoomArmsVisible,
  readWarRoomDebugEnabled,
  readWarRoomWeaponSway,
  writeWarRoomArmsVisible,
  writeWarRoomDebugEnabled,
  writeWarRoomWeaponSway,
} from "./war-room-viewmodel-settings.ts";

test("first-person arms default to visible and persist their setting", () => {
  const previousWindow = globalThis.window;
  const values = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  };
  try {
    assert.equal(readWarRoomArmsVisible(), true);
    assert.equal(writeWarRoomArmsVisible(false), false);
    assert.equal(readWarRoomArmsVisible(), false);
    assert.equal(writeWarRoomArmsVisible(true), true);
    assert.equal(readWarRoomArmsVisible(), true);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("weapon sway defaults to low and persists only the supported levels", () => {
  const previousWindow = globalThis.window;
  const values = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  };
  try {
    assert.equal(readWarRoomWeaponSway(), "low");
    assert.equal(writeWarRoomWeaponSway("off"), "off");
    assert.equal(readWarRoomWeaponSway(), "off");
    assert.equal(writeWarRoomWeaponSway("invalid"), "low");
    assert.equal(readWarRoomWeaponSway(), "low");
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("the diagnostics setting persists independently", () => {
  const previousWindow = globalThis.window;
  const values = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  };
  try {
    assert.equal(readWarRoomDebugEnabled(), false);
    assert.equal(writeWarRoomDebugEnabled(true), true);
    assert.equal(readWarRoomDebugEnabled(), true);
    assert.equal(writeWarRoomDebugEnabled(false), false);
    assert.equal(readWarRoomDebugEnabled(), false);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
