import test from "node:test";
import assert from "node:assert/strict";
import {
  BOARD_MASK,
  createGameState,
  findMatches,
  hasAvailableSwap,
  swapTiles,
  useBooster,
} from "./royal-engine.js";
import { getLevelDefinition, LEVEL_COUNT, LEVELS_PER_CHAPTER } from "./royal-levels.js";

const gem = (id, color, special) => ({ id, kind: "gem", color, ...(special ? { special } : {}) });
const blocker = (id, type, hp, extra = {}) => ({
  id,
  kind: "blocker",
  type,
  hp,
  maxHp: hp,
  ...extra,
});

function emptyState(levelNumber = LEVEL_COUNT) {
  const state = createGameState(levelNumber);
  state.board = BOARD_MASK.map((row) => row.map(() => null));
  state.movesLeft = 37;
  state.totalMoves = 37;
  state.goals = [
    { id: "vault", remaining: 8, total: 8 },
    { id: "bear", remaining: 1, total: 1 },
    { id: "grass", remaining: 4, total: 4 },
    { id: "gems", remaining: 41, total: 41 },
  ];
  return state;
}

function put(state, row, col, cell) {
  state.board[row][col] = cell;
  return state;
}

function buildVerticalMatch(state) {
  put(state, 3, 3, gem("a", "red"));
  put(state, 4, 2, gem("b", "red"));
  put(state, 4, 3, gem("c", "blue"));
  put(state, 4, 4, gem("d", "red"));
  put(state, 5, 3, gem("e", "red"));
  put(state, 3, 2, gem("f", "blue"));
  put(state, 3, 4, gem("g", "yellow"));
  put(state, 5, 2, gem("h", "green"));
  put(state, 5, 4, gem("i", "yellow"));
  return state;
}

test("initial level has an irregular playable board, objectives, and a legal move", () => {
  const state = createGameState();
  const definition = getLevelDefinition(1);
  assert.equal(state.board.length, 10);
  assert.equal(state.board[0][0], null);
  assert.equal(state.board[0][7].kind, "gem");
  assert.equal(state.movesLeft, definition.moves);
  assert.deepEqual(state.unlockedSpecials, []);
  assert.deepEqual(state.goals.map(({ id, remaining }) => [id, remaining]), [
    ...Object.entries(definition.goals),
  ]);
  assert.equal(findMatches(state.board).size, 0);
  assert.equal(hasAvailableSwap(state.board), true);
});

test("campaign defines 500 distinct challenges across 20 chapters", () => {
  const definitions = Array.from({ length: LEVEL_COUNT }, (_, index) => getLevelDefinition(index + 1));
  const signatures = definitions.map(({ chapter, featureIds, goals, moves, unlockedSpecials, layoutVariant }) =>
    JSON.stringify({ chapter, featureIds, goals, moves, unlockedSpecials, layoutVariant }),
  );
  assert.equal(definitions.length, 500);
  assert.equal(new Set(signatures).size, LEVEL_COUNT);
  assert.equal(definitions.at(-1).chapter, LEVEL_COUNT / LEVELS_PER_CHAPTER);
  assert.equal(getLevelDefinition(501).level, LEVEL_COUNT);
  assert.deepEqual(getLevelDefinition(1).unlockedSpecials, []);
  assert.deepEqual(getLevelDefinition(2).unlockedSpecials, ["rocket"]);
  assert.ok(getLevelDefinition(14).unlockedSpecials.includes("lightball"));
});

test("different levels generate their own board, goals, and available powers", () => {
  const first = createGameState(1);
  const featureLevel = createGameState(5);
  const final = createGameState(LEVEL_COUNT);
  assert.equal(first.level, 1);
  assert.equal(featureLevel.level, 5);
  assert.equal(final.level, LEVEL_COUNT);
  assert.notDeepEqual(first.goals, final.goals);
  assert.notDeepEqual(first.board, featureLevel.board);
  assert.ok(featureLevel.unlockedSpecials.includes("propeller"));
  assert.ok(final.unlockedSpecials.includes("lightball"));
  for (const state of [first, featureLevel, final]) {
    assert.equal(findMatches(state.board).size, 0);
    assert.equal(hasAvailableSwap(state.board), true);
  }
});

test("a non-matching swap does not spend a move", () => {
  const state = emptyState();
  put(state, 4, 2, gem("left", "red"));
  put(state, 4, 3, gem("right", "blue"));
  const next = swapTiles(state, { row: 4, col: 2 }, { row: 4, col: 3 });
  assert.equal(next.movesLeft, state.movesLeft);
  assert.equal(next.score, 0);
  assert.match(next.message, /Eşleşme olmadı/);
});

test("a valid match spends one move, scores gems, and damages an adjacent vault", () => {
  const state = buildVerticalMatch(emptyState());
  put(state, 4, 2, blocker("vault-target", "vault", 2));
  const next = swapTiles(state, { row: 4, col: 3 }, { row: 4, col: 4 });
  assert.equal(next.movesLeft, 36);
  assert.ok(next.score >= 300);
  assert.equal(
    next.goals.find(({ id }) => id === "gems").remaining,
    Math.max(0, 41 - next.clearedCells.length),
  );
  assert.ok(next.board[4][2].hp <= 1);
  if (!next.board[4][2].kind || next.board[4][2].kind !== "blocker") {
    assert.equal(next.goals.find(({ id }) => id === "vault").remaining, 7);
  } else {
    assert.equal(next.goals.find(({ id }) => id === "vault").remaining, 8);
  }
});

test("a yellow match formed by an adjacent swap is cleared", () => {
  const state = emptyState();
  put(state, 2, 5, gem("yellow-top", "yellow"));
  put(state, 3, 5, gem("red-middle", "red"));
  put(state, 4, 5, gem("yellow-bottom", "yellow"));
  put(state, 3, 6, gem("yellow-swap", "yellow"));

  const next = swapTiles(state, { row: 3, col: 5 }, { row: 3, col: 6 });
  const clearedYellow = next.clearedCells.filter((cell) => cell.color === "yellow");

  assert.equal(next.turnId, state.turnId + 1);
  assert.equal(next.movesLeft, state.movesLeft - 1);
  assert.deepEqual(
    clearedYellow.map(({ row, col }) => `${row}:${col}`).sort(),
    ["2:5", "3:5", "4:5"],
  );
});

test("a four-match creates a rocket special", () => {
  const state = emptyState();
  put(state, 3, 3, gem("top", "red"));
  put(state, 4, 2, gem("swap", "red"));
  put(state, 4, 3, gem("middle", "yellow"));
  put(state, 5, 3, gem("bottom-a", "red"));
  put(state, 6, 3, gem("bottom-b", "red"));
  const next = swapTiles(state, { row: 4, col: 2 }, { row: 4, col: 3 });
  const created = next.specialEffects.find((effect) => effect.type === "special-created" && effect.special.startsWith("rocket-"));
  assert.ok(created);
  assert.ok(next.board.flat().some((cell) => cell?.special?.startsWith("rocket-")));
  const createdTilePosition = next.board.flatMap((row, rowIndex) =>
    row.map((cell, colIndex) => cell?.id === created.tileId ? { row: rowIndex, col: colIndex } : null),
  ).find(Boolean);
  if (createdTilePosition) assert.deepEqual(created.at, createdTilePosition);
});

test("a five-match creates the lightball special", () => {
  const state = emptyState();
  put(state, 4, 1, gem("red-left-a", "red"));
  put(state, 4, 2, gem("red-left-b", "red"));
  put(state, 4, 3, gem("blue-middle", "blue"));
  put(state, 4, 4, gem("red-right-a", "red"));
  put(state, 4, 5, gem("red-right-b", "red"));
  put(state, 3, 3, gem("red-swap", "red"));

  const next = swapTiles(state, { row: 3, col: 3 }, { row: 4, col: 3 });

  assert.ok(next.specialEffects.some((effect) =>
    effect.type === "special-created" && effect.special === "lightball"));
});

test("a 2-by-2 match creates a propeller", () => {
  const state = emptyState();
  put(state, 4, 2, gem("red-square-a", "red"));
  put(state, 4, 3, gem("blue-square", "blue"));
  put(state, 5, 2, gem("red-square-b", "red"));
  put(state, 5, 3, gem("red-square-c", "red"));
  put(state, 3, 3, gem("red-swap", "red"));

  const next = swapTiles(state, { row: 3, col: 3 }, { row: 4, col: 3 });

  assert.ok(next.specialEffects.some((effect) =>
    effect.type === "special-created" && effect.special === "propeller"));
});

test("locked powers do not appear before their campaign unlock", () => {
  const state = emptyState(1);
  put(state, 3, 3, gem("top", "red"));
  put(state, 4, 2, gem("swap", "red"));
  put(state, 4, 3, gem("middle", "yellow"));
  put(state, 5, 3, gem("bottom-a", "red"));
  put(state, 6, 3, gem("bottom-b", "red"));
  const next = swapTiles(state, { row: 4, col: 2 }, { row: 4, col: 3 });
  assert.equal(next.specialEffects.some((effect) => effect.type === "special-created"), false);
  assert.deepEqual(next.unlockedSpecials, []);
});

test("a special tile triggers from its destination when swapped without a match", () => {
  const state = emptyState();
  put(state, 4, 2, gem("rocket", "yellow", "rocket-h"));
  put(state, 4, 3, gem("plain", "blue"));
  const next = swapTiles(state, { row: 4, col: 2 }, { row: 4, col: 3 });
  const rocket = next.specialEffects.find((effect) => effect.type === "rocket");
  assert.ok(rocket);
  assert.deepEqual(rocket.at, { row: 4, col: 3 });
});

test("a lightball swapped with a normal gem clears the partner's color", () => {
  const state = emptyState();
  put(state, 4, 2, gem("lightball", "blue", "lightball"));
  put(state, 4, 3, gem("partner", "red"));
  put(state, 6, 3, gem("blue-target", "blue"));
  const redTargets = [];
  for (let row = 0; row < BOARD_MASK.length; row += 1) {
    for (let col = 0; col < BOARD_MASK[row].length; col += 1) {
      if (!BOARD_MASK[row][col] || (row + col) % 2 !== 0 || state.board[row][col]) continue;
      if (col === 3 && (row === 3 || row === 5)) continue;
      const target = gem(`red-target-${row}-${col}`, "red");
      state.board[row][col] = target;
      redTargets.push(target.id);
    }
  }

  const next = swapTiles(state, { row: 4, col: 2 }, { row: 4, col: 3 });
  const lightball = next.specialEffects.find((effect) => effect.type === "lightball");
  const clearedIds = new Set(next.clearedCells.map(({ tileId }) => tileId));

  assert.equal(lightball?.color, "red");
  assert.ok(redTargets.length > 22, "the test must include more targets than the former animation cap");
  assert.ok(redTargets.every((id) => clearedIds.has(id)));
  assert.ok(clearedIds.has("partner"));
  assert.equal(clearedIds.has("blue-target"), false);
});

test("a vertical rocket clears its column and reports a vertical beam", () => {
  const state = emptyState();
  put(state, 4, 2, gem("rocket", "yellow", "rocket-v"));
  put(state, 4, 3, gem("plain", "blue"));
  put(state, 2, 3, gem("column-target", "green"));

  const next = swapTiles(state, { row: 4, col: 2 }, { row: 4, col: 3 });
  const rocket = next.specialEffects.find((effect) => effect.type === "rocket");

  assert.equal(rocket?.orientation, "vertical");
  assert.ok(next.clearedCells.some((cell) => cell.row === 2 && cell.col === 3));
});

test("a horizontal rocket clears its row and reports a horizontal beam", () => {
  const state = emptyState();
  put(state, 4, 2, gem("rocket", "yellow", "rocket-h"));
  put(state, 4, 3, gem("plain", "blue"));
  put(state, 4, 6, gem("row-target", "green"));

  const next = swapTiles(state, { row: 4, col: 2 }, { row: 4, col: 3 });
  const rocket = next.specialEffects.find((effect) => effect.type === "rocket");

  assert.equal(rocket?.orientation, "horizontal");
  assert.ok(next.clearedCells.some((cell) => cell.row === 4 && cell.col === 6));
});

test("a TNT tile clears its surrounding 3-by-3 area", () => {
  const state = emptyState();
  put(state, 4, 2, gem("tnt", "yellow", "tnt"));
  put(state, 4, 3, gem("plain", "blue"));
  put(state, 3, 2, gem("blast-target", "green"));
  put(state, 2, 2, gem("outside-target", "red"));

  const next = swapTiles(state, { row: 4, col: 2 }, { row: 4, col: 3 });
  const initialWave = next.specialEffects.find((effect) => effect.type === "match-clear");

  assert.ok(next.specialEffects.some((effect) => effect.type === "tnt"));
  assert.ok(initialWave?.cells.some((cell) => cell.row === 3 && cell.col === 2));
  assert.equal(initialWave?.cells.some((cell) => cell.row === 2 && cell.col === 2), false);
});

test("a propeller flies to and clears one priority target", () => {
  const state = emptyState();
  put(state, 4, 2, gem("propeller", "green", "propeller"));
  put(state, 4, 3, gem("plain", "blue"));
  put(state, 4, 4, blocker("prop-target", "vault", 1));

  const next = swapTiles(state, { row: 4, col: 2 }, { row: 4, col: 3 });
  const propeller = next.specialEffects.find((effect) => effect.type === "propeller");

  assert.deepEqual(propeller?.to, { row: 4, col: 4 });
  assert.ok(next.specialEffects.some((effect) =>
    effect.type === "blocker-hit" && effect.at?.row === 4 && effect.at?.col === 4));
});

test("hammer damages blockers without consuming a move and opens a safe in tiers", () => {
  const state = emptyState();
  put(state, 4, 2, blocker("vault-target", "vault", 2));
  const first = useBooster(state, "hammer", { row: 4, col: 2 });
  assert.equal(first.movesLeft, 37);
  assert.equal(first.boosters.hammer, 16);
  assert.equal(first.board[4][2].hp, 1);
  const second = useBooster(first, "hammer", { row: 4, col: 2 });
  assert.equal(second.boosters.hammer, 15);
  assert.equal(second.goals.find(({ id }) => id === "vault").remaining, 7);
  assert.equal(second.board[4][2]?.kind, "gem");
});

test("clearing grass reveals and then removes its hidden topiary bear", () => {
  const state = emptyState();
  put(state, 4, 2, blocker("hidden-bear", "grass", 1, { reveal: "bear" }));
  const grass = useBooster(state, "hammer", { row: 4, col: 2 });
  assert.equal(grass.goals.find(({ id }) => id === "grass").remaining, 3);
  assert.equal(grass.board[4][2].type, "bear");
  assert.equal(grass.board[4][2].hp, 2);
  const firstBearHit = useBooster(grass, "hammer", { row: 4, col: 2 });
  assert.equal(firstBearHit.board[4][2].hp, 1);
  const removedBear = useBooster(firstBearHit, "hammer", { row: 4, col: 2 });
  assert.equal(removedBear.goals.find(({ id }) => id === "bear").remaining, 0);
  assert.equal(removedBear.board[4][2]?.kind, "gem");
});

test("hat and drill blockers complete their level objectives when cleared", () => {
  const hatState = emptyState();
  hatState.goals.push({ id: "hat", remaining: 1, total: 1 });
  put(hatState, 4, 2, blocker("hat-target", "hat", 1));
  const hatResult = useBooster(hatState, "hammer", { row: 4, col: 2 });
  assert.equal(hatResult.goals.find(({ id }) => id === "hat").remaining, 0);

  const drillState = emptyState();
  drillState.goals.push({ id: "drill", remaining: 1, total: 1 });
  put(drillState, 4, 2, blocker("drill-target", "drill", 1));
  const drillResult = useBooster(drillState, "hammer", { row: 4, col: 2 });
  assert.equal(drillResult.goals.find(({ id }) => id === "drill").remaining, 0);
});

test("double lightball combination clears the board and is shown in the effect log", () => {
  const state = emptyState();
  put(state, 4, 3, gem("light-a", "pink", "lightball"));
  put(state, 4, 4, gem("light-b", "blue", "lightball"));
  put(state, 4, 2, gem("nearby", "green"));
  const next = swapTiles(state, { row: 4, col: 3 }, { row: 4, col: 4 });
  assert.equal(next.movesLeft, 36);
  assert.ok(next.specialEffects.some((effect) => effect.combo === "double-lightball"));
  // Refill can create additional valid matches, so cascades may clear more than the three placed gems.
  assert.ok(next.goals.find(({ id }) => id === "gems").remaining <= 38);
});

test("a long cascade resolves every match instead of stopping with a matched board", () => {
  const state = emptyState();
  state.board = BOARD_MASK.map((row, rowIndex) => row.map((playable, colIndex) =>
    playable ? gem(`red-${rowIndex}-${colIndex}`, "red") : null,
  ));
  const originalRandom = Math.random;

  try {
    // Force each ordinary refill to keep producing the longest possible chain.
    Math.random = () => 0;
    const next = useBooster(state, "jester", { row: 4, col: 3 });
    assert.equal(next.turnId, state.turnId + 1);
    assert.ok(next.cascades > 24, "the test must pass through the old cascade limit");
    assert.equal(findMatches(next.board).size, 0);
  } finally {
    Math.random = originalRandom;
  }
});
