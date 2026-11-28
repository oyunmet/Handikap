import test from "node:test";
import assert from "node:assert/strict";
import { createWarRoomRuntime } from "./war-room-engine.ts";
import {
  buildWarRoomHudSnapshot,
  createEmptyWarRoomHudSnapshot,
  createWarRoomInputState,
  resolveWarRoomSimulationOutcome,
} from "./war-room-simulation.ts";

test("input state starts neutral and preserves the selected aim-assist preference", () => {
  const enabled = createWarRoomInputState(true);
  const disabled = createWarRoomInputState(false);

  assert.equal(enabled.aimAssistEnabled, true);
  assert.equal(disabled.aimAssistEnabled, false);
  assert.equal(enabled.moveX, 0);
  assert.equal(enabled.moveY, 0);
  assert.equal(enabled.fireHeld, false);
  assert.equal(enabled.paused, false);
  assert.deepEqual([...enabled.keys], []);
});

test("empty HUD snapshots have independent collection state", () => {
  const first = createEmptyWarRoomHudSnapshot();
  const second = createEmptyWarRoomHudSnapshot();
  first.enemies.push({
    id: "test",
    x: 0,
    z: 0,
    floorHeight: 0,
    alive: true,
    commander: false,
  });
  first.killFeed.push({ id: 1, text: "test" });

  assert.equal(second.enemies.length, 0);
  assert.equal(second.killFeed.length, 0);
  assert.equal(second.remaining, 9);
});

test("HUD projection exposes a detached, time-bounded view of the tactical runtime", () => {
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"], 0, 1, 41);
  const input = createWarRoomInputState();
  runtime.player.startTime = 1;
  runtime.player.hp = 120;
  runtime.player.armor = 20;
  runtime.player.hitMarkerUntil = 5;
  runtime.player.hitMarkerHeadshot = true;
  runtime.player.shotFeedbackUntil = 5;
  runtime.player.lastDamageAt = 2.8;
  runtime.player.damageEventId = 6;
  runtime.player.killFeed.push({ id: 1, text: "Muhafız etkisiz" });
  runtime.healingPoints[0].availableAt = 9;
  input.aimHeld = true;

  const snapshot = buildWarRoomHudSnapshot(runtime, 3, input);

  assert.equal(snapshot.mission.mode, "raid");
  assert.equal(snapshot.player.hp, 120);
  assert.equal(snapshot.player.armor, 20);
  assert.equal(snapshot.remaining, runtime.enemies.filter((enemy) => enemy.alive).length);
  assert.equal(snapshot.elapsedSeconds, 2);
  assert.equal(snapshot.weaponId, "powder_rifle");
  assert.equal(snapshot.aiming, true);
  assert.equal(snapshot.hitMarker, true);
  assert.equal(snapshot.headshotMarker, true);
  assert.equal(snapshot.firing, true);
  assert.equal(snapshot.damageVignette, true);
  assert.equal(snapshot.damageEventId, 6);
  assert.equal(snapshot.healingPoints[0]?.available, false);
  assert.notEqual(snapshot.enemies, runtime.enemies);
  assert.notEqual(snapshot.killFeed, runtime.player.killFeed);
  assert.deepEqual(snapshot.killFeed, [{ id: 1, text: "Muhafız etkisiz" }]);

  snapshot.killFeed[0].text = "değiştirildi";
  assert.equal(runtime.player.killFeed[0].text, "Muhafız etkisiz");
});

test("HUD projection clears expired hit feedback and handles empty ammunition", () => {
  const runtime = createWarRoomRuntime(["knife", "crossbow"], 0, 1, 12);
  const input = createWarRoomInputState();
  runtime.player.activeSlot = 0;
  runtime.player.hitMarkerUntil = 1;
  runtime.player.shotFeedbackUntil = 1;
  runtime.player.lastDamageAt = 1;
  runtime.player.meleeUntil = 10;
  runtime.player.meleeStartedAt = 0;
  runtime.player.meleeDuration = 10;

  const snapshot = buildWarRoomHudSnapshot(runtime, 5, input);

  assert.equal(snapshot.weaponId, "knife");
  assert.equal(snapshot.magazine, 0);
  assert.equal(snapshot.reserve, 0);
  assert.equal(snapshot.hitMarker, false);
  assert.equal(snapshot.firing, false);
  assert.equal(snapshot.damageVignette, false);
  assert.equal(snapshot.meleePhase, "VURUŞ");
});

test("simulation outcome reports victory, wave completion, and player defeat", () => {
  const raid = createWarRoomRuntime(["powder_rifle", "crossbow"], 0, 1, 51);
  raid.enemies.forEach((enemy) => { enemy.alive = false; });
  assert.equal(resolveWarRoomSimulationOutcome(raid, 10), "victory");

  const survival = createWarRoomRuntime(
    ["powder_rifle", "crossbow"],
    0,
    1,
    52,
    { mode: "survival", difficulty: "normal", modifiers: [], mapId: "stone-courtyard" },
  );
  survival.enemies.forEach((enemy) => { enemy.alive = false; });
  assert.equal(resolveWarRoomSimulationOutcome(survival, 10), "wave-complete");

  survival.player.hp = 0;
  assert.equal(resolveWarRoomSimulationOutcome(survival, 10), "defeat");
});

test("simulation outcome respects treasure goals, defense health, and time limits", () => {
  const treasure = createWarRoomRuntime(
    ["powder_rifle", "crossbow"],
    0,
    1,
    61,
    { mode: "treasure", difficulty: "normal", modifiers: [], mapId: "stone-courtyard" },
  );
  treasure.mission.targetChests = 1;
  treasure.lootChests[0].opened = true;
  assert.equal(resolveWarRoomSimulationOutcome(treasure, 10), "victory");

  treasure.lootChests[0].opened = false;
  treasure.mission.timeLimitSeconds = 5;
  assert.equal(resolveWarRoomSimulationOutcome(treasure, 6), "defeat");

  const defense = createWarRoomRuntime(
    ["powder_rifle", "crossbow"],
    0,
    1,
    62,
    { mode: "defense", difficulty: "normal", modifiers: [], mapId: "stone-courtyard" },
  );
  defense.mission.defenseHp = 0;
  assert.equal(resolveWarRoomSimulationOutcome(defense, 10), "defeat");
});
