import "./_group.css";
import GameButton from "./_shared/GameButton";

export function Current() {
  return (
    <main
      className="world-control-preview world-control-preview--current"
      aria-label="Mevcut mobil hareket kontrolleri"
    >
      <header className="world-control-preview__header">
        <span className="world-control-preview__brand">
          <small>SUNVORIA · YAŞAYAN MERKEZ</small>
          <b>Kül Yolu</b>
        </span>
        <span className="world-control-preview__stats">BÖLÜM 7 · 3 / 5</span>
      </header>
      <div className="world-control-preview__chapter">
        <span>SON HAT · BÖLÜM 7</span>
        <i aria-hidden="true" />
        <span>% 97</span>
      </div>
      <p className="world-control-preview__hint">
        <strong>Yola devam et</strong>
        Sol joystick ile ilerle, sağdaki tuşlarla koş, zıpla veya eğil.
      </p>
      <div className="world-control-preview__joystick" aria-hidden="true">
        <span className="world-control-preview__nub" />
      </div>
      <div className="world-control-preview__actions" role="group" aria-label="Hareket kontrolleri">
        <GameButton
          className="world-movement-action is-sprint"
          label="KOŞ"
          icon="run"
          tone="gold"
          faceSize={72}
          hitAreaSize={88}
          hint="SHIFT"
          aria-label="Koş"
        />
        <GameButton
          className="world-movement-action is-jump"
          label="ZIPLA"
          icon="jump"
          tone="copper"
          faceSize={76}
          hitAreaSize={88}
          hint="SPACE"
          aria-label="Zıpla"
        />
        <GameButton
          className="world-movement-action is-crouch"
          label="EĞİL"
          icon="crouch"
          tone="ash"
          faceSize={68}
          hitAreaSize={88}
          hint="C"
          aria-label="Eğil"
        />
      </div>
      <footer className="world-control-preview__footer">
        <span>ANA MENÜ</span>
        <small>SAHNE · DİNLENİYOR</small>
        <span>ENVANTER</span>
        <span>AYARLAR</span>
      </footer>
    </main>
  );
}
