type PreviewFrameProps = {
  refined?: boolean;
};

export function PreviewFrame({ refined = false }: PreviewFrameProps) {
  return (
    <main className={`shafak-preview${refined ? " is-refined" : " is-current"}`}>
      <div className="shafak-preview__sky" aria-hidden="true" />
      <div className="shafak-preview__ridge" aria-hidden="true" />
      <div className="shafak-preview__road" aria-hidden="true" />

      <header className="world-topbar">
        <button className="world-profile" type="button">
          <span className="world-profile__crest">M</span>
          <span className="world-profile__identity">
            <strong className="world-profile__name">Mert</strong>
            <small className="world-profile__demo">ŞAFAK SAVAŞÇISI</small>
          </span>
          <span className="world-profile__level">
            SEVİYE <b>18</b>
          </span>
        </button>
        <div className="world-resource-hud" aria-label="Kaynaklar">
          <span className="world-currency"><i className="world-currency__coin" /> 2.480</span>
          <span className="world-currency world-currency--diamond"><i className="world-currency__diamond" /> 12</span>
        </div>
      </header>

      <section className="world-progress" role="group" aria-label="Kül Yolu ilerleme haritası">
        <div className="world-progress__body">
          <div className="world-progress__map" role="progressbar" aria-label="Kül Yolu, kapıya yüzde 67 ilerleme" aria-valuemin={0} aria-valuemax={100} aria-valuenow={67}>
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <circle className="world-progress__map-track" cx="24" cy="24" r="19" />
              <circle className="world-progress__map-fill" cx="24" cy="24" r="19" />
              <path className="world-progress__map-route" d="M24 8v8m0 0-7 7m7-7 7 7m-14 0v7m14-7v7m-14 0 7 8 7-8" />
              <circle className="world-progress__map-node" cx="24" cy="16" r="2" />
              <circle className="world-progress__map-node" cx="17" cy="23" r="1.7" />
              <circle className="world-progress__map-node" cx="31" cy="23" r="1.7" />
            </svg>
            <b>67%</b>
          </div>
          <div className="world-progress__details">
            <div className="world-progress__heading"><span>KÜL YOLU · BÖLÜM 5</span></div>
            <div className="world-progress__track"><i style={{ width: "67%" }} /></div>
            <span className="world-progress__distance">KAPI · 164 m</span>
          </div>
        </div>
        <div className="world-daily-lives" id="world-daily-status">
          <span className="world-daily-lives__label">GÜNLÜK DÜELLO HAKKI</span>
          <span className="world-daily-lives__hearts" aria-label="0 / 3 hak kaldı">
            <i className="is-lost">♥</i><i className="is-lost">♥</i><i className="is-lost">♥</i>
          </span>
          <span className="world-daily-lives__count">0 / 3 hak</span>
          <button className="world-daily-ad" type="button" disabled>ÖDÜLLÜ REKLAM · +1 DÜELLO</button>
          <span className="world-daily-lives__message">Reklam sağlayıcısı henüz yapılandırılmadı.</span>
        </div>
      </section>

      <section className="world-gate-prompt" aria-label="Bölüm geçidi">
        <span className="world-gate-prompt__eyebrow">BÖLÜM 5 · GEÇİT</span>
        <strong>Kapı kilitli</strong>
        <span className="world-gate-prompt__progress">Rakipleri yen: 4 / 7</span>
        <button type="button" disabled>KİLİTLİ</button>
      </section>

      <div className="shafak-preview__rival" aria-hidden="true">
        <span className="shafak-preview__rival-helm" />
        <span className="shafak-preview__rival-body" />
        <span className="shafak-preview__rival-blade" />
      </div>

      <div className="world-npc-dialogue-layer">
        <div className="world-npc-dialogue" role="group" aria-label="Mor Hançer ile karşılaşma">
          <span>MOR HANÇER KONUŞUYOR</span>
          <p>“Bu yolu geçmek istiyorsan önce beni yenmelisin.”</p>
          <button className="world-npc-dialogue__fight" type="button">
            <span aria-hidden="true">⚔</span> YAKLAŞ · SAVAŞ
          </button>
        </div>
      </div>

      <div className="world-joystick" aria-hidden="true"><span className="world-joystick__nub" /></div>
      <div className="world-movement-actions" aria-hidden="true">
        <button className="world-movement-action" type="button"><span>↓</span><small>EĞİL</small></button>
        <button className="world-movement-action" type="button"><span>↑</span><small>ZIPLA</small></button>
        <button className="world-movement-action" type="button"><span>»</span><small>KOŞ</small></button>
      </div>
      <footer className="world-controls">
        <div className="world-navigation">
          <button className="world-exit" type="button" aria-label="Çıkış">‹</button>
          <div className="world-status"><span className="world-status__label">DÜNYA</span><strong className="world-status__value">Yürüyor</strong></div>
        </div>
        <div className="world-actions">
          <button className="world-action" type="button"><span>◇</span><small>ÇANTA</small></button>
          <button className="world-action" type="button"><span>⚙</span><small>AYARLAR</small></button>
        </div>
      </footer>
    </main>
  );
}
