import { Canvas } from "@react-three/fiber";
import { createRoot } from "react-dom/client";
import { INPUT_BUTTON } from "../game/combat-engine";
import DuelControls from "../game/DuelControls";
import { getDuelArenaTheme } from "../game/duel-arena-theme";
import DuelArenaEnvironment, { DuelArenaAtmosphere } from "./DuelArenaEnvironment";
import "./world-scene.css";
import "../game/world-duel-controls.css";

const theme = getDuelArenaTheme(0);

function DuelArenaPreview() {
  return (
    <main
      className="world-scene"
      data-battle="fight"
      style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#24171e" }}
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [7, 6.5, 14], fov: 62, near: 0.1, far: 220 }}
        onCreated={({ camera }) => camera.lookAt(0, 3.5, -0.6)}
      >
        <DuelArenaAtmosphere theme={theme} />
        <ambientLight color="#ffdfc3" intensity={1.35} />
        <directionalLight position={[-8, 14, 8]} color="#ffd09a" intensity={2.1} />
        <directionalLight position={[9, 8, -7]} color="#d79257" intensity={0.58} />
        <DuelArenaEnvironment theme={theme} />
        <mesh position={[0, 0.025, -0.6]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[9, 96]} />
          <meshStandardMaterial color={theme.floor} roughness={0.94} />
        </mesh>
        <mesh position={[0, 0.04, -0.6]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[7.15, 7.3, 96]} />
          <meshBasicMaterial color={theme.accent} toneMapped={false} />
        </mesh>
      </Canvas>
      <DuelControls
        stamina={72}
        attackCooldownSeconds={0}
        skillOneSeconds={0}
        skillTwoSeconds={0}
        onPress={(button) => console.info("pressed", button, INPUT_BUTTON.attack)}
        onRelease={() => undefined}
        onMove={() => undefined}
      />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<DuelArenaPreview />);
