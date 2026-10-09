import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo } from "react";
import type { EquipmentVisual } from "../game/store-types";
import Knight3D from "./Knight3D";
import { createWorldMotion } from "./movement";

export default function EquipmentPreview3D({ appearance }: { appearance: EquipmentVisual }) {
  const motionRef = useMemo(() => ({ current: createWorldMotion() }), []);
  return (
    <div className="store-item-preview-3d" aria-label="Seçili eşyanın döndürülebilir üç boyutlu görünümü">
      <Canvas
        dpr={[1, 1.2]}
        camera={{ position: [3.3, 2.45, 5.5], fov: 38 }}
        gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
      >
        <ambientLight intensity={0.75} />
        <directionalLight position={[3.5, 5, 3]} intensity={1.45} color="#f2d4a2" />
        <directionalLight position={[-3, 2, -2]} intensity={0.6} color="#83aab2" />
        <group position={[0, -0.92, 0]} scale={0.79}>
          <Knight3D
            motionRef={motionRef}
            state="idle"
            motionReduced
            facingAngle={-0.18}
            appearance={appearance}
          />
        </group>
        <OrbitControls
          target={[0, 1.15, 0]}
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 3.8}
          maxPolarAngle={Math.PI / 1.95}
          autoRotate
          autoRotateSpeed={0.65}
        />
      </Canvas>
    </div>
  );
}
