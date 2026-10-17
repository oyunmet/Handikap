import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import * as THREE from "three";
import {
  analyzeWorldProbePixels,
  getWorldProbeSamplePoints,
  shouldRecoverCanvasFrame,
} from "./world-screen-probe";

const OUTPUT_PROBE_COLUMNS = 4;
const OUTPUT_PROBE_ROWS = 4;
const OUTPUT_PROBE_INTERVAL_MS = 1_200;
const OUTPUT_PROBE_WARMUP_MS = 2_500;
const OUTPUT_BLACK_SAMPLES_TO_RECOVER = 3;

const VignetteGrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    varying vec2 vUv;

    float randomNoise(vec2 point) {
      return fract(sin(dot(point, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec3 color = texture2D(tDiffuse, vUv).rgb;
      float edge = smoothstep(0.28, 0.98, length((vUv - 0.5) * vec2(1.08, 0.86)));
      float grain = (randomNoise(gl_FragCoord.xy + uTime * 60.0) - 0.5) * 0.008;
      color *= 1.0 - edge * 0.15;
      color += grain;
      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

type Pipeline = {
  composer: EffectComposer;
  filmPass: ShaderPass;
  bloomPass: UnrealBloomPass;
};

function ComposerOutput({
  pipeline,
  onBlackFrame,
}: {
  pipeline: Pipeline;
  onBlackFrame: () => void;
}) {
  const { size, gl } = useThree();
  const startedAtRef = useRef(0);
  const lastProbeAtRef = useRef(0);
  const blackSamplesRef = useRef(0);
  const recoveryRequestedRef = useRef(false);
  const probeDisabledRef = useRef(false);
  const pixels = useMemo(() => new Uint8Array(OUTPUT_PROBE_COLUMNS * OUTPUT_PROBE_ROWS * 4), []);

  useEffect(() => {
    pipeline.composer.setSize(size.width, size.height);
  }, [pipeline, size.height, size.width]);

  useFrame((state, delta) => {
    pipeline.filmPass.uniforms.uTime.value = state.clock.elapsedTime;
    pipeline.composer.render(Math.min(delta, 0.05));
    const now = performance.now();
    if (!startedAtRef.current) startedAtRef.current = now;
    if (
      probeDisabledRef.current
      || recoveryRequestedRef.current
      || document.visibilityState === "hidden"
      || delta > 0.25
      || now - startedAtRef.current < OUTPUT_PROBE_WARMUP_MS
      || now - lastProbeAtRef.current < OUTPUT_PROBE_INTERVAL_MS
    ) return;
    lastProbeAtRef.current = now;

    try {
      const context = gl.getContext();
      const points = getWorldProbeSamplePoints(
        gl.domElement.width,
        gl.domElement.height,
        OUTPUT_PROBE_COLUMNS,
        OUTPUT_PROBE_ROWS,
      );
      if (points.length !== pixels.length / 4) return;
      points.forEach(({ x, y }, index) => {
        context.readPixels(
          x,
          y,
          1,
          1,
          context.RGBA,
          context.UNSIGNED_BYTE,
          pixels.subarray(index * 4, index * 4 + 4),
        );
      });

      const needsRecovery = shouldRecoverCanvasFrame(
        analyzeWorldProbePixels(pixels),
        gl.info.render.calls,
      );
      blackSamplesRef.current = needsRecovery ? blackSamplesRef.current + 1 : 0;
      if (blackSamplesRef.current >= OUTPUT_BLACK_SAMPLES_TO_RECOVER) {
        recoveryRequestedRef.current = true;
        onBlackFrame();
      }
    } catch (error) {
      probeDisabledRef.current = true;
      console.warn("[world] Final 3D output sampling failed; post-processing will continue.", error);
    }
  }, 1);

  return null;
}

export default function WorldPostProcessing({
  quality,
  onBlackFrame,
}: {
  quality: "high" | "balanced" | "low";
  onBlackFrame: () => void;
}) {
  const { gl, scene, camera } = useThree();
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);

  useEffect(() => {
    let nextPipeline: Pipeline | null = null;
    try {
      const composer = new EffectComposer(gl);
      composer.addPass(new RenderPass(scene, camera));
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(1, 1),
        quality === "high" ? 0.22 : quality === "balanced" ? 0.14 : 0,
        0.34,
        0.86,
      );
      bloomPass.enabled = quality !== "low";
      composer.addPass(bloomPass);
      const filmPass = new ShaderPass(VignetteGrainShader);
      composer.addPass(filmPass);
      composer.addPass(new OutputPass());
      nextPipeline = { composer, filmPass, bloomPass };
      setPipeline(nextPipeline);
    } catch (error) {
      console.warn("[shafak-world] Post-processing could not start; rendering without it.", error);
      setPipeline(null);
    }

    return () => {
      if (nextPipeline) {
        nextPipeline.composer.dispose();
        setPipeline((current) => current === nextPipeline ? null : current);
      }
    };
  }, [camera, gl, quality, scene]);

  return pipeline ? <ComposerOutput pipeline={pipeline} onBlackFrame={onBlackFrame} /> : null;
}
