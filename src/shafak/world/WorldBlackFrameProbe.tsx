import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  analyzeWorldProbePixels,
  isLikelyBlackWorldFrame,
  shouldTriggerWorldBlackRecovery,
  type WorldProbeRecoveryState,
} from "./world-screen-probe";
import { emitWorldDiagnostic } from "./world-diagnostics";

const PROBE_WIDTH = 32;
const PROBE_HEIGHT = 18;
const PROBE_INTERVAL_FRAMES = 15;

export default function WorldBlackFrameProbe({
  recoveryStateRef,
}: {
  recoveryStateRef: MutableRefObject<WorldProbeRecoveryState>;
}) {
  const { gl, scene, camera } = useThree();
  const frameRef = useRef(0);
  const blackSamplesRef = useRef(recoveryStateRef.current.blackSamples);
  const recoveryRef = recoveryStateRef;
  const pixelBuffer = useMemo(() => new Uint8Array(PROBE_WIDTH * PROBE_HEIGHT * 4), []);
  const target = useMemo(() => {
    const result = new THREE.WebGLRenderTarget(PROBE_WIDTH, PROBE_HEIGHT, {
      depthBuffer: true,
      stencilBuffer: false,
      type: THREE.UnsignedByteType,
      format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      generateMipmaps: false,
    });
    result.texture.colorSpace = THREE.SRGBColorSpace;
    result.texture.generateMipmaps = false;
    return result;
  }, []);
  useEffect(() => () => target.dispose(), [target]);

  useFrame(({ clock }, delta) => {
    frameRef.current += 1;
    const now = performance.now();
    recoveryRef.current.firstFrameAt ||= now;
    if (
      frameRef.current % PROBE_INTERVAL_FRAMES !== 0
      || document.visibilityState === "hidden"
      || delta > 0.25
    ) return;

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
      if (gl.getContext().isContextLost()) return;
      if (now - recoveryRef.current.firstFrameAt < 20_000) {
        blackSamplesRef.current = 0;
        recoveryRef.current.blackSamples = 0;
        recoveryRef.current.detectionEmitted = false;
        recoveryRef.current.healthySamples = 0;
      }
      gl.shadowMap.autoUpdate = false;
      gl.autoClear = true;
      gl.setRenderTarget(target);
      gl.setScissorTest(false);
      gl.clear(true, true, true);
      gl.render(scene, camera);
      gl.readRenderTargetPixels(target, 0, 0, PROBE_WIDTH, PROBE_HEIGHT, pixelBuffer);
      const metrics = analyzeWorldProbePixels(pixelBuffer);
      const black = isLikelyBlackWorldFrame(metrics);
      if (black) {
        blackSamplesRef.current += 1;
        recoveryRef.current.healthySamples = 0;
      } else {
        blackSamplesRef.current = 0;
        recoveryRef.current.healthySamples = recoveryRef.current.detectionEmitted
          ? (recoveryRef.current.healthySamples ?? 0) + 1
          : 0;
      }
      recoveryRef.current.blackSamples = blackSamplesRef.current;
      if (
        !black
        && recoveryRef.current.detectionEmitted
        && (recoveryRef.current.healthySamples ?? 0) >= 40
      ) {
        recoveryRef.current.detectionEmitted = false;
        recoveryRef.current.healthySamples = 0;
        window.dispatchEvent(new CustomEvent("shafak:black-frame-healthy"));
        return;
      }
      if (!black) return;

      if (blackSamplesRef.current < 5 || now - recoveryRef.current.firstFrameAt < 20_000) return;
      if (!recoveryRef.current.detectionEmitted) {
        emitWorldDiagnostic(
          "black-frame-probe",
          `RT ${PROBE_WIDTH}×${PROBE_HEIGHT}: ortalama parlaklık=${metrics.averageLuminance.toFixed(4)}, ` +
            `farklı renk=${metrics.uniqueColors}, art arda siyah=${blackSamplesRef.current}/5.`,
        );
        recoveryRef.current.detectionEmitted = true;
        window.dispatchEvent(new CustomEvent("shafak:black-frame-detected", {
          detail: {
            at: new Date().toISOString(),
            averageLuminance: metrics.averageLuminance,
            uniqueColors: metrics.uniqueColors,
            blackSamples: blackSamplesRef.current,
            elapsedMs: Math.round(clock.elapsedTime * 1_000),
          },
        }));
        window.dispatchEvent(new CustomEvent("shafak:scene-low-brightness"));
      }

      if (now - (recoveryRef.current.lastRecoveryAttemptAt ?? 0) >= 10_000) {
        recoveryRef.current.lastRecoveryAttemptAt = now;
        const eligible = shouldTriggerWorldBlackRecovery(recoveryRef.current, {
          now,
          frameMs: delta * 1_000,
          hidden: document.hidden,
          black: true,
        });
        if (eligible) {
          emitWorldDiagnostic("recovery", "Gerçek sahne render-target örneği 5 kez siyah; otomatik kurtarma başlatılıyor.");
          window.dispatchEvent(new CustomEvent("shafak:scene-recovery", {
            detail: { message: "32×18 sahne render-target örneği 5 kez siyah.", source: "black-frame-probe" },
          }));
        } else {
          emitWorldDiagnostic("recovery", "Siyah sahne ölçüldü ancak kurtarma 20 sn ısınma/1 dk hız sınırı nedeniyle başlatılmadı.");
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      emitWorldDiagnostic("black-frame-probe", `Render-target ölçümü kullanılamıyor: ${message}`);
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
