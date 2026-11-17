import assert from "node:assert/strict";
import test from "node:test";
import { CITY_DOORS } from "./city-hub-layout.ts";
import { CITY_RESIDENTS, CITY_RESIDENT_TINTS } from "./city-hub-residents.ts";

test("city residents cover each planned accessory and have distinct clothing colors", () => {
  const accessories = new Set(CITY_RESIDENTS.map((resident) => resident.accessory));
  assert.deepEqual(
    [...accessories].sort(),
    ["cane", "cape", "glasses", "hat", "wheelchair"],
  );
  assert.equal(CITY_RESIDENTS.length, CITY_RESIDENT_TINTS.length);
  assert.equal(new Set(CITY_RESIDENT_TINTS).size, CITY_RESIDENT_TINTS.length);
});

test("residents stay outside building collision footprints and inside city bounds", () => {
  for (const resident of CITY_RESIDENTS) {
    for (const door of CITY_DOORS) {
      assert.ok(
        Math.abs(resident.x - door.building.x) >= door.width / 2 + 0.38
          || Math.abs(resident.z - door.building.z) >= door.depth / 2 + 0.38,
        `${resident.accessory} resident overlaps ${door.id}`,
      );
    }
    assert.ok(Math.abs(resident.x) <= 21);
    assert.ok(Math.abs(resident.z) <= 21);
  }
});
