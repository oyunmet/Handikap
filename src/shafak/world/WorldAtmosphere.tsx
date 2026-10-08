import { useEffect, useRef } from "react";

type Props = { quality: "high" | "balanced" | "low"; motionReduced: boolean; enabled: boolean; travel: number };
type Mote = { x: number; y: number; vx: number; vy: number; size: number; phase: number; kind: number };
const rand = (min: number, max: number) => min + Math.random() * (max - min);

export default function WorldAtmosphere({ quality, motionReduced, enabled, travel }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const travelRef = useRef(travel);
  travelRef.current = travel;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || motionReduced || !enabled) return undefined;
    let cancelled = false;
    let app: import("pixi.js").Application | null = null;
    let observer: ResizeObserver | null = null;
    let tick: ((ticker: import("pixi.js").Ticker) => void) | undefined;

    const mount = async () => {
      try {
        const pixi = await import("pixi.js");
        const { Application, Container, Graphics } = pixi;
        const instance = new Application();
        await instance.init({
          antialias: true,
          autoDensity: true,
          backgroundAlpha: 0,
          preference: "webgl",
          resolution: Math.min(window.devicePixelRatio || 1, quality === "high" ? 1.5 : quality === "balanced" ? 1 : .7),
          resizeTo: host,
          powerPreference: "low-power",
        });
        if (cancelled) {
          instance.destroy();
          return;
        }
        app = instance;
        instance.canvas.setAttribute("aria-hidden", "true");
        instance.canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";
        host.appendChild(instance.canvas);

        const sky = new Container();
        const foreground = new Container();
        instance.stage.addChild(sky, foreground);
        const count = quality === "high" ? 54 : quality === "balanced" ? 22 : 8;
        const motes: Mote[] = Array.from({ length: count }, () => ({
          x: rand(0, host.clientWidth || innerWidth),
          y: rand(0, host.clientHeight || innerHeight),
          vx: rand(-.16, .11),
          vy: rand(-.36, -.08),
          size: rand(.8, 2),
          phase: rand(0, Math.PI * 2),
          kind: Math.random() > .72 ? 1 : 0,
        }));
        const graphics = motes.map((mote) => {
          const shape = new Graphics();
          shape.circle(0, 0, mote.size).fill({
            color: mote.kind ? 0xe3a26b : 0xf0d7a0,
            alpha: mote.kind ? .58 : .4,
          });
          (mote.kind ? foreground : sky).addChild(shape);
          return shape;
        });
        const cloudGraphics = Array.from({ length: 4 }, (_, index) => {
          const cloud = new Graphics();
          cloud.ellipse(0, 0, rand(64, 128), rand(7, 13)).fill({ color: 0xd4a5a0, alpha: .055 });
          sky.addChild(cloud);
          cloud.position.set((host.clientWidth || innerWidth) * (index * .38 - .1), (host.clientHeight || innerHeight) * (.2 + index * .1));
          return cloud;
        });
        const flags = Array.from({ length: 3 }, (_, index) => {
          const flag = new Graphics();
          flag.rect(0, 0, 2, 66).fill({ color: 0x292126, alpha: .65 });
          flag.moveTo(2, 5).lineTo(36, 12).lineTo(28, 26).lineTo(2, 24).closePath()
            .fill({ color: index === 1 ? 0x9b443a : 0x6d3940, alpha: .56 });
          foreground.addChild(flag);
          return flag;
        });
        const torchGlow = new Graphics();
        torchGlow.circle(0, 0, 19).fill({ color: 0xe7a35b, alpha: .085 });
        foreground.addChild(torchGlow);
        const smoke = Array.from({ length: quality === "high" ? 8 : quality === "balanced" ? 4 : 2 }, () => {
          const puff = new Graphics();
          puff.circle(0, 0, rand(3, 8)).fill({ color: 0xb7a2a0, alpha: .08 });
          sky.addChild(puff);
          return { graphic: puff, x: rand(.62, .8), y: rand(.34, .54), phase: rand(0, 6), size: rand(3, 9) };
        });
        const resize = () => {
          // Pixi's resizeTo plugin resizes the canvas; existing coordinates are normalized each frame.
        };
        observer = new ResizeObserver(resize);
        observer.observe(host);
        let elapsed = 0;
        tick = (ticker) => {
          const delta = Math.min(ticker.deltaTime, 2);
          elapsed += ticker.deltaMS / 1000;
          const width = host.clientWidth || innerWidth;
          const height = host.clientHeight || innerHeight;
          const movement = travelRef.current;
          motes.forEach((mote, index) => {
            mote.y += mote.vy * delta;
            mote.x += (mote.vx + Math.sin(elapsed + mote.phase) * .16) * delta;
            if (mote.y < -5) { mote.y = height + rand(2, 32); mote.x = rand(0, width); }
            if (mote.x < -5) mote.x = width + 4;
            if (mote.x > width + 5) mote.x = -4;
            graphics[index].position.set(mote.x, mote.y);
            graphics[index].alpha = (.27 + (Math.sin(elapsed * 2 + mote.phase) + 1) * .22);
          });
          cloudGraphics.forEach((cloud, index) => {
            cloud.x = ((elapsed * (4 + index * 1.7) + width * (index * .38 - .1)) % (width + 320)) - 140;
            cloud.y = height * (.18 + index * .105) + Math.sin(elapsed * .16 + index) * 7;
            cloud.alpha = .92;
          });
          flags.forEach((flag, index) => {
            flag.x = width * (.18 + index * .31) - (movement * (.045 + index * .012) % (width * .35));
            flag.y = height * (.51 + (index % 2) * .09);
            flag.skew.x = Math.sin(elapsed * 2.3 + index) * .12;
          });
          torchGlow.position.set(width * .83, height * .7);
          torchGlow.alpha = .68 + Math.sin(elapsed * 5) * .23;
          smoke.forEach((puff, index) => {
            puff.y -= .00008 * delta;
            if (puff.y < .28) puff.y = .58;
            puff.graphic.position.set(width * puff.x + Math.sin(elapsed * .35 + puff.phase) * 12, height * puff.y);
            puff.graphic.alpha = Math.max(0, .12 - (puff.y < .38 ? .07 : 0));
            puff.graphic.scale.set(.7 + ((elapsed + index) % 5) * .08);
          });
        };
        instance.ticker.add(tick);
      } catch (error) {
        if (!cancelled) console.warn("World atmosphere could not be initialized.", error);
      }
    };
    void mount();
    return () => {
      cancelled = true;
      observer?.disconnect();
      if (tick && app) app.ticker.remove(tick);
      app?.destroy();
      host.querySelector("canvas")?.remove();
    };
  }, [enabled, motionReduced, quality]);

  return <div className="world-atmosphere" ref={hostRef} aria-hidden="true" />;
}
