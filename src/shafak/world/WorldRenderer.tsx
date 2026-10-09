import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type { WorldMotion } from "./movement";
import WorldLighting from "./WorldLighting";
import WorldScenery from "./WorldScenery";

type RenderRef = MutableRefObject<((now: number) => void) | null>;
type Props = {
  motionRef: MutableRefObject<WorldMotion>;
  renderRef: RenderRef;
  quality: "high" | "balanced" | "low";
  motionReduced: boolean;
  level: number;
  relicCount: number;
};

export default function WorldRenderer(props: Props) {
  const { motionRef, renderRef, quality, motionReduced, level, relicCount } = props;
  const [offscreenSupported, setOffscreenSupported] = useState(false);
  const sceneryCanvasRef = useRef<HTMLCanvasElement>(null);
  const lightingCanvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackSceneryRef = useRef<((now: number) => void) | null>(null);
  const fallbackLightingRef = useRef<((now: number) => void) | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const resizeWorkerRef = useRef<(() => void) | null>(null);
  const stateRef = useRef({ motionRef, quality, motionReduced, level, relicCount });
  stateRef.current = { motionRef, quality, motionReduced, level, relicCount };

  useEffect(() => {
    setOffscreenSupported(
      typeof Worker !== "undefined"
      && typeof HTMLCanvasElement !== "undefined"
      && "transferControlToOffscreen" in HTMLCanvasElement.prototype,
    );
  }, []);

  useEffect(() => {
    if (!offscreenSupported) {
      const renderFallback = (now: number) => {
        fallbackSceneryRef.current?.(now);
        fallbackLightingRef.current?.(now);
      };
      renderRef.current = renderFallback;
      return () => {
        if (renderRef.current === renderFallback) renderRef.current = null;
      };
    }

    const sceneryCanvas = sceneryCanvasRef.current;
    const lightingCanvas = lightingCanvasRef.current;
    if (!sceneryCanvas || !lightingCanvas) return undefined;

    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL("./world-renderer.worker.ts", import.meta.url), { type: "module" });
      const scenerySurface = sceneryCanvas.transferControlToOffscreen();
      const lightingSurface = lightingCanvas.transferControlToOffscreen();
      worker.postMessage(
        { type: "init", scenery: scenerySurface, lighting: lightingSurface },
        [scenerySurface, lightingSurface],
      );
    } catch {
      worker?.terminate();
      setOffscreenSupported(false);
      return undefined;
    }
    if (!worker) return undefined;

    const activeWorker = worker;
    workerRef.current = activeWorker;
    const sendResize = () => {
      const bounds = sceneryCanvas.getBoundingClientRect();
      const currentQuality = stateRef.current.quality;
      const pixelRatio = Math.min(
        window.devicePixelRatio || 1,
        currentQuality === "high" ? .75 : currentQuality === "balanced" ? .6 : .45,
      );
      activeWorker.postMessage({
        type: "resize",
        width: bounds.width,
        height: bounds.height,
        pixelRatio,
      });
    };
    resizeWorkerRef.current = sendResize;
    const observer = new ResizeObserver(sendResize);
    observer.observe(sceneryCanvas);
    sendResize();

    const renderWorker = (now: number) => {
      const current = stateRef.current;
      const motion = current.motionRef.current;
      activeWorker.postMessage({
        type: "frame",
        now,
        cameraX: motion.cameraX,
        depth: motion.depth,
        velocityX: motion.velocityX,
        velocityY: motion.velocityY,
        level: current.level,
        relicCount: current.relicCount,
        quality: current.quality,
        motionReduced: current.motionReduced,
      });
    };
    renderRef.current = renderWorker;
    const onWorkerError = () => setOffscreenSupported(false);
    activeWorker.addEventListener("error", onWorkerError);

    return () => {
      if (renderRef.current === renderWorker) renderRef.current = null;
      if (resizeWorkerRef.current === sendResize) resizeWorkerRef.current = null;
      workerRef.current = null;
      observer.disconnect();
      activeWorker.removeEventListener("error", onWorkerError);
      activeWorker.terminate();
    };
  }, [offscreenSupported, renderRef]);

  useEffect(() => {
    if (offscreenSupported) resizeWorkerRef.current?.();
  }, [offscreenSupported, quality]);

  if (!offscreenSupported) {
    return (
      <>
        <WorldScenery
          motionRef={motionRef}
          renderRef={fallbackSceneryRef}
          quality={quality}
          motionReduced={motionReduced}
        />
        <WorldLighting
          motionRef={motionRef}
          renderRef={fallbackLightingRef}
          level={level}
          relicCount={relicCount}
          quality={quality}
        />
      </>
    );
  }

  return (
    <>
      <canvas className="world-scenery" ref={sceneryCanvasRef} aria-hidden="true" />
      <canvas className="world-lighting" ref={lightingCanvasRef} aria-hidden="true" />
    </>
  );
}
