import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { ItemRarity, EquipmentVisual } from "../game/store-types";
import { EQUIPMENT_PREVIEW_MAX_DPR } from "../game/store-ui/equipment-preview-config";
import KnightActor from "./KnightActor";
import { createWorldMotion } from "./movement";

type EquipmentPreview3DProps = {
  appearance: EquipmentVisual;
  itemId: string;
  itemIcon?: string;
  rarity: ItemRarity;
  equipped: boolean;
};

export default function EquipmentPreview3D({
  appearance,
  itemId,
  itemIcon,
  rarity,
  equipped,
}: EquipmentPreview3DProps) {
  const motionRef = useMemo(() => ({ current: createWorldMotion() }), []);
  const rootRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<{ reset: () => void } | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number; id: number } | null>(null);
  const lastTapRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const previousItemIdRef = useRef(itemId);
  const [isVisible, setIsVisible] = useState(true);
  const [itemChanging, setItemChanging] = useState(false);

  useEffect(() => {
    const element = rootRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, { threshold: 0.01 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (previousItemIdRef.current === itemId) return undefined;
    previousItemIdRef.current = itemId;
    setItemChanging(true);
    const timer = window.setTimeout(() => setItemChanging(false), 240);
    return () => window.clearTimeout(timer);
  }, [itemId]);

  const resetPreview = () => controlsRef.current?.reset();
  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
  };
  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start || start.id !== event.pointerId || event.isPrimary === false) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 7) {
      lastTapRef.current = null;
      return;
    }
    const now = event.timeStamp;
    const lastTap = lastTapRef.current;
    if (lastTap && now - lastTap.time < 330 && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 28) {
      resetPreview();
      lastTapRef.current = null;
      return;
    }
    lastTapRef.current = { x: event.clientX, y: event.clientY, time: now };
  };

  return (
    <div
      ref={rootRef}
      className={`store-item-preview-3d${itemChanging ? " is-changing" : ""}`}
      data-rarity={rarity}
      data-equipped={equipped ? "true" : "false"}
      aria-label="Oyuncu karakterinin seçili ekipmanla döndürülebilir üç boyutlu görünümü"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { pointerStartRef.current = null; }}
      onDoubleClick={(event) => {
        event.preventDefault();
        resetPreview();
      }}
    >
      <div className="store-item-preview-3d__vignette" aria-hidden="true" />
      <Canvas
        dpr={[1, EQUIPMENT_PREVIEW_MAX_DPR]}
        frameloop={isVisible ? "always" : "never"}
        camera={{ position: [3.3, 2.45, 5.5], fov: 38 }}
        gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
        fallback={
          <div className="store-item-preview-3d__fallback" role="img" aria-label="3D görünüm kullanılamıyor">
            <span aria-hidden="true">{itemIcon ?? "◇"}</span>
            <small>3D görünüm bu cihazda kullanılamıyor</small>
          </div>
        }
      >
        <ambientLight intensity={0.48} />
        <hemisphereLight args={["#fff0d4", "#20242c", 0.72]} />
        <directionalLight position={[3.5, 5, 3]} intensity={1.9} color="#f2d4a2" />
        <directionalLight position={[-3, 2, -2]} intensity={0.95} color="#83aab2" />
        <pointLight position={[0, 2.4, -2.2]} intensity={1.1} color={rarity === "legendary" ? "#ffc75e" : "#b9d5df"} distance={6} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]} scale={[0.8, 0.54, 1]}>
          <circleGeometry args={[1, 40]} />
          <meshBasicMaterial color="#080a0e" transparent opacity={0.34} depthWrite={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]} scale={[0.58, 0.37, 1]}>
          <circleGeometry args={[1, 40]} />
          <meshBasicMaterial color="#161820" transparent opacity={0.22} depthWrite={false} />
        </mesh>
        <group scale={0.79}>
          <KnightActor
            motionRef={motionRef}
            state="idle"
            motionReduced={false}
            facingAngle={0}
            castShadow={false}
            appearance={appearance}
            playerCharacter
          />
        </group>
        <OrbitControls
          ref={(instance) => { controlsRef.current = instance as typeof controlsRef.current; }}
          target={[0, 0.78, 0]}
          enablePan={false}
          enableZoom
          minDistance={4.8}
          maxDistance={8.2}
          minPolarAngle={Math.PI / 3.8}
          maxPolarAngle={Math.PI / 1.95}
          autoRotate
          autoRotateSpeed={0.45}
        />
      </Canvas>
    </div>
  );
}
