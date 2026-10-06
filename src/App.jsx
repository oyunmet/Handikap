import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  LEVELS,
  REGIONS,
  TILE_META,
  createLevelState,
  fireLightSeed,
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

const ROYAL_REGIONS = [
  { name: "Taç Avlusu", subtitle: "Mermer kemerlerin altında yeni bir hanedan başlıyor." },
  { name: "Safir Surlar", subtitle: "Rüzgâr, deniz kapısının eski sırlarını taşıyor." },
  { name: "Yıldız Kulesi", subtitle: "Göğün haritası en yüksek burçta saklı." },
];
const ROYAL_LEVEL_NAMES = [
  "İlk Nişan", "Gümüş Kapı", "Şafak Burcu",
  "Safir Geçit", "Ejderha Nöbeti", "Deniz Feneri",
  "Yıldız Odası", "Kayıp Takımyıldız", "Son Taç",
];
const TILE_NAMES = ["Kırmızı kalkan", "Mavi kalkan", "Taç", "Yaprak", "Elmas"];
const regionCopy = (region) => ROYAL_REGIONS[REGIONS.findIndex((item) => item.id === region.id)] ?? ROYAL_REGIONS[0];
const levelCopy = (item) => ROYAL_LEVEL_NAMES[item.id - 1] ?? item.name;

function Glyph({ type, special, className = "" }) {
  const common = {
    className: `tile-symbol ${className}`,
    viewBox: "0 0 48 48",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.35",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  if (special === "fish") {
    return <svg {...common} className={`${common.className} propeller-mark`}>
      <circle cx="24" cy="24" r="8" fill="currentColor" fillOpacity=".84" stroke="white" />
      <path d="M21 12c.5-5 5.5-5 6 0l-1 8h-4l-1-8Zm15 9c5 .5 5 5.5 0 6l-8-1v-4l8-1ZM27 36c-.5 5.5-5.5 5.5-6 0l1-8h4l1 8ZM12 27c-5-.5-5-5.5 0-6l8 1v4l-8 1Z" fill="currentColor" stroke="white" strokeWidth="1.2" />
      <path d="m24 20 4 4-4 4-4-4 4-4Z" fill="#fff6cb" stroke="none" />
    </svg>;
  }
  if (special === "bomb") {
    return <svg {...common} className={`${common.className} special-bomb-mark`}>
      <path d="M14 16h20v19l-4 4H18l-4-4V16Z" fill="currentColor" fillOpacity=".84" />
      <path d="M17 14h14v4H17zM17 21h14v10H17z" fill="currentColor" fillOpacity=".4" stroke="white" strokeOpacity=".76" />
      <path d="M18 26h12M21 24v4m4-4v4m4-4v4" stroke="white" strokeWidth="1.25" />
      <path d="m23 13 3-5 4 1" />
      <path d="m33 5 1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z" fill="white" stroke="none" />
      <text x="24" y="29" textAnchor="middle" fill="white" stroke="none" fontSize="5.3" fontWeight="900" fontFamily="sans-serif">TNT</text>
    </svg>;
  }
  if (special === "prism") {
    return <svg {...common} className={`${common.className} special-prism-mark`}>
      <circle cx="24" cy="24" r="17" fill="currentColor" fillOpacity=".5" stroke="white" strokeOpacity=".9" />
      <path d="M9 18h30M8 24h32M10 30h28M17 9c5 8 7 22 0 30m14-30c-5 8-7 22 0 30M12 13c8 4 16 4 24 0M12 35c8-4 16-4 24 0" stroke="white" strokeOpacity=".85" strokeWidth="1.1" />
      <circle cx="17" cy="17" r="2.2" fill="#fff3a5" stroke="none" /><circle cx="32" cy="26" r="2" fill="#ffc1e4" stroke="none" />
      <path d="m24 3 1.2 3.1L28 7l-2.8 1-1.2 3-1.1-3L20 7l2.9-.9L24 3Z" fill="white" stroke="none" />
    </svg>;
  }
  if (special === "rocket-horizontal" || special === "rocket-vertical") {
    return <svg {...common} className={`${common.className} rocket-mark`}>
      <g transform={special === "rocket-vertical" ? "rotate(90 24 24)" : undefined}>
        <path d="M8 21 30 11l8 8-10 22-5-12-15-8Z" fill="currentColor" fillOpacity=".92" stroke="white" strokeWidth="1.7" />
        <path d="m19 25 8-8m-14 4 5-1-3 5m13 6-1-5 5 3" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <path d="m8 21-3 7 8-1m-2 5 7-2-2 7" fill="#ffd45b" stroke="#fff1bd" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="30" cy="19" r="2" fill="#fff4c5" stroke="none" />
      </g>
    </svg>;
  }
  if (type === 0) {
    return <svg {...common}>
      <path d="M24 5 39 11v11c0 9-6 15-15 21C15 37 9 31 9 22V11l15-6Z" fill="currentColor" fillOpacity=".28" />
      <path d="M24 7 37 12v10c0 8-5 13-13 18-8-5-13-10-13-18V12l13-5Z" />
      <path d="m24 12 8 4v7c0 5-3 9-8 12-5-3-8-7-8-12v-7l8-4Z" fill="currentColor" fillOpacity=".72" />
      <path d="m19 20 5-3 5 3-1 7-4 3-4-3-1-7Z" stroke="white" strokeOpacity=".85" />
    </svg>;
  }
  if (type === 1) {
    return <svg {...common}>
      <path d="M24 4 39 10v12c0 9-6 16-15 22C15 38 9 31 9 22V10l15-6Z" fill="currentColor" fillOpacity=".32" />
      <path d="M24 6 37 11v11c0 8-5 14-13 19-8-5-13-11-13-19V11l13-5Z" />
      <path d="m24 13 8 4v8l-8 8-8-8v-8l8-4Z" fill="currentColor" fillOpacity=".72" />
      <path d="M20 19h8m-8 5h8m-4-5v10" stroke="white" strokeOpacity=".9" strokeWidth="1.6" />
      <path d="m17 15 3 2m11-2-3 2" stroke="white" strokeWidth="1.5" />
    </svg>;
  }
  if (type === 2) {
    return <svg {...common}>
      <path d="m8 13 9 7 7-13 7 13 9-7-4 25H12L8 13Z" fill="currentColor" fillOpacity=".46" />
      <path d="m8 13 9 7 7-13 7 13 9-7-4 25H12L8 13Z" />
      <path d="M12 32h24M13 26h22M17 20l7 7 7-7" stroke="white" strokeOpacity=".88" />
      <circle cx="24" cy="7" r="2" fill="white" stroke="none" />
    </svg>;
  }
  if (type === 3) {
    return <svg {...common}>
      <path d="M38 7C19 6 7 15 7 29c0 8 6 13 13 13 14 0 22-14 18-35Z" fill="currentColor" fillOpacity=".42" />
      <path d="M38 7C19 6 7 15 7 29c0 8 6 13 13 13 14 0 22-14 18-35Z" />
      <path d="M12 36c8-9 15-16 25-25M21 27l-1-9m-1 17 10 1m-2-17 8 1" stroke="white" strokeOpacity=".88" strokeWidth="1.6" />
      <path d="M16 36c5-7 11-14 18-20" stroke="#fff" strokeOpacity=".4" strokeWidth="3" />
    </svg>;
  }
  if (type === 4) {
    return <svg {...common}>
      <path d="m24 4 17 14-17 26L7 18 24 4Z" fill="currentColor" fillOpacity=".42" />
      <path d="m24 4 17 14-17 26L7 18 24 4Z" />
      <path d="m24 4-1 18 18-4M23 22 7 18m16 4 1 22m0-22 17-4" stroke="white" strokeOpacity=".86" />
      <path d="m24 4 7 15-8 3-7-5L24 4Z" fill="white" fillOpacity=".45" />
    </svg>;
  }
  return <svg {...common}><circle cx="24" cy="24" r="17" fill="currentColor" fillOpacity=".4" /><path d="m24 7 5 11 12 2-9 8 2 12-10-6-10 6 2-12-9-8 12-2 5-11Z" /></svg>;
}

function FishGlyph() {
  return <svg className="fish-glyph" viewBox="0 0 64 42" fill="none" aria-hidden="true">
    <circle cx="32" cy="21" r="8" fill="#ffd875" stroke="#fff2bf" strokeWidth="2" />
    <path d="M32 12V3m0 36v-9M23 21h-9m39 0h-9" stroke="#fff1b6" strokeWidth="4" strokeLinecap="round" />
    <path d="M28 4c1-3 7-3 8 0l-1 9h-6l-1-9Zm0 34c1 3 7 3 8 0l-1-9h-6l-1 9ZM14 17c-3 1-3 7 0 8l9-1v-6l-9-1Zm36 0c3 1 3 7 0 8l-9-1v-6l9-1Z" fill="#e8a94c" stroke="#fff0b5" strokeWidth="1.4" />
    <circle cx="32" cy="21" r="3" fill="#fff7dc" /><path d="m32 18 2 3-2 3-2-3 2-3Z" fill="#b64855" />
  </svg>;
}

function BrandGlyph() {
  return <svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M20 4 33 9v11c0 8-5.5 12.5-13 17-7.5-4.5-13-9-13-17V9l13-5Z" fill="currentColor" stroke="#fff1bd" strokeWidth="1.4" /><path d="m11 15 5 3 4-8 4 8 5-3-2 11H13l-2-11Z" fill="#fff0b0" stroke="#e0ae47" strokeWidth="1.1" /><circle cx="20" cy="21" r="2" fill="#3266a0" /></svg>;
}

function CrestMascot({ expression = "smile" }) {
  const mouth = expression === "worried" ? "M39 68c4-4 14-4 18 0" : expression === "celebrate" ? "M39 64c3 8 15 8 18 0" : "M40 65c4 6 12 6 16 0";
  return <svg className={`crest-mascot-art king-${expression}`} viewBox="0 0 96 106" fill="none" aria-hidden="true">
    <path d="M9 100c2-15 13-24 39-24s37 9 39 24H9Z" fill="#cf2638" stroke="#ffe29a" strokeWidth="3" />
    <path d="m26 84 22 16 22-16" fill="#a9132d" stroke="#f4c654" strokeWidth="2" />
    <path d="M22 42c0-18 11-29 26-29s26 11 26 29v20c0 18-12 28-26 28S22 80 22 62V42Z" fill="#f8c27c" stroke="#a75c36" strokeWidth="2" />
    <path d="M22 47c-9-4-11 11-2 15m54-15c9-4 11 11 2 15" fill="#f3bd77" stroke="#a75c36" strokeWidth="2" />
    <path d="M19 35 24 13l13 12 11-20 11 20 13-12 5 22c-17-7-40-7-58 0Z" fill="#f4bd39" stroke="#fff0a6" strokeWidth="3" strokeLinejoin="round" />
    <path d="M25 34h46v7H25z" fill="#d68b19" stroke="#fff0a6" strokeWidth="1.5" />
    <circle cx="48" cy="21" r="4" fill="#ee394b" stroke="#fff0a6" strokeWidth="2" />
    <path d={expression === "worried" ? "M34 48h8m12 0h8" : "M34 47c2-2 5-2 8 0m12 0c3-2 6-2 8 0"} stroke="#51392f" strokeWidth="2.5" strokeLinecap="round" />
    <ellipse cx="38" cy="54" rx="2" ry="3" fill="#293651" /><ellipse cx="58" cy="54" rx="2" ry="3" fill="#293651" />
    <path d="M48 55v8l-4 2" stroke="#ac653d" strokeWidth="2" strokeLinecap="round" />
    <path d="M32 64c4-7 10-8 16-5 6-3 12-2 16 5-4 4-9 5-16 2-7 3-12 2-16-2Z" fill="#f5f3e8" stroke="#c5c0b0" strokeWidth="1.5" />
    <path d={mouth} stroke="#7b3c30" strokeWidth="2" strokeLinecap="round" />
    <path d="M18 38c3-13 13-23 30-23m30 23c-3-13-13-23-30-23" stroke="#fff4c7" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round" />
  </svg>;
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
  const [targetMode, setTargetMode] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(() => {
    try { return !localStorage.getItem(INTRO_KEY); } catch { return true; }
  });
  const [toast, setToast] = useState("");
  const [burstTurnId, setBurstTurnId] = useState(0);
  const [comboCue, setComboCue] = useState(null);
  const dragRef = useRef(null);
  const pendingDragReleaseRef = useRef(null);
  const boardGridRef = useRef(null);
  const suppressClickRef = useRef(false);
  const audioContextRef = useRef(null);
  const gameRef = useRef(game);
  gameRef.current = game;

  const level = useMemo(() => getLevel(game.levelId), [game.levelId]);
  const region = useMemo(() => getRegion(level.regionId), [level.regionId]);
  const lightCost = getLightCost();
  const unlockedLevel = getUnlockedLevel(progress);
  const currentRegionLevels = LEVELS.filter((item) => item.regionId === region.id);
  const completedInRegion = currentRegionLevels.filter((item) => progress.completed[item.id]).length;
  const chargePercent = Math.min(100, Math.round((game.lightCharge / lightCost) * 100));
  const sampleCell = boardGridRef.current?.querySelector(".tile-cell");
  const sampleRect = sampleCell?.getBoundingClientRect();
  const gridStyle = boardGridRef.current ? window.getComputedStyle(boardGridRef.current) : null;
  const tilePitchX = (sampleRect?.width ?? 0) + (Number.parseFloat(gridStyle?.columnGap) || 0);
  const tilePitchY = (sampleRect?.height ?? 0) + (Number.parseFloat(gridStyle?.rowGap) || 0);
  const activeEffect = burstTurnId === game.turnId
    ? game.specialEffects.find((effect) => ["fish", "fish-created", "bomb-created", "bomb-explosion", "rocket-created", "rocket-explosion", "prism-created", "prism-explosion", "combo-explosion"].includes(effect.type))
    : null;
  const effectCaption = activeEffect?.type === "fish" ? "PERVANE HEDEFE UÇTU"
    : activeEffect?.type === "fish-created" ? "PERVANE HAZIR"
      : activeEffect?.type === "bomb-created" ? "TNT HAZIR"
        : activeEffect?.type === "bomb-explosion" ? "TNT PATLADI"
          : activeEffect?.type === "rocket-created" ? "ROKET HAZIR"
            : activeEffect?.type === "rocket-explosion" ? "ROKET HATTI AÇILDI"
              : activeEffect?.type === "prism-created" ? "IŞIK TOPU HAZIR"
                : activeEffect?.type === "prism-explosion" ? "RENKLER TAHTAYI SARDI"
                  : activeEffect?.type === "combo-explosion" ? "GÜÇLER BİRLEŞTİ"
                    : "";
  const displayGameMessage = (message) => ({
    "Taşlar yeniden dizildi.": "Taşlar yeniden sıralandı.",
    "Eşleşme olmadı; başka bir taş dene.": "Bu hamlede eşleşme yok. Başka bir komşu dene.",
    "Bölgenin ışığı geri döndü.": "Taç yeniden parlıyor!",
    "Hamleler tükendi. Yeniden deneyebilirsin.": "Hamleler bitti. Bir kez daha dene.",
  }[message] ?? message);
  const getCellCenter = (row, col) => {
    const grid = boardGridRef.current;
    const cell = grid?.querySelector(`.tile-cell[data-row="${row}"][data-col="${col}"]`);
    if (!grid || !cell) return { x: (col + 0.5) * 12.5, y: (row + 0.5) * 12.5, unit: "%" };
    const gridRect = grid.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    const gridStyle = window.getComputedStyle(grid);
    return {
      x: cellRect.left - gridRect.left - (Number.parseFloat(gridStyle.borderLeftWidth) || 0) + cellRect.width / 2,
      y: cellRect.top - gridRect.top - (Number.parseFloat(gridStyle.borderTopWidth) || 0) + cellRect.height / 2,
      unit: "px",
    };
  };
  const playInvalidSwapFeedback = () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        const context = audioContextRef.current ?? new AudioContextClass();
        audioContextRef.current = context;
        if (context.state === "suspended") void context.resume();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const now = context.currentTime;
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(125, now);
        oscillator.frequency.exponentialRampToValueAtTime(72, now + 0.075);
        gain.gain.setValueAtTime(0.075, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.115);
      }
    } catch { /* Audio may be unavailable or disabled by the browser. */ }
    try { if ("vibrate" in navigator) navigator.vibrate(12); } catch { /* Haptics are optional on the web. */ }
  };

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

  useLayoutEffect(() => {
    const pending = pendingDragReleaseRef.current;
    if (!pending) return;
    pendingDragReleaseRef.current = null;
    const source = pending.drag.sourceElement;
    const accepted = game.turnId !== pending.turnId;
    if (source?.isConnected && !accepted) {
      playInvalidSwapFeedback();
      source.classList.remove("dragging");
      source.classList.add("drag-return");
      window.setTimeout(() => {
        source.classList.remove("drag-return");
        source.style.removeProperty("--drag-x");
        source.style.removeProperty("--drag-y");
      }, 145);
    } else if (source) {
      source.style.setProperty("transition", "none", "important");
      source.classList.remove("dragging", "drag-return");
      source.style.removeProperty("--drag-x");
      source.style.removeProperty("--drag-y");
      window.requestAnimationFrame(() => source.style.removeProperty("transition"));
    }

    const partner = pending.drag.partner;
    if (accepted && partner?.element?.isConnected && partner.rect && typeof partner.element.animate === "function") {
      const rect = partner.element.getBoundingClientRect();
      const x = partner.rect.left - rect.left;
      const y = partner.rect.top - rect.top;
      if ((Math.abs(x) > 1 || Math.abs(y) > 1) && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        partner.element.animate(
          [
            { transform: `translate3d(${x}px, ${y}px, 0)` },
            { transform: "translate3d(0, 0, 0)" },
          ],
          { duration: 180, easing: "cubic-bezier(.2,.78,.24,1)" },
        );
      }
    }
  }, [game]);

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
    }, 1450);
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
      setToast("Taç çekici çevresindeki taşları temizledi.");
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
      const next = swapTiles(game, selected, { row, col });
      if (next.turnId === game.turnId) playInvalidSwapFeedback();
      setGame(next);
      setSelected(null);
      return;
    }
    setSelected({ row, col });
  };

  const startTileDrag = (event, row, col) => {
    if ((event.pointerType === "mouse" && event.button !== 0) || dragRef.current) return;
    if (mapOpen || targetMode || game.status !== "playing") return;
    const grid = boardGridRef.current;
    const tileRect = event.currentTarget.getBoundingClientRect();
    const gridStyle = grid ? window.getComputedStyle(grid) : null;
    dragRef.current = {
      pointerId: event.pointerId,
      start: { row, col },
      turnId: game.turnId,
      startX: event.clientX,
      startY: event.clientY,
      latestX: event.clientX,
      latestY: event.clientY,
      sourceElement: event.currentTarget,
      axis: null,
      pitchX: tileRect.width + (Number.parseFloat(gridStyle?.columnGap) || 0),
      pitchY: tileRect.height + (Number.parseFloat(gridStyle?.rowGap) || 0),
      target: null,
      targetElement: null,
      frameId: 0,
      moved: false,
    };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Window listeners still cover browsers without pointer capture. */ }
  };

  useEffect(() => {
    const clearDragTarget = (drag) => {
      drag.targetElement?.classList.remove("drag-target");
      drag.targetElement = null;
      drag.target = null;
    };

    const finishDragVisual = (drag, shouldReturn) => {
      if (drag.frameId) window.cancelAnimationFrame(drag.frameId);
      clearDragTarget(drag);
      const source = drag.sourceElement;
      if (!source) return;

      if (shouldReturn && drag.moved) {
        source.classList.remove("dragging");
        source.classList.add("drag-return");
        window.setTimeout(() => {
          source.classList.remove("drag-return");
          source.style.removeProperty("--drag-x");
          source.style.removeProperty("--drag-y");
        }, 145);
      } else {
        source.classList.remove("dragging", "drag-return");
        source.style.removeProperty("--drag-x");
        source.style.removeProperty("--drag-y");
      }
    };

    const updateDragVisual = (drag) => {
      const deltaX = drag.latestX - drag.startX;
      const deltaY = drag.latestY - drag.startY;
      const minIntent = 7;
      if (!drag.axis && Math.hypot(deltaX, deltaY) >= minIntent) {
        drag.axis = Math.abs(deltaX) >= Math.abs(deltaY) ? "x" : "y";
        drag.moved = true;
        drag.sourceElement.classList.add("dragging");
        setSelected(null);
      }
      if (!drag.axis) return;

      const isHorizontal = drag.axis === "x";
      const rawDisplacement = isHorizontal ? deltaX : deltaY;
      const pitch = isHorizontal ? drag.pitchX : drag.pitchY;
      const displacement = Math.max(-pitch, Math.min(pitch, rawDisplacement));
      drag.displacement = displacement;
      drag.progress = Math.abs(displacement);
      drag.sourceElement.style.setProperty("--drag-x", `${isHorizontal ? displacement : 0}px`);
      drag.sourceElement.style.setProperty("--drag-y", `${isHorizontal ? 0 : displacement}px`);

      const step = Math.sign(displacement);
      const row = drag.start.row + (isHorizontal ? 0 : step);
      const col = drag.start.col + (isHorizontal ? step : 0);
      const withinBoard = step !== 0 && row >= 0 && row < 8 && col >= 0 && col < 8;
      const shouldPreview = withinBoard && drag.progress >= pitch * 0.18;
      if (!shouldPreview) {
        clearDragTarget(drag);
        return;
      }

      drag.target = { row, col };
      const nextTargetElement = boardGridRef.current?.querySelector(
        `.tile-cell[data-row="${row}"][data-col="${col}"]`,
      );
      if (nextTargetElement !== drag.targetElement) {
        clearDragTarget(drag);
        drag.targetElement = nextTargetElement ?? null;
        drag.targetElement?.classList.add("drag-target");
      }
    };

    const scheduleDragVisual = (drag) => {
      if (drag.frameId) return;
      drag.frameId = window.requestAnimationFrame(() => {
        drag.frameId = 0;
        if (dragRef.current === drag) updateDragVisual(drag);
      });
    };

    const handlePointerMove = (event) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      drag.latestX = event.clientX;
      drag.latestY = event.clientY;
      if (!drag.axis && Math.hypot(drag.latestX - drag.startX, drag.latestY - drag.startY) < 7) return;
      scheduleDragVisual(drag);
    };

    const handlePointerUp = (event) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      drag.latestX = event.clientX;
      drag.latestY = event.clientY;
      updateDragVisual(drag);
      const destination = drag.target;
      const shouldSwap = Boolean(destination && drag.progress >= (drag.axis === "x" ? drag.pitchX : drag.pitchY) * 0.34);
      dragRef.current = null;
      if (!drag.moved) {
        finishDragVisual(drag, false);
        return;
      }

      suppressClickRef.current = true;
      window.setTimeout(() => { suppressClickRef.current = false; }, 0);
      const currentGame = gameRef.current;
      if (shouldSwap && !mapOpen && !targetMode && currentGame.status === "playing" && drag.turnId === currentGame.turnId) {
        drag.partner = drag.targetElement ? {
          element: drag.targetElement,
          rect: drag.targetElement.getBoundingClientRect(),
        } : null;
        clearDragTarget(drag);
        pendingDragReleaseRef.current = { drag, turnId: drag.turnId };
        setGame(swapTiles(currentGame, drag.start, destination));
        setSelected(null);
        setToast("");
      } else {
        finishDragVisual(drag, true);
      }
    };

    const handlePointerCancel = (event) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragRef.current = null;
      finishDragVisual(drag, true);
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
  const kingExpression = game.status === "won" ? "excited" : game.movesLeft <= 5 ? "worried" : "happy";
  return (
    <main className={`app-shell theme-${region.theme}`}>
      <header className="topbar">
        <div className="brand-lockup" aria-label="Royal Match">
          <span className="brand-mark"><BrandGlyph /></span>
          <span><span className="brand-name">Royal Match</span><span className="brand-caption">KRALİYET BULMACASI</span></span>
        </div>
        <div className="top-actions">
          <button className="text-button" onClick={() => { setMapOpen((open) => !open); setTargetMode(false); setSelected(null); }}>
            {mapOpen ? "Oyuna dön" : "Krallık haritası"}
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
              <div className="eyebrow">TAHTA YOLLARI</div>
              <h1 className="map-title">Krallık haritası</h1>
              <p className="map-description">Üç kadim diyarı aç, sarayın tacını yeniden birleştir.</p>
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
                    <h2 className="map-region-name">{regionCopy(mapRegion).name}</h2>
                    <p className="map-region-sub">{regionCopy(mapRegion).subtitle}</p>
                  </div>
                  <span className="region-state">{regionCompleted === 3 ? "TAMAMLANDI" : regionOpen ? "AÇIK" : "KİLİTLİ"}</span>
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
                          aria-label={`${levelCopy(item)}, ${stars ? "tamamlandı" : available ? "oynamaya hazır" : "kilitli"}`}
                          disabled={!available}
                          onClick={() => startLevel(item.id)}
                        >
                          {available ? stars ? <Star lit className="node-star" /> : item.id.toString().padStart(2, "0") : <LockIcon className="node-lock" />}
                        </button>
                        <span className="node-name">{levelCopy(item)}</span>
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
          <p className="map-footer-note">Her üç bölümü tamamla, yeni bir diyarın kapısını aç.</p>
        </section>
      ) : (
        <div className="page-wrap">
          <div className="hero-row">
            <div className="hero-copy">
              <div className="region-kicker"><span className="region-orb" /><span className="eyebrow">{regionCopy(region).name} · {region.mark}</span></div>
              <h1 className="hero-title">{levelCopy(level)}</h1>
              <p className="hero-subtitle">{regionCopy(region).subtitle}</p>
            </div>
            <div className="level-chip">
              <span className="level-number">{String(level.id).padStart(2, "0")}</span>
              <span className="level-divider" />
              <span className="level-label">bölüm<br />{String(LEVELS.length).padStart(2, "0")}</span>
            </div>
          </div>

          {completedCount === 0 && <div className="instructions-banner">
            <span>Üçlü eşleşmeler hedef taşlarını toplar. Uzun diziler özel saray güçleri doğurur.</span>
            <button onClick={() => setShowHelp(true)}>Kurallara göz at</button>
          </div>}

          <div className="game-layout">
            <section className="play-column" aria-label="Oyun alanı">
              <div className="status-strip">
                <section className="status-targets" aria-label="Bölüm hedefleri">
                  <div className="status-label">TAÇ GÖREVLERİ</div>
                  <div className="target-chip-row">
                    {level.goals.map((goal) => {
                      const count = game.collected[goal.type] || 0;
                      const complete = count >= goal.count;
                      return <div className={`target-chip${complete ? " is-complete" : ""}`} key={goal.type} style={{ "--target-color": TILE_META[goal.type].color }}>
                        <span className="target-glyph"><Glyph type={goal.type} /></span>
                        <span className="target-label">{TILE_NAMES[goal.type]}</span>
                        <strong className="target-count" key={`${goal.type}-${count}`}>{Math.min(count, goal.count)}<i>/{goal.count}</i></strong>
                      </div>;
                    })}
                  </div>
                </section>
                <div className={`center-crest king-${kingExpression}`} aria-label="Kral Robert">
                  <span className="crest-spark crest-spark-a" aria-hidden="true" /><CrestMascot expression={kingExpression === "excited" ? "celebrate" : kingExpression} /><span className="crest-spark crest-spark-b" aria-hidden="true" />
                </div>
                <div className="moves-panel">
                  <span className="status-label">HAMLE</span>
                  <strong key={`${game.turnId}-${game.movesLeft}`} className={burstTurnId === game.turnId ? "move-counter-pulse" : ""}>{game.movesLeft}</strong>
                  <span className="moves-total">/ {level.moveLimit}</span>
                  <span className="moves-score">PUAN {game.score.toLocaleString("tr-TR")}</span>
                </div>
              </div>

              <div className="board-card">
                <div className="board-heading">
                  <span className="board-heading-title">TAÇ TAHTASI <span style={{ opacity: .5 }}>·</span> 08 × 08</span>
                  <span className="board-hint">{targetMode ? "Çekicin ineceği kareyi seç" : "Taşı sürükle ya da dokun"}</span>
                </div>
                {effectCaption && <div className="special-cue" key={`${game.turnId}-${effectCaption}`} role="status">
                  <SparkIcon /><span>{effectCaption}</span>
                </div>}
                {comboCue?.turnId === game.turnId && <div className="combo-cue" key={comboCue.turnId} role="status">
                    <SparkIcon /><span><strong>TAÇ ZİNCİRİ</strong><b>{comboCue.count}×</b></span>
                </div>}
                <div ref={boardGridRef} className="board-grid" role="grid" aria-label="Sekiz çarpı sekiz saray taşı tahtası">
                  {game.board.map((row, rowIndex) => row.map((tile, colIndex) => {
                    const meta = TILE_META[tile.type];
                    const isSelected = selected?.row === rowIndex && selected?.col === colIndex;
                    const isBurstCell = burstTurnId === game.turnId && game.clearedCells.some((cell) => cell.row === rowIndex && cell.col === colIndex);
                    const isBombCreated = burstTurnId === game.turnId && game.specialEffects.some((effect) => effect.type === "bomb-created" && effect.at.row === rowIndex && effect.at.col === colIndex);
                    const isPrismCreated = burstTurnId === game.turnId && game.specialEffects.some((effect) => effect.type === "prism-created" && effect.at.row === rowIndex && effect.at.col === colIndex);
                    const isRocketCreated = burstTurnId === game.turnId && game.specialEffects.some((effect) => effect.type === "rocket-created" && effect.at.row === rowIndex && effect.at.col === colIndex);
                    const isFishCreated = burstTurnId === game.turnId && game.specialEffects.some((effect) => effect.type === "fish-created" && effect.at.row === rowIndex && effect.at.col === colIndex);
                    const falling = burstTurnId === game.turnId ? game.fallingTiles.find((entry) => entry.id === tile.id) : null;
                    const isPrism = tile.special === "prism";
                    const isBomb = tile.special === "bomb";
                    const isRocket = tile.special === "rocket-horizontal" || tile.special === "rocket-vertical";
                    const isFish = tile.special === "fish";
                    return (
                      <button
                        key={tile.id}
                        data-row={rowIndex}
                        data-col={colIndex}
                        className={`tile-cell${isSelected ? " selected" : ""}${isBurstCell ? " burst-cell" : ""}${isBomb ? " special-bomb" : ""}${isPrism ? " special-prism" : ""}${isRocket ? ` ${tile.special}` : ""}${isFish ? " special-fish" : ""}${isBombCreated ? " bomb-created-cell" : ""}${isPrismCreated ? " prism-created-cell" : ""}${isRocketCreated ? " rocket-created-cell" : ""}${isFishCreated ? " fish-created-cell" : ""}${falling ? " falling-tile" : ""}`}
                        style={{
                          "--tile-color": isBomb ? "#ffd879" : isPrism ? "#eaf7dc" : meta.color,
                          "--tile-deep": isBomb ? "#d65343" : isPrism ? "#719987" : meta.deep,
                          "--cell-index": rowIndex * 8 + colIndex,
                          "--fall-x-px": `${falling ? (falling.fromCol - falling.toCol) * tilePitchX : 0}px`,
                          "--fall-y-px": `${falling ? (falling.fromRow - falling.toRow) * tilePitchY : 0}px`,
                        }}
                        onPointerDown={(event) => startTileDrag(event, rowIndex, colIndex)}
                        onClick={() => handleTile(rowIndex, colIndex)}
                         aria-label={`Satır ${rowIndex + 1}, sütun ${colIndex + 1}: ${isBomb ? "TNT, " : isPrism ? "ışık topu, " : isRocket ? "roket, " : isFish ? "pervane, " : ""}${TILE_NAMES[tile.type] ?? meta.name}`}
                        aria-describedby="board-instructions"
                        role="gridcell"
                      >
                        <Glyph type={tile.type} special={tile.special} />
                        {isBurstCell && <span className="match-burst" key={`${game.turnId}-${rowIndex}-${colIndex}`} aria-hidden="true" />}
                      </button>
                    );
                  }))}
                  {burstTurnId === game.turnId && game.specialEffects.map((effect, index) => {
                    if (effect.type === "fish") {
                      const dx = effect.to.col - effect.from.col;
                      const dy = effect.to.row - effect.from.row;
                      const from = getCellCenter(effect.from.row, effect.from.col);
                      const to = getCellCenter(effect.to.row, effect.to.col);
                      return <React.Fragment key={`fish-${game.turnId}-${index}`}>
                        <span
                          className="fish-flight"
                          style={{
                            "--from-x": `${from.x}${from.unit}`,
                            "--from-y": `${from.y}${from.unit}`,
                            "--travel-x": `${to.x - from.x}px`,
                            "--travel-y": `${to.y - from.y}px`,
                            "--fish-angle": `${Math.atan2(dy, dx) * (180 / Math.PI)}deg`,
                          }}
                          aria-hidden="true"
                        ><FishGlyph /></span>
                        <span
                          className="fish-impact"
                          style={{
                            "--effect-x": `${to.x}${to.unit}`,
                            "--effect-y": `${to.y}${to.unit}`,
                          }}
                          aria-hidden="true"
                        />
                      </React.Fragment>;
                    }
                    if (effect.type === "bomb-created" || effect.type === "bomb-explosion") {
                      const center = getCellCenter(effect.at.row, effect.at.col);
                      return <span
                        className={`bomb-board-effect ${effect.type === "bomb-created" ? "created" : "exploded"}`}
                        key={`bomb-${game.turnId}-${index}`}
                        style={{
                          "--effect-x": `${center.x}${center.unit}`,
                          "--effect-y": `${center.y}${center.unit}`,
                        }}
                        aria-hidden="true"
                      />;
                    }
                    if (effect.type === "rocket-created" || effect.type === "rocket-explosion") {
                      const center = getCellCenter(effect.at.row, effect.at.col);
                      return <span
                        className={`rocket-board-effect ${effect.orientation ?? "horizontal"} ${effect.type === "rocket-created" ? "created" : "exploded"}`}
                        key={`rocket-${game.turnId}-${index}`}
                        style={{
                          "--effect-x": `${center.x}${center.unit}`,
                          "--effect-y": `${center.y}${center.unit}`,
                        }}
                        aria-hidden="true"
                      />;
                    }
                    if (effect.type === "prism-created" || effect.type === "prism-explosion") {
                      const center = getCellCenter(effect.at.row, effect.at.col);
                      return <span
                        className={`prism-board-effect ${effect.type === "prism-created" ? "created" : "exploded"}`}
                        key={`prism-${game.turnId}-${index}`}
                        style={{
                          "--effect-x": `${center.x}${center.unit}`,
                          "--effect-y": `${center.y}${center.unit}`,
                          "--prism-color": TILE_META[effect.color]?.color ?? "#e4f7bd",
                        }}
                        aria-hidden="true"
                      />;
                    }
                    if (effect.type === "combo-explosion") {
                      const center = getCellCenter(effect.at.row, effect.at.col);
                      return <span
                        className="combo-board-effect"
                        key={`combo-${game.turnId}-${index}`}
                        style={{
                          "--effect-x": `${center.x}${center.unit}`,
                          "--effect-y": `${center.y}${center.unit}`,
                        }}
                        aria-hidden="true"
                      />;
                    }
                    return null;
                  })}
                  {burstTurnId === game.turnId && game.scorePopups.map((popup) => {
                    const center = getCellCenter(popup.at.row, popup.at.col);
                    return <span
                      className="score-float"
                      key={popup.id}
                      style={{ "--score-x": `${center.x}${center.unit}`, "--score-y": `${center.y}${center.unit}` }}
                      aria-hidden="true"
                    >+{popup.value.toLocaleString("tr-TR")}</span>;
                  })}
                </div>
                <div className="board-footer">
                  <span id="board-instructions" className="board-caption">{targetMode ? <><strong>Çekiç hazır</strong> · bir kareye dokun</> : <>Bir komşu taşı seç. <strong>Tahtayı oku.</strong></>}</span>
                </div>
                {game.status !== "playing" && <div className="board-veil">
                  <div className="result-card">
                    <div className="result-mark">
                      {game.status === "won" ? <svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M24 5v8m0 22v8M5 24h8m22 0h8M10.6 10.6l5.7 5.7m15.4 15.4 5.7 5.7m0-26.8-5.7 5.7m-15.4 15.4-5.7 5.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="24" cy="24" r="9" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeWidth="2" /><circle cx="24" cy="24" r="3" fill="currentColor" /></svg> : <svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M8 30c6-8 9-14 16-14s10 6 16 14M13 35h22M18 26l4 4m8-5-4 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="24" cy="12" r="3" fill="currentColor" /></svg>}
                    </div>
                    <div className="result-kicker">{game.status === "won" ? "BÖLÜM TAMAMLANDI" : "YENİDEN DENE"}</div>
                    <h2 className="result-title">{game.status === "won" ? "Taç yerine oturdu." : "Saray bekliyor."}</h2>
                    <p className="result-copy">{game.status === "won" ? `${regionCopy(region).name} içindeki ${levelCopy(level)} tamamlandı. Bir sonraki oda açıldı.` : "Hedefleri gözeterek hamlelerini yeniden kur."}</p>
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
              <nav className="booster-dock" aria-label="Saray araçları">
                <button
                  className={`booster-button hammer-button${targetMode ? " targeting" : ""}${game.lightCharge >= lightCost ? " charged" : ""}`}
                  aria-label={targetMode ? "Taç çekici hedef seçimini iptal et" : `Taç çekici, ${game.lightCharge} / ${lightCost} enerji`}
                  aria-pressed={targetMode}
                  disabled={game.status !== "playing" || (game.lightCharge < lightCost && !targetMode)}
                  onClick={() => { setTargetMode((active) => !active); setSelected(null); }}
                >
                  <span className="booster-icon"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="m18 4 9 9-4 4-9-9 4-4ZM17 13 8 22m-2 2 6-6 4 4-6 6H6v-3Z" fill="currentColor" stroke="white" strokeWidth="1.5" strokeLinejoin="round" /><path d="m21 3 1-2m5 7 2-1" stroke="#fff1b7" strokeWidth="1.5" strokeLinecap="round" /></svg></span>
                  <span className="booster-count">{Math.min(100, chargePercent)}%</span>
                  <span className="booster-name">Çekiç</span>
                </button>
                <button className="booster-button locked" disabled aria-label="Örs aracı kilitli">
                  <span className="booster-icon"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="m16 3 11 4v9c0 7-4 11-11 15C9 27 5 23 5 16V7l11-4Z" stroke="currentColor" strokeWidth="2" /><path d="m12 12 8 8m0-8-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg><LockIcon className="booster-lock" /></span>
                  <span className="booster-name">Örs</span>
                </button>
                <button className="booster-button locked" disabled aria-label="Top aracı kilitli">
                  <span className="booster-icon"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="m12 25 12-17m-9 20 3-4-8-6-3 4 8 6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="m23 3 1.2 3.3L28 8l-3.8 1.4L23 13l-1.3-3.6L18 8l3.7-1.7L23 3Z" fill="currentColor" /></svg><LockIcon className="booster-lock" /></span>
                  <span className="booster-name">Top</span>
                </button>
                <button className="booster-button locked" disabled aria-label="Taç aracı kilitli">
                  <span className="booster-icon"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="2" /><path d="m8 11 5 3 3-7 3 7 5-3-2 10H10L8 11Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg><LockIcon className="booster-lock" /></span>
                  <span className="booster-name">Taç</span>
                </button>
                <button className="booster-button settings-button" aria-label="Oyun ayarlarını aç" onClick={() => setSettingsOpen(true)}>
                  <span className="booster-icon"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M13 4h6l1 3 3 1 3-1 3 5-2 2v4l2 2-3 5-3-1-3 1-1 3h-6l-1-3-3-1-3 1-3-5 2-2v-4l-2-2 3-5 3 1 3-1 1-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><circle cx="16" cy="16" r="4" stroke="currentColor" strokeWidth="2" /></svg></span>
                  <span className="booster-name">Ayarlar</span>
                </button>
              </nav>
            </section>

            <aside className="side-column" aria-label="Saray ilerlemesi">
              <section className="side-card charge-card">
                <div className="card-heading"><h2 className="card-title">Taç çekici</h2><span className="card-index">ALAN ARACI</span></div>
                <div className="charge-summary"><span className="charge-crest"><BrandGlyph /></span><div><strong>3 × 3 kare</strong><span>Biriken enerjiyle açılır</span></div></div>
                <div className="charge-track"><div className="charge-fill" style={{ width: `${chargePercent}%` }} /></div>
                <div className="charge-label"><span>ENERJİ</span><span>{game.lightCharge} / {lightCost}</span></div>
                <p className="light-copy">Her temizlenen taş çekici doldurur. Hazır olduğunda alt araç çubuğundan seç.</p>
              </section>
              <section className="side-card region-card">
                <div className="region-line">
                  <div><div className="eyebrow">BU DİYARDA</div><div className="region-name">{regionCopy(region).name}</div><div className="region-subtitle">{regionCopy(region).subtitle}</div></div>
                  <span className="region-progress">{completedInRegion}/3</span>
                </div>
                <div className="region-dots" aria-label={`Diyarda ${completedInRegion} bölüm tamamlandı`}>
                  {currentRegionLevels.map((item) => <i key={item.id} className={`region-dot${progress.completed[item.id] ? " done" : ""}${item.id === level.id ? " current" : ""}`} />)}
                </div>
              </section>
              <section className="side-card court-note">
                <span className="note-ornament"><BrandGlyph /></span>
                <div><span className="eyebrow">SARAY KURALI</span><p>Dörtlü çizgi roket; 2 × 2 pervane, T/L eşleşmesi TNT ve beşli çizgi ışık topu hazırlar.</p></div>
              </section>
            </aside>
          </div>
        </div>
      )}

      {(toast || game.message) && !mapOpen && game.status === "playing" && <div className="message-toast" role="status">{displayGameMessage(game.message) || toast}</div>}

      {showHelp && <div className="help-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) dismissHelp(); }}>
        <section className="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title">
          <div className="help-top"><div><div className="eyebrow">SARAY KAPILARI AÇILDI</div><h2 className="help-title" id="help-title">Nasıl oynanır?</h2></div>
            <button className="icon-button" aria-label="Yardımı kapat" onClick={dismissHelp}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg></button>
          </div>
          <p className="help-copy">Taşları yan yana getir ve hedeflerini hamlelerin bitmeden tamamla.</p>
          <div className="help-steps">
              <div className="help-step"><span className="step-number">01</span><p><strong>Bir taşı sürükle veya komşu iki taşa dokun.</strong> Üç aynı taş eşleşince hedef taşları toplarsın.</p></div>
            <div className="help-step"><span className="step-number">02</span><p><strong>Özel taşları uyandır.</strong> Dörtlü çizgi roket, 2 × 2 kare pervane, T/L eşleşmesi TNT, beşli çizgi ışık topu oluşturur. İki özel taşı yan yana değiştirerek güçlerini birleştir.</p></div>
            <div className="help-step"><span className="step-number">03</span><p><strong>Taç çekicini doldur.</strong> Temizlediğin taşlar enerjisini artırır. Dolunca 3 × 3 alanı bir kareye dokunarak aç.</p></div>
          </div>
          <div className="help-close"><button className="primary-button" onClick={dismissHelp}>Oyuna başla</button></div>
        </section>
      </div>}
      {settingsOpen && <div className="help-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}>
        <section className="help-dialog settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
          <div className="help-top"><div><div className="eyebrow">SARAY MENÜSÜ</div><h2 className="help-title" id="settings-title">Oyun ayarları</h2></div>
            <button className="icon-button" aria-label="Ayarları kapat" onClick={() => setSettingsOpen(false)}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg></button>
          </div>
          <p className="help-copy">Bu bölümde ilerlemeni yönet veya oyunun kurallarına yeniden göz at.</p>
          <div className="settings-actions">
            <button className="secondary-button" onClick={() => { setSettingsOpen(false); setShowHelp(true); }}>Nasıl oynanır?</button>
            <button className="secondary-button" onClick={() => { setSettingsOpen(false); setMapOpen(true); setTargetMode(false); }}>Krallık haritası</button>
            <button className="secondary-button" onClick={() => { setSettingsOpen(false); retryLevel(); }}>Bölümü yeniden başlat</button>
          </div>
        </section>
      </div>}
    </main>
  );
}

export default App;
