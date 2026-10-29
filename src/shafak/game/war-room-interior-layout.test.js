import assert from "node:assert/strict";
import test from "node:test";
import { WAR_ROOM_BUILDINGS } from "./war-room-data.ts";
import {
  getWarRoomInteriorStyle,
  WAR_ROOM_INTERIOR_STYLES,
} from "./war-room-interior-layout.ts";

test("each War Room house receives its own interior palette and furnishing layout", () => {
  assert.equal(WAR_ROOM_INTERIOR_STYLES.length, 8);
  assert.equal(new Set(WAR_ROOM_INTERIOR_STYLES.map((style) => style.name)).size, 8);
  assert.equal(new Set(WAR_ROOM_INTERIOR_STYLES.map((style) => style.rug)).size, 8);
  assert.equal(new Set(WAR_ROOM_INTERIOR_STYLES.map((style) => style.accessory)).size, 4);
  assert.equal(new Set(WAR_ROOM_INTERIOR_STYLES.map((style) => style.bedAngle)).size, 2);
  assert.equal(
    new Set(WAR_ROOM_BUILDINGS.map((building) => getWarRoomInteriorStyle(building.style).name)).size,
    WAR_ROOM_BUILDINGS.length,
  );
});

test("interior style lookup wraps room rotations and negative style values", () => {
  assert.equal(getWarRoomInteriorStyle(0).name, "barracks");
  assert.equal(getWarRoomInteriorStyle(8).name, "barracks");
  assert.equal(getWarRoomInteriorStyle(-1).name, "storehouse-south");
  assert.equal(getWarRoomInteriorStyle(2.8).name, "storehouse");
});
