import "./_group.css";
import "./compact.css";
import GameButton from "./_shared/GameButton";

export function Compact() {
  return (
    <main
      className="world-control-preview world-control-preview--compact"
      aria-label="Kül Yolu kompakt mobil kontroller"
    >
      <div className="compact-world" aria-hidden="true">
        <span className="compact-world__moon" />
        <span className="compact-world__ridge compact-world__ridge--far" />
        <span className="compact-world__ridge compact-world__ridge--near" />
        <span className="compact-world__spire" />
        <span className="compact-world__mist" />
      </div>

      <header className="compact-hud">
        <span className="compact-hud__brand">
          <small>KUZEY GEÇİDİ · SON IŞIK</small>
          <b>KÜL YOLU</b>
        </span>
        <span className="compact-hud__chapter">BÖLÜM 07 <i /> 3 / 5</span>
      </header>

      <div className="compact-progress" aria-label="Bölüm ilerlemesi yüzde 68">
        <span>GEÇİTTE</span>
        <div><i /></div>
        <span>68%</span>
      </div>

      <section className="compact-scene-note" aria-label="Konum bilgisi">
        <span className="compact-scene-note__eyebrow">TAŞKIRAN SIRTI</span>
        <h1>Külün ötesinde.</h1>
        <p>Rüzgâr kesildi. İzini kaybettirme.</p>
      </section>

      <div className="compact-controls" aria-label="Hareket kontrolleri">
        <div className="compact-joystick" aria-hidden="true">
          <span className="compact-joystick__ring" />
          <span className="compact-joystick__nub" />
          <span className="compact-joystick__label">YÖN</span>
        </div>

        <div className="compact-actions" role="group" aria-label="Hareket eylemleri">
          <GameButton
            className="compact-action compact-action--run"
            label="KOŞ"
            icon="run"
            tone="gold"
            faceSize={44}
            hitAreaSize={62}
            hint="SHIFT"
            aria-label="Koş"
          />
          <GameButton
            className="compact-action compact-action--jump"
            label="ZIPLA"
            icon="jump"
            tone="copper"
            faceSize={46}
            hitAreaSize={62}
            hint="SPACE"
            aria-label="Zıpla"
          />
          <GameButton
            className="compact-action compact-action--crouch"
            label="EĞİL"
            icon="crouch"
            tone="ash"
            faceSize={42}
            hitAreaSize={62}
            hint="C"
            aria-label="Eğil"
          />
        </div>
      </div>

      <footer className="compact-footer">
        <span>ANA MENÜ</span>
        <small>SAHNE · YOLDA</small>
        <span>ENVANTER</span>
        <span>AYARLAR</span>
      </footer>
    </main>
  );
}
