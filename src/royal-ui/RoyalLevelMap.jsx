import React, { useEffect, useMemo, useRef, useState } from "react";
import { LEVEL_COUNT, LEVELS_PER_CHAPTER, getLevelDefinition } from "../royal-levels.js";
import "./RoyalLevelMap.css";

const CHAPTERS = Array.from(
  { length: LEVEL_COUNT / LEVELS_PER_CHAPTER },
  (_, index) => getLevelDefinition(index * LEVELS_PER_CHAPTER + 1).chapterName,
);
const TOTAL_LEVELS = LEVEL_COUNT;

function clampLevel(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.min(TOTAL_LEVELS, Math.max(1, Math.floor(number)))
    : 1;
}

function chapterForLevel(level) {
  return Math.ceil(level / LEVELS_PER_CHAPTER);
}

function CrownIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <path d="m4 11 7 5 5-9 5 9 7-5-3 14H7L4 11Z" fill="currentColor" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
      <path d="M8 22h16" stroke="#fff3b0" strokeLinecap="round" strokeWidth="1.5" />
      <circle cx="4" cy="9" r="2" fill="#fff0a3" />
      <circle cx="16" cy="5" r="2" fill="#fff0a3" />
      <circle cx="28" cy="9" r="2" fill="#fff0a3" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.2 10V7.6a4.8 4.8 0 0 1 9.6 0V10" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
      <rect x="4.5" y="9.5" width="15" height="11" rx="2.6" fill="currentColor" />
      <circle cx="12" cy="15" r="1.25" fill="#f3dfae" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12.5 4.2 4.1L19 7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
    </svg>
  );
}

function ObjectiveIcon({ id }) {
  if (id === "vault") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <rect x="3" y="3" width="26" height="26" rx="7" fill="#4b438c" stroke="#d6a83d" strokeWidth="2" />
        <path d="m8 8 16 16M24 8 8 24" stroke="#f4bd44" strokeLinecap="round" strokeWidth="4" />
        <circle cx="16" cy="16" r="4" fill="#e3464e" stroke="#ffe091" strokeWidth="1.5" />
      </svg>
    );
  }
  if (id === "bear") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="8" cy="9" r="5" fill="#4c8b9b" />
        <circle cx="24" cy="9" r="5" fill="#4c8b9b" />
        <circle cx="16" cy="16" r="12" fill="#72a9ad" stroke="#315d71" strokeWidth="1.5" />
        <ellipse cx="16" cy="19" rx="6" ry="4" fill="#e8d5a4" />
        <circle cx="12.5" cy="14" r="1.2" fill="#243a4c" />
        <circle cx="19.5" cy="14" r="1.2" fill="#243a4c" />
        <circle cx="16" cy="18" r="1.5" fill="#243a4c" />
      </svg>
    );
  }
  if (id === "grass") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <rect x="3" y="3" width="26" height="26" rx="5" fill="#57824c" stroke="#365d42" strokeWidth="2" />
        <path d="m8 23 4-12 3 12 4-15 4 15" fill="none" stroke="#d1d294" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" />
      </svg>
    );
  }
  if (id === "hat") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="m10 14 2-9h8l2 9 4 5H6l4-5Z" fill="#513c68" stroke="#30284f" strokeWidth="1.5" />
        <path d="M9 14h14" stroke="#e1a949" strokeWidth="3" />
        <path d="M7 22h18" stroke="#513c68" strokeLinecap="round" strokeWidth="3" />
      </svg>
    );
  }
  if (id === "drill") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="m16 2 5 7H11l5-7Z" fill="#b6c4c6" stroke="#516776" strokeWidth="1.5" />
        <rect x="8" y="8" width="16" height="17" rx="4" fill="#607b8a" stroke="#31495e" strokeWidth="2" />
        <path d="M11 13h10v7H11z" fill="#e4ad3e" />
        <path d="M12 28h8l-4 3-4-3Z" fill="#a85c30" />
      </svg>
    );
  }
  if (id === "gems") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M8 5h16l6 8-14 16L2 13l6-8Z" fill="#62c8d7" stroke="#176e9d" strokeLinejoin="round" strokeWidth="2" />
        <path d="m8 5-2 8h20l-2-8M6 13l10 16 4-16" fill="none" stroke="#c5f5ee" strokeOpacity=".8" strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="m16 3 4 9 9 4-9 4-4 9-4-9-9-4 9-4 4-9Z" fill="#e0a83e" stroke="#9d5d20" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}

function objectiveLabel(id) {
  const labels = {
    vault: "Kasa",
    bear: "Ayıcık",
    grass: "Çim",
    gems: "Mücevher",
    hat: "Sihirli şapka",
    drill: "Matkap",
  };
  return labels[id] || String(id || "Hedef").replace(/[-_]/g, " ");
}

function levelPosition(index) {
  const rowFromBottom = Math.floor(index / 5);
  const row = 4 - rowFromBottom;
  const step = index % 5;
  const col = rowFromBottom % 2 === 0 ? step : 4 - step;
  return { row, col };
}

function makeRoutePath() {
  return Array.from({ length: LEVELS_PER_CHAPTER }, (_, index) => {
    const { row, col } = levelPosition(index);
    return `${index === 0 ? "M" : "L"} ${10 + col * 20} ${10 + row * 20}`;
  }).join(" ");
}

export default function RoyalLevelMap({
  unlockedLevel = 1,
  completedLevels = [],
  selectedLevel = 1,
  onSelectLevel = () => {},
  onStartLevel = () => {},
  onContinue = () => {},
  getLevelDetails = () => ({}),
}) {
  const unlocked = clampLevel(unlockedLevel);
  const selected = clampLevel(selectedLevel);
  const completed = useMemo(
    () => new Set(Array.isArray(completedLevels) ? completedLevels.map(Number) : []),
    [completedLevels],
  );
  const [browseChapter, setBrowseChapter] = useState(chapterForLevel(selected));
  const activeChapterRef = useRef(null);

  useEffect(() => {
    setBrowseChapter(chapterForLevel(selected));
  }, [selected]);

  useEffect(() => {
    activeChapterRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [browseChapter]);

  const firstLevel = (browseChapter - 1) * LEVELS_PER_CHAPTER + 1;
  const chapterEnd = firstLevel + LEVELS_PER_CHAPTER - 1;
  const levels = Array.from({ length: LEVELS_PER_CHAPTER }, (_, index) => firstLevel + index);
  const detail = getLevelDetails(selected) || {};
  const chapterTitle = CHAPTERS[chapterForLevel(selected) - 1];
  const visibleChapterTitle = CHAPTERS[browseChapter - 1];
  const selectedIsUnlocked = selected <= unlocked;
  const completedInChapter = levels.filter((level) => completed.has(level)).length;
  const routePath = makeRoutePath();
  const featureLabels = Array.isArray(detail.featureLabels) ? detail.featureLabels : [];
  const goals = Array.isArray(detail.goals) ? detail.goals : [];
  const displayChapter = Number(detail.chapter) || chapterForLevel(selected);

  function chooseChapter(chapter) {
    setBrowseChapter(chapter);
  }

  function renderLevel(level) {
    const index = level - firstLevel;
    const { row, col } = levelPosition(index);
    const isLocked = level > unlocked;
    const isComplete = completed.has(level);
    const isSelected = selected === level;
    const status = isLocked ? "locked" : isComplete ? "completed" : "uncompleted";
    const statusText = isLocked ? "kilitli" : isComplete ? "tamamlandı" : "açık";
    return (
      <button
        className={`rlm-level rlm-level-${status}${isSelected ? " is-selected" : ""}`}
        type="button"
        key={level}
        style={{ gridColumn: col + 1, gridRow: row + 1 }}
        disabled={isLocked}
        aria-label={`Seviye ${level}, ${statusText}${isSelected ? ", seçili" : ""}`}
        aria-pressed={isSelected}
        onClick={() => {
          if (!isLocked) onSelectLevel(level);
        }}
      >
        <span className="rlm-level-number">{level}</span>
        <span className="rlm-level-mark" aria-hidden="true">
          {isLocked ? <LockIcon /> : isComplete ? <CheckIcon /> : <CrownIcon />}
        </span>
      </button>
    );
  }

  return (
        <main className="royal-level-map">
      <header className="rlm-header">
        <div className="rlm-brand-row">
          <div className="rlm-brand-mark" aria-hidden="true"><CrownIcon /></div>
          <div className="rlm-brand-copy">
            <span className="rlm-eyebrow">KRALİYET MACERASI</span>
            <h1>Kraliyet Yolu</h1>
          </div>
          <div className="rlm-progress" aria-label={`${TOTAL_LEVELS} seviyeden ${unlocked} tanesi açıldı`}>
            <strong>{unlocked}</strong>
            <span>/ {TOTAL_LEVELS}</span>
          </div>
        </div>
        <div className="rlm-guide-row">
          <div className="rlm-king-frame">
            <img src="/king-avatar.png" alt="" />
          </div>
          <p><strong>Kralın mesajı</strong><span>“Yeni bir oda seni bekliyor.”</span></p>
          <button className="rlm-continue" type="button" onClick={onContinue}>
            Devam et
            <span aria-hidden="true">›</span>
          </button>
        </div>
      </header>

      <nav className="rlm-chapters" aria-label="Bölümlere göz at">
        <div className="rlm-chapter-track">
          {CHAPTERS.map((name, index) => {
            const chapter = index + 1;
            const chapterStart = (chapter - 1) * LEVELS_PER_CHAPTER + 1;
            const chapterUnlocked = chapterStart <= unlocked;
            const active = chapter === browseChapter;
            return (
              <button
                type="button"
                key={name}
                className={`rlm-chapter-tab${active ? " is-active" : ""}${chapterUnlocked ? "" : " is-sealed"}`}
                ref={active ? activeChapterRef : null}
                aria-current={active ? "page" : undefined}
                aria-label={`${chapter}. bölüm: ${name}${chapterUnlocked ? "" : ", kilitli seviyeler içeriyor"}`}
                onClick={() => chooseChapter(chapter)}
              >
                <span className="rlm-chapter-number">{String(chapter).padStart(2, "0")}</span>
                <span className="rlm-chapter-tab-name">{name}</span>
                {!chapterUnlocked && <span className="rlm-tab-lock" aria-hidden="true"><LockIcon /></span>}
              </button>
            );
          })}
        </div>
      </nav>

      <section className="rlm-map-section" aria-label={`${browseChapter}. bölüm seviye haritası`}>
        <div className="rlm-map-heading">
          <div>
            <span className="rlm-map-kicker">BÖLÜM {String(browseChapter).padStart(2, "0")}</span>
            <h2>{visibleChapterTitle}</h2>
          </div>
          <span className="rlm-chapter-progress">{completedInChapter}<i>/</i>25 tamamlandı</span>
        </div>
        <div className="rlm-map-scroll">
          <div className="rlm-map-canvas">
            <div className="rlm-map-ornament rlm-ornament-one" aria-hidden="true" />
            <div className="rlm-map-ornament rlm-ornament-two" aria-hidden="true" />
            <svg className="rlm-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <path className="rlm-route-shadow" d={routePath} />
              <path className="rlm-route-line" d={routePath} />
            </svg>
            <div className="rlm-level-grid" aria-label={`${firstLevel} ile ${chapterEnd} arasındaki seviyeler`}>
              {levels.map(renderLevel)}
            </div>
            <div className="rlm-map-endpoint" aria-hidden="true">
              <CrownIcon />
              <span>TAHT SALONU</span>
            </div>
          </div>
        </div>
      </section>

        <section className="rlm-level-details" aria-labelledby="rlm-selected-title">
        <div className="rlm-detail-main">
          <div className="rlm-detail-heading">
            <span className="rlm-level-kicker">SEVİYE {String(selected).padStart(3, "0")}</span>
            <span className={`rlm-status-pill${selectedIsUnlocked ? "" : " is-locked"}`}>
              {selectedIsUnlocked ? (completed.has(selected) ? "TAMAMLANDI" : "HAZIR") : "KİLİTLİ"}
            </span>
          </div>
          <h2 id="rlm-selected-title">{detail.title || "Kraliyet görevi"}</h2>
          <p className="rlm-detail-chapter">{displayChapter}. bölüm · {chapterTitle}</p>
          <p className="rlm-description">
            {detail.description || "Görevini görmek için haritadan bir seviye seç."}
          </p>
          <div className="rlm-detail-meta">
            <div className="rlm-moves">
              <span className="rlm-moves-emblem" aria-hidden="true"><CrownIcon /></span>
              <span><strong>{Number.isFinite(Number(detail.moves)) ? detail.moves : "—"}</strong><small>hamle</small></span>
            </div>
            <div className="rlm-feature-list" aria-label="Seviye özellikleri">
              {featureLabels.length > 0
                ? featureLabels.map((feature) => <span className="rlm-feature" key={feature}>{feature}</span>)
                : <span className="rlm-feature rlm-feature-muted">Klasik eşleştirme</span>}
            </div>
          </div>
          {goals.length > 0 && (
            <div className="rlm-objectives" aria-label="Seviye hedefleri">
              <span className="rlm-objective-label">HEDEFLER</span>
              <div className="rlm-objective-list">
                {goals.map((goal, index) => (
                  <div className="rlm-objective" key={`${goal.id}-${index}`} aria-label={`${objectiveLabel(goal.id)}: ${goal.remaining} kaldı`}>
                    <span className="rlm-objective-icon"><ObjectiveIcon id={goal.id} /></span>
                    <span className="rlm-objective-count">{goal.remaining}</span>
                    <span className="rlm-objective-name">{objectiveLabel(goal.id)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <button
          className="rlm-start-button"
          type="button"
          disabled={!selectedIsUnlocked}
          onClick={() => {
            if (selectedIsUnlocked) onStartLevel(selected);
          }}
        >
          <span>{completed.has(selected) ? "Tekrar oyna" : "Bölüme başla"}</span>
          <span className="rlm-start-arrow" aria-hidden="true">›</span>
        </button>
      </section>
    </main>
  );
}
