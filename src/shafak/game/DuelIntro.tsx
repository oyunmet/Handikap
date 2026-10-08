import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import type { Opponent } from "./types";

type DuelIntroProps = {
  playerName: string;
  playerLevel: number;
  opponent: Opponent;
  onComplete: () => void;
};

export default function DuelIntro({ playerName, playerLevel, opponent, onComplete }: DuelIntroProps) {
  const reducedMotion = useReducedMotion();
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setBeat((current) => current + 1), 850);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (beat >= 4) {
      const timer = window.setTimeout(onComplete, reducedMotion ? 160 : 640);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [beat, onComplete, reducedMotion]);

  const beatLabel = beat < 3 ? ["3", "2", "1"][beat] : beat === 3 ? "SAVAŞ!" : "SAVAŞ!";

  return (
    <motion.main
      className="duel-intro"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: reducedMotion ? 1 : 1.04 }}
      transition={{ duration: reducedMotion ? 0.16 : 0.5 }}
      aria-label="Düello başlangıcı"
      aria-live="assertive"
    >
      <div className="duel-intro__vignette" />
      <div className="duel-intro__embers" />
      <p className="duel-intro__eyebrow">YOL KESİŞİMİ · ONUR DÜELLOSU</p>
      <div className="duel-intro__versus">
        <motion.div
          className="duel-intro__fighter duel-intro__fighter--player"
          initial={{ x: reducedMotion ? 0 : -90, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: reducedMotion ? 0.1 : 0.62, ease: "easeOut" }}
        >
          <div className="duel-intro__portrait"><img src="/shafak-warrior.png" alt="" /></div>
          <span>YOLCU · SEVİYE {String(playerLevel).padStart(2, "0")}</span>
          <strong>{playerName}</strong>
        </motion.div>
        <motion.span
          className="duel-intro__vs"
          initial={{ opacity: 0, scale: 1.8, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ delay: reducedMotion ? 0 : 0.24, duration: reducedMotion ? 0.1 : 0.46 }}
          aria-hidden="true"
        >VS</motion.span>
        <motion.div
          className="duel-intro__fighter duel-intro__fighter--rival"
          initial={{ x: reducedMotion ? 0 : 90, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: reducedMotion ? 0.1 : 0.62, ease: "easeOut" }}
        >
          <div className="duel-intro__portrait"><img src="/shafak-warrior.png" alt="" /></div>
          <span>YOL KESEN · SEVİYE {String(opponent.level).padStart(2, "0")}</span>
          <strong>{opponent.name}</strong>
          <small>{opponent.loot} altın ganimet</small>
        </motion.div>
      </div>
      <motion.div
        key={beatLabel}
        className={`duel-intro__count${beat >= 3 ? " is-battle" : ""}`}
        initial={{ scale: reducedMotion ? 1 : 1.65, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: reducedMotion ? 0.1 : 0.36, ease: "backOut" }}
      >{beatLabel}</motion.div>
      <p className="duel-intro__rule">İKİ SAVAŞÇI · AYNI TAHTA · 20 HAMLE</p>
    </motion.main>
  );
}
