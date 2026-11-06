import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

const SEAL_FRAGMENT_MODEL_URL = "/models/collectibles/enchanted-necklace.glb";

export default function WorldSealFragmentModel() {
  const { scene } = useGLTF(SEAL_FRAGMENT_MODEL_URL);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    const bounds = new THREE.Box3().setFromObject(clone);
    clone.position.sub(bounds.getCenter(new THREE.Vector3()));
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
    return clone;
  }, [scene]);

  return (
    <group scale={0.48}>
      <primitive object={model} />
      <mesh position={[0, -0.22, 0.12]} rotation={[0, 0, Math.PI / 4]}>
        <dodecahedronGeometry args={[0.19, 0]} />
        <meshStandardMaterial
          color="#c5a0ff"
          emissive="#8a43dc"
          emissiveIntensity={1.3}
          metalness={0.48}
          roughness={0.2}
        />
      </mesh>
      <pointLight position={[0, -0.2, 0.16]} color="#ad78ff" intensity={0.42} distance={1.8} />
    </group>
  );
}

useGLTF.preload(SEAL_FRAGMENT_MODEL_URL);
