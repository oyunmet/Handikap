export const TILE_META = [
  { name: "Yakut", color: "#ff5268", deep: "#c82642" },
  { name: "Zümrüt", color: "#63dc68", deep: "#258d3c" },
  { name: "Safir", color: "#4d9bff", deep: "#2258c8" },
  { name: "Ametist", color: "#c27aff", deep: "#803dc5" },
  { name: "Taç", color: "#ffd951", deep: "#d99919" },
  { name: "İnci", color: "#76dff0", deep: "#359bb8" },
];

export const REGIONS = [
  {
    id: "whisperwood",
    name: "Safir Krallığı",
    subtitle: "Bulutların üstündeki kalenin kapıları açılıyor.",
    levels: [1, 2, 3],
    theme: "forest",
    mark: "01",
  },
  {
    id: "coral",
    name: "Altın Saray",
    subtitle: "Güneş, mermer salonların üzerine doğuyor.",
    levels: [4, 5, 6],
    theme: "coral",
    mark: "02",
  },
  {
    id: "archive",
    name: "Yıldız Kalesi",
    subtitle: "Gece göğünde son bir taç ışıldıyor.",
    levels: [7, 8, 9],
    theme: "archive",
    mark: "03",
  },
];

export const LEVELS = [
  { id: 1, regionId: "whisperwood", name: "Kuzey Kapısı", moveLimit: 22, goals: [{ type: 0, count: 9 }, { type: 2, count: 9 }] },
  { id: 2, regionId: "whisperwood", name: "Kristal Avlu", moveLimit: 21, goals: [{ type: 1, count: 11 }, { type: 4, count: 10 }] },
  { id: 3, regionId: "whisperwood", name: "Taht Salonu", moveLimit: 20, goals: [{ type: 3, count: 12 }, { type: 5, count: 10 }] },
  { id: 4, regionId: "coral", name: "Güneş Galerisi", moveLimit: 21, goals: [{ type: 0, count: 11 }, { type: 4, count: 12 }] },
  { id: 5, regionId: "coral", name: "Altın Köprü", moveLimit: 20, goals: [{ type: 2, count: 14 }, { type: 5, count: 12 }] },
  { id: 6, regionId: "coral", name: "Mavi Kule", moveLimit: 19, goals: [{ type: 1, count: 14 }, { type: 3, count: 13 }] },
  { id: 7, regionId: "archive", name: "Yıldız Odası", moveLimit: 20, goals: [{ type: 0, count: 14 }, { type: 3, count: 13 }] },
  { id: 8, regionId: "archive", name: "Bulut Balkonu", moveLimit: 19, goals: [{ type: 2, count: 15 }, { type: 4, count: 14 }] },
  { id: 9, regionId: "archive", name: "Son Taç", moveLimit: 18, goals: [{ type: 1, count: 16 }, { type: 5, count: 15 }] },
];

const SIZE = 8;
const LIGHT_COST = 100;
const LIGHT_PER_TILE = 3;
const keyOf = (row, col) => `${row}:${col}`;
const randomTile = () => Math.floor(Math.random() * TILE_META.length);
const cloneBoard = (board) => board.map((row) => row.map((tile) => ({ ...tile })));

function newTile(type = randomTile()) {
  return { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`, type };
}

export function findMatches(board) {
  return new Set(findMatchRuns(board).flatMap((run) => run.cells.map(({ row, col }) => keyOf(row, col))));
}

function findMatchRuns(board) {
  const runs = [];
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE;) {
      const type = board[row][col]?.type;
      let end = col + 1;
      while (type !== undefined && end < SIZE && board[row][end]?.type === type) end += 1;
      if (type !== undefined && end - col >= 3) {
        runs.push({
          type,
          orientation: "horizontal",
          cells: Array.from({ length: end - col }, (_, offset) => ({ row, col: col + offset })),
        });
      }
      col = end > col + 1 ? end : col + 1;
    }
  }
  for (let col = 0; col < SIZE; col += 1) {
    for (let row = 0; row < SIZE;) {
      const type = board[row][col]?.type;
      let end = row + 1;
      while (type !== undefined && end < SIZE && board[end][col]?.type === type) end += 1;
      if (type !== undefined && end - row >= 3) {
        runs.push({
          type,
          orientation: "vertical",
          cells: Array.from({ length: end - row }, (_, offset) => ({ row: row + offset, col })),
        });
      }
      row = end > row + 1 ? end : row + 1;
    }
  }
  return runs;
}

function cellsFromRuns(runs) {
  const matches = new Set();
  for (const run of runs) for (const cell of run.cells) matches.add(keyOf(cell.row, cell.col));
  return matches;
}

export function isAdjacent(first, second) {
  return Math.abs(first.row - second.row) + Math.abs(first.col - second.col) === 1;
}

function createPlayableBoard() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const board = [];
    for (let row = 0; row < SIZE; row += 1) {
      const line = [];
      for (let col = 0; col < SIZE; col += 1) {
        let type = randomTile();
        while ((col >= 2 && line[col - 1].type === type && line[col - 2].type === type) ||
          (row >= 2 && board[row - 1][col].type === type && board[row - 2][col].type === type)) {
          type = randomTile();
        }
        line.push(newTile(type));
      }
      board.push(line);
    }
    if (hasAvailableSwap(board)) return board;
  }
  return Array.from({ length: SIZE }, (_, row) => Array.from({ length: SIZE }, (_, col) => newTile((row + col) % TILE_META.length)));
}

export function hasAvailableSwap(board) {
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const otherRow = row + dr;
        const otherCol = col + dc;
        if (otherRow >= SIZE || otherCol >= SIZE) continue;
        if (board[row][col]?.special === "bomb" || board[otherRow][otherCol]?.special === "bomb") return true;
        const copy = cloneBoard(board);
        [copy[row][col], copy[otherRow][otherCol]] = [copy[otherRow][otherCol], copy[row][col]];
        if (findMatches(copy).size > 0) return true;
      }
    }
  }
  return false;
}

function chooseAnchor(cells, preferred = []) {
  for (const candidate of preferred) {
    if (cells.some((cell) => cell.row === candidate.row && cell.col === candidate.col)) return candidate;
  }
  return cells[Math.floor(cells.length / 2)];
}

function chooseFishTarget(board, clear, state, from) {
  const level = LEVELS.find((item) => item.id === state.levelId) ?? LEVELS[0];
  let bestTarget = null;
  let bestScore = -Infinity;
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const key = keyOf(row, col);
      const tile = board[row][col];
      if (!tile || clear.has(key)) continue;
      const goal = level.goals.find((item) => item.type === tile.type);
      const remaining = goal ? Math.max(0, goal.count - (state.collected[tile.type] ?? 0)) : 0;
      const distance = Math.abs(row - from.row) + Math.abs(col - from.col);
      const score = (remaining > 0 ? 70 + (remaining / goal.count) * 25 : 0)
        + (state.fog[row][col] ? 35 : 0)
        + (tile.special === "bomb" ? 55 : 0)
        - distance;
      if (score > bestScore) {
        bestScore = score;
        bestTarget = { row, col };
      }
    }
  }
  return bestTarget;
}

function prepareMatchWave(board, runs, state, preferred = []) {
  const clear = cellsFromRuns(runs);
  const effects = [];
  if (!clear.size) return { clear, effects };

  const longestRun = [...runs].sort((a, b) => b.cells.length - a.cells.length)[0];
  const hasEightMatch = longestRun?.cells.length >= 8 || clear.size >= 8;
  const hasFiveMatch = longestRun?.cells.length >= 5 || clear.size >= 5;
  const fourRun = runs.find((run) => run.cells.length === 4);
  const reward = hasEightMatch ? "prism" : hasFiveMatch ? "bomb" : fourRun ? "fish" : null;
  if (!reward) return { clear, effects };

  const anchorCells = reward === "prism" || (hasFiveMatch && longestRun.cells.length < 5)
    ? [...clear].map((key) => {
      const [row, col] = key.split(":").map(Number);
      return { row, col };
    })
    : (hasFiveMatch ? longestRun.cells : fourRun.cells);
  const anchor = chooseAnchor(anchorCells, preferred);

  if (reward === "prism" || reward === "bomb") {
    const tile = board[anchor.row][anchor.col];
    if (tile) {
      board[anchor.row][anchor.col] = { ...tile, special: reward };
      clear.delete(keyOf(anchor.row, anchor.col));
        effects.push({ type: `${reward}-created`, at: anchor, tileId: tile.id });
    }
  } else {
    const from = chooseAnchor(fourRun.cells, preferred);
    const to = chooseFishTarget(board, clear, state, from);
    if (to) {
      clear.add(keyOf(to.row, to.col));
      effects.push({ type: "fish", from, to });
    }
  }
  return { clear, effects };
}

function expandBombs(board, clear, effects) {
  const expanded = new Set(clear);
  const queue = [...clear];
  const triggered = new Set();
  while (queue.length) {
    const key = queue.pop();
    if (triggered.has(key)) continue;
    triggered.add(key);
    const [row, col] = key.split(":").map(Number);
    if (board[row][col]?.special !== "bomb") continue;
    effects.push({ type: "bomb-explosion", at: { row, col } });
    for (let targetRow = Math.max(0, row - 1); targetRow <= Math.min(SIZE - 1, row + 1); targetRow += 1) {
      for (let targetCol = Math.max(0, col - 1); targetCol <= Math.min(SIZE - 1, col + 1); targetCol += 1) {
        const targetKey = keyOf(targetRow, targetCol);
        if (!expanded.has(targetKey)) {
          expanded.add(targetKey);
          queue.push(targetKey);
        }
      }
    }
  }
  return expanded;
}

export function createLevelState(levelId) {
  const level = LEVELS.find((item) => item.id === levelId) ?? LEVELS[0];
  return {
    levelId: level.id,
    board: createPlayableBoard(),
    collected: Object.fromEntries(level.goals.map(({ type }) => [type, 0])),
    score: 0,
    movesLeft: level.moveLimit,
    lightCharge: 0,
    status: "playing",
    cascades: 0,
    lastMove: 0,
    turnId: 0,
    clearedCells: [],
    specialEffects: [],
    message: "",
  };
}

function goalsComplete(state, level) {
  return level.goals.every(({ type, count }) => (state.collected[type] ?? 0) >= count);
}

function syncCreatedSpecialPositions(board, effects) {
  for (let index = 0; index < effects.length; index += 1) {
    const effect = effects[index];
    if (!effect.type.endsWith("-created") || !effect.tileId) continue;
    for (let row = 0; row < SIZE; row += 1) {
      const col = board[row].findIndex((tile) => tile?.id === effect.tileId);
      if (col >= 0) {
        effects[index] = { ...effect, at: { row, col } };
        break;
      }
    }
  }
}

function settleBoard(state, initialClear = new Set(), initialEffects = []) {
  const next = {
    ...state,
    board: cloneBoard(state.board),
    collected: { ...state.collected },
    cascades: 0,
    turnId: state.turnId + 1,
    clearedCells: [],
    specialEffects: [...initialEffects],
  };
  let clear = new Set(initialClear);
  let safety = 0;
  while (safety < 30) {
    if (!clear.size) {
      const runs = findMatchRuns(next.board);
      if (!runs.length) break;
      const prepared = prepareMatchWave(next.board, runs, next);
      clear = prepared.clear;
      next.specialEffects.push(...prepared.effects);
    }
    if (!clear.size) break;
    clear = expandBombs(next.board, clear, next.specialEffects);
    next.cascades += 1;
    next.lastMove += clear.size;
    for (const key of clear) {
      const [row, col] = key.split(":").map(Number);
      const tile = next.board[row][col];
      if (!tile) continue;
      next.clearedCells.push({ row, col });
      next.collected[tile.type] = (next.collected[tile.type] ?? 0) + 1;
      next.score += 10 + Math.min(20, (next.cascades - 1) * 5);
      next.lightCharge = Math.min(LIGHT_COST, next.lightCharge + LIGHT_PER_TILE);
      next.board[row][col] = null;
    }
    for (let col = 0; col < SIZE; col += 1) {
      const survivors = [];
      for (let row = SIZE - 1; row >= 0; row -= 1) {
        if (next.board[row][col]) survivors.push(next.board[row][col]);
      }
      while (survivors.length < SIZE) survivors.push(newTile());
      for (let row = SIZE - 1, index = 0; row >= 0; row -= 1, index += 1) {
        next.board[row][col] = survivors[index];
      }
    }
    syncCreatedSpecialPositions(next.board, next.specialEffects);
    clear = new Set();
    safety += 1;
  }
  next.clearedCells = [...new Map(next.clearedCells.map((cell) => [`${cell.row}:${cell.col}`, cell])).values()];
  if (!hasAvailableSwap(next.board)) {
    next.board = createPlayableBoard();
    next.message = "Taşlar yeniden dizildi.";
  }
  return next;
}

function finishTurn(next, level) {
  if (goalsComplete(next, level)) {
    next.status = "won";
    next.message = "Taç mücevherleri toplandı.";
  } else if (next.movesLeft <= 0) {
    next.status = "lost";
    next.message = "Hamleler tükendi. Yeniden deneyebilirsin.";
  }
  return next;
}

export function swapTiles(state, first, second) {
  if (state.status !== "playing" || !isAdjacent(first, second)) return state;
  const level = LEVELS.find((item) => item.id === state.levelId) ?? LEVELS[0];
  const board = cloneBoard(state.board);
  [board[first.row][first.col], board[second.row][second.col]] = [board[second.row][second.col], board[first.row][first.col]];
  const runs = findMatchRuns(board);
  const swappedBombs = [first, second].filter(({ row, col }) => board[row][col]?.special === "bomb");
  const prismSources = [first, second].filter(({ row, col }) => state.board[row][col]?.special === "prism");
  if (runs.length === 0 && swappedBombs.length === 0 && prismSources.length === 0) {
    return { ...state, message: "Eşleşme olmadı; başka bir taş dene." };
  }
  let prepared = { clear: new Set(), effects: [] };
  if (prismSources.length) {
    prepared.clear = cellsFromRuns(runs);
    const prismEffects = [];
    if (prismSources.length > 1) {
      for (let row = 0; row < SIZE; row += 1) {
        for (let col = 0; col < SIZE; col += 1) prepared.clear.add(keyOf(row, col));
      }
      for (const source of prismSources) {
        const destination = source.row === first.row && source.col === first.col ? second : first;
        prismEffects.push({ type: "prism-explosion", at: destination, color: null });
      }
    } else {
      const source = prismSources[0];
      const destination = source.row === first.row && source.col === first.col ? second : first;
      const color = board[source.row][source.col]?.type;
      for (let row = 0; row < SIZE; row += 1) {
        for (let col = 0; col < SIZE; col += 1) {
          if (board[row][col]?.type === color) prepared.clear.add(keyOf(row, col));
        }
      }
      prepared.clear.add(keyOf(destination.row, destination.col));
      prismEffects.push({ type: "prism-explosion", at: destination, color });
    }
    for (const { row, col } of swappedBombs) prepared.clear.add(keyOf(row, col));
    prepared.effects = prismEffects;
  } else if (swappedBombs.length) {
    prepared.clear = cellsFromRuns(runs);
    for (const { row, col } of swappedBombs) prepared.clear.add(keyOf(row, col));
  } else {
    prepared = prepareMatchWave(board, runs, state, [second, first]);
  }
  let next = settleBoard({ ...state, board, movesLeft: state.movesLeft - 1, message: "" }, prepared.clear, prepared.effects);
  next = finishTurn(next, level);
  return next;
}

export function fireLightSeed(state, target) {
  if (state.status !== "playing" || state.lightCharge < LIGHT_COST) return state;
  const clear = new Set();
  for (let row = target.row - 1; row <= target.row + 1; row += 1) {
    for (let col = target.col - 1; col <= target.col + 1; col += 1) {
      if (row >= 0 && row < SIZE && col >= 0 && col < SIZE) clear.add(keyOf(row, col));
    }
  }
  const level = LEVELS.find((item) => item.id === state.levelId) ?? LEVELS[0];
  let next = settleBoard({ ...state, lightCharge: 0, message: "" }, clear);
  next = finishTurn(next, level);
  return next;
}

export function getLevel(levelId) {
  return LEVELS.find((item) => item.id === levelId) ?? LEVELS[0];
}

export function getRegion(regionId) {
  return REGIONS.find((item) => item.id === regionId) ?? REGIONS[0];
}

export function getLightCost() {
  return LIGHT_COST;
}

