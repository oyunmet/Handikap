import { useState } from "react";
import type { PlayerProfile } from "./profile";

type ProfilePanelProps = {
  profile: PlayerProfile;
  userEmail: string | null;
  accountSaveStatus: "loading" | "ready" | "local";
  onClose: () => void;
  onRename: (name: string) => void;
  onAccountAction: () => void;
};

export default function ProfilePanel({ profile, userEmail, accountSaveStatus, onClose, onRename, onAccountAction }: ProfilePanelProps) {
  const [name, setName] = useState(profile.name);
  const neededXp = 100 + profile.level * 45;
  const winRate = profile.battles ? Math.round((profile.wins / profile.battles) * 100) : 0;

  return (
    <div className="profile-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="profile-panel" role="dialog" aria-modal="true" aria-labelledby="profile-title">
        <header className="profile-panel__heading">
          <div>
            <span className="game-eyebrow">{userEmail ? "CLERK HESABI" : "MİSAFİR · BU CİHAZDA"}</span>
            <h2 id="profile-title">Savaşçı profili</h2>
          </div>
          <button className="game-close" type="button" onClick={onClose} aria-label="Profili kapat">×</button>
        </header>
        <div className="profile-account">
          <span className="profile-account__status" aria-hidden="true">{userEmail ? "✓" : "·"}</span>
          <span>
            {userEmail
              ? accountSaveStatus === "ready"
                ? "İlerleme hesabına kaydedilir."
                : accountSaveStatus === "loading"
                  ? "Hesap kaydı yükleniyor…"
                  : "Sunucuya ulaşılamadı; çevrimiçi ödüller güvenli biçimde işlenemez."
              : "Misafir ödülleri yalnızca bu cihazda saklanır; sıralamaya veya çevrimiçi savaşa dahil değildir."}
          </span>
          <button type="button" onClick={onAccountAction}>{userEmail ? "ÇIKIŞ" : "HESAP AÇ / GİRİŞ"}</button>
        </div>
        <div className="profile-identity">
          <span className="profile-identity__crest">Ş</span>
          <label>
            <span>Savaşçı adı</span>
            <input value={name} maxLength={20} onChange={(event) => setName(event.target.value)} onBlur={() => onRename(name)} />
          </label>
          <strong>SEV. {String(profile.level).padStart(2, "0")}</strong>
        </div>
        <div className="profile-xp">
          <div><span>Tecrübe</span><strong>{profile.xp} / {neededXp} XP</strong></div>
          <span className="profile-xp__track"><i style={{ width: `${Math.min(100, profile.xp / neededXp * 100)}%` }} /></span>
        </div>
        <div className="profile-stats">
          <div><strong>{profile.battles}</strong><span>Düello</span></div>
          <div><strong>{profile.wins}</strong><span>Zafer</span></div>
          <div><strong>%{winRate}</strong><span>Kazanma</span></div>
          <div><strong>{profile.bestStreak}</strong><span>En uzun seri</span></div>
        </div>
        <section className="profile-quest">
          <div><span className="game-eyebrow">GÜNLÜK GÖREV</span><b>Yol kesenleri alt et</b></div>
          <span>{Math.min(profile.dailyWins, 3)} / 3</span>
          <div className="profile-quest__track"><i style={{ width: `${Math.min(100, profile.dailyWins / 3 * 100)}%` }} /></div>
          <small>3 zafer kazan · Ödül: 100 altın</small>
        </section>
        <section className="profile-inventory">
          <div className="profile-section-heading"><span className="game-eyebrow">HEYBE</span><b>{profile.items.length} / 12</b></div>
          {profile.items.length ? (
            <div className="profile-items">{profile.items.map((item, index) => <span key={`${item}-${index}`}><i>✦</i>{item}</span>)}</div>
          ) : (
            <p>İlk zaferini kazan ve heybeni doldur.</p>
          )}
        </section>
        <footer className="profile-panel__foot">
          <span>{userEmail ? "Hesap ilerlemesi PostgreSQL’de saklanır." : "Sıralama ve çevrimiçi savaş özellikleri için hesapla giriş yap."}</span>
          <button type="button" onClick={() => { onRename(name); onClose(); }}>Kaydı tamamla</button>
        </footer>
      </section>
    </div>
  );
}
