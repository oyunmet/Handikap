import { useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import type { RenderQuality } from "./graphics-quality";

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
      float grain = (randomNoise(gl_FragCoord.xy + uTime * 60.0) - 0.5) * 0.014;
      color *= 1.0 - edge * 0.18;
      color += grain;
      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

type Pipeline = {
  composer: EffectComposer;
  filmPass: ShaderPass;
};

function ComposerOutput({ pipeline }: { pipeline: Pipeline }) {
  const { size } = useThree();

  useEffect(() => {
    pipeline.composer.setSize(size.width, size.height);
  }, [pipeline, size.height, size.width]);

  useFrame((state, delta) => {
    pipeline.filmPass.uniforms.uTime.value = state.clock.elapsedTime;
    pipeline.composer.render(Math.min(delta, 0.05));
  }, 1);

  return null;
}

export default function WorldPostProcessing({ quality }: { quality: RenderQuality }) {
  const { gl, scene, camera } = useThree();
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);

  useEffect(() => {
    let nextPipeline: Pipeline | null = null;
    try {
      const composer = new EffectComposer(gl);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(new UnrealBloomPass(
        new THREE.Vector2(1, 1),
        quality === "high" ? 0.2 : 0.12,
        0.52,
        0.82,
      ));
      const filmPass = new ShaderPass(VignetteGrainShader);
      composer.addPass(filmPass);
      composer.addPass(new OutputPass());
      nextPipeline = { composer, filmPass };
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

  return pipeline ? <ComposerOutput pipeline={pipeline} /> : null;
}
