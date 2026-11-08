import assert from "node:assert/strict";
import test from "node:test";
import { WORLD_GATE_INTERVAL_METERS, WORLD_ROAD_WIDTH } from "./movement.ts";
import {
  CAMPAIGN_CHAPTER_COUNT,
  FINAL_CAMPAIGN_CHAPTER_ID,
  getCampaignRivalCount,
} from "./campaign-progression.ts";
import { createCombatOpponentTuning } from "../game/combat-engine.ts";
import {
  createWorldChunk,
  getMinimumWorldSceneryAxisOffset,
  WORLD_SCENERY_LATERAL_SCALE,
} from "./world-generation.ts";
import { getWorldChapter, MAX_CHAPTER_ID } from "./world-content.ts";

test("campaign and boundary chapters keep their virtual walk and camera corridor clear", () => {
  const roadHalfWidth = WORLD_ROAD_WIDTH / 2;
  const expectedChunksPerChapter = WORLD_GATE_INTERVAL_METERS / 48;
  assert.equal(expectedChunksPerChapter, 3);

  const chaptersToCheck = [
    ...Array.from({ length: CAMPAIGN_CHAPTER_COUNT }, (_, chapterId) => chapterId),
    MAX_CHAPTER_ID,
  ];
  for (const chapterId of chaptersToCheck) {
    const chapterStart = chapterId * WORLD_GATE_INTERVAL_METERS;
    const chapterEnd = chapterStart + WORLD_GATE_INTERVAL_METERS;
    const content = getWorldChapter(chapterId);
    assert.equal(
      content.rivals.length,
      getCampaignRivalCount(chapterId),
      `chapter ${chapterId + 1}: campaign encounter count`,
    );
    assert.equal(content.rivals.at(-1)?.isBoss, true, `chapter ${chapterId + 1}: boss remains last`);
    assert.equal(content.rivals.filter((rival) => rival.isBoss).length, 1, `chapter ${chapterId + 1}: one chapter boss`);
    assert.ok(content.obstacles.every((obstacle) =>
      obstacle.distance >= chapterStart && obstacle.distance < chapterEnd,
    ), `chapter ${chapterId + 1}: obstacle remains inside its gate interval`);
    assert.ok(content.pickups.every((pickup) =>
      pickup.distance >= chapterStart && pickup.distance < chapterEnd,
    ), `chapter ${chapterId + 1}: reward remains inside its gate interval`);

    for (let chunkOffset = 0; chunkOffset < expectedChunksPerChapter; chunkOffset += 1) {
      const chunk = createWorldChunk(chapterId * expectedChunksPerChapter + chunkOffset);
      assert.equal(chunk.start, chapterStart + chunkOffset * 48);
      assert.ok(chunk.objects.every((object) => {
        const objectCenterX = Math.abs(object.lane * WORLD_SCENERY_LATERAL_SCALE);
        const minimumCenterX = getMinimumWorldSceneryAxisOffset(object.kind, object.scale);
        return objectCenterX >= minimumCenterX
          && objectCenterX - roadHalfWidth > 0.64
          && object.worldX >= chapterStart
          && object.worldX < chapterEnd;
      }), `chapter ${chapterId + 1}: scenery stays outside the camera sweep`);
    }
  }
});

test("later chapters add rivals and scale the boss level and combat stats", () => {
  const opening = getWorldChapter(0).rivals;
  const finale = getWorldChapter(FINAL_CAMPAIGN_CHAPTER_ID).rivals;
  const openingBoss = opening.at(-1);
  const finalBoss = finale.at(-1);

  assert.ok(openingBoss);
  assert.ok(finalBoss);
  assert.ok(finale.length > opening.length);
  assert.equal(finalBoss.name, "Karanlık Hükümdar");
  assert.ok(finalBoss.level > openingBoss.level);
  assert.equal(finalBoss.difficulty, "hard");
  assert.ok(
    createCombatOpponentTuning(finalBoss.level, finalBoss.progressPercent).statMultiplier
      > createCombatOpponentTuning(openingBoss.level, openingBoss.progressPercent).statMultiplier,
  );
});
