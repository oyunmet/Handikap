import assert from "node:assert/strict";
import test from "node:test";
import {
  CITY_COLLISION_MARGIN,
  CITY_DOORS,
  CITY_EDGE_LIMIT,
  CITY_START_POSITION,
  findNearbyCityDoor,
  getCityGroundHeight,
  readCityJoystick,
  stepCityPosition,
} from "./city-hub-layout.ts";

test("the city has a separate entrance for each existing activity", () => {
  assert.deepEqual(
    CITY_DOORS.map((door) => door.id),
    ["campaign", "war-room", "survival", "daily"],
  );
  for (const door of CITY_DOORS) {
    assert.equal(findNearbyCityDoor(door.entrance)?.id, door.id);
  }
  assert.deepEqual(
    CITY_DOORS.filter((door) => door.missionMode).map((door) => door.missionMode),
    ["raid", "survival", "daily"],
  );
  assert.match(CITY_DOORS.find((door) => door.id === "campaign")?.category ?? "", /ANA OPERASYON/);
  assert.match(CITY_DOORS.find((door) => door.id === "war-room")?.title ?? "", /TAKTİK ARENA/);
  assert.match(CITY_DOORS.find((door) => door.id === "war-room")?.category ?? "", /OPERASYON MERKEZİ/);
});

test("the player can walk forward, backward, left, and right", () => {
  const start = CITY_START_POSITION;
  const step = (x, z) => stepCityPosition(start, { x, z }, 0.05);

  assert.ok(step(0, -1).z < start.z, "forward should move north");
  assert.ok(step(0, 1).z > start.z, "backward should move south");
  assert.ok(step(-1, 0).x < start.x, "left should move west");
  assert.ok(step(1, 0).x > start.x, "right should move east");
});

test("the city touch joystick maps finger movement to the matching world direction", () => {
  const bounds = { left: 10, top: 20, width: 116, height: 116 };
  const center = { x: 68, y: 78 };

  assert.deepEqual(readCityJoystick(center.x, center.y, bounds), { x: 0, z: 0 });
  assert.ok(readCityJoystick(center.x, center.y - 50, bounds).z < 0, "up moves forward");
  assert.ok(readCityJoystick(center.x, center.y + 50, bounds).z > 0, "down moves backward");
  assert.ok(readCityJoystick(center.x - 50, center.y, bounds).x < 0, "left moves left");
  assert.ok(readCityJoystick(center.x + 50, center.y, bounds).x > 0, "right moves right");
  assert.deepEqual(readCityJoystick(Number.NaN, center.y, bounds), { x: 0, z: 0 });
});

test("the city joystick has a dead zone and uses the full visible stick travel", () => {
  const bounds = { left: 10, top: 20, width: 116, height: 116 };
  const center = { x: 68, y: 78 };
  assert.deepEqual(readCityJoystick(center.x + 3, center.y, bounds), { x: 0, z: 0 });
  const partial = readCityJoystick(center.x + 15, center.y, bounds);
  assert.ok(partial.x > 0.4 && partial.x < 0.6);
  assert.equal(readCityJoystick(center.x + 29, center.y, bounds).x, 1);
});

test("the city hero uses the road, sidewalk, and outdoor ground heights", () => {
  assert.equal(getCityGroundHeight({ x: 0, z: 0 }), 0);
  assert.equal(getCityGroundHeight({ x: 5.45, z: 0 }), 0.13);
  assert.equal(getCityGroundHeight({ x: 12, z: 12 }), -0.08);
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
  const walkableX = door.building.x + door.width / 2 + CITY_COLLISION_MARGIN + 0.15;
  const blocked = stepCityPosition(
    { x: walkableX, z: door.building.z },
    { x: -1, z: 0 },
    0.05,
  );
  assert.ok(blocked.x > door.building.x + door.width / 2);

  const slide = stepCityPosition(
    { x: walkableX, z: door.building.z },
    { x: -1, z: 1 },
    0.05,
  );
  assert.ok(slide.z > door.building.z);
});

test("door prompts stay hidden until the player is close", () => {
  assert.equal(findNearbyCityDoor(CITY_START_POSITION), null);
  assert.equal(findNearbyCityDoor({ x: -6, z: 0 })?.id, "campaign");
});
