import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import { WORLD_METERS_TO_PIXELS, type WorldMotion } from "./movement";
import { calculateWorldLightRadius } from "./world-lighting-model";
import {
  getVisibleWorldChunks,
  WORLD_SEED,
  type WorldObject,
} from "./world-generation";

type WorldLightingProps = {
  motionRef: MutableRefObject<WorldMotion>;
  renderRef: MutableRefObject<((now: number) => void) | null>;
  level: number;
  relicCount: number;
  quality: "high" | "balanced" | "low";
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export default function WorldLighting({
  motionRef,
  renderRef,
  level,
  relicCount,
  quality,
}: WorldLightingProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ level, relicCount, quality });
  stateRef.current = { level, relicCount, quality };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true, desynchronized: true });
    if (!canvas || !context) return undefined;

    let width = 1;
    let height = 1;
    let resolution = 1;
    let lastCameraX = Number.NaN;
    let lastDepth = Number.NaN;
    let lastLevel = Number.NaN;
    let lastRelicCount = Number.NaN;
    const chunkCache = new Map();
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      resolution = Math.min(
        window.devicePixelRatio || 1,
        stateRef.current.quality === "high" ? .65 : stateRef.current.quality === "balanced" ? .5 : .4,
      );
      canvas.width = Math.round(width * resolution);
      canvas.height = Math.round(height * resolution);
      context.setTransform(resolution, 0, 0, resolution, 0, 0);
      lastCameraX = Number.NaN;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    let lastDrawAt = Number.NEGATIVE_INFINITY;
    const render = (now: number) => {
      if (now - lastDrawAt < 1000 / 30) return;
      lastDrawAt = now;
      const current = stateRef.current;
      const motion = motionRef.current;
      const camera = Number.isFinite(motion.cameraX) ? motion.cameraX : 0;
      const lane = clamp(Number.isFinite(motion.depth) ? motion.depth : 0, -1, 1);
      if (
        camera === lastCameraX
        && lane === lastDepth
        && current.level === lastLevel
        && current.relicCount === lastRelicCount
      ) return;
      lastCameraX = camera;
      lastDepth = lane;
      lastLevel = current.level;
      lastRelicCount = current.relicCount;
      const pixelsPerMeter = clamp(width * .095, 30, 48);
      const playerX = width * .35;
      const footY = height * .875 - lane * 46;
      const lightRadius = calculateWorldLightRadius(width, current.level, current.relicCount);
      context.setTransform(resolution, 0, 0, resolution, 0, 0);
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "source-over";
      context.fillStyle = "rgba(3,5,12,.82)";
      context.fillRect(0, 0, width, height);

      context.globalCompositeOperation = "destination-out";
      paintLightMask(context, playerX, footY - height * .09, lightRadius * .62, .93);
      paintLightMask(context, playerX + width * .16, footY - height * .2, lightRadius * .83, .9);

      const visibleChunks = getVisibleWorldChunks(
        camera,
        width,
        WORLD_SEED,
        chunkCache,
      );
      const lightObjects = visibleChunks.flatMap((chunk) => chunk.objects)
        .filter(isLightSource);
      for (const object of lightObjects) {
        const x = playerX + (object.worldX - camera) * pixelsPerMeter * object.parallax;
        if (x < -120 || x > width + 120) continue;
        const y = height * .64 + object.lane * height * .13 - 28;
        paintLightMask(context, x, y, lightRadiusFor(object), object.kind === "torch" ? .68 : .78);
      }

      for (let index = 0; index < 5; index += 1) {
        const x = playerX - 19 - index * 30;
        if (x < -12) break;
        const fade = Math.exp(-index * .24);
        paintLightMask(context, x, footY, 25 + (index % 3) * 4, .2 * fade);
      }

      context.globalCompositeOperation = "source-over";
      paintWarmGlow(context, playerX, footY - height * .09, lightRadius * .55, .16);
      paintWarmGlow(context, playerX + width * .16, footY - height * .2, lightRadius * .68, .12);
      for (const object of lightObjects) {
        const x = playerX + (object.worldX - camera) * pixelsPerMeter * object.parallax;
        if (x < -120 || x > width + 120) continue;
        const y = height * .64 + object.lane * height * .13 - 28;
        paintWarmGlow(context, x, y, lightRadiusFor(object), .14);
      }
    };

    renderRef.current = render;
    render(performance.now());
    return () => {
      if (renderRef.current === render) renderRef.current = null;
      observer.disconnect();
    };
  }, [motionRef, quality, renderRef]);

  return <canvas className="world-lighting" ref={canvasRef} aria-hidden="true" />;
}

function isLightSource(object: WorldObject) {
  return object.kind === "torch" || object.kind === "crystal" || object.kind === "firepit";
}

function lightRadiusFor(object: WorldObject) {
  const sizeMultiplier = object.kind === "crystal" ? 1.16 : object.kind === "firepit" ? 1.08 : 1;
  return (62 + object.scale * 24) * sizeMultiplier;
}

function paintLightMask(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  strength: number,
) {
  const gradient = context.createRadialGradient(x, y, radius * .1, x, y, radius);
  gradient.addColorStop(0, `rgba(0,0,0,${strength})`);
  gradient.addColorStop(.42, `rgba(0,0,0,${strength * .79})`);
  gradient.addColorStop(.76, `rgba(0,0,0,${strength * .3})`);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = gradient;
  context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function paintWarmGlow(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha: number,
) {
  const gradient = context.createRadialGradient(x, y, radius * .08, x, y, radius);
  gradient.addColorStop(0, `rgba(255,167,86,${alpha})`);
  gradient.addColorStop(.4, `rgba(229,113,59,${alpha * .47})`);
  gradient.addColorStop(1, "rgba(164,65,43,0)");
  context.fillStyle = gradient;
  context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}
