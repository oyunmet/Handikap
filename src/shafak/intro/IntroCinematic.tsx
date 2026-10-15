import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import * as THREE from "three";
import KnightActor from "../world/KnightActor";
import WorldLandscape from "../world/WorldLandscape";
import { createWorldMotion } from "../world/movement";
import { createIntroImpact, primeGameAudio } from "../audio/howler";
import { getIntroEventTimes } from "./timeline";
import "./intro.css";

const STORY_LINES = [
  "Gökyüzü küle döndü.",
  "Krallığın son kapısı yüzyıllardır kapalı.",
  "Yolları gölgeler tutuyor. Kimse geçmeyecek.",
  "Sen bir Yolcu’sun. Elinde bir kılıç, sırtında kızıl bir pelerin.",
  "Kül Yolu seni çağırıyor.",
];

type IntroCinematicProps = {
  reducedMotion: boolean;
  onComplete: () => void;
};

function smoothstep(value: number) {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function CameraDrift({ reducedMotion, startedAt }: { reducedMotion: boolean; startedAt: number }) {
  const { camera } = useThree();
  const startPosition = useMemo(() => new THREE.Vector3(13, 13, 31), []);
  const endPosition = useMemo(() => new THREE.Vector3(0, 4.15, 8.5), []);
  const startTarget = useMemo(() => new THREE.Vector3(0, 1, -84), []);
  const endTarget = useMemo(() => new THREE.Vector3(0, 1.1, -34), []);
  const position = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const elapsed = (performance.now() - startedAt) / 1_000;
    const progress = reducedMotion ? 1 : smoothstep((elapsed - 6.1) / 5.5);
    position.lerpVectors(startPosition, endPosition, progress);
    target.lerpVectors(startTarget, endTarget, progress);
    camera.position.copy(position);
    camera.lookAt(target);
  });

  return null;
}

function IntroWorld({ reducedMotion, startedAt }: { reducedMotion: boolean; startedAt: number }) {
  const motionRef = useRef(createWorldMotion());
  return (
    <Canvas
      className="intro-world__canvas"
      dpr={[1, 1.2]}
      camera={{ position: [13, 13, 31], fov: 54, near: 0.1, far: 850 }}
      gl={{
        alpha: false,
        antialias: false,
        powerPreference: "low-power",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.08,
      }}
      fallback={<div className="intro-world__fallback" aria-hidden="true" />}
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
      />
    </Canvas>
  );
}

export default function IntroCinematic({ reducedMotion, onComplete }: IntroCinematicProps) {
  const [creditLetter, setCreditLetter] = useState(false);
  const [showProduction, setShowProduction] = useState(false);
  const [showByline, setShowByline] = useState(false);
  const [shimmer, setShimmer] = useState(false);
  const [creditsFading, setCreditsFading] = useState(false);
  const [worldRevealed, setWorldRevealed] = useState(false);
  const [activeLine, setActiveLine] = useState<number | null>(null);
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

    schedule(times.letter, () => setCreditLetter(true));
    schedule(times.production, () => setShowProduction(true));
    schedule(times.byline, () => setShowByline(true));
    schedule(times.shimmer, () => setShimmer(true));
    schedule(times.impact, () => {
      audioStopRef.current?.();
      audioStopRef.current = createIntroImpact();
    });
    schedule(times.creditsFade, () => setCreditsFading(true));
    schedule(times.worldReveal, () => setWorldRevealed(true));
    schedule(times.lineOne, () => setActiveLine(0));
    schedule(times.lineTwo, () => setActiveLine(1));
    schedule(times.lineThree, () => setActiveLine(2));
    schedule(times.lineFour, () => setActiveLine(3));
    schedule(times.lineFive, () => setActiveLine(4));
    schedule(times.title, () => {
      setActiveLine(null);
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
    audioStopRef.current?.();
    audioStopRef.current = null;
    onCompleteRef.current();
  };

  const embers = useMemo(
    () => Array.from({ length: 36 }, (_, index) => {
      const x = (index * 47 + 13) % 100;
      const y = (index * 71 + 21) % 100;
      const delay = (index % 11) * -0.63;
      const duration = 5.2 + (index % 7) * 0.7;
      const style = {
        "--ember-x": `${x}%`,
        "--ember-y": `${y}%`,
        "--ember-delay": `${delay}s`,
        "--ember-duration": `${duration}s`,
        "--ember-size": `${index % 5 === 0 ? 3 : 2}px`,
      } as CSSProperties;
      return <i className="intro-ember" key={index} style={style} aria-hidden="true" />;
    }),
    [],
  );

  return (
    <section
      className={`intro-cinematic${reducedMotion ? " intro-cinematic--reduced" : ""}`}
      aria-label="Kül Yolu açılış sinematiği"
    >
      <div className={`intro-world${worldRevealed ? " is-revealed" : ""}`} aria-hidden="true">
        <IntroWorld reducedMotion={reducedMotion} startedAt={startedAt} />
      </div>
      <div className={`intro-atmosphere${worldRevealed ? " is-revealed" : ""}`} aria-hidden="true">
        <div className="intro-atmosphere__moon-haze" />
        <div className="intro-atmosphere__vignette" />
        {!reducedMotion && <div className="intro-embers">{embers}</div>}
      </div>

      <div className={`intro-credits${creditsFading ? " is-fading" : ""}`} aria-hidden="true">
        <span className={`intro-credits__letter${creditLetter ? " is-visible" : ""}`}>A</span>
        <p className={`intro-credits__production${showProduction ? " is-visible" : ""} ${shimmer ? "is-shimmering" : ""}`}>
          MET PRODUCTION
        </p>
        <p className={`intro-credits__byline${showByline ? " is-visible" : ""}`}>
          A GAME BY MUHAMMED EMİN TÜRKOĞLU
        </p>
      </div>

      <button
        className="intro-skip"
        type="button"
        onClick={complete}
        aria-label="Sinematiği geç ve oyuna devam et"
      >
        Geç <span aria-hidden="true">↗</span>
      </button>

      <div className="intro-narrative" aria-live="polite" aria-atomic="true">
        {activeLine !== null && (
          <p key={activeLine} className="intro-narrative__line">
            {STORY_LINES[activeLine]}
          </p>
        )}
        {showTitle && <h1 className="intro-narrative__title">KÜL YOLU</h1>}
        {showPrompt && (
          <button className="intro-start" type="button" onClick={complete}>
            Başlamak için dokun <span aria-hidden="true">↓</span>
          </button>
        )}
      </div>
    </section>
  );
}
