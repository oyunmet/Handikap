import assert from "node:assert/strict";
import test from "node:test";
import { WAR_ROOM_MODEL_URLS } from "./WarRoomModels.tsx";

test("War Room briefing preloads the player and arena, not every weapon GLB", () => {
  assert.ok(WAR_ROOM_MODEL_URLS.includes("/models/player-hero.glb"));
  assert.ok(WAR_ROOM_MODEL_URLS.some((url) => url.startsWith("/models/war-room/")));
  assert.equal(WAR_ROOM_MODEL_URLS.some((url) => url.startsWith("/models/weapons/")), false);
});
