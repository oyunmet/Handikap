import assert from "node:assert/strict";
import test from "node:test";
import {
  getWarRoomWeaponPreloadUrls,
  WAR_ROOM_MODEL_URLS,
} from "./WarRoomModels.tsx";

test("War Room briefing preloads the player and arena, not every weapon GLB", () => {
  assert.ok(WAR_ROOM_MODEL_URLS.includes("/models/player-hero.glb"));
  assert.ok(WAR_ROOM_MODEL_URLS.some((url) => url.startsWith("/models/war-room/")));
  assert.equal(WAR_ROOM_MODEL_URLS.some((url) => url.startsWith("/models/weapons/")), false);
});

test("War Room preloads only the equipped weapon models before the match", () => {
  assert.deepEqual(
    getWarRoomWeaponPreloadUrls(["blaster_a", "melee_knife", "blaster_a"]),
    ["/models/weapons/blaster-a.glb", "/models/weapons/knife.glb"],
  );
  assert.deepEqual(getWarRoomWeaponPreloadUrls(["melee_knife"]), ["/models/weapons/knife.glb"]);
});
