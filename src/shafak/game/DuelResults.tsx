import { motion } from "framer-motion";
import type { CSSProperties } from "react";
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

export default function DuelResults({
  summary,
  rewards,
  opponentName,
  playerName,
  onContinue,
  onReplay,
}: DuelResultsProps) {
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
        <p className="duel-result__subtitle">{won ? `${opponentName} ganimetini bıraktı.` : drew ? "İki savaşçı da geri çekildi." : `${opponentName} bu kez üstün geldi.`}</p>

        <div className="duel-result__participants">
          <strong>{playerName}</strong>
          <span aria-hidden="true">VS</span>
          <strong>{opponentName}</strong>
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
