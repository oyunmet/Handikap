import {
  Canvas,
  createPortal,
  useFrame,
  useThree,
  type Camera as FiberCamera,
  type CanvasProps,
  type RootState,
} from "@react-three/fiber";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import {
  Euler,
  OrthographicCamera,
  PerspectiveCamera,
  Scene,
  Vector3,
  type WebGLRenderer,
  type WebGLRendererParameters,
} from "three";
import type { GameSceneId } from "../modes/mode";
import { useGameRuntimeStore } from "../state/game-store";
import { sharedGameRuntime } from "../core/game-runtime";
import "./game-canvas-host.css";

type SharedCanvasSettings = Pick<
  CanvasProps,
  "camera" | "dpr" | "fallback" | "frameloop" | "gl" | "onCreated" | "orthographic" | "resize" | "shadows"
>;

export interface GameCanvasProps extends SharedCanvasSettings {
  children?: ReactNode;
  className?: string;
  interactive?: boolean;
  priority?: number;
  resetKey?: string | number;
  sceneId?: GameSceneId;
  style?: CSSProperties;
}

interface CanvasRequest extends GameCanvasProps {
  id: string;
  viewportRef: RefObject<HTMLDivElement | null>;
}

interface RegisteredCanvasRequest extends CanvasRequest {
  order: number;
}

interface CanvasHostContextValue {
  register: (request: CanvasRequest) => void;
  unregister: (id: string) => void;
  requests: readonly RegisteredCanvasRequest[];
}

interface ViewportBounds {
  left: number;
  top: number;
  width: number;
  height: number;
  stageWidth: number;
  stageHeight: number;
}

const CanvasHostContext = createContext<CanvasHostContextValue | null>(null);
const EMPTY_BOUNDS: ViewportBounds = {
  left: 0,
  top: 0,
  width: 0,
  height: 0,
  stageWidth: 0,
  stageHeight: 0,
};

export function GameCanvasProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<RegisteredCanvasRequest[]>([]);
  const nextOrder = useRef(0);

  const register = useCallback((request: CanvasRequest) => {
    setRequests((current) => {
      const existing = current.find((item) => item.id === request.id);
      const nextRequest: RegisteredCanvasRequest = {
        ...request,
        order: existing?.order ?? nextOrder.current++,
      };
      return [...current.filter((item) => item.id !== request.id), nextRequest];
    });
  }, []);

  const unregister = useCallback((id: string) => {
    setRequests((current) => current.filter((request) => request.id !== id));
  }, []);

  const value = useMemo(() => ({ register, unregister, requests }), [register, unregister, requests]);
  return <CanvasHostContext.Provider value={value}>{children}</CanvasHostContext.Provider>;
}

export function GameCanvasStage() {
  const context = useRequiredCanvasHost();
  const setActiveScene = useGameRuntimeStore((state) => state.setActiveScene);
  const stageRef = useRef<HTMLDivElement>(null);
  const [boundsById, setBoundsById] = useState<Record<string, ViewportBounds>>({});
  const requestIds = context.requests.map((request) => request.id).join("|");
  const visibleRequests = context.requests.filter((request) => {
    const bounds = boundsById[request.id];
    return Boolean(bounds && bounds.width > 0 && bounds.height > 0);
  });
  const active = useMemo(() => {
    let selected: RegisteredCanvasRequest | null = null;
    for (const request of visibleRequests) {
      if (
        !selected
        || (request.priority ?? 0) > (selected.priority ?? 0)
        || ((request.priority ?? 0) === (selected.priority ?? 0) && request.order > selected.order)
      ) {
        selected = request;
      }
    }
    return selected;
  }, [visibleRequests]);

  const renderRequests = useMemo(() => {
    let baseScene: RegisteredCanvasRequest | null = null;
    const overlays: RegisteredCanvasRequest[] = [];
    for (const request of visibleRequests) {
      if ((request.priority ?? 0) > 0) {
        overlays.push(request);
      } else if (
        !baseScene
        || (request.priority ?? 0) > (baseScene.priority ?? 0)
        || ((request.priority ?? 0) === (baseScene.priority ?? 0) && request.order > baseScene.order)
      ) {
        baseScene = request;
      }
    }
    overlays.sort((left, right) => (
      (left.priority ?? 0) - (right.priority ?? 0) || left.order - right.order
    ));
    return baseScene ? [baseScene, ...overlays] : overlays;
  }, [visibleRequests]);

  useEffect(() => {
    setActiveScene(active?.sceneId ?? null);
  }, [active?.id, active?.sceneId, setActiveScene]);

  useEffect(() => () => setActiveScene(null), [setActiveScene]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || context.requests.length === 0) {
      setBoundsById({});
      return;
    }
    const targets = context.requests
      .map((request) => ({ id: request.id, element: request.viewportRef.current }))
      .filter((target): target is { id: string; element: HTMLDivElement } => target.element !== null);

    const measure = () => {
      const stageRect = stage.getBoundingClientRect();
      const nextBounds: Record<string, ViewportBounds> = {};
      for (const target of targets) {
        const rect = target.element.getBoundingClientRect();
        nextBounds[target.id] = {
          left: rect.left - stageRect.left,
          top: rect.top - stageRect.top,
          width: rect.width,
          height: rect.height,
          stageWidth: stageRect.width,
          stageHeight: stageRect.height,
        };
      }
      setBoundsById((previous) => boundsAreEqual(previous, nextBounds) ? previous : nextBounds);
    };

    measure();
    const observers: ResizeObserver[] = [];
    if (typeof ResizeObserver !== "undefined") {
      for (const target of targets) {
        const observer = new ResizeObserver(measure);
        observer.observe(target.element);
        observers.push(observer);
      }
    }
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    for (const target of targets) {
      target.element.addEventListener("transitionend", measure);
      target.element.addEventListener("animationend", measure);
    }
    return () => {
      for (const observer of observers) observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      for (const target of targets) {
        target.element.removeEventListener("transitionend", measure);
        target.element.removeEventListener("animationend", measure);
      }
    };
  }, [requestIds]);

  return (
    <div className="game-canvas-stage" ref={stageRef} aria-hidden="true">
      {renderRequests.length > 0 && (
        <Canvas
          className="game-canvas-stage__canvas"
          dpr={[1, 1.5]}
          fallback={active?.fallback}
          frameloop="always"
          gl={{ alpha: true, antialias: false, powerPreference: "high-performance" }}
          shadows={renderRequests.some((request) => Boolean(request.shadows))}
          style={{
            width: "100%",
            height: "100%",
            pointerEvents: active?.interactive ? "auto" : "none",
          }}
        >
          <FixedStepDriver />
          {renderRequests.map((request) => {
            const bounds = boundsById[request.id];
            if (!bounds) return null;
            return (
              <CanvasScene
                key={`${request.id}:${String(request.resetKey ?? "")}`}
                request={request}
                bounds={bounds}
              />
            );
          })}
        </Canvas>
      )}
    </div>
  );
}

export function GameCanvas({
  children,
  className,
  interactive = false,
  priority = 0,
  resetKey,
  sceneId,
  style,
  ...settings
}: GameCanvasProps) {
  const context = useRequiredCanvasHost();
  const id = `game-canvas-${useId()}`;
  const viewportRef = useRef<HTMLDivElement>(null);
  const request = useMemo<CanvasRequest>(
    () => ({
      ...settings,
      children,
      className,
      id,
      interactive,
      priority,
      resetKey,
      sceneId,
      style,
      viewportRef,
    }),
    [children, className, id, interactive, priority, resetKey, sceneId, settings.camera, settings.dpr,
      settings.fallback, settings.frameloop, settings.gl, settings.onCreated, settings.orthographic, settings.resize,
      settings.shadows, style],
  );

  useLayoutEffect(() => {
    context.register(request);
    return () => context.unregister(id);
  }, [context.register, context.unregister, id, request]);

  return (
    <div
      className={`game-canvas-viewport${className ? ` ${className}` : ""}`}
      ref={viewportRef}
      style={{ width: "100%", height: "100%", ...style }}
    />
  );
}

function FixedStepDriver() {
  useFrame((_, delta) => {
    sharedGameRuntime.advanceFrame(delta);
  }, -100);
  return null;
}

function ActiveSceneSetup({ request }: { request: RegisteredCanvasRequest }) {
  const state = useThree();
  const callbackRef = useRef(request.onCreated);
  const rendererSettingsRef = useRef(request.gl);
  callbackRef.current = request.onCreated;
  rendererSettingsRef.current = request.gl;

  useLayoutEffect(() => {
    applyRendererSettings(state, rendererSettingsRef.current);
    callbackRef.current?.(state);
  }, [request.id, state]);
  return null;
}

function CanvasScene({
  request,
  bounds,
}: {
  request: RegisteredCanvasRequest;
  bounds: ViewportBounds;
}) {
  const scene = useMemo(() => new Scene(), [request.id, request.resetKey]);
  const camera = useMemo(() => createSceneCamera(request), [request.id, request.resetKey]);
  const size = useMemo(
    () => ({ width: bounds.width, height: bounds.height, top: 0, left: 0 }),
    [bounds.width, bounds.height],
  );

  return createPortal(
    <>
      <ActiveSceneSetup request={request} />
      <SceneViewportRenderer bounds={bounds} />
      {request.children}
    </>,
    scene,
    { camera, size },
  );
}

function SceneViewportRenderer({ bounds }: { bounds: ViewportBounds }) {
  useFrame(({ gl, scene, camera }) => {
    const left = Math.max(0, Math.round(bounds.left));
    const top = Math.max(0, Math.round(bounds.top));
    const right = Math.min(bounds.stageWidth, Math.round(bounds.left + bounds.width));
    const bottom = Math.min(bounds.stageHeight, Math.round(bounds.top + bounds.height));
    const width = right - left;
    const height = bottom - top;
    if (width <= 0 || height <= 0) return;

    if (camera instanceof PerspectiveCamera) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    const glBottom = bounds.stageHeight - bottom;
    gl.setScissorTest(true);
    gl.setViewport(left, glBottom, width, height);
    gl.setScissor(left, glBottom, width, height);
    gl.clear(true, true, true);
    gl.render(scene, camera);
    gl.setScissorTest(false);
    gl.setViewport(0, 0, bounds.stageWidth, bounds.stageHeight);
  }, 1);
  return null;
}

function createSceneCamera(request: RegisteredCanvasRequest): FiberCamera {
  const cameraSettings = request.camera;
  if (cameraSettings && typeof cameraSettings === "object" && "isCamera" in cameraSettings) {
    return cameraSettings as FiberCamera;
  }

  const camera = request.orthographic
    ? new OrthographicCamera(-1, 1, 1, -1, 0.1, 2000)
    : new PerspectiveCamera();
  if (cameraSettings && typeof cameraSettings === "object") {
    const config = cameraSettings as {
      position?: readonly number[] | Vector3;
      rotation?: readonly number[] | Euler;
      fov?: number;
      near?: number;
      far?: number;
      zoom?: number;
      left?: number;
      right?: number;
      top?: number;
      bottom?: number;
    };
    if (config.position instanceof Vector3) {
      camera.position.copy(config.position);
    } else if (config.position) {
      camera.position.set(config.position[0] ?? 0, config.position[1] ?? 0, config.position[2] ?? 0);
    }
    if (config.rotation instanceof Euler) {
      camera.rotation.copy(config.rotation);
    } else if (config.rotation) {
      camera.rotation.set(config.rotation[0] ?? 0, config.rotation[1] ?? 0, config.rotation[2] ?? 0);
    }
    if (config.near !== undefined) camera.near = config.near;
    if (config.far !== undefined) camera.far = config.far;
    if (config.zoom !== undefined) camera.zoom = config.zoom;
    if (camera instanceof PerspectiveCamera && config.fov !== undefined) {
      camera.fov = config.fov;
    }
    if (camera instanceof OrthographicCamera) {
      if (config.left !== undefined) camera.left = config.left;
      if (config.right !== undefined) camera.right = config.right;
      if (config.top !== undefined) camera.top = config.top;
      if (config.bottom !== undefined) camera.bottom = config.bottom;
    }
  }
  camera.updateProjectionMatrix();
  return camera;
}

function applyRendererSettings(state: RootState, settings: CanvasProps["gl"]): void {
  if (!settings || typeof settings !== "object" || "render" in settings) return;
  const rendererSettings = settings as Partial<WebGLRendererParameters> & {
    toneMapping?: WebGLRenderer["toneMapping"];
    toneMappingExposure?: number;
  };
  if (rendererSettings.toneMapping !== undefined) {
    state.gl.toneMapping = rendererSettings.toneMapping;
  }
  if (rendererSettings.toneMappingExposure !== undefined) {
    state.gl.toneMappingExposure = rendererSettings.toneMappingExposure;
  }
}

function boundsAreEqual(
  previous: Record<string, ViewportBounds>,
  next: Record<string, ViewportBounds>,
): boolean {
  const previousIds = Object.keys(previous);
  const nextIds = Object.keys(next);
  if (previousIds.length !== nextIds.length) return false;
  for (const id of nextIds) {
    const before = previous[id];
    const after = next[id];
    if (!before || !after) return false;
    if (
      before.left !== after.left
      || before.top !== after.top
      || before.width !== after.width
      || before.height !== after.height
      || before.stageWidth !== after.stageWidth
      || before.stageHeight !== after.stageHeight
    ) return false;
  }
  return true;
}

function useRequiredCanvasHost(): CanvasHostContextValue {
  const context = useContext(CanvasHostContext);
  if (!context) {
    throw new Error("GameCanvas must be rendered inside GameCanvasProvider.");
  }
  return context;
}
