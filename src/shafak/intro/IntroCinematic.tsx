import { Component, lazy, Suspense, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { RenderQuality } from "../world/graphics-quality";
import EmberLayer from "../scene/EmberLayer";
import { createIntroAmbience, createIntroImpact, primeGameAudio } from "../audio/howler";
import MetEmblem from "./MetEmblem";
import { getIntroEventTimes } from "./timeline";
import { CAMPAIGN_COPY } from "../i18n/campaign-copy.ts";
import { CAMPAIGN_NARRATIVE } from "../world/campaign-narrative.ts";
import "./intro.css";

const STORY_LINES = [
  `${CAMPAIGN_NARRATIVE.cityName}, her sabah aynı çanla uyanıyor; Prenses ${CAMPAIGN_NARRATIVE.princessName} kayıp.`,
  `${CAMPAIGN_NARRATIVE.princessName}, Şafak Mührü'nü dokuz hatıraya böldü. Her perde bu kararın izini taşıyor.`,
  "Şehir kapıları aynı mührün yankılarını sınar; sefer bütün izleri tek hikâyede birleştirir.",
];

const IntroCityWorld = lazy(() => import("./IntroCityWorld"));

type IntroCinematicProps = {
  reducedMotion: boolean;
  quality: RenderQuality;
  onComplete: () => void;
};

class IntroCanvasBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function IntroWorld({
  reducedMotion,
  quality,
}: {
  reducedMotion: boolean;
  quality: RenderQuality;
}) {
  const fallback = <div className="intro-world__fallback" aria-hidden="true" />;
  return (
    <IntroCanvasBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <IntroCityWorld reducedMotion={reducedMotion} quality={quality} />
      </Suspense>
    </IntroCanvasBoundary>
  );
}

export default function IntroCinematic({ reducedMotion, quality, onComplete }: IntroCinematicProps) {
  const [showEmblem, setShowEmblem] = useState(false);
  const [showProduction, setShowProduction] = useState(false);
  const [showByline, setShowByline] = useState(false);
  const [shimmer, setShimmer] = useState(false);
  const [creditsFading, setCreditsFading] = useState(false);
  const [worldRevealed, setWorldRevealed] = useState(false);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [showProductionCard, setShowProductionCard] = useState(false);
  const [productionCardFading, setProductionCardFading] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const audioStopRef = useRef<(() => void) | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const times = getIntroEventTimes(reducedMotion);
    const timers: number[] = [];
    const schedule = (delay: number, action: () => void) => {
      timers.push(window.setTimeout(action, delay));
    };

    schedule(times.letter, () => setShowEmblem(true));
    schedule(times.production, () => setShowProduction(true));
    schedule(times.byline, () => setShowByline(true));
    schedule(times.shimmer, () => setShimmer(true));
    schedule(times.impact, () => {
      audioStopRef.current?.();
      audioStopRef.current = createIntroImpact();
    });
    schedule(times.creditsFade, () => setCreditsFading(true));
    schedule(times.worldReveal, () => {
      setWorldRevealed(true);
      audioStopRef.current?.();
      audioStopRef.current = createIntroAmbience();
    });
    schedule(times.lineOne, () => setActiveLine(0));
    schedule(times.lineTwo, () => setActiveLine(1));
    schedule(times.lineThree, () => setActiveLine(2));
    schedule(times.productionCard, () => setShowProductionCard(true));
    schedule(times.productionCardFade, () => setProductionCardFading(true));
    schedule(times.title, () => {
      setActiveLine(null);
      setShowProductionCard(false);
      setShowTitle(true);
    });
    schedule(times.prompt, () => setShowPrompt(true));

    const unlockAudio = () => primeGameAudio();
    window.addEventListener("pointerdown", unlockAudio, { passive: true });
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("pointerdown", unlockAudio);
      audioStopRef.current?.();
      audioStopRef.current = null;
    };
  }, [reducedMotion]);

  const complete = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    audioStopRef.current?.();
    audioStopRef.current = null;
    onCompleteRef.current();
  };

  return (
    <section
      className={`intro-cinematic${reducedMotion ? " intro-cinematic--reduced" : ""}`}
      aria-label="Şafak Savaşçıları açılış sinematiği"
    >
      <div className={`intro-world${worldRevealed ? " is-revealed" : ""}`} aria-hidden="true">
        <IntroWorld reducedMotion={reducedMotion} quality={quality} />
      </div>
      <div className={`intro-atmosphere${worldRevealed ? " is-revealed" : ""}`} aria-hidden="true">
        <div className="intro-atmosphere__moon-haze" />
        <div className="intro-atmosphere__vignette" />
        <div className="intro-embers">
          <EmberLayer quality={quality} motionReduced={reducedMotion} />
        </div>
      </div>

      <div className={`intro-credits${creditsFading ? " is-fading" : ""}`} aria-hidden="true">
        <div className={`intro-credits__emblem${showEmblem ? " is-visible" : ""}`}>
          <MetEmblem size={76} />
        </div>
        <p className={`intro-credits__production${showProduction ? " is-visible" : ""} ${shimmer ? "is-shimmering" : ""}`}>
          MET PRODUCTION
        </p>
        <p className={`intro-credits__byline${showByline ? " is-visible" : ""}`}>
          A GAME BY MUHAMMED EMİN TÜRKOĞLU
        </p>
      </div>

      {showProductionCard && (
        <div
          className={`intro-production-card${productionCardFading ? " is-fading" : ""}`}
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="intro-production-card__lockup">
            <div className="intro-production-card__seal">
              <span className="intro-production-card__orbit" aria-hidden="true" />
              <MetEmblem size={86} />
            </div>
            <div className="intro-production-card__wordmark">
              <span className="intro-production-card__met">MET</span>
              <span className="intro-production-card__production">Production</span>
            </div>
            <span className="intro-production-card__divider" aria-hidden="true">
              <span />
            </span>
            <p className="intro-production-card__byline">
              Muhammed Emin Türkoğlu yapımıdır.
            </p>
          </div>
        </div>
      )}

      <button
        className="intro-skip"
        type="button"
        onClick={complete}
        aria-label="Sinematiği geç ve oyuna devam et"
      >
        İNTROYU ATLA <span aria-hidden="true">→</span>
      </button>

      <div className="intro-narrative" aria-live="polite" aria-atomic="true">
        {activeLine !== null && (
          <p key={activeLine} className="intro-narrative__line">
            {STORY_LINES[activeLine]}
          </p>
        )}
        {showTitle && (
          <div className="intro-narrative__brand">
            <img
              className="intro-narrative__logo"
              src={`${import.meta.env.BASE_URL}logo.svg`}
              alt=""
              aria-hidden="true"
              width="88"
              height="88"
            />
            <div className="intro-narrative__wordmark">
              <h1 className="intro-narrative__title">
                <span>ŞAFAK</span>
                <span>SAVAŞÇILARI</span>
              </h1>
              <p className="intro-narrative__tagline">{CAMPAIGN_COPY.introTagline}</p>
            </div>
          </div>
        )}
        {showPrompt && (
          <button
            className="intro-start"
            type="button"
            onClick={complete}
            aria-label="Eşik Mahallesi'ne gir"
          >
            MAHALLEYE GİR <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
    </section>
  );
}
