import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import {
  WORLD_CHUNK_LENGTH_METERS,
  WORLD_METERS_TO_PIXELS,
  type WorldMotion,
} from "./movement";
import {
  getVisibleWorldChunks,
  nextGateDistance,
  WORLD_SEED,
  type WorldObject,
} from "./world-generation";

type WorldSceneryProps = {
  motionRef: MutableRefObject<WorldMotion>;
  renderRef: MutableRefObject<((now: number) => void) | null>;
  quality: "high" | "balanced" | "low";
  motionReduced: boolean;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export default function WorldScenery({ motionRef, renderRef, quality, motionReduced }: WorldSceneryProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ quality, motionReduced });
  stateRef.current = { quality, motionReduced };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true, desynchronized: true });
    if (!canvas || !context) return undefined;

    let width = 1;
    let height = 1;
    let resolution = 1;
    let lastCameraX = Number.NaN;
    let lastDepth = Number.NaN;
    const chunkCache = new Map();
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      resolution = Math.min(
        window.devicePixelRatio || 1,
        stateRef.current.quality === "high" ? .8 : stateRef.current.quality === "balanced" ? .65 : .5,
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
      const cameraX = Number.isFinite(motion.cameraX) ? motion.cameraX : 0;
      const depth = Number.isFinite(motion.depth) ? motion.depth : 0;
      if (cameraX === lastCameraX && depth === lastDepth) return;
      lastCameraX = cameraX;
      lastDepth = depth;
      context.setTransform(resolution, 0, 0, resolution, 0, 0);
      context.clearRect(0, 0, width, height);

      const pixelsPerMeter = clamp(width * .095, 30, 48);
      const anchorX = width * .35;
      const visibleChunks = getVisibleWorldChunks(
        cameraX,
        width,
        WORLD_SEED,
        chunkCache,
      );
      const objects = visibleChunks.flatMap((chunk) => chunk.objects)
        .sort((left, right) => left.lane - right.lane);

      for (const chunk of visibleChunks) {
        drawRoadChunk(context, chunk.start, cameraX, anchorX, width, height, pixelsPerMeter);
      }
      for (const object of objects) {
        const x = anchorX + (object.worldX - cameraX) * pixelsPerMeter * object.parallax;
        if (x < -150 || x > width + 150) continue;
        const y = height * .64 + object.lane * height * .13;
        drawWorldObject(
          context,
          object,
          x,
          y,
          pixelsPerMeter,
          now,
          current.motionReduced || (Math.abs(motion.velocityX) < .05 && Math.abs(motion.velocityY) < .005),
          current.quality,
        );
      }

      drawGate(context, cameraX, anchorX, width, height, pixelsPerMeter);
    };

    renderRef.current = render;
    render(performance.now());
    return () => {
      if (renderRef.current === render) renderRef.current = null;
      observer.disconnect();
    };
  }, [motionRef, quality, renderRef]);

  return <canvas className="world-scenery" ref={canvasRef} aria-hidden="true" />;
}

function drawRoadChunk(
  context: CanvasRenderingContext2D,
  start: number,
  cameraX: number,
  anchorX: number,
  width: number,
  height: number,
  pixelsPerMeter: number,
) {
  const seamX = anchorX + (start - cameraX) * pixelsPerMeter;
  if (seamX < -8 || seamX > width + 8) return;
  context.save();
  context.globalAlpha = .16;
  context.strokeStyle = "rgba(218,181,139,.56)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(seamX, height * .56);
  context.lineTo(seamX + 8, height * .97);
  context.stroke();

  const segmentWidth = WORLD_CHUNK_LENGTH_METERS * pixelsPerMeter;
  for (let index = 1; index < 6; index += 1) {
    const crackX = seamX + segmentWidth * (index / 6);
    if (crackX < -16 || crackX > width + 16) continue;
    const crackY = height * (.66 + ((index * 37 + Math.floor(start)) % 25) / 100);
    context.beginPath();
    context.moveTo(crackX, crackY);
    context.lineTo(crackX + 7 + (index % 3) * 4, crackY + 3 + (index % 2) * 2);
    context.stroke();
  }
  context.restore();
}

function drawWorldObject(
  context: CanvasRenderingContext2D,
  object: WorldObject,
  x: number,
  groundY: number,
  pixelsPerMeter: number,
  now: number,
  motionReduced: boolean,
  quality: WorldSceneryProps["quality"],
) {
  const depthScale = clamp(.84 + (object.lane + .8) * .2, .78, 1.18);
  const size = object.scale * depthScale * clamp(pixelsPerMeter * 1.28, 38, 62);
  const sway = motionReduced ? 0 : Math.sin(now * .0017 + object.flickerSeed) * 4;

  context.save();
  context.translate(x, groundY);
  context.scale(size / 56, size / 56);
  context.globalAlpha = object.parallax < .5 ? .72 : object.parallax > .8 ? .92 : .82;
  context.shadowColor = "rgba(0,0,0,.42)";
  context.shadowBlur = quality === "high" ? 6 : quality === "balanced" ? 3 : 0;
  context.fillStyle = "#17181d";
  context.strokeStyle = "#28272a";
  context.lineWidth = 3;

  if (object.kind === "tower") {
    context.beginPath();
    context.moveTo(-20, 0);
    context.lineTo(-17, -58);
    context.lineTo(-12, -68);
    context.lineTo(-6, -62);
    context.lineTo(-3, -76);
    context.lineTo(4, -62);
    context.lineTo(10, -69);
    context.lineTo(17, -59);
    context.lineTo(19, 0);
    context.closePath();
    context.fill();
    context.fillStyle = "rgba(238,163,93,.54)";
    context.fillRect(-10, -36, 4, 9);
    context.fillRect(6, -27, 4, 8);
    context.fillStyle = "#121319";
    context.fillRect(-5, -16, 9, 16);
  } else if (object.kind === "ruin") {
    context.fillRect(-23, -34, 13, 34);
    context.fillRect(10, -48, 13, 48);
    context.fillRect(-16, -50, 9, 17);
    context.fillRect(7, -55, 9, 16);
    context.strokeStyle = "#302b2b";
    context.lineWidth = 7;
    context.beginPath();
    context.arc(0, -30, 13, Math.PI, Math.PI * 2);
    context.stroke();
  } else if (object.kind === "tree") {
    context.strokeStyle = "#211d1d";
    context.lineWidth = 7;
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(1, -45);
    context.moveTo(0, -25);
    context.lineTo(-17, -39);
    context.moveTo(1, -32);
    context.lineTo(18, -50);
    context.stroke();
    context.fillStyle = "rgba(18,20,24,.93)";
    context.beginPath();
    context.ellipse(-5, -46, 13, 10, -.35, 0, Math.PI * 2);
    context.ellipse(13, -53, 14, 12, .25, 0, Math.PI * 2);
    context.ellipse(1, -61, 13, 11, 0, 0, Math.PI * 2);
    context.fill();
  } else if (object.kind === "flag") {
    context.fillStyle = "#282329";
    context.fillRect(-1.5, -67, 3, 67);
    context.fillStyle = "#71343a";
    context.beginPath();
    context.moveTo(2, -63);
    context.lineTo(35 + sway, -56);
    context.lineTo(25 + sway * .5, -43);
    context.lineTo(2, -47);
    context.closePath();
    context.fill();
    context.fillStyle = "rgba(228,178,117,.64)";
    context.fillRect(2, -63, 2, 17);
  } else if (object.kind === "rock") {
    const gradient = context.createLinearGradient(-22, -28, 18, 0);
    gradient.addColorStop(0, "#373238");
    gradient.addColorStop(1, "#18191e");
    context.fillStyle = gradient;
    context.beginPath();
    context.moveTo(-28, 0);
    context.lineTo(-22, -17);
    context.lineTo(-9, -29);
    context.lineTo(3, -19);
    context.lineTo(15, -24);
    context.lineTo(28, 0);
    context.closePath();
    context.fill();
    context.strokeStyle = "rgba(178,146,111,.2)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(-12, -17);
    context.lineTo(-5, -8);
    context.lineTo(8, -12);
    context.stroke();
  } else if (object.kind === "torch") {
    drawTorch(context, sway, 1);
  } else if (object.kind === "crystal") {
    const glow = context.createRadialGradient(0, -28, 1, 0, -28, 34);
    glow.addColorStop(0, "rgba(255,196,123,.34)");
    glow.addColorStop(1, "rgba(255,154,81,0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(0, -28, 34, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#a66b61";
    context.beginPath();
    context.moveTo(0, -53);
    context.lineTo(12, -31);
    context.lineTo(3, -8);
    context.lineTo(-9, -30);
    context.closePath();
    context.fill();
    context.strokeStyle = "rgba(253,215,159,.55)";
    context.lineWidth = 1.5;
    context.stroke();
  } else {
    context.fillStyle = "#29201e";
    context.beginPath();
    context.ellipse(0, -5, 24, 7, 0, 0, Math.PI * 2);
    context.fill();
    const flame = context.createLinearGradient(0, -36, 0, -3);
    flame.addColorStop(0, "rgba(255,218,147,.9)");
    flame.addColorStop(.44, "rgba(230,115,53,.8)");
    flame.addColorStop(1, "rgba(132,44,31,.18)");
    context.fillStyle = flame;
    context.beginPath();
    context.moveTo(-12, -3);
    context.quadraticCurveTo(-15, -29, sway, -38);
    context.quadraticCurveTo(18, -20, 12, -3);
    context.closePath();
    context.fill();
  }
  context.restore();
}

function drawTorch(context: CanvasRenderingContext2D, sway: number, intensity: number) {
  const glow = context.createRadialGradient(0, -47, 3, 0, -47, 39);
  glow.addColorStop(0, `rgba(255,177,94,${.28 * intensity})`);
  glow.addColorStop(1, "rgba(255,122,52,0)");
  context.fillStyle = glow;
  context.beginPath();
  context.arc(0, -47, 39, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#373034";
  context.fillRect(-4, -42, 8, 42);
  const fire = context.createLinearGradient(0, -67, 0, -42);
  fire.addColorStop(0, "#ffe2a4");
  fire.addColorStop(.5, "#ed9a4f");
  fire.addColorStop(1, "#a84435");
  context.fillStyle = fire;
  context.beginPath();
  context.moveTo(-9, -42);
  context.quadraticCurveTo(-12 + sway, -59, 1 + sway, -68);
  context.quadraticCurveTo(13, -56, 9, -42);
  context.closePath();
  context.fill();
}

function drawGate(
  context: CanvasRenderingContext2D,
  cameraX: number,
  anchorX: number,
  width: number,
  height: number,
  pixelsPerMeter: number,
) {
  const gateXPosition = nextGateDistance(cameraX);
  const remaining = gateXPosition - cameraX;
  const gateX = anchorX + remaining * pixelsPerMeter * .74;
  if (gateX < -100 || gateX > width + 130) return;
  const scale = clamp(1.55 / (1 + remaining / 34), .52, 1.55);
  const baseY = height * .62;
  const gateHeight = 160 * scale;
  const gateWidth = 112 * scale;
  const gradient = context.createLinearGradient(gateX - gateWidth / 2, 0, gateX + gateWidth / 2, 0);
  gradient.addColorStop(0, "#191a20");
  gradient.addColorStop(.5, "#383036");
  gradient.addColorStop(1, "#17181e");
  context.save();
  context.globalAlpha = .94;
  context.fillStyle = gradient;
  context.beginPath();
  context.moveTo(gateX - gateWidth / 2, baseY);
  context.lineTo(gateX - gateWidth / 2, baseY - gateHeight * .72);
  context.lineTo(gateX - gateWidth * .28, baseY - gateHeight);
  context.lineTo(gateX + gateWidth * .28, baseY - gateHeight);
  context.lineTo(gateX + gateWidth / 2, baseY - gateHeight * .72);
  context.lineTo(gateX + gateWidth / 2, baseY);
  context.closePath();
  context.fill();
  context.fillStyle = "rgba(243,153,75,.24)";
  context.beginPath();
  context.moveTo(gateX - gateWidth * .25, baseY);
  context.lineTo(gateX - gateWidth * .25, baseY - gateHeight * .58);
  context.quadraticCurveTo(gateX, baseY - gateHeight * .88, gateX + gateWidth * .25, baseY - gateHeight * .58);
  context.lineTo(gateX + gateWidth * .25, baseY);
  context.closePath();
  context.fill();
  context.strokeStyle = "rgba(226,180,117,.38)";
  context.lineWidth = 2 * scale;
  context.strokeRect(gateX - gateWidth / 2, baseY - gateHeight * .72, gateWidth, gateHeight * .72);
  context.restore();
}
