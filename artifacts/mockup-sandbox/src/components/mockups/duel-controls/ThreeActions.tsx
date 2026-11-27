import "./_group.css";
import "./ThreeActions.css";
import { PreviewButton } from "./_PreviewButton";

export function ThreeActions() {
  return (
    <main className="duel-preview world-scene duel-preview--three-actions" data-battle="fight" aria-label="Üç becerili düello kontrolleri">
      <div className="duel-preview__arena" aria-hidden="true" />
      <div className="duel-preview__health" aria-label="Düello can durumu">
        <article>
          <span>YOLCU <b>154 / 154</b></span>
          <i />
        </article>
        <strong className="duel-preview__versus">VS</strong>
        <article>
          <span>BAKIR YEMİN <b>305 / 305</b></span>
          <i />
        </article>
      </div>
      <div className="duel-preview__fighters" aria-hidden="true">
        <i />
        <i />
      </div>
      <div className="duel-controls duel-controls--field" aria-label="Düello kontrolleri">
        <div className="duel-stick" role="img" aria-label="Hareket joystick'i">
          <span aria-hidden="true" />
        </div>
        <div className="duel-control-cluster duel-control-cluster--three-actions" role="group" aria-label="Yıldırım, ateş ve kalkan">
          <PreviewButton label="YILDIRIM" icon="lightning" tone="sky" className="is-skill is-lightning" cooldownPercent={36} />
          <PreviewButton label="ATEŞ" icon="fire" tone="copper" className="is-skill is-fire" />
          <PreviewButton label="KALKAN" icon="shield" tone="teal" className="is-block" />
        </div>
      </div>
    </main>
  );
}
