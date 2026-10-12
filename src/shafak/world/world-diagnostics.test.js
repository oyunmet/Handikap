import assert from "node:assert/strict";
import test from "node:test";
import {
  appendWorldDiagnostic,
  appendWorldDiagnostics,
  formatWorldDiagnostics,
} from "./world-diagnostics.ts";

test("world diagnostics retain the newest two hundred entries and format movement context", () => {
  const events = Array.from({ length: 205 }, (_, index) => ({
    at: `00:${String(index).padStart(2, "0")}`,
    category: "render",
    message: `event-${index}`,
    playerState: "koşuyor",
    travelPercent: 53.4,
  })).reduce((current, event) => appendWorldDiagnostic(current, event), []);

  assert.equal(events.length, 200);
  assert.equal(events[0].message, "event-5");
  assert.equal(events[199].message, "event-204");
  assert.match(formatWorldDiagnostics(events), /^\[00:05\] \[durum=koşuyor yol=53\.4%\] render: event-5/);
  assert.match(formatWorldDiagnostics(events), /\[00:204\] \[durum=koşuyor yol=53\.4%\] render: event-204$/);
});

test("batched world diagnostics apply in order and keep the newest entries within the limit", () => {
  const entries = Array.from({ length: 5 }, (_, index) => ({
    at: `2026-10-12T00:00:0${index}.000Z`,
    category: "test",
    message: `event-${index}`,
  }));
  const existing = [entries[0], entries[1]];

  assert.deepEqual(appendWorldDiagnostics(existing, entries.slice(2), 3), entries.slice(2));
  assert.deepEqual(appendWorldDiagnostics(existing, [], 3), existing);
});
