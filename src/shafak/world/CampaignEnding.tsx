import { useCallback, useEffect, useState, type ComponentType } from "react";
import type { BattleRewards } from "../game/types";
import { CAMPAIGN_COPY } from "../i18n/campaign-copy.ts";
import "./campaign-ending.css";
import type { PrincessModelRevealProps } from "./PrincessModelReveal";
import {
  PRINCESS_ENDING_MOOD_TIMELINE,
  type PrincessAnimationMood,
} from "./princess-model-config";

type PrincessModelRevealComponent = ComponentType<PrincessModelRevealProps>;

type CampaignEndingProps = {
  rewards: BattleRewards | null;
  onStartNewGamePlus: () => Promise<unknown>;
  onMainMenu: () => void;
  previewMode?: boolean;
  forceFallback?: boolean;
};

export default function CampaignEnding({
  rewards,
  onStartNewGamePlus,
  onMainMenu,
  previewMode = false,
  forceFallback = false,
}: CampaignEndingProps) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [PrincessModelReveal, setPrincessModelReveal] = useState<PrincessModelRevealComponent | null>(null);
  const [princessModelReady, setPrincessModelReady] = useState(false);
  const [princessMood, setPrincessMood] = useState<PrincessAnimationMood>("idle");

  useEffect(() => {
    if (forceFallback) {
      setPrincessModelReveal(null);
      setPrincessModelReady(false);
      return undefined;
    }

    let active = true;
    void import("./PrincessModelReveal").then(({ default: component }) => {
      if (active) setPrincessModelReveal(() => component);
    }).catch(() => {
      // Keep the static ending art if the optional 3D chunk cannot be loaded.
    });
    return () => { active = false; };
  }, [forceFallback]);

  useEffect(() => {
    if (confirming || !princessModelReady) {
      setPrincessMood("idle");
      return undefined;
    }
    const [arrival, wave, talk] = PRINCESS_ENDING_MOOD_TIMELINE;
    setPrincessMood(arrival.mood);
    const waveTimer = window.setTimeout(() => setPrincessMood(wave.mood), wave.atMs - arrival.atMs);
    const talkTimer = window.setTimeout(() => setPrincessMood(talk.mood), talk.atMs - arrival.atMs);
    return () => {
      window.clearTimeout(waveTimer);
      window.clearTimeout(talkTimer);
    };
  }, [confirming, princessModelReady]);

  const markPrincessModelReady = useCallback(() => setPrincessModelReady(true), []);
  const markPrincessModelFailed = useCallback(() => setPrincessModelReady(false), []);

  const startNewGamePlus = async () => {
    setBusy(true);
    setError("");
    try {
      await onStartNewGamePlus();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Yeni Oyun+ başlatılamadı. İlerlemen değişmedi.");
      setBusy(false);
    }
  };

  return (
    <div className="campaign-ending-backdrop">
      <section
        className={`campaign-ending${confirming ? " is-confirming" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-ending-title"
      >
        {!confirming ? (
          <>
            <div className={`campaign-ending__art${princessModelReady ? " has-3d-princess" : ""}`} aria-hidden="true">
              <svg viewBox="0 0 260 220" fill="none">
                <path d="M35 190V86L130 24l95 62v104" stroke="currentColor" strokeWidth="4" />
                <path d="M74 190v-67a56 56 0 0 1 112 0v67" fill="rgba(18,18,21,.82)" stroke="currentColor" strokeWidth="3" />
                <path d="M130 67v122M90 190v-64a40 40 0 0 1 80 0v64" stroke="rgba(238,197,130,.42)" strokeWidth="2" />
                <circle cx="130" cy="124" r="8" fill="#f3c879" />
                <path d="M130 127v24m-11-12h22" stroke="#f3c879" strokeWidth="3" strokeLinecap="round" />
                <path d="M119 170c0-12 5-21 11-21s11 9 11 21v20h-22v-20Z" fill="#d4c2a3" />
                <circle cx="130" cy="141" r="7" fill="#e2c9a2" />
                <path d="M123 140c0-10 4-15 7-15s8 5 8 15" stroke="#7e5d40" strokeWidth="4" />
                <path d="M130 24v28m-10-7 10 7 10-7" stroke="#f3c879" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M44 190h172" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              </svg>
              {!forceFallback && PrincessModelReveal && (
                <PrincessModelReveal
                  mood={princessMood}
                  onReady={markPrincessModelReady}
                  onFailure={markPrincessModelFailed}
                />
              )}
            </div>
            <span className="campaign-ending__eyebrow">{CAMPAIGN_COPY.finalChapterLabel}</span>
            <h1 id="campaign-ending-title">OYUN TAMAMLANDI</h1>
            <p className="campaign-ending__dialogue">
              “Beni kurtarmaya değil, hatırlamaya geldin. Mühür parçalarını birleştirince krallık da adımı hatırladı.”
            </p>
            <p className="campaign-ending__copy">
              {CAMPAIGN_COPY.endingSummary}
            </p>
            {previewMode ? (
              <p className="campaign-ending__reward-note">
                TEST ÖNİZLEMESİ · KAYITLARIN DEĞİŞTİRİLMEZ
              </p>
            ) : rewards ? (
              <div className="campaign-ending__rewards" aria-label="Son bölüm ödülleri">
                <span>SON BÖLÜM ÖDÜLÜ</span>
                <b>{rewards.gold > 0 ? `+${rewards.gold} altın` : "Altın —"}</b>
                <b>{rewards.diamonds > 0 ? `+${rewards.diamonds} elmas` : "Elmas —"}</b>
                <b>+{rewards.xp} XP{rewards.sealFragments > 0 ? ` · +${rewards.sealFragments} Mühür Parçası` : ""}</b>
              </div>
            ) : (
              <p className="campaign-ending__reward-note">Son bossun ödülleri hesabında kayıtlı.</p>
            )}
            <div className="campaign-ending__actions">
              {!previewMode && (
                <button className="campaign-ending__primary" type="button" onClick={() => setConfirming(true)}>
                  ZOR MODDA YENİ OYUN+
                </button>
              )}
              <button className="campaign-ending__secondary" type="button" onClick={onMainMenu}>
                {previewMode ? "NORMAL OYUNA DÖN" : "ANA MENÜYE DÖN"}
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="campaign-ending__eyebrow">YENİ SEFER</span>
            <h1 id="campaign-ending-title">YENİ OYUN+ BAŞLASIN MI?</h1>
            <p className="campaign-ending__copy">
              Bu geri alınamaz işlem yalnızca bölüm ilerlemesini ve yol rakibi kayıtlarını sıfırlar. Altın, elmas,
              seviye, ekipman, envanter, demirci yükseltmeleri ve alınmış ganimetler korunur. Yeni sefer Zor modda başlar.
            </p>
            {error && <p className="campaign-ending__error" role="alert">{error}</p>}
            <div className="campaign-ending__actions">
              <button
                className="campaign-ending__primary"
                type="button"
                disabled={busy}
                onClick={() => void startNewGamePlus()}
              >
                {busy ? "YENİ SEFER HAZIRLANIYOR…" : "SIFIRLA VE YENİDEN BAŞLA"}
              </button>
              <button
                className="campaign-ending__secondary"
                type="button"
                disabled={busy}
                onClick={() => {
                  setError("");
                  setConfirming(false);
                }}
              >
                VAZGEÇ
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
