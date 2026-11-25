import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { GameCanvas } from "../../ui/GameCanvasHost";
import * as THREE from "three";
import {
  getPrincessFacingYaw,
  getPrincessCameraFrame,
  type PrincessAnimationMood,
} from "./princess-model-config.ts";
import FantasyKnightModel from "./FantasyKnightModel";

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
  onReady,
}: Pick<PrincessModelRevealProps, "onReady">) {
  const rootRef = useRef<THREE.Group>(null);
  const cameraWorldPosition = useMemo(() => new THREE.Vector3(), []);
  const rootWorldPosition = useMemo(() => new THREE.Vector3(), []);
  const { camera } = useThree();
  useEffect(() => {
    onReady?.();
  }, [onReady]);

  useFrame((_, delta) => {
    const root = rootRef.current;
    if (!root) return;
    camera.getWorldPosition(cameraWorldPosition);
    root.getWorldPosition(rootWorldPosition);
    root.rotation.y = getPrincessFacingYaw(rootWorldPosition, cameraWorldPosition);
  });

  return (
    <group ref={rootRef} name="PrincessFacingRoot" rotation={[0, Math.PI, 0]}>
      <FantasyKnightModel
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
            <PrincessModel onReady={onReady} />
          </Suspense>
        </GameCanvas>
      </PrincessCanvasBoundary>
    </div>
  );
}
