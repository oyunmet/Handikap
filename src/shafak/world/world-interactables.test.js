import assert from "node:assert/strict";
import test from "node:test";
import {
  getRivalDialoguePrompt,
  readBrokenObstacleIds,
  saveBrokenObstacleIds,
  WorldInteractableRegistry,
} from "./world-interactables.ts";

function makeMesh({ visible = true, parent = { visible: true, parent: null } } = {}) {
  return { visible, parent };
}

function entry(id, overrides = {}) {
  return {
    id,
    kind: "chest",
    x: 0,
    distance: 10,
    radius: 3.2,
    lateralRadius: 2.35,
    state: "active",
    mesh: makeMesh(),
    source: { id },
    ...overrides,
  };
}

test("interactable lookup requires a registered, visible mesh attached to the scene", () => {
  const registry = new WorldInteractableRegistry();
  registry.register(entry("detached", { mesh: makeMesh({ parent: null }) }));
  registry.register(entry("hidden", { mesh: makeMesh({ visible: false }) }));
  registry.register(entry("parent-hidden", {
    mesh: makeMesh({ parent: { visible: false, parent: null } }),
  }));
  registry.register(entry("visible"));

  assert.equal(registry.getAvailable("detached"), undefined);
  assert.equal(registry.getAvailable("hidden"), undefined);
  assert.equal(registry.getAvailable("parent-hidden"), undefined);
  assert.equal(registry.getAvailable("visible")?.id, "visible");
});

test("nearest interaction respects state and both world-space range limits", () => {
  const registry = new WorldInteractableRegistry();
  registry.register(entry("opened", { state: "opened" }));
  registry.register(entry("too-far", { distance: 20 }));
  registry.register(entry("too-wide", { x: 4 }));
  registry.register(entry("near", { distance: 11 }));

  assert.equal(registry.findNearest("chest", 0, 10)?.id, "near");
  assert.equal(registry.findNearest("breakable", 0, 10), undefined);
});

test("NPC dialogue and challenge prompts stay attached to the registered nearby rival", () => {
  const rivals = [
    { id: "next-in-route", distance: 104 },
    { id: "registered-nearby", distance: 106 },
  ];

  assert.deepEqual(getRivalDialoguePrompt(rivals, "registered-nearby", 100), {
    rivalId: "registered-nearby",
    canChallenge: true,
  });
  assert.deepEqual(getRivalDialoguePrompt(rivals, "registered-nearby", 95), {
    rivalId: "registered-nearby",
    canChallenge: false,
  });
  assert.deepEqual(getRivalDialoguePrompt(rivals, "registered-nearby", 93), {
    rivalId: null,
    canChallenge: false,
  });
  assert.deepEqual(getRivalDialoguePrompt(rivals, null, 100), {
    rivalId: null,
    canChallenge: false,
  });
});

test("unmount cleanup cannot remove a newer mesh registered for the same id", () => {
  const registry = new WorldInteractableRegistry();
  const unregisterOld = registry.register(entry("recycled"));
  registry.register(entry("recycled", { source: { id: "new" } }));

  unregisterOld();

  assert.equal(registry.getAvailable("recycled")?.source.id, "new");
});

test("broken world obstacles persist separately by player and only accept stable obstacle ids", () => {
  const originalStorage = globalThis.localStorage;
  const values = new Map();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  });

  try {
    const opened = new Set([
      "ash-road:4:obstacle:treasure-chest",
      "ash-road:4:obstacle:barrel",
      "invalid-id",
    ]);
    saveBrokenObstacleIds(opened, "player-one");

    assert.deepEqual(
      [...readBrokenObstacleIds("player-one")],
      ["ash-road:4:obstacle:treasure-chest", "ash-road:4:obstacle:barrel"],
    );
    assert.deepEqual([...readBrokenObstacleIds("player-two")], []);
  } finally {
    if (originalStorage === undefined) delete globalThis.localStorage;
    else Object.defineProperty(globalThis, "localStorage", { configurable: true, value: originalStorage });
  }
});
