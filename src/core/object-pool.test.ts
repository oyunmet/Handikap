import assert from "node:assert/strict";
import test from "node:test";
import { createObjectPool } from "./object-pool";

test("object pool reuses released objects and respects its capacity", () => {
  let created = 0;
  const pool = createObjectPool({
    capacity: 2,
    create: () => ({ value: ++created }),
    reset: (item) => {
      item.value = 0;
    },
  });

  const first = pool.acquire();
  const second = pool.acquire();
  assert.ok(first);
  assert.ok(second);
  assert.equal(pool.acquire(), undefined);
  assert.equal(pool.release(first), true);
  assert.equal(pool.release(first), false);
  assert.equal(pool.acquire(), first);
  assert.equal(pool.activeCount, 2);
  assert.equal(pool.allocatedCount, 2);
});

test("clearing invalidates active references before the next allocation", () => {
  const pool = createObjectPool({
    capacity: 1,
    create: () => ({ value: 1 }),
    reset: (item) => {
      item.value = 0;
    },
  });
  const oldValue = pool.acquire();
  assert.ok(oldValue);

  pool.clear();

  assert.equal(pool.release(oldValue), false);
  assert.equal(pool.allocatedCount, 0);
  assert.notEqual(pool.acquire(), oldValue);
});
