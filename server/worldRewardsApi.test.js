import assert from "node:assert/strict";
import test from "node:test";
import { validatePickupClaimBody } from "./worldRewardsApi.ts";
import { getWorldChapter } from "../src/shafak/world/world-content.ts";

test("pickup claim body contains IDs and server-calculated rewards only", () => {
  const chapter = getWorldChapter(0);
  const body = { chapterId: 0, pickupIds: [chapter.pickups[0].id, chapter.pickups[1].id] };
  const validated = validatePickupClaimBody(body);
  assert.equal(validated?.chapterId, 0);
  assert.deepEqual(validated?.pickups, [chapter.pickups[0], chapter.pickups[1]]);
  assert.equal(validated?.reward.gold, chapter.pickups.slice(0, 2).reduce((sum, pickup) => sum + (pickup.kind.startsWith("gold") ? pickup.amount : 0), 0));
});

test("pickup claim rejects client rewards, duplicates, and invalid or oversized ID batches", () => {
  const chapter = getWorldChapter(0);
  const id = chapter.pickups[0].id;
  assert.equal(validatePickupClaimBody({ chapterId: 0, pickupIds: [id], rewards: { gold: 999999 } }), null);
  assert.equal(validatePickupClaimBody({ chapterId: 0, pickupIds: [id, id] }), null);
  assert.equal(validatePickupClaimBody({ chapterId: 0, pickupIds: ["ash-road:1:pickup:0"] }), null);
  assert.equal(validatePickupClaimBody({ chapterId: 0, pickupIds: Array(15).fill(id) }), null);
  assert.equal(validatePickupClaimBody({ chapterId: -1, pickupIds: [id] }), null);
});
