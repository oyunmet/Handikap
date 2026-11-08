import type { WarRoomRoom, WarRoomSavedProgress } from "./war-room-rooms";
import type { WarRoomLeaderboardEntry } from "./war-room-leaderboard";
import { WAR_ROOM_ROOM_CHAIN_ENABLED } from "./war-room-features";

export type WarRoomResultSummary = {
  kills: number;
  headshots: number;
  accuracy: number;
  seconds: number;
  gold: number;
  totalGold: number | null;
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

  return (
    <section className={`war-room-result${victory ? "" : " is-defeat"}`} role="dialog" aria-modal="true">
      <div className="war-room-result__card">
        <span className="war-room-eyebrow">
          {summary.roomName.toLocaleUpperCase("tr-TR")} · ODA {summary.roomNumber} · GÖREV RAPORU
        </span>
        <h1>{victory ? "ZAFER" : "YENİLGİ"}</h1>
        <p>{victory
          ? `Görev tamamlandı; ${summary.commanderTitle} ve kuvvetleri yenildi.`
          : `${summary.roomName} düşmedi. Bu odadan yeniden başlayabilir veya zinciri baştan alabilirsin.`}</p>
        {summary.dailyChallenge && (
          <section className={`war-room-daily-result${summary.dailyChallengeCompleted ? " is-complete" : ""}`}>
            <strong>{summary.dailyChallengeCompleted ? "GÜNLÜK SINAV TAMAMLANDI" : "GÜNLÜK SINAV DEVAM EDİYOR"}</strong>
            <p>{summary.dailyChallengeCompleted
              ? "Bugünün ortak sınavı tamamlandı. İstersen aynı sınavı yeniden oynayabilirsin."
              : "Bugünün ek hedefini tamamlayıp sınavı bitirmek için aynı görevi tekrar deneyebilirsin."}</p>
          </section>
        )}
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
            {WAR_ROOM_ROOM_CHAIN_ENABLED && (
              <small>
                Oda ödülleri toplamı: {roomProgress.totalRoomRewards} altın · En yüksek oda: {roomProgress.highestRoom}
              </small>
            )}
          </div>
        )}
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
