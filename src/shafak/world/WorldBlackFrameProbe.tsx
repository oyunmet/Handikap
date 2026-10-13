import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { analyzeWorldProbePixels, shouldRecoverWorldFrame } from "./world-screen-probe";

const PROBE_WIDTH = 8;
const PROBE_HEIGHT = 4;
const PROBE_INTERVAL_MS = 1_200;
const PROBE_WARMUP_MS = 2_500;
const BLACK_SAMPLES_TO_RECOVER = 3;

export default function WorldBlackFrameProbe({
  onBlackFrame,
}: {
  onBlackFrame: () => void;
}) {
  const { gl, scene, camera } = useThree();
  const startedAtRef = useRef(0);
  const lastProbeAtRef = useRef(0);
  const blackSamplesRef = useRef(0);
  const recoveryRequestedRef = useRef(false);
  const probeDisabledRef = useRef(false);
  const pixels = useMemo(() => new Uint8Array(PROBE_WIDTH * PROBE_HEIGHT * 4), []);
  const target = useMemo(() => new THREE.WebGLRenderTarget(PROBE_WIDTH, PROBE_HEIGHT, {
    depthBuffer: true,
    stencilBuffer: false,
    type: THREE.UnsignedByteType,
    format: THREE.RGBAFormat,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    generateMipmaps: false,
  }), []);

  useEffect(() => {
    target.texture.colorSpace = THREE.SRGBColorSpace;
    target.texture.generateMipmaps = false;
    return () => target.dispose();
  }, [target]);

  useFrame((_, delta) => {
    const now = performance.now();
    if (!startedAtRef.current) startedAtRef.current = now;
    if (
      probeDisabledRef.current
      || recoveryRequestedRef.current
      || document.visibilityState === "hidden"
      || delta > 0.25
      || now - startedAtRef.current < PROBE_WARMUP_MS
      || now - lastProbeAtRef.current < PROBE_INTERVAL_MS
    ) return;
    lastProbeAtRef.current = now;

    if (gl.getContext().isContextLost()) return;

    const previousTarget = gl.getRenderTarget();
    const previousViewport = new THREE.Vector4();
    const previousScissor = new THREE.Vector4();
    const previousScissorTest = gl.getScissorTest();
    const previousShadowAutoUpdate = gl.shadowMap.autoUpdate;
    const previousAutoClear = gl.autoClear;
    const previousClearColor = new THREE.Color();
    const previousClearAlpha = gl.getClearAlpha();
    const worldDrawCalls = gl.info.render.calls;
    gl.getViewport(previousViewport);
    gl.getScissor(previousScissor);
    gl.getClearColor(previousClearColor);

    try {
      gl.shadowMap.autoUpdate = false;
      gl.autoClear = true;
      gl.setRenderTarget(target);
      gl.setScissorTest(false);
      gl.clear(true, true, true);
      gl.render(scene, camera);
      gl.readRenderTargetPixels(target, 0, 0, PROBE_WIDTH, PROBE_HEIGHT, pixels);

      const needsRecovery = shouldRecoverWorldFrame(analyzeWorldProbePixels(pixels), worldDrawCalls);
      blackSamplesRef.current = needsRecovery ? blackSamplesRef.current + 1 : 0;
      if (blackSamplesRef.current >= BLACK_SAMPLES_TO_RECOVER) {
        recoveryRequestedRef.current = true;
        onBlackFrame();
      }
    } catch (error) {
      probeDisabledRef.current = true;
      console.warn("[world] Black-frame sampling failed; WebGL rendering will continue without the probe.", error);
    } finally {
      gl.setRenderTarget(previousTarget);
      gl.setViewport(previousViewport);
      gl.setScissor(previousScissor);
      gl.setScissorTest(previousScissorTest);
      gl.setClearColor(previousClearColor, previousClearAlpha);
      gl.shadowMap.autoUpdate = previousShadowAutoUpdate;
      gl.autoClear = previousAutoClear;
    }
  }, -2);

  return null;
}
