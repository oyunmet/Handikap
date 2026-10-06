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

const gem = (id, color, special) => ({ id, kind: "gem", color, ...(special ? { special } : {}) });
const blocker = (id, type, hp, extra = {}) => ({
  id,
  kind: "blocker",
  type,
  hp,
  maxHp: hp,
  ...extra,
});

function emptyState() {
  const state = createGameState();
  state.board = BOARD_MASK.map((row) => row.map(() => null));
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
  assert.equal(state.board.length, 10);
  assert.equal(state.board[0][0], null);
  assert.equal(state.board[0][7].kind, "gem");
  assert.equal(state.movesLeft, 37);
  assert.deepEqual(state.goals.map(({ id, remaining }) => [id, remaining]), [
    ["vault", 8],
    ["bear", 1],
    ["grass", 4],
    ["gems", 41],
  ]);
  assert.equal(findMatches(state.board).size, 0);
  assert.equal(hasAvailableSwap(state.board), true);
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

test("a special tile triggers from its destination when swapped without a match", () => {
  const state = emptyState();
  put(state, 4, 2, gem("rocket", "yellow", "rocket-h"));
  put(state, 4, 3, gem("plain", "blue"));
  const next = swapTiles(state, { row: 4, col: 2 }, { row: 4, col: 3 });
  const rocket = next.specialEffects.find((effect) => effect.type === "rocket");
  assert.ok(rocket);
  assert.deepEqual(rocket.at, { row: 4, col: 3 });
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
