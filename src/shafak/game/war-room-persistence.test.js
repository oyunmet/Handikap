import test from "node:test";
import assert from "node:assert/strict";
import {
  WAR_ROOM_STORAGE_KEYS,
  readWarRoomDailyCompletionDayKey,
  readWarRoomRoomProgress,
  recordWarRoomGold,
  writeWarRoomDailyCompletionDayKey,
  writeWarRoomRoomProgress,
} from "./war-room-persistence.ts";

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    values,
  };
}

test("War Room persistence retains existing versioned storage keys", () => {
  assert.deepEqual(WAR_ROOM_STORAGE_KEYS, {
    gold: "shafak-war-room-gold-v1",
    roomProgress: "shafak-war-room-room-progress-v1",
    dailyCompletion: "shafak-war-room-daily-completed-v1",
  });
});

test("room progress loads and saves through the legacy-compatible payload", () => {
  const storage = createStorage({
    [WAR_ROOM_STORAGE_KEYS.roomProgress]: JSON.stringify({
      highestRoom: 8,
      totalRoomRewards: 240,
    }),
  });

  assert.deepEqual(readWarRoomRoomProgress(storage), {
    highestRoom: 8,
    totalRoomRewards: 240,
  });
  writeWarRoomRoomProgress(storage, { highestRoom: 9, totalRoomRewards: 275 });
  assert.deepEqual(
    JSON.parse(storage.values.get(WAR_ROOM_STORAGE_KEYS.roomProgress)),
    { highestRoom: 9, totalRoomRewards: 275 },
  );
});

test("missing, malformed, or unavailable room progress recovers to safe defaults", () => {
  assert.deepEqual(readWarRoomRoomProgress(null), {
    highestRoom: 0,
    totalRoomRewards: 0,
  });
  const storage = createStorage({
    [WAR_ROOM_STORAGE_KEYS.roomProgress]: "{broken",
  });
  assert.deepEqual(readWarRoomRoomProgress(storage), {
    highestRoom: 0,
    totalRoomRewards: 0,
  });
});

test("local War Room gold adds to the saved balance and handles corrupted values", () => {
  const storage = createStorage({ [WAR_ROOM_STORAGE_KEYS.gold]: "40" });
  assert.equal(recordWarRoomGold(storage, 15), 55);
  assert.equal(storage.values.get(WAR_ROOM_STORAGE_KEYS.gold), "55");

  storage.values.set(WAR_ROOM_STORAGE_KEYS.gold, "bad");
  assert.equal(recordWarRoomGold(storage, 5), 5);
  assert.equal(recordWarRoomGold(null, 5), null);
});

test("daily completion keeps its existing key and tolerates unavailable storage", () => {
  const storage = createStorage();
  assert.equal(readWarRoomDailyCompletionDayKey(storage), null);
  writeWarRoomDailyCompletionDayKey(storage, "2026-11-28");
  assert.equal(readWarRoomDailyCompletionDayKey(storage), "2026-11-28");
  assert.equal(readWarRoomDailyCompletionDayKey(null), null);
});
