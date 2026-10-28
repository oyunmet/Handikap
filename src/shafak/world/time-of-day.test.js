import assert from "node:assert/strict";
import test from "node:test";
import {
  TIME_OF_DAY_CYCLE_MS,
  TIME_OF_DAY_STAR_COUNT,
  getNextTimeOfDayMode,
  getCurrentTimeOfDayMode,
  getTimeOfDayDaylight,
  getTimeOfDayLightingState,
  getTimeOfDayModeOverride,
  getTimeOfDayPhase,
  getTimeOfDaySunAltitude,
  getTimeOfDayTwilight,
  resolveTimeOfDayMode,
  setCurrentTimeOfDayMode,
} from "./time-of-day.ts";

test("automatic sky cycles through day, sunset, night, and dawn in six minutes", () => {
  assert.equal(TIME_OF_DAY_CYCLE_MS, 360_000);
  assert.equal(getTimeOfDayPhase(0, "auto"), 0);
  assert.equal(getTimeOfDayPhase(90_000, "auto"), 0.25);
  assert.equal(getTimeOfDayPhase(180_000, "auto"), 0.5);
  assert.equal(getTimeOfDayPhase(270_000, "auto"), 0.75);
  assert.equal(getTimeOfDayPhase(360_000, "auto"), 0);
});

test("manual sky modes select stable phases and URL overrides take precedence", () => {
  assert.equal(getTimeOfDayPhase(2_000, "day"), 0.04);
  assert.equal(getTimeOfDayPhase(2_000, "sunset"), 0.25);
  assert.equal(getTimeOfDayPhase(2_000, "night"), 0.5);
  assert.equal(getTimeOfDayModeOverride("?time=gece"), "night");
  assert.equal(getTimeOfDayModeOverride("?time=gunbatimi"), "sunset");
  assert.equal(getTimeOfDayModeOverride("?time=unknown"), null);
  assert.equal(resolveTimeOfDayMode("?time=gece", "day"), "night");
  assert.equal(resolveTimeOfDayMode("", "sunset"), "sunset");
});

test("the time control cycles between the automatic clock, day, and night", () => {
  assert.equal(getNextTimeOfDayMode("auto"), "day");
  assert.equal(getNextTimeOfDayMode("day"), "night");
  assert.equal(getNextTimeOfDayMode("night"), "auto");
  assert.equal(getNextTimeOfDayMode("sunset"), "auto");
});

test("daylight and twilight are smooth through sunset and sunrise", () => {
  assert.ok(getTimeOfDayDaylight(0) > 0.99);
  assert.ok(getTimeOfDayDaylight(0.5) < 0.01);
  assert.ok(Math.abs(getTimeOfDayDaylight(0.249) - getTimeOfDayDaylight(0.251)) < 0.02);
  assert.ok(getTimeOfDayTwilight(0.25) > 0.99);
  assert.ok(getTimeOfDayTwilight(0.75) > 0.99);
  assert.equal(getTimeOfDaySunAltitude(0), 1);
  assert.equal(getTimeOfDaySunAltitude(0.5), -1);
});

test("shared lighting state keeps the sun direction normalized and fog finite", () => {
  assert.equal(TIME_OF_DAY_STAR_COUNT, 120);
  for (const phase of [0, 0.25, 0.5, 0.75, 1]) {
    const state = getTimeOfDayLightingState(phase);
    const length = Math.hypot(
      state.sunDirection.x,
      state.sunDirection.y,
      state.sunDirection.z,
    );
    assert.ok(Math.abs(length - 1) < 1e-9);
    assert.ok(Object.values(state.fogColor).every(Number.isFinite));
  }
  assert.ok(getTimeOfDayLightingState(0.5).sunDirection.y < 0);
  assert.ok(getTimeOfDayLightingState(Number.NaN).sunDirection.y > 0);
});

test("automatic time is the default and night keeps a readable minimum light level", () => {
  assert.equal(getCurrentTimeOfDayMode(), "auto");
  const night = getTimeOfDayLightingState(getTimeOfDayPhase(0, "night"));
  const day = getTimeOfDayLightingState(getTimeOfDayPhase(0, "day"));
  assert.ok(night.lightScale.directional >= 0.8);
  assert.ok(night.lightScale.hemisphere >= 0.9);
  assert.ok(night.lightScale.ambient >= 0.92);
  assert.ok(day.lightScale.directional > 0.98);
  assert.ok(day.lightScale.hemisphere > 0.98);
  assert.ok(day.lightScale.ambient > 0.98);
  assert.equal(setCurrentTimeOfDayMode("night"), "night");
  assert.equal(getCurrentTimeOfDayMode(), "night");
  setCurrentTimeOfDayMode("day");
});
