import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import type { BattleRewards, DuelSummary } from "./types";
import "./game.css";

type DuelResultsProps = {
  summary: DuelSummary;
  rewards: BattleRewards;
  opponentName: string;
  playerName: string;
  onContinue: () => void;
  onReplay: () => void;
};

function useScoreCount(target: number, delay: number) {
  const [score, setScore] = useState(0);
  useEffect(() => {
    setScore(0);
    let current = 0;
    const timeout = window.setTimeout(() => {
      const interval = window.setInterval(() => {
        current = Math.min(target, current + Math.max(1, Math.ceil(target / 32)));
        setScore(current);
        if (current >= target) window.clearInterval(interval);
      }, 26);
    }, delay);
    return () => window.clearTimeout(timeout);
  }, [delay, target]);
  return score;
}

export default function DuelResults({
  summary,
  rewards,
  opponentName,
  playerName,
  onContinue,
  onReplay,
}: DuelResultsProps) {
  const playerScore = useScoreCount(summary.playerScore, 240);
  const rivalScore = useScoreCount(summary.opponentScore, 520);
  const won = summary.verdict === "victory";
  const drew = summary.verdict === "draw";
  const title = won ? "ZAFER!" : drew ? "BERABERLİK" : "YENİLGİ";

  return (
    <main className={`duel-result${won ? " duel-result--victory" : drew ? " duel-result--draw" : " duel-result--defeat"}`}>
      <div className="duel-result__glow" aria-hidden="true" />
      {won && <div className="duel-result__sparks" aria-hidden="true">{Array.from({ length: 16 }, (_, index) => <i key={index} style={{ "--spark": index } as CSSProperties} />)}</div>}
      <motion.section
        className="duel-result__card"
        initial={{ opacity: 0, y: 18, scale: .95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: .55, ease: "easeOut" }}
      >
        <span className="game-eyebrow">DÜELLO SONUCU</span>
        <h1>{title}</h1>
        <p className="duel-result__subtitle">{won ? `${opponentName} ganimetini bıraktı.` : drew ? "Tahtada üstünlük kurulamadı." : `${opponentName} bu kez üstün geldi.`}</p>

        <div className="duel-result__score">
          <div><span>{playerName}</span><strong>{playerScore.toLocaleString("tr-TR")}</strong><small>PUAN · ×{summary.playerCombo} SERİ</small></div>
          <span className="duel-result__divider">—</span>
          <div><span>{opponentName}</span><strong>{rivalScore.toLocaleString("tr-TR")}</strong><small>PUAN · ×{summary.opponentCombo} SERİ</small></div>
        </div>

        <div className="duel-chest" aria-label="Ganimet sandığı">
          <span className="duel-chest__light" />
          <span className="duel-chest__lid" />
          <span className="duel-chest__body"><i>✦</i></span>
        </div>
        <div className="duel-result__rewards">
          <div><span>ALTIN</span><strong>{rewards.gold > 0 ? `+${rewards.gold}` : rewards.lostStake ? `−${rewards.lostStake}` : "—"}</strong></div>
          <div><span>DENEYİM</span><strong>+{rewards.xp} XP</strong></div>
          <div><span>GANİMET</span><strong>{rewards.item ?? (drew ? "Aktarılmadı" : "Yok")}</strong></div>
        </div>
        {rewards.item && <p className="duel-result__item"><span>✦</span> {rewards.item} heybene eklendi</p>}
        {rewards.lostStake > 0 && <p className="duel-result__stake">{rewards.lostStake} altın düello payı olarak el değiştirdi.</p>}

        <div className="duel-result__actions">
          <button type="button" className="game-gold-button" onClick={onContinue}>YOLUNA DEVAM ET</button>
          <button type="button" className="game-quiet-button" onClick={onReplay}>TEKRAR DÜELLO</button>
        </div>
      </motion.section>
    </main>
  );
}
