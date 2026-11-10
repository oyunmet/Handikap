import assert from "node:assert/strict";
import test from "node:test";
import { shouldOpenWorldV2Gate } from "./world-v2-gate-state.ts";
import { CAMPAIGN_CHAPTER_COUNT } from "./campaign-progression.ts";

test("campaign gates open on approach and stay open until the player clears them", () => {
  assert.equal(shouldOpenWorldV2Gate(8, 2, 2, 6.8), false, "locked gates stay shut");
  assert.equal(shouldOpenWorldV2Gate(12, 2, 3, 6.8), false, "gates do not open twelve metres early");
  assert.equal(shouldOpenWorldV2Gate(3.01, 2, 3, 6.8), false, "the approach range stays compact");
  assert.equal(shouldOpenWorldV2Gate(3, 2, 3, 6.8), true, "an unlocked gate opens in the direction of travel");
  assert.equal(shouldOpenWorldV2Gate(2.5, 2, 3, -6.8), false, "a player moving away does not trigger an approach");
  assert.equal(shouldOpenWorldV2Gate(0.5, 2, 3, 0), true, "a player stopped in the doorway keeps it open");
  assert.equal(shouldOpenWorldV2Gate(-2.5, 2, 3, 6.8), true, "the gate stays open until the player clears it");
  assert.equal(shouldOpenWorldV2Gate(-3.01, 2, 3, 6.8), false, "the gate closes only after the player has cleared it");
  assert.equal(shouldOpenWorldV2Gate(-3, 2, 3, -6.8), true, "a reverse approach also opens the gate");
  assert.equal(shouldOpenWorldV2Gate(Number.NaN, 2, 3, 1), false, "invalid positions cannot animate doors open");
});

test("all 450 campaign gate positions use the same proximity and passage-clearance rules", () => {
  for (let chapter = 0; chapter < CAMPAIGN_CHAPTER_COUNT; chapter += 1) {
    assert.equal(
      shouldOpenWorldV2Gate(2.5, chapter, chapter, 6.8),
      false,
      `locked campaign gate ${chapter + 1} must remain closed`,
    );
    assert.equal(
      shouldOpenWorldV2Gate(2.5, chapter, chapter + 1, 6.8),
      true,
      `unlocked campaign gate ${chapter + 1} must open on approach`,
    );
    assert.equal(
      shouldOpenWorldV2Gate(0.5, chapter, chapter + 1, 0),
      true,
      `campaign gate ${chapter + 1} must stay open while the player pauses in it`,
    );
    assert.equal(
      shouldOpenWorldV2Gate(-2.5, chapter, chapter + 1, 6.8),
      true,
      `campaign gate ${chapter + 1} must stay open while the player passes through`,
    );
    assert.equal(
      shouldOpenWorldV2Gate(-2.81, chapter, chapter + 1, 6.8),
      false,
      `campaign gate ${chapter + 1} may close after the player clears it`,
    );
  }
});
