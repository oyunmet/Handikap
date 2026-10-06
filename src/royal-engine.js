export const BOARD_ROWS = 10;
export const BOARD_COLS = 8;

export const GEM_COLORS = ["red", "yellow", "blue", "green", "pink"];

export const BOOSTER_DEFAULTS = {
  hammer: 17,
  bow: 22,
  cannon: 16,
  jester: 26,
};

export const BOARD_MASK = [
  [0, 0, 0, 0, 1, 1, 1, 1],
  [0, 0, 0, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
];

const GOAL_TOTALS = { vault: 8, bear: 1, grass: 4, gems: 41 };
const keyOf = (row, col) => `${row}:${col}`;
const cellFromKey = (key) => key.split(":").map(Number);
const inside = (row, col) =>
  row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS;
const isPlayable = (row, col) => Boolean(BOARD_MASK[row]?.[col]);
const isGem = (cell) => cell?.kind === "gem";
const isBlocker = (cell) => cell?.kind === "blocker";
const cloneBoard = (board) => board.map((row) => row.map((cell) => cell && { ...cell }));

let nextTileId = 1;

function makeGem(color = GEM_COLORS[Math.floor(Math.random() * GEM_COLORS.length)]) {
  return { id: `gem-${nextTileId++}`, kind: "gem", color };
}

function makeBlocker(type, row, col, hp, extra = {}) {
  return {
    id: `${type}-${row}-${col}`,
    kind: "blocker",
    type,
    hp,
    maxHp: hp,
    ...extra,
  };
}

function createBlockerLayout() {
  const blockers = new Map();
  for (let row = 2; row <= 5; row += 1) {
    for (let col = 0; col <= 1; col += 1) {
      blockers.set(keyOf(row, col), makeBlocker("vault", row, col, 2));
    }
  }

  const grasses = [
    [2, 4],
    [2, 5],
    [3, 4],
    [3, 5],
  ];
  grasses.forEach(([row, col], index) => {
    blockers.set(
      keyOf(row, col),
      makeBlocker("grass", row, col, 1, index === 2 ? { reveal: "bear" } : {}),
    );
  });

  for (const [row, col] of [[8, 1], [8, 6], [9, 2], [9, 5]]) {
    blockers.set(keyOf(row, col), makeBlocker("hat", row, col, 1));
  }
  blockers.set(keyOf(9, 4), makeBlocker("drill", 9, 4, 3));
  return blockers;
}

function createsRunAt(board, row, col, color) {
  const matchesIn = (dr, dc) => {
    let count = 1;
    for (const direction of [-1, 1]) {
      let nextRow = row + dr * direction;
      let nextCol = col + dc * direction;
      while (
        inside(nextRow, nextCol) &&
        isGem(board[nextRow]?.[nextCol]) &&
        board[nextRow][nextCol].color === color
      ) {
        count += 1;
        nextRow += dr * direction;
        nextCol += dc * direction;
      }
    }
    return count >= 3;
  };
  return matchesIn(0, 1) || matchesIn(1, 0);
}

function fillNewGems(board, blockers = new Map()) {
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      if (!isPlayable(row, col)) {
        board[row][col] = null;
        continue;
      }
      const key = keyOf(row, col);
      if (blockers.has(key)) {
        board[row][col] = { ...blockers.get(key) };
        continue;
      }
      if (isGem(board[row][col])) continue;
      let gem = makeGem();
      let attempts = 0;
      while (createsRunAt(board, row, col, gem.color) && attempts < 30) {
        gem = makeGem();
        attempts += 1;
      }
      board[row][col] = gem;
    }
  }
  return board;
}

function createPlayableBoard() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const board = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
    fillNewGems(board, createBlockerLayout());
    if (findMatches(board).size === 0 && hasAvailableSwap(board)) return board;
  }

  const board = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
  fillNewGems(board, createBlockerLayout());
  // Keep a guaranteed legal move without creating a match before the first turn.
  const setColor = (row, col, color) => {
    if (isGem(board[row][col])) board[row][col] = { ...board[row][col], color };
  };
  setColor(4, 5, "yellow");
  setColor(4, 6, "red");
  setColor(4, 7, "blue");
  setColor(5, 5, "red");
  setColor(5, 6, "blue");
  setColor(5, 7, "red");
  setColor(6, 5, "green");
  setColor(6, 6, "red");
  setColor(6, 7, "yellow");
  return board;
}

function findMatchRuns(board) {
  const runs = [];
  const rowCount = board.length;
  const colCount = board[0]?.length ?? 0;

  for (let row = 0; row < rowCount; row += 1) {
    for (let col = 0; col < colCount;) {
      const cell = board[row][col];
      if (!isGem(cell)) {
        col += 1;
        continue;
      }
      let end = col + 1;
      while (end < colCount && isGem(board[row][end]) && board[row][end].color === cell.color) {
        end += 1;
      }
      if (end - col >= 3) {
        runs.push({
          color: cell.color,
          orientation: "horizontal",
          cells: Array.from({ length: end - col }, (_, offset) => ({ row, col: col + offset })),
        });
      }
      col = end;
    }
  }

  for (let col = 0; col < colCount; col += 1) {
    for (let row = 0; row < rowCount;) {
      const cell = board[row][col];
      if (!isGem(cell)) {
        row += 1;
        continue;
      }
      let end = row + 1;
      while (end < rowCount && isGem(board[end][col]) && board[end][col].color === cell.color) {
        end += 1;
      }
      if (end - row >= 3) {
        runs.push({
          color: cell.color,
          orientation: "vertical",
          cells: Array.from({ length: end - row }, (_, offset) => ({ row: row + offset, col })),
        });
      }
      row = end;
    }
  }

  for (let row = 0; row < rowCount - 1; row += 1) {
    for (let col = 0; col < colCount - 1; col += 1) {
      const color = board[row][col]?.color;
      if (
        color &&
        board[row][col + 1]?.color === color &&
        board[row + 1][col]?.color === color &&
        board[row + 1][col + 1]?.color === color
      ) {
        runs.push({
          color,
          orientation: "square",
          cells: [
            { row, col },
            { row, col: col + 1 },
            { row: row + 1, col },
            { row: row + 1, col: col + 1 },
          ],
        });
      }
    }
  }
  return runs;
}

export function findMatches(board) {
  return new Set(findMatchRuns(board).flatMap((run) => run.cells.map(({ row, col }) => keyOf(row, col))));
}

export function isAdjacent(first, second) {
  return Math.abs(first.row - second.row) + Math.abs(first.col - second.col) === 1;
}

export function hasAvailableSwap(board) {
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < (board[row]?.length ?? 0); col += 1) {
      if (!isGem(board[row][col])) continue;
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const otherRow = row + dr;
        const otherCol = col + dc;
        if (!isGem(board[otherRow]?.[otherCol])) continue;
        const swapped = cloneBoard(board);
        [swapped[row][col], swapped[otherRow][otherCol]] = [
          swapped[otherRow][otherCol],
          swapped[row][col],
        ];
        if (findMatches(swapped).size > 0) return true;
        if (swapped[row][col].special || swapped[otherRow][otherCol].special) return true;
      }
    }
  }
  return false;
}

function setOfCells(cells) {
  return new Set(cells.map(({ row, col }) => keyOf(row, col)));
}

function preferredAnchor(cells, preferred) {
  for (const candidate of preferred) {
    if (cells.some((cell) => cell.row === candidate.row && cell.col === candidate.col)) {
      return candidate;
    }
  }
  return cells[Math.floor(cells.length / 2)] ?? null;
}

function planMatchWave(board, preferred = []) {
  const runs = findMatchRuns(board);
  if (!runs.length) return { clear: new Set(), effects: [] };

  const clear = setOfCells(runs.flatMap((run) => run.cells));
  const lineRuns = runs.filter((run) => run.orientation !== "square");
  const horizontal = lineRuns.filter((run) => run.orientation === "horizontal");
  const vertical = lineRuns.filter((run) => run.orientation === "vertical");
  let cross = null;
  for (const hRun of horizontal) {
    for (const vRun of vertical) {
      if (hRun.color !== vRun.color) continue;
      cross = hRun.cells.find((cell) =>
        vRun.cells.some((other) => other.row === cell.row && other.col === cell.col),
      );
      if (cross) break;
    }
    if (cross) break;
  }

  const five = lineRuns.find((run) => run.cells.length >= 5);
  const four = lineRuns.find((run) => run.cells.length === 4);
  const square = runs.find((run) => run.orientation === "square");
  let special = null;
  let anchorCells = [];

  if (cross) {
    special = "tnt";
    anchorCells = [cross];
  } else if (five) {
    special = "lightball";
    anchorCells = five.cells;
  } else if (four) {
    special = four.orientation === "horizontal" ? "rocket-h" : "rocket-v";
    anchorCells = four.cells;
  } else if (square) {
    special = "propeller";
    anchorCells = square.cells;
  }

  const effects = [];
  if (special) {
    const anchor = special === "tnt" ? cross : preferredAnchor(anchorCells, preferred);
    const tile = anchor && board[anchor.row]?.[anchor.col];
    if (tile) {
      board[anchor.row][anchor.col] = { ...tile, special };
      clear.delete(keyOf(anchor.row, anchor.col));
      effects.push({ type: "special-created", special, tileId: tile.id, at: anchor });
    }
  }
  return { clear, effects };
}

function addCell(clear, row, col, board) {
  if (inside(row, col) && isPlayable(row, col) && board[row]?.[col]) clear.add(keyOf(row, col));
}

function choosePropellerTarget(board, clear, goals, from) {
  const priority = { vault: 4, grass: 3, bear: 3, drill: 2, hat: 1 };
  let best = null;
  let bestScore = -Infinity;
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      const cell = board[row][col];
      if (!cell || clear.has(keyOf(row, col))) continue;
      const distance = Math.abs(row - from.row) + Math.abs(col - from.col);
      let score = -distance;
      if (isBlocker(cell)) {
        const goal = goals.find((item) => item.id === cell.type);
        score += (priority[cell.type] ?? 0) * 10 + (goal?.remaining > 0 ? 14 : 0);
      }
      if (score > bestScore) {
        bestScore = score;
        best = { row, col };
      }
    }
  }
  return best;
}

function expandSpecials(board, initialClear, effects, goals) {
  const clear = new Set(initialClear);
  const queue = [...clear];
  const triggered = new Set();
  while (queue.length) {
    const key = queue.pop();
    if (triggered.has(key)) continue;
    triggered.add(key);
    const [row, col] = cellFromKey(key);
    const cell = board[row]?.[col];
    if (!isGem(cell) || !cell.special) continue;

    const add = (targetRow, targetCol) => {
      if (!inside(targetRow, targetCol) || !isPlayable(targetRow, targetCol)) return;
      const targetKey = keyOf(targetRow, targetCol);
      if (!clear.has(targetKey) && board[targetRow]?.[targetCol]) {
        clear.add(targetKey);
        queue.push(targetKey);
      }
    };

    if (cell.special === "rocket-h" || cell.special === "rocket-v") {
      const horizontal = cell.special === "rocket-h";
      effects.push({ type: "rocket", orientation: horizontal ? "horizontal" : "vertical", at: { row, col } });
      for (let index = 0; index < (horizontal ? BOARD_COLS : BOARD_ROWS); index += 1) {
        add(horizontal ? row : index, horizontal ? index : col);
      }
    } else if (cell.special === "tnt") {
      effects.push({ type: "tnt", at: { row, col } });
      for (let targetRow = row - 1; targetRow <= row + 1; targetRow += 1) {
        for (let targetCol = col - 1; targetCol <= col + 1; targetCol += 1) {
          add(targetRow, targetCol);
        }
      }
    } else if (cell.special === "lightball") {
      effects.push({ type: "lightball", at: { row, col }, color: cell.color });
      for (let targetRow = 0; targetRow < BOARD_ROWS; targetRow += 1) {
        for (let targetCol = 0; targetCol < BOARD_COLS; targetCol += 1) {
          if (board[targetRow][targetCol]?.color === cell.color) add(targetRow, targetCol);
        }
      }
    } else if (cell.special === "propeller") {
      const target = choosePropellerTarget(board, clear, goals, { row, col });
      effects.push({ type: "propeller", from: { row, col }, to: target });
      if (target) add(target.row, target.col);
    }
  }
  return clear;
}

function updateGoal(goals, id, amount = 1) {
  return goals.map((goal) =>
    goal.id === id ? { ...goal, remaining: Math.max(0, goal.remaining - amount) } : goal,
  );
}

function syncCreatedSpecialPositions(board, effects) {
  for (let index = 0; index < effects.length; index += 1) {
    const effect = effects[index];
    if (effect.type !== "special-created" || !effect.tileId) continue;
    for (let row = 0; row < BOARD_ROWS; row += 1) {
      const col = board[row].findIndex((cell) => cell?.id === effect.tileId);
      if (col >= 0) {
        effects[index] = { ...effect, at: { row, col } };
        break;
      }
    }
  }
}

function hitBlocker(board, row, col, goals, effects, drillClear) {
  const cell = board[row]?.[col];
  if (!isBlocker(cell)) return { goals, changed: false };
  const hp = cell.hp - 1;
  effects.push({ type: "blocker-hit", blocker: cell.type, at: { row, col }, hp: Math.max(0, hp) });
  if (hp > 0) {
    board[row][col] = { ...cell, hp };
    return { goals, changed: true };
  }

  effects.push({ type: "blocker-break", blocker: cell.type, at: { row, col } });
  if (cell.type === "vault") {
    goals = updateGoal(goals, "vault");
    board[row][col] = null;
  } else if (cell.type === "grass") {
    goals = updateGoal(goals, "grass");
    board[row][col] = cell.reveal === "bear"
      ? makeBlocker("bear", row, col, 2)
      : null;
  } else if (cell.type === "bear") {
    goals = updateGoal(goals, "bear");
    board[row][col] = null;
  } else if (cell.type === "drill") {
    board[row][col] = null;
    effects.push({ type: "drill-launch", at: { row, col } });
    for (let targetCol = 0; targetCol < BOARD_COLS; targetCol += 1) {
      addCell(drillClear, row, targetCol, board);
    }
  } else {
    board[row][col] = null;
  }
  return { goals, changed: true };
}

function refillGravity(board) {
  const before = new Map();
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      if (isGem(board[row][col])) before.set(board[row][col].id, { row, col });
    }
  }

  for (let col = 0; col < BOARD_COLS; col += 1) {
    let row = 0;
    while (row < BOARD_ROWS) {
      if (!isPlayable(row, col) || isBlocker(board[row][col])) {
        row += 1;
        continue;
      }
      let end = row;
      while (end < BOARD_ROWS && isPlayable(end, col) && !isBlocker(board[end][col])) end += 1;
      const survivors = [];
      for (let index = end - 1; index >= row; index -= 1) {
        if (isGem(board[index][col])) survivors.push(board[index][col]);
      }
      for (let source = 0; source < survivors.length; source += 1) {
        board[end - 1 - source][col] = survivors[source];
      }
      const firstSurvivorRow = end - survivors.length;
      for (let targetRow = row; targetRow < firstSurvivorRow; targetRow += 1) {
        let tile = makeGem();
        let attempts = 0;
        while (createsRunAt(board, targetRow, col, tile.color) && attempts < 30) {
          tile = makeGem();
          attempts += 1;
        }
        board[targetRow][col] = tile;
      }
      row = end;
    }
  }

  const falling = [];
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      const cell = board[row][col];
      if (!isGem(cell)) continue;
      const from = before.get(cell.id);
      if (!from || from.row !== row) {
        falling.push({ id: cell.id, fromRow: from?.row ?? -1, fromCol: from?.col ?? col, toRow: row, toCol: col });
      }
    }
  }
  return falling;
}

function reshuffleBoard(board) {
  const next = cloneBoard(board);
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const working = cloneBoard(next);
    for (let row = 0; row < BOARD_ROWS; row += 1) {
      for (let col = 0; col < BOARD_COLS; col += 1) {
        if (!isPlayable(row, col) || isBlocker(working[row][col])) continue;
        working[row][col] = null;
      }
    }
    fillNewGems(working);
    if (findMatches(working).size === 0 && hasAvailableSwap(working)) return working;
  }
  return next;
}

function finishGame(state) {
  if (state.goals.every((goal) => goal.remaining <= 0)) {
    return { ...state, status: "won", message: "Tüm hedefler tamamlandı!" };
  }
  if (state.movesLeft <= 0) {
    return { ...state, status: "lost", message: "Hamlelerin bitti. Yeniden deneyebilirsin." };
  }
  return state;
}

function settle(state, initialClear, initialEffects = [], preferred = []) {
  const next = {
    ...state,
    board: cloneBoard(state.board),
    goals: [...state.goals],
    boosters: { ...state.boosters },
    specialEffects: [...initialEffects],
    clearedCells: [],
    fallingTiles: [],
    cascades: 0,
    message: "",
  };
  let clear = new Set(initialClear);
  let safety = 0;

  while (clear.size && safety < 24) {
    if (!clear.size) {
      const plan = planMatchWave(next.board, preferred);
      clear = plan.clear;
      next.specialEffects.push(...plan.effects);
      preferred = [];
    }
    if (!clear.size) break;

    clear = expandSpecials(next.board, clear, next.specialEffects, next.goals);
    const currentWave = new Set(clear);
    const blockerHits = new Set();
    const drillClear = new Set();
    let removedGems = 0;

    for (const key of currentWave) {
      const [row, col] = cellFromKey(key);
      if (isBlocker(next.board[row]?.[col])) {
        blockerHits.add(key);
        continue;
      }
      const cell = next.board[row]?.[col];
      if (!isGem(cell)) continue;
      next.board[row][col] = null;
      removedGems += 1;
      next.clearedCells.push({ row, col, color: cell.color });
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const targetRow = row + dr;
        const targetCol = col + dc;
        if (inside(targetRow, targetCol) && isBlocker(next.board[targetRow][targetCol])) {
          blockerHits.add(keyOf(targetRow, targetCol));
        }
      }
    }

    for (const key of blockerHits) {
      const [row, col] = cellFromKey(key);
      const result = hitBlocker(next.board, row, col, next.goals, next.specialEffects, drillClear);
      next.goals = result.goals;
    }
    if (removedGems > 0) {
      next.goals = updateGoal(next.goals, "gems", removedGems);
      next.score += removedGems * (100 + Math.min(150, next.cascades * 50));
    }
    next.cascades += 1;

    if (drillClear.size) {
      clear = drillClear;
    } else {
      next.fallingTiles.push(...refillGravity(next.board));
      const plan = planMatchWave(next.board, []);
      clear = plan.clear;
      next.specialEffects.push(...plan.effects);
    }
    safety += 1;
  }

  next.clearedCells = [...new Map(next.clearedCells.map((cell) => [keyOf(cell.row, cell.col), cell])).values()];
  syncCreatedSpecialPositions(next.board, next.specialEffects);
  if (!hasAvailableSwap(next.board)) {
    next.board = reshuffleBoard(next.board);
    next.message = "Taşlar yeniden karıştırıldı.";
  }
  return finishGame(next);
}

export function createGameState() {
  return {
    board: createPlayableBoard(),
    goals: Object.entries(GOAL_TOTALS).map(([id, total]) => ({ id, remaining: total, total })),
    movesLeft: 37,
    totalMoves: 37,
    score: 0,
    status: "playing",
    boosters: { ...BOOSTER_DEFAULTS },
    turnId: 0,
    cascades: 0,
    selectedCell: null,
    clearedCells: [],
    fallingTiles: [],
    specialEffects: [],
    message: "",
  };
}

function addLine(clear, row, col, orientation, board) {
  if (orientation === "horizontal") {
    for (let targetCol = 0; targetCol < BOARD_COLS; targetCol += 1) addCell(clear, row, targetCol, board);
  } else {
    for (let targetRow = 0; targetRow < BOARD_ROWS; targetRow += 1) addCell(clear, targetRow, col, board);
  }
}

function specialSwapClear(board, first, second) {
  const clear = new Set([keyOf(first.row, first.col), keyOf(second.row, second.col)]);
  const effects = [];
  const a = board[first.row][first.col];
  const b = board[second.row][second.col];
  const specials = [a, b].filter((cell) => cell?.special);
  const has = (name) => specials.some((cell) => cell.special === name);
  const center = { row: Math.round((first.row + second.row) / 2), col: Math.round((first.col + second.col) / 2) };

  if (has("lightball") && specials.filter((cell) => cell.special === "lightball").length === 2) {
    effects.push({ type: "combo", combo: "double-lightball", at: center });
    for (let row = 0; row < BOARD_ROWS; row += 1) {
      for (let col = 0; col < BOARD_COLS; col += 1) addCell(clear, row, col, board);
    }
    return { clear, effects };
  }

  if (has("lightball")) {
    const prism = specials.find((cell) => cell.special === "lightball");
    const partner = specials.find((cell) => cell !== prism) ?? (a === prism ? b : a);
    const color = partner?.color ?? prism.color;
    const partnerSpecial = partner?.special;
    effects.push({ type: "combo", combo: `lightball-${partnerSpecial ?? "gem"}`, at: center, color });
    for (let row = 0; row < BOARD_ROWS; row += 1) {
      for (let col = 0; col < BOARD_COLS; col += 1) {
        const cell = board[row][col];
        if (!isGem(cell) || cell.color !== color) continue;
        if (partnerSpecial === "tnt") {
          for (let targetRow = row - 1; targetRow <= row + 1; targetRow += 1) {
            for (let targetCol = col - 1; targetCol <= col + 1; targetCol += 1) {
              addCell(clear, targetRow, targetCol, board);
            }
          }
        } else if (partnerSpecial === "rocket-h" || partnerSpecial === "rocket-v") {
          board[row][col] = { ...cell, special: (row + col) % 2 ? "rocket-h" : "rocket-v" };
          addCell(clear, row, col, board);
        } else {
          addCell(clear, row, col, board);
        }
      }
    }
    return { clear, effects };
  }

  if (has("rocket-h") || has("rocket-v")) {
    effects.push({ type: "combo", combo: "rocket-pair", at: center });
    for (const cell of specials) {
      if (cell.special === "rocket-h" || cell.special === "rocket-v") {
        const position = cell === a ? first : second;
        addLine(clear, position.row, position.col, cell.special === "rocket-h" ? "horizontal" : "vertical", board);
      }
    }
    if (has("propeller")) {
      for (const row of [center.row - 1, center.row, center.row + 1]) {
        addLine(clear, row, center.col, "horizontal", board);
      }
    }
  } else if (has("tnt")) {
    effects.push({ type: "combo", combo: "tnt-pair", at: center });
    const radius = specials.length > 1 ? 2 : 1;
    for (let row = center.row - radius; row <= center.row + radius; row += 1) {
      for (let col = center.col - radius; col <= center.col + radius; col += 1) addCell(clear, row, col, board);
    }
  } else if (has("propeller")) {
    effects.push({ type: "combo", combo: "propeller-pair", at: center });
    for (const cell of specials) {
      const position = cell === a ? first : second;
      for (let row = position.row - 1; row <= position.row + 1; row += 1) {
        for (let col = position.col - 1; col <= position.col + 1; col += 1) addCell(clear, row, col, board);
      }
    }
  }
  return { clear, effects };
}

export function swapTiles(state, first, second) {
  if (state.status !== "playing" || !isAdjacent(first, second)) return state;
  const board = cloneBoard(state.board);
  const firstCell = board[first.row]?.[first.col];
  const secondCell = board[second.row]?.[second.col];
  if (!isGem(firstCell) || !isGem(secondCell)) {
    return { ...state, message: "Yalnızca taşları hareket ettirebilirsin." };
  }
  [board[first.row][first.col], board[second.row][second.col]] = [secondCell, firstCell];
  const runs = findMatchRuns(board);
  if (!runs.length && !firstCell.special && !secondCell.special) {
    return { ...state, message: "Eşleşme olmadı. Başka bir taş dene.", invalidSwap: [first, second] };
  }

  const next = {
    ...state,
    board,
    movesLeft: state.movesLeft - 1,
    turnId: state.turnId + 1,
    message: "",
    invalidSwap: null,
  };
  const bothSpecial = firstCell.special && secondCell.special;
  let clear = new Set();
  let effects = [];
  if (bothSpecial) {
    ({ clear, effects } = specialSwapClear(board, first, second));
  } else if (runs.length) {
    const plan = planMatchWave(board, [second, first]);
    clear = plan.clear;
    effects = plan.effects;
    if (firstCell.special || secondCell.special) {
      clear.add(keyOf(first.row, first.col));
      clear.add(keyOf(second.row, second.col));
    }
  } else {
    const activatedAt = firstCell.special ? second : first;
    clear.add(keyOf(activatedAt.row, activatedAt.col));
    effects.push({ type: "special-activate", at: activatedAt, special: firstCell.special ? firstCell.special : secondCell.special });
  }
  return settle(next, clear, effects, []);
}

export function useBooster(state, boosterId, target) {
  if (state.status !== "playing" || !BOOSTER_DEFAULTS[boosterId] || state.boosters[boosterId] <= 0) {
    return state;
  }
  if (!target || !inside(target.row, target.col) || !isPlayable(target.row, target.col)) return state;
  const board = cloneBoard(state.board);
  const clear = new Set();
  const effects = [{ type: "booster", booster: boosterId, at: target }];

  if (boosterId === "hammer") {
    if (!board[target.row][target.col]) return state;
    addCell(clear, target.row, target.col, board);
  } else if (boosterId === "bow") {
    addLine(clear, target.row, target.col, "horizontal", board);
  } else if (boosterId === "cannon") {
    for (let row = target.row - 1; row <= target.row + 1; row += 1) {
      for (let col = target.col - 1; col <= target.col + 1; col += 1) addCell(clear, row, col, board);
    }
  } else if (boosterId === "jester") {
    let color = board[target.row][target.col]?.color;
    if (!color) {
      const counts = Object.fromEntries(GEM_COLORS.map((item) => [item, 0]));
      board.flat().forEach((cell) => {
        if (isGem(cell)) counts[cell.color] += 1;
      });
      color = GEM_COLORS.sort((a, b) => counts[b] - counts[a])[0];
    }
    for (let row = 0; row < BOARD_ROWS; row += 1) {
      for (let col = 0; col < BOARD_COLS; col += 1) {
        if (board[row][col]?.color === color) addCell(clear, row, col, board);
      }
    }
  }

  if (!clear.size) return state;
  const next = {
    ...state,
    board,
    boosters: { ...state.boosters, [boosterId]: state.boosters[boosterId] - 1 },
    turnId: state.turnId + 1,
    message: "",
  };
  return settle(next, clear, effects);
}
