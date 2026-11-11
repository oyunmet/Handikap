import assert from "node:assert/strict";
import test from "node:test";
import {
  getWarRoomBossAttack,
  getWarRoomBossPhase,
  getWarRoomBossTelegraphSeconds,
} from "./war-room-boss.ts";

test("commander health moves through three stable combat phases", () => {
  assert.equal(getWarRoomBossPhase(100, 100), 1);
  assert.equal(getWarRoomBossPhase(67, 100), 1);
  assert.equal(getWarRoomBossPhase(66, 100), 2);
  assert.equal(getWarRoomBossPhase(34, 100), 2);
  assert.equal(getWarRoomBossPhase(33, 100), 3);
  assert.equal(getWarRoomBossPhase(0, 100), 3);
});

test("all six map commanders use distinct phase-two and phase-three attacks", () => {
  const profiles = [
    ["stone-courtyard", "charge", "shockwave"],
    ["ember-gate", "summon", "charge"],
    ["frost-bastion", "shockwave", "summon"],
    ["black-rampart", "charge", "summon"],
    ["sunken-keep", "summon", "shockwave"],
    ["moonlit-citadel", "shockwave", "charge"],
  ];

  for (const [mapId, phaseTwo, phaseThree] of profiles) {
    assert.equal(getWarRoomBossAttack(mapId, 2), phaseTwo);
    assert.equal(getWarRoomBossAttack(mapId, 3), phaseThree);
  }
  assert.equal(new Set(profiles.map(([, phaseTwo, phaseThree]) => `${phaseTwo}:${phaseThree}`)).size, 6);
});

test("every special attack gives players a visible warning window", () => {
  for (const attack of ["charge", "summon", "shockwave"]) {
    assert.ok(getWarRoomBossTelegraphSeconds(attack) >= 0.8);
  }
});
