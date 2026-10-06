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
        {hp >= 2 ? (
          <g>
            <path d="M19 26 73 79M81 26 28 79" stroke="url(#rg-vault-gold)" strokeWidth="15" strokeLinecap="round" />
            <path d="M18 23 72 76M80 23 27 76" stroke="#fff0a0" strokeWidth="4" strokeLinecap="round" opacity=".85" />
            <circle cx="50" cy="51" r="17" fill="#ec9b22" stroke="#703a1e" strokeWidth="4" />
            <circle cx="50" cy="51" r="9" fill="#e53043" stroke="#ffc74e" strokeWidth="3" />
            <circle cx="18" cy="18" r="4" fill="#f5d766" /><circle cx="82" cy="18" r="4" fill="#f5d766" /><circle cx="18" cy="82" r="4" fill="#f5d766" /><circle cx="82" cy="82" r="4" fill="#f5d766" />
          </g>
        ) : (
          <g>
            <rect x="18" y="18" width="65" height="67" rx="9" fill="#211d62" stroke="#ffd35b" strokeWidth="4" />
            <path d="M24 70q9-17 18 0 8-19 17 0 8-14 16 0v9H24z" fill="url(#rg-vault-gold)" stroke="#b56b1e" strokeWidth="2" />
            <circle cx="35" cy="61" r="6" fill="#ffe66b" stroke="#fff2a0" strokeWidth="1.5" />
            <circle cx="55" cy="57" r="7" fill="#f6b725" stroke="#fff2a0" strokeWidth="1.5" />
            <circle cx="70" cy="65" r="5" fill="#ffe66b" stroke="#fff2a0" strokeWidth="1.5" />
            <g transform="rotate(-31 29 50)">
              <rect x="11" y="21" width="39" height="61" rx="8" fill="url(#rg-vault-shell)" stroke="#d8c9ff" strokeWidth="4" />
              <path d="M17 31h27M17 72h27" stroke="#ffd665" strokeWidth="5" strokeLinecap="round" />
              <circle cx="39" cy="51" r="7" fill="#e99c22" stroke="#68361c" strokeWidth="3" />
              <circle cx="39" cy="51" r="3" fill="#e53043" stroke="#ffd05b" strokeWidth="2" />
            </g>
            <path d="m8 22-3 9 6 4-5 6 7 5" fill="none" stroke="#fff4b2" strokeWidth="3" strokeLinecap="round" />
          </g>
        )}
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
  if (id === "hat") return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 24h20v4H6z" rx="2" fill="#492c78" stroke="#241642" strokeWidth="2" /><path d="M9 23 11 10c.4-3 2.6-5 5-5s4.6 2 5 5l2 13z" fill="#252347" stroke="#9d69d0" strokeWidth="2" /><path d="M10 19h12" stroke="#ec48d1" strokeWidth="4" /><circle cx="16" cy="13" r="2" fill="#fff0a1" /></svg>;
  if (id === "drill") return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="m8 3 16 16-5 5L3 8z" fill="#a9b9d3" stroke="#3b4c68" strokeWidth="2" /><path d="m18 20 7 7-4 4-7-7z" fill="#e5a62c" stroke="#80531a" strokeWidth="2" /><circle cx="12" cy="12" r="3" fill="#f9c43d" stroke="#684a1b" strokeWidth="1.5" /></svg>;
  return <Jewel color="pink" />;
}

function SpecialPiece({ color, special }) {
  if (special === "rocket-h" || special === "rocket-v") {
    return (
      <svg className={`rg-special-piece rg-rocket-piece ${special}`} viewBox="0 0 64 64" aria-hidden="true">
        <defs><linearGradient id="rg-rocket-metal" x2="0" y2="1"><stop stopColor="#fff59a" /><stop offset=".45" stopColor="#ed8c18" /><stop offset="1" stopColor="#b94325" /></linearGradient></defs>
        <g transform={special === "rocket-v" ? "rotate(90 32 32)" : undefined}>
          <path d="M8 24h48v16H8z" rx="8" fill="url(#rg-rocket-metal)" stroke="#8e3a25" strokeWidth="3" />
          <path d="M12 25h8v14h-8zm32 0h8v14h-8z" fill="#f4dfd1" stroke="#a4432c" strokeWidth="2" />
          <path d="M27 27h10v10H27z" fill="#fffbe6" opacity=".92" />
          <path d="m4 32 8-8v16z" fill="#f0533c" stroke="#fff0b1" strokeWidth="2" />
          <path d="m60 32-8-8v16z" fill="#e84932" stroke="#fff0b1" strokeWidth="2" />
          <path d="M23 20v24M41 20v24" stroke="#fff3b2" strokeWidth="2" />
        </g>
      </svg>
    );
  }
  if (special === "tnt") {
    return (
      <svg className="rg-special-piece rg-tnt-piece" viewBox="0 0 64 64" aria-hidden="true">
        <defs><linearGradient id="rg-tnt-barrel" x2="0" y2="1"><stop stopColor="#f6cd76" /><stop offset=".35" stopColor="#cf653f" /><stop offset="1" stopColor="#87374d" /></linearGradient></defs>
        <path d="M22 11c4-7 13-8 18-2l-5 10-10-2z" fill="#9b6042" stroke="#f6da99" strokeWidth="2" />
        <path d="m37 9 9-4 4 3-10 8" fill="none" stroke="#fff2aa" strokeWidth="3" strokeLinecap="round" />
        <path d="m50 3 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" fill="#fff48c" />
        <path d="M15 19h34l-3 34H18z" fill="url(#rg-tnt-barrel)" stroke="#773342" strokeWidth="3" />
        <path d="M17 24h30M18 47h28" stroke="#ffdf92" strokeWidth="4" />
        <path d="M22 29h20v13H22z" rx="3" fill="#f9e7a5" stroke="#8b3b3b" strokeWidth="2" />
        <text x="32" y="39" textAnchor="middle" fontSize="9" fontWeight="1000" fill="#9b3543">TNT</text>
        <path d="M11 23v25m42-25v25" stroke="#ffd87c" strokeWidth="3" />
      </svg>
    );
  }
  if (special === "lightball") {
    return (
      <svg className="rg-special-piece rg-lightball-piece" viewBox="0 0 64 64" aria-hidden="true">
        <defs><radialGradient id="rg-lightball-core" cx=".32" cy=".24"><stop stopColor="#fff" /><stop offset=".3" stopColor="#fff7cd" /><stop offset=".72" stopColor="#e9a844" /><stop offset="1" stopColor="#a74d48" /></radialGradient></defs>
        <circle cx="32" cy="33" r="24" fill="url(#rg-lightball-core)" stroke="#fff1ab" strokeWidth="3" />
        <path d="M12 24c7-8 15-10 23-7M14 43c7 7 16 9 27 3M42 14c8 5 12 13 11 22" fill="none" stroke="#fff" strokeOpacity=".85" strokeWidth="3" strokeLinecap="round" />
        <circle cx="19" cy="28" r="4" fill="#e94350" stroke="#fff7c8" strokeWidth="1.5" />
        <circle cx="35" cy="17" r="4" fill="#32a8ef" stroke="#fff7c8" strokeWidth="1.5" />
        <circle cx="47" cy="31" r="4" fill="#a54be1" stroke="#fff7c8" strokeWidth="1.5" />
        <circle cx="30" cy="47" r="4" fill="#46bd62" stroke="#fff7c8" strokeWidth="1.5" />
        <circle cx="22" cy="41" r="3.5" fill="#ffd13c" stroke="#fff7c8" strokeWidth="1.5" />
        <path d="m32 1 2.4 6.1L41 9.5l-6.6 2.4L32 18l-2.4-6.1L23 9.5l6.6-2.4L32 1Z" fill="#fff" />
      </svg>
    );
  }
  if (special === "propeller") {
    return (
      <svg className="rg-special-piece rg-propeller-piece" viewBox="0 0 64 64" aria-hidden="true">
        <g className="rg-propeller-rotor">
          <path d="M28 27 10 10c-5-5-1-10 5-8l22 13-7 14Zm9 2 18-18c5-5 10-1 8 5L50 38l-13-9Zm-2 8 18 18c5 5 1 10-5 8L26 50l9-13Zm-8-2L9 53c-5 5-10 1-8-5l13-22 13 7Z" fill="#f4a923" stroke="#fff0a7" strokeWidth="2.3" strokeLinejoin="round" />
        </g>
        <circle cx="32" cy="32" r="9" fill="#e43c43" stroke="#fff2ae" strokeWidth="3" />
        <circle cx="32" cy="32" r="3" fill="#fffbdc" />
      </svg>
    );
  }
  return <Jewel color={color} />;
}

function BoosterGlyph({ id }) {
  if (id === "hammer") return <svg viewBox="0 0 64 64" aria-hidden="true"><path d="m19 13 12 12-8 8-12-12z" fill="#ffe477" stroke="#995719" strokeWidth="3" /><path d="m29 24 22 24-7 7-23-22z" fill="#8c5426" stroke="#5b361d" strokeWidth="3" /><path d="m9 19 11-11 13 12-10 11z" fill="#d92d41" stroke="#782539" strokeWidth="3" /><path d="m14 17 6-6" stroke="#fff" strokeWidth="3" strokeLinecap="round" /></svg>;
  if (id === "bow") return <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M16 8c22 7 22 41 0 48M16 8l10 24-10 24" fill="none" stroke="#f0ae38" strokeWidth="7" strokeLinecap="round" /><path d="M16 8 51 32 16 56" fill="none" stroke="#fff0ae" strokeWidth="2" /><path d="m38 24 16 8-16 8-4-8z" fill="#ef4c50" stroke="#8b2429" strokeWidth="2" /><path d="M14 9 20 6" stroke="#fff" strokeWidth="3" strokeLinecap="round" /></svg>;
  if (id === "cannon") return <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="35" r="22" fill="#234c76" stroke="#ffd043" strokeWidth="4" /><path d="M18 17 43 14l11 15-17 10-21-9z" fill="#384d6f" stroke="#a7c9da" strokeWidth="3" /><circle cx="30" cy="29" r="7" fill="#171f39" stroke="#ffdf6b" strokeWidth="3" /><circle cx="17" cy="44" r="5" fill="#ed4d50" /><circle cx="29" cy="51" r="5" fill="#f3c633" /><circle cx="43" cy="44" r="5" fill="#41b6ed" /><path d="M20 16 38 14" stroke="#fff" strokeWidth="3" strokeLinecap="round" /></svg>;
  return <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M15 13c-5 5-6 11-2 15l10 4-10 4c-4 4-3 10 2 15 5 5 11 6 15 2l2-11 4 11c4 4 10 3 15-2s6-11 2-15l-10-4 10-4c4-4 3-10-2-15s-11-6-15-2l-4 10-2-10c-4-4-10-3-15 2z" fill="#69ce47" stroke="#258c37" strokeWidth="3" /><circle cx="22" cy="24" r="5" fill="#ed3c77" /><circle cx="41" cy="24" r="5" fill="#f9d334" /><circle cx="22" cy="42" r="5" fill="#37aafa" /><circle cx="41" cy="42" r="5" fill="#ed5c30" /><circle cx="32" cy="33" r="8" fill="#ffe342" stroke="#fff5a0" strokeWidth="2" /></svg>;
}

function GoalPanel({ goals, won = false }) {
  if (won) {
    return (
      <section className="rg-info-card rg-goal-card rg-reward-card" aria-label="Bölüm ödülü">
        <div className="rg-card-ribbon">Ödül</div>
        <div className="rg-coin-reward"><span className="rg-coin-icon" aria-hidden="true">♛</span><strong>10</strong></div>
      </section>
    );
  }
  const goalLabels = {
    vault: "Kasa",
    bear: "Ayıcık",
    grass: "Çim",
    hat: "Şapka",
    drill: "Matkap",
    gems: "Mücevher",
  };
  const goalMeta = ["vault", "bear", "grass", "hat", "drill", "gems"]
    .filter((id) => goals.some((goal) => goal.id === id))
    .map((id) => ({ id, label: goalLabels[id] }));
  return (
    <section className="rg-info-card rg-goal-card" aria-label="Hedefler">
      <div className="rg-card-ribbon">Hedef</div>
      <div className="rg-goal-grid">
        {goalMeta.map(({ id, label }) => {
          const goal = goals.find((item) => item.id === id) || { remaining: 0, total: 0 };
          return (
            <div className="rg-goal-item" data-goal-id={id} key={id} aria-label={`${label}: ${goal.remaining}`}>
              <span className="rg-goal-icon"><GoalGlyph id={id} /></span>
              <span className="rg-goal-count" key={`${id}-${goal.remaining}`}>{goal.remaining}</span>
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
  onNextLevel = () => {},
  onLevelMap = () => {},
  totalLevels = 500,
  mascotMood = "happy",
  effectLayer = null,
  rewardLayer = null,
  settingsDialog = null,
  onCellRef = () => {},
  message = "",
}) {
  const board = Array.isArray(game.board) ? game.board : fallbackBoard;
  const goals = Array.isArray(game.goals) ? game.goals : [
    { id: "vault", remaining: 3, total: 3 },
    { id: "gems", remaining: 19, total: 19 },
  ];
  const movesLeft = game.movesLeft ?? 37;
  const boosters = Object.entries(game.boosters || { hammer: 17, bow: 22, cannon: 16, jester: 26 })
    .map(([id, count]) => ({ id, count }));

  return (
    <main className="royal-game-screen">
      <div className="rg-castle-backdrop" aria-hidden="true" />
      <header className="rg-topbar">
        <GoalPanel goals={goals} won={game.status === "won"} />
        <div className={`rg-king-arch rg-mood-${mascotMood}`} aria-label="Kraliyet rehberi">
          <div className="rg-arch-outer"><div className="rg-arch-inner"><img src="/king-avatar.png" alt="" /></div></div>
          <span className="rg-king-glint" />
        </div>
        <section className="rg-info-card rg-moves-card" aria-label="Kalan hamle">
          <div className="rg-card-ribbon">Hamle</div>
          <div className="rg-moves-number">{movesLeft}</div>
          <div className="rg-level-caption">Bölüm {game.level ?? 1} / {totalLevels}</div>
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
                  ref={(element) => onCellRef(cell?.id, element)}
                  data-row={rowIndex}
                  data-col={colIndex}
                  className={`rg-cell ${cell ? "rg-cell-filled" : "rg-cell-cutout"} ${cell?.kind === "blocker" ? `rg-cell-${cell.type}` : ""} ${cell?.special ? `rg-cell-special rg-cell-special-${cell.special}` : ""} ${isSelected ? "is-selected" : ""}`}
                  aria-label={`Satır ${rowIndex + 1}, sütun ${colIndex + 1}: ${accessible}`}
                  onClick={() => onCellClick(rowIndex, colIndex)}
                  onPointerDown={(event) => onCellPointerDown(event, rowIndex, colIndex)}
                  disabled={!cell}
                >
                  {cell?.kind === "gem" && <SpecialPiece color={cell.color} special={cell.special} />}
                  {cell?.kind === "blocker" && <BlockerArt type={cell.type} hp={cell.hp ?? 1} />}
                </button>
              );
            }))}
            {effectLayer && <div className="rg-effects">{effectLayer}</div>}
          </div>
          <div className="rg-board-sheen" aria-hidden="true" />
        </div>
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
              disabled={game.status !== "playing" || count <= 0}
            >
              <span className="rg-booster-art"><BoosterGlyph id={id} /></span>
              <span className="rg-booster-count">{count}</span>
            </button>
          ))}
          <button type="button" className="rg-booster rg-settings" onClick={onSettings} aria-label="Ayarlar">
            <span className="rg-gear" aria-hidden="true"><svg viewBox="0 0 64 64"><path d="M27 5h10l2 7a21 21 0 0 1 5 2l6-4 7 7-4 6a21 21 0 0 1 2 5l7 2v10l-7 2a21 21 0 0 1-2 5l4 6-7 7-6-4a21 21 0 0 1-5 2l-2 7H27l-2-7a21 21 0 0 1-5-2l-6 4-7-7 4-6a21 21 0 0 1-2-5l-7-2V30l7-2a21 21 0 0 1 2-5l-4-6 7-7 6 4a21 21 0 0 1 5-2z" fill="#e4f4f5" stroke="#486789" strokeWidth="3" strokeLinejoin="round" /><circle cx="32" cy="35" r="12" fill="#327ca8" stroke="#d8edee" strokeWidth="4" /><circle cx="32" cy="35" r="5" fill="#a4d7e7" /></svg></span>
          </button>
        </div>
        {game.status === "lost" && (
          <div className="rg-status-card" role="status">
            <strong>Bir tur daha?</strong>
            <button type="button" onClick={onRetry}>Tekrar oyna</button>
          </div>
        )}
      </footer>
      {message && game.status === "playing" && <div className="rg-message-toast" role="status">{message}</div>}
      {game.status === "won" && (
        <div className="rg-victory-overlay" role="status">
          <div className="rg-victory-sparks" aria-hidden="true">{Array.from({ length: 14 }, (_, index) => <i key={index} style={{ "--spark-index": index }} />)}</div>
          <section className="rg-victory-card">
            <div className="rg-victory-medal" aria-hidden="true">★</div>
            <p>BÖLÜM TAMAMLANDI</p>
            <h1>Harika iş!</h1>
            <div className="rg-victory-coins"><span className="rg-coin-icon">♛</span><strong>10</strong><small>altın ödül</small></div>
            <button type="button" onClick={game.level >= totalLevels ? onLevelMap : onNextLevel}>
              {game.level >= totalLevels ? "Haritaya dön" : "Sonraki bölüm"}
            </button>
          </section>
        </div>
      )}
      {rewardLayer}
      {settingsDialog}
    </main>
  );
}
