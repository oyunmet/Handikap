import test from "node:test";
import assert from "node:assert/strict";
import {
  BOARD_SIZE,
  DUEL_MOVES,
  TILE_TYPES,
  chooseBotMove,
  createDuelState,
  findMatchRuns,
  findMatches,
  hasLegalMove,
  isAdjacent,
  resolveDuelMove,
} from "./duel.js";

test("seeded boards are identical, match-free, and playable", () => {
  const first = createDuelState(39405);
  const second = createDuelState(39405);
  assert.deepEqual(first.board, second.board);
  assert.equal(findMatches(first.board).size, 0);
  assert.equal(hasLegalMove(first.board), true);
  assert.equal(first.board.length, BOARD_SIZE);
  assert.equal(first.board.flat().length, BOARD_SIZE * BOARD_SIZE);
  assert.ok(first.board.flat().every((tile) => TILE_TYPES.includes(tile.type)));
});

test("only adjacent, matching swaps consume a move", () => {
  const state = createDuelState(1492);
  const invalid = resolveDuelMove(state, 0, BOARD_SIZE + 2);
  assert.equal(invalid.accepted, false);
  assert.equal(invalid.state, state);
  assert.equal(state.movesLeft, DUEL_MOVES);
  assert.equal(isAdjacent(0, 1), true);
  assert.equal(isAdjacent(0, BOARD_SIZE + 1), false);
});

test("the bot selects a legal move and a valid turn scores and settles", () => {
  const state = createDuelState(481);
  const move = chooseBotMove(state, "hard");
  assert.ok(move);
  const result = resolveDuelMove(state, move.first, move.second);
  assert.equal(result.accepted, true);
  assert.equal(result.state.movesLeft, DUEL_MOVES - 1);
  assert.ok(result.state.lastScore > 0);
  assert.ok(result.state.score > 0);
  assert.equal(findMatches(result.state.board).size, 0);
});

test("run detection recognizes horizontal and vertical matches", () => {
  const board = Array.from({ length: BOARD_SIZE }, (_, row) =>
    Array.from({ length: BOARD_SIZE }, (_, col) => ({
      type: ["sword", "shield", "fire", "ice", "arrow", "heart"][(row * 2 + col * 3) % TILE_TYPES.length],
      special: null,
    })),
  );
  board[0][0].type = "sword";
  board[0][1].type = "sword";
  board[0][2].type = "sword";
  board[0][3].type = "sword";
  assert.ok(findMatchRuns(board).some((run) => run.orientation === "horizontal" && run.cells.length >= 4));
});

function createMatchFreeBoard() {
  return Array.from({ length: BOARD_SIZE }, (_, row) =>
    Array.from({ length: BOARD_SIZE }, (_, col) => ({
      type: TILE_TYPES[(row * 2 + col * 3) % TILE_TYPES.length],
      special: null,
    })),
  );
}

test("a prism cleared by swapping it targets the partner tile's color", () => {
  const state = createDuelState(1138);
  state.board = createMatchFreeBoard();
  state.board[1][1] = { type: "sword", special: "prism" };
  state.board[1][2] = { type: "fire", special: null };
  const originalFireTiles = state.board.flatMap((row, rowIndex) =>
    row.flatMap((tile, colIndex) => tile.type === "fire" ? [rowIndex * BOARD_SIZE + colIndex] : []),
  );

  const result = resolveDuelMove(state, BOARD_SIZE + 1, BOARD_SIZE + 2);

  assert.equal(result.accepted, true);
  for (const index of originalFireTiles) {
    assert.ok(result.state.lastWaves[0].cells.includes(index), `fire tile ${index} should clear in the first wave`);
  }
});

test("special tiles triggered by another special continue their chain", () => {
  const state = createDuelState(319);
  state.board = createMatchFreeBoard();
  state.board[3][2] = { type: "shield", special: "row" };
  state.board[3][5] = { type: "ice", special: "bomb" };

  const result = resolveDuelMove(state, 3 * BOARD_SIZE + 2, 3 * BOARD_SIZE + 1);

  assert.equal(result.accepted, true);
  assert.ok(result.state.lastWaves[0].effects.some((effect) => effect.type === "row"));
  assert.ok(result.state.lastWaves[0].effects.some((effect) => effect.type === "bomb"));
});
