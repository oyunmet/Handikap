import test from "node:test";
import assert from "node:assert/strict";
import { transitionWarRoomPhase } from "./war-room-session.ts";

test("a briefing can start a battle", () => {
  assert.equal(transitionWarRoomPhase("briefing", { type: "start" }), "battle");
});

test("victory and defeat results can start the next battle", () => {
  assert.equal(transitionWarRoomPhase("victory", { type: "start" }), "battle");
  assert.equal(transitionWarRoomPhase("defeat", { type: "start" }), "battle");
});

test("results only resolve from an active battle", () => {
  assert.equal(
    transitionWarRoomPhase("battle", { type: "finish", result: "victory" }),
    "victory",
  );
  assert.equal(
    transitionWarRoomPhase("battle", { type: "finish", result: "defeat" }),
    "defeat",
  );
  assert.equal(
    transitionWarRoomPhase("briefing", { type: "finish", result: "victory" }),
    "briefing",
  );
});

test("returning to briefing clears any prior phase", () => {
  for (const phase of ["briefing", "battle", "victory", "defeat"]) {
    assert.equal(
      transitionWarRoomPhase(phase, { type: "return-to-briefing" }),
      "briefing",
    );
  }
});
