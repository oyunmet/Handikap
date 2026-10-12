import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { WorldMotion } from "../../../shafak/world/movement";
import type { TraversalState } from "../../../shafak/world/traversal";
import WorldV2Atmosphere from "../../../shafak/world/WorldV2Atmosphere";
import WorldV2Terrain from "../../../shafak/world/WorldV2Terrain";
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

function WalkLoop({ motionRef }: { motionRef: React.MutableRefObject<WorldMotion> }) {
  useFrame((_, delta) => {
    const motion = motionRef.current;
    const step = Math.min(delta, 0.05);
    motion.distance += step * 3.6;
    motion.cameraX = motion.distance;
    motion.velocityY = 3.6;
    motion.stepPhase += step * 5.2;
    motion.stepCount += step * 1.7;
    motion.hasMoved = true;
  });
  return null;
}

export function Current() {
  const { motionRef, traversalRef } = usePreviewMotion();
  return (
    <main className="safak-world-preview" aria-label="Current Şafak Savaşçıları 3D walking world">
      <Canvas
        dpr={[1, 1.35]}
        camera={{ position: [0, 7, 18], fov: 46, near: 0.1, far: 420 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        fallback={
          <div className="current-world-fallback">
            <img src="/__mockup/images/current-world.jpg" alt="Current walking world" />
          </div>
        }
      >
        <color attach="background" args={["#252330"]} />
        <hemisphereLight args={["#c6b6b9", "#1a1b2b", 0.62]} />
        <directionalLight position={[-8, 14, 8]} color="#ffd09a" intensity={2.05} />
        <WalkLoop motionRef={motionRef} />
        <WorldV2Atmosphere
          motionRef={motionRef}
          weather="ash"
          quality="balanced"
          motionReduced={false}
        />
        <WorldV2Terrain
          motionRef={motionRef}
          weather="ash"
          quality="balanced"
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
        />
      </Canvas>
    </main>
  );
}
