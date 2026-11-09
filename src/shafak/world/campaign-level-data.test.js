import assert from "node:assert/strict";
import test from "node:test";
import {
  getLoadedCampaignActNumbers,
  loadCampaignLevelData,
} from "./campaign-level-data.ts";
import {
  CAMPAIGN_ACT_COUNT,
  CAMPAIGN_LEVEL_COUNT,
  CAMPAIGN_LEVELS_PER_ACT,
} from "./campaign-progression.ts";

test("entering one act loads only that act's compact campaign data", async () => {
  assert.deepEqual(getLoadedCampaignActNumbers(), []);

  const firstLevel = await loadCampaignLevelData(0);

  assert.equal(firstLevel.levelNumber, 1);
  assert.equal(firstLevel.actNumber, 1);
  assert.equal(firstLevel.actName, "Kül Yolu");
  assert.ok(firstLevel.storySummary);
  assert.equal(firstLevel.kind, "normal-combat");
  assert.ok(firstLevel.templateId);
  assert.ok(firstLevel.mapVariant);
  assert.deepEqual(getLoadedCampaignActNumbers(), [1]);
});

test("all 450 generated level definitions have templates and boss milestones in the right places", async () => {
  const levels = await Promise.all(
    Array.from({ length: CAMPAIGN_LEVEL_COUNT }, (_, chapterId) => loadCampaignLevelData(chapterId)),
  );
  const counts = new Map();

  assert.equal(levels.length, CAMPAIGN_ACT_COUNT * CAMPAIGN_LEVELS_PER_ACT);
  assert.equal(new Set(levels.map((level) => level.id)).size, CAMPAIGN_LEVEL_COUNT);
  for (const level of levels) {
    assert.ok(level.actName, `level ${level.levelNumber} has an act`);
    assert.ok(level.templateName, `level ${level.levelNumber} has a template`);
    assert.ok(level.objective, `level ${level.levelNumber} has an objective`);
    assert.ok(level.mapVariant, `level ${level.levelNumber} has a map variant`);
    assert.ok(Number.isSafeInteger(level.parameters.seed));
    counts.set(level.kind, (counts.get(level.kind) ?? 0) + 1);
    if (level.levelNumber % CAMPAIGN_LEVELS_PER_ACT === 0) assert.equal(level.kind, "act-boss");
    else if (level.levelNumber % 10 === 0) assert.equal(level.kind, "mini-boss");
  }

  assert.deepEqual(getLoadedCampaignActNumbers(), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(counts.get("act-boss"), 9);
  assert.equal(counts.get("mini-boss"), 36);
  for (const kind of ["normal-combat", "survival", "target-hunt", "siege", "exploration"]) {
    assert.ok(counts.get(kind) > 0, `campaign includes ${kind}`);
  }
});

test("campaign data rejects level and act requests outside the supported range", async () => {
  await assert.rejects(loadCampaignLevelData(-1), RangeError);
  await assert.rejects(loadCampaignLevelData(CAMPAIGN_LEVEL_COUNT), RangeError);
});
