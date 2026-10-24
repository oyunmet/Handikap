import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import * as THREE from "three";
import KnightActor from "../world/KnightActor";
import WorldLandscape from "../world/WorldLandscape";
import type { RenderQuality } from "../world/graphics-quality";
import EmberLayer from "../scene/EmberLayer";
import { createWorldMotion } from "../world/movement";
import { createIntroAmbience, createIntroImpact, primeGameAudio } from "../audio/howler";
import MetEmblem from "./MetEmblem";
import { getIntroEventTimes } from "./timeline";
import "./intro.css";

const STORY_LINES = [
  "Kül ülkesinde şafak yıllardır doğmadı. Son ışık, kuzey kapısının ardında kaldı.",
  "Kapıyı koruyanları yen; her zafer seni karanlığın kaynağına biraz daha yaklaştırsın.",
  "Yol iki geçide ayrılıyor. Seçimin, önündeki sınavın zorluğunu belirleyecek.",
];

type IntroCinematicProps = {
  reducedMotion: boolean;
  quality: RenderQuality;
  onComplete: () => void;
};

function smoothstep(value: number) {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

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

function CameraDrift({ reducedMotion, startedAt }: { reducedMotion: boolean; startedAt: number }) {
  const { camera } = useThree();
  const startPosition = useMemo(() => new THREE.Vector3(13, 13, 31), []);
  const endPosition = useMemo(() => new THREE.Vector3(0.55, 2.8, 6.8), []);
  const startTarget = useMemo(() => new THREE.Vector3(0, 1, -84), []);
  const endTarget = useMemo(() => new THREE.Vector3(0, 1.45, 0), []);
  const position = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const elapsed = (performance.now() - startedAt) / 1_000;
    const progress = reducedMotion ? 1 : smoothstep((elapsed - 1.4) / 7.8);
    position.lerpVectors(startPosition, endPosition, progress);
    target.lerpVectors(startTarget, endTarget, progress);
    camera.position.copy(position);
    camera.lookAt(target);
  });

  return null;
}

function IntroWorld({
  reducedMotion,
  startedAt,
  quality,
}: {
  reducedMotion: boolean;
  startedAt: number;
  quality: RenderQuality;
}) {
  const motionRef = useRef(createWorldMotion());
  const fallback = <div className="intro-world__fallback" aria-hidden="true" />;
  return (
    <IntroCanvasBoundary fallback={fallback}>
      <Canvas
        className="intro-world__canvas"
        dpr={quality === "high" ? [1, 1.25] : quality === "balanced" ? [1, 1.1] : 1}
        camera={{ position: [13, 13, 31], fov: 54, near: 0.1, far: 850 }}
        gl={{
          alpha: false,
          antialias: false,
          powerPreference: "low-power",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.08,
        }}
        fallback={fallback}
        aria-hidden="true"
      >
        <CameraDrift reducedMotion={reducedMotion} startedAt={startedAt} />
        <WorldLandscape
          motionRef={motionRef}
          quality="low"
          weather="fog"
          motionReduced={reducedMotion}
        />
        <KnightActor
          motionRef={motionRef}
          state="idle"
          motionReduced={reducedMotion}
          castShadow={false}
          playerCharacter
          useInGamePlayerModel
        />
      </Canvas>
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
  const startedAt = useRef(performance.now()).current;
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
        <IntroWorld reducedMotion={reducedMotion} startedAt={startedAt} quality={quality} />
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
              <p className="intro-narrative__tagline">Karanlığı aş. Geçitleri aç. Şafağı geri getir.</p>
            </div>
          </div>
        )}
        {showPrompt && (
          <button className="intro-start" type="button" onClick={complete}>
            Başlamak için dokun <span aria-hidden="true">↓</span>
          </button>
        )}
      </div>
    </section>
  );
}
