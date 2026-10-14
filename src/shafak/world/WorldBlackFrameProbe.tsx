import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  analyzeWorldProbePixels,
  getWorldProbeSamplePoints,
  getWorldDrawCallsForFrame,
  shouldRecoverCanvasFrame,
} from "./world-screen-probe";

const CANVAS_PROBE_COLUMNS = 4;
const CANVAS_PROBE_ROWS = 4;
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
  const canvasPixels = useMemo(
    () => new Uint8Array(CANVAS_PROBE_COLUMNS * CANVAS_PROBE_ROWS * 4),
    [],
  );

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
      // Inspect only pixels already presented by the real renderer. A second
      // render into an offscreen target mutates WebGL's viewport and render
      // state, and can itself produce the intermittent blank frame this probe
      // is meant to catch.
      const context = gl.getContext();
      const points = getWorldProbeSamplePoints(
        gl.domElement.width,
        gl.domElement.height,
        CANVAS_PROBE_COLUMNS,
        CANVAS_PROBE_ROWS,
      );
      if (points.length !== canvasPixels.length / 4) return;
      points.forEach(({ x, y }, index) => {
        context.readPixels(
          x,
          y,
          1,
          1,
          context.RGBA,
          context.UNSIGNED_BYTE,
          canvasPixels.subarray(index * 4, index * 4 + 4),
        );
      });

      const needsRecovery = shouldRecoverCanvasFrame(
        analyzeWorldProbePixels(canvasPixels),
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
