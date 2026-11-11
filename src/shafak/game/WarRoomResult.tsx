import type { WarRoomRoom, WarRoomSavedProgress } from "./war-room-rooms";
import type { WarRoomLeaderboardEntry } from "./war-room-leaderboard";
import { WAR_ROOM_ROOM_CHAIN_ENABLED } from "./war-room-features";
import { getWarRoomResultLabel, type WarRoomDifficultyId, type WarRoomModeId, type WarRoomModifierId } from "./war-room-missions";

export type WarRoomResultSummary = {
  kills: number;
  headshots: number;
  accuracy: number;
  seconds: number;
  gold: number;
  totalGold: number | null;
  mode: WarRoomModeId;
  dailyObjective?: Exclude<WarRoomModeId, "daily" | "survival"> | null;
  difficulty: WarRoomDifficultyId;
  modifiers: WarRoomModifierId[];
  wave: number;
  score: number;
  grade: "S" | "A" | "B" | "C";
  xp: number;
  sealFragments: number;
  profileRewardState: "pending" | "saved" | "failed";
  roomNumber: number;
  roomName: string;
  commanderTitle: string;
  enemyCount: number;
  dailyChallenge?: boolean;
  dailyChallengeCompleted?: boolean;
  contract: {
    title: string;
    description: string;
    target: number;
    progress: number;
    bonusGold: number;
    completed: boolean;
  };
  nextRoom: WarRoomRoom | null;
  leaderboard: WarRoomLeaderboardEntry[];
};

type Props = {
  phase: "victory" | "defeat";
  summary: WarRoomResultSummary;
  roomProgress: WarRoomSavedProgress;
  onNextRoom: () => void;
  onRetryRoom: () => void;
  onRestart: () => void;
  onExit: () => void;
};

function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export default function WarRoomResult({
  phase,
  summary,
  roomProgress,
  onNextRoom,
  onRetryRoom,
  onRestart,
  onExit,
}: Props) {
  const victory = phase === "victory";
  const objectiveMode = summary.mode === "daily"
    ? summary.dailyObjective ?? "raid"
    : summary.mode;

  return (
    <section className={`war-room-result${victory ? "" : " is-defeat"}`} role="dialog" aria-modal="true">
      <div className="war-room-result__card">
        <span className="war-room-eyebrow">
          {getWarRoomResultLabel(summary.mode)} · {summary.roomName.toLocaleUpperCase("tr-TR")} · GÖREV RAPORU
        </span>
        <h1>{victory ? "ZAFER" : "YENİLGİ"}</h1>
        <p>{victory
          ? objectiveMode === "treasure"
            ? "Süre dolmadan gerekli sandıklar açıldı."
            : objectiveMode === "defense"
              ? "Savunma noktası korundu ve saldırı durduruldu."
              : objectiveMode === "survival"
                ? `${summary.wave}. dalga tamamlandı.`
                : `Görev tamamlandı; ${summary.commanderTitle} ve kuvvetleri yenildi.`
          : summary.mode === "survival"
            ? `${summary.wave}. dalgada durduruldun. Skorunu görmek veya yeniden denemek için seçim yap.`
            : `${summary.roomName} görevi tamamlanmadı. Yeniden deneyebilir veya çıkabilirsin.`}</p>
        {summary.dailyChallenge && (
          <section className={`war-room-daily-result${summary.dailyChallengeCompleted ? " is-complete" : ""}`}>
            <strong>{summary.dailyChallengeCompleted ? "GÜNLÜK SINAV TAMAMLANDI" : "GÜNLÜK SINAV DEVAM EDİYOR"}</strong>
            <p>{summary.dailyChallengeCompleted
              ? "Bugünün ortak sınavı tamamlandı. İstersen aynı sınavı yeniden oynayabilirsin."
              : "Bugünün ek hedefini tamamlayıp sınavı bitirmek için aynı görevi tekrar deneyebilirsin."}</p>
          </section>
        )}
        <section className="war-room-grade-result" aria-label="Görev derecesi ve puanı">
          <div className={`war-room-grade-result__mark is-${summary.grade.toLowerCase()}`}>
            <span>DERECE</span>
            <strong>{summary.grade}</strong>
          </div>
          <div className="war-room-grade-result__score">
            <span>PUAN</span>
            <strong>{summary.score.toLocaleString("tr-TR")}</strong>
            <small>{summary.difficulty.toLocaleUpperCase("tr-TR")} · {summary.modifiers.length
              ? summary.modifiers.map((modifier) => modifier.toLocaleUpperCase("tr-TR")).join(" · ")
              : "DEĞİŞTİRİCİ YOK"}
              {summary.mode === "survival" ? ` · DALGA ${summary.wave}` : ""}
            </small>
          </div>
        </section>
        <div className="war-room-stat-grid">
          <div><span>DÜŞÜRÜLEN</span><b>{summary.kills} / {summary.enemyCount}</b></div>
          <div><span>KAFA VURUŞU</span><b>{summary.headshots}</b></div>
          <div><span>İSABET</span><b>%{summary.accuracy}</b></div>
          <div><span>SÜRE</span><b>{formatDuration(summary.seconds)}</b></div>
        </div>
        <section className={`war-room-contract-result${summary.contract.completed ? " is-complete" : ""}`}>
          <div>
            <span>EK HEDEF · {summary.contract.completed ? "TAMAMLANDI" : "TAMAMLANMADI"}</span>
            <strong>{summary.contract.title}</strong>
            <small>{summary.contract.description} · {summary.contract.progress}/{summary.contract.target}</small>
          </div>
          <b>{summary.contract.completed ? `+${summary.contract.bonusGold}` : "—"} ◈</b>
        </section>
        <section className="war-room-leaderboard" aria-label="Maç liderlik tablosu">
          <header>
            <span>MAÇ LİDERLİK TABLOSU</span>
            <small>{summary.leaderboard.length} karakter</small>
          </header>
          <ol>
            {summary.leaderboard.map((entry) => (
              <li
                key={entry.id}
                className={entry.id === "player" ? "is-player" : undefined}
                aria-current={entry.id === "player" ? "true" : undefined}
              >
                <span className="war-room-leaderboard__rank">{entry.rank}</span>
                <span className="war-room-leaderboard__identity">
                  <strong>
                    <span>{entry.name}</span>
                    {entry.id === "player" && <em>SEN</em>}
                  </strong>
                  <small>{entry.role} · {entry.status}</small>
                </span>
                <b>{entry.score.toLocaleString("tr-TR")}</b>
              </li>
            ))}
          </ol>
        </section>
        {victory && summary.nextRoom && (
          <div className="war-room-next-room" aria-label="Sonraki oda önizlemesi">
            <span>SONRAKİ ODA · {summary.nextRoom.number} / ∞</span>
            <strong>{summary.nextRoom.name}</strong>
            <small>
              {summary.nextRoom.layoutName} · {summary.nextRoom.enemyCount} düşman · {summary.nextRoom.commanderName}
            </small>
            <i
              className="war-room-next-room__swatch"
              style={{
                background: `linear-gradient(135deg, ${summary.nextRoom.theme.sky}, ${summary.nextRoom.theme.floorTint})`,
              }}
              aria-hidden="true"
            />
          </div>
        )}
        {victory && (
          <div className="war-room-gold-reward">
            <span>BU MODUN ALTIN ÖDÜLÜ</span><b>+{summary.gold} ◈</b>
            {summary.totalGold !== null && <small>Savaş Odası toplamı: {summary.totalGold} altın</small>}
            <small>Savaş Odası bakiyesi; kampanya altınına aktarılmaz.</small>
            {WAR_ROOM_ROOM_CHAIN_ENABLED && (
              <small>
                Oda ödülleri toplamı: {roomProgress.totalRoomRewards} altın · En yüksek oda: {roomProgress.highestRoom}
              </small>
            )}
          </div>
        )}
        <section className={`war-room-profile-reward is-${summary.profileRewardState}`} aria-live="polite">
          <strong>PROFİL ÖDÜLÜ</strong>
          {summary.profileRewardState === "pending" ? (
            <span>Profiline ekleniyor…</span>
          ) : summary.profileRewardState === "failed" ? (
            <span>Kaydedilemedi; XP ve Mühür Parçası hesabına eklenmedi.</span>
          ) : (
            <span>+{summary.xp} XP{summary.sealFragments > 0 ? ` · +${summary.sealFragments} Mühür Parçası` : ""}</span>
          )}
        </section>
        <div className="war-room-result__actions">
          {victory && summary.nextRoom && (
            <button type="button" className="war-room-start" onClick={onNextRoom}>SONRAKİ ODA</button>
          )}
          <button
            type="button"
            className={victory ? "" : "war-room-start"}
            onClick={onRetryRoom}
          >
            {victory ? "YENİDEN DENE" : "BU ODAYI TEKRAR DENE"}
          </button>
          {!victory && <button type="button" onClick={onRestart}>BAŞTAN</button>}
          <button type="button" onClick={onExit}>ÇIKIŞ</button>
        </div>
      </div>
    </section>
  );
}
