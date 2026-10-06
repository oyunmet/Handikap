import test from "node:test";
import assert from "node:assert/strict";
import { createLevelState, fireLightSeed, swapTiles } from "./game.js";

function makeQuietState() {
  const state = createLevelState(1);
  state.board = Array.from({ length: 8 }, (_, row) =>
    Array.from({ length: 8 }, (_, col) => ({
      id: `fixture-${row}-${col}`,
      type: (row * 2 + col) % 5,
    })),
  );
  state.collected = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  return state;
}

function withRandomValues(values, callback) {
  const original = Math.random;
  let index = 0;
  Math.random = () => values[index++] ?? 0.91;
  try {
    return callback();
  } finally {
    Math.random = original;
  }
}

test("a four-tile line creates a rocket that remains on the board", () => {
  const state = makeQuietState();
  state.board[2][2].type = 0;
  state.board[3][1].type = 0;
  state.board[3][2].type = 1;
  state.board[3][3].type = 0;
  state.board[3][4].type = 0;

  const next = swapTiles(state, { row: 2, col: 2 }, { row: 3, col: 2 });
  const rocket = next.specialEffects.find((effect) => effect.type === "rocket-created");
  const rocketTile = next.board.flatMap((row, rowIndex) =>
    row.map((tile, colIndex) => tile?.special?.startsWith("rocket-") ? { tile, row: rowIndex, col: colIndex } : null),
  ).find(Boolean);

  assert.ok(rocket, "the move should create a rocket");
  assert.ok(rocketTile, "the rocket should remain playable");
  assert.deepEqual(rocket.at, { row: rocketTile.row, col: rocketTile.col });
  assert.equal(next.movesLeft, state.movesLeft - 1);
});

test("a level is won when its tile targets are met without a fog goal", () => {
  const state = makeQuietState();
  state.collected = { 0: 0, 1: 13, 2: 14, 3: 0, 4: 0 };
  state.board[2][2].type = 1;
  state.board[3][0].type = 0;
  state.board[3][1].type = 1;
  state.board[3][2].type = 0;
  state.board[3][3].type = 1;
  state.board[3][4].type = 1;
  state.board[3][5].type = 0;

  const next = swapTiles(state, { row: 2, col: 2 }, { row: 3, col: 2 });

  assert.equal(next.status, "won");
  assert.equal("fog" in next, false);
});

test("a T-shaped match creates a bomb on the board", () => {
  const state = makeQuietState();
  state.board[3][2].type = 0;
  state.board[3][3].type = 1;
  state.board[3][4].type = 0;
  state.board[3][5].type = 0;
  state.board[2][3].type = 0;
  state.board[4][3].type = 0;

  const next = swapTiles(state, { row: 3, col: 2 }, { row: 3, col: 3 });
  const bomb = next.board.flat().find((tile) => tile.special === "bomb");
  const bombEffect = next.specialEffects.find((effect) => effect.type === "bomb-created");
  const bombPosition = next.board.flatMap((row, rowIndex) =>
    row.map((tile, colIndex) => tile.special === "bomb" ? { row: rowIndex, col: colIndex } : null),
  ).find(Boolean);

  assert.ok(bomb, "the T-shaped match should leave a bomb for a later move");
  assert.ok(bombEffect);
  assert.deepEqual(bombEffect.at, bombPosition, "the creation animation should follow the bomb after gravity");
});

test("a 2-by-2 match creates a propeller", () => {
  const state = makeQuietState();
  state.board[2][3].type = 1;
  state.board[3][3].type = 0;
  state.board[3][4].type = 1;
  state.board[3][5].type = 2;
  state.board[4][3].type = 1;
  state.board[4][4].type = 1;
  state.board[4][5].type = 2;

  const next = swapTiles(state, { row: 2, col: 3 }, { row: 3, col: 3 });
  const propeller = next.board.flatMap((row, rowIndex) =>
    row.map((tile, colIndex) => tile?.special === "fish" ? { row: rowIndex, col: colIndex } : null),
  ).find(Boolean);

  assert.ok(next.specialEffects.some((effect) => effect.type === "fish-created"));
  assert.ok(propeller, "the 2-by-2 match should leave a propeller");
});

test("a five-tile line creates a light ball", () => {
  const state = makeQuietState();
  state.board[2][3].type = 0;
  state.board[3][1].type = 0;
  state.board[3][2].type = 0;
  state.board[3][3].type = 1;
  state.board[3][4].type = 0;
  state.board[3][5].type = 0;

  const next = swapTiles(state, { row: 2, col: 3 }, { row: 3, col: 3 });
  const lightBall = next.board.flat().find((tile) => tile?.special === "prism");

  assert.ok(lightBall, "a five-tile line should create a light ball");
  assert.ok(next.specialEffects.some((effect) => effect.type === "prism-created"));
});

test("a five-tile run keeps the prism on the match line", () => {
  const state = makeQuietState();
  state.board[3][0].type = 0;
  state.board[3][1].type = 0;
  state.board[3][2].type = 1;
  for (let col = 3; col < 8; col += 1) state.board[3][col].type = 0;

  const refillValues = [0.18, 0.99, 0.35, 0.99, 0.52, 0.99, 0.68, 0.99, 0.85, 0.99, 0.01, 0.99, 0.35, 0.99];
  const next = withRandomValues(refillValues, () =>
    swapTiles(state, { row: 2, col: 2 }, { row: 3, col: 2 }),
  );
  const prism = next.board.flat().find((tile) => tile.special === "prism");
  const effect = next.specialEffects.find((item) => item.type === "prism-created");
  const prismPosition = next.board.flatMap((row, rowIndex) =>
    row.map((tile, colIndex) => tile.special === "prism" ? { row: rowIndex, col: colIndex } : null),
  ).find(Boolean);

  assert.ok(prism, "the eight-match should leave a prism for a later move");
  assert.ok(effect);
  assert.deepEqual(effect.at, prismPosition, "the creation animation should follow the prism after gravity");
  assert.ok(!next.clearedCells.some(({ row, col }) => row === prismPosition.row && col === prismPosition.col));
});

test("swapping a prism with a normal tile clears every tile of that color", () => {
  const state = makeQuietState();
  state.board[3][3] = { id: "fixture-prism", type: 0, special: "prism" };
  state.board[3][4] = { id: "fixture-target", type: 2 };
  state.board[0][0].type = 2;
  state.board[1][6].type = 2;
  state.board[7][7].type = 2;

  const next = swapTiles(state, { row: 3, col: 3 }, { row: 3, col: 4 });
  const effect = next.specialEffects.find((item) => item.type === "prism-explosion");

  assert.ok(effect, "using the prism should show its activation effect");
  assert.equal(effect.color, 2);
  assert.deepEqual(effect.at, { row: 3, col: 4 });
  for (const cell of [{ row: 0, col: 0 }, { row: 1, col: 6 }, { row: 3, col: 3 }, { row: 7, col: 7 }]) {
    assert.ok(next.clearedCells.some((cleared) => cleared.row === cell.row && cleared.col === cell.col), `expected ${cell.row},${cell.col} to be cleared`);
  }
  assert.equal(next.movesLeft, state.movesLeft - 1);
});

test("swapping a bomb clears its surrounding 3 by 3 area", () => {
  const state = makeQuietState();
  state.board[3][3] = { id: "fixture-bomb", type: 0, special: "bomb" };

  const next = swapTiles(state, { row: 3, col: 3 }, { row: 3, col: 4 });

  assert.ok(next.specialEffects.some((effect) => effect.type === "bomb-explosion" && effect.at.row === 3 && effect.at.col === 4));
  for (let row = 2; row <= 4; row += 1) {
    for (let col = 3; col <= 5; col += 1) {
      assert.ok(next.clearedCells.some((cell) => cell.row === row && cell.col === col), `expected ${row},${col} to be cleared`);
    }
  }
  assert.equal(next.movesLeft, state.movesLeft - 1);
});

test("the light seed also triggers bombs inside its target area", () => {
  const state = makeQuietState();
  state.lightCharge = 100;
  state.board[3][3] = { id: "fixture-bomb", type: 0, special: "bomb" };

  const next = fireLightSeed(state, { row: 3, col: 3 });

  assert.ok(next.specialEffects.some((effect) => effect.type === "bomb-explosion" && effect.at.row === 3 && effect.at.col === 3));
  assert.ok(next.clearedCells.some(({ row, col }) => row === 2 && col === 2));
  assert.ok(next.lightCharge > 0 && next.lightCharge <= 100, "tiles cleared by the seed recharge its meter");
  assert.equal(next.movesLeft, state.movesLeft, "using the seed does not spend a move");
});
