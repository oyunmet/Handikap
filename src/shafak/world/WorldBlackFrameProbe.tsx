import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  analyzeWorldProbePixels,
  getWorldProbeTargetSize,
  getWorldDrawCallsForFrame,
  shouldRecoverWorldFrame,
} from "./world-screen-probe";

const PROBE_MAX_DIMENSION = 48;
const PROBE_INTERVAL_MS = 1_200;
const PROBE_WARMUP_MS = 2_500;
const BLACK_SAMPLES_TO_RECOVER = 2;

export default function WorldBlackFrameProbe({
  onBlackFrame,
  manualRender,
}: {
  onBlackFrame: () => void;
  manualRender: boolean;
}) {
  const { gl, scene, camera } = useThree();
  const startedAtRef = useRef(0);
  const lastProbeAtRef = useRef(0);
  const blackSamplesRef = useRef(0);
  const recoveryRequestedRef = useRef(false);
  const probeDisabledRef = useRef(false);
  const pixels = useMemo(() => new Uint8Array(PROBE_MAX_DIMENSION * PROBE_MAX_DIMENSION * 4), []);
  const target = useMemo(() => new THREE.WebGLRenderTarget(PROBE_MAX_DIMENSION, PROBE_MAX_DIMENSION, {
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
    // A positive-priority R3F frame callback takes over automatic rendering,
    // so this path must render on every frame, not only on sampling frames.
    let worldDrawCalls = gl.info.render.calls;
    if (manualRender) {
      try {
        gl.render(scene, camera);
        worldDrawCalls = getWorldDrawCallsForFrame(
          true,
          worldDrawCalls,
          gl.info.render.calls,
        );
      } catch (error) {
        probeDisabledRef.current = true;
        console.warn("[world] Canvas rendering failed; rebuilding the 3D renderer.", error);
        onBlackFrame();
        return;
      }
    }

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

    try {
      const size = getWorldProbeTargetSize(
        gl.domElement.width,
        gl.domElement.height,
        PROBE_MAX_DIMENSION,
      );
      if (!size.width || !size.height) return;
      if (target.width !== size.width || target.height !== size.height) {
        target.setSize(size.width, size.height);
      }

      // Keep the whole viewport at its real aspect ratio. A tiny 8x4 target
      // aliases sky and road into a few colors and can mistake a healthy scene
      // for an empty canvas.
      const previousTarget = gl.getRenderTarget();
      const previousViewport = new THREE.Vector4();
      const previousScissor = new THREE.Vector4();
      const previousScissorTest = gl.getScissorTest();
      const previousShadowAutoUpdate = gl.shadowMap.autoUpdate;
      const previousAutoClear = gl.autoClear;
      const previousClearColor = new THREE.Color();
      const previousClearAlpha = gl.getClearAlpha();
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
        gl.readRenderTargetPixels(
          target,
          0,
          0,
          size.width,
          size.height,
          pixels.subarray(0, size.width * size.height * 4),
        );
      } finally {
        gl.setRenderTarget(previousTarget);
        gl.setViewport(previousViewport);
        gl.setScissor(previousScissor);
        gl.setScissorTest(previousScissorTest);
        gl.setClearColor(previousClearColor, previousClearAlpha);
        gl.shadowMap.autoUpdate = previousShadowAutoUpdate;
        gl.autoClear = previousAutoClear;
      }

      const needsRecovery = shouldRecoverWorldFrame(
        analyzeWorldProbePixels(pixels.subarray(0, size.width * size.height * 4)),
        worldDrawCalls,
      );
      blackSamplesRef.current = needsRecovery ? blackSamplesRef.current + 1 : 0;
      if (blackSamplesRef.current >= BLACK_SAMPLES_TO_RECOVER) {
        recoveryRequestedRef.current = true;
        onBlackFrame();
      }
    } catch (error) {
      probeDisabledRef.current = true;
      console.warn("[world] Black-frame sampling failed; WebGL rendering will continue without the probe.", error);
    }
  }, manualRender ? 1 : -2);

  return null;
}
