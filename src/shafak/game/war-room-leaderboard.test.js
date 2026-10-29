import assert from "node:assert/strict";
import test from "node:test";
import { createWarRoomLeaderboard } from "./war-room-leaderboard.ts";

test("the defeat leaderboard includes every character and keeps repeated names distinct", () => {
  const rows = createWarRoomLeaderboard("Kale Nöbetçisi", "defeat", 1, 1, [
    { id: "guard-1", name: "Kale Nöbetçisi", commander: false, alive: true, score: 34 },
    { id: "guard-2", name: "Kale Nöbetçisi", commander: false, alive: false, score: 92 },
    { id: "commander", name: "Komutan", commander: true, alive: true, score: 66 },
  ]);

  assert.equal(rows.length, 4);
  assert.equal(new Set(rows.map(({ name }) => name)).size, 4);
  assert.ok(rows.some(({ name, status }) => name === "Kale Nöbetçisi · 1" && status === "YENİLDİ"));
  assert.ok(rows.some(({ name, status }) => name === "Kale Nöbetçisi · 2" && status === "HAYATTA"));
  assert.ok(rows.some(({ name, status }) => name === "Kale Nöbetçisi · 3" && status === "ELENDİ"));
  assert.deepEqual(rows.map(({ rank }) => rank), [1, 2, 3, 4]);
  assert.equal(rows.find(({ role }) => role === "KOMUTAN")?.name, "Komutan");
});

test("leaderboard scores are match-local and order higher combat scores first", () => {
  const rows = createWarRoomLeaderboard("Ada", "victory", 3, 2, [
    { id: "guard", name: "Muhafız", commander: false, alive: false, score: 125 },
    { id: "commander", name: "Komutan", commander: true, alive: false, score: 250 },
  ]);

  assert.deepEqual(rows.map(({ name }) => name), ["Ada", "Komutan", "Muhafız"]);
  assert.deepEqual(rows.map(({ score }) => score), [350, 250, 125]);
  assert.equal(rows[0].status, "ZAFER");
});
