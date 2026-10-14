import assert from "node:assert/strict";
import test from "node:test";
import { createLatestAsyncSaveQueue } from "./latest-async-save-queue.ts";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test("coalesces snapshots received during a save and sends the newest one next", async () => {
  const first = deferred();
  const second = deferred();
  const writes = [];
  const queue = createLatestAsyncSaveQueue((value) => {
    writes.push(value);
    return writes.length === 1 ? first.promise : second.promise;
  });

  queue.enqueue({ distance: 10 }, { immediate: true });
  queue.enqueue({ distance: 20 }, { immediate: true });
  queue.enqueue({ distance: 30 }, { immediate: true });
  assert.deepEqual(writes, [{ distance: 10 }]);

  first.resolve();
  await tick();
  assert.deepEqual(writes, [{ distance: 10 }, { distance: 30 }]);
  second.resolve();
  await tick();
});

test("a failed save is retained for the next update instead of being lost", async () => {
  const writes = [];
  let shouldFail = true;
  const queue = createLatestAsyncSaveQueue(async (value) => {
    writes.push(value);
    if (shouldFail) throw new Error("offline");
  });

  queue.enqueue({ distance: 40 }, { immediate: true });
  await tick();
  assert.deepEqual(writes, [{ distance: 40 }]);

  shouldFail = false;
  queue.enqueue({ distance: 55 });
  await tick();
  assert.deepEqual(writes, [{ distance: 40 }, { distance: 55 }]);
});

test("ordinary saves respect the minimum interval while important saves flush immediately", async () => {
  const first = deferred();
  const writes = [];
  const queue = createLatestAsyncSaveQueue((value) => {
    writes.push(value);
    return writes.length === 1 ? first.promise : Promise.resolve();
  }, 25);

  queue.enqueue(1, { immediate: true });
  queue.enqueue(2);
  first.resolve();
  await tick();
  assert.deepEqual(writes, [1]);

  await new Promise((resolve) => setTimeout(resolve, 35));
  assert.deepEqual(writes, [1, 2]);
});
