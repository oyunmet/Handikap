import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  createWorldCanarySnapshot,
  recordWorldCanarySample,
  shouldSampleWorldCanary,
  type CanaryPixel,
  type WorldCanarySnapshot,
} from "./world-canary";
import { shouldCountWorldWatchdogFrame } from "./world-render-watchdog";
import { emitWorldDiagnostic } from "./world-diagnostics";

const CANARY_INTERVAL_FRAMES = 30;
const CANARY_RECOVERY_EVENT = "shafak:scene-recovery";

type Props = {
  onStatus?: (snapshot: WorldCanarySnapshot) => void;
};

export default function WorldRenderCanary({ onStatus }: Props) {
  const { gl } = useThree();
  const frameRef = useRef(0);
  const monitorRef = useRef(createWorldCanarySnapshot());
  const onStatusRef = useRef(onStatus);
  const pixel = useMemo(() => new Uint8Array(4), []);
  const target = useMemo(() => new THREE.WebGLRenderTarget(4, 4, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
  }), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: "#ff0000",
    toneMapped: false,
    depthTest: false,
    depthWrite: false,
  }), []);
  const mesh = useMemo(() => {
    const result = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    result.name = "world-render-canary";
    return result;
  }, [material]);
  const canaryScene = useMemo(() => {
    const result = new THREE.Scene();
    result.add(mesh);
    return result;
  }, [mesh]);
  const canaryCamera = useMemo(() => {
    const result = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    result.position.z = 1;
    return result;
  }, []);
  const savedViewport = useMemo(() => new THREE.Vector4(), []);
  const savedScissor = useMemo(() => new THREE.Vector4(), []);

  useEffect(() => {
    onStatusRef.current = onStatus;
  }, [onStatus]);

  useEffect(() => () => {
    target.dispose();
    mesh.geometry.dispose();
    material.dispose();
  }, [material, mesh, target]);

  useFrame((_state, delta) => {
    const frameIsEligible = shouldCountWorldWatchdogFrame({
      active: true,
      visible: document.visibilityState !== "hidden",
      paused: false,
      deltaMs: delta * 1_000,
    });
    if (!frameIsEligible) return;

    frameRef.current += 1;
    if (!shouldSampleWorldCanary(frameRef.current, CANARY_INTERVAL_FRAMES)) return;

    const renderer = gl as THREE.WebGLRenderer;
    const context = renderer.getContext();
    if (context.isContextLost()) return;

    const previousTarget = renderer.getRenderTarget();
    let previousScissorTest = false;
    let savedState = false;
    try {
      renderer.getViewport(savedViewport);
      renderer.getScissor(savedScissor);
      previousScissorTest = renderer.getScissorTest();
      savedState = true;

      renderer.setRenderTarget(target);
      renderer.setViewport(0, 0, 4, 4);
      renderer.setScissorTest(false);
      renderer.clear(true, true, true);
      renderer.render(canaryScene, canaryCamera);
      renderer.readRenderTargetPixels(target, 2, 2, 1, 1, pixel);

      const sample = [pixel[0], pixel[1], pixel[2], pixel[3]] as CanaryPixel;
      const result = recordWorldCanarySample(monitorRef.current, sample);
      monitorRef.current = result.snapshot;
      onStatusRef.current?.(result.snapshot);
      emitWorldDiagnostic(
        "canary",
        `RenderTarget 4×4 · örnek ${result.snapshot.samples}: ${sample.join(",")} · ` +
          `siyah ${result.snapshot.consecutiveBlack}/5.`,
      );

      if (result.shouldRecover) {
        emitWorldDiagnostic(
          "canary",
          `Kanarya beş ardışık örnekte karanlık; neden CANARY_BLACK · ardışık kare ${frameRef.current}.`,
        );
        window.dispatchEvent(new CustomEvent(CANARY_RECOVERY_EVENT, {
          detail: {
            reasonCode: "CANARY_BLACK",
            error: new Error("4×4 WebGLRenderTarget kanaryası beş ardışık ölçümde siyah okundu."),
          },
        }));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      emitWorldDiagnostic("canary", `RenderTarget kanaryası okunamadı: ${message}`);
      monitorRef.current = { ...monitorRef.current, state: "unavailable" };
      onStatusRef.current?.(monitorRef.current);
    } finally {
      if (savedState) {
        renderer.setRenderTarget(previousTarget);
        renderer.setViewport(savedViewport);
        renderer.setScissor(savedScissor);
        renderer.setScissorTest(previousScissorTest);
      }
    }
  }, -1);

  return null;
}
