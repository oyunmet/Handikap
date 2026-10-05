import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LEVELS,
  REGIONS,
  TILE_META,
  createLevelState,
  fireLightSeed,
  getFogRemaining,
  getLevel,
  getLightCost,
  getRegion,
  swapTiles,
} from "./game.js";

const PROGRESS_KEY = "handikap-fig-progress-v1";
const INTRO_KEY = "handikap-fig-intro-seen";
const emptyProgress = { completed: {} };

function readProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return emptyProgress;
    const parsed = JSON.parse(raw);
    const completed = parsed?.completed && typeof parsed.completed === "object" ? parsed.completed : {};
    return { completed };
  } catch {
    return emptyProgress;
  }
}

function Glyph({ type, className = "" }) {
  const common = {
    className: `tile-symbol ${className}`,
    viewBox: "0 0 48 48",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  if (type === 0) {
    return <svg {...common}><circle cx="24" cy="24" r="8" fill="currentColor" stroke="none" />{Array.from({ length: 8 }, (_, i) => <path key={i} d="M24 5v5" transform={`rotate(${i * 45} 24 24)`} />)}</svg>;
  }
  if (type === 1) {
    return <svg {...common}><path d="M10 35C11 17 23 9 39 9c0 17-7 29-25 30" /><path d="M14 35c5-8 11-14 21-20" /><path d="M19 27 18 17m8 4 8 1" /></svg>;
  }
  if (type === 2) {
    return <svg {...common}><path d="M24 40V21m0 5-8-8m8 3 8-11m-8 19-10 1m10-8 10 2" /><circle cx="15" cy="16" r="3" fill="currentColor" stroke="none" /><circle cx="33" cy="9" r="3" fill="currentColor" stroke="none" /><circle cx="34" cy="23" r="3" fill="currentColor" stroke="none" /><circle cx="13" cy="31" r="3" fill="currentColor" stroke="none" /><path d="M20 41h8" /></svg>;
  }
  if (type === 3) {
    return <svg {...common}><path d="m24 5 4.4 13.1L42 24l-13.6 5.9L24 43l-4.4-13.1L6 24l13.6-5.9L24 5Z" fill="currentColor" fillOpacity=".18" /><circle cx="24" cy="24" r="3" fill="currentColor" stroke="none" /></svg>;
  }
  if (type === 4) {
    return <svg {...common}><path d="M24 5C19 13 12 21 12 29a12 12 0 0 0 24 0c0-8-7-16-12-24Z" fill="currentColor" fillOpacity=".17" /><path d="M18 30c.4 3.7 2.4 5.8 5.8 6.4" /></svg>;
  }
  return <svg {...common}><path d="M33.8 30.2A15 15 0 0 1 18 8.7a15.2 15.2 0 1 0 15.8 21.5Z" fill="currentColor" fillOpacity=".2" /><path d="m31.5 9 .8 2.4 2.4.8-2.4.8-.8 2.4-.8-2.4-2.4-.8 2.4-.8.8-2.4Z" fill="currentColor" stroke="none" /></svg>;
}

function BrandGlyph() {
  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 27V14m0 6-6-6m6 2 6-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M9 13c.2-4.1 2.3-6.1 6.1-6.3-.1 4-2.1 6.1-6.1 6.3Zm7-2.2c.2-4.2 2.3-6.2 6.2-6.4-.2 4.1-2.2 6.2-6.2 6.4Z" fill="currentColor" /></svg>;
}

function SparkIcon({ className = "" }) {
  return <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 3.5 19.4 12.6 28.5 16l-9.1 3.4L16 28.5l-3.4-9.1L3.5 16l9.1-3.4L16 3.5Z" fill="currentColor" fillOpacity=".18" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><circle cx="16" cy="16" r="2.1" fill="currentColor" /></svg>;
}

function LockIcon({ className = "" }) {
  return <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="4.3" y="8.5" width="11.4" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M6.8 8.4V6a3.2 3.2 0 0 1 6.4 0v2.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
}

function Star({ lit, className = "" }) {
  return <svg className={`${className}${lit ? " lit" : ""}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2.7 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9L12 2.7Z" /></svg>;
}

function getStars(game) {
  const level = getLevel(game.levelId);
  if (game.movesLeft >= Math.ceil(level.moveLimit * 0.4)) return 3;
  if (game.movesLeft > 0) return 2;
  return 1;
}

function getUnlockedLevel(progress) {
  let unlocked = 1;
  for (const level of LEVELS) {
    if (!progress.completed[level.id]) break;
    unlocked = Math.min(LEVELS.length, level.id + 1);
  }
  return unlocked;
}

function App() {
  const [game, setGame] = useState(() => createLevelState(1));
  const [progress, setProgress] = useState(readProgress);
  const [selected, setSelected] = useState(null);
  const [dragPreview, setDragPreview] = useState(null);
  const [targetMode, setTargetMode] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(() => {
    try { return !localStorage.getItem(INTRO_KEY); } catch { return true; }
  });
  const [toast, setToast] = useState("");
  const [burstTurnId, setBurstTurnId] = useState(0);
  const [comboCue, setComboCue] = useState(null);
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);

  const level = useMemo(() => getLevel(game.levelId), [game.levelId]);
  const region = useMemo(() => getRegion(level.regionId), [level.regionId]);
  const fogLeft = getFogRemaining(game);
  const lightCost = getLightCost();
  const unlockedLevel = getUnlockedLevel(progress);
  const currentRegionLevels = LEVELS.filter((item) => item.regionId === region.id);
  const completedInRegion = currentRegionLevels.filter((item) => progress.completed[item.id]).length;
  const chargePercent = Math.min(100, Math.round((game.lightCharge / lightCost) * 100));

  useEffect(() => {
    if (game.status !== "won") return;
    const stars = getStars(game);
    setProgress((previous) => {
      const oldStars = previous.completed[game.levelId] || 0;
      const next = { completed: { ...previous.completed, [game.levelId]: Math.max(oldStars, stars) } };
      try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(next)); } catch { /* Storage can be unavailable in private contexts. */ }
      return next;
    });
  }, [game.status, game.levelId, game.movesLeft]);

  useEffect(() => {
    if (!toast && !game.message) return undefined;
    const timer = window.setTimeout(() => {
      setToast("");
      if (game.message) setGame((current) => current.message === game.message ? { ...current, message: "" } : current);
    }, 2600);
    return () => window.clearTimeout(timer);
  }, [toast, game.message]);

  useEffect(() => {
    if (!game.turnId) return undefined;
    setBurstTurnId(game.turnId);
    setComboCue(game.cascades > 1 ? { turnId: game.turnId, count: game.cascades } : null);
    const timer = window.setTimeout(() => {
      setBurstTurnId((current) => current === game.turnId ? 0 : current);
      setComboCue((current) => current?.turnId === game.turnId ? null : current);
    }, 1150);
    return () => window.clearTimeout(timer);
  }, [game.turnId, game.cascades]);

  const dismissHelp = () => {
    setShowHelp(false);
    try { localStorage.setItem(INTRO_KEY, "yes"); } catch { /* The instructions remain accessible from the header. */ }
  };

  const startLevel = (levelId) => {
    if (levelId > getUnlockedLevel(progress)) return;
    setGame(createLevelState(levelId));
    setSelected(null);
    setTargetMode(false);
    setMapOpen(false);
    setToast("");
  };

  const handleTile = (row, col) => {
    if (suppressClickRef.current) return;
    if (mapOpen || game.status !== "playing") return;
    if (targetMode) {
      setGame((current) => fireLightSeed(current, { row, col }));
      setTargetMode(false);
      setSelected(null);
      setToast("Işık tohumu çevresindeki taşları arındırdı.");
      return;
    }
    if (!selected) {
      setSelected({ row, col });
      return;
    }
    if (selected.row === row && selected.col === col) {
      setSelected(null);
      return;
    }
    const isAdjacent = Math.abs(selected.row - row) + Math.abs(selected.col - col) === 1;
    if (isAdjacent) {
      setGame((current) => swapTiles(current, selected, { row, col }));
      setSelected(null);
      return;
    }
    setSelected({ row, col });
  };

  const startTileDrag = (event, row, col) => {
    if ((event.pointerType === "mouse" && event.button !== 0) || dragRef.current) return;
    if (mapOpen || targetMode || game.status !== "playing") return;
    dragRef.current = {
      pointerId: event.pointerId,
      start: { row, col },
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
  };

  useEffect(() => {
    const cellAtPoint = (event) => {
      const tile = document.elementFromPoint(event.clientX, event.clientY)?.closest?.(".tile-cell");
      if (!tile) return null;
      return { row: Number(tile.dataset.row), col: Number(tile.dataset.col) };
    };

    const handlePointerMove = (event) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 10) return;
      drag.moved = true;
      const target = cellAtPoint(event);
      setDragPreview((current) => {
        if (
          current?.start.row === drag.start.row &&
          current?.start.col === drag.start.col &&
          current?.target?.row === target?.row &&
          current?.target?.col === target?.col
        ) return current;
        return { start: drag.start, target };
      });
    };

    const handlePointerUp = (event) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const wasDrag = drag.moved;
      const target = cellAtPoint(event);
      dragRef.current = null;
      setDragPreview(null);
      if (!wasDrag) return;

      suppressClickRef.current = true;
      window.setTimeout(() => { suppressClickRef.current = false; }, 0);
      if (!target || mapOpen || targetMode || game.status !== "playing") return;

      const distance = Math.abs(drag.start.row - target.row) + Math.abs(drag.start.col - target.col);
      if (distance === 1) {
        setGame((current) => swapTiles(current, drag.start, target));
        setSelected(null);
        setToast("");
      } else if (distance > 1) {
        setToast("Bir taşı yalnızca yanındaki kareye sürükleyebilirsin.");
      }
    };

    const handlePointerCancel = (event) => {
      if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
      dragRef.current = null;
      setDragPreview(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [game.status, mapOpen, targetMode]);

  const retryLevel = () => startLevel(game.levelId);
  const completedCount = Object.keys(progress.completed).filter((id) => Number(id) >= 1 && Number(id) <= 9).length;
  const nextLevel = game.levelId < LEVELS.length ? game.levelId + 1 : null;
  return (
    <main className={`app-shell theme-${region.theme}`}>
      <header className="topbar">
        <div className="brand-lockup" aria-label="Handikap — Işık Bahçesi">
          <span className="brand-mark"><BrandGlyph /></span>
          <span><span className="brand-name">Handikap</span><span className="brand-caption">Işık Bahçesi</span></span>
        </div>
        <div className="top-actions">
          <button className="text-button" onClick={() => { setMapOpen((open) => !open); setTargetMode(false); setSelected(null); }}>
            {mapOpen ? "Bahçeye dön" : "Bölge haritası"}
          </button>
          {!mapOpen && <button className="icon-button" aria-label="Bu bölümü yeniden başlat" title="Bölümü yeniden başlat" onClick={retryLevel}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 7v5h-5M4.5 16.5A8 8 0 0 0 18.6 18M4 12a8 8 0 0 1 14-5l2 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>}
          <button className="icon-button" aria-label="Nasıl oynanır?" title="Nasıl oynanır?" onClick={() => setShowHelp(true)}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" /><path d="M9.7 9a2.4 2.4 0 1 1 4 1.8c-1.2.8-1.7 1.3-1.7 2.5M12 16.7v.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
          </button>
        </div>
      </header>

      {mapOpen ? (
        <section className="page-wrap map-view" aria-label="Bölge ve bölüm haritası">
          <div className="map-intro">
            <div>
              <div className="eyebrow">Işık izini takip et</div>
              <h1 className="map-title">Bahçe haritası</h1>
              <p className="map-description">Her eşleşme, unutulmuş bir manzarayı sisin altından çıkarır.</p>
            </div>
            <div className="map-progress-pill">{completedCount} / 9 bölüm tamamlandı</div>
          </div>
          {REGIONS.map((mapRegion) => {
            const regionLevels = LEVELS.filter((item) => item.regionId === mapRegion.id);
            const regionCompleted = regionLevels.filter((item) => progress.completed[item.id]).length;
            const regionUnlocked = mapRegion.levels[0] <= unlockedLevel;
            const regionOpen = regionUnlocked || regionCompleted > 0;
            return (
              <article className={`region-map-card theme-${mapRegion.theme}`} key={mapRegion.id}>
                <div className="region-map-head">
                  <div>
                    <div className="region-mark">BÖLGE {mapRegion.mark}</div>
                    <h2 className="map-region-name">{mapRegion.name}</h2>
                    <p className="map-region-sub">{mapRegion.subtitle}</p>
                  </div>
                  <span className="region-state">{regionCompleted === 3 ? "Işığı döndü" : regionOpen ? "Açık" : "Kilitli"}</span>
                </div>
                <div className="level-route">
                  <div className="route-line" />
                  <div className="route-progress" style={{ width: `${regionCompleted === 0 ? 0 : Math.min(74, ((regionCompleted - 1) / 2) * 74)}%` }} />
                  {regionLevels.map((item) => {
                    const stars = progress.completed[item.id] || 0;
                    const available = item.id <= unlockedLevel;
                    const active = item.id === game.levelId;
                    return (
                      <div className="level-node-wrap" key={item.id}>
                        <button
                          className={`level-node ${available ? "available" : "locked"}${stars ? " completed" : ""}${active ? " current" : ""}`}
                          aria-label={`${item.name}, ${stars ? "tamamlandı" : available ? "oynamaya hazır" : "kilitli"}`}
                          disabled={!available}
                          onClick={() => startLevel(item.id)}
                        >
                          {available ? stars ? <Star lit className="node-star" /> : item.id.toString().padStart(2, "0") : <LockIcon className="node-lock" />}
                        </button>
                        <span className="node-name">{item.name}</span>
                        {stars > 0 && <span className="node-stars" aria-label={`${stars} yıldız`}>
                          {[1, 2, 3].map((star) => <Star key={star} lit={stars >= star} className="node-star" />)}
                        </span>}
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
          <div className="map-legend">
            <span className="legend-item"><i className="legend-dot open" /> Oynanabilir</span>
            <span className="legend-item"><i className="legend-dot" /> Tamamlandı</span>
            <span className="legend-item"><i className="legend-dot closed" /> Kilitli</span>
          </div>
          <p className="map-footer-note">Yeni yollar, önceki bölgenin üç ışığı da uyandığında açılır.</p>
        </section>
      ) : (
        <div className="page-wrap">
          <div className="hero-row">
            <div className="hero-copy">
              <div className="region-kicker"><span className="region-orb" /><span className="eyebrow">{region.name} · {region.mark}</span></div>
              <h1 className="hero-title">{level.name}</h1>
              <p className="hero-subtitle">{region.subtitle}</p>
            </div>
            <div className="level-chip">
              <span className="level-number">{String(level.id).padStart(2, "0")}</span>
              <span className="level-divider" />
              <span className="level-label">bölüm<br />{String(LEVELS.length).padStart(2, "0")}</span>
            </div>
          </div>

          {completedCount === 0 && <div className="instructions-banner">
            <span>Üç aynı ışığı yan yana getir. Sis kalkar; her eşleşme ışık tohumunu biraz daha doldurur.</span>
            <button onClick={() => setShowHelp(true)}>Nasıl oynanır?</button>
          </div>}

          <div className="game-layout">
            <section className="play-column" aria-label="Oyun alanı">
              <div className="status-strip">
                <div className="status-item">
                  <div><span className="status-label">Hamle</span><span className="status-value">{game.movesLeft}<span className="status-unit">/ {level.moveLimit}</span></span></div>
                  <svg width="25" height="25" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7 4 10 0-2.2 4.7 3.7 7.1a2.2 2.2 0 0 1-2 3.2H7.5a2.2 2.2 0 0 1-2-3.2l3.7-7.1L7 4Z" stroke="#86a56b" strokeWidth="1.5" strokeLinejoin="round" /><path d="M8.8 8.7h6.4" stroke="#86a56b" strokeWidth="1.5" /></svg>
                </div>
                <div className="status-item">
                  <div><span className="status-label">Puan</span><span className="status-value score-value">{game.score.toLocaleString("tr-TR")}</span></div>
                  <SparkIcon className="status-spark" />
                </div>
                <div className="status-item">
                  <div><span className="status-label">Bahçe sisi</span><span className="status-value">{fogLeft}<span className="status-unit">kare</span></span></div>
                  <svg width="27" height="25" viewBox="0 0 28 26" fill="none" aria-hidden="true"><path d="M6 17.7h15a3.5 3.5 0 0 0 .2-7 6 6 0 0 0-11.5-1.1A4.2 4.2 0 0 0 6 17.7Z" fill="#c9dcca" stroke="#8fae98" strokeWidth="1.3" /><path d="M9 21h11M5 22h2" stroke="#8fae98" strokeWidth="1.3" strokeLinecap="round" /></svg>
                </div>
              </div>

              <div className="board-card">
                <div className="board-heading">
                  <span className="board-heading-title">IŞIK ALANI <span style={{ opacity: .55 }}>—</span> 08 × 08</span>
                  <span className="board-hint">{targetMode ? "Işığın düşeceği kareyi seç" : "Taşı sürükle ya da dokun"}</span>
                </div>
                {comboCue?.turnId === game.turnId && <div className="combo-cue" key={comboCue.turnId} role="status">
                    <SparkIcon /><span><strong>ZİNCİR IŞIĞI</strong><b>{comboCue.count}×</b></span>
                </div>}
                <div className="board-grid" role="grid" aria-label="Sekiz çarpı sekiz ışık taşı tahtası">
                  {game.board.map((row, rowIndex) => row.map((tile, colIndex) => {
                    const meta = TILE_META[tile.type];
                    const isSelected = selected?.row === rowIndex && selected?.col === colIndex;
                    const isBurstCell = burstTurnId === game.turnId && game.clearedCells.some((cell) => cell.row === rowIndex && cell.col === colIndex);
                    const isDragStart = dragPreview?.start.row === rowIndex && dragPreview?.start.col === colIndex;
                    const isDragTarget = dragPreview?.target?.row === rowIndex && dragPreview?.target?.col === colIndex;
                    return (
                      <button
                        key={tile.id}
                        data-row={rowIndex}
                        data-col={colIndex}
                        className={`tile-cell${isSelected ? " selected" : ""}${isBurstCell ? " burst-cell" : ""}${isDragStart ? " dragging" : ""}${isDragTarget ? " drag-target" : ""}`}
                        style={{ "--tile-color": meta.color, "--tile-deep": meta.deep, "--cell-index": rowIndex * 8 + colIndex }}
                        onPointerDown={(event) => startTileDrag(event, rowIndex, colIndex)}
                        onClick={() => handleTile(rowIndex, colIndex)}
                        aria-label={`Satır ${rowIndex + 1}, sütun ${colIndex + 1}: ${meta.name}${game.fog[rowIndex][colIndex] ? ", sisli" : ""}`}
                        role="gridcell"
                      >
                        <Glyph type={tile.type} />
                        {isBurstCell && <span className="match-burst" key={`${game.turnId}-${rowIndex}-${colIndex}`} aria-hidden="true" />}
                        {game.fog[rowIndex][colIndex] && <span className="fog-veil" aria-hidden="true" />}
                      </button>
                    );
                  }))}
                </div>
                <div className="board-footer">
                  <span className="board-caption">{targetMode ? <><strong>Hedef seçimi açık</strong> · tıklayarak tohumu bırak</> : <>Hamleni düşün. <strong>Taşlar hatırlar.</strong></>}</span>
                  <span className="fog-caption">{Math.max(0, level.fogGoal - fogLeft)} / {level.fogGoal} sis kalktı</span>
                </div>
                {game.status !== "playing" && <div className="board-veil">
                  <div className="result-card">
                    <div className="result-mark">
                      {game.status === "won" ? <svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M24 5v8m0 22v8M5 24h8m22 0h8M10.6 10.6l5.7 5.7m15.4 15.4 5.7 5.7m0-26.8-5.7 5.7m-15.4 15.4-5.7 5.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="24" cy="24" r="9" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeWidth="2" /><circle cx="24" cy="24" r="3" fill="currentColor" /></svg> : <svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M8 30c6-8 9-14 16-14s10 6 16 14M13 35h22M18 26l4 4m8-5-4 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="24" cy="12" r="3" fill="currentColor" /></svg>}
                    </div>
                    <div className="result-kicker">{game.status === "won" ? "Manzara hatırlandı" : "Sis yeniden çöktü"}</div>
                    <h2 className="result-title">{game.status === "won" ? "Işık geri döndü." : "Bir kez daha deneyelim."}</h2>
                    <p className="result-copy">{game.status === "won" ? `${region.name} içindeki ${level.name} bölümü aydınlandı. Bir sonraki iz seni bekliyor.` : "Bu kez taşların ritmini daha yakından dinle. Işık tohumu hamle harcamadan yardım edebilir."}</p>
                    {game.status === "won" && <div className="stars" aria-label={`${getStars(game)} yıldız kazandın`}>
                      {[1, 2, 3].map((star) => <Star key={star} lit={getStars(game) >= star} className="star" />)}
                    </div>}
                    <div className="result-actions">
                      {game.status === "won" && nextLevel && nextLevel <= unlockedLevel && <button className="primary-button" onClick={() => startLevel(nextLevel)}>Sonraki bölüm</button>}
                      <button className={game.status === "lost" ? "primary-button" : "secondary-button"} onClick={retryLevel}>Yeniden dene</button>
                      <button className="secondary-button" onClick={() => { setMapOpen(true); setTargetMode(false); }}>Haritaya dön</button>
                    </div>
                  </div>
                </div>}
              </div>
            </section>

            <aside className="side-column" aria-label="Bölüm bilgileri">
              <section className="side-card goal-card">
                <div className="card-heading"><h2 className="card-title">Bu bahçede</h2><span className="card-index">HEDEFLER</span></div>
                <div className="goal-list">
                  {level.goals.map((goal) => {
                    const count = game.collected[goal.type] || 0;
                    const done = count >= goal.count;
                    return <React.Fragment key={goal.type}>
                      <div>
                        <div className="goal-row">
                          <span className="goal-icon" style={{ "--goal-color": TILE_META[goal.type].deep }}><Glyph type={goal.type} /></span>
                          <span><span className="goal-name">{TILE_META[goal.type].name}</span><span className="goal-caption">ışığını topla</span></span>
                          <span className={`goal-count${done ? " done" : ""}`}>{Math.min(count, goal.count)} / {goal.count}</span>
                        </div>
                        <div className="goal-track"><div className="goal-fill" style={{ width: `${Math.min(100, (count / goal.count) * 100)}%` }} /></div>
                      </div>
                    </React.Fragment>;
                  })}
                </div>
                <div className="goal-divider" />
                <div className="fog-meter-row"><span>Sisi arındır</span><strong>{Math.max(0, level.fogGoal - fogLeft)} / {level.fogGoal}</strong></div>
                <div className="fog-track"><div className="fog-fill" style={{ width: `${Math.min(100, ((level.fogGoal - fogLeft) / level.fogGoal) * 100)}%` }} /></div>
              </section>

              <section className={`side-card light-card${targetMode ? " target-active" : ""}`}>
                <div className="light-top">
                  <span className="light-symbol"><SparkIcon /></span>
                  <div><div className="eyebrow" style={{ color: "#758d54" }}>ÖZEL YETENEK</div><h2 className="card-title">Işık tohumu</h2></div>
                </div>
                <p className="light-copy">3 × 3 çevresini arındırır. Hamle harcamaz; doğru yere bırak.</p>
                <div className="charge-track"><div className="charge-fill" style={{ width: `${chargePercent}%` }} /></div>
                <div className="charge-label"><span>IŞIK YÜKÜ</span><span>{game.lightCharge} / {lightCost}</span></div>
                <button
                  className={`seed-button${targetMode ? " targeting" : ""}`}
                  disabled={game.status !== "playing" || (game.lightCharge < lightCost && !targetMode)}
                  onClick={() => { setTargetMode((active) => !active); setSelected(null); }}
                >
                  {targetMode ? "Hedef modundan çık" : game.lightCharge >= lightCost ? "Hedef seç" : "Işık biriktir"}
                </button>
              </section>

              <section className="side-card region-card">
                <div className="region-line">
                  <div><div className="eyebrow">ŞİMDİKİ BÖLGE</div><div className="region-name">{region.name}</div><div className="region-subtitle">{region.subtitle}</div></div>
                  <span className="region-progress">{completedInRegion}/3</span>
                </div>
                <div className="region-dots" aria-label={`Bölgede ${completedInRegion} bölüm tamamlandı`}>
                  {currentRegionLevels.map((item) => <i key={item.id} className={`region-dot${progress.completed[item.id] ? " done" : ""}${item.id === level.id ? " current" : ""}`} />)}
                </div>
              </section>

              <section className="side-card tip-card">
                <span className="tip-mark"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21s-7-4.3-7-11a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 6.7-7 11-7 11Z" stroke="currentColor" strokeWidth="1.6" /><path d="M12 17V9m0 4-3-2m3 0 2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></span>
                <p className="tip-text"><strong>Bir adım ötesi:</strong> Daha büyük eşleşmeler ışığı daha hızlı doldurur. Tohumu hamle saymadan kullan.</p>
              </section>
            </aside>
          </div>
        </div>
      )}

      {(toast || game.message) && !mapOpen && game.status === "playing" && <div className="message-toast" role="status">{game.message || toast}</div>}

      {showHelp && <div className="help-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) dismissHelp(); }}>
        <section className="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title">
          <div className="help-top"><div><div className="eyebrow">BAHÇEYE HOŞ GELDİN</div><h2 className="help-title" id="help-title">Işık nasıl bulunur?</h2></div>
            <button className="icon-button" aria-label="Yardımı kapat" onClick={dismissHelp}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg></button>
          </div>
          <p className="help-copy">Taşlar rastgele güçlendirme değil, senin kurduğun küçük bir planın parçası. Her bölümde önce sisli manzarayı uyandır.</p>
          <div className="help-steps">
             <div className="help-step"><span className="step-number">01</span><p><strong>Bir taşı sürükle ya da iki komşu taşa dokun.</strong> Üç aynı ışık yan yana gelirse eşleşme oluşur. Hedef taşları ve sisli kareleri temizle.</p></div>
            <div className="help-step"><span className="step-number">02</span><p><strong>Işığı biriktir.</strong> Temizlenen her taş tohumu doldurur. Sayaç dolunca “Hedef seç” ile tahtada bir kareye dokun.</p></div>
            <div className="help-step"><span className="step-number">03</span><p><strong>Üç adım sonrasını düşün.</strong> Tohum 3 × 3 alanı hamle harcamadan arındırır. Hem hedefleri tamamla hem bütün sisi kaldır.</p></div>
          </div>
          <div className="help-close"><button className="primary-button" onClick={dismissHelp}>Bahçeye gir</button></div>
        </section>
      </div>}
    </main>
  );
}

export default App;
