import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import * as THREE from "three";
import type { MutableRefObject } from "react";
import type { WorldMotion } from "./movement";
import {
  selectWorldV2Labels,
  WORLD_V2_LABEL_MAX_DISTANCE,
} from "./world-v2-label-layout";
import type { WorldV2ProjectedLabel, WorldV2ScreenRect } from "./world-v2-label-layout";

type RegisteredLabel = {
  id: number;
  anchor: THREE.Group;
  element: HTMLSpanElement;
  maxDistance: number;
};

type MotionRef = MutableRefObject<WorldMotion>;

const registeredLabels = new Map<number, RegisteredLabel>();
let nextLabelId = 1;

function registerLabel(label: RegisteredLabel) {
  registeredLabels.set(label.id, label);
  return () => {
    registeredLabels.delete(label.id);
  };
}

function screenRect(element: Element): WorldV2ScreenRect {
  const rect = element.getBoundingClientRect();
  return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
}

function intersectsViewport(rect: WorldV2ScreenRect, viewport: WorldV2ScreenRect) {
  return rect.right > viewport.left
    && rect.left < viewport.right
    && rect.bottom > viewport.top
    && rect.top < viewport.bottom;
}

export function WorldV2Label({
  children,
  className = "world-v2-label",
  position,
  maxDistance = 42,
}: {
  children: ReactNode;
  className?: string;
  position: [number, number, number];
  maxDistance?: number;
}) {
  const anchorRef = useRef<THREE.Group>(null);
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let retryTimer: number | undefined;
    let attempts = 0;
    let unregister: (() => void) | undefined;
    let active = true;
    const attachWhenHtmlIsReady = () => {
      if (!active) return;
      const anchor = anchorRef.current;
      const element = elementRef.current;
      if (anchor && element?.isConnected) {
        const id = nextLabelId++;
        element.style.visibility = "hidden";
        unregister = registerLabel({ id, anchor, element, maxDistance });
        return;
      }
      attempts += 1;
      if (attempts < 60) retryTimer = window.setTimeout(attachWhenHtmlIsReady, 16);
    };
    retryTimer = window.setTimeout(attachWhenHtmlIsReady, 0);
    return () => {
      active = false;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      unregister?.();
    };
  }, [maxDistance]);

  return (
    <group ref={anchorRef} position={position}>
      <Html center style={{ pointerEvents: "none" }}>
        <span ref={elementRef} className={className}>{children}</span>
      </Html>
    </group>
  );
}

export function WorldV2LabelManager({ motionRef }: { motionRef: MotionRef }) {
  const { camera, gl } = useThree();
  const elapsed = useRef(0);
  const projectedPosition = useRef(new THREE.Vector3());
  const worldPosition = useRef(new THREE.Vector3());
  const playerWorldPosition = useRef(new THREE.Vector3());
  const playerProjectedPosition = useRef(new THREE.Vector3());

  useFrame((_state, delta) => {
    elapsed.current += delta;
    if (elapsed.current < 0.12) return;
    elapsed.current = 0;

    const canvasRect = gl.domElement.getBoundingClientRect();
    if (canvasRect.width <= 0 || canvasRect.height <= 0) return;
    const viewport: WorldV2ScreenRect = {
      left: canvasRect.left,
      top: canvasRect.top,
      right: canvasRect.right,
      bottom: canvasRect.bottom,
    };
    if (document.querySelector(
      '.world-scene[data-story-open="true"], .world-scene[data-npc-dialogue-open="true"]',
    )) {
      for (const label of registeredLabels.values()) label.element.style.visibility = "hidden";
      return;
    }
    const motion = motionRef.current;
    const playerWorld = playerWorldPosition.current.set(
      motion.depth * 5.2,
      motion.jumpHeight + 0.85,
      -(motion.distance - motion.cameraX),
    );
    const player = playerProjectedPosition.current.copy(playerWorld).project(camera);
    const playerScreenX = canvasRect.left + (player.x + 1) * 0.5 * canvasRect.width;
    const playerScreenY = canvasRect.top + (1 - player.y) * 0.5 * canvasRect.height;
    const playerRect: WorldV2ScreenRect = {
      left: playerScreenX - 48,
      top: playerScreenY - 122,
      right: playerScreenX + 48,
      bottom: playerScreenY + 18,
    };
    const uiRects = Array.from(document.querySelectorAll(
      ".world-topbar, .world-progress, .world-controls, .world-joystick, "
      + ".world-movement-actions, .world-gate-prompt, .world-hazard-hint, "
      + ".world-panel, .world-encounter, .world-npc-dialogue",
    ))
      .filter((element) => {
        const style = window.getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden";
      })
      .map(screenRect)
      .filter((rect) => intersectsViewport(rect, viewport));

    const projected: WorldV2ProjectedLabel[] = [];
    const current = new Map<number, RegisteredLabel>();
    for (const [id, label] of registeredLabels) {
      const { anchor, element, maxDistance } = label;
      if (!element.textContent?.trim()) {
        element.style.visibility = "hidden";
        continue;
      }
      let ancestor: THREE.Object3D | null = anchor;
      let effectivelyVisible = true;
      while (ancestor) {
        if (!ancestor.visible) {
          effectivelyVisible = false;
          break;
        }
        ancestor = ancestor.parent;
      }
      if (!effectivelyVisible || !element.isConnected) continue;
      anchor.updateWorldMatrix(true, false);
      const distance = anchor.getWorldPosition(worldPosition.current).distanceTo(playerWorld);
      const ndc = projectedPosition.current.copy(worldPosition.current).project(camera);
      const x = canvasRect.left + (ndc.x + 1) * 0.5 * canvasRect.width;
      const y = canvasRect.top + (1 - ndc.y) * 0.5 * canvasRect.height;
      const width = Math.max(60, element.offsetWidth);
      const height = Math.max(18, element.offsetHeight);
      const rect = {
        left: x - width / 2,
        top: y - height / 2,
        right: x + width / 2,
        bottom: y + height / 2,
      };
      projected.push({
        id,
        distance,
        maxDistance,
        visibleInCamera: ndc.z > -1 && ndc.z < 1
          && ndc.x > -1.08 && ndc.x < 1.08
          && ndc.y > -1.08 && ndc.y < 1.08,
        rect,
      });
      current.set(id, label);
    }

    const selected = new Set(
      selectWorldV2Labels(projected, [...uiRects, playerRect]).map((label) => label.id),
    );
    for (const [id, label] of current) {
      const visible = selected.has(id);
      label.element.style.visibility = visible ? "visible" : "hidden";
      if (!visible) continue;
      const distance = projected.find((item) => item.id === id)?.distance ?? label.maxDistance;
      const effectiveMaxDistance = Math.min(label.maxDistance, WORLD_V2_LABEL_MAX_DISTANCE);
      const ratio = THREE.MathUtils.clamp(1 - distance / effectiveMaxDistance, 0, 1);
      const scale = THREE.MathUtils.clamp(0.7 + ratio * 0.3, 0.7, 1);
      label.element.style.opacity = String(0.22 + ratio * 0.78);
      label.element.style.transform = `scale(${scale})`;
      label.element.style.transformOrigin = "center";
    }
    for (const [id, label] of registeredLabels) {
      if (current.has(id)) continue;
      label.element.style.visibility = "hidden";
    }
  });

  return null;
}
