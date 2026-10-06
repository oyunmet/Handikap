export const TILE_META = [
  { name: "Kırmızı kalkan", color: "#f3343b", deep: "#b70d21" },
  { name: "Mavi kalkan", color: "#1689f8", deep: "#0753bc" },
  { name: "Altın taç", color: "#ffc928", deep: "#db8c08" },
  { name: "Yeşil yaprak", color: "#2bc846", deep: "#087d2f" },
  { name: "Pembe elmas", color: "#e42fc2", deep: "#a911a7" },
];

export const REGIONS = [
  {
    id: "whisperwood",
    name: "Çiy Bahçesi",
    subtitle: "İlk filizler sabah ışığında uyanıyor.",
    levels: [1, 2, 3],
    theme: "forest",
    mark: "01",
  },
  {
    id: "coral",
    name: "Güneş Korusu",
    subtitle: "Arı yolları ve nilüfer göletleri seni bekliyor.",
    levels: [4, 5, 6],
    theme: "coral",
    mark: "02",
  },
  {
    id: "archive",
    name: "Ayçiçeği Terası",
    subtitle: "Gece açan çiçeklerin sırrını keşfet.",
    levels: [7, 8, 9],
    theme: "archive",
    mark: "03",
  },
];

export const LEVELS = [
  { id: 1, regionId: "whisperwood", name: "İlk Filiz", moveLimit: 22, goals: [{ type: 1, count: 16 }, { type: 2, count: 14 }] },
  { id: 2, regionId: "whisperwood", name: "Çiy Yolu", moveLimit: 21, goals: [{ type: 3, count: 11 }, { type: 2, count: 10 }] },
  { id: 3, regionId: "whisperwood", name: "Gül Kemeri", moveLimit: 20, goals: [{ type: 4, count: 12 }, { type: 2, count: 10 }] },
  { id: 4, regionId: "coral", name: "Arı Patikası", moveLimit: 21, goals: [{ type: 0, count: 11 }, { type: 2, count: 12 }] },
  { id: 5, regionId: "coral", name: "Nilüfer Göleti", moveLimit: 20, goals: [{ type: 1, count: 14 }, { type: 4, count: 12 }] },
  { id: 6, regionId: "coral", name: "Papatya Çardağı", moveLimit: 19, goals: [{ type: 3, count: 14 }, { type: 0, count: 13 }] },
  { id: 7, regionId: "archive", name: "Meyve Bahçesi", moveLimit: 20, goals: [{ type: 0, count: 14 }, { type: 4, count: 13 }] },
  { id: 8, regionId: "archive", name: "Ay Işığı Serası", moveLimit: 19, goals: [{ type: 1, count: 15 }, { type: 2, count: 14 }] },
  { id: 9, regionId: "archive", name: "Büyük Hasat", moveLimit: 18, goals: [{ type: 3, count: 16 }, { type: 4, count: 15 }] },
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
  for (let row = 0; row < SIZE - 1; row += 1) {
    for (let col = 0; col < SIZE - 1; col += 1) {
      const type = board[row][col]?.type;
      if (
        type !== undefined &&
        board[row][col + 1]?.type === type &&
        board[row + 1][col]?.type === type &&
        board[row + 1][col + 1]?.type === type
      ) {
        runs.push({
          type,
          orientation: "square",
          cells: [
            { row, col }, { row, col: col + 1 },
            { row: row + 1, col }, { row: row + 1, col: col + 1 },
          ],
        });
      }
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
        if (board[row][col]?.special || board[otherRow][otherCol]?.special) return true;
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

  const lineRuns = runs.filter((run) => run.orientation !== "square");
  const horizontalRuns = lineRuns.filter((run) => run.orientation === "horizontal");
  const verticalRuns = lineRuns.filter((run) => run.orientation === "vertical");
  let crossAnchor = null;
  for (const horizontal of horizontalRuns) {
    for (const vertical of verticalRuns) {
      const intersection = horizontal.cells.find((cell) => vertical.cells.some((other) => other.row === cell.row && other.col === cell.col));
      if (intersection && new Set([...horizontal.cells, ...vertical.cells].map(({ row, col }) => keyOf(row, col))).size >= 5) {
        crossAnchor = intersection;
        break;
      }
    }
    if (crossAnchor) break;
  }
  const fiveLine = lineRuns.find((run) => run.cells.length >= 5);
  const fourLine = lineRuns.find((run) => run.cells.length >= 4);
  const square = runs.find((run) => run.orientation === "square");
  const longestLine = [...lineRuns].sort((a, b) => b.cells.length - a.cells.length)[0];
  const reward = crossAnchor ? "bomb"
    : fiveLine ? "prism"
      : fourLine ? (fourLine.orientation === "horizontal" ? "rocket-horizontal" : "rocket-vertical")
        : square ? "fish"
          : clear.size >= 5 ? "bomb"
            : null;
  if (!reward) return { clear, effects };

  const anchorCells = reward === "bomb"
    ? crossAnchor ? [crossAnchor] : [...clear].map((key) => {
      const [row, col] = key.split(":").map(Number);
      return { row, col };
    })
    : reward === "prism" ? fiveLine.cells
      : reward === "fish" ? square.cells
        : fourLine.cells;
  const anchor = reward === "bomb" && crossAnchor
    ? crossAnchor
    : chooseAnchor(anchorCells, preferred);

  const tile = board[anchor.row][anchor.col];
  if (tile) {
    board[anchor.row][anchor.col] = { ...tile, special: reward };
    clear.delete(keyOf(anchor.row, anchor.col));
    const effectType = reward.startsWith("rocket-") ? "rocket-created" : `${reward}-created`;
    effects.push({ type: effectType, at: anchor, tileId: tile.id, orientation: reward.replace("rocket-", "") });
  }
  return { clear, effects };
}

function expandSpecials(board, clear, effects, state) {
  const expanded = new Set(clear);
  const queue = [...clear];
  const triggered = new Set();
  while (queue.length) {
    const key = queue.pop();
    if (triggered.has(key)) continue;
    triggered.add(key);
    const [row, col] = key.split(":").map(Number);
    const tile = board[row]?.[col];
    const add = (targetRow, targetCol) => {
      if (targetRow < 0 || targetRow >= SIZE || targetCol < 0 || targetCol >= SIZE) return;
      const targetKey = keyOf(targetRow, targetCol);
      if (!expanded.has(targetKey)) {
        expanded.add(targetKey);
        queue.push(targetKey);
      }
    };
    if (tile?.special === "bomb") {
      if (!effects.some((effect) => effect.type === "bomb-explosion" && effect.at.row === row && effect.at.col === col)) {
        effects.push({ type: "bomb-explosion", at: { row, col } });
      }
      for (let targetRow = Math.max(0, row - 1); targetRow <= Math.min(SIZE - 1, row + 1); targetRow += 1) {
        for (let targetCol = Math.max(0, col - 1); targetCol <= Math.min(SIZE - 1, col + 1); targetCol += 1) add(targetRow, targetCol);
      }
    } else if (tile?.special === "rocket-horizontal" || tile?.special === "rocket-vertical") {
      const orientation = tile.special.endsWith("horizontal") ? "horizontal" : "vertical";
      if (!effects.some((effect) => effect.type === "rocket-explosion" && effect.at.row === row && effect.at.col === col)) {
        effects.push({ type: "rocket-explosion", orientation, at: { row, col } });
      }
      if (orientation === "horizontal") {
        for (let targetCol = 0; targetCol < SIZE; targetCol += 1) add(row, targetCol);
      } else {
        for (let targetRow = 0; targetRow < SIZE; targetRow += 1) add(targetRow, col);
      }
    } else if (tile?.special === "fish") {
      const target = chooseFishTarget(board, expanded, state, { row, col });
      if (target) {
        add(target.row, target.col);
        if (!effects.some((effect) => effect.type === "fish" && effect.from.row === row && effect.from.col === col)) {
          effects.push({ type: "fish", from: { row, col }, to: target });
        }
      }
    } else if (tile?.special === "prism") {
      const existing = effects.find((effect) => effect.type === "prism-explosion" && effect.at.row === row && effect.at.col === col);
      const color = existing ? existing.color : tile.type;
      if (!existing) effects.push({ type: "prism-explosion", at: { row, col }, color });
      for (let targetRow = 0; targetRow < SIZE; targetRow += 1) {
        for (let targetCol = 0; targetCol < SIZE; targetCol += 1) {
          if (color === null || board[targetRow][targetCol]?.type === color) add(targetRow, targetCol);
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
    scorePopups: [],
    fallingTiles: [],
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

function positionsById(board) {
  const positions = new Map();
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const tile = board[row][col];
      if (tile) positions.set(tile.id, { row, col });
    }
  }
  return positions;
}

function settleBoard(state, initialClear = new Set(), initialEffects = [], originBoard = state.board) {
  const originalPositions = positionsById(originBoard);
  const next = {
    ...state,
    board: cloneBoard(state.board),
    collected: { ...state.collected },
    cascades: 0,
    lastMove: 0,
    turnId: state.turnId + 1,
    clearedCells: [],
    scorePopups: [],
    fallingTiles: [],
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
    clear = expandSpecials(next.board, clear, next.specialEffects, next);
    next.cascades += 1;
    next.lastMove += clear.size;
    const points = clear.size * (100 + Math.min(150, (next.cascades - 1) * 50));
    const center = [...clear].reduce((total, key) => {
      const [row, col] = key.split(":").map(Number);
      return { row: total.row + row, col: total.col + col };
    }, { row: 0, col: 0 });
    next.scorePopups.push({
      id: `${next.turnId}-${next.cascades}`,
      value: points,
      at: { row: center.row / clear.size, col: center.col / clear.size },
    });
    next.score += points;
    for (const key of clear) {
      const [row, col] = key.split(":").map(Number);
      const tile = next.board[row][col];
      if (!tile) continue;
      next.clearedCells.push({ row, col });
      next.collected[tile.type] = (next.collected[tile.type] ?? 0) + 1;
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
  const finalPositions = positionsById(next.board);
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const tile = next.board[row][col];
      if (!tile) continue;
      const from = originalPositions.get(tile.id);
      if (from && from.row === row && from.col === col) continue;
      next.fallingTiles.push({
        id: tile.id,
        fromRow: from?.row ?? -1,
        fromCol: from?.col ?? col,
        toRow: row,
        toCol: col,
      });
    }
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

function addCell(clear, row, col) {
  if (row >= 0 && row < SIZE && col >= 0 && col < SIZE) clear.add(keyOf(row, col));
}

function addRocketLine(clear, effects, orientation, at) {
  if (orientation === "horizontal") {
    for (let col = 0; col < SIZE; col += 1) addCell(clear, at.row, col);
  } else {
    for (let row = 0; row < SIZE; row += 1) addCell(clear, row, at.col);
  }
  effects.push({ type: "rocket-explosion", orientation, at });
}

function addBombArea(clear, effects, at, radius = 1) {
  effects.push({ type: "bomb-explosion", at });
  for (let row = at.row - radius; row <= at.row + radius; row += 1) {
    for (let col = at.col - radius; col <= at.col + radius; col += 1) addCell(clear, row, col);
  }
}

function prepareSpecialSwap(board, active, state, swappedCells) {
  const clear = new Set();
  const effects = [];
  const addSourceCells = () => {
    for (const { at } of swappedCells) addCell(clear, at.row, at.col);
  };
  const prismCells = active.filter(({ tile }) => tile.special === "prism");
  const bombCells = active.filter(({ tile }) => tile.special === "bomb");
  const rocketCells = active.filter(({ tile }) => tile.special?.startsWith("rocket-"));
  const fishCells = active.filter(({ tile }) => tile.special === "fish");
  addSourceCells();

  if (prismCells.length) {
    if (prismCells.length > 1) {
      for (let row = 0; row < SIZE; row += 1) {
        for (let col = 0; col < SIZE; col += 1) addCell(clear, row, col);
      }
      for (const prism of prismCells) effects.push({ type: "prism-explosion", at: prism.at, color: null });
      effects.push({ type: "combo-explosion", combo: "prism-prism", at: prismCells[0].at });
      return { clear, effects };
    }

    const prism = prismCells[0];
    const companion = swappedCells.find(({ at }) => at.row !== prism.at.row || at.col !== prism.at.col);
    const color = companion?.tile?.type ?? prism.tile.type;
    const companionIsBomb = companion?.tile?.special === "bomb";
    const companionIsRocket = companion?.tile?.special?.startsWith("rocket-");
    for (let row = 0; row < SIZE; row += 1) {
      for (let col = 0; col < SIZE; col += 1) {
        const tile = board[row][col];
        if (tile?.type !== color) continue;
        if (companionIsBomb) board[row][col] = { ...tile, special: "bomb" };
        if (companionIsRocket) {
          board[row][col] = { ...tile, special: (row + col) % 2 ? "rocket-horizontal" : "rocket-vertical" };
        }
        addCell(clear, row, col);
      }
    }
    effects.push({ type: "prism-explosion", at: prism.at, color });
    if (companionIsBomb || companionIsRocket) {
      effects.push({ type: "combo-explosion", combo: `prism-${companion.tile.special}`, at: prism.at });
    }
    for (const fish of fishCells) {
      const target = chooseFishTarget(board, clear, state, fish.at);
      if (target) {
        addCell(clear, target.row, target.col);
        effects.push({ type: "fish", from: fish.at, to: target });
      }
    }
    return { clear, effects };
  }

  if (bombCells.length && rocketCells.length) {
    const center = {
      row: Math.round((bombCells[0].at.row + rocketCells[0].at.row) / 2),
      col: Math.round((bombCells[0].at.col + rocketCells[0].at.col) / 2),
    };
    addRocketLine(clear, effects, "horizontal", center);
    addRocketLine(clear, effects, "vertical", center);
    addBombArea(clear, effects, bombCells[0].at);
    for (let row = center.row - 1; row <= center.row + 1; row += 1) {
      for (let col = center.col - 1; col <= center.col + 1; col += 1) addCell(clear, row, col);
    }
    effects.push({ type: "combo-explosion", combo: "bomb-rocket", at: center });
  } else if (bombCells.length > 1) {
    const center = {
      row: Math.round((bombCells[0].at.row + bombCells[1].at.row) / 2),
      col: Math.round((bombCells[0].at.col + bombCells[1].at.col) / 2),
    };
    addBombArea(clear, effects, center, 2);
    effects.push({ type: "combo-explosion", combo: "bomb-bomb", at: center });
  } else {
    for (const rocket of rocketCells) {
      const orientation = rocket.tile.special.endsWith("horizontal") ? "horizontal" : "vertical";
      addRocketLine(clear, effects, orientation, rocket.at);
    }
    for (const bomb of bombCells) addBombArea(clear, effects, bomb.at);
  }

  for (const fish of fishCells) {
    const target = chooseFishTarget(board, clear, state, fish.at);
    if (target) {
      addCell(clear, target.row, target.col);
      effects.push({ type: "fish", from: fish.at, to: target });
    }
  }
  if (active.length > 1 && !effects.some((effect) => effect.type === "combo-explosion")) {
    effects.push({ type: "combo-explosion", combo: active.map(({ tile }) => tile.special).join("-"), at: active[0].at });
  }
  return { clear, effects };
}

export function swapTiles(state, first, second) {
  if (state.status !== "playing" || !isAdjacent(first, second)) return state;
  const level = LEVELS.find((item) => item.id === state.levelId) ?? LEVELS[0];
  const board = cloneBoard(state.board);
  [board[first.row][first.col], board[second.row][second.col]] = [board[second.row][second.col], board[first.row][first.col]];
  const runs = findMatchRuns(board);
  const swappedCells = [
    { at: first, tile: board[first.row][first.col] },
    { at: second, tile: board[second.row][second.col] },
  ];
  const activeSpecials = swappedCells.filter(({ tile }) => tile?.special);
  if (runs.length === 0 && activeSpecials.length === 0) {
    return { ...state, message: "Eşleşme olmadı; başka bir taş dene." };
  }
  const prepared = runs.length ? prepareMatchWave(board, runs, state, [second, first]) : { clear: new Set(), effects: [] };
  if (activeSpecials.length) {
    const activated = prepareSpecialSwap(board, activeSpecials, state, swappedCells);
    for (const cell of activated.clear) prepared.clear.add(cell);
    prepared.effects.push(...activated.effects);
  }
  let next = settleBoard(
    { ...state, board, movesLeft: state.movesLeft - 1, message: "" },
    prepared.clear,
    prepared.effects,
    state.board,
  );
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

