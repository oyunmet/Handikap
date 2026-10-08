import type { Application, Graphics } from "pixi.js";
import { useEffect, useRef } from "react";

type EmberLayerProps = {
  quality: "high" | "balanced";
  motionReduced: boolean;
};

type Ember = {
  graphic: Graphics;
  x: number;
  y: number;
  speed: number;
  drift: number;
  phase: number;
  radius: number;
};

const random = (minimum: number, maximum: number) =>
  minimum + Math.random() * (maximum - minimum);

export default function EmberLayer({ quality, motionReduced }: EmberLayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || motionReduced) return undefined;

    let cancelled = false;
    let app: Application | null = null;
    let resizeObserver: ResizeObserver | null = null;
    const particles: Ember[] = [];

    const mount = async () => {
      try {
        const { Application, Container, Graphics: PixiGraphics } = await import("pixi.js");
        app = new Application();
        await app.init({
          antialias: true,
          autoDensity: true,
          backgroundAlpha: 0,
          preference: "webgl",
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          resizeTo: host,
        });

        if (cancelled || !app) {
          app?.destroy();
          app = null;
          return;
        }

        app.canvas.className = "ember-layer__canvas";
        app.canvas.setAttribute("aria-hidden", "true");
        host.appendChild(app.canvas);

        const layer = new Container();
        app.stage.addChild(layer);
        const count = quality === "high" ? 34 : 14;
        const colors = [0xf2c66f, 0xc8513d, 0x8d5a48];

        for (let index = 0; index < count; index += 1) {
          const radius = random(0.8, quality === "high" ? 2.2 : 1.5);
          const graphic = new PixiGraphics()
            .circle(0, 0, radius)
            .fill({ color: colors[index % colors.length], alpha: random(0.38, 0.88) });
          const ember: Ember = {
            graphic,
            x: random(0, host.clientWidth || window.innerWidth),
            y: random(0, host.clientHeight || window.innerHeight),
            speed: random(0.16, 0.7),
            drift: random(-0.22, 0.22),
            phase: random(0, Math.PI * 2),
            radius,
          };
          graphic.position.set(ember.x, ember.y);
          layer.addChild(graphic);
          particles.push(ember);
        }

        resizeObserver = new ResizeObserver(() => {
          particles.forEach((ember) => {
            ember.x = Math.min(ember.x, host.clientWidth);
            ember.y = Math.min(ember.y, host.clientHeight);
          });
        });
        resizeObserver.observe(host);

        app.ticker.add((ticker) => {
          const delta = Math.min(ticker.deltaTime, 2);
          const elapsed = ticker.lastTime / 1000;
          particles.forEach((ember) => {
            ember.y -= ember.speed * delta;
            ember.x += (ember.drift + Math.sin(elapsed + ember.phase) * 0.13) * delta;
            if (ember.y < -8) {
              ember.y = host.clientHeight + random(2, 50);
              ember.x = random(0, host.clientWidth);
            }
            if (ember.x < -8) ember.x = host.clientWidth + 4;
            if (ember.x > host.clientWidth + 8) ember.x = -4;
            ember.graphic.position.set(ember.x, ember.y);
            ember.graphic.alpha = 0.34 + (Math.sin(elapsed * 2.2 + ember.phase) + 1) * 0.27;
            ember.graphic.scale.set(
              0.82 + (Math.sin(elapsed * 1.7 + ember.phase) + 1) * 0.16,
            );
          });
        });
      } catch (error) {
        if (!cancelled) console.warn("PixiJS ember layer could not start.", error);
        app?.destroy();
        app = null;
      }
    };

    void mount();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      app?.destroy();
      app = null;
      host.querySelector("canvas")?.remove();
    };
  }, [motionReduced, quality]);

  return <div className="ember-layer" ref={hostRef} aria-hidden="true" />;
}
