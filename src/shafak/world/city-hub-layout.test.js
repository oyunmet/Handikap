import assert from "node:assert/strict";
import test from "node:test";
import {
  CITY_DOORS,
  CITY_EDGE_LIMIT,
  CITY_START_POSITION,
  findNearbyCityDoor,
  stepCityPosition,
} from "./city-hub-layout.ts";

test("the city has a separate entrance for each existing activity", () => {
  assert.deepEqual(
    CITY_DOORS.map((door) => door.id),
    ["campaign", "war-room", "weapons", "smithy"],
  );
  for (const door of CITY_DOORS) {
    assert.equal(findNearbyCityDoor(door.entrance)?.id, door.id);
  }
});

test("the player can walk forward, backward, left, and right", () => {
  const start = CITY_START_POSITION;
  const step = (x, z) => stepCityPosition(start, { x, z }, 0.05);

  assert.ok(step(0, -1).z < start.z, "forward should move north");
  assert.ok(step(0, 1).z > start.z, "backward should move south");
  assert.ok(step(-1, 0).x < start.x, "left should move west");
  assert.ok(step(1, 0).x > start.x, "right should move east");
});

test("diagonal movement is normalized and never exceeds city boundaries", () => {
  const straight = stepCityPosition(CITY_START_POSITION, { x: 0, z: 1 }, 0.05);
  const diagonal = stepCityPosition(CITY_START_POSITION, { x: 1, z: 1 }, 0.05);
  assert.ok(Math.hypot(diagonal.x, diagonal.z) <= Math.hypot(straight.x, straight.z) + 1e-9);

  const atEdge = stepCityPosition(
    { x: CITY_EDGE_LIMIT, z: CITY_EDGE_LIMIT },
    { x: 1, z: 1 },
    0.05,
  );
  assert.ok(atEdge.x <= CITY_EDGE_LIMIT);
  assert.ok(atEdge.z <= CITY_EDGE_LIMIT);
});

test("building collision blocks entry but still permits sliding along the wall", () => {
  const door = CITY_DOORS[0];
  const blocked = stepCityPosition(
    { x: door.building.x + door.width / 2 + 0.5, z: door.building.z },
    { x: -1, z: 0 },
    0.05,
  );
  assert.ok(blocked.x > door.building.x + door.width / 2);

  const slide = stepCityPosition(
    { x: door.building.x + door.width / 2 + 0.5, z: door.building.z },
    { x: -1, z: 1 },
    0.05,
  );
  assert.ok(slide.z > door.building.z);
});

test("door prompts stay hidden until the player is close", () => {
  assert.equal(findNearbyCityDoor(CITY_START_POSITION), null);
  assert.equal(findNearbyCityDoor({ x: -6, z: 0 })?.id, "campaign");
});
