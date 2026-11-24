import { Component, Suspense, useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { GameCanvas } from "../../ui/GameCanvasHost";
import * as THREE from "three";
import {
  getPrincessFacingYaw,
  getPrincessCameraFrame,
  type PrincessAnimationMood,
} from "./princess-model-config.ts";
import { createWorldMotion } from "./movement";
import ProceduralHero from "./ProceduralHero";

export type PrincessModelRevealProps = {
  mood: PrincessAnimationMood;
  onReady?: () => void;
  onFailure?: () => void;
};

function PrincessCameraFraming() {
  const { camera } = useThree();

  useEffect(() => {
    const updateCamera = () => {
      const frame = getPrincessCameraFrame(window.innerWidth, window.innerHeight);
      camera.position.set(...frame.position);
      camera.lookAt(...frame.target);
      if (camera instanceof THREE.PerspectiveCamera) camera.fov = frame.fov;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
    };

    updateCamera();
    window.addEventListener("resize", updateCamera);
    return () => window.removeEventListener("resize", updateCamera);
  }, [camera]);

  return null;
}

function PrincessModel({
  mood,
  onReady,
}: Pick<PrincessModelRevealProps, "mood" | "onReady">) {
  const rootRef = useRef<THREE.Group>(null);
  const cameraWorldPosition = useMemo(() => new THREE.Vector3(), []);
  const rootWorldPosition = useMemo(() => new THREE.Vector3(), []);
  const rigRef = useRef<THREE.Group | null>(null);
  const motionRef = useMemo(() => ({ current: createWorldMotion() }), []);
  const { camera } = useThree();
  useEffect(() => {
    onReady?.();
  }, [onReady]);

  useFrame((_, delta) => {
    const root = rootRef.current;
    if (!root) return;
    const motion = motionRef.current;
    motion.velocityX = 0;
    motion.velocityY = mood === "walk" ? 2.2 : 0;
    if (mood === "walk") motion.stepPhase += Math.min(delta, 0.05) * 4.8;
    camera.getWorldPosition(cameraWorldPosition);
    root.getWorldPosition(rootWorldPosition);
    const targetYaw = getPrincessFacingYaw(rootWorldPosition, cameraWorldPosition);
    const shortestAngle = Math.atan2(
      Math.sin(targetYaw - root.rotation.y),
      Math.cos(targetYaw - root.rotation.y),
    );
    root.rotation.y += shortestAngle * (1 - Math.exp(-4.2 * delta));
  });

  const animateMood = useCallback((rig: THREE.Group) => {
    const arm = rig.getObjectByName("RightShoulder");
    const elbow = rig.getObjectByName("RightElbow");
    if (!arm || !elbow) return;
    const time = performance.now() / 1000;
    if (mood === "wave") {
      arm.rotation.x = -0.9;
      arm.rotation.z = -0.28;
      elbow.rotation.x = -0.72 + Math.sin(time * 5.5) * 0.26;
    } else if (mood === "talk") {
      arm.rotation.x = -0.12 + Math.sin(time * 2.4) * 0.08;
      arm.rotation.z = -0.08;
      elbow.rotation.x = -0.16 + Math.sin(time * 2.4 + 1) * 0.12;
    }
  }, [mood]);

  const animationState = mood === "walk" ? "walk" : "idle";

  return (
    <group ref={rootRef} name="PrincessFacingRoot" rotation={[0, Math.PI, 0]}>
      <ProceduralHero
        motionRef={motionRef}
        state={animationState}
        motionReduced={false}
        appearance={{
          armor: "#3e7258",
          armorLight: "#789170",
          armorDark: "#493a31",
          trim: "#d4b25e",
          cape: "#735446",
          hairColor: "#96503b",
          hairStyle: "braided",
          bootColor: "#4a352a",
        }}
        targetHeight={1.7}
        rootRef={rigRef}
        onAfterAnimate={animateMood}
      />
    </group>
  );
}

class PrincessCanvasBoundary extends Component<
  { children: ReactNode; onFailure?: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFailure?.();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function PrincessModelReveal({
  mood,
  onReady,
  onFailure,
}: PrincessModelRevealProps) {
  return (
    <div className="princess-model-reveal" aria-hidden="true">
      <PrincessCanvasBoundary onFailure={onFailure}>
        <GameCanvas
          priority={100}
          sceneId="character-preview"
          camera={{ position: [0, 1.02, 3.1], fov: 34 }}
          dpr={1}
          gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
          onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        >
          <PrincessCameraFraming />
          <ambientLight intensity={1.1} />
          <directionalLight position={[2, 3, 4]} intensity={1.7} />
          <directionalLight position={[-2, 1, -2]} intensity={0.72} color="#d6a96a" />
          <Suspense fallback={null}>
            <PrincessModel mood={mood} onReady={onReady} />
          </Suspense>
        </GameCanvas>
      </PrincessCanvasBoundary>
    </div>
  );
}
