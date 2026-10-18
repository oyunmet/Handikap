import assert from "node:assert/strict";
import test from "node:test";
import { WORLD_GATE_INTERVAL_METERS, WORLD_ROAD_WIDTH } from "./movement.ts";
import {
  createWorldChunk,
  getMinimumWorldSceneryAxisOffset,
  WORLD_SCENERY_LATERAL_SCALE,
} from "./world-generation.ts";
import { getWorldChapter, MAX_CHAPTER_ID } from "./world-content.ts";

test("every supported chapter keeps its full virtual walk and camera corridor clear", { timeout: 180_000 }, () => {
  const roadHalfWidth = WORLD_ROAD_WIDTH / 2;
  const expectedChunksPerChapter = WORLD_GATE_INTERVAL_METERS / 48;
  assert.equal(expectedChunksPerChapter, 3);

  for (let chapterId = 0; chapterId <= MAX_CHAPTER_ID; chapterId += 1) {
    const chapterStart = chapterId * WORLD_GATE_INTERVAL_METERS;
    const chapterEnd = chapterStart + WORLD_GATE_INTERVAL_METERS;
    const content = getWorldChapter(chapterId);
    assert.equal(content.rivals.length, 5, `chapter ${chapterId + 1}: five stable encounters`);
    assert.equal(content.rivals[4].isBoss, true, `chapter ${chapterId + 1}: final encounter is the boss`);
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
