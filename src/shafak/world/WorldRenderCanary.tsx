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
import { emitWorldDiagnostic } from "./world-diagnostics";

const CANARY_INTERVAL_FRAMES = 30;
const CANARY_RECOVERY_EVENT = "shafak:scene-recovery";
const CANARY_LIGHTING_EVENT = "shafak:scene-low-brightness";

type Props = {
  onStatus?: (snapshot: WorldCanarySnapshot) => void;
};

function readPixel(
  renderer: THREE.WebGLRenderer,
  context: WebGL2RenderingContext,
  x: number,
  y: number,
  target: Uint8Array,
) {
  const renderTarget = renderer.getRenderTarget();
  if (renderTarget) {
    renderer.readRenderTargetPixels(renderTarget, x, y, 1, 1, target);
  } else {
    context.readPixels(x, y, 1, 1, context.RGBA, context.UNSIGNED_BYTE, target);
  }
  return [target[0], target[1], target[2], target[3]] as CanaryPixel;
}

export default function WorldRenderCanary({ onStatus }: Props) {
  const { camera, gl, scene, size } = useThree();
  const frameRef = useRef(0);
  const samplePendingRef = useRef(false);
  const monitorRef = useRef(createWorldCanarySnapshot());
  const recoverySentRef = useRef(false);
  const lightingResetSentRef = useRef(false);
  const targetSize = useMemo(() => new THREE.Vector2(), []);
  const savedViewport = useMemo(() => new THREE.Vector4(), []);
  const savedScissor = useMemo(() => new THREE.Vector4(), []);
  const canaryPixel = useMemo(() => new Uint8Array(4), []);
  const scenePixel = useMemo(() => new Uint8Array(4), []);
  const worldPosition = useMemo(() => new THREE.Vector3(), []);
  const worldQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const onStatusRef = useRef(onStatus);
  const mesh = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: "#ff0000",
      depthTest: false,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    });
    const result = new THREE.Mesh(geometry, material);
    result.name = "world-render-canary";
    result.frustumCulled = false;
    result.renderOrder = 1_000_000;
    result.visible = false;
    return result;
  }, []);

  useEffect(() => {
    onStatusRef.current = onStatus;
  }, [onStatus]);

  useEffect(() => {
    scene.add(mesh);
    const previousViewport = new THREE.Vector4();
    const previousScissor = new THREE.Vector4();
    let previousScissorTest = false;
    let savedState = false;

    mesh.onBeforeRender = (renderer) => {
      if (!samplePendingRef.current) return;
      const activeRenderer = renderer as THREE.WebGLRenderer;
      const dpr = Math.max(1, activeRenderer.getPixelRatio());
      activeRenderer.getDrawingBufferSize(targetSize);
      activeRenderer.getViewport(previousViewport);
      activeRenderer.getScissor(previousScissor);
      previousScissorTest = activeRenderer.getScissorTest();
      savedState = true;

      const bufferWidth = Math.max(4, Math.floor(targetSize.x));
      const logicalWidth = bufferWidth / dpr;
      const logicalHeight = Math.max(4, Math.floor(targetSize.y)) / dpr;
      const canarySize = 4 / dpr;
      activeRenderer.setViewport(0, 0, logicalWidth, logicalHeight);
      activeRenderer.setScissor(logicalWidth - canarySize, 0, canarySize, canarySize);
      activeRenderer.setScissorTest(true);
    };

    mesh.onAfterRender = (renderer) => {
      if (!samplePendingRef.current) return;
      samplePendingRef.current = false;
      const activeRenderer = renderer as THREE.WebGLRenderer;
      const context = activeRenderer.getContext() as WebGL2RenderingContext;
      try {
        if (context.isContextLost()) return;
        activeRenderer.getDrawingBufferSize(targetSize);
        const width = Math.max(1, Math.floor(targetSize.x));
        const height = Math.max(1, Math.floor(targetSize.y));
        const pixel = readPixel(activeRenderer, context, width - 2, 2, canaryPixel);
        const brightnessPixels: CanaryPixel[] = [];
        const points = [
          [Math.round(width * 0.34), Math.round(height * 0.48)],
          [Math.round(width * 0.5), Math.round(height * 0.52)],
          [Math.round(width * 0.68), Math.round(height * 0.48)],
        ] as const;
        for (const [x, y] of points) {
          brightnessPixels.push(readPixel(
            activeRenderer,
            context,
            THREE.MathUtils.clamp(x, 0, width - 1),
            THREE.MathUtils.clamp(y, 0, height - 1),
            scenePixel,
          ));
        }

        const result = recordWorldCanarySample(monitorRef.current, pixel, brightnessPixels);
        monitorRef.current = result.snapshot;
        onStatusRef.current?.(result.snapshot);
        emitWorldDiagnostic(
          "canary",
          `Örnek ${result.snapshot.samples}: ${pixel[0]},${pixel[1]},${pixel[2]} · ` +
          `karanlık ${result.snapshot.consecutiveBlack}/5 · ` +
          `sahne parlaklığı ${result.snapshot.lastSceneLuminance?.toFixed(3) ?? "yok"}.`,
        );

        if (result.shouldRestoreLighting && !lightingResetSentRef.current) {
          lightingResetSentRef.current = true;
          emitWorldDiagnostic("lighting", "Kanarya parlak; sahne karanlık. Biyom güvenli ışığı, sisi ve pozlaması geri yükleniyor.");
          window.dispatchEvent(new CustomEvent(CANARY_LIGHTING_EVENT));
        }
        if (result.snapshot.consecutiveDim === 0) lightingResetSentRef.current = false;

        if (result.shouldRecover && !recoverySentRef.current) {
          recoverySentRef.current = true;
          emitWorldDiagnostic("canary", "Kanarya beş ölçüm üst üste siyah; render hattı kurtarma başlatıyor.");
          window.dispatchEvent(new CustomEvent(CANARY_RECOVERY_EVENT, {
            detail: { error: new Error("Üretim kanaryası 5 ardışık ölçümde siyah okundu.") },
          }));
        }
        if (result.snapshot.consecutiveBlack === 0) recoverySentRef.current = false;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        emitWorldDiagnostic("canary", `Kanarya pikseli okunamadı: ${message}`);
        monitorRef.current = { ...monitorRef.current, state: "unavailable" };
        onStatusRef.current?.(monitorRef.current);
      } finally {
        if (savedState) {
          activeRenderer.setViewport(previousViewport);
          activeRenderer.setScissor(previousScissor);
          activeRenderer.setScissorTest(previousScissorTest);
          savedState = false;
        }
      }
    };

    return () => {
      scene.remove(mesh);
      mesh.onBeforeRender = () => undefined;
      mesh.onAfterRender = () => undefined;
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    };
  }, [canaryPixel, mesh, scene, scenePixel, targetSize]);

  useFrame(({ camera: activeCamera, size: activeSize }) => {
    frameRef.current += 1;
    const sampleNow = shouldSampleWorldCanary(frameRef.current, CANARY_INTERVAL_FRAMES);
    mesh.visible = sampleNow;
    samplePendingRef.current = sampleNow;
    if (!sampleNow || !(activeCamera instanceof THREE.PerspectiveCamera)) return;

    const dpr = Math.max(1, gl.getPixelRatio());
    const drawingBufferHeight = Math.max(1, activeSize.height * dpr);
    const safeFov = Number.isFinite(activeCamera.fov)
      ? THREE.MathUtils.clamp(activeCamera.fov, 20, 100)
      : 54;
    const distance = Math.max(activeCamera.near + 0.12, 0.72);
    const viewHeight = 2 * distance * Math.tan(THREE.MathUtils.degToRad(safeFov) * 0.5);
    const pixelWorldSize = viewHeight / drawingBufferHeight;
    const viewWidth = viewHeight * Math.max(0.2, activeCamera.aspect);
    const canaryWorldSize = pixelWorldSize * 4;
    mesh.scale.set(canaryWorldSize, canaryWorldSize, 1);
    worldPosition.set(
      viewWidth * 0.5 - pixelWorldSize * 2.5,
      -viewHeight * 0.5 + pixelWorldSize * 2.5,
      -distance,
    );
    activeCamera.localToWorld(worldPosition);
    activeCamera.getWorldQuaternion(worldQuaternion);
    mesh.position.copy(worldPosition);
    mesh.quaternion.copy(worldQuaternion);
    mesh.updateMatrix();
  }, -1);

  return null;
}
