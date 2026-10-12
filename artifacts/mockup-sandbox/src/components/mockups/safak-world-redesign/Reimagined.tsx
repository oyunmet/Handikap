import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { WorldMotion } from "../../../shafak/world/movement";
import type { TraversalState } from "../../../shafak/world/traversal";
import WorldV2Environment from "../../../shafak/world/WorldV2Environment";
import { WorldV2Travel } from "../../../shafak/world/WorldV2Gameplay";
import "./_group.css";

function usePreviewMotion() {
  const motionRef = useRef<WorldMotion>({
    velocityX: 0,
    velocityY: 0,
    depth: 0,
    distance: 0,
    originDistance: 0,
    cameraX: 0,
    stepPhase: 0,
    stepCount: 0,
    stopTime: 0,
    hasMoved: false,
    zoom: 1,
    cameraLead: 0,
    facing: 1,
  });
  const traversalRef = useRef<TraversalState>({
    jumpHeight: 0,
    verticalVelocity: 0,
    grounded: true,
    jumpsUsed: 0,
    coyoteTime: 0,
    jumpBuffer: 0,
    stamina: 100,
    dashTime: 0,
    dashCooldown: 0,
    activity: "running",
  });
  return { motionRef, traversalRef };
}

function PreviewWalk({ motionRef }: { motionRef: React.MutableRefObject<WorldMotion> }) {
  useFrame((_, delta) => {
    const motion = motionRef.current;
    const step = Math.min(delta, 0.05);
    motion.distance += step * 1.35;
    motion.cameraX = motion.distance;
    motion.velocityY = 1.35;
    motion.stepPhase += step * 2.8;
    motion.stepCount += step * 0.9;
    motion.hasMoved = true;
  });
  return null;
}

function FallbackPoster() {
  return (
    <svg className="safak-world-poster" viewBox="0 0 1600 900" role="img" aria-label="Ash-buried pilgrimage road through split basalt ruins at dawn">
      <defs>
        <linearGradient id="dawn-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#171b2a" />
          <stop offset="0.53" stopColor="#39333d" />
          <stop offset="0.78" stopColor="#aa634d" />
          <stop offset="1" stopColor="#e3a16c" />
        </linearGradient>
        <radialGradient id="sun-glow">
          <stop offset="0" stopColor="#ffe1b0" stopOpacity=".95" />
          <stop offset=".25" stopColor="#f7b47a" stopOpacity=".55" />
          <stop offset="1" stopColor="#f49c68" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="road-dust" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0" stopColor="#524548" />
          <stop offset="1" stopColor="#24252e" />
        </linearGradient>
        <linearGradient id="ash-haze" x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#dfad88" stopOpacity="0" />
          <stop offset=".5" stopColor="#e4b393" stopOpacity=".28" />
          <stop offset="1" stopColor="#dfad88" stopOpacity="0" />
        </linearGradient>
        <filter id="soften">
          <feGaussianBlur stdDeviation="28" />
        </filter>
      </defs>
      <rect width="1600" height="900" fill="url(#dawn-sky)" />
      <ellipse cx="812" cy="500" rx="288" ry="178" fill="url(#sun-glow)" filter="url(#soften)" />
      <circle cx="812" cy="510" r="57" fill="#ffd09a" opacity=".78" />
      <path d="M0 523 105 448 205 479 345 397 466 471 605 391 734 467 851 401 982 475 1114 396 1273 469 1400 405 1600 464V666H0Z" fill="#403843" opacity=".76" />
      <path d="M0 577 129 504 242 539 365 464 489 526 623 461 758 531 888 474 1036 540 1165 468 1306 531 1462 469 1600 526V704H0Z" fill="#34313b" opacity=".88" />
      <path d="M0 623 152 565 286 606 430 528 563 601 688 543 825 605 962 535 1104 609 1241 550 1370 608 1517 540 1600 571V770H0Z" fill="#292a34" />
      <path d="M0 672 244 620 405 674 563 610 729 675 916 607 1067 669 1256 615 1432 677 1600 632V900H0Z" fill="#29272f" />
      <path d="M0 680 304 643 522 708 668 651 813 708 1016 646 1194 703 1382 653 1600 690V900H0Z" fill="#24252e" opacity=".74" />
      <path d="M656 900 719 693 763 603 789 559 837 559 864 608 905 695 1002 900Z" fill="url(#road-dust)" />
      <path d="M704 900 758 690 784 614 801 574 817 574 834 615 864 696 960 900Z" fill="#58474a" opacity=".58" />
      <path d="M789 585 797 585 798 900 776 900Z" fill="#d5a17c" opacity=".13" />
      <g fill="#24242e">
        <path d="M155 690 164 422 210 400 253 438 266 673 226 697Z" />
        <path d="m158 423 5-30 49-17 39 31-1 30-28-14-29 11-31-11Z" />
        <path d="M278 684 288 497 320 479 356 500 364 691 334 711Z" />
        <path d="M1334 684 1336 455 1377 424 1423 449 1437 698 1393 713Z" />
        <path d="m1336 455 5-39 38-23 42 31 1 25-34-12-22 15-28-5Z" />
        <path d="M1240 687 1255 505 1285 489 1315 516 1310 699 1277 711Z" />
        <path d="M400 708 408 578 438 556 468 575 470 728 435 737Z" opacity=".74" />
        <path d="M1136 705 1146 564 1174 550 1203 577 1204 722 1168 733Z" opacity=".72" />
      </g>
      <g fill="#4b4147">
        <path d="m165 430 40-13 44 17-9 16-29-10-27 12-19-5Z" />
        <path d="m1346 462 33-18 37 16-9 15-27-6-19 11-15-7Z" />
        <path d="m290 509 30-18 32 17-5 14-24-6-17 9-16-5Z" />
      </g>
      <path d="M0 749Q342 716 585 774T1069 771Q1322 722 1600 766V900H0Z" fill="#1f222b" opacity=".72" />
      <path d="M0 623h1600v116H0Z" fill="url(#ash-haze)" />
      <g fill="#e3c1a1" opacity=".52">
        <circle cx="199" cy="557" r="2" /><circle cx="336" cy="642" r="1.8" /><circle cx="476" cy="594" r="1.5" />
        <circle cx="580" cy="689" r="1.8" /><circle cx="1061" cy="626" r="2" /><circle cx="1218" cy="582" r="1.5" />
        <circle cx="1412" cy="656" r="2" /><circle cx="1512" cy="561" r="1.5" /><circle cx="274" cy="752" r="1.4" />
      </g>
      <g transform="translate(811 771)" fill="#1c2028">
        <path d="M-9 12-8-17-5-33 0-39 7-33 9-17 11 12 6 22-5 22Z" />
        <path d="m-7-28-13 7-7 22 6 2 11-17 8-4Z" />
        <path d="m7-29 12 8 8 21-7 2-12-17-8-4Z" />
        <path d="M-5 19-12 48-7 51 0 34 5 50 11 48 6 20Z" />
        <path d="M-7-34-4-43 4-43 8-34 4-29-5-30Z" />
        <path d="M8-38 21-58 24-56 12-32Z" />
        <path d="m-11-24-11-8 2-4 15 7Z" fill="#443a3b" />
      </g>
      <rect y="0" width="1600" height="900" fill="url(#ash-haze)" opacity=".14" />
    </svg>
  );
}

export function Reimagined() {
  const { motionRef, traversalRef } = usePreviewMotion();
  return (
    <main className="safak-world-preview safak-world-preview--reimagined" aria-label="Şafak Savaşçıları ash pilgrimage world">
      <Canvas
        dpr={[1, 1.45]}
        camera={{ position: [0, 6.2, 14.5], fov: 44, near: 0.1, far: 520 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        fallback={<FallbackPoster />}
      >
        <PreviewWalk motionRef={motionRef} />
        <WorldV2Environment
          motionRef={motionRef}
          weather="ash"
          quality="balanced"
          motionReduced={false}
        />
        <WorldV2Travel
          motionRef={motionRef}
          traversalRef={traversalRef}
          animationState="walk"
          motionReduced={false}
          quality="balanced"
          rivals={[]}
          collectedPickupIds={new Set()}
          brokenObstacleIds={new Set()}
          focusedRival={null}
          equipmentVisual={{
            armor: "#706b65",
            cape: "#623c39",
            weaponStyle: "sword",
            weaponColor: "#c5a477",
          }}
          level={1}
          relicCount={0}
          lightRadius={1}
          renderRoad={false}
        />
      </Canvas>
    </main>
  );
}

export default Reimagined;
