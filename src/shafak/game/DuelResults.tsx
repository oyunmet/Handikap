import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import type { BattleRewards, DuelSummary } from "./types";
import type { CampaignOperationStory } from "../../data/story.ts";
import { STORY_UI_STRINGS } from "../../data/strings.ts";
import "./game.css";

type DuelResultsProps = {
  summary: DuelSummary;
  rewards: BattleRewards;
  opponentName: string;
  playerName: string;
  visualEffectsEnabled: boolean;
  practice?: boolean;
  note?: string;
  canReplay?: boolean;
  operationStory?: CampaignOperationStory | null;
  onContinue: () => void;
  onMainMenu: () => void;
  onReplay: () => void;
};

export default function DuelResults({
  summary,
  rewards,
  opponentName,
  playerName,
  visualEffectsEnabled,
  practice = false,
  note,
  canReplay = true,
  operationStory = null,
  onContinue,
  onMainMenu,
  onReplay,
}: DuelResultsProps) {
  const won = summary.verdict === "victory";
  const drew = summary.verdict === "draw";
  const title = won ? "ZAFER!" : drew ? "BERABERLİK" : "YENİLGİ";

  return (
    <main
      className={`duel-result${won ? " duel-result--victory" : drew ? " duel-result--draw" : " duel-result--defeat"}`}
      data-visual-effects={visualEffectsEnabled}
    >
      <div className="duel-result__glow" aria-hidden="true" />
      {won && visualEffectsEnabled && <div className="duel-result__sparks" aria-hidden="true">{Array.from({ length: 16 }, (_, index) => <i key={index} style={{ "--spark": index } as CSSProperties} />)}</div>}
      <motion.section
        className="duel-result__card"
        initial={visualEffectsEnabled ? { opacity: 0, y: 18, scale: .95 } : false}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: visualEffectsEnabled ? .55 : 0, ease: "easeOut" }}
      >
        <span className="game-eyebrow">DÜELLO SONUCU</span>
        <h1>{title}</h1>
        <p className="duel-result__subtitle">{won ? `${opponentName} ganimetini bıraktı.` : drew ? "İki savaşçı da geri çekildi." : `${opponentName} bu kez üstün geldi.`}</p>
        {(practice || note) && <p className="duel-result__note">{practice ? "Eğitim düellosu · ödül ve profil ilerlemesi verilmez." : note}</p>}

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
          <div><span>ELMAS</span><strong>{rewards.diamonds > 0 ? `+${rewards.diamonds}` : "—"}</strong></div>
          <div><span>DENEYİM</span><strong>+{rewards.xp} XP</strong></div>
          {rewards.sealFragments > 0 && <div><span>MÜHÜR PARÇASI</span><strong>+{rewards.sealFragments}</strong></div>}
          <div><span>GANİMET</span><strong>{rewards.item ?? (drew ? "Aktarılmadı" : "Yok")}</strong></div>
        </div>
        {won && operationStory && !practice && (
          <section className="duel-result__operation-record" aria-label={STORY_UI_STRINGS.operationResult.eyebrow}>
            <span>{STORY_UI_STRINGS.operationResult.recordLabel} · {operationStory.name}</span>
            <h2>{operationStory.record.title}</h2>
            <p>{operationStory.record.excerpt}</p>
            <small>
              {operationStory.nextOperationHint
                ? <>{STORY_UI_STRINGS.operationResult.nextOperationLabel}: {operationStory.nextOperationHint}</>
                : STORY_UI_STRINGS.operationResult.finalOperationLabel}
            </small>
          </section>
        )}
        <div className="duel-result__combat-stats" aria-label="Düello istatistikleri">
          <span>EN UZUN KOMBO <b>{summary.maxCombo ?? 0} VURUŞ</b></span>
          <span>EN YÜKSEK HASAR <b>{summary.highestDamage ?? 0}</b></span>
        </div>
        {rewards.item && <p className="duel-result__item"><span>✦</span> {rewards.salvaged ? rewards.item : `${rewards.item} envanterine eklendi`}</p>}
        {rewards.lostStake > 0 && <p className="duel-result__stake">{rewards.lostStake} altın düello payı olarak el değiştirdi.</p>}

        <div className="duel-result__actions">
          <button type="button" className="game-gold-button" onClick={onContinue}>SEFERE DEVAM ET</button>
          {canReplay && <button type="button" className="game-quiet-button" onClick={onReplay}>TEKRAR DÜELLO</button>}
          <button type="button" className="game-quiet-button" onClick={onMainMenu}>ANA MENÜYE DÖN</button>
        </div>
      </motion.section>
    </main>
  );
}
