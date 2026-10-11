import test from "node:test";
import assert from "node:assert/strict";
import { WorldResourcePool, WorldResourceScope } from "./world-resource-pool.ts";

test("shared resources remain alive until the final scene releases its lease", () => {
  const pool = new WorldResourcePool();
  let created = 0;
  let disposed = 0;
  const create = () => {
    created += 1;
    return { dispose: () => { disposed += 1; } };
  };

  const first = pool.acquire("shared-road-texture", create);
  const second = pool.acquire("shared-road-texture", create);
  assert.equal(first.value, second.value);
  assert.equal(created, 1);
  assert.equal(pool.getReferenceCount("shared-road-texture"), 2);

  first.release();
  assert.equal(disposed, 0);
  assert.equal(pool.getReferenceCount("shared-road-texture"), 1);
  second.release();
  assert.equal(disposed, 1);
  assert.equal(pool.size, 0);
});

test("scene scopes release borrowed resources and dispose only their owned resources", () => {
  const pool = new WorldResourcePool();
  let sharedDisposals = 0;
  let localDisposals = 0;
  const sceneA = new WorldResourceScope();
  const sceneB = new WorldResourceScope();
  const sharedFactory = () => ({ dispose: () => { sharedDisposals += 1; } });

  const aShared = sceneA.borrow(pool, "gate-material", sharedFactory);
  const bShared = sceneB.borrow(pool, "gate-material", sharedFactory);
  assert.equal(aShared, bShared);
  sceneA.own({ id: "scene-a-geometry" }, () => { localDisposals += 1; });

  sceneA.dispose();
  assert.equal(localDisposals, 1);
  assert.equal(sharedDisposals, 0);
  assert.equal(pool.getReferenceCount("gate-material"), 1);
  sceneB.dispose();
  assert.equal(sharedDisposals, 1);
  assert.equal(pool.size, 0);
});

test("resource releases and scene disposal are idempotent", () => {
  const pool = new WorldResourcePool();
  let disposed = 0;
  const lease = pool.acquire("one", () => ({ dispose: () => { disposed += 1; } }));
  lease.release();
  lease.release();
  assert.equal(disposed, 1);

  const scope = new WorldResourceScope();
  scope.own({}, () => { disposed += 1; });
  scope.dispose();
  scope.dispose();
  assert.equal(disposed, 2);
  assert.throws(() => scope.own({}, () => undefined), /disposed world scope/);
});

test("twenty travel-duel transitions keep renderer resources stable and release scene-owned objects", () => {
  const pool = new WorldResourcePool();
  let sharedCreated = 0;
  let sharedDisposed = 0;
  let sceneOwnedDisposed = 0;
  const createShared = () => {
    sharedCreated += 1;
    return { dispose: () => { sharedDisposed += 1; } };
  };
  const rendererLease = pool.acquire("persistent-environment", createShared);

  for (let index = 0; index < 20; index += 1) {
    const travelScene = new WorldResourceScope();
    const duelScene = new WorldResourceScope();
    const travelResource = travelScene.borrow(pool, "persistent-environment", createShared);
    const duelResource = duelScene.borrow(pool, "persistent-environment", createShared);
    assert.equal(travelResource, rendererLease.value);
    assert.equal(duelResource, rendererLease.value);
    assert.equal(pool.getReferenceCount("persistent-environment"), 3);

    travelScene.own({ scene: "travel", index }, () => { sceneOwnedDisposed += 1; });
    duelScene.own({ scene: "duel", index }, () => { sceneOwnedDisposed += 1; });
    travelScene.dispose();
    duelScene.dispose();

    assert.equal(pool.getReferenceCount("persistent-environment"), 1);
    assert.equal(pool.size, 1);
    assert.equal(sharedDisposed, 0);
  }

  assert.equal(sharedCreated, 1);
  assert.equal(sceneOwnedDisposed, 40);
  rendererLease.release();
  assert.equal(sharedDisposed, 1);
  assert.equal(pool.size, 0);
});
