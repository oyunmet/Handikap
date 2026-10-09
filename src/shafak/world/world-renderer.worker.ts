import {
  WORLD_METERS_TO_PIXELS,
} from "./movement";
import { calculateWorldLightRadius } from "./world-lighting-model";
import {
  getVisibleWorldChunks,
  nextGateDistance,
  WORLD_SEED,
  type WorldObject,
  type WorldChunk,
} from "./world-generation";

type RendererInit = {
  type: "init";
  scenery: OffscreenCanvas;
  lighting: OffscreenCanvas;
};
type RendererResize = {
  type: "resize";
  width: number;
  height: number;
  pixelRatio: number;
};
type RendererFrame = {
  type: "frame";
  now: number;
  cameraX: number;
  depth: number;
  velocityX: number;
  velocityY: number;
  level: number;
  relicCount: number;
  quality: "high" | "balanced" | "low";
  motionReduced: boolean;
};
type RendererMessage = RendererInit | RendererResize | RendererFrame;

let sceneryContext: OffscreenCanvasRenderingContext2D | null = null;
let lightingContext: OffscreenCanvasRenderingContext2D | null = null;
let viewWidth = 1;
let viewHeight = 1;
let pixelRatio = 1;
let lastSceneryCamera = Number.NaN;
let lastSceneryDepth = Number.NaN;
let lastLightCamera = Number.NaN;
let lastLightDepth = Number.NaN;
let lastLightLevel = Number.NaN;
let lastLightRelics = Number.NaN;
const sceneryChunks = new Map<number, WorldChunk>();
const lightingChunks = new Map<number, WorldChunk>();
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

self.onmessage = (event: MessageEvent<RendererMessage>) => {
  const message = event.data;
  if (message.type === "init") {
    sceneryContext = message.scenery.getContext("2d", { alpha: true, desynchronized: true });
    lightingContext = message.lighting.getContext("2d", { alpha: true, desynchronized: true });
    return;
  }
  if (message.type === "resize") {
    viewWidth = Math.max(1, message.width);
    viewHeight = Math.max(1, message.height);
    pixelRatio = Math.max(.3, Math.min(1.2, message.pixelRatio));
    resetCanvas(sceneryContext, viewWidth, viewHeight, pixelRatio);
    resetCanvas(lightingContext, viewWidth, viewHeight, pixelRatio);
    lastSceneryCamera = Number.NaN;
    lastLightCamera = Number.NaN;
    return;
  }
  if (!sceneryContext || !lightingContext) return;

  const cameraX = Number.isFinite(message.cameraX) ? message.cameraX : 0;
  const depth = clamp(Number.isFinite(message.depth) ? message.depth : 0, -1, 1);
  if (cameraX !== lastSceneryCamera || depth !== lastSceneryDepth) {
    drawScenery(sceneryContext, cameraX, depth, message.now, message.quality, message.motionReduced || (
      Math.abs(message.velocityX) < .05 && Math.abs(message.velocityY) < .005
    ));
    lastSceneryCamera = cameraX;
    lastSceneryDepth = depth;
  }
  if (
    cameraX !== lastLightCamera
    || depth !== lastLightDepth
    || message.level !== lastLightLevel
    || message.relicCount !== lastLightRelics
  ) {
    drawLighting(lightingContext, cameraX, depth, message.level, message.relicCount);
    lastLightCamera = cameraX;
    lastLightDepth = depth;
    lastLightLevel = message.level;
    lastLightRelics = message.relicCount;
  }
};

function resetCanvas(
  context: OffscreenCanvasRenderingContext2D | null,
  width: number,
  height: number,
  ratio: number,
) {
  if (!context) return;
  const canvas = context.canvas;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function drawScenery(
  context: OffscreenCanvasRenderingContext2D,
  cameraX: number,
  depth: number,
  now: number,
  quality: RendererFrame["quality"],
  motionReduced: boolean,
) {
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, viewWidth, viewHeight);
  const pixelsPerMeter = clamp(viewWidth * .095, 30, 48);
  const anchorX = viewWidth * .35;
  const chunks = getVisibleWorldChunks(cameraX, viewWidth, WORLD_SEED, sceneryChunks);
  const objects = chunks.flatMap((chunk) => chunk.objects).sort((a, b) => a.lane - b.lane);
  for (const object of objects) {
    const x = anchorX + (object.worldX - cameraX) * pixelsPerMeter * object.parallax;
    if (x < -100 || x > viewWidth + 100) continue;
    const y = viewHeight * .64 + object.lane * viewHeight * .13 - depth * 12;
    drawProp(context, object, x, y, clamp(pixelsPerMeter * 1.12, 34, 54), now, motionReduced, quality);
  }
  drawGate(context, cameraX, anchorX, pixelsPerMeter);
}

function drawProp(
  context: OffscreenCanvasRenderingContext2D,
  object: WorldObject,
  x: number,
  y: number,
  baseSize: number,
  now: number,
  motionReduced: boolean,
  quality: RendererFrame["quality"],
) {
  const scale = object.scale * clamp(.84 + (object.lane + .8) * .2, .78, 1.18) * baseSize / 52;
  const sway = motionReduced ? 0 : Math.sin(now * .0017 + object.flickerSeed) * 3;
  context.save();
  context.translate(x, y);
  context.scale(scale, scale);
  context.globalAlpha = object.parallax < .5 ? .68 : object.parallax > .8 ? .9 : .8;
  context.fillStyle = object.kind === "flag" ? "#71343a" : "#1b1b21";
  context.strokeStyle = "#29272c";
  context.lineWidth = 3;

  if (object.kind === "tower") {
    context.beginPath();
    context.moveTo(-20, 0);
    context.lineTo(-17, -57);
    context.lineTo(-7, -68);
    context.lineTo(0, -60);
    context.lineTo(9, -70);
    context.lineTo(18, -55);
    context.lineTo(20, 0);
    context.closePath();
    context.fill();
    context.fillStyle = "rgba(230,157,91,.46)";
    context.fillRect(-9, -32, 4, 8);
    context.fillRect(6, -26, 4, 7);
  } else if (object.kind === "ruin") {
    context.fillRect(-23, -33, 13, 33);
    context.fillRect(10, -47, 13, 47);
    context.beginPath();
    context.arc(0, -28, 13, Math.PI, Math.PI * 2);
    context.stroke();
  } else if (object.kind === "tree") {
    context.lineWidth = 7;
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(0, -55);
    context.moveTo(0, -25);
    context.lineTo(-18, -43);
    context.moveTo(0, -34);
    context.lineTo(18, -49);
    context.stroke();
    context.fillStyle = "#15171c";
    context.beginPath();
    context.ellipse(-7, -49, 13, 11, -.25, 0, Math.PI * 2);
    context.ellipse(10, -55, 14, 12, .2, 0, Math.PI * 2);
    context.fill();
  } else if (object.kind === "flag") {
    context.fillStyle = "#29252a";
    context.fillRect(-1, -66, 2, 66);
    context.fillStyle = "#71343a";
    context.beginPath();
    context.moveTo(2, -62);
    context.lineTo(32 + sway, -55);
    context.lineTo(24 + sway * .4, -43);
    context.lineTo(2, -47);
    context.closePath();
    context.fill();
  } else if (object.kind === "rock") {
    context.beginPath();
    context.moveTo(-27, 0);
    context.lineTo(-20, -18);
    context.lineTo(-7, -28);
    context.lineTo(7, -19);
    context.lineTo(17, -24);
    context.lineTo(28, 0);
    context.closePath();
    context.fill();
  } else if (object.kind === "torch" || object.kind === "crystal" || object.kind === "firepit") {
    drawFireProp(context, object.kind, sway, quality);
  }
  context.restore();
}

function drawFireProp(
  context: OffscreenCanvasRenderingContext2D,
  kind: WorldObject["kind"],
  sway: number,
  quality: RendererFrame["quality"],
) {
  if (kind === "crystal") {
    context.fillStyle = "rgba(228,137,95,.3)";
    context.beginPath();
    context.moveTo(0, -48);
    context.lineTo(12, -29);
    context.lineTo(4, -8);
    context.lineTo(-10, -27);
    context.closePath();
    context.fill();
    return;
  }
  if (kind === "firepit") {
    context.fillStyle = "#2b211f";
    context.beginPath();
    context.ellipse(0, -4, 23, 7, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#e68a4e";
    context.beginPath();
    context.moveTo(-11, -4);
    context.quadraticCurveTo(-12, -29, sway, -37);
    context.quadraticCurveTo(14, -21, 11, -4);
    context.closePath();
    context.fill();
    return;
  }
  context.fillStyle = "#353035";
  context.fillRect(-4, -42, 8, 42);
  context.fillStyle = quality === "low" ? "#e68a4e" : "#ffd597";
  context.beginPath();
  context.moveTo(-8, -42);
  context.quadraticCurveTo(-11 + sway, -60, 0 + sway, -67);
  context.quadraticCurveTo(12, -54, 8, -42);
  context.closePath();
  context.fill();
}

function drawGate(
  context: OffscreenCanvasRenderingContext2D,
  cameraX: number,
  anchorX: number,
  pixelsPerMeter: number,
) {
  const remaining = nextGateDistance(cameraX) - cameraX;
  const x = anchorX + remaining * pixelsPerMeter * .74;
  if (x < -90 || x > viewWidth + 110) return;
  const scale = clamp(1.5 / (1 + remaining / 34), .5, 1.5);
  const y = viewHeight * .62;
  const gateHeight = 152 * scale;
  const gateWidth = 100 * scale;
  context.save();
  context.globalAlpha = .9;
  context.fillStyle = "#242229";
  context.beginPath();
  context.moveTo(x - gateWidth / 2, y);
  context.lineTo(x - gateWidth / 2, y - gateHeight * .7);
  context.lineTo(x - gateWidth * .26, y - gateHeight);
  context.lineTo(x + gateWidth * .26, y - gateHeight);
  context.lineTo(x + gateWidth / 2, y - gateHeight * .7);
  context.lineTo(x + gateWidth / 2, y);
  context.closePath();
  context.fill();
  context.fillStyle = "rgba(234,141,70,.2)";
  context.fillRect(x - gateWidth * .2, y - gateHeight * .56, gateWidth * .4, gateHeight * .56);
  context.restore();
}

function drawLighting(
  context: OffscreenCanvasRenderingContext2D,
  cameraX: number,
  depth: number,
  level: number,
  relicCount: number,
) {
  const width = viewWidth;
  const height = viewHeight;
  const pixelsPerMeter = clamp(width * .095, 30, 48);
  const playerX = width * .35;
  const footY = height * .875 - depth * 46;
  const radius = calculateWorldLightRadius(width, level, relicCount);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.globalCompositeOperation = "source-over";
  context.fillStyle = "rgba(3,5,12,.8)";
  context.fillRect(0, 0, width, height);
  context.globalCompositeOperation = "destination-out";
  paintMask(context, playerX, footY - height * .09, radius * .62, .92);
  paintMask(context, playerX + width * .16, footY - height * .2, radius * .82, .86);

  const chunks = getVisibleWorldChunks(cameraX, width, WORLD_SEED, lightingChunks);
  for (const object of chunks.flatMap((chunk) => chunk.objects)) {
    if (object.kind !== "torch" && object.kind !== "crystal" && object.kind !== "firepit") continue;
    const x = playerX + (object.worldX - cameraX) * pixelsPerMeter * object.parallax;
    if (x < -100 || x > width + 100) continue;
    const y = height * .64 + object.lane * height * .13 - 28;
    paintMask(context, x, y, 62 + object.scale * 18, .66);
  }

  for (let index = 0; index < 5; index += 1) {
    const x = playerX - 20 - index * 30;
    const strength = .18 * Math.exp(-index * .28);
    paintMask(context, x, footY, 22 + (index % 3) * 4, strength);
  }
  context.globalCompositeOperation = "source-over";
  paintGlow(context, playerX, footY - height * .09, radius * .55, .16);
  paintGlow(context, playerX + width * .16, footY - height * .2, radius * .66, .12);
}

function paintMask(
  context: OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  strength: number,
) {
  const gradient = context.createRadialGradient(x, y, radius * .1, x, y, radius);
  gradient.addColorStop(0, `rgba(0,0,0,${strength})`);
  gradient.addColorStop(.45, `rgba(0,0,0,${strength * .7})`);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = gradient;
  context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function paintGlow(
  context: OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha: number,
) {
  const gradient = context.createRadialGradient(x, y, radius * .08, x, y, radius);
  gradient.addColorStop(0, `rgba(255,167,86,${alpha})`);
  gradient.addColorStop(.45, `rgba(229,113,59,${alpha * .44})`);
  gradient.addColorStop(1, "rgba(164,65,43,0)");
  context.fillStyle = gradient;
  context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}
