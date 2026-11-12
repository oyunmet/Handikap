import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  createWarRoomAdaptiveDprState,
  getWarRoomPixelRatio,
  sampleWarRoomAdaptiveDpr,
  type WarRoomAdaptiveDprState,
} from "../game/war-room-quality";
import type { RenderQuality } from "./graphics-quality";

type Props = {
  quality: RenderQuality;
  touchDevice: boolean;
  onPixelRatioChange: (pixelRatio: number) => void;
};

export default function WarRoomAdaptiveDpr({
  quality,
  touchDevice,
  onPixelRatioChange,
}: Props) {
  const setDpr = useThree((state) => state.setDpr);
  const maxPixelRatio = getWarRoomPixelRatio(
    quality,
    typeof window === "undefined" ? 1 : window.devicePixelRatio,
    touchDevice,
  );
  const adaptiveStateRef = useRef<WarRoomAdaptiveDprState | null>(null);
  if (adaptiveStateRef.current === null) {
    adaptiveStateRef.current = createWarRoomAdaptiveDprState(maxPixelRatio);
  }
  const lastFrameAtRef = useRef<number | null>(null);

  useEffect(() => {
    adaptiveStateRef.current = createWarRoomAdaptiveDprState(maxPixelRatio);
    lastFrameAtRef.current = null;
    setDpr(maxPixelRatio);
    onPixelRatioChange(maxPixelRatio);
  }, [maxPixelRatio, onPixelRatioChange, setDpr]);

  useFrame(() => {
    const nowMs = performance.now();
    const previousFrameAt = lastFrameAtRef.current;
    lastFrameAtRef.current = nowMs;
    if (previousFrameAt === null) return;
    const adaptiveState = adaptiveStateRef.current;
    if (!adaptiveState) return;
    const previousPixelRatio = adaptiveState.pixelRatio;
    const nextPixelRatio = sampleWarRoomAdaptiveDpr(
      adaptiveState,
      maxPixelRatio,
      nowMs - previousFrameAt,
      nowMs,
    );
    if (nextPixelRatio !== previousPixelRatio) {
      setDpr(nextPixelRatio);
      onPixelRatioChange(nextPixelRatio);
    }
  });

  return null;
}
