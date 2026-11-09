import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import {
  createPrincessCharacter,
  disposePrincessCharacter,
} from "./princess-character.ts";
import {
  getPrincessFacingYaw,
  getPrincessCameraFrame,
  PRINCESS_BASE_MODEL_URL,
  resolvePrincessAnimationName,
  type PrincessAnimationMood,
} from "./princess-model-config.ts";

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
}: PrincessModelRevealProps) {
  const rootRef = useRef<THREE.Group>(null);
  const cameraWorldPosition = useMemo(() => new THREE.Vector3(), []);
  const rootWorldPosition = useMemo(() => new THREE.Vector3(), []);
  const { camera } = useThree();
  const { scene, animations } = useGLTF(PRINCESS_BASE_MODEL_URL);
  const character = useMemo(
    () => createPrincessCharacter(scene, animations),
    [animations, scene],
  );
  const selectedAnimation = resolvePrincessAnimationName(
    character.animations.map((clip) => clip.name),
    mood,
  );
  const { actions } = useAnimations(character.animations, rootRef);

  useEffect(() => {
    onReady?.();
  }, [character, onReady]);

  useEffect(() => () => disposePrincessCharacter(character), [character]);

  useEffect(() => {
    if (!selectedAnimation) return undefined;
    const action = actions[selectedAnimation];
    if (!action) return undefined;
    action.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.24).play();
    return () => { action.fadeOut(0.18); };
  }, [actions, selectedAnimation]);

  useFrame((_, delta) => {
    const root = rootRef.current;
    if (!root) return;
    camera.getWorldPosition(cameraWorldPosition);
    root.getWorldPosition(rootWorldPosition);
    const targetYaw = getPrincessFacingYaw(rootWorldPosition, cameraWorldPosition);
    const shortestAngle = Math.atan2(
      Math.sin(targetYaw - root.rotation.y),
      Math.cos(targetYaw - root.rotation.y),
    );
    root.rotation.y += shortestAngle * (1 - Math.exp(-4.2 * delta));
  });

  return (
    <group ref={rootRef} name="PrincessFacingRoot" rotation={[0, Math.PI, 0]}>
      <primitive object={character.model} />
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
        <Canvas
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
            <PrincessModel mood={mood} onReady={onReady} onFailure={onFailure} />
          </Suspense>
        </Canvas>
      </PrincessCanvasBoundary>
    </div>
  );
}
