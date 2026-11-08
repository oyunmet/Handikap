import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { Box3, Group, Vector3 } from "three";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import {
  isPrincessModelResponseUsable,
  PRINCESS_MODEL_URL,
  resolvePrincessAnimationName,
  type PrincessAnimationMood,
} from "./princess-model-config";

export type PrincessModelRevealProps = {
  mood: PrincessAnimationMood;
  onReady?: () => void;
};

function PrincessModel({
  mood,
  onReady,
}: PrincessModelRevealProps) {
  const groupRef = useRef<Group>(null);
  const { scene, animations } = useGLTF(PRINCESS_MODEL_URL);
  const fittedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(clone);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    const scale = size.y > 0 ? 1.8 / size.y : 1;
    clone.scale.setScalar(scale);
    clone.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    return clone;
  }, [scene]);
  const animationNames = useMemo(() => animations.map((clip) => clip.name), [animations]);
  const selectedAnimation = resolvePrincessAnimationName(animationNames, mood);
  const { actions } = useAnimations(animations, groupRef);

  useEffect(() => {
    onReady?.();
  }, [fittedScene, onReady]);

  useEffect(() => {
    if (!selectedAnimation) return undefined;
    const action = actions[selectedAnimation];
    if (!action) return undefined;
    action.reset().fadeIn(0.2).play();
    return () => { action.fadeOut(0.16); };
  }, [actions, selectedAnimation]);

  return (
    <group ref={groupRef} position={[0, -0.88, 0]}>
      <primitive object={fittedScene} />
    </group>
  );
}

class PrincessCanvasBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function PrincessModelReveal({ mood, onReady }: PrincessModelRevealProps) {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void fetch(PRINCESS_MODEL_URL, {
      method: "HEAD",
      cache: "no-cache",
      signal: controller.signal,
    }).then((response) => {
      if (!active) return;
      setAvailable(isPrincessModelResponseUsable(
        response.status,
        response.headers.get("content-type"),
        response.headers.get("content-length"),
      ));
    }).catch(() => {
      if (active) setAvailable(false);
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  if (!available) return null;

  return (
    <div className="princess-model-reveal" aria-hidden="true">
      <PrincessCanvasBoundary>
        <Canvas
          camera={{ position: [0, 0.94, 3.3], fov: 34 }}
          dpr={1}
          gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
          onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        >
          <ambientLight intensity={1.15} />
          <directionalLight position={[2, 3, 4]} intensity={1.8} />
          <directionalLight position={[-2, 1, -2]} intensity={0.65} color="#d6a96a" />
          <Suspense fallback={null}>
            <PrincessModel mood={mood} onReady={onReady} />
          </Suspense>
        </Canvas>
      </PrincessCanvasBoundary>
    </div>
  );
}
