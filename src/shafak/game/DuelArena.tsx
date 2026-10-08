import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { playGameSound } from "../audio/howler";
import {
  BOARD_SIZE,
  chooseBotMove,
  createDuelState,
  findBestMove,
  isAdjacent,
  resolveDuelMove,
} from "./duel.js";
import type { PlayerProfile } from "./profile";
import type { DuelSummary, Opponent, SubmittedMove } from "./types";
import "./game.css";

type DuelArenaProps = {
  seed: number;
  player: PlayerProfile;
  opponent: Opponent;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  onFinish: (moves: SubmittedMove[], localSummary: DuelSummary) => void;
  finishError: string | null;
};

const tileSymbols: Record<string, string> = {
  sword: "⚔",
  shield: "⬟",
  fire: "♨",
  ice: "✣",
  arrow: "➤",
  heart: "♥",
};

function finishDuel(
  playerState: ReturnType<typeof createDuelState>,
  rivalState: ReturnType<typeof createDuelState>,
  opponent: Opponent,
): DuelSummary {
  const verdict = playerState.score > rivalState.score
    ? "victory"
    : playerState.score < rivalState.score
      ? "defeat"
      : playerState.comboBest > rivalState.comboBest
        ? "victory"
        : playerState.comboBest < rivalState.comboBest ? "defeat" : "draw";
  return {
    verdict,
    opponentId: opponent.id,
    playerScore: playerState.score,
    opponentScore: rivalState.score,
    playerCombo: playerState.comboBest,
    opponentCombo: rivalState.comboBest,
    loot: opponent.loot,
  };
}

function TileMark({ type }: { type: string }) {
  return <span className={`duel-tile__mark duel-tile__mark--${type}`} aria-hidden="true">{tileSymbols[type]}</span>;
}

export default function DuelArena({ seed, player, opponent, soundEnabled, vibrationEnabled, onFinish, finishError }: DuelArenaProps) {
  const [playerState, setPlayerState] = useState(() => createDuelState(seed));
  const [rivalState, setRivalState] = useState(() => createDuelState(seed));
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hint, setHint] = useState<{ first: number; second: number } | null>(null);
  const [notice, setNotice] = useState("");
  const [turnEffect, setTurnEffect] = useState(0);
  const [tutorialOpen, setTutorialOpen] = useState(() => {
    try { return localStorage.getItem("shafak-tutorial-v1") !== "seen"; } catch { return true; }
  });
  const botTimer = useRef<number | null>(null);
  const finishTimer = useRef<number | null>(null);
  const finished = useRef(false);
  const submittedMoves = useRef<SubmittedMove[]>([]);

  useEffect(() => () => {
    if (botTimer.current) window.clearTimeout(botTimer.current);
    if (finishTimer.current) window.clearTimeout(finishTimer.current);
  }, []);

  useEffect(() => {
    if (paused || tutorialOpen || locked || playerState.status !== "playing") return undefined;
    const timer = window.setTimeout(() => setHint(findBestMove(playerState)), 6200);
    return () => window.clearTimeout(timer);
  }, [locked, paused, playerState, tutorialOpen]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 1500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const announceFinish = (mine: typeof playerState, theirs: typeof rivalState) => {
    if (finished.current) return;
    finished.current = true;
    finishTimer.current = window.setTimeout(
      () => onFinish([...submittedMoves.current], finishDuel(mine, theirs, opponent)),
      480,
    );
  };

  const runBotReply = (nextPlayerState: typeof playerState) => {
    setLocked(true);
    setHint(null);
    botTimer.current = window.setTimeout(() => {
      const move = chooseBotMove(rivalState, opponent.difficulty);
      if (!move) {
        announceFinish(nextPlayerState, rivalState);
        setLocked(false);
        return;
      }
      const result = resolveDuelMove(rivalState, move.first, move.second);
      if (!result.accepted) {
        setLocked(false);
        return;
      }
      setRivalState(result.state);
      setTurnEffect((current) => current + 1);
      if (nextPlayerState.movesLeft === 0 || result.state.movesLeft === 0) {
        announceFinish(nextPlayerState, result.state);
      }
      botTimer.current = window.setTimeout(() => setLocked(false), 460);
    }, 880);
  };

  const tapTile = (index: number) => {
    if (tutorialOpen || locked || paused || playerState.status !== "playing") return;
    setHint(null);
    if (selected === null) {
      setSelected(index);
      return;
    }
    if (selected === index) {
      setSelected(null);
      return;
    }
    if (!isAdjacent(selected, index)) {
      setSelected(index);
      return;
    }
    const result = resolveDuelMove(playerState, selected, index);
    if (!result.accepted) {
      setNotice(result.reason === "no-match" ? "Bu değişim bir eşleşme oluşturmuyor." : "Geçersiz hamle.");
      playGameSound("deny");
      setSelected(null);
      return;
    }

    setSelected(null);
    submittedMoves.current.push({ first: selected, second: index });
    setPlayerState(result.state);
    setTurnEffect((current) => current + 1);
    if (soundEnabled) playGameSound(result.state.lastWaves.length > 1 ? "combo" : "match");
    if (vibrationEnabled && "vibrate" in navigator) {
      try { navigator.vibrate(result.state.lastWaves.length > 1 ? [18, 28, 22, 42] : 15); } catch { /* Haptics are optional. */ }
    }
    runBotReply(result.state);
  };

  const playerPressure = playerState.score / Math.max(1, playerState.score + rivalState.score);
  const rivalPressure = 1 - playerPressure;

  return (
    <main className={`duel-arena${locked ? " is-busy" : ""}`} aria-label="Taş birleştirme düellosu">
      <div className="duel-arena__backdrop" />
      <header className="duel-hud">
        <section className="duel-fighter duel-fighter--player" aria-label={`${player.name}, ${playerState.score} puan`}>
          <div className="duel-fighter__portrait"><img src="/shafak-warrior.png" alt="" /></div>
          <div className="duel-fighter__info">
            <div><strong>{player.name}</strong><span>SEV. {String(player.level).padStart(2, "0")}</span></div>
            <div className="duel-health"><i style={{ transform: `scaleX(${playerPressure})` }} /></div>
            <b>{playerState.score.toLocaleString("tr-TR")} <small>PUAN</small></b>
          </div>
        </section>
        <div className="duel-count">
          <span>HAMLE</span>
          <strong className={playerState.movesLeft <= 3 ? "is-final" : ""}>{String(playerState.movesLeft).padStart(2, "0")}</strong>
          <small>/ 20</small>
        </div>
        <section className="duel-fighter duel-fighter--rival" aria-label={`${opponent.name}, ${rivalState.score} puan`}>
          <div className="duel-fighter__info">
            <div><strong>{opponent.name}</strong><span>SEV. {String(opponent.level).padStart(2, "0")}</span></div>
            <div className="duel-health duel-health--rival"><i style={{ transform: `scaleX(${rivalPressure})` }} /></div>
            <b>{rivalState.score.toLocaleString("tr-TR")} <small>PUAN</small></b>
          </div>
          <div className="duel-fighter__portrait"><img src="/shafak-warrior.png" alt="" /></div>
        </section>
      </header>

      <div className="duel-arena__title">
        <span>YAPAY ZEKÂ DÜELLOSU · AYNI TOHUM</span>
        <h1>Rün Tahtası</h1>
      </div>
      <div className="duel-board-wrap">
        <div className="duel-board-frame">
          <div className="duel-board" role="grid" aria-label="Yediye yedi rün tahtası" aria-rowcount={BOARD_SIZE} aria-colcount={BOARD_SIZE}>
            {playerState.board.flatMap((row, rowIndex) => row.map((tile, colIndex) => {
              const index = rowIndex * BOARD_SIZE + colIndex;
              const isHint = hint?.first === index || hint?.second === index;
              const flash = playerState.lastClear.includes(index) && turnEffect > 0;
              return (
                <button
                  type="button"
                  role="gridcell"
                  aria-selected={selected === index}
                  aria-label={`${rowIndex + 1}. sıra, ${colIndex + 1}. sütun, ${tile.type}${tile.special ? `, ${tile.special} özel taşı` : ""}`}
                  className={`duel-tile duel-tile--${tile.type}${tile.special ? ` duel-tile--${tile.special}` : ""}${selected === index ? " is-selected" : ""}${isHint ? " is-hint" : ""}${flash ? ` is-clear clear-${turnEffect % 2}` : ""}`}
                  key={index}
                  onClick={() => tapTile(index)}
                  disabled={locked || paused || playerState.status !== "playing"}
                  style={{ animationDelay: flash ? `${(index % 5) * 24}ms` : undefined }}
                >
                  <TileMark type={tile.type} />
                  {tile.special && <span className="duel-tile__special" aria-label="Özel taş">
                    {tile.special === "row" ? "↔" : tile.special === "column" ? "↕" : tile.special === "bomb" ? "✹" : "✦"}
                  </span>}
                </button>
              );
            }))}
          </div>
        </div>
      </div>

      <footer className="duel-controls">
        <div className="duel-controls__message" aria-live="polite">
          <span className={locked ? "duel-thinking is-active" : "duel-thinking"} aria-hidden="true" />
          {locked ? `${opponent.name} hamlesini yapıyor…` : notice || `En iyi seri: ${playerState.comboBest}×`}
        </div>
        <div className="duel-controls__actions">
          <span className="duel-combo"><b>×{playerState.comboBest}</b><small>EN İYİ SERİ</small></span>
          <button type="button" className="duel-help-button" onClick={() => setTutorialOpen(true)} disabled={locked} aria-label="Nasıl oynanır">?</button>
          <button type="button" className="duel-pause-button" onClick={() => setPaused(true)} disabled={locked}>DURAKLAT</button>
        </div>
      </footer>

      {paused && (
        <div className="duel-modal-backdrop">
          <section className="duel-modal" role="dialog" aria-modal="true" aria-labelledby="pause-title">
            <span className="game-eyebrow">DÜELLO BEKLEMEDE</span>
            <h2 id="pause-title">Bir nefes al.</h2>
            <p>Tahta ve hamlelerin korunuyor.</p>
            <button type="button" className="game-gold-button" onClick={() => setPaused(false)}>DÜELLOYA DÖN</button>
            <button type="button" className="game-quiet-button" onClick={() => { setPaused(false); setTutorialOpen(true); }}>NASIL OYNANIR?</button>
            <button type="button" className="game-quiet-button" onClick={() => {
              if (finished.current) return;
              finished.current = true;
              onFinish([...submittedMoves.current], {
                verdict: "defeat",
                opponentId: opponent.id,
                playerScore: playerState.score,
                opponentScore: rivalState.score,
                playerCombo: playerState.comboBest,
                opponentCombo: rivalState.comboBest,
                loot: opponent.loot,
              });
            }}>DÜELLODAN ÇEKİL</button>
          </section>
        </div>
      )}
      {finishError && (
        <div className="duel-modal-backdrop">
          <section className="duel-modal" role="dialog" aria-modal="true" aria-labelledby="duel-submit-error">
            <span className="game-eyebrow">SONUÇ DOĞRULANAMADI</span>
            <h2 id="duel-submit-error">Düello sunucuya ulaşmadı.</h2>
            <p>{finishError}</p>
            <button
              type="button"
              className="game-gold-button"
              onClick={() => onFinish(
                [...submittedMoves.current],
                finishDuel(playerState, rivalState, opponent),
              )}
            >
              TEKRAR DENE
            </button>
          </section>
        </div>
      )}
      {tutorialOpen && (
        <div className="duel-modal-backdrop">
          <section className="duel-modal" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
            <span className="game-eyebrow">İLK DÜELLO REHBERİ</span>
            <h2 id="tutorial-title">Rünleri eşleştir.</h2>
            <p>Yan yana iki taşı seçip yer değiştir. Üç veya daha fazla aynı rünü sıraya ya da sütuna dizerek puan kazan.</p>
            <ul className="duel-tutorial-list">
              <li><b>4 taş:</b> bütün bir satırı veya sütunu temizler.</li>
              <li><b>5 taş:</b> renk bombasını oluşturur.</li>
              <li><b>20 hamle:</b> tahtan ve tohumun rakibininkiyle aynıdır.</li>
            </ul>
            <button type="button" className="game-gold-button" onClick={() => {
              try { localStorage.setItem("shafak-tutorial-v1", "seen"); } catch { /* Tutorial can be dismissed without storage. */ }
              setTutorialOpen(false);
            }}>ANLADIM · SAVAŞA BAŞLA</button>
          </section>
        </div>
      )}
      <motion.span key={turnEffect} className="duel-turn-flare" aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: [0, .6, 0] }} transition={{ duration: .58 }} />
    </main>
  );
}
