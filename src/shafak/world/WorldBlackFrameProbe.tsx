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
  const pixels = useMemo(() => new Uint8Array(PROBE_WIDTH * PROBE_HEIGHT * 4), []);
  const target = useMemo(() => manualRender ? null : new THREE.WebGLRenderTarget(PROBE_WIDTH, PROBE_HEIGHT, {
    depthBuffer: true,
    stencilBuffer: false,
    type: THREE.UnsignedByteType,
    format: THREE.RGBAFormat,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    generateMipmaps: false,
  }), [manualRender]);

  useEffect(() => {
    if (!target) return undefined;
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

    try {
      let worldDrawCalls: number;
      if (manualRender) {
        // On touch devices there is no post-processing pass. Render the
        // regular scene here (R3F's positive-priority callback disables its
        // automatic render) and inspect the exact pixels sent to the canvas.
        gl.render(scene, camera);
        worldDrawCalls = gl.info.render.calls;
        const context = gl.getContext();
        const canvas = gl.domElement;
        if (canvas.width < PROBE_WIDTH || canvas.height < PROBE_HEIGHT) return;
        context.readPixels(
          Math.floor(canvas.width / 2 - PROBE_WIDTH / 2),
          Math.floor(canvas.height / 2 - PROBE_HEIGHT / 2),
          PROBE_WIDTH,
          PROBE_HEIGHT,
          context.RGBA,
          context.UNSIGNED_BYTE,
          pixels,
        );
      } else {
        if (!target) return;
        const previousTarget = gl.getRenderTarget();
        const previousViewport = new THREE.Vector4();
        const previousScissor = new THREE.Vector4();
        const previousScissorTest = gl.getScissorTest();
        const previousShadowAutoUpdate = gl.shadowMap.autoUpdate;
        const previousAutoClear = gl.autoClear;
        const previousClearColor = new THREE.Color();
        const previousClearAlpha = gl.getClearAlpha();
        worldDrawCalls = gl.info.render.calls;
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
        } finally {
          gl.setRenderTarget(previousTarget);
          gl.setViewport(previousViewport);
          gl.setScissor(previousScissor);
          gl.setScissorTest(previousScissorTest);
          gl.setClearColor(previousClearColor, previousClearAlpha);
          gl.shadowMap.autoUpdate = previousShadowAutoUpdate;
          gl.autoClear = previousAutoClear;
        }
      }

      const needsRecovery = shouldRecoverWorldFrame(analyzeWorldProbePixels(pixels), worldDrawCalls);
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
