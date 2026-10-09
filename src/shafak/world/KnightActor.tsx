import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import type { CharacterAnimationState } from "./character-animation";
import { KNIGHT_CONFIG } from "./knight-config";
import Knight3D from "./Knight3D";
import { resolveGlbClipName } from "./model-animation";
import type { WorldMotion } from "./movement";

type KnightActorProps = {
  motionRef: MutableRefObject<WorldMotion>;
  state: CharacterAnimationState;
  motionReduced: boolean;
  facingAngle?: number;
  footSlipRef?: MutableRefObject<number>;
};

function OptionalGlbKnight({ motionRef, state, motionReduced, facingAngle, footSlipRef }: KnightActorProps) {
  const gltf = useGLTF(KNIGHT_CONFIG.modelPath);
  const rootRef = useRef<THREE.Group>(null);
  const model = useMemo(() => cloneSkinned(gltf.scene), [gltf.scene]);
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model]);
  const actions = useMemo(() => {
    const entries = gltf.animations.map((clip) => [clip.name, mixer.clipAction(clip)] as const);
    return new Map(entries);
  }, [gltf.animations, mixer]);
  const currentAction = useRef<THREE.AnimationAction | null>(null);
  const selectedClip = resolveGlbClipName(state, gltf.animations.map((clip) => clip.name));
  const selectedAction = selectedClip ? actions.get(selectedClip) ?? null : null;

  useEffect(() => {
    if (!selectedAction) return;
    const previous = currentAction.current;
    selectedAction.reset();
    selectedAction.enabled = true;
    selectedAction.clampWhenFinished = state === "attack" || state === "dodge" || state === "hit" || state === "die";
    selectedAction.setLoop(
      selectedAction.clampWhenFinished ? THREE.LoopOnce : THREE.LoopRepeat,
      selectedAction.clampWhenFinished ? 1 : Infinity,
    );
    selectedAction.fadeIn(0.2).play();
    if (previous && previous !== selectedAction) previous.fadeOut(0.2);
    currentAction.current = selectedAction;
    return () => {
      selectedAction.fadeOut(0.15);
    };
  }, [selectedAction, state]);

  useFrame((_, delta) => {
    const root = rootRef.current;
    const motion = motionRef.current;
    if (root) {
      root.position.x = motion.depth * 5.2;
      root.rotation.y = facingAngle ?? Math.atan2(-motion.velocityX, Math.max(0.01, Math.abs(motion.velocityY)));
      if (facingAngle === undefined && motion.velocityY < -0.25) root.rotation.y = Math.PI + Math.atan2(motion.velocityX, Math.abs(motion.velocityY));
    }
    if (selectedAction) {
      const speed = Math.hypot(motion.velocityX, motion.velocityY);
      selectedAction.timeScale = state === "run"
        ? THREE.MathUtils.clamp(speed / 6, 0.8, 1.35)
        : state === "walk"
          ? THREE.MathUtils.clamp(speed / 2.2, 0.72, 1.2)
          : 1;
    }
    mixer.update(Math.min(delta, 0.05) * (motionReduced ? 0.35 : 1));
    if (footSlipRef) footSlipRef.current = 0;
  });

  useEffect(() => () => {
    mixer.stopAllAction();
    mixer.uncacheRoot(model);
  }, [mixer, model]);

  return (
    <group ref={rootRef}>
      <primitive
        object={model}
        rotation={[0, KNIGHT_CONFIG.modelFacing, 0]}
        scale={KNIGHT_CONFIG.modelScale}
        dispose={null}
      />
    </group>
  );
}

type BoundaryProps = { children: ReactNode; fallback: ReactNode };
type BoundaryState = { failed: boolean };

class ModelErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function KnightActor(props: KnightActorProps) {
  const [modelAvailable, setModelAvailable] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(KNIGHT_CONFIG.modelPath, { method: "HEAD", signal: controller.signal })
      .then((response) => {
        const contentType = response.headers.get("content-type") ?? "";
        setModelAvailable(response.ok && !contentType.includes("text/html"));
      })
      .catch(() => setModelAvailable(false));
    return () => controller.abort();
  }, []);

  const proceduralFallback = <Knight3D {...props} />;
  if (!modelAvailable) return proceduralFallback;
  return (
    <ModelErrorBoundary fallback={proceduralFallback}>
      <Suspense fallback={proceduralFallback}>
        <OptionalGlbKnight {...props} />
      </Suspense>
    </ModelErrorBoundary>
  );
}
