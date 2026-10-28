import assert from "node:assert/strict";
import test from "node:test";
import {
  TIME_OF_DAY_CYCLE_MS,
  getTimeOfDayDaylight,
  getTimeOfDayModeOverride,
  getTimeOfDayPhase,
  getTimeOfDaySunAltitude,
  getTimeOfDayTwilight,
  resolveTimeOfDayMode,
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

test("daylight and twilight are smooth through sunset and sunrise", () => {
  assert.ok(getTimeOfDayDaylight(0) > 0.99);
  assert.ok(getTimeOfDayDaylight(0.5) < 0.01);
  assert.ok(Math.abs(getTimeOfDayDaylight(0.249) - getTimeOfDayDaylight(0.251)) < 0.02);
  assert.ok(getTimeOfDayTwilight(0.25) > 0.99);
  assert.ok(getTimeOfDayTwilight(0.75) > 0.99);
  assert.equal(getTimeOfDaySunAltitude(0), 1);
  assert.equal(getTimeOfDaySunAltitude(0.5), -1);
});
