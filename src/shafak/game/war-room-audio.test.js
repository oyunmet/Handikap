import assert from "node:assert/strict";
import test from "node:test";
import {
  getWarRoomSoundProfile,
  getWarRoomPitchVariation,
  getWarRoomSpatialAudioMix,
  WAR_ROOM_AUDIO_VOICE_LIMIT,
} from "./war-room-audio.ts";

test("melee sound profiles distinguish light and heavy filtered swipes", () => {
  const light = getWarRoomSoundProfile("melee-swing");
  const heavy = getWarRoomSoundProfile("melee-swing", { heavy: true });

  assert.ok(heavy.duration > light.duration);
  assert.ok(heavy.cutoffStart < light.cutoffStart);
  assert.ok(heavy.noiseGain > light.noiseGain);
});

test("impact and footstep sound profiles vary by surface", () => {
  const flesh = getWarRoomSoundProfile("melee-hit", { surface: "flesh" });
  const metal = getWarRoomSoundProfile("melee-hit", { surface: "metal" });
  const stoneFootstep = getWarRoomSoundProfile("footstep", { surface: "stone" });
  const earthFootstep = getWarRoomSoundProfile("footstep", { surface: "earth" });

  assert.notEqual(flesh.frequencyStart, metal.frequencyStart);
  assert.notEqual(stoneFootstep.cutoffStart, earthFootstep.cutoffStart);
});

test("spatial sound attenuates with distance and pans toward the source", () => {
  const nearbyRight = getWarRoomSpatialAudioMix(3, 0, 0, 0, 0);
  const distantRight = getWarRoomSpatialAudioMix(18, 0, 0, 0, 0);

  assert.equal(nearbyRight.pan, 1);
  assert.ok(nearbyRight.attenuation > distantRight.attenuation);
  assert.equal(WAR_ROOM_AUDIO_VOICE_LIMIT, 4);
});

test("sound pitch variation stays within the intended restrained range", () => {
  assert.equal(getWarRoomPitchVariation(0), 0.94);
  assert.equal(getWarRoomPitchVariation(1), 1.06);
  assert.equal(getWarRoomPitchVariation(Number.NaN), 1);
});
