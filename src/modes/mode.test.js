import assert from "node:assert/strict";
import test from "node:test";
import {
  GAME_MODES,
  gameModeForWarRoomMission,
  modeFromLegacyScreen,
} from "./mode.ts";

test("the shared mode registry separates War Room arena and defense activities", () => {
  assert.deepEqual(GAME_MODES, ["hub", "expedition", "arena", "defense"]);
  assert.equal(gameModeForWarRoomMission("raid"), "arena");
  assert.equal(gameModeForWarRoomMission("treasure"), "arena");
  assert.equal(gameModeForWarRoomMission("daily"), "arena");
  assert.equal(gameModeForWarRoomMission("survival"), "defense");
  assert.equal(gameModeForWarRoomMission("defense"), "defense");
});

test("legacy scene routing retains the active War Room mode", () => {
  assert.equal(modeFromLegacyScreen("world"), "expedition");
  assert.equal(modeFromLegacyScreen("war-room"), "arena");
  assert.equal(modeFromLegacyScreen("war-room", "defense"), "defense");
  assert.equal(modeFromLegacyScreen("city-hub"), "hub");
});
