import "./SunvoriaHome.css";

export type SunvoriaHomeProps = {
  playerName: string;
  level: number;
  gold: number;
  diamonds: number;
  campaignProgressPercent: number;
  campaignActName: string;
  onEnterCityHub: () => void;
  onContinue: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
};

const numberFormat = new Intl.NumberFormat("tr-TR");

export default function SunvoriaHome({
  playerName,
  level,
  gold,
  diamonds,
  campaignProgressPercent,
  campaignActName,
  onEnterCityHub,
  onContinue,
  onOpenProfile,
  onOpenSettings,
}: SunvoriaHomeProps) {
  const progress = Number.isFinite(campaignProgressPercent)
    ? Math.min(100, Math.max(0, campaignProgressPercent))
    : 0;

  return (
    <main className="sunvoria-home" aria-label="Sunvoria ana ekranı">
      <div className="sunvoria-landscape" aria-hidden="true">
        <div className="sunvoria-sky-glow" />
        <div className="sunvoria-sun"><span /></div>
        <div className="sunvoria-cloud sunvoria-cloud--one"><i /><i /><i /></div>
        <div className="sunvoria-cloud sunvoria-cloud--two"><i /><i /><i /></div>
        <div className="sunvoria-cloud sunvoria-cloud--three"><i /><i /><i /></div>
        <svg className="sunvoria-world-art" viewBox="0 0 1600 680" preserveAspectRatio="xMidYMax slice">
          <defs>
            <linearGradient id="sv-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8bd0cc" /><stop offset="1" stopColor="#4eaaa5" /></linearGradient>
            <linearGradient id="sv-hill" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stopColor="#bad77d" /><stop offset="1" stopColor="#739b61" /></linearGradient>
            <linearGradient id="sv-front" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d8c47d" /><stop offset="1" stopColor="#9caa65" /></linearGradient>
            <linearGradient id="sv-roof" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e78363" /><stop offset="1" stopColor="#b8584c" /></linearGradient>
          </defs>
          <path fill="#a8c8bd" d="M0 332 140 248l91 47 144-168 109 112 126-68 143 107 105-137 132 99 120-147 91 103 106-38 193 128v287H0Z" />
          <path fill="#c4d3b6" d="m0 383 158-101 111 58 133-111 105 77 117-64 128 89 113-111 127 87 123-111 104 80 116-55 165 113v255H0Z" />
          <path fill="url(#sv-sea)" d="M0 390c167-34 296 25 448-1 170-29 282-63 435-42 197 28 354-10 717 18v315H0Z" />
          <path fill="#d5dfbb" opacity=".68" d="M0 422c234-35 402 30 590-5 207-38 374-17 555 4 143 16 289-7 455-25v64c-165 26-315 36-469 14-181-25-333-19-514 13-216 38-400-24-617 7Z" />
          <path fill="url(#sv-hill)" d="M0 462c122-30 218-89 356-82 93 4 142 51 221 46 110-6 197-94 318-87 112 6 153 79 253 71 85-7 143-72 244-57 76 11 121 58 208 49v278H0Z" />
          <path fill="#66865a" d="M0 534c146-45 267-67 395-43 90 17 151 45 242 34 95-12 169-63 269-52 123 15 182 74 300 57 83-12 130-48 211-46 74 2 121 33 183 31v204H0Z" opacity=".62" />
          <path fill="url(#sv-front)" d="M0 581c174-48 314-15 447-48 138-34 230-93 365-65 119 24 171 91 294 81 155-12 299-69 494-25v156H0Z" />
          <path d="M455 680c57-66 123-105 203-127 89-25 170-17 227-67 45-39 61-74 132-92" fill="none" stroke="#f3e5b3" strokeWidth="13" opacity=".9" />
          <path d="M451 680c64-60 133-93 211-114 82-21 165-17 226-65 42-33 64-72 128-95" fill="none" stroke="#bdad71" strokeWidth="2" opacity=".6" />
          <g className="sunvoria-village">
            <path fill="#ead8ae" d="m701 462 45-44 56 2 33 35 2 59-137 11Z" />
            <path fill="url(#sv-roof)" d="m689 463 58-57 68 4 39 43-15 7-35-33-53-3-49 47Z" />
            <path fill="#f2e1bd" d="m797 437 50-47 66 1 36 44v56l-152 12Z" />
            <path fill="#cf6d56" d="m786 438 62-59 77 2 42 49-14 8-37-39-63-2-54 53Z" />
            <path fill="#e8d2aa" d="m880 468 38-38 51 1 26 34v46l-116 7Z" />
            <path fill="#d77a59" d="m870 468 48-49 59 2 31 37-12 7-29-30-47-2-42 44Z" />
            <path fill="#f3e6c7" d="m991 459 44-40 53 2 32 39v57l-128-2Z" />
            <path fill="#bc6552" d="m980 461 55-51 64 3 38 45-13 8-34-36-52-2-47 43Z" />
            <path fill="#f4e7c9" d="m1088 467 40-42 53 1 31 42v47l-124 2Z" />
            <path fill="#ce7658" d="m1078 468 51-53 63 2 36 47-13 8-32-38-53-2-42 45Z" />
            <g fill="#668b7b"><path d="M743 492h13v24h-13zM814 476h13v26h-13zM867 475h12v25h-12zM928 484h13v25h-13zM1017 480h14v24h-14zM1111 486h13v24h-13z" /></g>
            <g fill="#e8b05e"><path d="M754 474h9v13h-9zM833 457h10v15h-10zM897 469h9v13h-9zM1044 470h10v14h-10zM1143 474h9v13h-9z" /></g>
            <path fill="#e9d6af" d="M785 468h9v56h-9zM965 462h9v66h-9zM1068 467h8v57h-8z" />
          </g>
          <g fill="#476d54">
            <path d="M128 584c-30-34-28-83 0-119 27 36 30 85 0 119Zm0 29v-71" />
            <path d="M1474 542c-34-37-33-89 0-128 32 39 34 91 0 128Zm0 30v-77" />
            <path d="M1360 561c-26-29-25-68 0-97 24 29 25 68 0 97Zm0 24v-59" />
            <path d="M315 575c-24-27-23-63 0-90 22 27 23 63 0 90Zm0 22v-54" />
          </g>
          <g fill="#fff5d8" opacity=".8"><path d="M300 449h78v3h-78zm72 15h48v2h-48zm-194-15h72v3h-72z" /></g>
        </svg>
        <div className="sunvoria-foreground-haze" />
      </div>
      <div className="sunvoria-atmosphere" aria-hidden="true" />

      <header className="sunvoria-topbar">
        <div className="sunvoria-brand" aria-label="Sunvoria">
          <span className="sunvoria-brand__mark">
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <circle cx="24" cy="24" r="9.5" />
              <path d="M24 2.5v7M24 38.5v7M2.5 24h7m29 0h7M8.8 8.8l5 5m20.4 20.4 5 5m0-30.4-5 5M13.8 34.2l-5 5" />
              <path d="M15.5 24a8.5 8.5 0 0 1 8.5-8.5" className="sunvoria-mark__shine" />
            </svg>
          </span>
          <span className="sunvoria-brand__word">
            <strong>SUNVORIA</strong>
             <small>GÜNEŞLİ MACERA</small>
          </span>
        </div>

        <div className="sunvoria-topbar__right">
          <div className="sunvoria-wallet" aria-label="Kaynaklar">
            <span className="sunvoria-wallet__item" aria-label={`${numberFormat.format(gold)} altın`}>
              <i className="sunvoria-coin sunvoria-coin--gold" aria-hidden="true">A</i>
              <b>{numberFormat.format(gold)}</b>
            </span>
            <span className="sunvoria-wallet__divider" aria-hidden="true" />
            <span className="sunvoria-wallet__item" aria-label={`${numberFormat.format(diamonds)} elmas`}>
              <i className="sunvoria-coin sunvoria-coin--gem" aria-hidden="true">◇</i>
              <b>{numberFormat.format(diamonds)}</b>
            </span>
          </div>

          <button className="sunvoria-player" type="button" onClick={onOpenProfile} aria-label={`Oyuncu profili: ${playerName}, seviye ${level}`}>
            <span className="sunvoria-player__portrait" aria-hidden="true">{playerName.trim().charAt(0).toLocaleUpperCase("tr-TR")}</span>
            <span className="sunvoria-player__copy">
              <strong>{playerName}</strong>
              <small><span>SEVİYE</span> {level}</small>
            </span>
            <span className="sunvoria-player__level" aria-hidden="true">{level}</span>
          </button>

          <button className="sunvoria-icon-button" type="button" onClick={onOpenSettings} aria-label="Ayarları aç">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 8.1a3.9 3.9 0 1 0 0 7.8 3.9 3.9 0 0 0 0-7.8Z" />
              <path d="m19.2 13.7 1.1.9-1.7 3-1.4-.5a7.8 7.8 0 0 1-1.8 1l-.3 1.5h-3.5l-.3-1.5a7.8 7.8 0 0 1-1.8-1l-1.4.5-1.7-3 1.1-.9a7.1 7.1 0 0 1 0-2.1l-1.1-.9 1.7-3 1.4.5a7.8 7.8 0 0 1 1.8-1l.3-1.5h3.5l.3 1.5a7.8 7.8 0 0 1 1.8 1l1.4-.5 1.7 3-1.1.9a7.1 7.1 0 0 1 0 2.1Z" />
            </svg>
          </button>
        </div>
      </header>

      <section className="sunvoria-hero" aria-labelledby="sunvoria-title">
        <div className="sunvoria-hero__copy">
          <div className="sunvoria-overline"><span /> AÇIK UFUK</div>
          <h1 id="sunvoria-title">Ufuk seni<br /><em>çağırıyor.</em></h1>
          <p>Güneşli kıyılar ve keşfedilecek yeni yollar seni bekliyor.</p>
          <div className="sunvoria-welcome">
            <span className="sunvoria-welcome__dot" />
            <span>Hoş geldin, <strong>{playerName}</strong></span>
          </div>
        </div>

        <div className="sunvoria-location" aria-label="Sunvoria sahil kasabası">
          <span className="sunvoria-location__pin" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M19 10.2c0 5.1-7 11-7 11s-7-5.9-7-11a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.2" /></svg>
          </span>
          <span><small>KEŞFEDİLMEYE HAZIR</small><strong>Sunvoria Sahili</strong></span>
          <span className="sunvoria-location__line" />
        </div>
      </section>

      <footer className="sunvoria-dock">
        <div className="sunvoria-campaign">
          <div className="sunvoria-campaign__top">
            <span className="sunvoria-campaign__seal" aria-hidden="true">S</span>
            <div className="sunvoria-campaign__title">
              <small>HİKÂYENE DEVAM ET</small>
              <h2>{campaignActName}</h2>
            </div>
            <strong className="sunvoria-campaign__percent">{Math.round(progress)}<small>%</small></strong>
          </div>
          <div
            className="sunvoria-progress"
            role="progressbar"
            aria-label="Kampanya ilerlemesi"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="sunvoria-campaign__meta">
            <span>Yolculuğun sürüyor</span>
            <span>{Math.round(progress)}% tamamlandı</span>
          </div>
        </div>

        <div className="sunvoria-actions">
          <button className="sunvoria-button sunvoria-button--primary" type="button" onClick={onEnterCityHub}>
            <span>Şehir merkezine git</span>
            <span className="sunvoria-button__arrow">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12h14m-6-6 6 6-6 6" /></svg>
            </span>
          </button>
          <button className="sunvoria-button sunvoria-button--secondary" type="button" onClick={onContinue}>
            <span className="sunvoria-button__play" aria-hidden="true"><i /></span>
            <span>Seferine devam et</span>
          </button>
          <button className="sunvoria-profile-link" type="button" onClick={onOpenProfile}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="8" r="3.25" />
              <path d="M5.2 20c.5-3.4 3-5.4 6.8-5.4s6.3 2 6.8 5.4" />
            </svg>
            <span>Profilim</span>
          </button>
        </div>
      </footer>
      <div className="sunvoria-corner-note" aria-hidden="true">
        <span>01</span><i /> HER YOL BİR HİKÂYEYLE BAŞLAR
      </div>
    </main>
  );
}
