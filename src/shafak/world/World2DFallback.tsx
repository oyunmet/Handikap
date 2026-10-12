import { useEffect, useRef } from "react";
import type { WorldMotion } from "./movement";
import type { WorldObstacle, WorldPickup, WorldRival } from "./world-content";

type World2DFallbackProps = {
  motionRef: { current: WorldMotion };
  rivals: WorldRival[];
  pickups: WorldPickup[];
  obstacles: WorldObstacle[];
  collectedPickupIds: ReadonlySet<string>;
  brokenObstacleIds: ReadonlySet<string>;
  defeatedOpponentIds: readonly string[];
  combatActive: boolean;
  opponentName: string;
  playerName: string;
  onRetry: () => void;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function drawFighter(
  context: CanvasRenderingContext2D,
  x: number,
  feetY: number,
  scale: number,
  color: string,
  facing: -1 | 1,
) {
  const bodyWidth = 13 * scale;
  const bodyHeight = 28 * scale;
  context.save();
  context.translate(x, feetY);
  context.scale(facing, 1);
  context.fillStyle = "rgba(0,0,0,.36)";
  context.beginPath();
  context.ellipse(0, 1, bodyWidth * 1.3, 4 * scale, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(-bodyWidth * .44, -bodyHeight * .48);
  context.lineTo(-bodyWidth * 1.1, -bodyHeight * .04);
  context.lineTo(-bodyWidth * .72, 1);
  context.lineTo(bodyWidth * .72, 1);
  context.lineTo(bodyWidth * .82, -bodyHeight * .1);
  context.lineTo(bodyWidth * .38, -bodyHeight * .5);
  context.closePath();
  context.fill();
  context.fillStyle = "#211b1d";
  context.fillRect(-bodyWidth * .6, -bodyHeight * .16, bodyWidth * .38, bodyHeight * .42);
  context.fillRect(bodyWidth * .18, -bodyHeight * .16, bodyWidth * .38, bodyHeight * .42);
  context.fillStyle = "#c8a17a";
  context.beginPath();
  context.arc(0, -bodyHeight * .68, 5.1 * scale, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#33262a";
  context.beginPath();
  context.arc(0, -bodyHeight * .72, 5.5 * scale, Math.PI, Math.PI * 2);
  context.fill();
  context.strokeStyle = "#d8c29a";
  context.lineWidth = Math.max(1, 1.5 * scale);
  context.beginPath();
  context.moveTo(bodyWidth * .56, -bodyHeight * .28);
  context.lineTo(bodyWidth * 1.45, -bodyHeight * .62);
  context.stroke();
  context.restore();
}

function drawWorld(context: CanvasRenderingContext2D, width: number, height: number, props: World2DFallbackProps) {
  const motion = props.motionRef.current;
  const horizon = height * .4;
  const cameraDistance = motion.cameraX;
  const playerX = width * (.5 + motion.depth * .27);
  const playerFeetY = height * .84;

  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#191924");
  sky.addColorStop(.42, "#514044");
  sky.addColorStop(1, "#4a3028");
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  const horizonGlow = context.createRadialGradient(width * .54, horizon, 0, width * .54, horizon, width * .72);
  horizonGlow.addColorStop(0, "rgba(236,151,91,.34)");
  horizonGlow.addColorStop(1, "rgba(80,55,64,0)");
  context.fillStyle = horizonGlow;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "#292735";
  context.beginPath();
  context.moveTo(0, horizon + 28);
  context.lineTo(width * .12, horizon - 10);
  context.lineTo(width * .24, horizon + 18);
  context.lineTo(width * .41, horizon - 28);
  context.lineTo(width * .61, horizon + 14);
  context.lineTo(width * .8, horizon - 18);
  context.lineTo(width, horizon + 24);
  context.lineTo(width, height);
  context.lineTo(0, height);
  context.closePath();
  context.fill();

  const road = context.createLinearGradient(0, horizon, 0, height);
  road.addColorStop(0, "#55464a");
  road.addColorStop(1, "#322d34");
  context.fillStyle = road;
  context.beginPath();
  context.moveTo(width * .47, horizon);
  context.lineTo(width * .53, horizon);
  context.lineTo(width * 1.18, height);
  context.lineTo(-width * .18, height);
  context.closePath();
  context.fill();

  context.strokeStyle = "rgba(227,178,126,.38)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(width * .47, horizon);
  context.lineTo(-width * .18, height);
  context.moveTo(width * .53, horizon);
  context.lineTo(width * 1.18, height);
  context.stroke();

  const roadPoint = (relativeDistance: number, laneX: number) => {
    const depth = clamp(1 - relativeDistance / 96, .035, 1);
    const y = horizon + (height * .98 - horizon) * depth;
    const halfWidth = width * (.04 + .61 * depth);
    return { x: width / 2 + laneX * halfWidth / 5.2, y, depth, halfWidth };
  };

  context.strokeStyle = "rgba(237,208,166,.25)";
  context.lineWidth = 1;
  for (let index = 1; index <= 12; index += 1) {
    const distance = (Math.floor(cameraDistance / 9) + index) * 9;
    const relative = distance - cameraDistance;
    if (relative <= 0) continue;
    const center = roadPoint(relative, 0);
    for (const lane of [-.42, .42]) {
      const point = roadPoint(relative, lane * 5.2);
      context.beginPath();
      context.moveTo(point.x, point.y);
      context.lineTo(center.x + (point.x - center.x) * 1.025, point.y + 2 + center.depth * 5);
      context.stroke();
    }
  }

  if (props.combatActive) {
    context.fillStyle = "rgba(14,13,20,.52)";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "rgba(225,187,124,.55)";
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(width / 2, height * .72, width * .35, height * .13, 0, 0, Math.PI * 2);
    context.stroke();
    drawFighter(context, width * .35, height * .77, Math.min(1.8, width / 250), "#654e4a", 1);
    drawFighter(context, width * .65, height * .77, Math.min(1.8, width / 250), "#514255", -1);
    context.fillStyle = "#f0d9ad";
    context.textAlign = "center";
    context.font = "700 11px system-ui, sans-serif";
    context.fillText("DÜELLO ARENASI", width / 2, height * .5);
    context.font = "600 10px system-ui, sans-serif";
    context.fillText(props.playerName, width * .35, height * .81);
    context.fillText(props.opponentName, width * .65, height * .81);
    return;
  }

  const visibleEntities = [
    ...props.obstacles
      .filter((obstacle) => !props.brokenObstacleIds.has(obstacle.id))
      .map((obstacle) => ({ distance: obstacle.distance, kind: "obstacle" as const, value: obstacle })),
    ...props.pickups
      .filter((pickup) =>
        !props.collectedPickupIds.has(pickup.id) &&
        (!pickup.sourceObstacleId || props.brokenObstacleIds.has(pickup.sourceObstacleId)),
      )
      .map((pickup) => ({ distance: pickup.distance, kind: "pickup" as const, value: pickup })),
    ...props.rivals.map((rival) => ({ distance: rival.distance, kind: "rival" as const, value: rival })),
  ].filter((entity) => entity.distance - cameraDistance > 0 && entity.distance - cameraDistance < 96)
    .sort((left, right) => right.distance - left.distance);

  for (const entity of visibleEntities) {
    const relativeDistance = entity.distance - cameraDistance;
    const value = entity.value;
    const x = "x" in value ? value.x : 0;
    const point = roadPoint(relativeDistance, x - motion.depth * 5.2);
    if (entity.kind === "rival") {
      const rival = entity.value as WorldRival;
      const scale = .28 + point.depth * .94;
      drawFighter(context, point.x, point.y, scale, rival.armorTint, 1);
      context.fillStyle = "#f0dfc2";
      context.textAlign = "center";
      context.font = `600 ${Math.max(8, 9 * scale)}px system-ui, sans-serif`;
      context.fillText(rival.name, point.x, point.y - 35 * scale);
      if (props.defeatedOpponentIds.includes(rival.id)) {
        context.fillStyle = "#d9bd84";
        context.font = `600 ${Math.max(7, 7 * scale)}px system-ui, sans-serif`;
        context.fillText("YENİDEN KARŞILAŞ", point.x, point.y - 24 * scale);
      }
    } else if (entity.kind === "pickup") {
      const pickup = entity.value as WorldPickup;
      const radius = 3 + point.depth * 7;
      context.fillStyle = pickup.kind.startsWith("gold") || pickup.kind === "treasure-cache"
        ? "#f2c969"
        : pickup.kind === "diamond-small" ? "#75e8e8" : "#cb9cf4";
      context.shadowColor = context.fillStyle;
      context.shadowBlur = radius * 1.5;
      context.beginPath();
      context.arc(point.x, point.y - radius * 2, radius, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
    } else {
      const obstacle = entity.value as WorldObstacle;
      const obstacleSize = 8 + point.depth * 28;
      context.save();
      context.translate(point.x, point.y);
      if (obstacle.kind === "spike-trap") {
        context.fillStyle = "#c65654";
        context.beginPath();
        context.moveTo(-obstacleSize, 0);
        for (let spike = 0; spike < 5; spike += 1) {
          context.lineTo(-obstacleSize + spike * obstacleSize / 2.5, -obstacleSize * .55);
          context.lineTo(-obstacleSize + (spike + .5) * obstacleSize / 2.5, 0);
        }
        context.closePath();
        context.fill();
      } else {
        context.fillStyle = obstacle.kind === "low-bar" ? "#856948" : "#615a61";
        context.fillRect(-obstacleSize, -obstacleSize * .45, obstacleSize * 2, obstacleSize * .45);
        if (obstacle.kind === "low-bar") {
          context.fillRect(-obstacleSize, -obstacleSize * 1.8, obstacleSize * 2, obstacleSize * .2);
        }
      }
      context.restore();
    }
  }

  const jumpOffset = Math.min(32, motion.jumpHeight * 24);
  drawFighter(
    context,
    playerX,
    playerFeetY - jumpOffset,
    Math.min(2.1, height / 330),
    motion.crouching ? "#84664b" : "#786058",
    motion.facing,
  );
}

export default function World2DFallback(props: World2DFallbackProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext("2d");
    if (!context) return undefined;

    let frame = 0;
    let pixelRatio = 1;
    let width = 0;
    let height = 0;
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      pixelRatio = Math.min(1.5, window.devicePixelRatio || 1);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };
    const render = () => {
      drawWorld(context, width, height, propsRef.current);
      frame = window.requestAnimationFrame(render);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    frame = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="world-2d-fallback" aria-label="Yedek 2D dünya görünümü">
      <canvas ref={canvasRef} aria-hidden="true" />
      <div className="world-2d-fallback__notice" role="status">
        <span>3D görüntü açılamadı · yedek dünya görünümü açık</span>
        <button type="button" onClick={props.onRetry}>3D'yi dene</button>
      </div>
    </div>
  );
}
