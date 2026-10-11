import assert from "node:assert/strict";
import test from "node:test";
import { appendWorldDiagnostic, formatWorldDiagnostics } from "./world-diagnostics.ts";

test("world diagnostics retain only the newest twenty entries and copy as plain text", () => {
  const events = Array.from({ length: 22 }, (_, index) => ({
    at: `00:${String(index).padStart(2, "0")}`,
    category: "render",
    message: `event-${index}`,
  })).reduce((current, event) => appendWorldDiagnostic(current, event), []);

  assert.equal(events.length, 20);
  assert.equal(events[0].message, "event-2");
  assert.equal(events[19].message, "event-21");
  assert.match(formatWorldDiagnostics(events), /^\[00:02\] render: event-2/);
  assert.match(formatWorldDiagnostics(events), /\[00:21\] render: event-21$/);
});
