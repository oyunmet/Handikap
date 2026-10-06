import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  createGameState,
  swapTiles,
  useBooster,
} from "./royal-engine.js";
import { getLevelDefinition, LEVEL_COUNT } from "./royal-levels.js";
import RoyalGameEffects from "./royal-ui/RoyalGameEffects.jsx";
import RoyalGameScreen, { RoyalPreLevelDialog } from "./royal-ui/RoyalGameScreen.jsx";
import RoyalLevelMap from "./royal-ui/RoyalLevelMap.jsx";
import { getAdjacentSwipeTarget } from "./royal-ui/swipe-target.js";
import "./royal-ui/RoyalGameScreen.css";

const CAMPAIGN_STORAGE_KEY = "royal-match-campaign-v1";

function readCampaignProgress() {
  const fresh = { unlockedLevel: 1, completedLevels: [] };
  try {
    const saved = JSON.parse(window.localStorage.getItem(CAMPAIGN_STORAGE_KEY) || "null");
    if (!saved || typeof saved !== "object") return fresh;
    const unlockedLevel = Math.min(
      LEVEL_COUNT,
      Math.max(1, Math.floor(Number(saved.unlockedLevel) || 1)),
    );
    const completedLevels = Array.isArray(saved.completedLevels)
      ? [...new Set(saved.completedLevels
        .map(Number)
        .filter((level) => Number.isInteger(level) && level >= 1 && level <= LEVEL_COUNT))]
      : [];
    return { unlockedLevel, completedLevels };
  } catch {
    return fresh;
  }
}

function writeCampaignProgress(progress) {
  try {
    window.localStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Keep the campaign playable if browser storage is unavailable.
  }
}

function getLevelDetails(levelNumber) {
  const level = getLevelDefinition(levelNumber);
  return {
    chapter: level.chapter,
    title: level.title,
    featureLabels: level.featureLabels,
    description: level.description,
    moves: level.moves,
    goals: Object.entries(level.goals).map(([id, remaining]) => ({ id, remaining })),
  };
}

function tilePositions(tileRefs) {
  const positions = new Map();
  tileRefs.current.forEach((element, id) => {
    if (element?.isConnected) positions.set(id, element.getBoundingClientRect());
  });
  return positions;
}

function RewardFlights({ flights }) {
  const layerRef = useRef(null);

  useLayoutEffect(() => {
    if (!flights.length || !layerRef.current) return undefined;
    const layer = layerRef.current;
    const root = layer.closest(".royal-game-screen");
    const rootRect = root?.getBoundingClientRect();
    if (!rootRect) return undefined;

    const animations = [];
    layer.querySelectorAll("[data-reward-flight]").forEach((element) => {
      const flight = flights[Number(element.dataset.rewardFlight)];
      if (!flight) return;
      const source = root.querySelector(`.rg-cell[data-row="${flight.row}"][data-col="${flight.col}"]`);
      const target = root.querySelector(`.rg-goal-item[data-goal-id="${flight.goal}"]`);
      if (!source || !target) return;

      const sourceRect = source.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const fromX = sourceRect.left - rootRect.left + sourceRect.width / 2;
      const fromY = sourceRect.top - rootRect.top + sourceRect.height / 2;
      const toX = targetRect.left - rootRect.left + targetRect.width * 0.74;
      const toY = targetRect.top - rootRect.top + targetRect.height / 2;
      element.style.left = `${fromX}px`;
      element.style.top = `${fromY}px`;
      const dx = toX - fromX;
      const dy = toY - fromY;
      if (typeof element.animate === "function") {
        animations.push(element.animate([
          { transform: "translate(-50%, -50%) scale(.5)", opacity: 0 },
          { transform: "translate(-50%, -50%) scale(1.05)", opacity: 1, offset: 0.16 },
          { transform: `translate(calc(-50% + ${dx * 0.52}px), calc(-50% + ${dy * 0.32 - 26}px)) scale(.88)`, opacity: 1, offset: 0.62 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.26)`, opacity: 0.12 },
        ], { duration: 780, easing: "cubic-bezier(.2,.72,.18,1)", fill: "both" }));
      }
    });
    return () => animations.forEach((animation) => animation.cancel());
  }, [flights]);

  return (
    <div className="rg-reward-flights" ref={layerRef} aria-hidden="true">
      {flights.map((flight, index) => (
        <span data-reward-flight={index} className={`rg-reward-flight rg-reward-${flight.goal}`} key={flight.id}>
          <b>−1</b>
        </span>
      ))}
    </div>
  );
}

function SettingsDialog({ onClose, onRestart, onLevelMap }) {
  return (
    <div className="rg-settings-overlay" role="presentation" onClick={onClose}>
      <section className="rg-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="rg-settings-title" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="rg-settings-close" onClick={onClose} aria-label="Ayarları kapat">×</button>
        <div className="rg-dialog-icon" aria-hidden="true">⚙</div>
        <p>OYUN AYARLARI</p>
        <h2 id="rg-settings-title">Kraliyet Macerası</h2>
        <button type="button" className="rg-restart-button" onClick={onRestart}>Bölümü yeniden başlat</button>
        <button type="button" className="rg-restart-button rg-map-button" onClick={onLevelMap}>Bölüm haritasına dön</button>
      </section>
    </div>
  );
}

function objectiveFlights(previous, next) {
  const sources = {
    gems: (next.clearedCells || []),
    vault: (next.specialEffects || []).filter((effect) => effect.type === "blocker-break" && effect.blocker === "vault"),
    grass: (next.specialEffects || []).filter((effect) => effect.type === "blocker-break" && effect.blocker === "grass"),
    bear: (next.specialEffects || []).filter((effect) => effect.type === "blocker-break" && effect.blocker === "bear"),
    hat: (next.specialEffects || []).filter((effect) => effect.type === "blocker-break" && effect.blocker === "hat"),
    drill: (next.specialEffects || []).filter((effect) => effect.type === "blocker-break" && effect.blocker === "drill"),
  };
  const flights = [];
  for (const goal of previous.goals || []) {
    const updated = next.goals.find((item) => item.id === goal.id);
    const collected = goal.remaining - (updated?.remaining ?? goal.remaining);
    if (collected <= 0) continue;
    let candidates = sources[goal.id] || [];
    if (goal.id === "gems") candidates = candidates.map(({ row, col }) => ({ row, col }));
    candidates = candidates.filter((source) => Number.isInteger(source.row) && Number.isInteger(source.col));
    if (!candidates.length) {
      const fallback = (next.clearedCells || [])[0];
      if (fallback) candidates = [{ row: fallback.row, col: fallback.col }];
    }
    for (let index = 0; index < Math.min(collected, candidates.length, 6); index += 1) {
      flights.push({
        id: `${next.turnId}-${goal.id}-${index}`,
        goal: goal.id,
        row: candidates[index].row,
        col: candidates[index].col,
      });
    }
  }
  return flights;
}

export default function RoyalGameApp() {
  const previewScreen = new URLSearchParams(window.location.search).get("preview");
  const [campaign, setCampaign] = useState(readCampaignProgress);
  const [selectedLevel, setSelectedLevel] = useState(campaign.unlockedLevel);
  const [screenMode, setScreenMode] = useState(
    () => import.meta.env.DEV && previewScreen === "game" ? "game" : "map",
  );
  const [preLevelOpen, setPreLevelOpen] = useState(
    () => import.meta.env.DEV && previewScreen === "start",
  );
  const [selectedPreBoosters, setSelectedPreBoosters] = useState([]);
  const [game, setGame] = useState(() => createGameState(1));
  const [selectedCell, setSelectedCell] = useState(null);
  const [activeBooster, setActiveBooster] = useState(null);
  const [activeEffectTurn, setActiveEffectTurn] = useState(-1);
  const [flights, setFlights] = useState([]);
  const [message, setMessage] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const gameRef = useRef(game);
  const tileRefs = useRef(new Map());
  const oldPositionsRef = useRef(null);
  const previousTurnRef = useRef(game);
  const effectTimerRef = useRef(null);
  const flightTimerRef = useRef(null);
  const messageTimerRef = useRef(null);
  const suppressClickRef = useRef(null);

  gameRef.current = game;

  const showMessage = useCallback((text) => {
    setMessage(text || "");
    window.clearTimeout(messageTimerRef.current);
    if (text) messageTimerRef.current = window.setTimeout(() => setMessage(""), 1900);
  }, []);

  const commit = useCallback((current, next) => {
    if (next.turnId === current.turnId) {
      showMessage(next.message || "");
      return false;
    }
    oldPositionsRef.current = tilePositions(tileRefs);
    gameRef.current = next;
    setGame(next);
    setSelectedCell(null);
    setActiveBooster(null);
    showMessage(next.message || "");
    return true;
  }, [showMessage]);

  const onCellRef = useCallback((id, element) => {
    if (!id) return;
    if (element) tileRefs.current.set(id, element);
    else tileRefs.current.delete(id);
  }, []);

  const onCellClick = useCallback((row, col) => {
    const suppression = suppressClickRef.current;
    if (suppression && suppression.expiresAt >= Date.now()) {
      if (suppression.cells.has(`${row}:${col}`)) {
        window.clearTimeout(suppression.timer);
        suppressClickRef.current = null;
        return;
      }
    } else if (suppression) {
      window.clearTimeout(suppression.timer);
      suppressClickRef.current = null;
    }
    const current = gameRef.current;
    if (current.status !== "playing") return;
    const target = { row, col };
    if (activeBooster) {
      const next = useBooster(current, activeBooster, target);
      commit(current, next);
      setSelectedCell(null);
      setActiveBooster(null);
      return;
    }

    if (!selectedCell) {
      setSelectedCell(target);
      return;
    }
    if (selectedCell.row === row && selectedCell.col === col) {
      setSelectedCell(null);
      return;
    }
    const adjacent = Math.abs(selectedCell.row - row) + Math.abs(selectedCell.col - col) === 1;
    if (!adjacent) {
      setSelectedCell(target);
      return;
    }
    commit(current, swapTiles(current, selectedCell, target));
  }, [activeBooster, commit, selectedCell]);

  const onCellPointerDown = useCallback((event, row, col) => {
    if (!event.isPrimary || event.button !== 0 || gameRef.current.status !== "playing" || activeBooster) return;
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    const sourceElement = event.currentTarget;
    const removePointerListeners = () => {
      window.removeEventListener("pointerup", pointerUp, true);
      window.removeEventListener("pointercancel", pointerCancel, true);
    };
    const pointerUp = (upEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      removePointerListeners();
      const releaseCell = document.elementFromPoint(upEvent.clientX, upEvent.clientY)
        ?.closest(".rg-cell[data-row][data-col]");
      const releaseRow = releaseCell ? Number(releaseCell.dataset.row) : undefined;
      const releaseCol = releaseCell ? Number(releaseCell.dataset.col) : undefined;
      const destination = getAdjacentSwipeTarget({
        row,
        col,
        startX,
        startY,
        endX: upEvent.clientX,
        endY: upEvent.clientY,
        releaseRow,
        releaseCol,
      });
      if (!destination) return;
      const destinationCell = document.querySelector(
        `.rg-cell[data-row="${destination.row}"][data-col="${destination.col}"]`,
      );
      const suppression = {
        expiresAt: Date.now() + 350,
        cells: new Set([`${row}:${col}`, `${destination.row}:${destination.col}`]),
        timer: null,
      };
      if (releaseCell) {
        suppression.cells.add(`${releaseCell.dataset.row}:${releaseCell.dataset.col}`);
      }
      suppressClickRef.current = suppression;
      suppression.timer = window.setTimeout(() => {
        if (suppressClickRef.current === suppression) suppressClickRef.current = null;
      }, 350);
      if (!destinationCell || destinationCell.disabled) return;
      const current = gameRef.current;
      if (current.status !== "playing") return;
      commit(current, swapTiles(current, { row, col }, destination));
    };
    const pointerCancel = (cancelEvent) => {
      if (cancelEvent.pointerId === pointerId) removePointerListeners();
    };
    try {
      sourceElement.setPointerCapture(pointerId);
    } catch {
      // Some embedded browsers reject capture if a pointer is already ending.
    }
    window.addEventListener("pointerup", pointerUp, true);
    window.addEventListener("pointercancel", pointerCancel, true);
  }, [activeBooster, commit]);

  const onBooster = useCallback((boosterId) => {
    if (gameRef.current.status !== "playing") return;
    setSelectedCell(null);
    setActiveBooster((current) => current === boosterId ? null : boosterId);
  }, []);

  const startLevel = useCallback((levelNumber) => {
    const level = Math.floor(Number(levelNumber));
    const justUnlockedNext = level === (gameRef.current.level || 1) + 1
      && gameRef.current.status === "won";
    if (!Number.isInteger(level) || level < 1 || level > LEVEL_COUNT) return;
    if (level > campaign.unlockedLevel && !justUnlockedNext) return;
    window.clearTimeout(effectTimerRef.current);
    window.clearTimeout(flightTimerRef.current);
    const fresh = createGameState(level);
    gameRef.current = fresh;
    previousTurnRef.current = fresh;
    oldPositionsRef.current = null;
    setGame(fresh);
    setSelectedLevel(level);
    setSelectedCell(null);
    setActiveBooster(null);
    setActiveEffectTurn(-1);
    setFlights([]);
    setSettingsOpen(false);
    setPreLevelOpen(true);
    setSelectedPreBoosters([]);
    setScreenMode("map");
    showMessage("");
  }, [campaign.unlockedLevel, showMessage]);

  const togglePreBooster = useCallback((boosterId) => {
    setSelectedPreBoosters((current) => (
      current.includes(boosterId)
        ? current.filter((id) => id !== boosterId)
        : [...current, boosterId]
    ));
  }, []);

  const beginLevel = useCallback(() => {
    const current = gameRef.current;
    const boosters = { ...current.boosters };
    selectedPreBoosters.forEach((boosterId) => {
      boosters[boosterId] = (boosters[boosterId] || 0) + 1;
    });
    const ready = { ...current, boosters };
    gameRef.current = ready;
    setGame(ready);
    setPreLevelOpen(false);
    setSelectedPreBoosters([]);
    setScreenMode("game");
  }, [selectedPreBoosters]);

  const closePreLevel = useCallback(() => {
    setPreLevelOpen(false);
    setSelectedPreBoosters([]);
  }, []);

  const restart = useCallback(() => {
    const level = gameRef.current.level || 1;
    window.clearTimeout(effectTimerRef.current);
    window.clearTimeout(flightTimerRef.current);
    const fresh = createGameState(level);
    gameRef.current = fresh;
    previousTurnRef.current = fresh;
    oldPositionsRef.current = null;
    setGame(fresh);
    setSelectedLevel(level);
    setSelectedCell(null);
    setActiveBooster(null);
    setActiveEffectTurn(-1);
    setFlights([]);
    setSettingsOpen(false);
    setPreLevelOpen(false);
    setSelectedPreBoosters([]);
    showMessage("");
  }, [showMessage]);

  const returnToMap = useCallback(() => {
    setSettingsOpen(false);
    setPreLevelOpen(false);
    setSelectedPreBoosters([]);
    setScreenMode("map");
    setSelectedLevel(campaign.unlockedLevel);
    setSelectedCell(null);
    setActiveBooster(null);
  }, [campaign.unlockedLevel]);

  const continueCampaign = useCallback(
    () => startLevel(campaign.unlockedLevel),
    [campaign.unlockedLevel, startLevel],
  );

  const nextLevel = useCallback(() => {
    const level = gameRef.current.level || 1;
    if (level >= LEVEL_COUNT) returnToMap();
    else startLevel(level + 1);
  }, [returnToMap, startLevel]);

  useEffect(() => {
    if (game.status !== "won") return;
    setCampaign((current) => {
      const next = {
        unlockedLevel: Math.max(
          current.unlockedLevel,
          Math.min(LEVEL_COUNT, (game.level || 1) + 1),
        ),
        completedLevels: current.completedLevels.includes(game.level)
          ? current.completedLevels
          : [...current.completedLevels, game.level].sort((first, second) => first - second),
      };
      if (
        next.unlockedLevel === current.unlockedLevel
        && next.completedLevels.length === current.completedLevels.length
      ) return current;
      writeCampaignProgress(next);
      return next;
    });
  }, [game.level, game.status]);

  useEffect(() => {
    if (game.turnId === 0) {
      previousTurnRef.current = game;
      return undefined;
    }
    const previous = previousTurnRef.current;
    previousTurnRef.current = game;
    setActiveEffectTurn(game.turnId);
    window.clearTimeout(effectTimerRef.current);
    effectTimerRef.current = window.setTimeout(() => setActiveEffectTurn(-1), 2050);

    const nextFlights = objectiveFlights(previous, game);
    setFlights(nextFlights);
    window.clearTimeout(flightTimerRef.current);
    if (nextFlights.length) flightTimerRef.current = window.setTimeout(() => setFlights([]), 900);
    return undefined;
  }, [game.turnId]);

  useLayoutEffect(() => {
    const oldPositions = oldPositionsRef.current;
    if (!oldPositions || !game.turnId) return;
    oldPositionsRef.current = null;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    for (const [id, element] of tileRefs.current) {
      const oldRect = oldPositions.get(id);
      if (!element?.isConnected) continue;
      const newRect = element.getBoundingClientRect();
      if (oldRect) {
        const x = oldRect.left - newRect.left;
        const y = oldRect.top - newRect.top;
        if (Math.abs(x) + Math.abs(y) < 2) continue;
        element.animate([
          { transform: `translate(${x}px, ${y}px) scale(.94)`, opacity: 0.9 },
          { transform: "translate(0, 0) scale(1)", opacity: 1 },
        ], { duration: 400, easing: "cubic-bezier(.18,.74,.27,1)" });
      } else {
        const fall = game.fallingTiles?.find((tile) => tile.id === id);
        const tileHeight = newRect.height;
        const x = fall ? (fall.fromCol - fall.toCol) * newRect.width : 0;
        const y = fall && fall.fromRow >= 0 ? (fall.fromRow - fall.toRow) * tileHeight : -tileHeight * 1.35;
        element.animate([
          { transform: `translate(${x}px, ${y}px) scale(.88)`, opacity: 0.55 },
          { transform: "translate(0, 0) scale(1)", opacity: 1 },
        ], { duration: 440, easing: "cubic-bezier(.2,.75,.25,1)" });
      }
    }
  }, [game.turnId]);

  useEffect(() => () => {
    window.clearTimeout(effectTimerRef.current);
    window.clearTimeout(flightTimerRef.current);
    window.clearTimeout(messageTimerRef.current);
    window.clearTimeout(suppressClickRef.current?.timer);
  }, []);

  if (screenMode === "map") {
    return (
      <>
        <RoyalLevelMap
          unlockedLevel={campaign.unlockedLevel}
          completedLevels={campaign.completedLevels}
          selectedLevel={selectedLevel}
          onSelectLevel={setSelectedLevel}
          onStartLevel={startLevel}
          onContinue={continueCampaign}
          getLevelDetails={getLevelDetails}
        />
        {preLevelOpen && (
          <RoyalPreLevelDialog
            level={game.level}
            goals={game.goals}
            moves={game.movesLeft}
            selectedBoosters={selectedPreBoosters}
            onToggleBooster={togglePreBooster}
            onClose={closePreLevel}
            onPlay={beginLevel}
          />
        )}
      </>
    );
  }

  return (
    <>
      <RoyalGameScreen
        game={game}
        selectedCell={selectedCell}
        activeBooster={activeBooster}
        onCellClick={onCellClick}
        onCellPointerDown={onCellPointerDown}
        onBooster={onBooster}
        onSettings={() => setSettingsOpen(true)}
        onRetry={restart}
        onNextLevel={nextLevel}
        onLevelMap={returnToMap}
        totalLevels={LEVEL_COUNT}
        onCellRef={onCellRef}
        effectLayer={<RoyalGameEffects game={game} active={activeEffectTurn === game.turnId} />}
        rewardLayer={<RewardFlights flights={flights} />}
        settingsDialog={settingsOpen ? <SettingsDialog onClose={() => setSettingsOpen(false)} onRestart={restart} onLevelMap={returnToMap} /> : null}
        message={message || game.message}
      />
    </>
  );
}
