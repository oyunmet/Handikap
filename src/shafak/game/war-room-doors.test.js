import assert from "node:assert/strict";
import test from "node:test";
import {
  getWarRoomActiveBlockers,
  WAR_ROOM_DOOR_ANIMATION_SECONDS,
  WAR_ROOM_DOOR_AUTO_OPEN_DISTANCE,
  WAR_ROOM_DOOR_CLEAR_PROGRESS,
  getWarRoomDoorOpenProgress,
  getWarRoomDoorBlocker,
  getWarRoomDoorStateKey,
  getNearestWarRoomDoor,
  updateWarRoomDoors,
} from "./war-room-doors.ts";
import { isWarRoomPointClear } from "./war-room-data.ts";
import { createWarRoomRuntime, moveWarRoomEntity, WAR_ROOM_PLAYER_COLLISION_RADIUS } from "./war-room-engine.ts";
import {
  getWarRoomBuildingLocalPoint,
  getWarRoomBuildingWorldPoint,
} from "./war-room-rooms.ts";

test("War Room house entrances start blocked by properly rotated doors", () => {
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"]);
  const doors = getWarRoomActiveBlockers(runtime, 0)
    .filter((blocker) => blocker.id.endsWith("-floor-0-entrance-door-blocker"));
  assert.equal(doors.length, runtime.room.buildings.length);
  for (const building of runtime.room.buildings) {
    const blocker = getWarRoomDoorBlocker(building);
    const isQuarterTurn = Math.abs(Math.sin(building.rotationY)) > 0.5;
    assert.equal(blocker.width, isQuarterTurn ? 0.18 : building.doorWidth);
    assert.equal(blocker.depth, isQuarterTurn ? building.doorWidth : 0.18);
  }
});

test("active door blockers reuse a caller-owned buffer and cached door geometry", () => {
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"]);
  const building = runtime.room.buildings[0];
  const lowerDoor = getWarRoomDoorBlocker(building, 0);
  const upperDoor = getWarRoomDoorBlocker(building, 1);
  assert.equal(getWarRoomDoorBlocker(building, 0), lowerDoor);
  assert.equal(getWarRoomDoorBlocker(building, 1), upperDoor);

  const reusable = [];
  const first = getWarRoomActiveBlockers(runtime, 0, reusable);
  const firstContents = [...first];
  assert.equal(first, reusable);
  assert.equal(
    first.length,
    runtime.room.blockers.length + runtime.room.buildings.length * 2,
  );

  const next = getWarRoomActiveBlockers(runtime, 0.05, reusable);
  assert.equal(next, first);
  assert.deepEqual(next, firstContents);
});

test("a door's blocker clears as its animation opens and remains state-driven", () => {
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"]);
  const building = runtime.room.buildings[0];
  const front = getWarRoomBuildingWorldPoint(building, 0, -building.depth / 2);
  runtime.player.x = front.x;
  runtime.player.z = front.z;

  assert.equal(getNearestWarRoomDoor(
    runtime.room.buildings,
    front.x,
    front.z,
    runtime.player.floorHeight,
  )?.building.id, building.id);
  assert.equal(updateWarRoomDoors(runtime, 10, true), building.id);
  assert.equal(runtime.doorStates[building.id].closingAt, null);
  assert.ok(Math.abs(getWarRoomDoorOpenProgress(runtime.doorStates[building.id], 10.14) - 0.5) < 1e-10);
  assert.equal(getWarRoomActiveBlockers(runtime, 10).some((blocker) => (
    blocker.id === `${building.id}-floor-0-entrance-door-blocker`
  )), true, "collision stays in place during the opening animation");
  const clearanceAt = 10 + WAR_ROOM_DOOR_ANIMATION_SECONDS * WAR_ROOM_DOOR_CLEAR_PROGRESS;
  assert.equal(getWarRoomActiveBlockers(runtime, clearanceAt).some((blocker) => (
    blocker.id === `${building.id}-floor-0-entrance-door-blocker`
  )), false, "the doorway clears as soon as the moving door leaves enough room");
  assert.equal(getWarRoomActiveBlockers(runtime, 10.25).some((blocker) => (
    blocker.id === `${building.id}-floor-0-entrance-door-blocker`
  )), false);
  runtime.player.x = front.x;
  runtime.player.z = front.z;
  updateWarRoomDoors(runtime, 30, false);
  assert.equal(runtime.doorStates[building.id].closingAt, null, "occupancy, not a timer, keeps the door open");
});

test("automatic door opening follows the actor path instead of proximity alone", () => {
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"]);
  const building = runtime.room.buildings[0];
  const frontZ = -building.depth / 2;
  const outside = getWarRoomBuildingWorldPoint(building, 0, frontZ - 3.01);
  const localRight = getWarRoomBuildingWorldPoint(building, 1, 0);
  const origin = getWarRoomBuildingWorldPoint(building, 0, 0);
  const rightward = { x: localRight.x - origin.x, z: localRight.z - origin.z };
  runtime.player.x = outside.x;
  runtime.player.z = outside.z;

  updateWarRoomDoors(runtime, 1, false, 0, rightward);
  assert.equal(runtime.doorStates[building.id], undefined, "walking parallel to the door must not open it");

  const approach = getWarRoomBuildingWorldPoint(building, 0, frontZ - 2.8);
  const forward = getWarRoomBuildingWorldPoint(building, 0, frontZ - 1.8);
  runtime.player.x = approach.x;
  runtime.player.z = approach.z;
  updateWarRoomDoors(runtime, 2, false, 0, {
    x: forward.x - approach.x,
    z: forward.z - approach.z,
  });
  assert.ok(runtime.doorStates[building.id], "walking toward the opening should trigger the door");
});

test("an empty doorway closes without waiting for a six-second timer", () => {
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"]);
  const building = runtime.room.buildings[0];
  const frontZ = -building.depth / 2;
  const doorway = getWarRoomBuildingWorldPoint(building, 0, frontZ);
  runtime.player.x = doorway.x;
  runtime.player.z = doorway.z;
  updateWarRoomDoors(runtime, 1, true);

  const outside = getWarRoomBuildingWorldPoint(building, 0, frontZ - 4);
  runtime.player.x = outside.x;
  runtime.player.z = outside.z;
  updateWarRoomDoors(runtime, 2, false, 0, { x: 0, z: -1 });

  assert.equal(
    getWarRoomActiveBlockers(runtime, 2 + WAR_ROOM_DOOR_ANIMATION_SECONDS).some((blocker) => (
      blocker.id === `${building.id}-floor-0-entrance-door-blocker`
    )),
    true,
    "the door should restore its blocker after the close animation, not after a fixed timeout",
  );
});

test("door openings leave at least 1.3m for a player capsule no wider than 0.3m", () => {
  assert.ok(WAR_ROOM_PLAYER_COLLISION_RADIUS <= 0.3);
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"]);
  for (const building of runtime.room.buildings) {
    const openingAfterCapsule = building.doorWidth - WAR_ROOM_PLAYER_COLLISION_RADIUS * 2;
    assert.ok(openingAfterCapsule >= 1.3, `${building.id} leaves ${openingAfterCapsule}m clear`);
  }
});

test("a door stays open while occupied and starts closing immediately after it is clear", () => {
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"]);
  const building = runtime.room.buildings[0];
  const threshold = getWarRoomBuildingWorldPoint(building, 0, -building.depth / 2);
  runtime.player.x = threshold.x;
  runtime.player.z = threshold.z;
  updateWarRoomDoors(runtime, 0, true);
  updateWarRoomDoors(runtime, 12, false);
  assert.equal(runtime.doorStates[building.id].closingAt, null);
  assert.equal(getWarRoomActiveBlockers(runtime, 4.9).some((blocker) => (
    blocker.id === `${building.id}-floor-0-entrance-door-blocker`
  )), false);

  const outside = getWarRoomBuildingWorldPoint(building, 0, -building.depth / 2 - 4);
  runtime.player.x = outside.x;
  runtime.player.z = outside.z;
  updateWarRoomDoors(runtime, 12.1, false, 0, { x: 0, z: -1 });
  assert.equal(runtime.doorStates[building.id].closingAt, 12.1);
  assert.equal(getWarRoomActiveBlockers(runtime, 12.1 + WAR_ROOM_DOOR_ANIMATION_SECONDS).some((blocker) => (
    blocker.id === `${building.id}-floor-0-entrance-door-blocker`
  )), true);
});

test("a living enemy in the doorway also resets the automatic close timer", () => {
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"]);
  const building = runtime.room.buildings[0];
  const doorway = getWarRoomBuildingWorldPoint(building, 0, -building.depth / 2 + 0.5);
  runtime.doorStates[building.id] = { openedAt: 0, closingAt: null, closingProgress: 0 };
  runtime.player.x = 40;
  runtime.player.z = 40;
  runtime.enemies[0].x = doorway.x;
  runtime.enemies[0].z = doorway.z;

  updateWarRoomDoors(runtime, 6.1, false);

  assert.equal(runtime.doorStates[building.id].closingAt, null);
  assert.equal(getWarRoomActiveBlockers(runtime, 6.1).some((blocker) => (
    blocker.id === `${building.id}-floor-0-entrance-door-blocker`
  )), false);
});

test("door interaction requires facing the doorway when a view direction is supplied", () => {
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"]);
  const building = runtime.room.buildings[0];
  const outside = getWarRoomBuildingWorldPoint(building, 0, -building.depth / 2 - 1);
  const door = getWarRoomBuildingWorldPoint(building, 0, -building.depth / 2);
  const towardDoor = Math.atan2(door.x - outside.x, -(door.z - outside.z));
  assert.equal(
    getNearestWarRoomDoor(runtime.room.buildings, outside.x, outside.z, 0, towardDoor)?.building.id,
    building.id,
  );
  assert.equal(
    getNearestWarRoomDoor(runtime.room.buildings, outside.x, outside.z, 0, towardDoor + Math.PI),
    null,
  );
});

test("door interaction range includes a comfortable approach distance", () => {
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"]);
  const building = runtime.room.buildings[0];
  const outside = getWarRoomBuildingWorldPoint(building, 0, -building.depth / 2 - 3);
  const door = getWarRoomBuildingWorldPoint(building, 0, -building.depth / 2);
  const towardDoor = Math.atan2(door.x - outside.x, -(door.z - outside.z));
  assert.equal(
    getNearestWarRoomDoor(runtime.room.buildings, outside.x, outside.z, 0, towardDoor)?.building.id,
    building.id,
  );
});

test("entering or leaving a house auto-opens the entrance from every room rotation", () => {
  for (let roomNumber = 1; roomNumber <= 4; roomNumber += 1) {
    for (const direction of [1, -1]) {
      const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"], 0, roomNumber);
      const building = runtime.room.buildings[0];
      const frontZ = -building.depth / 2;
      const start = getWarRoomBuildingWorldPoint(
        building,
        0,
        frontZ + direction * 1.1,
      );
      const target = getWarRoomBuildingWorldPoint(
        building,
        0,
        frontZ - direction * 2.5,
      );
      runtime.player.x = start.x;
      runtime.player.z = start.z;

      updateWarRoomDoors(runtime, 10, false, Math.PI, {
        x: target.x - start.x,
        z: target.z - start.z,
      });
      assert.ok(runtime.doorStates[building.id], "the door opens without an interaction button");
      assert.equal(
        getWarRoomActiveBlockers(runtime, 10 + WAR_ROOM_DOOR_ANIMATION_SECONDS * WAR_ROOM_DOOR_CLEAR_PROGRESS)
          .some((blocker) => blocker.id === `${building.id}-floor-0-entrance-door-blocker`),
        false,
        "automatic opening clears the doorway before a running player reaches it",
      );

      const result = moveWarRoomEntity(
        start.x,
        start.z,
        target.x - start.x,
        target.z - start.z,
        WAR_ROOM_PLAYER_COLLISION_RADIUS,
        getWarRoomActiveBlockers(runtime, 10 + WAR_ROOM_DOOR_ANIMATION_SECONDS * 0.7),
      );
      const localResult = getWarRoomBuildingLocalPoint(building, result.x, result.z);
      assert.ok(
        direction > 0
          ? localResult.z < frontZ - 1.4
          : localResult.z > frontZ + 1.4,
        `room ${roomNumber} ${direction > 0 ? "exit" : "entry"} should pass through the doorway`,
      );
    }
  }
});

test("doors begin opening from a running approach before the player reaches the threshold", () => {
  for (let roomNumber = 1; roomNumber <= 4; roomNumber += 1) {
    const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"], 0, roomNumber);
    const building = runtime.room.buildings[0];
    const frontZ = -building.depth / 2;
    const start = getWarRoomBuildingWorldPoint(
      building,
      0,
      frontZ - WAR_ROOM_DOOR_AUTO_OPEN_DISTANCE - 0.1,
    );
    const approach = getWarRoomBuildingWorldPoint(
      building,
      0,
      frontZ - WAR_ROOM_DOOR_AUTO_OPEN_DISTANCE,
    );
    runtime.player.x = start.x;
    runtime.player.z = start.z;

    updateWarRoomDoors(runtime, 22, false, Math.PI, {
      x: approach.x - start.x,
      z: approach.z - start.z,
    });
    assert.equal(runtime.doorStates[building.id], undefined, `room ${roomNumber} stays closed outside range`);
    runtime.player.x = approach.x;
    runtime.player.z = approach.z;
    updateWarRoomDoors(runtime, 22.02, false, Math.PI, {
      x: approach.x - start.x,
      z: approach.z - start.z,
    });
    assert.ok(runtime.doorStates[building.id], `room ${roomNumber} should detect a running approach`);
    assert.equal(
      getWarRoomActiveBlockers(runtime, 22.02 + WAR_ROOM_DOOR_ANIMATION_SECONDS * WAR_ROOM_DOOR_CLEAR_PROGRESS + 0.001)
        .some((blocker) => blocker.id === `${building.id}-floor-0-entrance-door-blocker`),
      false,
      `room ${roomNumber} should clear the threshold before collision`,
    );
  }
});

test("all entrance doors retain at least 1.3m clear width and 2.4m height", () => {
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"]);
  for (const building of runtime.room.buildings) {
    const blocker = getWarRoomDoorBlocker(building);
    assert.ok(Math.max(blocker.width, blocker.depth) >= 1.3);
    assert.ok(blocker.height >= 2.4);
  }
});

test("players and guards cross every War Room doorway from five angles at walk and run speed", () => {
  const angles = [0, -20, 20, -45, 45];
  const speeds = [3.4, 6.8];
  const frameSeconds = 1 / 60;
  let combinations = 0;

  for (let roomNumber = 1; roomNumber <= 6; roomNumber += 1) {
    const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"], 0, roomNumber);
    for (const building of runtime.room.buildings) {
      for (const floor of [0, 1]) {
        for (const angleDegrees of angles) {
          const angle = (angleDegrees * Math.PI) / 180;
          const localDirection = {
            x: Math.sin(angle),
            z: floor === 0 ? Math.cos(angle) : -Math.cos(angle),
          };
          const worldOrigin = getWarRoomBuildingWorldPoint(building, 0, 0);
          const worldDirectionPoint = getWarRoomBuildingWorldPoint(
            building,
            localDirection.x,
            localDirection.z,
          );
          const direction = {
            x: worldDirectionPoint.x - worldOrigin.x,
            z: worldDirectionPoint.z - worldOrigin.z,
          };
          const floorHeight = floor === 0 ? 0 : building.storyHeight;
          const frontZ = -building.depth / 2;
          // Place the actor in the actual interior corridor, not inside a
          // side-room wall on diagonal upper-floor exits.
          const startDistance = 1.25;
          const startLocal = {
            x: -localDirection.x * startDistance,
            z: frontZ - localDirection.z * startDistance,
          };
          const start = getWarRoomBuildingWorldPoint(building, startLocal.x, startLocal.z);
          const doorStateKey = getWarRoomDoorStateKey(building, floor);

          for (const speed of speeds) {
            for (const actorType of ["player", "guard"]) {
              const actorRadius = actorType === "player" ? WAR_ROOM_PLAYER_COLLISION_RADIUS : 0.35;
              assert.ok(
                isWarRoomPointClear(
                  start.x,
                  start.z,
                  runtime.room.blockers,
                  actorRadius,
                  floorHeight,
                ),
                `${building.id}, floor ${floor}, ${angleDegrees}° start must be walkable for ${actorType}`,
              );
              runtime.doorStates = {};
              runtime.enemies = actorType === "guard"
                ? [{
                    id: "door-crossing-guard",
                    x: start.x,
                    z: start.z,
                    floorHeight,
                    doorApproachX: direction.x,
                    doorApproachZ: direction.z,
                    alive: true,
                  }]
                : [];
              runtime.player.x = actorType === "player" ? start.x : 50;
              runtime.player.z = actorType === "player" ? start.z : 50;
              runtime.player.floorHeight = actorType === "player" ? floorHeight : 0;

              let x = start.x;
              let z = start.z;
              let slowSeconds = 0;
              let maximumSlowSeconds = 0;
              let passedDoor = false;
              let doorStartedOpening = false;

              for (let frame = 0; frame < 4 * 60; frame += 1) {
                const now = frame * frameSeconds;
                if (actorType === "player") {
                  runtime.player.x = x;
                  runtime.player.z = z;
                  updateWarRoomDoors(runtime, now, false, undefined, direction);
                } else {
                  runtime.enemies[0].x = x;
                  runtime.enemies[0].z = z;
                  runtime.enemies[0].doorApproachX = direction.x;
                  runtime.enemies[0].doorApproachZ = direction.z;
                  updateWarRoomDoors(runtime, now, false);
                }
                doorStartedOpening ||= Boolean(runtime.doorStates[doorStateKey]);

                const previousX = x;
                const previousZ = z;
                const next = moveWarRoomEntity(
                  x,
                  z,
                  direction.x * speed * frameSeconds,
                  direction.z * speed * frameSeconds,
                  actorRadius,
                  getWarRoomActiveBlockers(runtime, now),
                  floorHeight,
                );
                x = next.x;
                z = next.z;
                const local = getWarRoomBuildingLocalPoint(building, x, z);
                const inThreshold = Math.abs(local.z - frontZ) <= 0.55
                  && Math.abs(local.x) <= building.doorWidth / 2 + 0.4;
                const actualSpeed = Math.hypot(x - previousX, z - previousZ) / frameSeconds;
                if (inThreshold && actualSpeed < speed * 0.5) {
                  slowSeconds += frameSeconds;
                  maximumSlowSeconds = Math.max(maximumSlowSeconds, slowSeconds);
                } else {
                  slowSeconds = 0;
                }
                const progress = (x - start.x) * direction.x + (z - start.z) * direction.z;
                if (progress >= startDistance + 0.45) {
                  passedDoor = true;
                  break;
                }
              }

              combinations += 1;
              assert.equal(
                passedDoor,
                true,
                `room ${roomNumber}, ${building.id}, floor ${floor}, ${angleDegrees}°, ${speed}m/s, ${actorType}`,
              );
              assert.equal(
                doorStartedOpening,
                true,
                `${building.id}, floor ${floor}, ${angleDegrees}°, ${speed}m/s, ${actorType} should trigger its own door`,
              );
              assert.ok(
                maximumSlowSeconds <= 0.15,
                `room ${roomNumber}, ${building.id}, floor ${floor}, ${angleDegrees}°, ${speed}m/s, ${actorType} stalled ${maximumSlowSeconds.toFixed(3)}s`,
              );
            }
          }
        }
      }
    }
  }

  assert.equal(combinations, 1_920);
});

test("both ground- and upper-floor door prompts stay limited to their floor and distance", () => {
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"]);
  const building = runtime.room.buildings[0];
  const front = getWarRoomBuildingWorldPoint(building, 0, -building.depth / 2);
  assert.equal(getNearestWarRoomDoor(runtime.room.buildings, front.x, front.z, 0)?.building.id, building.id);
  assert.equal(
    getNearestWarRoomDoor(runtime.room.buildings, front.x, front.z, building.storyHeight)?.floor,
    1,
  );
  assert.equal(getNearestWarRoomDoor(runtime.room.buildings, front.x, front.z, 1.5), null);
  assert.equal(getNearestWarRoomDoor(runtime.room.buildings, 0, 0, 0), null);
});

test("the upper entrance has a matching openable blocker and preserves the ground door", () => {
  const runtime = createWarRoomRuntime(["powder_rifle", "crossbow"]);
  const building = runtime.room.buildings[0];
  const front = getWarRoomBuildingWorldPoint(building, 0, -building.depth / 2);
  const upperKey = `${building.id}-upper`;
  runtime.player.x = front.x;
  runtime.player.z = front.z;
  runtime.player.floorHeight = building.storyHeight;

  assert.equal(updateWarRoomDoors(runtime, 20, true), upperKey);
  const upperBlockerId = `${building.id}-floor-1-entrance-door-blocker`;
  const groundBlockerId = `${building.id}-floor-0-entrance-door-blocker`;
  assert.equal(getWarRoomActiveBlockers(runtime, 20.25).some((blocker) => (
    blocker.id === upperBlockerId
  )), false);
  assert.equal(getWarRoomActiveBlockers(runtime, 20.25).some((blocker) => (
    blocker.id === groundBlockerId
  )), true);
  assert.equal(getWarRoomDoorBlocker(building, 1).baseY, building.storyHeight);
});
