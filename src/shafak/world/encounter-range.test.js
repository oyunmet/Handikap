import assert from "node:assert/strict";
import test from "node:test";
import { getEncounterRangeState, WORLD_ENCOUNTER_CARD_RANGE_METERS } from "./encounter-range.ts";

test("the encounter card and fight action stay available together at all rival distances", () => {
  for (const name of ["Kül Okçusu", "Demir Yemin", "Gölge Şövalyesi"]) {
    assert.deepEqual(getEncounterRangeState(21), { visible: true, canChallenge: true }, name);
    assert.deepEqual(getEncounterRangeState(8), { visible: true, canChallenge: true }, name);
  }
});

test("encounter actions disappear only when the encounter card is outside its visible range", () => {
  assert.deepEqual(
    getEncounterRangeState(WORLD_ENCOUNTER_CARD_RANGE_METERS),
    { visible: true, canChallenge: true },
  );
  assert.deepEqual(getEncounterRangeState(WORLD_ENCOUNTER_CARD_RANGE_METERS + 0.01), {
    visible: false,
    canChallenge: false,
  });
  assert.deepEqual(getEncounterRangeState(Number.NaN), { visible: false, canChallenge: false });
  assert.deepEqual(getEncounterRangeState(Number.POSITIVE_INFINITY), { visible: false, canChallenge: false });
});
