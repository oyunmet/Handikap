import React from "react";
import "./RoyalGameScreen.css";

const gemPalette = {
  red: ["#ff746b", "#e32436", "#a80027"],
  yellow: ["#fff48a", "#ffbf20", "#e87900"],
  blue: ["#8aeaff", "#1488ef", "#074bb7"],
  green: ["#baff75", "#51c523", "#24790d"],
  pink: ["#ffb4f5", "#e742d7", "#8f2da8"],
};

const fallbackBoard = [
  [null, null, null, null, null, { id: "g01", kind: "gem", color: "red" }, { id: "g02", kind: "gem", color: "yellow" }, { id: "g03", kind: "gem", color: "blue" }],
  [
    ...[0, 1].map((n) => ({ id: `vault-${n}`, kind: "blocker", type: "vault", hp: 1, maxHp: 2 })),
    { id: "grass-1", kind: "blocker", type: "grass", hp: 1, maxHp: 1 },
    { id: "g04", kind: "gem", color: "red" }, { id: "g05", kind: "gem", color: "yellow" }, { id: "g06", kind: "gem", color: "blue" }, { id: "g07", kind: "gem", color: "blue" }, { id: "g08", kind: "gem", color: "red" },
  ],
  [
    ...[0, 1].map((n) => ({ id: `vault-${n + 2}`, kind: "blocker", type: "vault", hp: 1, maxHp: 2 })),
    { id: "bear-1", kind: "blocker", type: "bear", hp: 1, maxHp: 1 },
    { id: "g09", kind: "gem", color: "yellow" }, { id: "g10", kind: "gem", color: "blue" }, { id: "g11", kind: "gem", color: "red" }, { id: "g12", kind: "gem", color: "pink" }, { id: "g13", kind: "gem", color: "blue" },
  ],
  [
    ...[0, 1].map((n) => ({ id: `vault-${n + 4}`, kind: "blocker", type: "vault", hp: 1, maxHp: 2 })),
    { id: "grass-2", kind: "blocker", type: "grass", hp: 1, maxHp: 1 },
    { id: "g14", kind: "gem", color: "blue" }, { id: "g15", kind: "gem", color: "blue" }, { id: "g16", kind: "gem", color: "yellow" }, { id: "g17", kind: "gem", color: "red" }, { id: "g18", kind: "gem", color: "yellow" },
  ],
  [
    ...[0, 1].map((n) => ({ id: `vault-${n + 6}`, kind: "blocker", type: "vault", hp: 1, maxHp: 2 })),
    { id: "grass-3", kind: "blocker", type: "grass", hp: 1, maxHp: 1 },
    { id: "g19", kind: "gem", color: "red" }, { id: "g20", kind: "gem", color: "blue" }, { id: "g21", kind: "gem", color: "blue" }, { id: "g22", kind: "gem", color: "red" }, { id: "g23", kind: "gem", color: "yellow" },
  ],
  [
    null, null,
    { id: "grass-4", kind: "blocker", type: "grass", hp: 1, maxHp: 1 },
    { id: "g24", kind: "gem", color: "blue" }, { id: "g25", kind: "gem", color: "pink" }, { id: "g26", kind: "gem", color: "red" }, { id: "g27", kind: "gem", color: "blue" }, { id: "g28", kind: "gem", color: "yellow" },
  ],
  [
    { id: "hat-1", kind: "blocker", type: "hat", hp: 1, maxHp: 1 }, { id: "hat-2", kind: "blocker", type: "hat", hp: 1, maxHp: 1 },
    { id: "hat-3", kind: "blocker", type: "hat", hp: 1, maxHp: 1 }, { id: "drill-1", kind: "blocker", type: "drill", hp: 41, maxHp: 41 },
    { id: "hat-4", kind: "blocker", type: "hat", hp: 1, maxHp: 1 }, { id: "hat-5", kind: "blocker", type: "hat", hp: 1, maxHp: 1 },
    { id: "hat-6", kind: "blocker", type: "hat", hp: 1, maxHp: 1 }, { id: "g29", kind: "gem", color: "pink" },
  ],
  [
    { id: "hat-7", kind: "blocker", type: "hat", hp: 1, maxHp: 1 }, { id: "hat-8", kind: "blocker", type: "hat", hp: 1, maxHp: 1 },
    { id: "hat-9", kind: "blocker", type: "hat", hp: 1, maxHp: 1 }, { id: "drill-2", kind: "blocker", type: "drill", hp: 41, maxHp: 41 },
    { id: "hat-10", kind: "blocker", type: "hat", hp: 1, maxHp: 1 }, { id: "hat-11", kind: "blocker", type: "hat", hp: 1, maxHp: 1 },
            { id: "hat-12", kind: "blocker", type: "hat", hp: 1, maxHp: 1 }, { id: "g30", kind: "gem", color: "yellow" },
  ],
];

function Jewel({ color }) {
  const colors = gemPalette[color] || gemPalette.blue;
  if (color === "pink") {
    return (
      <svg className="rg-jewel rg-jewel-diamond" viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id="rg-diamond" x2="0.9" y2="1"><stop stopColor={colors[0]} /><stop offset=".48" stopColor={colors[1]} /><stop offset="1" stopColor={colors[2]} /></linearGradient>
          <linearGradient id="rg-diamond-side" x2="0" y2="1"><stop stopColor="#ffd6ff" /><stop offset="1" stopColor={colors[1]} /></linearGradient>
        </defs>
        <path d="M16 8h32l12 15-28 34L4 23z" fill="url(#rg-diamond)" stroke="#9c279c" strokeWidth="3" strokeLinejoin="round" />
        <path d="m16 8-3 15h38L48 8zM13 23l19 34 7-34z" fill="url(#rg-diamond-side)" opacity=".55" />
        <path d="M17 13h13" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".8" />
      </svg>
    );
  }
  if (color === "green") {
    return (
      <svg className="rg-jewel" viewBox="0 0 64 64" aria-hidden="true">
        <defs><linearGradient id="rg-leaf" x2="0" y2="1"><stop stopColor={colors[0]} /><stop offset=".55" stopColor={colors[1]} /><stop offset="1" stopColor={colors[2]} /></linearGradient></defs>
        <path d="M32 57C10 49 9 23 28 8c2 9 9 10 11 18 5-7 10-8 15-9 2 19-3 34-22 40z" fill="url(#rg-leaf)" stroke="#277a13" strokeWidth="3" />
        <path d="M32 53c2-15 7-26 17-34M31 39l-11-9m14 1 7-9" fill="none" stroke="#e1ff98" strokeWidth="3" strokeLinecap="round" />
        <path d="M24 14c4 2 7 5 8 9" stroke="#fff" strokeWidth="4" opacity=".7" strokeLinecap="round" />
      </svg>
    );
  }
  if (color === "yellow") {
    return (
      <svg className="rg-jewel rg-crown" viewBox="0 0 64 64" aria-hidden="true">
        <defs><linearGradient id="rg-crown" x2="0" y2="1"><stop stopColor={colors[0]} /><stop offset=".48" stopColor={colors[1]} /><stop offset="1" stopColor={colors[2]} /></linearGradient></defs>
        <path d="M7 23 20 33 31 11l12 22 14-11-6 31H13z" fill="url(#rg-crown)" stroke="#c56a08" strokeWidth="3" strokeLinejoin="round" />
        <path d="M14 47h37" stroke="#fff394" strokeWidth="4" strokeLinecap="round" />
        <circle cx="8" cy="20" r="4" fill="#fff18a" /><circle cx="31" cy="9" r="4" fill="#fff18a" /><circle cx="57" cy="20" r="4" fill="#fff18a" />
        <path d="M18 29 25 34M39 34l10-7" stroke="#fff7be" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className="rg-jewel" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={`rg-${color}-gem`} x2="0" y2="1"><stop stopColor={colors[0]} /><stop offset=".42" stopColor={colors[1]} /><stop offset="1" stopColor={colors[2]} /></linearGradient>
        <linearGradient id={`rg-${color}-shine`} x2="1" y2="1"><stop stopColor="#fff" stopOpacity=".95" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
      </defs>
      <path d="M14 7h36a8 8 0 0 1 8 8v27c0 9-11 15-26 19C17 57 6 51 6 42V15a8 8 0 0 1 8-8z" fill={`url(#rg-${color}-gem)`} stroke={colors[2]} strokeWidth="3" />
      <path d="M14 11h35a4 4 0 0 1 4 4v23c-7 6-15 9-23 12-10-4-18-8-23-13V15a4 4 0 0 1 7-4z" fill="none" stroke="#d9faff" strokeWidth="2" opacity=".7" />
      <path d="M15 14h13" stroke="url(#rg-${color}-shine)" strokeWidth="5" strokeLinecap="round" />
      <path d="M12 21v13" stroke="#fff" strokeWidth="2" opacity=".6" strokeLinecap="round" />
    </svg>
  );
}

function BlockerArt({ type, hp }) {
  if (type === "vault") {
    return (
      <svg className="rg-blocker-art rg-vault-art" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id="rg-vault-shell" x2="0" y2="1"><stop stopColor="#a79aff" /><stop offset=".28" stopColor="#5742bc" /><stop offset=".78" stopColor="#37318c" /><stop offset="1" stopColor="#272773" /></linearGradient>
          <linearGradient id="rg-vault-gold" x2="0" y2="1"><stop stopColor="#fff08b" /><stop offset=".45" stopColor="#ffb521" /><stop offset="1" stopColor="#d36a10" /></linearGradient>
        </defs>
        <rect x="4" y="4" width="92" height="92" rx="17" fill="#1b2476" stroke="#dca83c" strokeWidth="4" />
        <rect x="10" y="9" width="80" height="82" rx="14" fill="url(#rg-vault-shell)" stroke="#c0aeff" strokeWidth="4" />
        <path d="M19 26 73 79M81 26 28 79" stroke="url(#rg-vault-gold)" strokeWidth="15" strokeLinecap="round" />
        <path d="M18 23 72 76M80 23 27 76" stroke="#fff0a0" strokeWidth="4" strokeLinecap="round" opacity=".85" />
        <circle cx="50" cy="51" r="17" fill="#ec9b22" stroke="#703a1e" strokeWidth="4" />
        <circle cx="50" cy="51" r="9" fill="#e53043" stroke="#ffc74e" strokeWidth="3" />
        <circle cx="18" cy="18" r="4" fill="#f5d766" /><circle cx="82" cy="18" r="4" fill="#f5d766" /><circle cx="18" cy="82" r="4" fill="#f5d766" /><circle cx="82" cy="82" r="4" fill="#f5d766" />
        {hp < 2 && <path d="M18 48h13m41 0h11M48 18v12m0 41v11" stroke="#e8d8ff" strokeWidth="4" strokeLinecap="round" />}
      </svg>
    );
  }
  if (type === "grass" || type === "bear") {
    const bear = type === "bear";
    return (
      <svg className="rg-blocker-art rg-greenery" viewBox="0 0 100 100" aria-hidden="true">
        <defs><linearGradient id="rg-green-ground" x2="0" y2="1"><stop stopColor="#9fe442" /><stop offset=".6" stopColor="#4aab20" /><stop offset="1" stopColor="#327518" /></linearGradient></defs>
        <rect x="3" y="3" width="94" height="94" rx="13" fill="#e1d4aa" stroke="#86733d" strokeWidth="3" />
        <rect x="8" y="8" width="84" height="84" rx="10" fill="url(#rg-green-ground)" />
        {Array.from({ length: bear ? 33 : 52 }, (_, i) => {
          const x = 13 + ((i * 29) % 74);
          const y = 14 + ((i * 43) % 70);
          return <circle key={i} cx={x} cy={y} r={3 + (i % 3)} fill={i % 2 ? "#6bc932" : "#a6ec42"} opacity=".85" />;
        })}
        {bear && <g>
          <ellipse cx="50" cy="65" rx="25" ry="25" fill="#388c1c" />
          <circle cx="34" cy="34" r="14" fill="#4cae26" /><circle cx="66" cy="34" r="14" fill="#4cae26" />
          <circle cx="50" cy="40" r="22" fill="#58bd29" />
          <ellipse cx="50" cy="48" rx="14" ry="11" fill="#a9de62" />
          <circle cx="42" cy="38" r="3" fill="#172b16" /><circle cx="58" cy="38" r="3" fill="#172b16" />
          <ellipse cx="50" cy="45" rx="4" ry="3" fill="#25391d" />
          <path d="M43 52q7 6 14 0" fill="none" stroke="#fff0b0" strokeWidth="2" strokeLinecap="round" />
          <circle cx="21" cy="76" r="8" fill="#398c1a" /><circle cx="78" cy="77" r="8" fill="#398c1a" />
        </g>}
      </svg>
    );
  }
  if (type === "hat") {
    return (
      <svg className="rg-blocker-art rg-hat-art" viewBox="0 0 64 64" aria-hidden="true">
        <defs><linearGradient id="rg-hat" x2="0" y2="1"><stop stopColor="#68449c" /><stop offset="1" stopColor="#261541" /></linearGradient></defs>
        <ellipse cx="32" cy="48" rx="26" ry="9" fill="#190f2b" />
        <path d="M16 24h32l-3 22H19z" fill="url(#rg-hat)" stroke="#221230" strokeWidth="3" />
        <ellipse cx="32" cy="24" rx="17" ry="7" fill="#351b4c" stroke="#b62cd1" strokeWidth="4" />
        <ellipse cx="32" cy="23" rx="11" ry="3" fill="#ed4be8" />
        <path d="M20 42h24" stroke="#a82bc8" strokeWidth="4" />
        <path d="M23 12c5-5 13-5 18 0" fill="none" stroke="#fff" strokeWidth="3" opacity=".45" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className="rg-blocker-art rg-drill-art" viewBox="0 0 64 80" aria-hidden="true">
      <defs><linearGradient id="rg-drill" x2="0" y2="1"><stop stopColor="#e7eff3" /><stop offset=".35" stopColor="#77889a" /><stop offset="1" stopColor="#323e54" /></linearGradient></defs>
      <path d="M17 21 32 4l15 17z" fill="#aebccc" stroke="#57677c" strokeWidth="3" />
      <rect x="12" y="20" width="40" height="42" rx="9" fill="url(#rg-drill)" stroke="#3d4c62" strokeWidth="3" />
      <rect x="17" y="34" width="30" height="20" rx="3" fill="#24446b" stroke="#f9bb37" strokeWidth="3" />
      <text x="32" y="49" textAnchor="middle" fontSize="15" fontWeight="900" fill="#fff">{hp}</text>
      <path d="M15 61h34l-7 13H22z" fill="#e5a023" stroke="#8b5318" strokeWidth="3" />
      <path d="M22 26h20" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".8" />
    </svg>
  );
}

function GoalGlyph({ id }) {
  if (id === "vault") return <svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="3" width="26" height="26" rx="7" fill="#5145a5" stroke="#edc251" strokeWidth="2" /><path d="m8 8 16 16M24 8 8 24" stroke="#ffbe36" strokeWidth="5" strokeLinecap="round" /><circle cx="16" cy="16" r="5" fill="#ef3e48" stroke="#ffd45f" strokeWidth="2" /></svg>;
  if (id === "bear") return <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="8" cy="9" r="6" fill="#54b82c" /><circle cx="24" cy="9" r="6" fill="#54b82c" /><circle cx="16" cy="17" r="13" fill="#69c53a" /><ellipse cx="16" cy="20" rx="7" ry="5" fill="#c6e98b" /><circle cx="12" cy="15" r="1.6" /><circle cx="20" cy="15" r="1.6" /><circle cx="16" cy="19" r="2" /></svg>;
  if (id === "grass") return <svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="3" width="26" height="26" rx="5" fill="#55b92e" stroke="#36861f" strokeWidth="2" /><path d="M7 24 12 9l3 15 5-18 4 18" fill="none" stroke="#c9f16f" strokeWidth="3" strokeLinecap="round" /><circle cx="10" cy="14" r="2" fill="#f8ffe2" /><circle cx="22" cy="9" r="2" fill="#f8ffe2" /></svg>;
  return <Jewel color="pink" />;
}

function BoosterGlyph({ id }) {
  if (id === "hammer") return <svg viewBox="0 0 64 64" aria-hidden="true"><path d="m19 13 12 12-8 8-12-12z" fill="#ffe477" stroke="#995719" strokeWidth="3" /><path d="m29 24 22 24-7 7-23-22z" fill="#8c5426" stroke="#5b361d" strokeWidth="3" /><path d="m9 19 11-11 13 12-10 11z" fill="#d92d41" stroke="#782539" strokeWidth="3" /><path d="m14 17 6-6" stroke="#fff" strokeWidth="3" strokeLinecap="round" /></svg>;
  if (id === "bow") return <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M16 8c22 7 22 41 0 48M16 8l10 24-10 24" fill="none" stroke="#f0ae38" strokeWidth="7" strokeLinecap="round" /><path d="M16 8 51 32 16 56" fill="none" stroke="#fff0ae" strokeWidth="2" /><path d="m38 24 16 8-16 8-4-8z" fill="#ef4c50" stroke="#8b2429" strokeWidth="2" /><path d="M14 9 20 6" stroke="#fff" strokeWidth="3" strokeLinecap="round" /></svg>;
  if (id === "cannon") return <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="35" r="22" fill="#234c76" stroke="#ffd043" strokeWidth="4" /><path d="M18 17 43 14l11 15-17 10-21-9z" fill="#384d6f" stroke="#a7c9da" strokeWidth="3" /><circle cx="30" cy="29" r="7" fill="#171f39" stroke="#ffdf6b" strokeWidth="3" /><circle cx="17" cy="44" r="5" fill="#ed4d50" /><circle cx="29" cy="51" r="5" fill="#f3c633" /><circle cx="43" cy="44" r="5" fill="#41b6ed" /><path d="M20 16 38 14" stroke="#fff" strokeWidth="3" strokeLinecap="round" /></svg>;
  return <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M15 13c-5 5-6 11-2 15l10 4-10 4c-4 4-3 10 2 15 5 5 11 6 15 2l2-11 4 11c4 4 10 3 15-2s6-11 2-15l-10-4 10-4c4-4 3-10-2-15s-11-6-15-2l-4 10-2-10c-4-4-10-3-15 2z" fill="#69ce47" stroke="#258c37" strokeWidth="3" /><circle cx="22" cy="24" r="5" fill="#ed3c77" /><circle cx="41" cy="24" r="5" fill="#f9d334" /><circle cx="22" cy="42" r="5" fill="#37aafa" /><circle cx="41" cy="42" r="5" fill="#ed5c30" /><circle cx="32" cy="33" r="8" fill="#ffe342" stroke="#fff5a0" strokeWidth="2" /></svg>;
}

function GoalPanel({ goals }) {
  const goalMeta = [
    { id: "vault", label: "Kasa" },
    { id: "bear", label: "Ayıcık" },
    { id: "grass", label: "Çim" },
    { id: "gems", label: "Mücevher" },
  ];
  return (
    <section className="rg-info-card rg-goal-card" aria-label="Hedefler">
      <div className="rg-card-ribbon">Hedef</div>
      <div className="rg-goal-grid">
        {goalMeta.map(({ id, label }) => {
          const goal = goals.find((item) => item.id === id) || { remaining: 0, total: 0 };
          return (
            <div className="rg-goal-item" key={id} aria-label={`${label}: ${goal.remaining}`}>
              <span className="rg-goal-icon"><GoalGlyph id={id} /></span>
              <span className="rg-goal-count">{goal.remaining}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function RoyalGameScreen({
  game = {},
  selectedCell = null,
  activeBooster = null,
  onCellClick = () => {},
  onCellPointerDown = () => {},
  onBooster = () => {},
  onSettings = () => {},
  onRetry = () => {},
  mascotMood = "happy",
  effectLayer = null,
}) {
  const board = Array.isArray(game.board) ? game.board : fallbackBoard;
  const goals = Array.isArray(game.goals) ? game.goals : [
    { id: "vault", remaining: 8, total: 8 },
    { id: "bear", remaining: 1, total: 1 },
    { id: "grass", remaining: 4, total: 4 },
    { id: "gems", remaining: 41, total: 41 },
  ];
  const movesLeft = game.movesLeft ?? 37;
  const boosters = [
    { id: "hammer", count: 17 },
    { id: "bow", count: 22 },
    { id: "cannon", count: 16 },
    { id: "jester", count: 26 },
  ];

  return (
    <main className="royal-game-screen">
      <div className="rg-castle-backdrop" aria-hidden="true" />
      <header className="rg-topbar">
        <GoalPanel goals={goals} />
        <div className={`rg-king-arch rg-mood-${mascotMood}`} aria-label="Kraliyet rehberi">
          <div className="rg-arch-outer"><div className="rg-arch-inner"><img src="/king-avatar.png" alt="" /></div></div>
          <span className="rg-king-glint" />
        </div>
        <section className="rg-info-card rg-moves-card" aria-label="Kalan hamle">
          <div className="rg-card-ribbon">Hamle</div>
          <div className="rg-moves-number">{movesLeft}</div>
          {game.totalMoves != null && <span className="rg-moves-caption">/{game.totalMoves}</span>}
        </section>
      </header>

      <section className="rg-playfield" aria-label="Oyun tahtası">
        <div className="rg-board-frame">
          <div className="rg-board-grid" style={{ "--rg-columns": Math.max(1, ...board.map((row) => row?.length || 0)) }}>
            {board.flatMap((row, rowIndex) => (Array.isArray(row) ? row : []).map((cell, colIndex) => {
              const key = cell?.id ?? `${rowIndex}-${colIndex}`;
              const isSelected = selectedCell && selectedCell.row === rowIndex && selectedCell.col === colIndex;
              const accessible = cell?.kind === "blocker" ? cell.type : cell?.color ? `${cell.color} jewel` : "empty";
              return (
                <button
                  type="button"
                  key={key}
                  className={`rg-cell ${cell ? "rg-cell-filled" : "rg-cell-cutout"} ${cell?.kind === "blocker" ? `rg-cell-${cell.type}` : ""} ${isSelected ? "is-selected" : ""}`}
                  aria-label={`Row ${rowIndex + 1}, column ${colIndex + 1}: ${accessible}`}
                  onClick={() => onCellClick(rowIndex, colIndex)}
                  onPointerDown={(event) => onCellPointerDown(event, rowIndex, colIndex)}
                  disabled={!cell}
                >
                  {cell?.kind === "gem" && <Jewel color={cell.color} />}
                  {cell?.kind === "blocker" && <BlockerArt type={cell.type} hp={cell.hp ?? 1} />}
                  {cell?.special && <span className="rg-special-spark" aria-hidden="true">✦</span>}
                </button>
              );
            }))}
          </div>
          <div className="rg-board-sheen" aria-hidden="true" />
        </div>
        {effectLayer && <div className="rg-effects">{effectLayer}</div>}
      </section>

      <footer className="rg-bottom-dock" aria-label="Güçlendiriciler">
        <div className="rg-booster-row">
          {boosters.map(({ id, count }) => (
            <button
              type="button"
              key={id}
              className={`rg-booster ${activeBooster === id ? "is-active" : ""}`}
              onClick={() => onBooster(id)}
              aria-label={`${id} güçlendirici, ${count} adet`}
              aria-pressed={activeBooster === id}
            >
              <span className="rg-booster-art"><BoosterGlyph id={id} /></span>
              <span className="rg-booster-count">{count}</span>
            </button>
          ))}
          <button type="button" className="rg-booster rg-settings" onClick={onSettings} aria-label="Ayarlar">
            <span className="rg-gear" aria-hidden="true"><svg viewBox="0 0 64 64"><path d="M27 5h10l2 7a21 21 0 0 1 5 2l6-4 7 7-4 6a21 21 0 0 1 2 5l7 2v10l-7 2a21 21 0 0 1-2 5l4 6-7 7-6-4a21 21 0 0 1-5 2l-2 7H27l-2-7a21 21 0 0 1-5-2l-6 4-7-7 4-6a21 21 0 0 1-2-5l-7-2V30l7-2a21 21 0 0 1 2-5l-4-6 7-7 6 4a21 21 0 0 1 5-2z" fill="#e4f4f5" stroke="#486789" strokeWidth="3" strokeLinejoin="round" /><circle cx="32" cy="35" r="12" fill="#327ca8" stroke="#d8edee" strokeWidth="4" /><circle cx="32" cy="35" r="5" fill="#a4d7e7" /></svg></span>
          </button>
        </div>
        {game.status && game.status !== "playing" && (
          <div className="rg-status-card" role="status">
            <strong>{game.status === "won" ? "Harika!" : "Bir tur daha?"}</strong>
            <button type="button" onClick={onRetry}>{game.status === "won" ? "Devam et" : "Tekrar dene"}</button>
          </div>
        )}
      </footer>
    </main>
  );
}
