export const BOARD_SIZE = 7;
export const DUEL_MOVES = 20;
export const TILE_TYPES = ["sword", "shield", "fire", "ice", "arrow", "heart"];

const key = (row, col) => row * BOARD_SIZE + col;
const coords = (index) => [Math.floor(index / BOARD_SIZE), index % BOARD_SIZE];
const inside = (row, col) => row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
const cloneBoard = (board) => board.map((row) => row.map((tile) => ({ ...tile })));

function makeRandom(seed) {
  let state = (Number(seed) >>> 0) || 0x6d2b79f5;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}

function keyedTile(seed, turn, chain, col, dropIndex) {
  let value = (
    (Number(seed) >>> 0)
    ^ Math.imul(turn + 1, 0x9e3779b1)
    ^ Math.imul(chain + 1, 0x85ebca6b)
    ^ Math.imul(col + 1, 0xc2b2ae35)
    ^ Math.imul(dropIndex + 1, 0x27d4eb2f)
  ) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return TILE_TYPES[(value >>> 0) % TILE_TYPES.length];
}

function makeInitialBoard(seed) {
  const random = makeRandom(seed);
  const board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      let type = TILE_TYPES[Math.floor(random() * TILE_TYPES.length)];
      let attempts = 0;
      while (attempts < TILE_TYPES.length) {
        const makesHorizontal = col >= 2
          && board[row][col - 1]?.type === type
          && board[row][col - 2]?.type === type;
        const makesVertical = row >= 2
          && board[row - 1][col]?.type === type
          && board[row - 2][col]?.type === type;
        if (!makesHorizontal && !makesVertical) break;
        type = TILE_TYPES[Math.floor(random() * TILE_TYPES.length)];
        attempts += 1;
      }
      board[row][col] = { type, special: null };
    }
  }
  return board;
}

export function findMatchRuns(board) {
  const runs = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    let start = 0;
    while (start < BOARD_SIZE) {
      const type = board[row][start]?.type;
      let end = start + 1;
      while (type && end < BOARD_SIZE && board[row][end]?.type === type) end += 1;
      if (type && end - start >= 3) {
        runs.push({
          orientation: "horizontal",
          type,
          cells: Array.from({ length: end - start }, (_, offset) => key(row, start + offset)),
        });
      }
      start = end;
    }
  }
  for (let col = 0; col < BOARD_SIZE; col += 1) {
    let start = 0;
    while (start < BOARD_SIZE) {
      const type = board[start][col]?.type;
      let end = start + 1;
      while (type && end < BOARD_SIZE && board[end][col]?.type === type) end += 1;
      if (type && end - start >= 3) {
        runs.push({
          orientation: "vertical",
          type,
          cells: Array.from({ length: end - start }, (_, offset) => key(start + offset, col)),
        });
      }
      start = end;
    }
  }
  return runs;
}

export function findMatches(board) {
  return new Set(findMatchRuns(board).flatMap((run) => run.cells));
}

function expandSpecial(board, index, clear, effects, targetType, clearAll = false) {
  const [row, col] = coords(index);
  const tile = board[row]?.[col];
  if (!tile?.special) return;
  const signature = `${tile.special}:${index}`;
  if (effects.some((effect) => effect.signature === signature)) return;
  effects.push({ type: tile.special, at: index, signature });

  if (clearAll) {
    for (let y = 0; y < BOARD_SIZE; y += 1) {
      for (let x = 0; x < BOARD_SIZE; x += 1) clear.add(key(y, x));
    }
  } else if (tile.special === "row") {
    for (let x = 0; x < BOARD_SIZE; x += 1) clear.add(key(row, x));
  } else if (tile.special === "column") {
    for (let y = 0; y < BOARD_SIZE; y += 1) clear.add(key(y, col));
  } else if (tile.special === "bomb") {
    for (let y = row - 1; y <= row + 1; y += 1) {
      for (let x = col - 1; x <= col + 1; x += 1) {
        if (inside(y, x)) clear.add(key(y, x));
      }
    }
  } else if (tile.special === "prism") {
    const color = targetType ?? board[row]?.[col + 1]?.type ?? board[row]?.[col - 1]?.type;
    if (color === "*") {
      for (let y = 0; y < BOARD_SIZE; y += 1) {
        for (let x = 0; x < BOARD_SIZE; x += 1) clear.add(key(y, x));
      }
    } else if (color) {
      for (let y = 0; y < BOARD_SIZE; y += 1) {
        for (let x = 0; x < BOARD_SIZE; x += 1) {
          if (board[y][x]?.type === color) clear.add(key(y, x));
        }
      }
    }
  }
}

function dropTiles(board, seed, turn, chain) {
  for (let col = 0; col < BOARD_SIZE; col += 1) {
    const survivors = [];
    for (let row = BOARD_SIZE - 1; row >= 0; row -= 1) {
      const tile = board[row][col];
      if (tile) survivors.push(tile);
    }
    let dropIndex = 0;
    for (let row = BOARD_SIZE - 1; row >= 0; row -= 1) {
      board[row][col] = survivors[BOARD_SIZE - 1 - row]
        ?? { type: keyedTile(seed, turn, chain, col, dropIndex++), special: null };
    }
  }
}

function resolveBoard(board, seed, turn, forced = [], swapPair = []) {
  const effects = [];
  const clearedByWave = [];
  let score = 0;
  let combo = 0;
  let lastMatches = [];
  let forceSpecials = [...forced];

  for (let wave = 0; wave < 8; wave += 1) {
    const runs = findMatchRuns(board);
    const clear = new Set(runs.flatMap((run) => run.cells));
    if (forceSpecials.length) forceSpecials.forEach((index) => clear.add(index));
    if (!clear.size) break;

    const waveEffects = [];
    const activated = new Set();
    const activationQueue = [];
    const queueSpecial = (index) => {
      const [row, col] = coords(index);
      if (board[row]?.[col]?.special && !activated.has(index) && !activationQueue.includes(index)) {
        activationQueue.push(index);
      }
    };
    forceSpecials.forEach(queueSpecial);
    clear.forEach(queueSpecial);
    while (activationQueue.length) {
      const index = activationQueue.shift();
      if (activated.has(index)) continue;
      activated.add(index);
      const [row, col] = coords(index);
      const directPartner = swapPair.find((item) => item !== index && swapPair.includes(index) && forceSpecials.includes(index));
      const [partnerRow, partnerCol] = directPartner === undefined ? [row, col + 1] : coords(directPartner);
      const partnerTile = board[partnerRow]?.[partnerCol];
      const matchedType = runs.find((run) => run.cells.includes(index))?.type;
      const targetType = partnerTile?.special === "prism" ? "*" : partnerTile?.type ?? matchedType;
      expandSpecial(board, index, clear, waveEffects, targetType);
      clear.forEach(queueSpecial);
    }

    const horizontal = runs.filter((run) => run.orientation === "horizontal");
    const vertical = runs.filter((run) => run.orientation === "vertical");
    const intersections = horizontal.flatMap((h) =>
      vertical.flatMap((v) => h.cells.filter((cell) => v.cells.includes(cell))),
    );
    const uniqueCells = new Set(runs.flatMap((run) => run.cells));
    const longest = [...runs].sort((a, b) => b.cells.length - a.cells.length)[0];
    let special = null;
    if (!activated.size) {
      if (intersections.length && uniqueCells.size >= 5) special = "bomb";
      else if (runs.some((run) => run.cells.length >= 5) || uniqueCells.size >= 5) special = "prism";
      else if (longest?.cells.length === 4) special = longest.orientation === "horizontal" ? "row" : "column";
    }

    let keepIndex = null;
    if (special) {
      keepIndex = forced.find((index) => clear.has(index))
        ?? intersections[0]
        ?? longest?.cells[Math.floor(longest.cells.length / 2)]
        ?? uniqueCells.values().next().value;
      clear.delete(keepIndex);
      const [keepRow, keepCol] = coords(keepIndex);
      board[keepRow][keepCol] = { ...board[keepRow][keepCol], special };
      waveEffects.push({ type: `${special}-created`, at: keepIndex });
    }

    for (const effect of waveEffects) {
      if (effect.signature) {
        const [row, col] = coords(effect.at);
        const tile = board[row]?.[col];
        if (tile?.special === effect.type) clear.add(effect.at);
      }
    }
    if (!clear.size) break;

    combo += 1;
    const cells = [...clear];
    lastMatches = cells;
    clearedByWave.push({ combo, cells, effects: waveEffects.map(({ signature, ...effect }) => effect) });
    effects.push(...waveEffects.map(({ signature, ...effect }) => effect));
    score += cells.length * 55 * combo + (combo > 1 ? 80 * (combo - 1) : 0);
    for (const index of clear) {
      const [row, col] = coords(index);
      board[row][col] = null;
    }
    dropTiles(board, seed, turn, wave);
    forceSpecials = [];
  }

  return { board, score, combo, cleared: lastMatches, waves: clearedByWave, effects };
}

export function isAdjacent(first, second) {
  const [firstRow, firstCol] = coords(first);
  const [secondRow, secondCol] = coords(second);
  return Math.abs(firstRow - secondRow) + Math.abs(firstCol - secondCol) === 1;
}

export function hasLegalMove(board) {
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const first = key(row, col);
      for (const [nextRow, nextCol] of [[row + 1, col], [row, col + 1]]) {
        if (!inside(nextRow, nextCol)) continue;
        const second = key(nextRow, nextCol);
        if (board[row][col]?.special || board[nextRow][nextCol]?.special) return true;
        const copy = cloneBoard(board);
        [copy[row][col], copy[nextRow][nextCol]] = [copy[nextRow][nextCol], copy[row][col]];
        if (findMatches(copy).size) return true;
      }
    }
  }
  return false;
}

export function createDuelState(seed = Date.now()) {
  const stableSeed = (Number(seed) >>> 0) || 1;
  let board = makeInitialBoard(stableSeed);
  for (let attempt = 0; attempt < 300 && !hasLegalMove(board); attempt += 1) {
    board = makeInitialBoard(stableSeed + attempt + 1);
  }
  return {
    seed: stableSeed,
    board,
    score: 0,
    movesLeft: DUEL_MOVES,
    comboBest: 0,
    turn: 0,
    lastScore: 0,
    lastClear: [],
    lastWaves: [],
    status: "playing",
  };
}

function cloneState(state) {
  return { ...state, board: cloneBoard(state.board), lastClear: [...state.lastClear], lastWaves: [...state.lastWaves] };
}

export function resolveDuelMove(state, first, second) {
  if (state.status !== "playing" || state.movesLeft <= 0) return { state, accepted: false, reason: "finished" };
  if (!Number.isInteger(first) || !Number.isInteger(second) || first < 0 || second >= BOARD_SIZE * BOARD_SIZE || !isAdjacent(first, second)) {
    return { state, accepted: false, reason: "not-adjacent" };
  }
  const next = cloneState(state);
  const [firstRow, firstCol] = coords(first);
  const [secondRow, secondCol] = coords(second);
  const firstTile = next.board[firstRow][firstCol];
  const secondTile = next.board[secondRow][secondCol];
  [next.board[firstRow][firstCol], next.board[secondRow][secondCol]] = [secondTile, firstTile];
  const specialSwap = Boolean(firstTile?.special || secondTile?.special);
  if (!findMatches(next.board).size && !specialSwap) {
    return { state, accepted: false, reason: "no-match" };
  }

  const forced = specialSwap ? [second, first].filter((index) => {
    const [row, col] = coords(index);
    return Boolean(next.board[row][col]?.special);
  }) : [];
  const resolved = resolveBoard(next.board, state.seed, state.turn, forced, [first, second]);
  next.board = resolved.board;
  next.score += resolved.score;
  next.lastScore = resolved.score;
  next.comboBest = Math.max(next.comboBest, resolved.combo);
  next.turn += 1;
  next.movesLeft -= 1;
  next.lastClear = resolved.cleared;
  next.lastWaves = resolved.waves;
  if (!hasLegalMove(next.board) && next.movesLeft > 0) {
    next.board = makeInitialBoard(state.seed ^ (next.turn * 0x45d9f3b));
  }
  if (next.movesLeft === 0) next.status = "finished";
  return { state: next, accepted: true, reason: null };
}

export function findBestMove(state) {
  let best = null;
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const first = key(row, col);
      for (const [nextRow, nextCol] of [[row + 1, col], [row, col + 1]]) {
        if (!inside(nextRow, nextCol)) continue;
        const second = key(nextRow, nextCol);
        const result = resolveDuelMove(state, first, second);
        if (!result.accepted) continue;
        if (!best || result.state.lastScore > best.score) {
          best = { first, second, score: result.state.lastScore };
        }
      }
    }
  }
  return best;
}

export function chooseBotMove(state, difficulty = "medium") {
  const candidates = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const first = key(row, col);
      for (const [nextRow, nextCol] of [[row + 1, col], [row, col + 1]]) {
        if (!inside(nextRow, nextCol)) continue;
        const second = key(nextRow, nextCol);
        const result = resolveDuelMove(state, first, second);
        if (result.accepted) candidates.push({ first, second, score: result.state.lastScore });
      }
    }
  }
  if (!candidates.length) return null;
  const random = makeRandom(state.seed ^ Math.imul(state.turn + 1, 0x27d4eb2f));
  if (difficulty === "easy") return candidates[Math.floor(random() * candidates.length)];
  candidates.sort((a, b) => b.score - a.score);
  const top = candidates.slice(0, difficulty === "hard" ? Math.min(5, candidates.length) : Math.min(8, candidates.length));
  return top[Math.floor(random() * top.length)];
}

