import test from "node:test";
import assert from "node:assert/strict";
import { createWarRoomRuntime } from "./war-room-engine.ts";
import {
  advanceWarRoomPlayerVerticalMotion,
  advanceWarRoomPlayerMovement,
  buildWarRoomHudSnapshot,
  createEmptyWarRoomHudSnapshot,
  createWarRoomInputState,
  consumeWarRoomActionInputs,
  resolveWarRoomSimulationOutcome,
  updateWarRoomPlayerFloor,
} from "./war-room-simulation.ts";
import { createWarRoomMovementClock } from "./war-room-fixed-movement.ts";

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

test("action input consumes stance, weapon, and swap requests with existing resets", () => {
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"], 0, 1, 71);
  const input = createWarRoomInputState();
  const context = {
    now: 4,
    moveX: 0,
    moveY: 0,
    forwardX: 0,
    forwardZ: -1,
    rightX: 1,
    rightZ: 0,
    weaponSlotCount: 2,
  };

  input.pronePressed = true;
  consumeWarRoomActionInputs(runtime, input, context);
  assert.equal(runtime.player.prone, true);
  assert.equal(runtime.player.crouched, true);
  assert.equal(input.pronePressed, false);

  input.crouchPressed = true;
  consumeWarRoomActionInputs(runtime, input, context);
  assert.equal(runtime.player.prone, false);
  assert.equal(runtime.player.crouched, false);

  runtime.player.reloadingWeapon = "powder_rifle";
  runtime.player.reloadUntil = 8;
  runtime.player.meleeInputPending = true;
  runtime.player.meleeComboIndex = 2;
  runtime.player.meleeComboCount = 2;
  input.weaponSlotPressed = 1;
  consumeWarRoomActionInputs(runtime, input, context);
  assert.equal(runtime.player.activeSlot, 1);
  assert.equal(runtime.player.reloadingWeapon, null);
  assert.equal(runtime.player.reloadUntil, 0);
  assert.equal(runtime.player.meleeInputPending, false);
  assert.equal(runtime.player.meleeComboIndex, 0);
  assert.equal(runtime.player.meleeComboCount, 0);
  assert.equal(input.weaponSlotPressed, null);

  input.swapPressed = true;
  consumeWarRoomActionInputs(runtime, input, context);
  assert.equal(runtime.player.activeSlot, 0);
  assert.equal(input.swapPressed, false);
});

test("jump and dodge inputs use grounded state, stamina, and camera-relative direction", () => {
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"], 0, 1, 72);
  const input = createWarRoomInputState();
  const context = {
    now: 7,
    moveX: 1,
    moveY: 0,
    forwardX: 0,
    forwardZ: -1,
    rightX: 1,
    rightZ: 0,
    weaponSlotCount: 2,
  };

  input.jumpPressed = true;
  input.dodgePressed = true;
  consumeWarRoomActionInputs(runtime, input, context);
  assert.equal(runtime.player.jumpVelocity, 5.4);
  assert.equal(runtime.player.dodgeX, 1);
  assert.equal(runtime.player.dodgeZ, 0);
  assert.equal(runtime.player.stamina, 82);
  assert.equal(runtime.player.dodgeUntil, 7.26);
  assert.equal(runtime.player.invulnerableUntil, 7.18);
  assert.equal(input.jumpPressed, false);
  assert.equal(input.dodgePressed, false);

  runtime.player.jumpHeight = 0.5;
  runtime.player.stamina = 17;
  input.jumpPressed = true;
  input.dodgePressed = true;
  consumeWarRoomActionInputs(runtime, input, context);
  assert.equal(runtime.player.jumpVelocity, 5.4);
  assert.equal(runtime.player.stamina, 17);
  assert.equal(runtime.player.dodgeUntil, 7.26);
  assert.equal(input.jumpPressed, false);
  assert.equal(input.dodgePressed, false);
});

test("player movement step updates runtime and returns independent render interpolation", () => {
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"], 0, 1, 81);
  runtime.player.x = 0;
  runtime.player.z = 0;
  const clock = createWarRoomMovementClock(0, 0);
  const intent = {
    velocityX: 6,
    velocityZ: 0,
    now: 1,
    blockers: [],
    radius: 0,
  };

  const first = advanceWarRoomPlayerMovement(
    runtime,
    clock,
    intent,
    { steps: 1, alpha: 0, droppedSeconds: 0 },
  );

  assert.ok(first.x > 0);
  assert.equal(first.z, 0);
  assert.equal(first.previousX, 0);
  assert.equal(first.deltaX, first.x);
  assert.equal(runtime.player.x, first.x);
  assert.equal(first.renderX, 0);

  const second = advanceWarRoomPlayerMovement(
    runtime,
    clock,
    { ...intent, now: 1.01 },
    { steps: 1, alpha: 0.5, droppedSeconds: 0 },
  );

  assert.ok(second.x > first.x);
  assert.equal(runtime.player.x, second.x);
  assert.ok(second.renderX > first.renderX);
  assert.ok(second.renderX < second.x);
});

test("vertical simulation advances a jump and reports a clean landing", () => {
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"], 0, 1, 91);
  runtime.player.jumpVelocity = 5.4;

  let landing = null;
  for (let frame = 1; frame <= 120; frame += 1) {
    updateWarRoomPlayerFloor(runtime);
    const step = advanceWarRoomPlayerVerticalMotion(runtime, 1 / 60, frame / 60);
    if (step.landed) {
      landing = step;
      break;
    }
  }

  assert.deepEqual(landing, { landed: true, fallDamage: 0, healthDamage: 0 });
  assert.equal(runtime.player.jumpHeight, 0);
  assert.equal(runtime.player.jumpVelocity, 0);
  assert.equal(runtime.player.previousJumpHeight, 0);
  assert.equal(runtime.player.jumpWasAirborne, false);
  assert.equal(runtime.player.fallStartHeight, null);
  assert.equal(runtime.player.hp, runtime.player.maxHp);
});

test("vertical simulation records an upper-floor fall and applies damage once", () => {
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"], 0, 1, 92);
  runtime.player.x = 1_000;
  runtime.player.z = 1_000;
  runtime.player.floorHeight = 3;
  runtime.player.hp = 200;

  let landing = null;
  let landingAt = 0;
  for (let frame = 1; frame <= 120; frame += 1) {
    updateWarRoomPlayerFloor(runtime);
    const step = advanceWarRoomPlayerVerticalMotion(runtime, 1 / 60, frame / 60);
    if (step.landed) {
      landing = step;
      landingAt = frame / 60;
      break;
    }
  }

  assert.deepEqual(landing, { landed: true, fallDamage: 8, healthDamage: 8 });
  assert.equal(runtime.player.floorHeight, 0);
  assert.equal(runtime.player.jumpHeight, 0);
  assert.equal(runtime.player.fallStartHeight, null);
  assert.equal(runtime.player.hp, 192);
  assert.equal(runtime.player.lastDamageAt, landingAt);
  assert.equal(runtime.player.lastHitDamage, 8);
  assert.equal(runtime.player.lastHitText, "−8 CAN · DÜŞME");
  assert.equal(runtime.player.lastHitSource, "received");
  assert.equal(runtime.player.damageEventId, 1);
});
