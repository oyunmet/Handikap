import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  createWarRoomAdaptiveDprState,
  getWarRoomPixelRatio,
  getWarRoomViewportPixelRatio,
  sampleWarRoomAdaptiveDpr,
  WAR_ROOM_ADAPTIVE_DPR_SCALE_LEVELS,
  type WarRoomAdaptiveDprState,
} from "../game/war-room-quality";
import type { RenderQuality } from "./graphics-quality";
import {
  createWarRoomFrameStallWatchdogState,
  observeWarRoomLongTasks,
  resetWarRoomFrameStallWatchdog,
  sampleWarRoomFrameStallWatchdog,
  warRoomPerformanceCollector,
} from "../game/war-room-performance";

type Props = {
  quality: RenderQuality;
  touchDevice: boolean;
  onPixelRatioChange: (pixelRatio: number) => void;
  onRepeatedStall?: () => void;
};

export default function WarRoomAdaptiveDpr({
  quality,
  touchDevice,
  onPixelRatioChange,
  onRepeatedStall,
}: Props) {
  const setDpr = useThree((state) => state.setDpr);
  const size = useThree((state) => state.size);
  const qualityPixelRatio = getWarRoomPixelRatio(
    quality,
    typeof window === "undefined" ? 1 : window.devicePixelRatio,
    touchDevice,
  );
  const landscapePixelRatioRef = useRef<number | null>(null);
  const lastAdaptiveScale = WAR_ROOM_ADAPTIVE_DPR_SCALE_LEVELS[
    WAR_ROOM_ADAPTIVE_DPR_SCALE_LEVELS.length - 1
  ]!;
  const landscapePixelRatioBudget = landscapePixelRatioRef.current
    ?? qualityPixelRatio * lastAdaptiveScale;
  const maxPixelRatio = Math.min(
    getWarRoomViewportPixelRatio(qualityPixelRatio, size.width, size.height),
    size.width < size.height
      ? getWarRoomViewportPixelRatio(landscapePixelRatioBudget, size.width, size.height)
      : qualityPixelRatio,
  );
  const adaptiveStateRef = useRef<WarRoomAdaptiveDprState | null>(null);
  if (adaptiveStateRef.current === null) {
    adaptiveStateRef.current = createWarRoomAdaptiveDprState(maxPixelRatio);
  }
  const lastFrameAtRef = useRef<number | null>(null);
  const stallWatchdogRef = useRef(createWarRoomFrameStallWatchdogState());
  const longTaskWatchdogRef = useRef(createWarRoomFrameStallWatchdogState());

  useEffect(() => {
    adaptiveStateRef.current = createWarRoomAdaptiveDprState(maxPixelRatio);
    lastFrameAtRef.current = null;
    setDpr(maxPixelRatio);
    onPixelRatioChange(maxPixelRatio);
  }, [maxPixelRatio, onPixelRatioChange, setDpr]);

  useEffect(() => {
    const resetFrameClock = () => {
      lastFrameAtRef.current = null;
      resetWarRoomFrameStallWatchdog(stallWatchdogRef.current);
      resetWarRoomFrameStallWatchdog(longTaskWatchdogRef.current);
    };
    document.addEventListener("visibilitychange", resetFrameClock);
    return () => document.removeEventListener("visibilitychange", resetFrameClock);
  }, []);

  useEffect(() => observeWarRoomLongTasks(
    warRoomPerformanceCollector,
    (durationMs) => {
      if (sampleWarRoomFrameStallWatchdog(
        longTaskWatchdogRef.current,
        durationMs,
        performance.now(),
      )) {
        onRepeatedStall?.();
      }
    },
  ), [onRepeatedStall]);

  useFrame(() => {
    const nowMs = performance.now();
    const previousFrameAt = lastFrameAtRef.current;
    lastFrameAtRef.current = nowMs;
    if (previousFrameAt === null) return;
    const frameTimeMs = nowMs - previousFrameAt;
    if (sampleWarRoomFrameStallWatchdog(stallWatchdogRef.current, frameTimeMs, nowMs)) {
      onRepeatedStall?.();
    }
    const adaptiveState = adaptiveStateRef.current;
    if (!adaptiveState) return;
    if (size.width >= size.height) {
      landscapePixelRatioRef.current = Math.min(
        landscapePixelRatioRef.current ?? adaptiveState.pixelRatio,
        adaptiveState.pixelRatio,
      );
    }
    const previousPixelRatio = adaptiveState.pixelRatio;
    const nextPixelRatio = sampleWarRoomAdaptiveDpr(
      adaptiveState,
      maxPixelRatio,
      frameTimeMs,
      nowMs,
    );
    if (nextPixelRatio !== previousPixelRatio) {
      setDpr(nextPixelRatio);
      onPixelRatioChange(nextPixelRatio);
    }
  });

  return null;
}
