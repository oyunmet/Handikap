import React, { useEffect, useRef } from "react";

const BOARD_ROWS = 10;
const BOARD_COLS = 8;

function cellPoint(position, width, height) {
  if (!position) return { x: width / 2, y: height / 2 };
  return {
    x: ((position.col + 0.5) / BOARD_COLS) * width,
    y: ((position.row + 0.5) / BOARD_ROWS) * height,
  };
}

function seeded(index, seed) {
  const value = Math.sin((index + 1) * 91.7 + seed * 17.3) * 43758.5453;
  return value - Math.floor(value);
}

function burstParticles(ctx, center, progress, seed, count, colors, size = 1) {
  const p = Math.min(1, Math.max(0, progress));
  for (let index = 0; index < count; index += 1) {
    const angle = seeded(index, seed) * Math.PI * 2;
    const speed = 12 + seeded(index + 40, seed) * 56;
    const gravity = 24 + seeded(index + 80, seed) * 45;
    const distance = speed * p;
    const x = center.x + Math.cos(angle) * distance;
    const y = center.y + Math.sin(angle) * distance + gravity * p * p;
    const alpha = Math.max(0, 1 - p * 1.18);
    const color = colors[index % colors.length];
    const radius = (2 + seeded(index + 120, seed) * 4) * size * (1 - p * 0.28);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    if (index % 4 === 0) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + p * 5);
      ctx.fillRect(-radius, -radius * 0.48, radius * 2.1, radius);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawRing(ctx, center, progress, radius, color, lineWidth = 3) {
  const p = Math.min(1, Math.max(0, progress));
  ctx.save();
  ctx.globalAlpha = (1 - p) * 0.9;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth * (1 - p * 0.42);
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius * (0.2 + p * 1.7), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawCoin(ctx, x, y, radius, angle, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(Math.max(0.12, Math.abs(Math.cos(angle))), 1);
  const gradient = ctx.createLinearGradient(-radius, -radius, radius, radius);
  gradient.addColorStop(0, "#fff9ae");
  gradient.addColorStop(0.42, "#ffd63e");
  gradient.addColorStop(1, "#d27b08");
  ctx.fillStyle = gradient;
  ctx.strokeStyle = "#fff0a0";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#d18412";
  ctx.font = `900 ${Math.max(7, radius * 1.1)}px Georgia`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("♛", 0, 0.5);
  ctx.restore();
}

function drawLightning(ctx, from, to, progress, seed, color = "#f8ffff") {
  const p = Math.min(1, Math.max(0, progress));
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const segments = Math.max(4, Math.ceil(distance / 20));
  ctx.save();
  ctx.globalAlpha = Math.sin(p * Math.PI) * 0.96;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  for (let index = 1; index < segments; index += 1) {
    const t = index / segments;
    const jitter = (seeded(index, seed) - 0.5) * 14;
    ctx.lineTo(from.x + (to.x - from.x) * t + jitter, from.y + (to.y - from.y) * t - jitter * 0.45);
  }
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

function drawRocketBeam(ctx, point, progress, orientation, width, height) {
  const p = Math.min(1, Math.max(0, progress));
  const horizontal = orientation === "horizontal";
  const length = horizontal ? width : height;
  const head = p * (length + 28) - 14;
  const gradient = horizontal
    ? ctx.createLinearGradient(head - 70, 0, head + 12, 0)
    : ctx.createLinearGradient(0, head - 70, 0, head + 12);
  gradient.addColorStop(0, "rgba(255,228,115,0)");
  gradient.addColorStop(0.72, "rgba(255,222,111,.7)");
  gradient.addColorStop(1, "rgba(255,255,240,1)");
  ctx.save();
  ctx.globalAlpha = Math.sin(Math.min(1, p * 1.7) * Math.PI) * 0.95;
  ctx.shadowColor = "#fff1a0";
  ctx.shadowBlur = 18;
  ctx.strokeStyle = gradient;
  ctx.lineWidth = Math.max(8, Math.min(width / 9, height / 5));
  ctx.beginPath();
  if (horizontal) {
    ctx.moveTo(Math.max(0, head - 86), point.y);
    ctx.lineTo(Math.min(width, head + 6), point.y);
  } else {
    ctx.moveTo(point.x, Math.max(0, head - 86));
    ctx.lineTo(point.x, Math.min(height, head + 6));
  }
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,.95)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (horizontal) {
    ctx.moveTo(Math.max(0, head - 80), point.y);
    ctx.lineTo(Math.min(width, head + 2), point.y);
  } else {
    ctx.moveTo(point.x, Math.max(0, head - 80));
    ctx.lineTo(point.x, Math.min(height, head + 2));
  }
  ctx.stroke();
  ctx.restore();
}

function drawPropeller(ctx, from, to, progress, size) {
  const p = Math.min(1, Math.max(0, progress));
  const x = from.x + (to.x - from.x) * p;
  const y = from.y + (to.y - from.y) * p - Math.sin(p * Math.PI) * size * 0.62;
  const radius = size * (0.48 + Math.sin(p * Math.PI) * 0.13);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(p * Math.PI * 10);
  ctx.shadowColor = "#fff26c";
  ctx.shadowBlur = 14;
  for (let index = 0; index < 4; index += 1) {
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = index % 2 ? "#ff9e21" : "#f8cf40";
    ctx.strokeStyle = "#fff3a1";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, -radius * 0.72, radius * 0.3, radius * 0.68, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = "#dc343c";
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.27, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fff5a9";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  if (p > 0.78) drawRing(ctx, to, (p - 0.78) / 0.22, radius * 1.5, "#fff2a0", 2);
}

export default function RoyalGameEffects({ game, active }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const grid = canvas?.parentElement;
    const context = canvas?.getContext("2d");
    if (!canvas || !grid || !context || !active) {
      if (context) context.clearRect(0, 0, canvas.width, canvas.height);
      return undefined;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const events = (game.specialEffects || []).map((event, index) => ({
      event,
      start: reducedMotion ? Math.min(index * 16, 100) : Math.min(index * 46, 540),
    }));
    const totalDuration = (events.at(-1)?.start || 0) + (reducedMotion ? 520 : 1350);
    const startedAt = performance.now();
    let frameId = 0;
    let width = 0;
    let height = 0;
    let ratio = 1;

    const resize = () => {
      const rect = grid.getBoundingClientRect();
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(grid);

    const tick = (now) => {
      context.clearRect(0, 0, width, height);
      const elapsed = now - startedAt;
      events.forEach(({ event, start }, index) => {
        const local = elapsed - start;
        if (local < 0) return;
        const duration = reducedMotion ? 460 : 880;
        const p = Math.min(1, local / duration);
        const cellSize = Math.min(width / BOARD_COLS, height / BOARD_ROWS);
        const at = cellPoint(event.at || event.from, width, height);

        if (event.type === "special-created") {
          const color = event.special === "tnt" ? "#ffbf54" : event.special === "lightball" ? "#f7d3ff" : "#fff19d";
          drawRing(context, at, p, cellSize * 0.72, color, 2);
          burstParticles(context, at, p, index + 4, 12, [color, "#fff", "#ffec9d"], 0.65);
        } else if (event.type === "rocket") {
          drawRocketBeam(context, at, p, event.orientation, width, height);
          if (p > 0.86) burstParticles(context, at, (p - 0.86) / 0.14, index + 11, 10, ["#fff", "#ffdf7a", "#ff8747"], 0.55);
        } else if (event.type === "tnt") {
          drawRing(context, at, p, cellSize * 1.4, "#fff2a0", 4);
          if (p < 0.42) {
            const radius = cellSize * (0.18 + p * 3.5);
            const glow = context.createRadialGradient(at.x, at.y, 0, at.x, at.y, radius);
            glow.addColorStop(0, "rgba(255,255,239,.94)");
            glow.addColorStop(0.28, "rgba(255,202,79,.68)");
            glow.addColorStop(1, "rgba(255,119,45,0)");
            context.globalAlpha = Math.max(0, 1 - p / 0.48);
            context.fillStyle = glow;
            context.beginPath();
            context.arc(at.x, at.y, radius, 0, Math.PI * 2);
            context.fill();
            context.globalAlpha = 1;
          }
          burstParticles(context, at, p, index + 16, 24, ["#fff6c1", "#ffcb4d", "#f37d39", "#fff"], 0.8);
        } else if (event.type === "lightball") {
          const targets = (game.clearedCells || [])
            .filter((cell) => cell.color === event.color)
            .slice(0, 22)
            .map((cell) => cellPoint(cell, width, height));
          targets.forEach((target, targetIndex) => {
            const delayed = Math.max(0, p * 1.55 - targetIndex * 0.024);
            if (delayed > 0) drawLightning(context, at, target, Math.min(1, delayed), index + targetIndex * 7, "#fff");
            drawRing(context, target, Math.max(0, p - 0.34), cellSize * 0.36, "#e5fcff", 1.5);
          });
          drawRing(context, at, p, cellSize * 0.95, "#fff3a1", 3);
        } else if (event.type === "propeller") {
          const target = cellPoint(event.to, width, height);
          drawPropeller(context, at, target, p, cellSize);
          if (p > 0.84) burstParticles(context, target, (p - 0.84) / 0.16, index + 22, 16, ["#fff0a0", "#ff9d38", "#fff"], 0.7);
        } else if (event.type === "combo") {
          drawRing(context, at, p, cellSize * 2.7, "#fff0a0", 5);
          drawRing(context, at, Math.max(0, p - 0.12), cellSize * 2, "#ff9f46", 2);
          burstParticles(context, at, p, index + 29, 32, ["#fff", "#ffe16e", "#ff8b4a", "#7ce5ff"], 1.05);
        } else if (event.type === "blocker-hit") {
          const colors = event.blocker === "vault" ? ["#d9d3ff", "#ffe776", "#fff"] : ["#8ce254", "#d2ff9b", "#fff"];
          burstParticles(context, at, p, index + 31, 9, colors, 0.65);
          drawRing(context, at, p, cellSize * 0.58, colors[0], 1.5);
        } else if (event.type === "blocker-break") {
          if (event.blocker === "vault") {
            burstParticles(context, at, p, index + 37, 34, ["#8b7ae8", "#554eb0", "#f9cf42", "#fff0a0", "#fff"], 1.05);
            for (let coin = 0; coin < 12; coin += 1) {
              const angle = seeded(coin, index + 43) * Math.PI * 2;
              const speed = 14 + seeded(coin + 30, index + 43) * 50;
              const x = at.x + Math.cos(angle) * speed * p;
              const y = at.y + Math.sin(angle) * speed * p + 38 * p * p;
              drawCoin(context, x, y, cellSize * (0.09 + seeded(coin + 60, index) * 0.055), p * 13 + coin * 0.4, Math.max(0, 1 - p));
            }
          } else if (event.blocker === "grass" || event.blocker === "bear") {
            burstParticles(context, at, p, index + 47, 28, ["#9ee85a", "#3eac49", "#e9ffad", "#fff"], 0.95);
          } else if (event.blocker === "hat") {
            burstParticles(context, at, p, index + 53, 18, ["#db55df", "#573486", "#fff", "#f5a8ff"], 0.8);
          } else {
            burstParticles(context, at, p, index + 59, 20, ["#ffdc68", "#e35b39", "#fff", "#9bb6d8"], 0.9);
          }
          drawRing(context, at, p, cellSize * 1.28, event.blocker === "vault" ? "#ffe78c" : "#e4ffad", 2.5);
        } else if (event.type === "drill-launch") {
          const progress = Math.min(1, p * 1.25);
          context.save();
          context.globalAlpha = 1 - p;
          context.strokeStyle = "#fff0a0";
          context.lineWidth = cellSize * 0.18;
          context.shadowColor = "#ff9b31";
          context.shadowBlur = 14;
          context.beginPath();
          context.moveTo(at.x, at.y + cellSize * 0.5);
          context.lineTo(at.x, at.y - height * progress);
          context.stroke();
          context.restore();
          burstParticles(context, { x: at.x, y: at.y - height * progress }, p, index + 61, 20, ["#fff", "#ffc94d", "#f46c37"], 0.7);
        } else if (event.type === "booster") {
          if (event.booster === "bow") drawRocketBeam(context, at, p, "horizontal", width, height);
          else if (event.booster === "cannon" || event.booster === "hammer") {
            drawRing(context, at, p, cellSize * (event.booster === "cannon" ? 1.8 : 0.8), "#fff4a5", 3);
            burstParticles(context, at, p, index + 67, event.booster === "cannon" ? 30 : 14, ["#fff", "#ffd452", "#fd8e4a", "#9dc3f4"], 0.85);
          } else {
            const targets = (game.clearedCells || []).slice(0, 18);
            targets.forEach((target, targetIndex) => drawLightning(context, at, cellPoint(target, width, height), Math.min(1, Math.max(0, p * 1.5 - targetIndex * 0.025)), index + targetIndex, "#fff49c"));
            burstParticles(context, at, p, index + 73, 26, ["#fff", "#f7d13f", "#ef72e2", "#65cdf5"], 0.9);
          }
        } else if (event.type === "special-activate") {
          drawRing(context, at, p, cellSize * 1.3, "#fff1a0", 3);
        }
      });
      if (elapsed < totalDuration) frameId = requestAnimationFrame(tick);
      else context.clearRect(0, 0, width, height);
    };

    frameId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      context.clearRect(0, 0, width, height);
    };
  }, [active, game]);

  return <canvas ref={canvasRef} className="rg-effects-canvas" aria-hidden="true" />;
}
