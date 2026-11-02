import assert from "node:assert/strict";
import test from "node:test";
import { getWarRoomFloorPresentation, getWarRoomMinimapPlayerRotation } from "./war-room-floor-indicator.ts";
import { getWarRoomRoom, getWarRoomBuildingWorldPoint } from "./war-room-rooms.ts";

test("floor indicator distinguishes ground floor, upper floor, stairs, and exterior", () => {
  const building = getWarRoomRoom(1).buildings[0];
  const center = getWarRoomBuildingWorldPoint(building, 0, 0);
  const stairs = getWarRoomBuildingWorldPoint(building, building.stairSide * 4.2, 2.8);

  assert.equal(getWarRoomFloorPresentation([building], center.x, center.z, 0)?.label, "ALT KAT");
  assert.equal(
    getWarRoomFloorPresentation([building], center.x, center.z, building.storyHeight)?.label,
    "ÜST KAT",
  );
  assert.equal(
    getWarRoomFloorPresentation([building], stairs.x, stairs.z, building.storyHeight * 0.5)?.label,
    "MERDİVEN",
  );
  assert.equal(getWarRoomFloorPresentation([building], building.x + 20, building.z, 0), null);
});

test("floor detection follows rotated houses and uses their own story height", () => {
  const source = getWarRoomRoom(1).buildings[0];
  const building = { ...source, rotationY: Math.PI / 2, storyHeight: 3.4 };
  const center = getWarRoomBuildingWorldPoint(building, 0, 0);
  const upstairs = getWarRoomFloorPresentation([building], center.x, center.z, 3.4);

  assert.deepEqual(upstairs, {
    buildingId: building.id,
    floor: 1,
    floorHeight: 3.4,
    label: "ÜST KAT",
  });
});

test("minimap player arrow rotates opposite Three.js yaw on the north-up map", () => {
  assert.equal(getWarRoomMinimapPlayerRotation(0), 0);
  assert.equal(getWarRoomMinimapPlayerRotation(Math.PI / 2), -90);
  assert.equal(getWarRoomMinimapPlayerRotation(Number.NaN), 0);
});
