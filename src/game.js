export const TILE_META = [
  { name: "Güneş", color: "#f1c36b", deep: "#d99c39" },
  { name: "Yosun", color: "#91bf83", deep: "#558454" },
  { name: "Mercan", color: "#e48778", deep: "#c65d5c" },
  { name: "Menekşe", color: "#ae92d5", deep: "#8066b5" },
  { name: "Buz", color: "#82c4d2", deep: "#4f9ead" },
  { name: "Ay", color: "#eadfbd", deep: "#c8b986" },
];

export const REGIONS = [
  {
    id: "whisperwood",
    name: "Fısıltı Ormanı",
    subtitle: "Unutulmuş ışıklar köklerin altında uyuyor.",
    levels: [1, 2, 3],
    theme: "forest",
    mark: "01",
  },
  {
    id: "coral",
    name: "Mercan Koyu",
    subtitle: "Gelgit, eski bir şarkının ritmini taşıyor.",
    levels: [4, 5, 6],
    theme: "coral",
    mark: "02",
  },
  {
    id: "archive",
    name: "Ay Arşivi",
    subtitle: "Yıldızların unuttuğu şeyler burada saklı.",
    levels: [7, 8, 9],
    theme: "archive",
    mark: "03",
  },
];

export const LEVELS = [
  { id: 1, regionId: "whisperwood", name: "İlk Kıvılcım", moveLimit: 22, goals: [{ type: 0, count: 9 }, { type: 2, count: 9 }], fogGoal: 6 },
  { id: 2, regionId: "whisperwood", name: "Köklerin Altı", moveLimit: 21, goals: [{ type: 1, count: 11 }, { type: 4, count: 10 }], fogGoal: 11 },
  { id: 3, regionId: "whisperwood", name: "Gece Açanlar", moveLimit: 20, goals: [{ type: 3, count: 12 }, { type: 5, count: 10 }], fogGoal: 17 },
  { id: 4, regionId: "coral", name: "Sığ Sular", moveLimit: 21, goals: [{ type: 0, count: 11 }, { type: 4, count: 12 }], fogGoal: 17 },
  { id: 5, regionId: "coral", name: "Gelgit Saati", moveLimit: 20, goals: [{ type: 2, count: 14 }, { type: 5, count: 12 }], fogGoal: 22 },
  { id: 6, regionId: "coral", name: "Derin Akıntı", moveLimit: 19, goals: [{ type: 1, count: 14 }, { type: 3, count: 13 }], fogGoal: 27 },
  { id: 7, regionId: "archive", name: "Sessiz Raflar", moveLimit: 20, goals: [{ type: 0, count: 14 }, { type: 3, count: 13 }], fogGoal: 27 },
  { id: 8, regionId: "archive", name: "Kayıp Takımyıldız", moveLimit: 19, goals: [{ type: 2, count: 15 }, { type: 4, count: 14 }], fogGoal: 32 },
  { id: 9, regionId: "archive", name: "Son Işık", moveLimit: 18, goals: [{ type: 1, count: 16 }, { type: 5, count: 15 }], fogGoal: 36 },
];

const SIZE = 8;
const LIGHT_COST = 100;
const LIGHT_PER_TILE = 3;
const keyOf = (row, col) => `${row}:${col}`;
const randomTile = () => Math.floor(Math.random() * TILE_META.length);
const cloneBoard = (board) => board.map((row) => row.map((tile) => ({ ...tile })));
const cloneFog = (fog) => fog.map((row) => [...row]);

function newTile(type = randomTile()) {
  return { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`, type };
}

function hasMatchAt(board, row, col) {
  const type = board[row]?.[col]?.type;
  if (type === undefined) return false;
  let horizontal = 1;
  for (let x = col - 1; x >= 0 && board[row][x]?.type === type; x -= 1) horizontal += 1;
  for (let x = col + 1; x < SIZE && board[row][x]?.type === type; x += 1) horizontal += 1;
  let vertical = 1;
  for (let y = row - 1; y >= 0 && board[y][col]?.type === type; y -= 1) vertical += 1;
  for (let y = row + 1; y < SIZE && board[y][col]?.type === type; y += 1) vertical += 1;
  return horizontal >= 3 || vertical >= 3;
}

export function findMatches(board) {
  const matches = new Set();
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const type = board[row][col]?.type;
      if (type === undefined) continue;
      if (col + 2 < SIZE && board[row][col + 1]?.type === type && board[row][col + 2]?.type === type) {
        let end = col + 2;
        while (end + 1 < SIZE && board[row][end + 1]?.type === type) end += 1;
        for (let x = col; x <= end; x += 1) matches.add(keyOf(row, x));
      }
      if (row + 2 < SIZE && board[row + 1][col]?.type === type && board[row + 2][col]?.type === type) {
        let end = row + 2;
        while (end + 1 < SIZE && board[end + 1][col]?.type === type) end += 1;
        for (let y = row; y <= end; y += 1) matches.add(keyOf(y, col));
      }
    }
  }
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
        const copy = cloneBoard(board);
        [copy[row][col], copy[otherRow][otherCol]] = [copy[otherRow][otherCol], copy[row][col]];
        if (findMatches(copy).size > 0) return true;
      }
    }
  }
  return false;
}

function makeFog(level) {
  const fog = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
  const candidates = [];
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if ((row * 3 + col * 5 + level.id * 2) % 4 !== 0) candidates.push([row, col]);
    }
  }
  // Keep the veil distributed across the whole board, with deterministic level layouts.
  let count = 0;
  for (let index = 0; index < candidates.length && count < level.fogGoal; index += 1) {
    const [row, col] = candidates[(index * 17 + level.id * 11) % candidates.length];
    if (!fog[row][col]) {
      fog[row][col] = true;
      count += 1;
    }
  }
  return fog;
}

export function createLevelState(levelId) {
  const level = LEVELS.find((item) => item.id === levelId) ?? LEVELS[0];
  return {
    levelId: level.id,
    board: createPlayableBoard(),
    fog: makeFog(level),
    collected: Object.fromEntries(level.goals.map(({ type }) => [type, 0])),
    score: 0,
    movesLeft: level.moveLimit,
    lightCharge: 0,
    status: "playing",
    cascades: 0,
    lastMove: 0,
    turnId: 0,
    clearedCells: [],
    message: "",
  };
}

function countFog(fog) {
  return fog.reduce((total, row) => total + row.filter(Boolean).length, 0);
}

function goalsComplete(state, level) {
  return level.goals.every(({ type, count }) => (state.collected[type] ?? 0) >= count) && countFog(state.fog) === 0;
}

function settleBoard(state, initialClear = new Set()) {
  const next = {
    ...state,
    board: cloneBoard(state.board),
    fog: cloneFog(state.fog),
    collected: { ...state.collected },
    cascades: 0,
    turnId: state.turnId + 1,
    clearedCells: [],
  };
  let clear = initialClear;
  let safety = 0;
  while ((clear.size || findMatches(next.board).size) && safety < 30) {
    if (!clear.size) clear = findMatches(next.board);
    if (!clear.size) break;
    next.cascades += 1;
    next.lastMove += clear.size;
    for (const key of clear) {
      const [row, col] = key.split(":").map(Number);
      const tile = next.board[row][col];
      if (!tile) continue;
      next.clearedCells.push({ row, col });
      next.collected[tile.type] = (next.collected[tile.type] ?? 0) + 1;
      if (next.fog[row][col]) next.fog[row][col] = false;
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
    clear = findMatches(next.board);
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
    next.message = "Bölgenin ışığı geri döndü.";
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
  if (findMatches(board).size === 0) {
    return { ...state, message: "Eşleşme olmadı; başka bir taş dene." };
  }
  let next = settleBoard({ ...state, board, movesLeft: state.movesLeft - 1, message: "" });
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

export function getFogRemaining(state) {
  return countFog(state.fog);
}

export function getLightCost() {
  return LIGHT_COST;
}

